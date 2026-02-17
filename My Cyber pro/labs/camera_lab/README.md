# Pentest Lab: Vulnerable Firewalls + Camera Target

## Network Architecture

```
ATTACKER(10.51.0.x) → FW1(10.50.0.2) → CAMERA(10.50.0.10:8080)
                  ↘ FW2(10.50.0.3) ↗ WEB(10.50.0.11:80)
```

## Services

| Container       | IP          | Role                          |
|-----------------|------------|-------------------------------|
| camera-target   | 10.50.0.10 | CCTV camera (MJPEG stream)    |
| web-target      | 10.50.0.11 | Nginx web server              |
| vuln-fw1        | 10.50.0.2  | Firewall #1 (ICMP/DNS/SYN)   |
| vuln-fw2        | 10.50.0.3  | Firewall #2 (FTP/Frag/RST)   |
| attacker        | 10.51.0.x  | Kali Linux attack box         |

## Vulnerabilities

### Firewall #1 (vuln-fw1)
- **ICMP Flood**: No rate limiting on ICMP echo
- **DNS Amplification**: Blindly forwards UDP/53
- **HTTP Bypass**: Ports 80/8080/443 always allowed
- **SYN Flood**: Threshold set to 500/30s (way too high)

### Firewall #2 (vuln-fw2)
- **FTP Bounce**: Port 20 traffic always allowed
- **RST Race**: State confusion on RST then re-SYN
- **IP Fragments**: Only inspects first fragment
- **State Confusion**: Broken TCP state machine

### Camera Target
- Default credentials: `admin:admin`
- Status endpoint exposed without auth
- Health endpoint exposed without auth
- MJPEG stream accessible with basic auth

## Deploy

```bash
# Create data directory
mkdir -p data logs

# Start the lab
docker-compose up -d --build
```

### Attacker Terminal

Open the web terminal in your browser:

```
http://localhost:7681
```

Attack scripts are ready to run:

```bash
./exploit_fw1.sh      # Attack Firewall #1
./exploit_fw2.sh      # Attack Firewall #2
./exploit_camera.sh   # Attack Camera
```

## Monitor

```bash
docker logs -f vuln-fw1       # Watch FW1 drops/allows
docker logs -f vuln-fw2       # Watch FW2 drops/allows
docker logs -f camera-target  # Camera access logs
```

## Cleanup

```bash
docker-compose down -v
```
