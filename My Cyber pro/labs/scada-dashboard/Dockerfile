FROM nodered/node-red:latest

USER root

# Install additional nodes
RUN npm install --no-audit --no-update-notifier --no-fund --only=production \
    node-red-dashboard \
    node-red-contrib-modbus \
    node-red-contrib-influxdb

USER node-red

# Expose ports
EXPOSE 1880 1881

CMD ["npm", "start"]
