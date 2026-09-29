import time
import serial
import requests

ser = serial.Serial("COM9", 9600, timeout=0.1)

COMMAND_URL = "https://amomii-server.onrender.com/command"
RESPONSE_URL = "https://amomii-server.onrender.com/response"


def send_response_to_server(response):
    response = response.strip()

    if not response:
        return

    try:
        result = requests.post(
            RESPONSE_URL,
            data=response,
            timeout=5
        )

        print(
            ">>> POSTED ARDUINO RESPONSE:",
            repr(response),
            "| HTTP",
            result.status_code
        )

    except Exception as e:
        print(">>> RESPONSE POST ERROR:", e)


while True:

    try:

        # -----------------------------
        # SEND COMMAND TO ARDUINO
        # -----------------------------

        cmd = requests.get(
            COMMAND_URL,
            timeout=5
        ).text.strip()

        if cmd:

            print(
                ">>> RECEIVED FROM SERVER:",
                repr(cmd)
            )

            ser.write(
                (cmd + "\n").encode()
            )

            print(
                ">>> SENT TO ARDUINO"
            )


        # -----------------------------
        # READ EVERYTHING FROM ARDUINO
        # -----------------------------

        while ser.in_waiting > 0:

            raw = ser.readline()

            line = raw.decode(
                "utf-8",
                errors="ignore"
            ).strip()

            if line:

                print(
                    ">>> RECEIVED FROM ARDUINO:",
                    repr(line)
                )

                send_response_to_server(line)


    except Exception as e:

        print(
            ">>> RELAY ERROR:",
            repr(e)
        )


    time.sleep(0.05)