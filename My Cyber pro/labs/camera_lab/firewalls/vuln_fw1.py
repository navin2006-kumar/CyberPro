#!/usr/bin/env python3
"""
Vulnerable Firewall #1 - Protects Camera + Web targets
VULNS: ICMP flood, DNS amplification, SYN flood bypass, HTTP always allowed
"""
from scapy.all import *
import time
from collections import defaultdict

class VulnFirewall1:
    def __init__(self):
        self.targets = ["10.50.0.10", "10.50.0.11"]  # camera + web
        self.state_table = defaultdict(list)

    def is_allowed(self, pkt):
        if IP not in pkt:
            return False

        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst

        # Must target our services
        if dst_ip not in self.targets:
            return False

        proto = pkt[IP].proto

        # VULN #1: ICMP echo flood allowed - no rate limiting
        if proto == 1 and pkt.haslayer(ICMP) and pkt[ICMP].type == 8:
            print(f"[ALLOW ICMP] {src_ip} -> {dst_ip}")
            return True

        # VULN #2: UDP/53 DNS amplification - blindly forwards DNS
        if proto == 17 and pkt.haslayer(UDP) and pkt[UDP].dport == 53:
            print(f"[ALLOW DNS] {src_ip} -> {dst_ip}")
            return True

        # VULN #3: HTTP/8080 always allowed (camera stream exposed)
        if proto == 6 and pkt.haslayer(TCP):
            dport = pkt[TCP].dport
            if dport in [80, 8080, 443]:
                print(f"[ALLOW HTTP] {src_ip}:{pkt[TCP].sport} -> {dst_ip}:{dport}")
                return True

            # VULN #4: SYN flood bypass - threshold too high (500 in 30s)
            if pkt[TCP].flags & 0x02:  # SYN
                self.state_table[src_ip].append(time.time())
                # Clean old entries (>30s)
                self.state_table[src_ip] = [
                    t for t in self.state_table[src_ip] if time.time() - t < 30
                ]
                if len(self.state_table[src_ip]) < 500:  # WAY TOO HIGH
                    print(f"[ALLOW SYN] {src_ip} -> {dst_ip}:{dport}")
                    return True

        print(f"[DROP] {src_ip} -> {dst_ip}")
        return False

    def run(self):
        print("=" * 60)
        print("[*] VulnFW1 ACTIVE")
        print(f"[*] Protecting: {', '.join(self.targets)}")
        print("[!] VULNS: ICMP flood, DNS amp, SYN flood, HTTP bypass")
        print("=" * 60)
        sniff(iface="eth0", prn=lambda p: self.is_allowed(p), store=0)

if __name__ == "__main__":
    fw = VulnFirewall1()
    fw.run()
