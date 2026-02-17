#!/usr/bin/env python3
"""
Vulnerable Firewall #2 - Advanced Vulnerabilities
VULNS: FTP bounce, RST race condition, IP fragment bypass, broken state machine
"""
from scapy.all import *
import time
from collections import defaultdict

class VulnFirewall2:
    def __init__(self):
        self.targets = ["10.50.0.10", "10.50.0.11"]
        self.connections = {}

    def is_allowed(self, pkt):
        if IP not in pkt:
            return False

        src_ip, dst_ip = pkt[IP].src, pkt[IP].dst
        if dst_ip not in self.targets:
            return False

        if pkt[IP].proto == 6 and pkt.haslayer(TCP):
            sport, dport = pkt[TCP].sport, pkt[TCP].dport
            flags = pkt[TCP].flags
            key = f"{src_ip}:{sport}-{dst_ip}:{dport}"

            # VULN #1: FTP bounce - port 20 always allowed
            if sport == 20 or dport == 20:
                print(f"[ALLOW FTP] {src_ip}:{sport} -> {dst_ip}:{dport}")
                return True

            # VULN #2: RST race condition - marks as CLOSED but doesn't block
            if flags & 0x04:  # RST
                self.connections[key] = "CLOSED"
                return False

            # VULN #3: Fragment bypass - only inspects first fragment
            if pkt[IP].frag != 0:
                print(f"[ALLOW FRAG] {src_ip} -> {dst_ip}")
                return True

            # Broken state machine
            if key not in self.connections:
                self.connections[key] = "NEW"

            if flags & 0x02:  # SYN
                self.connections[key] = "SYN_RCVD"
                print(f"[ALLOW SYN] {src_ip}:{sport} -> {dst_ip}:{dport}")
                return True
            elif self.connections[key] == "SYN_RCVD" and flags & 0x10:
                self.connections[key] = "ESTAB"
                print(f"[ALLOW ESTAB] {src_ip}:{sport} -> {dst_ip}:{dport}")
                return True
            elif self.connections[key] == "ESTAB":
                return True

        print(f"[DROP] {src_ip} -> {dst_ip}")
        return False

    def run(self):
        print("=" * 60)
        print("[*] VulnFW2 ACTIVE")
        print(f"[*] Protecting: {', '.join(self.targets)}")
        print("[!] VULNS: FTP bounce, RST race, IP fragments, state confusion")
        print("=" * 60)
        sniff(iface="eth0", prn=lambda p: self.is_allowed(p), store=0)

if __name__ == "__main__":
    fw = VulnFirewall2()
    fw.run()
