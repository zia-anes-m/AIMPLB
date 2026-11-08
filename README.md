# AIMPLB 30th Annual Session | Event Coordination & Volunteer Management System

Official, production-ready centralized event coordination and volunteer management portal for the **All India Muslim Personal Law Board (AIMPLB) 30th Annual Session**.

- **Organization:** All India Muslim Personal Law Board (AIMPLB)
- **Event:** 30th Annual Session
- **Dates:** 14, 15, and 16 December 2026
- **Venue:** Hajj House, Chennai, Tamil Nadu, India

---

## 🏛 System Architecture & Purpose

The platform replaces fragmented Excel sheets and WhatsApp lists with a single institutional database where volunteers across all 5 operational departments and the Secretariat Administration can coordinate invitee logistics in real-time.

### Core Modules

1. **Public Landing Page:**
   - Institutional banner with official AIMPLB logo, verified event details (14–16 Dec 2026, Hajj House Chennai).
   - Direct gateway for authorized volunteer access.

2. **Centralized Invitee Management:**
   - Single source of truth for all delegate categories: **Founder Members**, **General Members**, and **Special Invitees**.
   - Automatic unique Invitee Code generation (`AIM-INV-0001`, `AIM-INV-0002`).
   - Duplicate prevention with name and phone number collision warnings.
   - Comprehensive multi-department delegate profile view with activity trail.

3. **Transportation Management Module:**
   - Arrival and departure tracking with transport modes (Flight, Train, Bus, Car, Other).
   - Pre-configured hubs: Chennai International Airport (MAA), Chennai Central (MAS), Chennai Egmore (MS), Tambaram (TBM), Kilambakkam Bus Terminus (KCBT), Koyambedu Bus Terminus (CMBT).
   - Driver assignments, pickup requirements, and flight/train schedule logs.

4. **Accommodation Management Module:**
   - Hotels (Ramada, Orion, Rivera, Mathi, Other) and Hajj House (AC & Non-AC suites).
   - Automatic room collision checking to prevent double-booking rooms during overlapping dates.
   - Calculated length of stay and check-in / check-out manifests.

5. **Food & Catering Management Module:**
   - Breakfast, lunch, dinner, and tea requirements per date (14, 15, 16 Dec 2026).
   - Halal dietary preference tracking (Non-veg, Pure Veg, Diabetic/Medical special diets).
   - Direct caterer information and dining hall delivery points.

6. **Reception & Registration Help Desk:**
   - Real-time arrival status: `Expected`, `Arrived`, `Received`, `Checked In`, `Completed`.
   - Welcome conference kit and badge distribution tracking.
   - One-click quick check-in for arriving delegates.

7. **Meeting Hall & Seating Management:**
   - Main Auditorium, Conference Hall A/B, and Executive Committee Room seating.
   - Presidium / VIP Row, Founder Members Section, General Members blocks, and Media gallery.
   - Duplicate seat assignment detection.

8. **Admin Control Panel & Governance:**
   - Central dashboard with calculated readiness percentages across all departments.
   - Volunteer Account Management (account creation, role assignment, status toggling, password resets).
   - Comprehensive CSV & Printable reports.
   - Immutable audit logging for all database modifications.
   - Dynamic System Configuration (hotels, transit stations, session halls).

---

## 🛡 Roles & Permission Matrix

Enforced via Supabase Row Level Security (RLS) policies and frontend route guards:

| Role | Central Invitees | Transportation | Accommodation | Food | Reception | Seating | Volunteer Mgmt |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write | Read / Write |
| **Transportation Team** | Read / Add | Read / Write | Read Only | Read Only | Read Only | Read Only | No Access |
| **Accommodation Team** | Read / Add | Read Only | Read / Write | Read Only | Read Only | Read Only | No Access |
| **Food Team** | Read / Add | Read Only | Read Only | Read / Write | Read Only | Read Only | No Access |
| **Reception Team** | Read / Add | Read Only | Read Only | Read Only | Read / Write | Read Only | No Access |
| **Meeting Hall Team** | Read / Add | Read Only | Read Only | Read Only | Read Only | Read / Write | No Access |

---

## 🛠 Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons, React Router v7
- **Server State & Forms:** TanStack Query, React Hook Form, Zod validation
- **Backend & Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Triggers
- **Deployment:** Vercel ready (`vercel.json` SPA routing included)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
*(If unconfigured, the application runs seamlessly in **Interactive Demo Mode** with pre-seeded realistic data)*.

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🧪 Quick Test Accounts (Demo Mode)

On the Login screen or sidebar role switcher, you can simulate any role:

- **Admin (Chief Coordinator):** `admin`
- **Transportation Lead:** `transport_team`
- **Accommodation Lead:** `accommodation_team`
- **Food & Catering Lead:** `food_team`
- **Reception Lead:** `reception_team`
- **Meeting Hall Lead:** `hall_team`

*Default Demo Password:* `Aim2026!` (or use the one-click preset buttons on the login page).

---

## 📁 Database Migrations

SQL migrations are located in `supabase/migrations/`:
- `001_initial_schema.sql`: Table definitions, relational foreign keys, code sequence triggers.
- `002_rls_and_triggers.sql`: RLS policies and audit trail triggers.
- `003_seed_data.sql`: Official system settings and configuration options.
- `004_create_initial_admin.sql`: Administrative account initialization script.

Refer to `SUPABASE_SETUP.md` for full instructions.

---

## 📄 License & Organization

All India Muslim Personal Law Board (AIMPLB)  
30th Annual Session • Hajj House, Chennai • 14, 15, 16 December 2026

