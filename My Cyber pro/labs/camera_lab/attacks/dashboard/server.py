from flask import Flask, jsonify, send_from_directory, request, Response
import subprocess, os, requests

app = Flask(__name__, static_folder='/dashboard', static_url_path='')

state = {'attacker': True, 'fw1': False, 'fw2': False, 'camera': False}

@app.route('/')
def index():
    return send_from_directory('/dashboard', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('/dashboard', path)

@app.route('/api/status')
def get_status():
    return jsonify(state)

def run_check(cmd, timeout=5):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        return r.stdout.strip(), r.returncode
    except:
        return '', 1

@app.route('/api/verify/fw1', methods=['POST'])
def verify_fw1():
    out, rc = run_check(['curl','-s','-o','/dev/null','-w','%{http_code}','--max-time','3','http://10.50.0.10:8080/health'])
    if out == '200':
        state['fw1'] = True
        return jsonify({'success': True, 'message': 'FW1 bypassed! HTTP traffic reached the camera.'})
    return jsonify({'success': False, 'message': 'Cannot reach camera through FW1 yet. Try: ip route add 10.50.0.0/24 via 10.51.0.2'})

@app.route('/api/verify/fw2', methods=['POST'])
def verify_fw2():
    _, rc = run_check(['ping','-c','1','-W','2','10.50.0.10'])
    if rc == 0:
        state['fw2'] = True
        return jsonify({'success': True, 'message': 'FW2 bypassed! Network traffic reached the camera.'})
    return jsonify({'success': False, 'message': 'Cannot reach camera through FW2 yet. Try packet crafting with scapy.'})

@app.route('/api/verify/camera', methods=['POST'])
def verify_camera():
    out, _ = run_check(['curl','-s','-o','/dev/null','-w','%{http_code}','--max-time','3','-u','admin:admin','http://10.50.0.10:8080/stream'])
    if out == '200':
        state['camera'] = True
        return jsonify({'success': True, 'message': 'Camera accessed! Stream captured with default credentials.'})
    return jsonify({'success': False, 'message': 'Cannot access camera stream yet. Try default credentials.'})

@app.route('/api/camera/stream')
def camera_stream_proxy():
    """Proxy the camera's MJPEG stream to the dashboard"""
    try:
        # Stream from the actual camera
        camera_url = 'http://10.50.0.10:8080/stream'
        auth = ('admin', 'admin')
        
        req = requests.get(camera_url, auth=auth, stream=True, timeout=30)
        
        def generate():
            for chunk in req.iter_content(chunk_size=1024):
                if chunk:
                    yield chunk
        
        return Response(generate(), 
                       mimetype='multipart/x-mixed-replace; boundary=frame',
                       headers={'Cache-Control': 'no-cache, no-store, must-revalidate'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mark/<target>', methods=['POST'])
def mark(target):
    if target in state:
        state[target] = True
        return jsonify({'success': True})
    return jsonify({'success': False}), 400

@app.route('/api/reset', methods=['POST'])
def reset():
    state['fw1'] = state['fw2'] = state['camera'] = False
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
