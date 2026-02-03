FROM python:3.11-slim

# Install VNC and desktop environment
RUN apt-get update && apt-get install -y \
    xfce4 \
    xfce4-terminal \
    tigervnc-standalone-server \
    tigervnc-common \
    novnc \
    websockify \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set VNC password
RUN mkdir -p ~/.vnc && \
    echo "labshock" | vncpasswd -f > ~/.vnc/passwd && \
    chmod 600 ~/.vnc/passwd

# Create startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 5900 6080

CMD ["/start.sh"]
