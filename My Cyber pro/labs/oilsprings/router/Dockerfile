FROM python:3.11-slim

# Install networking tools
RUN apt-get update && apt-get install -y \
    iptables \
    iproute2 \
    net-tools \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Flask for web interface
RUN pip install --no-cache-dir flask flask-cors

WORKDIR /app

# Copy router application
COPY router.py /app/
COPY templates/ /app/templates/

EXPOSE 8080

CMD ["python", "router.py"]
