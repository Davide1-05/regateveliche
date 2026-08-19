# Technical Specification: SAIL-PLATFORM-V3.1

### Functional Requirements (RF)
* **RF01 (Legal Signatures):** Signatures must be eIDAS compliant using SHA-256 hashing and secure storage.
* **RF04 (RTK Accuracy):** The system must identify OCS (On Course Side) violators with <2cm precision and <100ms latency.
* **RF08 (Security):** Implement strict RBAC via FastAPI OAuth2 dependencies.

### Quality Attributes (QA)
* **QA-01 (Availability):** Core services must maintain a 99.9% SLA during active regatta days.
* **QA-02 (Performance):** Real-time telemetry processing must stay below 100ms.
* **QA-04 (Security):** All PII and clinical data must be stored with E2EE and remain GDPR compliant.

### Operational Scenarios
* **UC3 (Autonomous Start):** System monitors RTK positions in real-time; at $T_{start}$, violators are instantly flagged, and scores are updated automatically.
* **UC5 (Protest):** Mobile submission of protests with GPS/video attachments must be validated against race time limits.
