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

## Local preview

Requires Node.js 20 or later. There are no dependencies to install.

```sh
npm test
PORT=8080 npm start
```

Open the **preview** endpoint in Dev Spaces or visit `http://localhost:8080` locally.
`GET /healthz` returns `200 ok` when the server is running.

## Agenda data

`public/agenda.json` is an array of sessions with `title`, `start`, and `end` fields,
plus optional `speaker` and `description` text. Express `start` and `end` as ISO 8601
timestamps with an explicit UTC offset or `Z`. The browser displays dates and times
in `Europe/Vienna`, regardless of its local time zone. A session is current from its
start (inclusive) until its end (exclusive). The schedule for 26 November 2026 comes
from the [official Red Hat event agenda](https://reg.experiences.redhat.com/flow/redhat/4953475/rhexpressregistrationapp/page/expressregistration).
The optional workshop (`track: "workshop"`) runs alongside the afternoon talks.
The overlapping entries appear side by side on wide screens and stack on mobile.
More than one entry can be current at the same time.
