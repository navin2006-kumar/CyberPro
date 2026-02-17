import cv2
import time
import os
from datetime import datetime
from flask import Flask, Response, request, jsonify

VIDEO_PATH = os.environ.get("CAM_VIDEO", "/data/sample.mp4")
HOST = os.environ.get("CAM_HOST", "0.0.0.0")
PORT = int(os.environ.get("CAM_PORT", "8080"))
LOG_FILE = os.environ.get("CAM_LOG", "/logs/camera.log")

CAMERA_NAME = os.environ.get("CAM_NAME", "CCTV-CAM-01")
LOCATION = os.environ.get("CAM_LOC", "Perimeter Gate A")

REQUIRE_AUTH = os.environ.get("CAM_AUTH", "0") == "1"
AUTH_USER = os.environ.get("CAM_USER", "admin")
AUTH_PASS = os.environ.get("CAM_PASS", "admin")

app = Flask(__name__)

def write_log(event: str, extra: str = ""):
    ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    ip = request.headers.get("X-Forwarded-For", request.remote_addr) if request else "unknown"
    line = f"{ts} camera={CAMERA_NAME} loc={LOCATION} src_ip={ip} event={event}"
    if extra:
        line += f" {extra}"
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line, flush=True)

def check_basic_auth():
    if not REQUIRE_AUTH:
        return True
    auth = request.authorization
    if not auth or auth.username != AUTH_USER or auth.password != AUTH_PASS:
        write_log("AUTH_FAIL")
        return False
    write_log("AUTH_OK", f"user={auth.username}")
    return True

def mjpeg_generator():
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        import numpy as np
        while True:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "NO VIDEO INPUT", (60, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n")
            time.sleep(0.1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or fps > 120:
        fps = 15.0
    delay = 1.0 / fps

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, f"{CAMERA_NAME}  {ts}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"LOC: {LOCATION}", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        ret, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if ret:
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n")
        time.sleep(delay)

@app.route("/")
def index():
    write_log("DASHBOARD_VIEW")
    return f"""
    <h2>{CAMERA_NAME}</h2>
    <p>Location: {LOCATION}</p>
    <ul>
      <li><a href="/stream">Live Stream (MJPEG)</a></li>
      <li><a href="/status">Status JSON</a></li>
      <li><a href="/health">Health</a></li>
    </ul>
    """

@app.route("/health")
def health():
    return "ok", 200

@app.route("/status")
def status():
    write_log("STATUS_QUERY")
    return jsonify({
        "camera": CAMERA_NAME,
        "location": LOCATION,
        "stream_url": f"http://{request.host}/stream",
        "auth_required": REQUIRE_AUTH,
        "time": datetime.utcnow().isoformat() + "Z"
    })

@app.route("/stream")
def stream():
    if not check_basic_auth():
        return Response("Unauthorized", 401, {"WWW-Authenticate": 'Basic realm="Camera"'})
    write_log("STREAM_OPEN")
    return Response(mjpeg_generator(), mimetype="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    open(LOG_FILE, "a", encoding="utf-8").close()
    app.run(host=HOST, port=PORT, threaded=True)
