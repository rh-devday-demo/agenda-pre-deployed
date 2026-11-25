# AGENTS.md – agenda-pre-deployed

Instructions for coding agents (and humans) working in this repository.
They describe the intended workflow. Your actual reach is defined by the workspace, its
credentials and the platform's RBAC – these instructions do not widen it.

## What this project is

`agenda-pre-deployed`: Pre-deployed agenda application for Developer Day Vienna.
It was created from the Developer Hub golden path. The scaffold is complete; the
**application, its tests, its Containerfile and its deployment manifests do not exist yet**.

| Path | Purpose | State after scaffolding |
|---|---|---|
| `devfile.yaml` | Dev Spaces workspace (toolchain, preview port 8080) | ready |
| `.tekton/push.yaml` | Pipelines as Code PipelineRun, runs on every push to `main` | ready |
| `deploy/` | Kubernetes manifests, reconciled by Argo CD into `agenda-pre-deployed-dev` | **empty** |
| `catalog-info.yaml` | Developer Hub catalog entry | ready |

## Your environment and identity

- You run inside an OpenShift Dev Spaces workspace in namespace `pbergsma-devspaces`
  (shared with the user's other projects; nothing there is yours to change).
- `oc`/`kubectl`/`tkn` are pre-configured (`$KUBECONFIG`) with this project's service account
  `system:serviceaccount:pbergsma-devspaces:agenda-pre-deployed-agent`. Do not try to log in as
  anybody else.
- Environment: `$DEV_NAMESPACE=agenda-pre-deployed-dev`, `$CI_NAMESPACE=agenda-pre-deployed-ci`,
  `$GITOPS_NAMESPACE=agenda-pre-deployed-gitops`.
- You may **read** status, events and logs in those three namespaces (pods, deployments, routes,
  image streams, PipelineRuns/TaskRuns, Argo CD Applications). You may **not** create, change
  or delete cluster resources, read secrets or exec into pods. A `Forbidden` error is the
  platform working as designed – report it, do not work around it.
- **You deploy only through Git**: commit + push to `main` → Tekton builds and publishes the
  image → Argo CD applies `deploy/`.
- Ask the human before `git push`.

## Application conventions

- Node.js (≥ 20), plain JavaScript (ES modules). Prefer the standard library: `node:http` for the
  server, `node:test` + `node:assert` for tests. Add dependencies only when they clearly pay off,
  and commit `package-lock.json` if you add any.
- `package.json` scripts: `npm start` (serves on `$PORT`, default `8080`, bind `0.0.0.0`) and
  `npm test` (must pass without network access and without a browser).
- Health endpoint: `GET /healthz` → `200 ok`.
- Time zone: everything user-facing in `Europe/Vienna`. Make "now" injectable so tests can use
  fixed times (session boundaries!) instead of the wall clock.
- Input data (e.g. the event agenda) is supplied by the human in the workspace. Treat it as the
  source of truth: do not invent, rename or re-time entries. If it is missing, ask for it.
- `Containerfile` at the repository root, built on **Red Hat Hardened Images** (minimal,
  distroless-style, from `registry.access.redhat.com/hi/`), as a two-stage build:
  - build stage `registry.access.redhat.com/hi/nodejs:22-builder` (has npm and a shell):
    `npm ci --omit=dev` (skip if there are no dependencies), copy the sources;
  - runtime stage `registry.access.redhat.com/hi/nodejs:22`: **no shell, no package manager**,
    runs as non-root user 65532, working directory `/app`, `HOME=/tmp`. Copy the app from the
    build stage to `/app`, `EXPOSE 8080`, and start it with `CMD ["node", "<entrypoint>.js"]`
    (exec form; don't rely on `npm start`, `sh -c` or `RUN` in this stage). Keep the image's
    `ENTRYPOINT`.
  - The files must be readable by any UID (OpenShift restricted SCC assigns an arbitrary UID);
    don't write to the image filesystem at runtime (use `/tmp` if needed).

## Development loop

1. `npm install` (if there are dependencies), `npm test` – fix failures, re-run.
2. Start the app on the preview port: `PORT=8080 npm start` (devfile command *3. Start app*).
3. The human reviews it through the Dev Spaces endpoint **`preview`**. Show the changes and the
   preview URL before committing.

## Deployment conventions (`deploy/`)

Plain YAML, one resource per file, **no `namespace:` field** (Argo CD sets
`agenda-pre-deployed-dev`). Required resources:

- `deployment.yaml` – Deployment `agenda-pre-deployed`, 1 replica, container port 8080,
  image **`image-registry.openshift-image-registry.svc:5000/agenda-pre-deployed-ci/agenda-pre-deployed:latest`**,
  `imagePullPolicy: Always`, readiness/liveness probes on `/healthz`, resource requests/limits
  (≤ 250m CPU / 256Mi memory), `securityContext` compatible with `restricted-v2`
  (`runAsNonRoot: true`, `allowPrivilegeEscalation: false`, drop `ALL` capabilities,
  `seccompProfile: RuntimeDefault`).
- `service.yaml` – Service `agenda-pre-deployed`, port 8080.
- `route.yaml` – Route `agenda-pre-deployed`, TLS edge termination, redirect insecure traffic.
- Every resource carries the label `backstage.io/kubernetes-id: agenda-pre-deployed` (pod template too),
  so Developer Hub shows it.

## Delivery and verification

After pushing to `main`:

1. **Pipeline** – Pipelines as Code starts a PipelineRun in `agenda-pre-deployed-ci`:
   ```sh
   tkn pipelinerun list -n "$CI_NAMESPACE"
   tkn pipelinerun logs -f --last -n "$CI_NAMESPACE"
   oc get pipelinerun -n "$CI_NAMESPACE" -o jsonpath='{.items[-1:].status.results}'
   ```
   Tasks: `fetch` → `detect` → `test` → `build` (buildah, pushes `:latest`) → `tag-revision`
   (adds the commit SHA as tag).
2. **Image** – `oc get istag agenda-pre-deployed:latest -n "$CI_NAMESPACE" -o jsonpath='{.image.metadata.name}'`
   gives the published digest.
3. **GitOps** – the team Argo CD polls Git every ~30 s:
   ```sh
   oc get application agenda-pre-deployed -n "$GITOPS_NAMESPACE" \
     -o jsonpath='{.status.sync.status} {.status.health.status} {.status.sync.revision}{"\n"}'
   ```
4. **Rollout** – `oc get deploy,pods,route -n "$DEV_NAMESPACE"`, `oc get events -n "$DEV_NAMESPACE" --sort-by=.lastTimestamp`.

**Expected on the first delivery:** Argo CD follows Git, not Tekton. It can apply `deploy/`
before the build has published the image, so the first pod may show `ErrImagePull` /
`ImagePullBackOff` for a few minutes. That is expected – explain it, keep following the
PipelineRun, and check again after the image is published (the kubelet retries automatically).
Only report a blocker when the pipeline failed or the pod keeps failing after the image exists.

**Done means verified**, not "the command returned". Finish with:

- test results (pipeline `test` task),
- source revision (commit SHA),
- image digest from the pipeline **and** the digest of the running pod
  (`oc get pods -n "$DEV_NAMESPACE" -l backstage.io/kubernetes-id=agenda-pre-deployed -o jsonpath='{.items[*].status.containerStatuses[*].imageID}'`) – they must match,
- Argo CD sync/health status and synced revision,
- the deployed URL (`oc get route agenda-pre-deployed -n "$DEV_NAMESPACE" -o jsonpath='{.spec.host}'`)
  and the result of requesting it (`curl -fsS https://<host>/healthz` and the main page).

Later deliveries: the Deployment tracks `:latest` with `imagePullPolicy: Always`; Argo CD only
rolls out when `deploy/` changes. To roll out a new build, change the manifests in Git (e.g. bump
an annotation such as `devday.platform/revision` in the pod template).
