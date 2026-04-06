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
PUBLISH_INTERVAL_SECONDS = 30

STATIONS = [
    {"stationId": "station-001", "latitude": 43.6532, "longitude": -79.3832},
    {"stationId": "station-002", "latitude": 43.5890, "longitude": -79.6441},
    {"stationId": "station-003", "latitude": 43.2557, "longitude": -79.8711},
]

# Bounds for stations that should stay within normal range
INDICATOR_BOUNDS = {
    "temperature": {"min": 0.0, "max": 27.5, "unit": "C"},
    "humidity": {"min": 0.0, "max": 80.0, "unit": "%"},
    "uv_index": {"min": 0.0, "max": 6.0, "unit": "index"},
    "wind_speed": {"min": 0.0, "max": 35.0, "unit": "km/h"},
    "precipitation": {"min": 0.0, "max": 10.0, "unit": "mm"},
    "pressure": {"min": 970.0, "max": 1030.0, "unit": "hPa"},
}


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


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def round1(value: float) -> float:
    return round(value, 1)


def generate_city_baseline() -> dict:
    """
    Shared weather state for the whole city.
    All stations will be very close to this baseline.
    """
    return {
        "temperature": random.uniform(19.0, 23.0),
        "humidity": random.uniform(58.0, 72.0),
        "uv_index": random.uniform(2.0, 4.5),
        "wind_speed": random.uniform(8.0, 18.0),
        "precipitation": random.uniform(2.0, 6.0),
        "pressure": random.uniform(990.0, 1015.0),
    }


def get_station_value(indicator: str, base_value: float, station_id: str) -> float:
    """
    Keep stations similar with small jitter.
    station-001 gets precipitation around 20.
    Other stations stay within bounds.
    """
    small_jitter = {
        "temperature": 1.0,
        "humidity": 3.0,
        "uv_index": 0.5,
        "wind_speed": 2.0,
        "precipitation": 1.0,
        "pressure": 2.0,
    }

    if station_id == "station-001" and indicator == "precipitation":
        # Intentionally around 20 for station-001
        return round1(random.uniform(18.5, 21.5))

    value = base_value + random.uniform(-small_jitter[indicator], small_jitter[indicator])

    bounds = INDICATOR_BOUNDS[indicator]
    value = clamp(value, bounds["min"], bounds["max"])

    return round1(value)


def build_station(station_id: str, latitude: float, longitude: float, city_baseline: dict) -> dict:
    readings = [
        {
            "sensorId": f"{station_id}-temp-01",
            "indicatorType": "temperature",
            "value": get_station_value("temperature", city_baseline["temperature"], station_id),
            "unit": "C",
        },
        {
            "sensorId": f"{station_id}-humid-01",
            "indicatorType": "humidity",
            "value": get_station_value("humidity", city_baseline["humidity"], station_id),
            "unit": "%",
        },
        {
            "sensorId": f"{station_id}-wind-01",
            "indicatorType": "wind_speed",
            "value": get_station_value("wind_speed", city_baseline["wind_speed"], station_id),
            "unit": "km/h",
        },
        {
            "sensorId": f"{station_id}-press-01",
            "indicatorType": "pressure",
            "value": get_station_value("pressure", city_baseline["pressure"], station_id),
            "unit": "hPa",
        },
        {
            "sensorId": f"{station_id}-rain-01",
            "indicatorType": "precipitation",
            "value": get_station_value("precipitation", city_baseline["precipitation"], station_id),
            "unit": "mm",
        },
        {
            "sensorId": f"{station_id}-uv-01",
            "indicatorType": "uv_index",
            "value": get_station_value("uv_index", city_baseline["uv_index"], station_id),
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
    city_baseline = generate_city_baseline()

    return {
        "timestamp": int(time.time()),
        "stations": [
            build_station(station["stationId"], station["latitude"], station["longitude"], city_baseline)
            for station in STATIONS
        ],
    }


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"Connected to broker with result code: {reason_code}")


def main():
    broker_process = None
    client = None

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
        if client is not None:
            try:
                client.loop_stop()
                client.disconnect()
            except Exception:
                pass

        if broker_process is not None:
            print("Broker was started by this script and will keep running unless you stop it manually.")


if __name__ == "__main__":
    main()


# Example payload structure:
# {
#   "timestamp": 1712364000,
#   "stations": [
#     {
#       "stationId": "station-001",
#       "latitude": 43.6532,
#       "longitude": -79.3832,
#       "sensorReading": [
#         {
#           "sensorId": "station-001-temp-01",
#           "indicatorType": "temperature",
#           "value": 21.3,
#           "unit": "C"
#         },
#         {
#           "sensorId": "station-001-humid-01",
#           "indicatorType": "humidity",
#           "value": 65.1,
#           "unit": "%"
#         },
#         {
#           "sensorId": "station-001-wind-01",
#           "indicatorType": "wind_speed",
#           "value": 12.7,
#           "unit": "km/h"
#         },
#         {
#           "sensorId": "station-001-press-01",
#           "indicatorType": "pressure",
#           "value": 1002.4,
#           "unit": "hPa"
#         },
#         {
#           "sensorId": "station-001-rain-01",
#           "indicatorType": "precipitation",
#           "value": 19.6,
#           "unit": "mm"
#         },
#         {
#           "sensorId": "station-001-uv-01",
#           "indicatorType": "uv_index",
#           "value": 3.4,
#           "unit": "index"
#         }
#       ]
#     },
#     {
#       "stationId": "station-002",
#       "latitude": 43.589,
#       "longitude": -79.6441,
#       "sensorReading": [
#         {
#           "sensorId": "station-002-temp-01",
#           "indicatorType": "temperature",
#           "value": 20.9,
#           "unit": "C"
#         },
#         {
#           "sensorId": "station-002-humid-01",
#           "indicatorType": "humidity",
#           "value": 63.8,
#           "unit": "%"
#         },
#         {
#           "sensorId": "station-002-wind-01",
#           "indicatorType": "wind_speed",
#           "value": 11.9,
#           "unit": "km/h"
#         },
#         {
#           "sensorId": "station-002-press-01",
#           "indicatorType": "pressure",
#           "value": 1003.1,
#           "unit": "hPa"
#         },
#         {
#           "sensorId": "station-002-rain-01",
#           "indicatorType": "precipitation",
#           "value": 4.3,
#           "unit": "mm"
#         },
#         {
#           "sensorId": "station-002-uv-01",
#           "indicatorType": "uv_index",
#           "value": 3.1,
#           "unit": "index"
#         }
#       ]
#     },
#     {
#       "stationId": "station-003",
#       "latitude": 43.2557,
#       "longitude": -79.8711,
#       "sensorReading": [
#         {
#           "sensorId": "station-003-temp-01",
#           "indicatorType": "temperature",
#           "value": 21.6,
#           "unit": "C"
#         },
#         {
#           "sensorId": "station-003-humid-01",
#           "indicatorType": "humidity",
#           "value": 66.2,
#           "unit": "%"
#         },
#         {
#           "sensorId": "station-003-wind-01",
#           "indicatorType": "wind_speed",
#           "value": 13.3,
#           "unit": "km/h"
#         },
#         {
#           "sensorId": "station-003-press-01",
#           "indicatorType": "pressure",
#           "value": 1001.7,
#           "unit": "hPa"
#         },
#         {
#           "sensorId": "station-003-rain-01",
#           "indicatorType": "precipitation",
#           "value": 5.1,
#           "unit": "mm"
#         },
#         {
#           "sensorId": "station-003-uv-01",
#           "indicatorType": "uv_index",
#           "value": 3.6,
#           "unit": "index"
#         }
#       ]
#     }
#   ]
# }