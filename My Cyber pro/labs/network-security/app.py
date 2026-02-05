from flask import Flask, render_template_string, request, jsonify
import subprocess
import os

app = Flask(__name__)

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Network Security Lab</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #1e1e1e; color: #fff; }
        h1 { color: #4CAF50; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { background: #2d2d2d; padding: 20px; margin: 20px 0; border-radius: 8px; }
        button { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 4px; }
        button:hover { background: #45a049; }
        pre { background: #1a1a1a; padding: 15px; border-radius: 4px; overflow-x: auto; }
        input { padding: 8px; margin: 5px; border-radius: 4px; border: 1px solid #444; background: #333; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Network Security Lab</h1>
        
        <div class="section">
            <h2>Packet Capture</h2>
            <button onclick="startCapture()">Start Capture</button>
            <button onclick="stopCapture()">Stop Capture</button>
            <button onclick="viewCapture()">View Packets</button>
            <pre id="capture-output"></pre>
        </div>
        
        <div class="section">
            <h2>Network Tools</h2>
            <input type="text" id="ping-target" placeholder="Enter IP or hostname" value="8.8.8.8">
            <button onclick="pingHost()">Ping</button>
            <pre id="ping-output"></pre>
        </div>
        
        <div class="section">
            <h2>Interface Info</h2>
            <button onclick="getInterfaces()">Show Interfaces</button>
            <pre id="interface-output"></pre>
        </div>
    </div>
    
    <script>
        function startCapture() {
            fetch('/api/capture/start', {method: 'POST'})
                .then(r => r.json())
                .then(data => {
                    document.getElementById('capture-output').textContent = data.message;
                });
        }
        
        function stopCapture() {
            fetch('/api/capture/stop', {method: 'POST'})
                .then(r => r.json())
                .then(data => {
                    document.getElementById('capture-output').textContent = data.message;
                });
        }
        
        function viewCapture() {
            fetch('/api/capture/view')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('capture-output').textContent = data.output || 'No packets captured';
                });
        }
        
        function pingHost() {
            const target = document.getElementById('ping-target').value;
            fetch('/api/ping?target=' + target)
                .then(r => r.json())
                .then(data => {
                    document.getElementById('ping-output').textContent = data.output;
                });
        }
        
        function getInterfaces() {
            fetch('/api/interfaces')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('interface-output').textContent = data.output;
                });
        }
    </script>
</body>
</html>
'''

capture_process = None

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/capture/start', methods=['POST'])
def start_capture():
    global capture_process
    try:
        capture_process = subprocess.Popen(
            ['tcpdump', '-i', 'any', '-w', '/tmp/capture.pcap'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return jsonify({'message': 'Capture started on all interfaces'})
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'})

@app.route('/api/capture/stop', methods=['POST'])
def stop_capture():
    global capture_process
    if capture_process:
        capture_process.terminate()
        capture_process = None
        return jsonify({'message': 'Capture stopped'})
    return jsonify({'message': 'No capture running'})

@app.route('/api/capture/view')
def view_capture():
    try:
        result = subprocess.run(
            ['tcpdump', '-r', '/tmp/capture.pcap', '-n', '-c', '50'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return jsonify({'output': result.stdout})
    except Exception as e:
        return jsonify({'output': f'Error: {str(e)}'})

@app.route('/api/ping')
def ping():
    target = request.args.get('target', '8.8.8.8')
    try:
        result = subprocess.run(
            ['ping', '-c', '4', target],
            capture_output=True,
            text=True,
            timeout=10
        )
        return jsonify({'output': result.stdout})
    except Exception as e:
        return jsonify({'output': f'Error: {str(e)}'})

@app.route('/api/interfaces')
def interfaces():
    try:
        result = subprocess.run(
            ['ip', 'addr'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return jsonify({'output': result.stdout})
    except:
        # Fallback to ifconfig
        result = subprocess.run(
            ['ifconfig'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return jsonify({'output': result.stdout})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8082, debug=False)
