from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ------------------------------
# In-memory storage (for now)
# ------------------------------

raw_readings = []
day_summaries = []

# ------------------------------
# Home Route
# ------------------------------

@app.route("/", methods=["GET"])
def home():
    return "PCO-US Server Running!", 200


# ------------------------------
# Receive Live Vitals (ESP32)
# ------------------------------

@app.route("/api/vitals", methods=["POST"])
def receive_vitals():
    data = request.json

    reading = {
        "timestamp": datetime.now().isoformat(),
        "hr": data.get("heart_rate"),
        "hrv": data.get("hrv"),
        "temp": data.get("temperature"),
        "move": data.get("movement")
    }

    raw_readings.append(reading)

    return jsonify({"status": "stored"}), 200


# ------------------------------
# Get Latest Reading (Optional)
# ------------------------------

@app.route("/api/latest", methods=["GET"])
def get_latest():
    if len(raw_readings) == 0:
        return jsonify({"message": "No data yet"}), 200
    return jsonify(raw_readings[-1]), 200


# ------------------------------
# Close Day & Calculate Average
# ------------------------------

@app.route("/api/day/close", methods=["POST"])
def close_day():

    if len(raw_readings) == 0:
        return jsonify({"error": "No readings available"}), 400

    valid_hr = [r["hr"] for r in raw_readings if r["hr"]]
    valid_hrv = [r["hrv"] for r in raw_readings if r["hrv"]]
    valid_temp = [r["temp"] for r in raw_readings if r["temp"]]

    avg_hr = sum(valid_hr) / len(valid_hr) if valid_hr else 0
    avg_hrv = sum(valid_hrv) / len(valid_hrv) if valid_hrv else 0
    avg_temp = sum(valid_temp) / len(valid_temp) if valid_temp else 0

    summary = {
        "day": len(day_summaries) + 1,
        "avg_hr": round(avg_hr, 1),
        "avg_hrv": round(avg_hrv, 1),
        "avg_temp": round(avg_temp, 2),
        "total_samples": len(raw_readings),
        "date": datetime.now().date().isoformat()
    }

    day_summaries.append(summary)

    raw_readings.clear()  # Reset for next day

    return jsonify(summary), 200


# ------------------------------
# Get All Day Summaries
# ------------------------------

@app.route("/api/days", methods=["GET"])
def get_days():
    return jsonify(day_summaries), 200


# ------------------------------
# Run Server
# ------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)