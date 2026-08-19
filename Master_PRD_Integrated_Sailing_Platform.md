# Master Product Requirements Document: Integrated Digital Platform for Sailing Regattas

## 1. Introduction and Strategic Objectives

### 1.1 Product Purpose
This document defines the functional and technical requirements for a next-generation "All-in-One" software platform for the sailing regatta ecosystem. It unifies administrative management, scoring, race direction, umpiring, and boat tracking into a single cloud-native architecture.

### 1.2 Business and Operational Objectives
* **Administrative Burden Reduction:** Automating bureaucracy via mobile-first registration and native digital signatures.
* **Sporting Precision:** Integrating RTK positioning and advanced mathematical algorithms for OCS (premature start) detection and Dynamic Corrected Times (WRS).
* **Environmental Sustainability:** Supporting racecourse automation via autonomous robotic buoys.
* **Audience Engagement:** Increasing loyalty through Augmented Reality (AR), 3D replays, and automated social content.

---

## 2. Functional Architecture & Modules

### Module 1: Club Administration & Registration (Virtual Office)
* **Smart Registration Forms:** Historical data storage, sail inventory, and ORC/IRC rating certificate integration.
* **Native Electronic Signatures:** Encrypted engine for liability waivers and charter contracts.
* **Financial Management:** API integration with payment gateways (Apple Pay, Google Pay).
* **Official Notice Board (ONB):** Cloud-based system with push notifications (App, WhatsApp, SMS) and read receipts.

### Module 2: Race Management & Autonomous Infrastructure
* **Intelligent Course Editor:** Drag-and-drop map with predefined templates adapting to VPP targets and weather.
* **Robotic Buoy Control (IoT):** Native bidirectional API for piloting autonomous marks (e.g., MarkSetBot).
* **RTK Start Automation (StartSync):** GNSS receivers (< 2cm precision) for OCS detection.
* **Smart Finish:** Cloud recording via manual input or GPS telemetry.

### Module 3: Scoring Engine & Algorithmic Motor
* **Universal Engine:** Support for One-Design, ORC, IRC, PHRF, and Portsmouth Yardstick.
* **Rating API Integration:** Instant handicap retrieval via sail number.
* **WRS (Weather Routing Scoring):** GRIB model integration to calculate Predicted Elapsed Time (PET).

### Module 4: Procedural Integrity & Jury Management
* **Digital Inquiry System:** Mobile-based system for scoring clarifications.
* **Paperless Protest Management:** Electronic entry with GPS/Video attachments and automated time-limit verification.
* **Virtual Hearings:** Integration of videoconferencing with semantically searchable jurisprudence database.

### Module 5: Telemetry & Analysis
* **Real-Time Tactical Navigation:** Vector distance to line, "Time to Burn," and dynamic laylines.
* **Wearable and AR Integration:** HUD data transmission (SOG, VMG, Heading).
* **3D Replay & Kinematics:** Conversion of GPS logs into 3D environments with "tacking loss" analysis.

### Module 6: Crew Management & Maritime Safety
* **Crew Matching:** Professional digital roster and validated sailing CVs.
* **MOB Detection:** RFID/NFC tag monitoring with boat and safety vessel alarms.
* **Emergency Medical Dashboard:** Secure access to clinical data for race organizers.
* **AI Vision:** Thermal/Optical sensor integration for collision avoidance.

### Module 7: Audience Engagement & Broadcasting
* **Stadium AR:** Smartphone-based AR overlay for spectators on-site.
* **Social Automation:** AI-generated clips and captions based on race telemetry.
* **E-Sailing:** Real-time virtual racing against the live real-world fleet.

---

## 3. Detailed Algorithmic Specifications

### 3.1 Algorithm: StartSync (OCS Detection)
* **Logic:** Calculate the signed distance $D$ of the boat's bow sensor ($P_b$) from the start line vector ($P_1$ to $P_2$) at $T_0$.
* **Formula:** $D = rac{(y_2-y_1)x_b - (x_2-x_1)y_b + x_2y_1 - y_2x_1}{\sqrt{(y_2-y_1)^2 + (x_2-x_1)^2}}$
* **Precision:** Must implement antenna offset compensation based on boat heading.

### 3.2 Algorithm: Weather Routing Scoring (WRS)
* **Logic:** Compensate for unfair wind distribution.
* **Calculation:** $T_{corrected} = T_{elapsed} 	imes rac{Reference\_PET}{Individual\_PET}$.
* **Integration:** Ingest high-resolution GRIB data and interpolate against boat Polar Curves (VPP).

### 3.3 Algorithm: Tactical Timing (Time to Burn)
* **Formula:** $T_{burn} = (T_{current} - T_0) - rac{Dist_{line}}{SOG_{target}}$
* **Utility:** Provides the helmsman with the exact delta to hit the line at full speed at the gun.

### 3.4 Algorithm: Kinematic Analysis (Tacking Loss)
* **Metric:** $Loss = \int_{t_{start}}^{t_{end}} (VMG_{steady} - VMG_{actual}) dt$
* **Result:** Quantifies efficiency in meters and seconds lost during a maneuver.

---

## 4. Technical System Architecture

### 4.1 Data Communication
* **Bus Protocol:** Full support for **SignalK**, **NMEA 2000**, and **NMEA 0183**.
* **Real-time Stream:** WebSockets with **Protocol Buffers (Protobuf)** for efficient telemetry transmission.
* **Latency:** End-to-end latency < 100ms.

### 4.2 Infrastructure & Security
* **Backend:** Microservices architecture, cloud-native (Kubernetes/Docker).
* **Database:** **PostGIS** for high-speed spatial queries.
* **Security:** **AES-256** encryption for PII/Medical data; **OAuth2** for Role-Based Access Control (RBAC).

---

## 5. Use Cases
1. **Administrative Setup:** Organizing committee sets up event, collects fees, and publishes digital SIs.
2. **Race Operations:** PRO manages robotic buoys and start line via tablet.
3. **Tactical Racing:** Sailors use AR/HUD for RTK-start precision and laylines.
4. **Post-Race:** Instant WRS scoring and 3D telemetry replay for debriefing.
5. **Safety:** Automatic MOB alerts and AI collision avoidance in offshore legs.

---

## 6. Functional & Non-Functional Requirements

### Key Functional Requirements
- **FR01:** Native e-signature integration.
- **FR02:** Real-time rating API (ORC/IRC).
- **FR03:** IoT buoy command interface.
- **FR10:** Scripting engine for custom scoring logic.

### Non-Functional Requirements
- **Availability:** 99.9% during events with offline-first support.
- **Precision:** RTK-GNSS tolerance < 2cm.
- **Usability:** High-contrast UI for sunlight readability.

---

## 7. Implementation Roadmap & Checklist
- [ ] Database Schema: PostGIS for telemetry and historical results.
- [ ] API Gateway: SignalK to Cloud Proxy.
- [ ] Algorithmic Core: VPP Parser and WRS Engine.
- [ ] Frontend: React/Flutter for mobile-first experience.
- [ ] Hardware: Integration with NTRIP casters for RTK corrections.
