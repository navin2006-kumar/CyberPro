#!/usr/bin/env python3
"""
Network Traffic Generator
Generates various types of network traffic for monitoring and analysis
"""

from scapy.all import *
import time
import random
import threading

class TrafficGenerator:
    def __init__(self):
        self.running = False
        self.packet_count = 0
        
    def generate_http_traffic(self):
        """Generate simulated HTTP traffic"""
        domains = [
            'example.com',
            'test-server.local',
            'api.industrial.local',
            'scada.control.local',
            'plc.network.local'
        ]
        
        while self.running:
            try:
                domain = random.choice(domains)
                # Simulate DNS query
                dns_query = IP(dst="8.8.8.8")/UDP(dport=53)/DNS(rd=1, qd=DNSQR(qname=domain))
                
                # Simulate HTTP request
                http_request = IP(dst="192.168.1.100")/TCP(dport=80, flags="S")
                
                self.packet_count += 2
                
                time.sleep(random.uniform(1, 5))
            except Exception as e:
                print(f"HTTP traffic error: {e}")
                time.sleep(5)
    
    def generate_modbus_traffic(self):
        """Generate simulated Modbus/TCP traffic"""
        while self.running:
            try:
                # Simulate Modbus read holding registers
                modbus_packet = IP(dst="192.168.1.50")/TCP(dport=502)
                
                self.packet_count += 1
                
                time.sleep(random.uniform(2, 4))
            except Exception as e:
                print(f"Modbus traffic error: {e}")
                time.sleep(5)
    
    def generate_icmp_traffic(self):
        """Generate ICMP ping traffic"""
        targets = [
            '192.168.1.1',
            '192.168.1.10',
            '192.168.1.50',
            '192.168.1.100'
        ]
        
        while self.running:
            try:
                target = random.choice(targets)
                icmp_packet = IP(dst=target)/ICMP()
                
                self.packet_count += 1
                
                time.sleep(random.uniform(3, 8))
            except Exception as e:
                print(f"ICMP traffic error: {e}")
                time.sleep(5)
    
    def generate_broadcast_traffic(self):
        """Generate broadcast/multicast traffic"""
        while self.running:
            try:
                # Simulate ARP broadcast
                arp_packet = Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst="192.168.1.0/24")
                
                self.packet_count += 1
                
                time.sleep(random.uniform(10, 20))
            except Exception as e:
                print(f"Broadcast traffic error: {e}")
                time.sleep(5)
    
    def print_stats(self):
        """Print traffic statistics"""
        while self.running:
            print(f"\n📊 Traffic Statistics:")
            print(f"   Total Packets Generated: {self.packet_count}")
            print(f"   Rate: ~{self.packet_count / max(1, int(time.time() - self.start_time)):.2f} packets/sec")
            print("-" * 50)
            time.sleep(10)
    
    def run(self):
        """Start traffic generation"""
        self.running = True
        self.start_time = time.time()
        
        print("""
    ╔════════════════════════════════════════╗
    ║   Network Traffic Generator v1.0       ║
    ║   Simulating Industrial Network        ║
    ╚════════════════════════════════════════╝
        """)
        
        print("🌐 Starting traffic generation...")
        print("   - HTTP/HTTPS traffic")
        print("   - Modbus/TCP traffic")
        print("   - ICMP ping traffic")
        print("   - Broadcast traffic")
        print("\n" + "=" * 50)
        
        # Start traffic generation threads
        threads = [
            threading.Thread(target=self.generate_http_traffic, daemon=True),
            threading.Thread(target=self.generate_modbus_traffic, daemon=True),
            threading.Thread(target=self.generate_icmp_traffic, daemon=True),
            threading.Thread(target=self.generate_broadcast_traffic, daemon=True),
            threading.Thread(target=self.print_stats, daemon=True)
        ]
        
        for thread in threads:
            thread.start()
        
        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n🛑 Stopping traffic generation...")
            self.running = False
            time.sleep(2)
            print(f"✓ Total packets generated: {self.packet_count}")

if __name__ == "__main__":
    generator = TrafficGenerator()
    generator.run()
