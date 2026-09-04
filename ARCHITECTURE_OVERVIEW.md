# Architecture Overview: Integrated Sailing Platform (RegateVeleLiche)

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Services Architecture](#backend-services-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Algorithm Modules](#algorithm-modules)
9. [Key User Flows](#key-user-flows)
10. [Roles and Permissions](#roles-and-permissions)
11. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

**RegateVeleLiche v3** is an integrated digital platform for sailing regattas, unifying administrative management, scoring, race direction, umpiring, and boat tracking into a single cloud-native architecture. The system supports the full regatta lifecycle from club registration through race operations to post-race scoring and analysis.

### Core Objectives
- **Administrative Burden Reduction:** Mobile-first registration with native digital signatures (eIDAS compliant)
- **Sporting Precision:** RTK positioning for OCS detection and Dynamic Corrected Times via WRS algorithm
- **Environmental Sustainability:** Support for autonomous robotic buoys (MarkSetBot integration)
- **Audience Engagement:** Tactical dashboards, real-time telemetry, and 3D replay capabilities

---

## System Architecture

```mermaid
graph TB
    subgraph PLATFORM["REGATEVELELICHE PLATFORM"]
        FE["<b>Frontend</b><br/>React 19 + TypeScript<br/>Tailwind CSS<br/>Leaflet + Recharts"]
        API["<b>Backend API</b><br/>FastAPI (Python)<br/>SQLModel + SQLAlchemy<br/>Pydantic v2"]
        DB["<b>Database</b><br/>PostgreSQL 15<br/>PostGIS Extension"]
    end

    subgraph SERVICES["EXTERNAL SERVICES"]
        STRIPE["Stripe Payments"]
        FCM["Firebase Cloud Messaging"]
        TWILIO["Twilio SMS"]
        SENDGRID["SendGrid Email"]
    end

    subgraph INFRASTRUCTURE["INFRASTRUCTURE"]
        TRAEFIK["Traefik v3.0<br/>Reverse Proxy + HTTPS"]
        DOCKER["Docker Compose<br/>Container Orchestration"]
    end

    FE <-->|HTTP/REST| API
    API <-->|SQLAlchemy ORM| DB
    FE -->|i18n 5 languages| i18n["Internationalization"]
    API -->|Algorithm Engine| ALGO["<b>Algorithms</b><br/>OCS Detection<br/>Tactical Timing<br/>WRS Scoring"]

    STRIPE -.->|Payment Processing| API
    FCM -.->|Push Notifications| API
    TWILIO -.->|SMS Alerts| API
    SENDGRID -.->|Email Delivery| API

    TRAEFIK -->|Routes Traffic| FE
    TRAEFIK -->|Routes Traffic| API
    DOCKER -->|Containerizes| TRAEFIK
    DOCKER -->|Containerizes| API
    DOCKER -->|Containerizes| DB
```

---

## Technology Stack

### Backend Services
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | FastAPI (Python 3.12+) | RESTful API with async support |
| ORM | SQLModel + SQLAlchemy | Database modeling and migrations |
| Authentication | JWT + OAuth2 Password Bearer | Secure user authentication |
| Password Hashing | Argon2 | Cryptographic password storage |
| Validation | Pydantic v2 | Request/response validation |

### Frontend Application
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 19 + TypeScript | SPA application |
| Routing | React Router DOM | Client-side navigation |
| Styling | Tailwind CSS | Utility-first responsive design |
| Maps | Leaflet (via react-leaflet) | Race course visualization |
| Charts | Recharts | Data visualization |
| i18n | custom implementation | Multi-language support (5 languages) |

### Database & Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 15 | Primary data store |
| Spatial Extension | PostGIS | Geospatial queries for telemetry |
| Containerization | Docker + Docker Compose | Service orchestration |
| Reverse Proxy | Traefik v3.0 | HTTPS termination, routing |

---

## Backend Services Architecture

### Module Organization

```mermaid
graph TB
    subgraph BACKEND["backend/ — FastAPI Application"]
        main["main.py<br/>FastAPI entry point"]
        config["config.py<br/>Settings (env-based)"]
        database["database.py<br/>DB connection & session mgmt"]
        auth["auth.py<br/>JWT + RBAC authorization"]

        subgraph MODELS["models/ — SQLAlchemy Data Models"]
            models_user["user.py<br/>User, Club, CrewMember"]
            models_regatta["regatta.py<br/>Regatta, Race, Registration"]
            models_telemetry["telemetry.py<br/>TelemetryPoint, OCSViolation"]
            models_scoring["scoring.py<br/>RaceResult, RegattaStandings"]
            models_course["course.py<br/>StartLine, Mark"]
        end

        subgraph SERVICES["services/ — Business Logic Layer"]
            services_rating["rating_service.py<br/>ORC/IRC rating lookup"]
            services_scoring["scoring_service.py<br/>Race result orchestrator"]
            services_notification["notification_service.py<br/>FCM, SMS, WhatsApp"]
        end

        subgraph ALGORITHMS["algorithms/ — Math Computation Modules"]
            algo_ocs["ocs_detection.py<br/>OCS violation detection"]
            algo_tactical["tactical_timing.py<br/>Time-to-burn engine"]
        end

        subgraph API_ROUTES["api/ — Route Handlers (by domain)"]
            api_regatta["regatta_api.py<br/>Regatta CRUD endpoints"]
            api_race["race_api.py<br/>Race management endpoints"]
            api_scoring["scoring_api.py<br/>Scoring & standings endpoints"]
            api_telemetry["telemetry_api.py<br/>Telemetry data endpoints"]
        end

        subgraph REPOSITORIES["repositories/ — Data Access Layer"]
            repo_rating["rating_repository.py<br/>Rating certificate repository"]
        end

        subgraph MIDDLEWARE["middleware/ — HTTP Middleware"]
            middleware_logging["logging_middleware.py<br/>Request/response logging"]
        end
    end

    main --> config
    main --> database
    main --> auth
    main --> MODELS
    main --> SERVICES
    main --> ALGORITHMS
    main --> API_ROUTES
    main --> REPOSITORIES
    main --> MIDDLEWARE

    MODELS -.->|SQLAlchemy ORM| DATABASE["PostgreSQL Database"]
    SERVICES -->|Uses| ALGORITHMS
    SERVICES -.->|External APIs| EXTERNAL["ORC/IRC Rating APIs<br/>Firebase Cloud Messaging<br/>Twilio SMS<br/>SendGrid Email"]
    API_ROUTES -->|Calls| SERVICES
    API_ROUTES -->|Calls| ALGORITHMS
    REPOSITORIES -->|Data Access| MODELS
    MIDDLEWARE -->|Wraps| main
```

### Service Layer Responsibilities

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| `RatingService` | Fetch ORC/IRC ratings by sail number | External rating APIs |
| `ScoringService` | Orchestrate race result calculations | RatingService, WRS algorithm |
| `NotificationService` | Multi-channel notifications (FCM, SMS, WhatsApp) | Firebase Cloud Messaging, Twilio, SendGrid |

---

## Frontend Architecture

### Page Structure

### Source Tree

```mermaid
graph TB
    subgraph FRONTEND_SRC["frontend/src/ — Source Directory"]
        App_tsx["App.tsx<br/>Root component with routing"]
        main_tsx["main.tsx<br/>Application entry point"]
        
        subgraph PAGES_DIR["pages/ — Route-level page components"]
            pages_home["HomePage.tsx<br/>Landing page (hero, features, stats)"]
            pages_login["LoginPage.tsx<br/>User authentication"]
            pages_register["RegisterPage.tsx<br/>New user registration"]
            pages_dashboard["DashboardPage.tsx<br/>Post-login dashboard with statistics"]
            pages_regattas["RegattasPage.tsx<br/>Browse all regattas"]
            pages_registration["RegattaRegistrationPage.tsx<br/>Event registration form"]
            pages_payment["PaymentPage.tsx<br/>Stripe payment processing"]
            pages_tactical["TacticalDashboardPage.tsx<br/>Real-time race data (Time to Burn, OCS)"]
            pages_notices["OfficialNoticeBoardPage.tsx<br/>ONB with push notifications"]
        end
        
        subgraph COMPONENTS_DIR["components/ — Reusable UI components"]
            comp_navbar["Navbar.tsx<br/>Top navigation bar"]
            comp_langswitcher["LanguageSwitcher.tsx<br/>i18n language toggle (5 languages)"]
            comp_plugin["PluginToggle.tsx<br/>Feature flag toggles for beta features"]
        end
        
        subgraph CONFIG_DIR["config/ — Application configuration"]
            config_flags["featureFlags.tsx<br/>Feature flag definitions and evaluation"]
        end
        
        subgraph HOOKS_DIR["hooks/ — Custom React hooks"]
            hooks_stats["useDashboardStats.ts<br/>Dashboard statistics data fetching"]
        end
        
        subgraph I18N_DIR["i18n/ — Internationalization (5 languages)"]
            i18n_index["index.ts<br/>i18n initialization and locale detection"]
            
            subgraph LOCALES_DIR["locales/ — Translation files"]
                locales_en["en.json<br/>English translations"]
                locales_de["de.json<br/>German translations"]
                locales_es["es.json<br/>Spanish translations"]
                locales_fr["fr.json<br/>French translations"]
                locales_it["it.json<br/>Italian translations"]
            end
        end
        
        subgraph TYPES_DIR["types/ — TypeScript type definitions"]
            types_regatta["regatta.ts<br/>Regatta, Race, Registration types"]
            types_telemetry["telemetry.ts<br/>Telemetry data point types"]
        end
        
        subgraph IMAGES_DIR["images/ — Static assets (flags, logos)"]
            images_flags["flags/de.svg, es.svg, fr.svg, it.svg, us.svg<br/>Country flag icons"]
        end
    end
    
    App_tsx --> main_tsx
    App_tsx --> PAGES_DIR
    App_tsx --> COMPONENTS_DIR
    App_tsx --> CONFIG_DIR
    App_tsx --> HOOKS_DIR
    App_tsx --> I18N_DIR
    App_tsx --> TYPES_DIR
    App_tsx --> IMAGES_DIR
    
    i18n_index -.->|Provides translations to| locales_en
    i18n_index -.->|Provides translations to| locales_de
    i18n_index -.->|Provides translations to| locales_es
    i18n_index -.->|Provides translations to| locales_fr
    i18n_index -.->|Provides translations to| locales_it
    
    PAGES_DIR --> TYPES_DIR
    HOOKS_DIR -->|Fetches data from| API["Backend API (FastAPI)"]
    
    style FRONTEND_SRC fill:#f9d,stroke:#333,stroke-width:2px
```

### Component Hierarchy

```mermaid
graph TB
    subgraph FRONTEND["frontend/src/ — React Application"]
        App["<b>App.tsx</b><br/>PluginProvider + Router<br/>Root component"]
        main_tsx["main.tsx<br/>Application entry point"]

        subgraph PAGES["pages/ — Route-level Page Components"]
            pages_home["HomePage.tsx<br/>Landing page (hero, features, stats)"]
            pages_login["LoginPage.tsx<br/>User authentication"]
            pages_register["RegisterPage.tsx<br/>New user registration"]
            pages_dashboard["DashboardPage.tsx<br/>Post-login dashboard with statistics"]
            pages_regattas["RegattasPage.tsx<br/>Browse all regattas"]
            pages_registration["RegattaRegistrationPage.tsx<br/>Event registration form"]
            pages_payment["PaymentPage.tsx<br/>Stripe payment processing"]
            pages_tactical["TacticalDashboardPage.tsx<br/>Real-time race data (Time to Burn, OCS)"]
            pages_notices["OfficialNoticeBoardPage.tsx<br/>ONB with push notifications"]
        end

        subgraph COMPONENTS["components/ — Reusable UI Components"]
            comp_navbar["Navbar.tsx<br/>Top navigation bar"]
            comp_langswitcher["LanguageSwitcher.tsx<br/>i18n language toggle (5 languages)"]
            comp_plugin["PluginToggle.tsx<br/>Feature flag toggles for beta features"]
        end

        subgraph CONFIG["config/ — Application Configuration"]
            config_flags["featureFlags.tsx<br/>Feature flag definitions and evaluation"]
        end

        subgraph HOOKS["hooks/ — Custom React Hooks"]
            hooks_stats["useDashboardStats.ts<br/>Dashboard statistics data fetching"]
        end

        subgraph I18N["i18n/ — Internationalization (5 languages)"]
            i18n_index["index.ts<br/>i18n initialization and locale detection"]
            i18n_en["locales/en.json<br/>English translations"]
            i18n_de["locales/de.json<br/>German translations"]
            i18n_es["locales/es.json<br/>Spanish translations"]
            i18n_fr["locales/fr.json<br/>French translations"]
            i18n_it["locales/it.json<br/>Italian translations"]
        end

        subgraph TYPES["types/ — TypeScript Type Definitions"]
            types_regatta["regatta.ts<br/>Regatta, Race, Registration types"]
            types_telemetry["telemetry.ts<br/>Telemetry data point types"]
        end

        subgraph IMAGES["images/ — Static Assets"]
            images_flags["flags/de.svg, es.svg, fr.svg, it.svg, us.svg<br/>Country flag icons"]
        end
    end

    main_tsx --> App
    App --> comp_navbar
    App --> PAGES
    PAGES --> pages_home
    PAGES --> pages_login
    PAGES --> pages_register
    PAGES --> pages_dashboard
    PAGES --> pages_regattas
    PAGES --> pages_registration
    PAGES --> pages_payment
    PAGES --> pages_tactical
    PAGES --> pages_notices

    comp_navbar --> comp_langswitcher
    comp_navbar --> comp_plugin

    App --> CONFIG
    App --> HOOKS
    App --> I18N
    App --> TYPES
    App --> IMAGES

    i18n_index -.->|Provides translations| i18n_en
    i18n_index -.->|Provides translations| i18n_de
    i18n_index -.->|Provides translations| i18n_es
    i18n_index -.->|Provides translations| i18n_fr
    i18n_index -.->|Provides translations| i18n_it

    HOOKS -->|Fetches data from| API["Backend API (FastAPI)"]
    PAGES -->|Uses types| TYPES
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ registrations : "owns"
    users ||--o{ crew_members : "registered as"
    users ||--o{ payment_transactions : "makes"
    users ||--o{ protests_made : "files (protestor)"
    users ||--o{ protests_against : "targeted by (protestee)"
    users ||--o{ notices_published : "publishes"

    clubs ||--o{ club_memberships : "has members"
    clubs ||--o{ regattas : "organized by"

    regattas ||--o{ registrations : "receives"
    regattas ||--o{ races : "contains"
    regattas ||--o{ notices_published : "publishes"
    regattas ||--o{ protests_made : "has (protestor)"
    regattas ||--o{ protests_against : "targeted by (protestee)"

    races ||--o{ marks : "defined by"
    races ||--o{ telemetry_points : "records"
    races ||--o{ ocs_violations : "has violations"
    races ||--o{ race_results : "produces results for"

    registrations ||--o{ crew_members : "includes"
    registrations ||--o{ payment_transactions : "paid via"
    registrations ||--o{ telemetry_points : "tracked by"
    registrations ||--o{ ocs_violations : "violates"
    registrations ||--o{ race_results : "scores in"

    regattas ||--o{ regatta_standings : "has standings for"

    users ||--o{ notifications : "receives"

    users {
        uuid id PK
        string email UK
        string hashed_password
        string role
        boolean is_active
        boolean is_verified
    }

    clubs {
        uuid id PK
        string name
        string federation_code
        string certification_level
        string city
        string email
    }

    club_memberships {
        uuid user_id FK
        uuid club_id FK
        string role
    }

    registrations {
        uuid id PK
        uuid regatta_id FK
        uuid user_id FK
        string boat_class
        string sail_number
        string skipper_name
        string signature_hash
        string payment_status
        string status
    }

    crew_members {
        uuid id PK
        uuid registration_id FK
        uuid user_id FK
        string full_name
        string email
        string phone
        string role
        string status
    }

    regattas {
        uuid id PK
        uuid organizer_id FK
        string name
        string code
        datetime start_date
        datetime end_date
        float latitude
        float longitude
        string scoring_class
    }

    races {
        uuid id PK
        uuid regatta_id FK
        int race_number
        datetime scheduled_start
        datetime actual_start
        string course_type
        string status
    }

    marks {
        uuid id PK
        uuid regatta_id FK
        uuid race_id FK
        string mark_letter
        float latitude
        float longitude
        boolean is_robotic
    }

    telemetry_points {
        uuid id PK
        uuid registration_id FK
        uuid race_id FK
        float latitude
        float longitude
        float hdop
        string fix_type
        float sog
        float cog
        datetime recorded_at
    }

    ocs_violations {
        uuid id PK
        uuid race_id FK
        uuid registration_id FK
        timestamp violation_time
        float position_latitude
        float position_longitude
    }

    race_results {
        uuid id PK
        uuid race_id FK
        uuid registration_id FK
        datetime finish_time
        decimal net_time
        int points
        string scoring_code
    }

    regatta_standings {
        uuid id PK
        uuid regatta_id FK
        uuid registration_id FK
        decimal total_points
        decimal net_points
        int overall_position
    }

    protests_made {
        uuid id PK
        uuid regatta_id FK
        uuid race_id FK
        uuid protestor_regid FK
        string rule_broken
        string description
        float evidence_lat
        float evidence_lon
        string status
        string decision
    }

    protests_against {
        uuid id PK
        uuid regatta_id FK
        uuid race_id FK
        uuid protestee_regid FK
        string rule_broken
        string description
        float evidence_lat
        float evidence_lon
        string status
        string decision
    }

    payment_transactions {
        uuid id PK
        uuid user_id FK
        decimal amount
        string currency
        string payment_method
        string gateway_transaction_id
        string status
    }

    notices_published {
        uuid id PK
        uuid regatta_id FK
        uuid published_by FK
        string title
        text content
        string notice_type
        int priority
        datetime published_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid notice_id FK
        string title
        string message
        string channel
        string status
    }
```

### Model Inventory

| Model | Table | Purpose | Key Fields |
|-------|-------|---------|------------|
| `User` | users | Platform user accounts | email, hashed_password, role, is_active |
| `Club` | clubs | Sailing club entities | name, federation_code, certification_level |
| `ClubMembership` | club_memberships | User-club membership relationship | user_id, club_id, role |
| `Registration` | registrations | Boat registration for a regatta | regatta_id, sail_number, skipper_name, signature_hash |
| `CrewMember` | crew_members | Individual crew members on a boat | registration_id, full_name, email, phone, role |
| `Regatta` | regattas | Regatta event definition | name, code, organizer_id, start_date, end_date |
| `Race` | races | Individual race within a regatta | regatta_id, race_number, scheduled_start, course_type |
| `Mark` | marks | Race course mark/buoy | regatta_id, race_id, mark_letter, latitude, longitude, is_robotic |
| `StartLine` | start_lines | Starting line definition for OCS detection | race_id, p1_latitude, p1_longitude, p2_latitude, p2_longitude |
| `TelemetryPoint` | telemetry_points | Boat GPS telemetry data point | registration_id, race_id, latitude, longitude, hdop, fix_type, sog, cog |
| `OCSViolation` | ocs_violations | On Course Side violation record | race_id, registration_id, violation_time, position_latitude, position_longitude |
| `RaceResult` | race_results | Scoring result for a boat in a race | race_id, registration_id, finish_time, net_time, points, scoring_code |
| `RegattaStandings` | regatta_standings | Aggregated standings for a regatta | regatta_id, registration_id, total_points, net_points, overall_position |
| `Protest` | protests | Protest submission | regatta_id, race_id, protestor_registration_id, protestee_registration_id, rule_broken, status |
| `PaymentTransaction` | payment_transactions | Payment record | user_id, amount, currency, payment_method, gateway_transaction_id, status |
| `NoticeBoardNotice` | notice_board_notices | Official Notice Board notice | regatta_id, title, content, notice_type, priority, published_by |
| `Notification` | notifications | Push notification delivery record | user_id, notice_id, title, message, channel, status |
| `UserNotificationPreference` | user_notification_preferences | User notification preferences | user_id, app_notifications_enabled, whatsapp_enabled, sms_enabled |

---

## API Endpoints Reference

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/auth/register` | Register new user | No | — |
| `POST` | `/auth/login` | Login and receive JWT token | No | — |

### Registrations (`/registrations`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/registrations/user/{user_id}` | Get user's registrations | Yes | Any authenticated |
| `POST` | `/registrations` | Register for a regatta | Yes | sailor, club_manager, race_official, admin |
| `GET` | `/registrations/regatta/{regatta_id}/entries` | Get all entries for a regatta | Yes | club_manager, race_official, admin |
| `POST` | `/registrations/{registration_id}/crew` | Add crew member to registration | Yes | skipper, club_manager, race_official, admin |

### Regattas (`/regattas`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/regattas` | List all regattas (filterable) | No | — |
| `POST` | `/regattas` | Create a new regatta | Yes | club_manager, admin |
| `GET` | `/regattas/{regatta_id}` | Get regatta details | No | — |
| `PUT` | `/regattas/{regatta_id}` | Update regatta | Yes | club_manager, admin |
| `DELETE` | `/regattas/{regatta_id}` | Delete regatta | Yes | admin |

### Race Management (`/races`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/regattas/{regatta_id}/races` | Get races for a regatta | No | — |
| `POST` | `/regattas/{regatta_id}/races` | Create race | Yes | club_manager, race_official, admin |

### Marks/Buoys (`/marks`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/regattas/{regatta_id}/marks` | Get marks for a regatta/race | No | — |
| `POST` | `/regattas/{regatta_id}/marks` | Create mark | Yes | club_manager, race_official, admin |
| `PUT` | `/marks/{mark_id}` | Update mark position/details | Yes | club_manager, race_official, admin |
| `DELETE` | `/marks/{mark_id}` | Delete mark | Yes | club_manager, race_official, admin |

### Tactical Data (`/tactical`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/tactical/time-to-burn` | Calculate time to burn for a boat | No | — |
| `GET` | `/tactical/ocs-status` | Check OCS status for a boat | No | — |

### Scoring (`/scoring`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/scoring/calculate-results` | Calculate race results using WRS | Yes | club_manager, race_official, admin |

### Standings (`/standings`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/standings/{regatta_id}` | Get regatta standings | No | — |

### Ratings/Certificates (`/ratings`, `/certificates`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/ratings/orc` | Lookup ORC rating by sail number | No | — |
| `POST` | `/ratings/orc/calculate` | Calculate ORC rating | No | — |
| `POST` | `/certificates/upload` | Upload rating certificate (PDF/XML) | Yes | Any authenticated |
| `GET` | `/certificates/verify` | Verify a rating certificate | No | — |

### Clubs (`/clubs`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/clubs` | List all clubs | No | — |
| `POST` | `/clubs` | Create a new club | Yes | admin |
| `GET` | `/clubs/{club_id}` | Get club details | No | — |
| `PUT` | `/clubs/{club_id}` | Update club | Yes | admin |
| `DELETE` | `/clubs/{club_id}` | Delete club | Yes | admin |

### Notices (`/notices`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/notices` | List all notices | No | — |
| `POST` | `/notices` | Create a new notice | Yes | club_manager, admin |

### Notifications (`/notifications`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `GET` | `/notification-preferences` | Get user notification preferences | Yes | Any authenticated |
| `PUT` | `/notification-preferences` | Update notification preferences | Yes | Any authenticated |

### Payments (`/payments`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| `POST` | `/payments` | Process a payment (Stripe) | Yes | Any authenticated |

---

## Algorithm Modules

### OCS Detection Algorithm (`backend/algorithms/ocs_detection.py`)

**Purpose:** Detects On Course Side violations during race starts.

**Formula (PRD Section 3.1):**
```
D = ((y₂ - y₁) × x_b - (x₂ - x₁) × y_b + x₂×y₁ - y₂×x₁) / √((y₂-y₁)² + (x₂-x₁)²)
```

Where:
- `(x₁, y₁)` = Start line point 1 (committee boat)
- `(x₂, y₂)` = Start line point 2 (pin boat)  
- `(x_b, y_b)` = Boat's bow sensor position

**Implementation:** [`check_ocs_violation()`](backend/algorithms/ocs_detection.py:5) — Returns `is_ocs`, `distance` to line, and `bearing_to_line`.

### Tactical Timing Engine (`backend/algorithms/tactical_timing.py`)

**Purpose:** Calculates "Time to Burn" — when sailors should accelerate to hit the start line at full speed.

**Formula (PRD Section 3.3):**
```
T_burn = T_until_start - T_to_line_at_target_speed
```

Where:
- `T_until_start` = Time from now until race start signal
- `T_to_line_at_target_speed` = Distance to line / target boat speed

**Implementation:** [`TacticalTimingEngine`](backend/algorithms/tactical_timing.py:136) class with methods:
- [`calculate_time_to_burn()`](backend/algorithms/tactical_timing.py:150) — Main algorithm
- [`calculate_layline_status()`](backend/algorithms/tactical_timing.py:224) — Layline proximity check

### Weather Routing Scoring (WRS) (`backend/algorithms/wrs_algorithm.py`)

**Purpose:** Weather-compensated scoring to address unfair wind distribution.

**Formula (PRD Section 3.2):**
```
T_corrected = T_elapsed × (Reference_PET / Individual_PET)
```

Where:
- `T_elapsed` = Actual elapsed time for the boat
- `Reference_PET` = Predicted Elapsed Time for a reference boat in ideal conditions
- `Individual_PET` = Predicted Elapsed Time for this specific boat given actual weather

**Implementation:** [`WRSWeatherRoutingEngine`](backend/algorithms/wrs_algorithm.py:205) class with methods:
- [`calculate_pet()`](backend/algorithms/wrs_algorithm.py:226) — Calculate Predicted Elapsed Time using VPP polar curves and GRIB weather data
- [`evaluate_race_result()`](backend/algorithms/wrs_algorithm.py:322) — Complete WRS evaluation for a single boat

---

## Key User Flows

### Flow 1: Regatta Registration (Club Manager)

```mermaid
sequenceDiagram
    participant CM as Club Manager
    participant FE as Frontend App
    participant API as Backend API
    participant DB as Database
    participant Stripe as Stripe Payment

    CM->>FE: Login (email/password)
    FE->>API: POST /auth/login
    API->>DB: Query user by email
    DB-->>API: User record + hashed password
    API->>API: Verify password (Argon2)
    API-->>FE: JWT access token
    FE->>CM: Display dashboard

    CM->>FE: Create new regatta
    FE->>API: POST /regattas {name, dates, location}
    API->>DB: Insert regatta record
    DB-->>API: Created regatta ID
    API-->>FE: Regatta created successfully
    FE->>CM: Show regatta details page

    CM->>FE: Publish Official Notice Board notice
    FE->>API: POST /notices {title, content}
    API->>DB: Insert notice record
    DB-->>API: Created notice ID
    API-->>FE: Notice published
    FE->>CM: Display confirmation

    CM->>FE: Send WhatsApp notification
    FE->>API: POST /notices/{id}/notify-whatsapp
    API->>API: NotificationService.send_whatsapp()
    API-->>FE: Notification sent
    FE->>CM: Show delivery status
```

### Flow 2: Sailor Registration & Payment

```mermaid
sequenceDiagram
    participant S as Sailor
    participant FE as Frontend App
    participant API as Backend API
    participant DB as Database
    participant Stripe as Stripe Payment

    S->>FE: Browse regattas (no auth required)
    FE->>API: GET /regattas?status=open
    API->>DB: Query open regattas
    DB-->>API: Regatta list
    API-->>FE: Display regatta cards

    S->>FE: Click "Register" on a regatta
    FE->>S: Show registration form (boat info, crew)
    S->>FE: Submit registration with e-signature
    FE->>API: POST /registrations {regatta_id, boat_class, sail_number, skipper_name, signature_hash}
    API->>DB: Insert registration record
    DB-->>API: Registration ID
    API-->>FE: Registration confirmed

    S->>FE: Proceed to payment
    FE->>Stripe: Create payment intent (amount from regatta)
    Stripe-->>FE: Client secret
    FE->>S: Display Stripe payment form
    S->>FE: Enter card details
    FE->>API: POST /payments {payment_method, amount}
    API->>DB: Insert payment transaction record
    DB-->>API: Transaction ID
    API-->>FE: Payment successful
    FE->>S: Show confirmation + race info
```

### Flow 3: Race Day — OCS Detection

```mermaid
sequenceDiagram
    participant Boat as Sailor's Device (GPS)
    participant API as Backend API
    participant Algo as OCS Algorithm
    participant DB as Database

    loop Every 1 second
        Boat->>API: POST /telemetry {registration_id, lat, lon, sog, cog}
        API->>Algo: check_ocs_violation(lat, lon, start_line)
        Algo->>Algo: Calculate perpendicular distance to line
        Algo-->>API: is_ocs = false (or true if violation)
        
        alt OCS Violation Detected
            API->>DB: Insert OCSViolation record
            API->>Boat: Send push notification alert
        end
        
        API->>DB: Save telemetry point
        DB-->>API: Telemetry ID
        API-->>Boat: Acknowledged
    end
```

### Flow 4: Post-Race Scoring (WRS)

```mermaid
sequenceDiagram
    participant PRO as Race Official
    participant FE as Frontend App
    participant API as Backend API
    participant SC as ScoringService
    participant WRS as WRS Algorithm
    participant DB as Database

    PRO->>FE: Click "Calculate Results" for race
    FE->>API: POST /scoring/calculate-results {race_id, regatta_code}
    API->>SC: ScoringService.calculate_race_results(race_id)
    
    SC->>DB: Fetch all registrations for race
    DB-->>SC: Registration list
    
    loop For each registration
        SC->>WRS: evaluate_race_result(sail_number, boat_polar, course, elapsed_time)
        WRS->>WRS: Calculate Individual_PET using VPP polar curves + GRIB weather
        WRS->>WRS: Apply formula: T_corrected = T_elapsed × (Reference_PET / Individual_PET)
        WRS-->>SC: Corrected time, position, points
    end
    
    SC->>DB: Insert RaceResult records for all boats
    DB-->>SC: Results saved
    SC-->>API: Complete results with standings
    API-->>FE: Scoring complete
    FE->>PRO: Display final results table
```

---

## Roles and Permissions

### Role Hierarchy

| Role | Description | Access Level |
|------|-------------|--------------|
| `sailor` | Registered sailor/crew member | Basic access (own data only) |
| `club_manager` | Club administrator | Full club management + race operations |
| `race_official` | Race committee member | Race direction, scoring, course setup |
| `admin` | Platform administrator | All permissions including user management |

### Permission Matrix

| Action | sailor | club_manager | race_official | admin |
|--------|:------:|:------------:|:-------------:|:-----:|
| Browse public regattas | ✓ | ✓ | ✓ | ✓ |
| Register for regatta | ✓ | ✓ | ✓ | ✓ |
| View own results | ✓ | ✓ | ✓ | ✓ |
| Create regatta | ✗ | ✓ | ✗ | ✓ |
| Manage club members | ✗ | ✓ | ✗ | ✓ |
| Set up race course (marks) | ✗ | ✓ | ✓ | ✓ |
| Publish Official Notice Board | ✗ | ✓ | ✗ | ✓ |
| Calculate scoring results | ✗ | ✓ | ✓ | ✓ |
| Manage users/roles | ✗ | ✗ | ✗ | ✓ |

### RBAC Implementation

The platform uses a role-based access control system implemented in [`backend/auth.py`](backend/auth.py:138):

```python
# Role checkers (dependency factories)
require_admin = require_role("admin")
require_club_manager = require_role("club_manager", "admin")
require_race_official = require_role("race_official", "admin")
require_authenticated = require_role("sailor", "club_manager", "race_official", "admin")
```

---

## Deployment Architecture

### Docker Compose Services

| Service | Image | Port | Purpose | Health Check |
|---------|-------|------|---------|--------------|
| `traefik` | traefik:v3.0 | 80, 443, 8080 | Reverse proxy + HTTPS termination | Dashboard endpoint |
| `postgres` | postgres:15-alpine | 5432 | PostgreSQL database | pg_isready |
| `mailcatcher` | schickling/mailcatcher | 1080, 2525 | Email testing (development) | HTTP endpoint |
| `backend` | custom (Dockerfile) | 8000 | FastAPI application | Startup command |
| `frontend` | custom (Dockerfile) | 5173 | React SPA | Startup command |

### Traefik Routing Configuration

```yaml
# Service routing labels
traefik.http.routers.backend.rule: Host(`api.sail.local`)
traefik.http.services.backend.loadbalancer.server.port: 8000

traefik.http.routers.frontend.rule: Host(`sail.local`)
traefik.http.services.frontend.loadbalancer.server.port: 5173
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sail_admin:sail2026@localhost:5432/sail_platform` | PostgreSQL connection string |
| `SECRET_KEY` | `change-this-secret-key-in-production` | JWT signing secret |
| `JWT_ALGORITHM` | `HS256` | JWT token algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime in minutes |

### Deployment Architecture Diagram

```mermaid
graph TB
    subgraph DEPLOYMENT["Deployment Infrastructure"]
        INTERNET[("Internet")]
        
        subgraph TRAEFIK_LAYER["Traefik Reverse Proxy Layer"]
            traefik["<b>Traefik v3.0</b><br/>Port 80/443<br/>HTTPS Termination<br/>Load Balancing"]
        end
        
        subgraph DOCKER_COMPOSE["Docker Compose Services"]
            frontend_svc["<b>Frontend Container</b><br/>React SPA (Vite)<br/>Port 5173<br/>Health Check: startup"]
            backend_svc["<b>Backend Container</b><br/>FastAPI Application<br/>Port 8000<br/>Health Check: startup"]
            postgres_svc["<b>PostgreSQL 15</b><br/>Database + PostGIS<br/>Port 5432<br/>Health Check: pg_isready"]
            mailcatcher_svc["<b>MailCatcher</b><br/>Email Testing (dev)<br/>Port 1080/2525"]
        end
        
        subgraph EXTERNAL_SERVICES["External Services"]
            stripe["Stripe API<br/>Payment Processing"]
            firebase["Firebase Cloud Messaging<br/>Push Notifications"]
            twilio["Twilio SMS Gateway<br/>SMS Alerts"]
            sendgrid["SendGrid Email API<br/>Email Delivery"]
        end
    end
    
    INTERNET -->|HTTPS| traefik
    traefik -->|Host: sail.local| frontend_svc
    traefik -->|Host: api.sail.local| backend_svc
    backend_svc -->|SQLAlchemy ORM| postgres_svc
    backend_svc -->|HTTP API| stripe
    backend_svc -->|FCM SDK| firebase
    backend_svc -->|Twilio SDK| twilio
    backend_svc -->|SendGrid API| sendgrid
    
    style traefik fill:#f9d,stroke:#333,stroke-width:2px
    style frontend_svc fill:#bbf,stroke:#333,stroke-width:1px
    style backend_svc fill:#bbf,stroke:#333,stroke-width:1px
    style postgres_svc fill:#bfb,stroke:#333,stroke-width:1px
    style stripe fill:#f96,stroke:#333,stroke-width:1px
    style firebase fill:#6bf,stroke:#333,stroke-width:1px
    style twilio fill:#f66,stroke:#333,stroke-width:1px
    style sendgrid fill:#fb6,stroke:#333,stroke-width:1px
```

---

## Summary

This architecture delivers a production-ready sailing regatta platform with:

- **FastAPI backend** with SQLAlchemy ORM, JWT authentication, and role-based access control
- **React/TypeScript frontend** with multi-language support (5 languages), responsive design, and real-time tactical dashboard
- **PostgreSQL database** with PostGIS extension for geospatial telemetry storage
- **Docker Compose deployment** with Traefik reverse proxy and automatic HTTPS
- **Advanced algorithms** for OCS detection, tactical timing ("Time to Burn"), and weather-compensated scoring (WRS)

The platform is designed to scale horizontally through container orchestration and supports the full regatta lifecycle from club registration through race operations to post-race analysis.