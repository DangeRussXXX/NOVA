from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from collections import deque
import threading
import time
import os


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

VEHICLE_DIR = os.path.join(
    BASE_DIR,
    "vehicle"
)


# ============================================================
# COMMAND / RESPONSE QUEUES
# ============================================================

# Queue of commands waiting to be delivered to the Arduino
command_queue = deque()

# Queue for Arduino responses
response_queue = deque()

# Protect queues if multiple requests arrive at the same time
queue_lock = threading.Lock()


# ============================================================
# AMOMII COMMAND API
# ============================================================

@app.post("/command")
def command():
    data = request.data.decode().strip()

    if not data:
        return jsonify({
            "ok": False,
            "error": "Empty command"
        }), 400

    with queue_lock:
        command_queue.append({
            "command": data,
            "timestamp": time.time()
        })

    print("Command queued:", data)

    return jsonify({
        "ok": True,
        "queued": True,
        "command": data
    })


@app.get("/command")
def get_command():
    with queue_lock:
        if not command_queue:
            return ""

        item = command_queue.popleft()

    print("Command delivered:", item["command"])

    return item["command"]


# ============================================================
# ARDUINO RESPONSE API
# ============================================================

@app.post("/response")
def response():
    data = request.data.decode().strip()

    if not data:
        return jsonify({
            "ok": False,
            "error": "Empty response"
        }), 400

    with queue_lock:
        response_queue.append({
            "response": data,
            "timestamp": time.time()
        })

    print("Response queued:", data)

    return jsonify({
        "ok": True
    })


@app.get("/response")
def get_response():
    with queue_lock:
        if not response_queue:
            return ""

        item = response_queue.popleft()

    return item["response"]


# ============================================================
# SERVER STATUS
# ============================================================

@app.get("/status")
def status():
    with queue_lock:
        return jsonify({
            "commands_pending": len(command_queue),
            "responses_pending": len(response_queue),
            "vehicle_interface": True
        })


# ============================================================
# NOVA VEHICLE INTERFACE
# ============================================================

@app.get("/vehicle")
def vehicle_redirect():
    return redirect(
        "/vehicle/nova-vehicle.html"
    )


@app.get("/vehicle/")
def vehicle_home():
    return send_from_directory(
        VEHICLE_DIR,
        "nova-vehicle.html"
    )


@app.get("/vehicle/<path:filename>")
def vehicle_files(filename):
    return send_from_directory(
        VEHICLE_DIR,
        filename
    )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=10000
    )