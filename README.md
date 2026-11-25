# agenda-pre-deployed

Pre-deployed agenda application for Developer Day Vienna

Created from the Developer Hub golden path *Application on OpenShift (agent-ready)*.

| | |
|---|---|
| Develop | [Open in Dev Spaces](https://devspaces.apps.aro.cluster.8z6sv.uksouth.aroapp-hcp.io/#https://github.com/rh-devday-demo/agenda-pre-deployed?ai-provider=opencodeai/opencode) |
| Build | Pipelines as Code → `agenda-pre-deployed-ci` (`.tekton/push.yaml`) |
| Deploy | Argo CD `agenda-pre-deployed-gitops/agenda-pre-deployed` → `agenda-pre-deployed-dev` (`deploy/`) |
| Owner | `group:default/team-devday` |

See [AGENTS.md](AGENTS.md) for conventions, the delivery workflow and how to verify a deployment.
