
"""NOVA local hardware relay."""

import os
import re
import time

import serial
import requests

COMMAND_URL = "https://amomii-server.onrender.com/command"
RESPONSE_URL = "https://amomii-server.onrender.com/response"
HEARTBEAT_URL = "https://amomii-server.onrender.com/relay/heartbeat"

RELAY_TOKEN = os.environ.get("NOVA_RELAY_TOKEN", "").strip()

if not RELAY_TOKEN:
    raise SystemExit(
        "NOVA_RELAY_TOKEN is not set. Relay not started."
    )

HEADERS = {
    "X-NOVA-Relay-Token": RELAY_TOKEN,
}

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

ALLOWED = [
    re.compile(rf"^(?:{pattern})$", re.IGNORECASE)
    for pattern in PATTERNS
]


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


def send_response(session, response):
    response = response.strip()

    if not response:
        return

    try:
        result = session.post(
            RESPONSE_URL,
            data=response[:4096],
            timeout=5,
        )
        result.raise_for_status()
        print(
            ">>> POSTED ARDUINO RESPONSE:",
            repr(response[:120]),
        )
    except requests.RequestException as error:
        print(">>> RESPONSE POST ERROR:", error)


def main():
    session = requests.Session()
    session.headers.update(HEADERS)

    with serial.Serial(
        "COM9",
        9600,
        timeout=0.1,
    ) as ser:
        print("NOVA relay connected.")
        print("Authenticated command polling enabled.")
        last_heartbeat = 0.0
        last_error = ""
        # Staggered non-disruptive status probes; no LEDs or patterns are changed.
        next_board_probe = time.monotonic() + 8.0
        next_trainer_probe = time.monotonic() + 23.0
        probe_interval = 30.0

        while True:
            if time.monotonic() - last_heartbeat >= 5:
                try:
                    heartbeat = session.post(
                        HEARTBEAT_URL,
                        json={"serial_open": ser.is_open, "port": "COM9", "error": last_error},
                        timeout=5,
                    )
                    heartbeat.raise_for_status()
                    last_error = ""
                except requests.RequestException as error:
                    print(">>> HEALTH HEARTBEAT ERROR:", error)
                last_heartbeat = time.monotonic()
            try:
                result = session.get(
                    COMMAND_URL,
                    timeout=5,
                )
                result.raise_for_status()

                cmd = result.text.strip()

                if cmd:
                    if is_approved(cmd):
                        print(
                            ">>> RECEIVED APPROVED COMMAND:",
                            repr(cmd),
                        )
                        ser.write(
                            (cmd + "\n").encode("ascii")
                        )
                    else:
                        print(
                            ">>> REJECTED UNAPPROVED COMMAND:",
                            repr(cmd[:120]),
                        )

                # Send a probe only when the command queue had no user command
                # this iteration. Do not interrupt a command already being sent.
                now = time.monotonic()
                if not cmd and ser.is_open:
                    if now >= next_board_probe:
                        ser.write(b"status\n")
                        print(">>> NOVA HEALTH PROBE: status")
                        next_board_probe = now + probe_interval
                    elif now >= next_trainer_probe:
                        ser.write(b"trainer status\n")
                        print(">>> NOVA HEALTH PROBE: trainer status")
                        next_trainer_probe = now + probe_interval

                while ser.in_waiting > 0:
                    raw = ser.readline()
                    line = raw.decode(
                        "utf-8",
                        errors="replace",
                    ).strip()

                    if line:
                        print(
                            ">>> RECEIVED FROM ARDUINO:",
                            repr(line[:120]),
                        )
                        send_response(session, line)

            except requests.HTTPError as error:
                last_error = str(error)[:160]
                print(">>> HTTP ERROR:", error, "body:", repr(error.response.text[:300]) if error.response is not None else "(no response)")

                if (
                    error.response is not None
                    and error.response.status_code in (401, 403)
                ):
                    raise SystemExit(
                        "Relay authentication rejected. "
                        "Check NOVA_RELAY_TOKEN."
                    )

            except (
                requests.RequestException,
                serial.SerialException,
            ) as error:
                last_error = str(error)[:160]
                print(">>> RELAY ERROR:", repr(error))

            time.sleep(0.2)


if __name__ == "__main__":
    main()
