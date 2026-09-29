import time
import serial
import requests

# Your Arduino
ser = serial.Serial("COM9", 9600, timeout=1)

# Your Render server URL
SERVER_URL = "https://amomii-server.onrender.com/command"

while True:
    try:
        cmd = requests.get(SERVER_URL, timeout=5).text.strip()

        if cmd:
            print("Sending to Arduino:", cmd)
            ser.write((cmd + "\n").encode())

    except Exception as e:
        print("Error:", e)

    time.sleep(1)