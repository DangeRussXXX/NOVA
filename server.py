from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import deque
import threading
import time

app = Flask(__name__)
CORS(app)

# Queue of commands waiting to be delivered to the Arduino
command_queue = deque()

# Queue for Arduino responses (we'll use this in step #3/#5)
response_queue = deque()

# Protect queues if multiple requests arrive at the same time
queue_lock = threading.Lock()


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


@app.get("/status")
def status():
    with queue_lock:
        return jsonify({
            "commands_pending": len(command_queue),
            "responses_pending": len(response_queue)
        })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=10000
    )