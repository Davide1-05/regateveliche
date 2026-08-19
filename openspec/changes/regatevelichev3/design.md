# System Design: SAIL-PLATFORM-V3.1

### Technology Stack
* **Backend:** FastAPI for the API, SQLModel (ORM), and Pydantic (v2) for data validation.
* **Database:** PostgreSQL (v15+) with secure JWT authentication and Argon2 password hashing.
* **Frontend:** React (v18+) with TypeScript, Vite, Tailwind CSS, and shadcn/ui components.
* **Infrastructure:** Docker Compose orchestration, Traefik reverse proxy with automatic HTTPS, and GitHub Actions for CI/CD.

### Component Architecture
* **COMP-ADM:** React frontend communicating with a FastAPI backend to manage club registrations.
* **COMP-RACE:** Direct integration between the race direction dashboard and robotic buoy APIs (e.g., MarkSetBot).
* **COMP-TELEM:** Real-time WebSocket processing for NMEA/SignalK telemetry data.
* **Reverse Proxy:** Traefik manages entry points, load balancing, and SSL termination via Let's Encrypt.
