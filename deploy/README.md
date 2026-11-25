# deploy/

This directory is watched by the team Argo CD instance (`agenda-pre-deployed-gitops`,
Application `agenda-pre-deployed`) and reconciled into the namespace `agenda-pre-deployed-dev`.

This directory holds the Deployment, Service, and OpenShift Route as plain YAML.
Argo CD sets the target namespace. See the deployment conventions in `AGENTS.md`.

Files other than `*.yaml`, `*.yml` and `*.json` are ignored; this README is excluded explicitly.
