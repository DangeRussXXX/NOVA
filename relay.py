"""NOVA local hardware relay: authenticated polling and rate-limited responses."""

import os
import re
import time
from collections import deque
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

import requests
import serial

COMMAND_URL = "https://amomii-server.onrender.com/command"
RESPONSE_URL = "https://amomii-server.onrender.com/response"
HEARTBEAT_URL = "https://amomii-server.onrender.com/relay/heartbeat"
SERIAL_PORT = "COM9"
BAUD_RATE = 9600
RELAY_TOKEN = os.environ.get("NOVA_RELAY_TOKEN", "").strip()

if not RELAY_TOKEN:
    raise SystemExit("NOVA_RELAY_TOKEN is not set. Relay not started.")

HEADERS = {"X-NOVA-Relay-Token": RELAY_TOKEN}

PATTERNS = [
    r"(?:HELP|STATUS|TEST|TOGGLE)",
    r"(?:TRAINER )?(?:STOP|STATUS|TEST)",
    r"TRAINER PATTERN (?:KNIGHT(?: RIDER)?|CHASE|REVERSE(?: CHASE)?|CENTER OUT|OUTSIDE IN|ALTERNATE|FILL|WAVE|POLICE|STROBE|[1-5])",
    r"TRAINER PATTERN SPEED (?:[0-9]{2,4})",
    r"TRAINER ALL (?:ON|OFF)",
    r"(?:LED|ARDUINO LED) (?:ON|OFF)",
    r"TRAINER LED [0-7] (?:ON|OFF)",
    r"TRAINER LED ALL (?:ON|OFF)",
    r"ARDUINO ALL OFF",
    r"ARDUINO (?:ON|OFF)",
    r"(?:ALL|BOTH) (?:ON|OFF)",
    r"(?:(?:TRAINER|BOTH) )?BLINK \d{1,4}",
    r"SPEED \d{1,5}",
    r"(?:(?:TRAINER|BOTH) )?FLASH \d{1,4} \d{1,5}",
    r"PULSE \d{1,5}",
    r"(?:(?:TRAINER|BOTH|MORSE|TRAINER MORSE|BOTH MORSE) )?SOS",
    r"STOP",
    r"TRAINER LED [0-7] TOGGLE",
]
ALLOWED = [re.compile(rf"^(?:{pattern})$", re.IGNORECASE) for pattern in PATTERNS]

# Avoid bursts against /response. Keep status reporting responsive without
# blocking Arduino reads for each individual HTTP POST.
RESPONSE_SPACING = 1.5  # minimum seconds between response POST attempts
MAX_PENDING_RESPONSES = 200
MAX_SERIAL_LINES_PER_PASS = 100
POLL_SPACING = 0.5
HEARTBEAT_SPACING = 15.0
PROBE_INTERVAL = 120.0


def is_approved(cmd):
    if not (
        0 < len(cmd) <= 100
        and all(32 <= ord(c) <= 126 for c in cmd)
        and any(pattern.fullmatch(cmd) for pattern in ALLOWED)
    ):
        return False
    parts = cmd.upper().split()
    if "BLINK" in parts:
        return 1 <= int(parts[-1]) <= 100
    if "FLASH" in parts:
        n, ms = map(int, parts[-2:])
        return 1 <= n <= 100 and 20 <= ms <= 5000
    if parts[:3] == ["TRAINER", "PATTERN", "SPEED"]:
        return 40 <= int(parts[-1]) <= 2000
    if parts[0] in ("SPEED", "PULSE"):
        return 20 <= int(parts[-1]) <= 5000
    return True


def retry_after_seconds(header, fallback):
    if header:
        try:
            return max(1.0, min(300.0, float(header)))
        except ValueError:
            try:
                parsed = parsedate_to_datetime(header)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return max(1.0, min(300.0, (parsed - datetime.now(timezone.utc)).total_seconds()))
            except (TypeError, ValueError, OverflowError):
                pass
    return min(300.0, fallback)


def clean_serial_line(raw):
    # Ignore malformed UTF-8 and control characters rather than sending them
    # to the cloud. An isolated valid-looking fragment cannot be detected here.
    decoded = raw.decode("utf-8", errors="replace").strip()
    if not decoded:
        return None
    if "\ufffd" in decoded or any(ord(ch) < 32 and ch not in "\t" for ch in decoded):
        print(">>> SERIAL NOISE SKIPPED:", repr(decoded[:120]))
        return None
    return decoded[:4096]


def main():
    session = requests.Session()
    session.headers.update(HEADERS)
    pending = deque()
    next_response_at = 0.0
    response_backoff = 3.0
    last_error = ""
    next_heartbeat_at = 0.0
    next_poll_at = 0.0

    with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1) as ser:
        print("NOVA relay connected:", SERIAL_PORT, "at", BAUD_RATE, "baud")
        print("Authenticated command polling enabled.")
        next_board_probe = time.monotonic() + 30.0
        next_trainer_probe = time.monotonic() + 75.0

        while True:
            now = time.monotonic()
            try:
                # Drain serial first, even if the cloud is rate limiting us.
                for _ in range(MAX_SERIAL_LINES_PER_PASS):
                    if ser.in_waiting <= 0:
                        break
                    line = clean_serial_line(ser.readline())
                    if not line:
                        continue
                    print(">>> RECEIVED FROM ARDUINO:", repr(line[:120]))
                    if len(pending) >= MAX_PENDING_RESPONSES:
                        # Preserve older responses; report overflow explicitly.
                        print(">>> RESPONSE QUEUE FULL: dropping newest line")
                    else:
                        pending.append(line)

                now = time.monotonic()
                if now >= next_poll_at:
                    next_poll_at = now + POLL_SPACING
                    try:
                        result = session.get(COMMAND_URL, timeout=5)
                        result.raise_for_status()
                        cmd = result.text.strip()
                        if cmd:
                            if is_approved(cmd):
                                print(">>> RECEIVED APPROVED COMMAND:", repr(cmd))
                                ser.write((cmd + "\n").encode("ascii"))
                            else:
                                print(">>> REJECTED UNAPPROVED COMMAND:", repr(cmd[:120]))
                        elif ser.is_open:
                            if now >= next_board_probe:
                                ser.write(b"status\n")
                                print(">>> NOVA HEALTH PROBE: status")
                                next_board_probe = now + PROBE_INTERVAL
                            elif now >= next_trainer_probe:
                                ser.write(b"trainer status\n")
                                print(">>> NOVA HEALTH PROBE: trainer status")
                                next_trainer_probe = now + PROBE_INTERVAL
                    except requests.HTTPError as error:
                        last_error = str(error)[:160]
                        status = error.response.status_code if error.response is not None else None
                        print(">>> COMMAND POLL HTTP ERROR:", error)
                        if status in (401, 403):
                            raise SystemExit("Relay authentication rejected. Check NOVA_RELAY_TOKEN.")
                        if status == 429:
                            next_poll_at = time.monotonic() + retry_after_seconds(
                                error.response.headers.get("Retry-After"), 10.0
                            )
                    except requests.RequestException as error:
                        last_error = str(error)[:160]
                        print(">>> COMMAND POLL ERROR:", error)
                        next_poll_at = time.monotonic() + 3.0

                now = time.monotonic()
                if pending and now >= next_response_at:
                    line = pending[0]
                    next_response_at = now + RESPONSE_SPACING
                    try:
                        result = session.post(RESPONSE_URL, data=line, timeout=5)
                        result.raise_for_status()
                        pending.popleft()
                        response_backoff = 3.0
                        print(">>> POSTED ARDUINO RESPONSE:", repr(line[:120]))
                    except requests.HTTPError as error:
                        status = error.response.status_code if error.response is not None else None
                        last_error = str(error)[:160]
                        print(">>> RESPONSE POST HTTP ERROR:", error)
                        if status in (401, 403):
                            raise SystemExit("Relay response authentication rejected. Check NOVA_RELAY_TOKEN.")
                        if status == 429:
                            delay = retry_after_seconds(
                                error.response.headers.get("Retry-After"), response_backoff
                            )
                            next_response_at = time.monotonic() + delay
                            response_backoff = min(120.0, response_backoff * 2)
                            print(f">>> RESPONSE RATE LIMITED: retrying in {delay:.1f}s; queued={len(pending)}")
                        elif status is not None and 400 <= status < 500:
                            # A permanently rejected payload should not block
                            # every later response indefinitely.
                            pending.popleft()
                            print(">>> DROPPED REJECTED RESPONSE:", repr(line[:120]))
                        else:
                            next_response_at = time.monotonic() + 5.0
                    except requests.RequestException as error:
                        last_error = str(error)[:160]
                        print(">>> RESPONSE POST ERROR:", error)
                        next_response_at = time.monotonic() + 5.0

                now = time.monotonic()
                if now >= next_heartbeat_at:
                    next_heartbeat_at = now + HEARTBEAT_SPACING
                    try:
                        heartbeat = session.post(
                            HEARTBEAT_URL,
                            json={"serial_open": ser.is_open, "port": SERIAL_PORT, "error": last_error},
                            timeout=5,
                        )
                        heartbeat.raise_for_status()
                        last_error = ""
                    except requests.HTTPError as error:
                        last_error = str(error)[:160]
                        print(">>> HEALTH HEARTBEAT HTTP ERROR:", error)
                        if error.response is not None and error.response.status_code in (401, 403):
                            raise SystemExit("Relay heartbeat authentication rejected. Check NOVA_RELAY_TOKEN.")
                        if error.response is not None and error.response.status_code == 429:
                            next_heartbeat_at = time.monotonic() + retry_after_seconds(
                                error.response.headers.get("Retry-After"), 30.0
                            )
                    except requests.RequestException as error:
                        last_error = str(error)[:160]
                        print(">>> HEALTH HEARTBEAT ERROR:", error)

            except serial.SerialException as error:
                print(">>> SERIAL ERROR:", repr(error))
                raise

            time.sleep(0.05)


if __name__ == "__main__":
    main()
