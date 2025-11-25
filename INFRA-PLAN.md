# Infra / Git Strategy

## Branches

- develop: connected to staging environment on AWS
- master: connected to production environment on AWS

Workflow:
1. Feature branches are created from develop.
2. Merge to develop → deploy to staging.
3. When stable → merge develop → master → deploy to production.

## Environments

- Dev: local machine
- Staging: AWS (EC2) using:
  - backend/.env.staging
  - frontend/.env.staging
- Production: AWS (separate resources) using:
  - backend/.env.prod
  - frontend/.env.prod

## Env Files

Real env files are not committed.

- Backend:
  - .env (local/dev)
  - .env.staging
  - .env.prod

- Frontend:
  - .env.local or .env (local/dev)
  - .env.staging
  - .env.production

Only the *.example files are tracked in Git:

- backend/.env.dev.example
- backend/.env.staging.example
- backend/.env.prod.example
- frontend/.env.dev.example
- frontend/.env.staging.example
- frontend/.env.prod.example