#!/bin/bash
# Firewall entrypoint script

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Flush existing rules
iptables -F
iptables -X
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

# Enable masquerading for traffic from attacker to protected network
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Log packets for monitoring
iptables -A FORWARD -j LOG --log-prefix "[FW] " --log-level 7

echo "[*] Firewall setup complete"
echo "[*] IP Forwarding: enabled"
echo "[*] iptables: configured for monitoring"
echo "[*] Starting firewall monitor script..."
echo ""

# Run the Python firewall script
exec python3 /fw.py
