# GearGuard – The Ultimate Maintenance Tracker

GearGuard is a maintenance management system designed to help organizations efficiently track equipment, manage maintenance teams, and handle corrective and preventive maintenance requests through an intuitive, Odoo-like workflow.

The system focuses on **clarity, workflow correctness, and real-world usability**, making it suitable for enterprise environments and hackathon demonstrations.

---

## 🧠 Problem Statement

Organizations need a centralized system to:

- Track **assets/equipment**
- Assign **maintenance teams & technicians**
- Manage **maintenance requests**
- Support **corrective (breakdown)** and **preventive (scheduled)** maintenance
- Visualize work using **Kanban** and **Calendar** views

### Core Philosophy


---

## ✨ Key Features

### 🔹 Equipment Management
- Track equipment by **department or employee**
- Store technical and ownership details
- Assign default maintenance team and technician
- **Smart “Maintenance” button** on equipment:
  - View all related maintenance requests
  - Badge shows number of open requests
- Scrap logic to mark equipment as unusable

---

### 🔹 Maintenance Teams
- Multiple specialized teams (IT, Mechanical, Electrical, etc.)
- Technicians linked to teams
- Only team members can work on that team’s requests

---

### 🔹 Maintenance Requests
- Two types:
  - **Corrective** (Breakdown)
  - **Preventive** (Routine Checkup)
- Auto-fill logic:
  - Selecting equipment auto-assigns maintenance team
- Lifecycle workflow:

- Duration tracking (hours spent)

---

## 📊 Views & User Experience

### 🟦 Kanban Board
- Primary workspace for technicians
- Drag & drop requests between stages
- Technician visible on each card
- Overdue requests highlighted visually
- Odoo-like clean and professional UI

### 🗓 Calendar View
- Displays **preventive maintenance** only
- Helps technicians plan upcoming work
- Click on a date to schedule maintenance

---

## 🧱 Tech Stack

### Backend
- **Node.js + Express**
- **PostgreSQL**
- TypeScript-based modular architecture

### Frontend
- **React (TypeScript)**
- Odoo-inspired layout and styling
- Kanban & Calendar based UX

### Database
- Relational PostgreSQL schema
- Foreign keys enforcing real-world constraints
- Demo seed data for quick testing

---

## 🗂️ Project Structure (High Level)


---

## 🚀 Demo Workflow (As Shown in Video)

1. View equipment list
2. Open an equipment record
3. Click **Maintenance** smart button
4. Create a corrective maintenance request
5. Observe auto-assigned maintenance team
6. Move request across Kanban stages
7. Record duration and mark as repaired
8. Create preventive maintenance request
9. View scheduled maintenance in Calendar
10. Scrap request → equipment marked unusable

---

## 🧪 Demo Data

- Indian professional names and locations
- Office and industrial equipment
- Preloaded corrective and preventive requests

This allows a **smooth live demo without manual setup**.

---

## 🛠️ Setup & Run (Summary)

Detailed setup instructions are available in:

---

## 🎯 Hackathon Focus

- Strict alignment with the Problem Statement
- Working end-to-end workflow
- Clear UX and business logic
- Easy to explain to judges

This project prioritizes **correctness and usability over over-engineering**.

---

## 📌 Conclusion

GearGuard demonstrates how a real-world maintenance workflow can be translated into a clean, efficient, and intuitive system.  
It combines structured backend logic with an Odoo-like frontend experience to deliver a complete and demo-ready solution.

---
