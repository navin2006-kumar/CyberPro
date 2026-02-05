FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install network tools
RUN apt-get update && apt-get install -y \
    tcpdump \
    tshark \
    net-tools \
    iputils-ping \
    curl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install cloudshark (web-based packet analyzer)
RUN pip3 install --no-cache-dir flask scapy

# Create app directory
WORKDIR /app

# Copy web interface
COPY app.py /app/

EXPOSE 8082

CMD ["python3", "app.py"]
