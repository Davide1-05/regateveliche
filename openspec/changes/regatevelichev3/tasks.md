# Development Tasks: Feature Implementation

### Phase 1: Infrastructure & Security
* [ ] Initialize **Docker Compose** environment including PostgreSQL, Mailcatcher, and Traefik.
* [ ] Configure **FastAPI** boilerplate with **SQLModel** and **JWT** authentication.
* [ ] Set up **GitHub Actions** for automated linting (Ruff/ESLint) and testing.

### Phase 2: Core Module Development
* [ ] **MOD-ADM:** Build the smart registration form and e-signature logic (eIDAS compliant).
* [ ] **MOD-RACE:** Implement RTK GNSS processing logic for OCS detection with <100ms latency.
* [ ] **MOD-SCORE:** Develop the universal scoring engine supporting ORC/IRC and custom Python scripts.

### Phase 3: Frontend & Testing
* [ ] Generate the **Frontend API Client** from the FastAPI OpenAPI schema.
* [ ] Build the **React dashboard** using shadcn/ui with native Dark Mode support.
* [ ] Write **Playwright E2E tests** for registration and race-start scenarios.
