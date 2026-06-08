# Think360 Edge 🔋
**AI-Powered Battery Safety Intelligence Platform**

*Detect Early. Act Smart. Stay Safe.*

---

## Quick Start

### 1. Setup PostgreSQL (Required for full logging)
- Install [PostgreSQL](https://www.postgresql.org/download/windows/)
- Create database: `think360edge`
- Update `server/.env` with your credentials

### 2. Setup Database Schema
```bash
cd server
npx prisma db push
```

### 3. Start Backend (Terminal 1)
```bash
cd server
npm run dev
```
Server runs on **http://localhost:3001**

### 4. Start Frontend (Terminal 2)
```bash
cd client
npm run dev
```
Dashboard runs on **http://localhost:5173**

---

## Running Without PostgreSQL
The dashboard still works! Socket.io pushes live data regardless.
Event log won't persist but everything else runs perfectly.

---

## Dashboard Features
| Feature | Description |
|---------|-------------|
| Safety Banner | Full-width predictive status (SAFE / WARNING / CRITICAL) |
| Battery Health | Animated fill bar + sparkline chart |
| TinyML Ring | Animated SVG anomaly score ring |
| Cell Voltages | 4 live cards with fill bars, sparklines, imbalance detection |
| Arc Gauges | SVG arc meters for Current & Temperature |
| Gas Sensor | ppm bar with danger threshold markers |
| Protection Status | Relay + Alert with live ping indicators |
| Event Log | Timestamped fault history from PostgreSQL |
| Demo Mode | 3 one-click fault scenarios for Caterpillar demo |
| Toast Alerts | Slide-in notifications on fault detection |

## Demo Scenarios (For Caterpillar)
1. **Over Temperature** — Temp → 72°C, AI: Thermal Warning
2. **Cell Imbalance** — Cell 3 → 3.40V, AI: Imbalance Detected  
3. **Gas Emission** — Gas → 850ppm, AI: Potential Thermal Event

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS v4 + Framer Motion + Recharts
- **Backend**: Express.js + Socket.io + Node.js
- **Database**: PostgreSQL + Prisma ORM
- **Communication**: MQTT (optional) + built-in simulator
- **Embedded**: STM32 + TensorFlow Lite Micro (TinyML)
