FROM python:3.11-slim

# Install OpenPLC dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    pkg-config \
    bison \
    flex \
    autoconf \
    automake \
    libtool \
    make \
    sqlite3 \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone and build OpenPLC Runtime
WORKDIR /opt
RUN git clone https://github.com/thiagoralves/OpenPLC_v3.git openplc && \
    cd openplc && \
    ./install.sh linux

# Expose OpenPLC web interface and Modbus port
EXPOSE 8080 502

WORKDIR /opt/openplc

# Start OpenPLC
CMD ["./start_openplc.sh"]
