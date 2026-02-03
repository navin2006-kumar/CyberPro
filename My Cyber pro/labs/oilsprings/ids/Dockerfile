FROM python:3.11-slim

# Install network monitoring tools
RUN apt-get update && apt-get install -y \
    tcpdump \
    net-tools \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    scapy \
    flask \
    flask-cors \
    pymodbus

# Create app directory
WORKDIR /app

# Copy monitor application
COPY monitor.py /app/
COPY templates/ /app/templates/

EXPOSE 8000

CMD ["python", "monitor.py"]
