"""
main.py — CAT® Edge BMS Server v2.0 (Python/FastAPI)
Combines FastAPI REST API + python-socketio + paho-mqtt + asyncio simulator.

Start with:
    uvicorn main:app --reload --port 3001
"""
import asyncio
import json
import os
import re
import time
from contextlib import asynccontextmanager

import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import paho.mqtt.client as mqtt_lib

from database.engine import engine
from database.models import Base, BatteryReading, FaultLog
from database.engine import SessionLocal
from routers import readings, faults, anomalies, system, chat
from routers.system import set_mqtt_client
import simulator

load_dotenv()

# ─── Constants ───────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # Alt dev port
    "app://.",                 # Electron production (custom protocol)
    "null",                    # Electron loading from file://
]

MQTT_BROKER_URL = os.getenv("MQTT_BROKER", "mqtt://broker.hivemq.com:1883")
# Parse mqtt://host:port
_m = re.match(r"mqtt://([^:]+):(\d+)", MQTT_BROKER_URL)
MQTT_HOST = _m.group(1) if _m else "broker.hivemq.com"
MQTT_PORT = int(_m.group(2)) if _m else 1883

MQTT_TOPIC_LIVE = "battery/live"
MQTT_TOPIC_TERM = "battery/terminal"

# ─── State ───────────────────────────────────────────────────────────────────

last_status       = "Healthy"
last_db_write     = 0.0
last_terminal     = {"temp1": 0.0, "temp2": 0.0, "vibration": 0.0, "co": 0.0}

# ─── Socket.io ───────────────────────────────────────────────────────────────

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS,
)


@sio.event
async def connect(sid, environ):
    print(f"[WS] Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[WS] Client disconnected: {sid}")


# ─── DB helpers ──────────────────────────────────────────────────────────────

def _db_save_reading(data: dict) -> None:
    global last_db_write
    now = time.time()
    if now - last_db_write < 5:
        return
    try:
        db = SessionLocal()
        record = BatteryReading(**{
            k: v for k, v in data.items()
            if k not in ("ts",)  # exclude non-model keys
        })
        db.add(record)
        db.commit()
        last_db_write = now
        print(f"[DB] Critical snapshot saved → {data['status']} | Score: {data['anomalyScore']}%")
    except Exception as e:
        print(f"[DB] Write failed: {e}")
    finally:
        db.close()


def _db_save_fault(data: dict) -> None:
    try:
        db = SessionLocal()
        fault = FaultLog(
            faultType="Status Change (HW)",
            severity=data["status"],
            actionTaken=(
                "CRITICAL: Hardware Relay Isolated" if data["status"] == "Critical"
                else "Warning: Hardware alert generated" if data["status"] == "Warning"
                else "System returned to normal"
            ),
            value=f"Score: {data['anomalyScore']:.1f}%",
        )
        db.add(fault)
        db.commit()
    except Exception as e:
        print(f"[DB] Fault log failed: {e}")
    finally:
        db.close()


# ─── Telemetry processing (shared by MQTT and simulator) ────────────────────

async def _process_and_emit(raw: dict) -> None:
    global last_status

    data: dict = {
        "cell1":          float(raw.get("cell1", 0)),
        "cell2":          float(raw.get("cell2", 0)),
        "cell3":          float(raw.get("cell3", 0)),
        "cell4":          float(raw.get("cell4", 0)),
        "current":        float(raw.get("current", 0)),
        "temp1":          float(raw.get("temp1", last_terminal["temp1"])),
        "temp2":          float(raw.get("temp2", last_terminal["temp2"])),
        "gas":            float(raw.get("gas", last_terminal["co"])),
        "vibration":      float(raw.get("vibration", last_terminal["vibration"])),
        "batteryHealth":  float(raw.get("batteryHealth", 100)),
        "anomalyScore":   float(raw.get("anomalyScore", 0)),
        "status":         raw.get("status", "Healthy"),
        "relay":          raw.get("relay", "CONNECTED"),
        "spn":            int(raw["spn"]) if raw.get("spn") is not None else None,
        "fmi":            int(raw["fmi"]) if raw.get("fmi") is not None else None,
        "activeCells":    int(raw.get("activeCells", 4)),
        "soc":            float(raw.get("soc", 100)),
        "soh":            float(raw.get("soh", 100)),
        "chargeStatus":   raw.get("chargeStatus", "Idle"),
        "mlOp":           raw.get("mlOp", "NORMAL"),
        "batteryScore":   float(raw.get("batteryScore", 100)),
        "relayCooling":   raw.get("relayCooling", simulator.simulated_relays["cooling"]),
        "relayIsolation": raw.get("relayIsolation", simulator.simulated_relays["isolation"]),
        "relayCell1":     raw.get("relayCell1", simulator.simulated_relays["cell1"]),
        "relayCell2":     raw.get("relayCell2", simulator.simulated_relays["cell2"]),
        "relayCell3":     raw.get("relayCell3", simulator.simulated_relays["cell3"]),
        "relayCell4":     raw.get("relayCell4", simulator.simulated_relays["cell4"]),
    }

    # Derived battery health if not provided
    if raw.get("batteryHealth") is None:
        cells   = [data["cell1"], data["cell2"], data["cell3"], data["cell4"]]
        avg     = sum(cells) / 4
        imb     = max(cells) - min(cells)
        vpct    = max(0, min(100, ((avg - 3.0) / (4.2 - 3.0)) * 100))
        tp      = (max(data["temp1"], data["temp2"]) - 50) * 0.5 if max(data["temp1"], data["temp2"]) > 50 else 0
        data["batteryHealth"] = round(max(0, min(100, vpct - min(imb * 100, 30) - tp)), 1)

    # Derived anomaly score if not provided
    if raw.get("anomalyScore") is None:
        score = 0.0
        tmax = max(data["temp1"], data["temp2"])
        if tmax > 45:      score += (tmax - 45) * 2.5
        if data["gas"] > 150: score += (data["gas"] - 150) * 0.15
        if data["vibration"] > 1.5: score += (data["vibration"] - 1.5) * 15
        cells = [data["cell1"], data["cell2"], data["cell3"], data["cell4"]]
        imb = max(cells) - min(cells)
        if imb > 0.1: score += imb * 100
        data["anomalyScore"] = round(max(0, min(100, score)), 1)

    # Derived status if not provided
    if not raw.get("status"):
        sc, t1, t2, gas, vib = data["anomalyScore"], data["temp1"], data["temp2"], data["gas"], data["vibration"]
        if sc > 50 or t1 > 60 or t2 > 60 or gas > 400 or vib > 3.0:
            data["status"] = "Critical"
        elif sc > 15 or t1 > 45 or t2 > 45 or gas > 200 or vib > 1.5:
            data["status"] = "Warning"
        else:
            data["status"] = "Healthy"

    # Persist critical events (throttled to once per 5 s)
    if data["status"] != "Healthy":
        await asyncio.get_event_loop().run_in_executor(None, _db_save_reading, data)

    # Persist status transitions
    if data["status"] != last_status:
        await asyncio.get_event_loop().run_in_executor(None, _db_save_fault, data)
        print(f"[DB] Status transition: {last_status} → {data['status']}")
        last_status = data["status"]

    await sio.emit("battery:update", data)


# ─── Simulator Loop ──────────────────────────────────────────────────────────

async def _simulator_loop():
    print("[SIM] Simulator started — emitting every 2 s")
    while True:
        raw = simulator.generate_reading()
        await _process_and_emit(raw)
        await asyncio.sleep(2)


# ─── MQTT ────────────────────────────────────────────────────────────────────

_mqtt_client: mqtt_lib.Client | None = None
_loop: asyncio.AbstractEventLoop | None = None


def _on_mqtt_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected (rc={rc}). Subscribing to topics.")
    client.subscribe([(MQTT_TOPIC_LIVE, 0), (MQTT_TOPIC_TERM, 0)])


def _on_mqtt_message(client, userdata, msg):
    global last_terminal
    topic   = msg.topic
    payload = msg.payload.decode()

    if topic == MQTT_TOPIC_TERM:
        t1 = re.search(r"T1:\s*([\d.]+)C", payload)
        t2 = re.search(r"T2:\s*([\d.]+)C", payload)
        vb = re.search(r"VIB:\s*([\d.]+)G", payload)
        co = re.search(r"CO:\s*([\d.]+)PPM", payload)
        if t1: last_terminal["temp1"]     = float(t1.group(1))
        if t2: last_terminal["temp2"]     = float(t2.group(1))
        if vb: last_terminal["vibration"] = float(vb.group(1))
        if co: last_terminal["co"]        = float(co.group(1))
        asyncio.run_coroutine_threadsafe(sio.emit("terminal:log", payload), _loop)
        return

    if topic == MQTT_TOPIC_LIVE:
        try:
            raw = json.loads(payload)
            asyncio.run_coroutine_threadsafe(_process_and_emit(raw), _loop)
        except Exception as e:
            print(f"[MQTT] Parse error: {e}")


def _start_mqtt():
    global _mqtt_client
    client = mqtt_lib.Client()
    client.on_connect = _on_mqtt_connect
    client.on_message = _on_mqtt_message
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        client.loop_start()
        _mqtt_client = client
        set_mqtt_client(client)
        print(f"[MQTT] Connecting to {MQTT_HOST}:{MQTT_PORT}")
    except Exception as e:
        print(f"[MQTT] Connection failed: {e} — running in simulator-only mode")


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _loop
    _loop = asyncio.get_event_loop()

    # Start MQTT (non-blocking, threaded)
    _start_mqtt()

    # Start simulator loop
    sim_task = asyncio.create_task(_simulator_loop())

    _banner()
    yield

    # Shutdown
    sim_task.cancel()
    if _mqtt_client:
        _mqtt_client.loop_stop()
        _mqtt_client.disconnect()


def _banner():
    print("\n+======================================+")
    print("|  CAT Edge Server v2.0 (FastAPI)      |")
    print("|  HTTP  -> http://localhost:3001       |")
    print("|  Docs  -> http://localhost:3001/docs  |")
    print("|  WS    -> Socket.io ready             |")
    print("+======================================+\n")


# ─── FastAPI App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="CAT® Edge BMS API",
    version="2.0.0",
    description="Battery Management System backend powered by FastAPI + SQLAlchemy",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (serve 3D GLB assets to mobile)
if os.path.isdir("public"):
    app.mount("/public", StaticFiles(directory="public"), name="public")

# REST Routers
app.include_router(readings.router,  prefix="/api")
app.include_router(faults.router,    prefix="/api")
app.include_router(anomalies.router, prefix="/api")
app.include_router(system.router,    prefix="/api")
app.include_router(chat.router,      prefix="/api")

# 404 fallback
@app.get("/api/{full_path:path}", include_in_schema=False)
async def not_found(full_path: str):
    from fastapi import Request
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=404,
        content={"success": False, "error": f"Route not found: /api/{full_path}"},
    )

# ─── Mount Socket.io as ASGI sub-app ─────────────────────────────────────────
# This MUST be last so Socket.io handles its own paths (/socket.io/*)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Uvicorn must serve `socket_app`, not `app`
# Run with: uvicorn main:socket_app --reload --port 3001
