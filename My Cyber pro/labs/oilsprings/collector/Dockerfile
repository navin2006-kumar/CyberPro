FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    requests

WORKDIR /app

# Copy collector application
COPY collector.py /app/
COPY templates/ /app/templates/

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 5000

CMD ["python", "collector.py"]
