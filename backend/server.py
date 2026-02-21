from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import random
import cv2
import numpy as np
import base64
from scipy.signal import find_peaks

app = Flask(__name__)
CORS(app)

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
    data = request.get_json(force=True)
    reading = {
        "timestamp": datetime.now().isoformat(),
        "hr":   data.get("heart_rate"),
        "hrv":  data.get("hrv"),
        "temp": data.get("temperature"),
        "move": data.get("movement")
    }
    raw_readings.append(reading)
    print(f"📥 Stored | HR: {reading['hr']} | HRV: {reading['hrv']} | Temp: {reading['temp']} | Total in buffer: {len(raw_readings)}")
    return jsonify({"status": "stored", "total": len(raw_readings)}), 200

# ------------------------------
# Get Latest Reading
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
    print(f"Closing day. Buffer has {len(raw_readings)} readings")

    if len(raw_readings) == 0:
        return jsonify({"error": "No readings available"}), 400

    valid_hr   = [r["hr"]   for r in raw_readings if r["hr"]   is not None]
    valid_hrv  = [r["hrv"]  for r in raw_readings if r["hrv"]  is not None]
    valid_temp = [r["temp"] for r in raw_readings if r["temp"] is not None]

    avg_hr   = round(sum(valid_hr)   / len(valid_hr),   1) if valid_hr   else 0
    avg_hrv  = round(sum(valid_hrv)  / len(valid_hrv),  1) if valid_hrv  else 0
    avg_temp = round(sum(valid_temp) / len(valid_temp), 2) if valid_temp else 0

    summary = {
        "day":           len(day_summaries) + 1,
        "avg_hr":        avg_hr,
        "avg_hrv":       avg_hrv,
        "avg_temp":      avg_temp,
        "total_samples": len(raw_readings),
        "date":          datetime.now().date().isoformat()
    }

    day_summaries.append(summary)
    raw_readings.clear()

    print(f"✅ Day closed: {summary}")
    return jsonify(summary), 200

# ------------------------------
# Get All Day Summaries
# ------------------------------

@app.route("/api/days", methods=["GET"])
def get_days():
    return jsonify(day_summaries), 200

# ------------------------------
# Simulate Days 2 / 3 / 4
# ------------------------------

@app.route("/api/day/simulate", methods=["POST"])
def simulate_day():
    data = request.get_json(force=True)
    day_number = data.get("day")

    if len(day_summaries) > 0:
        base_hr   = day_summaries[0]["avg_hr"]
        base_hrv  = day_summaries[0]["avg_hrv"]
        base_temp = day_summaries[0]["avg_temp"]
    else:
        base_hr   = 75.0
        base_hrv  = 55.0
        base_temp = 36.5

    if day_number == 2:
        summary = {
            "day":           2,
            "avg_hr":        round(base_hr   + random.uniform(-2, 2),     1),
            "avg_hrv":       round(base_hrv  - random.uniform(1, 4),      1),
            "avg_temp":      round(base_temp + random.uniform(0.02, 0.05), 2),
            "total_samples": random.randint(8, 15),
            "lh": None
        }
    elif day_number == 3:
        summary = {
            "day":           3,
            "avg_hr":        round(base_hr   + random.uniform(1, 3),      1),
            "avg_hrv":       round(base_hrv  - random.uniform(3, 6),      1),
            "avg_temp":      round(base_temp + random.uniform(0.05, 0.1),  2),
            "total_samples": random.randint(8, 15),
            "lh": None
        }
    elif day_number == 4:
        summary = {
            "day":           4,
            "avg_hr":        round(base_hr   + random.uniform(2, 5),      1),
            "avg_hrv":       round(base_hrv  - random.uniform(5, 8),      1),
            "avg_temp":      round(base_temp + random.uniform(0.2, 0.4),   2),
            "total_samples": random.randint(8, 15),
            "lh": None
        }
    else:
        return jsonify({"error": "Invalid day number"}), 400

    day_summaries.append(summary)
    print(f"🔁 Simulated Day {day_number}: {summary}")
    return jsonify(summary), 200

# ------------------------------
# LH Strip Analysis (OpenCV)
# ------------------------------

@app.route("/api/lh/analyze", methods=["POST"])
def analyze_lh():
    data = request.get_json(force=True)
    image_b64 = data.get("image")

    if not image_b64:
        return jsonify({"error": "No image provided"}), 400

    try:
        img_bytes = base64.b64decode(image_b64)
        np_arr   = np.frombuffer(img_bytes, np.uint8)
        img      = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {str(e)}"}), 400

    if img is None:
        return jsonify({"error": "Could not read image"}), 400

    h, w = img.shape[:2]

    # ── Auto-detect orientation ──
    # If width > height, strip is horizontal → rotate to vertical
    if w > h:
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Focus on the reading window only ──
    # Ignore top 10% (dipping end) and bottom 20% (handle)
    # Focus on center horizontal band where C and T lines appear
    top    = int(h * 0.10)
    bottom = int(h * 0.80)
    left   = int(w * 0.20)
    right  = int(w * 0.80)

    roi = gray[top:bottom, left:right]

    # ── Blur ──
    blurred = cv2.GaussianBlur(roi, (7, 7), 0)

    # ── Invert (dark lines on white background) ──
    inverted = cv2.bitwise_not(blurred)

    # ── Column-wise mean along height to detect dark horizontal bands ──
    roi_h = roi.shape[0]
    row_means = np.mean(inverted, axis=1)

    # ── Smooth ──
    kernel_size = max(5, roi_h // 30)
    smoothed = np.convolve(
        row_means,
        np.ones(kernel_size) / kernel_size,
        mode='same'
    )

    # ── Dynamic threshold — only pick clear peaks ──
    threshold = np.mean(smoothed) + 0.8 * np.std(smoothed)

    peaks, props = find_peaks(
        smoothed,
        height=threshold,
        distance=roi_h // 8,
        prominence=5
    )

    print(f"🔬 LH | image size: {w}x{h} | ROI: {roi.shape} | Peaks: {len(peaks)} at {peaks}")
    print(f"   Threshold: {threshold:.2f} | Mean: {np.mean(smoothed):.2f} | Std: {np.std(smoothed):.2f}")

    if len(peaks) == 0:
        return jsonify({
            "result":      "error",
            "confidence":  0.0,
            "message":     "No lines detected — ensure strip is in frame and well lit",
            "peaks_found": 0
        }), 200

    if len(peaks) == 1:
        # Only C line — negative result
        return jsonify({
            "result":      "negative",
            "confidence":  5.0,
            "message":     "Only control line (C) detected — LH surge not detected",
            "peaks_found": 1,
            "ratio":       0.0,
            "t_intensity": 0.0,
            "c_intensity": round(float(smoothed[peaks[0]]), 2)
        }), 200

    # ── 2+ peaks found — get T and C ──
    # Sort by peak height (brightness) descending
    peak_heights = smoothed[peaks]
    sorted_by_height = np.argsort(peak_heights)[::-1]
    top2_peaks   = peaks[sorted_by_height[:2]]
    top2_heights = peak_heights[sorted_by_height[:2]]

    # The brighter peak = C (control, always present and strong)
    # The dimmer peak   = T (test, present only if LH surge)
    c_intensity = float(top2_heights[0])
    t_intensity = float(top2_heights[1])

    ratio      = t_intensity / c_intensity if c_intensity > 0 else 0
    confidence = round(min(ratio * 100, 100), 1)

    print(f"   C intensity: {c_intensity:.2f} | T intensity: {t_intensity:.2f} | Ratio: {ratio:.3f}")

    if ratio >= 0.85:
        result  = "positive"
        message = "LH surge detected — ovulation likely within 24–36 hours"
    elif ratio >= 0.5:
        result  = "borderline"
        message = "LH rising — surge may be approaching, retest in 12 hours"
    else:
        result  = "negative"
        message = "LH surge not detected — T line too faint"

    print(f"   Result: {result} | Confidence: {confidence}%")

    return jsonify({
        "result":      result,
        "confidence":  confidence,
        "ratio":       round(ratio, 3),
        "t_intensity": round(t_intensity, 2),
        "c_intensity": round(c_intensity, 2),
        "message":     message,
        "peaks_found": len(peaks)
    }), 200

# ------------------------------
# Run Server
# ------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)