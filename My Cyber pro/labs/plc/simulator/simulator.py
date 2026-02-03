#!/usr/bin/env python3
"""
PLC Simulator - Simulates industrial control system behavior
Connects to OpenPLC Runtime via Modbus TCP
"""

from pymodbus.client import ModbusTcpClient
from pymodbus.server.sync import StartTcpServer
from pymodbus.device import ModbusDeviceIdentification
from pymodbus.datastore import ModbusSequentialDataBlock, ModbusSlaveContext, ModbusServerContext
import time
import random
import threading

class PLCSimulator:
    def __init__(self, host='openplc', port=502):
        self.host = host
        self.port = port
        self.client = None
        self.running = False
        
        # Simulated process variables
        self.temperature = 25.0
        self.pressure = 100.0
        self.flow_rate = 50.0
        self.tank_level = 75.0
        
        # Control variables
        self.pump_running = False
        self.valve_open = False
        self.heater_on = False
        
    def connect(self):
        """Connect to OpenPLC Runtime"""
        print(f"🔌 Connecting to OpenPLC at {self.host}:{self.port}...")
        retry_count = 0
        max_retries = 10
        
        while retry_count < max_retries:
            try:
                self.client = ModbusTcpClient(self.host, port=self.port)
                if self.client.connect():
                    print("✓ Connected to OpenPLC Runtime")
                    return True
            except Exception as e:
                print(f"Connection attempt {retry_count + 1} failed: {e}")
            
            retry_count += 1
            time.sleep(5)
        
        print("❌ Failed to connect to OpenPLC")
        return False
    
    def simulate_process(self):
        """Simulate industrial process behavior"""
        
        # Temperature simulation
        if self.heater_on:
            self.temperature += random.uniform(0.1, 0.5)
            if self.temperature > 100:
                self.temperature = 100
        else:
            self.temperature -= random.uniform(0.05, 0.2)
            if self.temperature < 20:
                self.temperature = 20
        
        # Pressure simulation
        if self.pump_running:
            self.pressure += random.uniform(0.5, 2.0)
            if self.pressure > 150:
                self.pressure = 150
        else:
            self.pressure -= random.uniform(0.2, 1.0)
            if self.pressure < 50:
                self.pressure = 50
        
        # Flow rate simulation
        if self.valve_open:
            self.flow_rate = 80 + random.uniform(-5, 5)
        else:
            self.flow_rate = random.uniform(0, 5)
        
        # Tank level simulation
        if self.pump_running and not self.valve_open:
            self.tank_level += random.uniform(0.1, 0.5)
        elif self.valve_open and not self.pump_running:
            self.tank_level -= random.uniform(0.2, 0.8)
        
        # Keep tank level in bounds
        self.tank_level = max(0, min(100, self.tank_level))
    
    def read_controls(self):
        """Read control signals from PLC"""
        try:
            # Read coils (digital outputs from PLC)
            result = self.client.read_coils(0, 8)
            if not result.isError():
                self.pump_running = result.bits[0]
                self.valve_open = result.bits[1]
                self.heater_on = result.bits[2]
        except Exception as e:
            print(f"Error reading controls: {e}")
    
    def write_sensors(self):
        """Write sensor values to PLC"""
        try:
            # Convert float values to integers for Modbus registers
            temp_int = int(self.temperature * 10)  # 1 decimal precision
            pressure_int = int(self.pressure * 10)
            flow_int = int(self.flow_rate * 10)
            level_int = int(self.tank_level * 10)
            
            # Write to holding registers
            self.client.write_register(0, temp_int)
            self.client.write_register(1, pressure_int)
            self.client.write_register(2, flow_int)
            self.client.write_register(3, level_int)
            
            # Write status bits
            status = (
                (1 if self.pump_running else 0) |
                (2 if self.valve_open else 0) |
                (4 if self.heater_on else 0) |
                (8 if self.tank_level > 90 else 0) |  # High level alarm
                (16 if self.tank_level < 10 else 0)   # Low level alarm
            )
            self.client.write_register(4, status)
            
        except Exception as e:
            print(f"Error writing sensors: {e}")
    
    def run(self):
        """Main simulation loop"""
        if not self.connect():
            print("Starting in standalone mode...")
            # Continue simulation even without PLC connection
        
        self.running = True
        cycle_count = 0
        
        print("\n🏭 PLC Simulator Started")
        print("=" * 50)
        
        while self.running:
            try:
                # Read control signals from PLC
                if self.client and self.client.is_socket_open():
                    self.read_controls()
                
                # Simulate process
                self.simulate_process()
                
                # Write sensor values to PLC
                if self.client and self.client.is_socket_open():
                    self.write_sensors()
                
                # Print status every 10 cycles
                if cycle_count % 10 == 0:
                    self.print_status()
                
                cycle_count += 1
                time.sleep(1)
                
            except KeyboardInterrupt:
                print("\n\n🛑 Shutting down simulator...")
                self.running = False
            except Exception as e:
                print(f"Error in simulation loop: {e}")
                time.sleep(5)
                # Try to reconnect
                if self.client:
                    self.client.close()
                self.connect()
    
    def print_status(self):
        """Print current simulation status"""
        print(f"\n📊 Process Status:")
        print(f"   Temperature: {self.temperature:.1f}°C {'🔥' if self.heater_on else '❄️'}")
        print(f"   Pressure:    {self.pressure:.1f} PSI")
        print(f"   Flow Rate:   {self.flow_rate:.1f} L/min")
        print(f"   Tank Level:  {self.tank_level:.1f}%")
        print(f"\n⚙️  Controls:")
        print(f"   Pump:   {'🟢 ON ' if self.pump_running else '🔴 OFF'}")
        print(f"   Valve:  {'🟢 OPEN' if self.valve_open else '🔴 CLOSED'}")
        print(f"   Heater: {'🟢 ON ' if self.heater_on else '🔴 OFF'}")
        print("-" * 50)

if __name__ == "__main__":
    print("""
    ╔════════════════════════════════════════╗
    ║      PLC Simulator v1.0                ║
    ║      Industrial Process Simulation     ║
    ╚════════════════════════════════════════╝
    """)
    
    simulator = PLCSimulator()
    simulator.run()
