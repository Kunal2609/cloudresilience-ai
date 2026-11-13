# Implementation checklist

## Repository audit

- [x] Existing React 19, TypeScript, Vite, React Flow frontend identified.
- [x] Existing FastAPI, Pydantic, NetworkX backend identified.
- [x] SQLAlchemy persistence, SQLite default, sample architecture seed, API routes, and tests inspected.
- [x] Existing implementation retained; no framework replacement.

## Implemented in the existing application

- [x] Architecture editor with typed resources and relationships, validation, persistence, and JSON import/export.
- [x] Failure simulation, BFS propagation, blast radius, risk scoring, recovery planning, and saved history.
- [x] Modeled IAM compromise simulation and role/permission attack traversal.
- [x] Markdown report generation and what-if comparison.
- [x] Deterministic explanation fallback when an optional API key is absent.
- [x] Explicit security traversal now excludes `NETWORK_REACHABLE` and `CONNECTS_TO`; network connectivity cannot independently create an authorization path.
- [x] BFS queue changed to `deque` to avoid repeated front-removal cost.
- [x] Regression test confirms a network link alone does not produce an authorized attack path.
- [x] Docker Compose uses PostgreSQL with a persistent volume and health-gated startup; added the missing PostgreSQL driver and removed the unused Neo4j service.
- [x] Startup and limitation documentation updated.

## Partial or incomplete

- [ ] Separate projects/workspaces, authentication, and normalized resource/relationship/policy entities.
- [ ] Alembic migrations and portable schema upgrade path.
- [ ] Full IAM policy evaluation (actions, resources, principals, denies, conditions, trust policy semantics) and attack-path evidence findings.
- [ ] Verified active failover requirements including connectivity, replica health, capacity, and routing.
- [ ] Architecture revisions/duplicate workflow and persistent improvement actions.
- [ ] Terraform import, PDF/CSV reports, AI chat, AWS read-only integration, safe Docker chaos testing.
- [ ] Full automated end-to-end workflow and large-graph performance benchmarks.

## Verification record

- Frontend production build: passed (`npm run build`). Vite reported a JavaScript bundle over 500 kB.
- Focused backend graph/persistence suite: 12 passed.
- Full backend suite: blocked at the first `TestClient` health request. An independent minimal FastAPI `TestClient` check also hung, and a local HTTP request reported that socket access is forbidden in this environment. Treat API integration tests as unverified here.
- `docker compose config`: passed. Container startup and database persistence across container restarts were not exercised.
- Frontend production build: passed; Vite warns that the JavaScript bundle is larger than 500 kB.
