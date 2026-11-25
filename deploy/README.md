# deploy/

This directory is watched by the team Argo CD instance (`agenda-pre-deployed-gitops`,
Application `agenda-pre-deployed`) and reconciled into the namespace `agenda-pre-deployed-dev`.

It is intentionally empty after the project was created: there is nothing to deploy yet,
so Argo CD reports *Synced* with no resources. Add plain Kubernetes YAML here (no
Helm, no Kustomize, no `namespace:` fields) – see the deployment conventions in `AGENTS.md`.

Files other than `*.yaml`, `*.yml` and `*.json` are ignored; this README is excluded explicitly.
