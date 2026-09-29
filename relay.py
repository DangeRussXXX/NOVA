import time
import serial
import requests

# Your Arduino
ser = serial.Serial("COM9", 9600, timeout=0.1)

# AMOMII Cloud Relay endpoints
COMMAND_URL = "https://amomii-server.onrender.com/command"
RESPONSE_URL = "https://amomii-server.onrender.com/response"


def send_response_to_server(response):
    response = response.strip()

    if not response:
        return

    try:
        requests.post(
            RESPONSE_URL,
            data=response,
            timeout=5
        )

        print(">>> POSTED ARDUINO RESPONSE:", repr(response))

    except Exception as e:
        print(">>> RESPONSE POST ERROR:", e)


while True:

    try:

        # --------------------------------
        # 1. Check for commands from server
        # --------------------------------

        cmd = requests.get(
            COMMAND_URL,
            timeout=5
        ).text.strip()

        if cmd:

            print(">>> RECEIVED FROM SERVER:", repr(cmd))
            print(">>> SENDING TO ARDUINO:", repr(cmd))

            ser.write(
                (cmd + "\n").encode()
            )

            print(">>> SENT TO ARDUINO")


        # --------------------------------
        # 2. Read Arduino serial output
        # --------------------------------

        while ser.in_waiting:

            line = ser.readline().decode(
                errors="ignore"
            ).strip()

            if line:

                print(
                    ">>> RECEIVED FROM ARDUINO:",
                    repr(line)
                )

                send_response_to_server(line)


    except Exception as e:

        print("Error:", e)


    time.sleep(0.1)