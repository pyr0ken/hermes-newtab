#!/usr/bin/env python3
"""
Hermes NewTab — System & Service Telemetry Bridge
Ultra-lightweight local HTTP daemon for Linux hardware telemetry and local service status.
Zero external dependencies (uses standard Python 3.8+ library).
"""

import json
import os
import re
import socket
import subprocess
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 20250
HOST = "127.0.0.1"

# Known local developer service ports to probe
WATCHED_SERVICES = {
    "oxiroute": {"name": "Oxiroute AI", "port": 20200},
    "paperclip": {"name": "Paperclip Control", "port": 3100},
    "golestan": {"name": "Golestan Automation", "port": 8000},
    "omniroute": {"name": "OmniRoute", "port": 20128}
}

class SystemMetrics:
    _prev_cpu_idle = 0
    _prev_cpu_total = 0

    @classmethod
    def get_cpu_usage(cls) -> float:
        try:
            with open("/proc/stat", "r") as f:
                line = f.readline()
            fields = [float(x) for x in line.strip().split()[1:8]]
            idle = fields[3] + fields[4]
            total = sum(fields)
            
            idle_delta = idle - cls._prev_cpu_idle
            total_delta = total - cls._prev_cpu_total
            cls._prev_cpu_idle = idle
            cls._prev_cpu_total = total

            if total_delta > 0:
                usage = 100.0 * (1.0 - idle_delta / total_delta)
                return max(0.0, min(100.0, round(usage, 1)))
        except Exception:
            pass
        return 0.0

    @staticmethod
    def get_memory_info() -> dict:
        try:
            meminfo = {}
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    parts = line.split(":")
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().split()[0]
                        meminfo[key] = int(val)
            
            total_kb = meminfo.get("MemTotal", 0)
            avail_kb = meminfo.get("MemAvailable", meminfo.get("MemFree", 0))
            used_kb = max(0, total_kb - avail_kb)

            total_gb = round(total_kb / (1024 * 1024), 1)
            used_gb = round(used_kb / (1024 * 1024), 1)
            percent = round((used_kb / total_kb) * 100, 1) if total_kb > 0 else 0.0

            return {
                "used_gb": used_gb,
                "total_gb": total_gb,
                "percent": percent
            }
        except Exception:
            return {"used_gb": 0, "total_gb": 0, "percent": 0}

    @staticmethod
    def get_gpu_info() -> dict:
        try:
            cmd = ["nvidia-smi", "--query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=1)
            if res.returncode == 0 and res.stdout.strip():
                parts = [p.strip() for p in res.stdout.strip().split(",")]
                if len(parts) >= 5:
                    return {
                        "name": parts[0],
                        "util_percent": float(parts[1]),
                        "temp_c": int(parts[2]),
                        "vram_used_mb": int(parts[3]),
                        "vram_total_mb": int(parts[4]),
                        "available": True
                    }
        except Exception:
            pass
        return {"name": "N/A", "util_percent": 0, "temp_c": 0, "vram_used_mb": 0, "vram_total_mb": 0, "available": False}

    @staticmethod
    def check_service_port(port: int) -> bool:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.15):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False


class BridgeRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/api/status", "/api/status/"):
            cpu = SystemMetrics.get_cpu_usage()
            ram = SystemMetrics.get_memory_info()
            gpu = SystemMetrics.get_gpu_info()

            services = {}
            for key, info in WATCHED_SERVICES.items():
                is_alive = SystemMetrics.check_service_port(info["port"])
                services[key] = {
                    "name": info["name"],
                    "port": info["port"],
                    "online": is_alive
                }

            payload = {
                "timestamp": time.time(),
                "hostname": socket.gethostname(),
                "os": "Arch Linux",
                "cpu": {"percent": cpu},
                "ram": ram,
                "gpu": gpu,
                "services": services
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress routine HTTP log spam for quiet execution
        pass

def run():
    print(f"⚡ Hermes System Bridge daemon running at http://{HOST}:{PORT}")
    print(f"📡 Monitoring hardware & services: {list(WATCHED_SERVICES.keys())}")
    server = HTTPServer((HOST, PORT), BridgeRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down bridge daemon...")
        server.server_close()

if __name__ == "__main__":
    run()
