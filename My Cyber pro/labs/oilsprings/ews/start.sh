#!/bin/bash

# Start VNC server
vncserver :0 -geometry 1280x720 -depth 24

# Start noVNC for web access
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &

# Keep container running
tail -f /dev/null
