import json
import random
import socket
import subprocess
import sys
import time
from pathlib import Path

import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "scemas/stations/batch/telemetry"
PUBLISH_INTERVAL_SECONDS = 10


def is_broker_running(host: str = BROKER, port: int = PORT) -> bool:
    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except OSError:
        return False


def find_mosquitto_command():
    candidates = []

    if sys.platform.startswith("darwin"):
        candidates.extend([
            ["/opt/homebrew/opt/mosquitto/sbin/mosquitto", "-v"],
            ["/usr/local/opt/mosquitto/sbin/mosquitto", "-v"],
            ["mosquitto", "-v"],
        ])
    elif sys.platform.startswith("win"):
        candidates.extend([
            [r"C:\Program Files\mosquitto\mosquitto.exe", "-v"],
            [r"C:\Program Files (x86)\mosquitto\mosquitto.exe", "-v"],
            ["mosquitto", "-v"],
        ])
    else:
        candidates.extend([
            ["mosquitto", "-v"],
        ])

    for cmd in candidates:
        exe = cmd[0]
        if Path(exe).exists() or exe == "mosquitto":
            return cmd

    return None


def start_broker_if_needed():
    if is_broker_running():
        print(f"Broker already running on {BROKER}:{PORT}")
        return None

    cmd = find_mosquitto_command()
    if cmd is None:
        raise RuntimeError(
            "Mosquitto broker was not found.\n"
            "Install Mosquitto first.\n"
            "Mac: brew install mosquitto\n"
            "Windows: install Mosquitto and add it to PATH"
        )

    print("Broker not running. Starting Mosquitto...")

    if sys.platform.startswith("win"):
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    else:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    for _ in range(10):
        time.sleep(1)
        if is_broker_running():
            print(f"Mosquitto started on {BROKER}:{PORT}")
            return process

    raise RuntimeError("Mosquitto was started but is still not accepting connections on port 1883.")


def build_station(station_id: str, latitude: float, longitude: float) -> dict:
    readings = [
        {
            "sensorId": f"{station_id}-temp-01",
            "indicatorType": "temperature",
            "value": round(random.uniform(12.0, 31.0), 1),
            "unit": "C",
        },
        {
            "sensorId": f"{station_id}-humid-01",
            "indicatorType": "humidity",
            "value": round(random.uniform(35.0, 95.0), 1),
            "unit": "%",
        },
        {
            "sensorId": f"{station_id}-wind-01",
            "indicatorType": "wind_speed",
            "value": round(random.uniform(0.0, 40.0), 1),
            "unit": "km/h",
        },
        {
            "sensorId": f"{station_id}-press-01",
            "indicatorType": "pressure",
            "value": round(random.uniform(980.0, 1035.0), 1),
            "unit": "hPa",
        },
        {
            "sensorId": f"{station_id}-rain-01",
            "indicatorType": "precipitation",
            "value": round(random.uniform(0.0, 15.0), 1),
            "unit": "mm",
        },
        {
            "sensorId": f"{station_id}-uv-01",
            "indicatorType": "uv_index",
            "value": round(random.uniform(0.0, 11.0), 1),
            "unit": "index",
        },
    ]

    return {
        "stationId": station_id,
        "latitude": latitude,
        "longitude": longitude,
        "sensorReading": readings,
    }


def build_payload() -> dict:
    return {
        "timestamp": int(time.time()),
        "stations": [
            build_station("station-001", 43.6532, -79.3832),
            build_station("station-002", 43.5890, -79.6441),
            build_station("station-003", 43.2557, -79.8711),
        ],
    }


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"Connected to broker with result code: {reason_code}")


def main():
    broker_process = None
    try:
        broker_process = start_broker_if_needed()

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        client.on_connect = on_connect

        client.connect(BROKER, PORT, 60)
        client.loop_start()

        print(f"Publishing to topic: {TOPIC}")
        while True:
            payload = build_payload()
            payload_json = json.dumps(payload)

            result = client.publish(TOPIC, payload_json)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print("Published telemetry:")
                print(payload_json)
            else:
                print(f"Failed to publish. Result code: {result.rc}")

            time.sleep(PUBLISH_INTERVAL_SECONDS)

    except KeyboardInterrupt:
        print("\nStopping publisher...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass

        if broker_process is not None:
            print("Broker was started by this script and will keep running unless you stop it manually.")


if __name__ == "__main__":
    main()


# EXAMPLE MESSAGE STRUCTURE:
# {
#   "timestamp": "2026-04-02T16:00:00Z",
#   "stations": [
#     {
#       "stationId": "station-001",
#       "readings": [
#         {
#           "sensorId": "temp-001",
#           "indicatorType": "TEMPERATURE",
#           "value": 24.6,
#           "unit": "C"
#         },
#         {
#           "sensorId": "humidity-001",
#           "indicatorType": "HUMIDITY",
#           "value": 61.5,
#           "unit": "%"
#         },
#         {
#           "sensorId": "wind-speed-001",
#           "indicatorType": "WIND_SPEED",
#           "value": 18.7,
#           "unit": "km/h"
#         },
#         {
#           "sensorId": "wind-direction-001",
#           "indicatorType": "WIND_DIRECTION",
#           "value": 270,
#           "unit": "degrees"
#         },
#         {
#           "sensorId": "precipitation-001",
#           "indicatorType": "PRECIPITATION",
#           "value": 2.8,
#           "unit": "mm"
#         },
#         {
#           "sensorId": "uv-001",
#           "indicatorType": "UV_INDEX",
#           "value": 5.4,
#           "unit": "index"
#         },
#         {
#           "sensorId": "aqi-001",
#           "indicatorType": "AQI",
#           "value": 87,
#           "unit": "aqi"
#         }
#       ]
#     },
#     {
#       "stationId": "station-002",
#       "readings": [
#         {
#           "sensorId": "temp-002",
#           "indicatorType": "TEMPERATURE",
#           "value": 21.3,
#           "unit": "C"
#         },
#         {
#           "sensorId": "humidity-002",
#           "indicatorType": "HUMIDITY",
#           "value": 72.1,
#           "unit": "%"
#         },
#         {
#           "sensorId": "wind-speed-002",
#           "indicatorType": "WIND_SPEED",
#           "value": 12.4,
#           "unit": "km/h"
#         },
#         {
#           "sensorId": "wind-direction-002",
#           "indicatorType": "WIND_DIRECTION",
#           "value": 180,
#           "unit": "degrees"
#         },
#         {
#           "sensorId": "precipitation-002",
#           "indicatorType": "PRECIPITATION",
#           "value": 0.4,
#           "unit": "mm"
#         },
#         {
#           "sensorId": "uv-002",
#           "indicatorType": "UV_INDEX",
#           "value": 3.2,
#           "unit": "index"
#         },
#         {
#           "sensorId": "aqi-002",
#           "indicatorType": "AQI",
#           "value": 54,
#           "unit": "aqi"
#         }
#       ]
#     }
#   ]
# }