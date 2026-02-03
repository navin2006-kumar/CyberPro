FROM nodered/node-red:latest

USER root

# Install additional Node-RED nodes for industrial protocols
RUN npm install --unsafe-perm --no-update-notifier --no-fund --only=production \
    node-red-contrib-modbus \
    node-red-dashboard \
    node-red-contrib-opcua \
    node-red-contrib-s7 \
    node-red-node-serialport

# Copy pre-configured flows
COPY flows.json /data/flows.json
COPY settings.js /data/settings.js

# Set permissions
RUN chown -R node-red:node-red /data

USER node-red

EXPOSE 1880

CMD ["npm", "start", "--", "--userDir", "/data"]
