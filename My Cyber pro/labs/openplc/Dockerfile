FROM ubuntu:22.04

# Avoid prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
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
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Clone OpenPLC
WORKDIR /workdir
RUN git clone https://github.com/thiagoralves/OpenPLC_v3.git

# Build OpenPLC
WORKDIR /workdir/OpenPLC_v3
RUN ./install.sh linux

# Install Python dependencies for webserver
RUN pip3 install --no-cache-dir flask flask-login pymodbus pyserial

# Expose web interface port
EXPOSE 8080

# Start OpenPLC webserver
WORKDIR /workdir/OpenPLC_v3/webserver
CMD ["python3", "webserver.py"]
