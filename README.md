# ⛵ Sail Platform - Regatta & Race Course Management System

Una piattaforma full-stack completa per la pianificazione, configurazione e gestione in tempo reale di regate veliche. L'applicazione consente ai comitati di regata e agli organizzatori di gestire eventi, flotte, sistemi di compenso (es. ORC) e posizionare cartograficamente le boe del campo di regata tramite un'interfaccia interattiva con regole geometriche conformi agli standard **World Sailing / FIV**.

---

## 🚀 Funzionalità Principali

* **Gestione Regate:** Creazione, configurazione e monitoraggio di prove, gestione codici di accesso, date e filtri avanzati per circoli/stato gara.
* **Mappa Interattiva del Campo di Regata (Leaflet):**
  * Posizionamento visuale delle boe con coordinate GPS in tempo reale.
  * Supporto per tutte le tipologie di boe: *Windward* (Bolina), *Leeward* (Poppa), *Gate Left/Right* (Cancello di poppa) e *Finish* (Arrivo).
  * Tracciamento geometrico automatico della linea di arrivo e delle rotte tattiche.
  * Naming automatico alfabetico progressivo (`A`, `B`, `C`...) con gestione boe robotiche/dispositivi IoT.
* **Sicurezza & Autenticazione:** Sistema di autenticazione basato su token **JWT (JSON Web Tokens)** con protezione delle rotte API.
* **Persistenza & Migrazioni:** Database relazionale PostgreSQL gestito con SQLAlchemy e migrazioni automatiche tramite Alembic.

---

## 🛠️ Stack Tecnologico

### Frontend
* **Framework:** React 18 + TypeScript + Vite
* **Mappe & GIS:** Leaflet + React-Leaflet + CARTO Dark tiles
* **Styling:** Tailwind CSS + Lucide Icons

### Backend
* **Framework:** Python 3.10+ / FastAPI
* **Database ORM:** SQLAlchemy + PostgreSQL
* **Migrazioni Database:** Alembic
* **Autenticazione:** OAuth2 + JWT (Jose / Passlib)

### DevOps & Containerizzazione
* **Docker & Docker Compose** per l'orchestrazione locale e di produzione.

---

## 📂 Struttura del Progetto

```text
├── backend/                # Server FastAPI & Logica di Business
│   ├── alembic/            # Versioni e migrazioni del database
│   ├── routers/            # Endpoint REST (regattas, marks, auth, etc.)
│   ├── models/             # Modelli SQLAlchemy
│   ├── schemas/            # Schemi di validazione Pydantic
│   ├── Dockerfile
│   └── main.py             # Entrypoint applicazione FastAPI
├── src/                    # Frontend React
│   ├── components/         # Componenti UI (es. BuoyMapManager)
│   ├── pages/              # Viste principali della piattaforma
│   ├── services/           # Chiamate API client con gestione JWT
│   └── App.tsx
├── docker-compose.yml      # Configurazione container PostgreSQL, API e Web
└── README.md
