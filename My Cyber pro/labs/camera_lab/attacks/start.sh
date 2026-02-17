#!/bin/bash
# Start ttyd terminal in background
ttyd -p 7681 -W bash -l &

# Start dashboard server
python3 /dashboard/server.py
