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

# Known local developer service configurations & commands
WATCHED_SERVICES = {
    "paperclip": {
        "name": "Paperclip Control",
        "port": 3100,
        "desc": "Agent Control Plane",
        "systemd": "paperclipai.service"
    },
    "omniroute": {
        "name": "OmniRoute Gateway",
        "port": 20128,
        "desc": "Local AI Gateway",
        "systemd": "omniroute.service"
    },
    "oxiroute": {
        "name": "Oxiroute AI",
        "port": 20200,
        "desc": "Rust AI Router",
        "workdir": "/home/omid/Code/ai/oxiroute",
        "start_cmd": "cargo run --release --bin oxiroute"
    },
    "golestan": {
        "name": "Golestan Fullstack",
        "port": 33000,
        "ports": [33000, 37667],
        "desc": "UI :33000 • API :37667",
        "workdir": "/home/omid/Code/fun/golestan-automation",
        "start_cmd": "/home/omid/Code/fun/golestan-automation/.venv/bin/python /home/omid/Code/fun/golestan-automation/dev.py"
    },
    "ayh": {
        "name": "AYH Fullstack",
        "port": 33001,
        "ports": [33001, 38001],
        "desc": "Admin :33001 • DRF :38001",
        "workdir": "/home/omid/Code/work/AYH01",
        "start_cmd": "/home/omid/Code/work/AYH01/venv/bin/python manage.py runserver 38001 & (cd /home/omid/Code/work/AYH01/admin_panel && npm run dev -- -p 33001)"
    }
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
    def check_service_port(port: int) -> tuple:
        t0 = time.perf_counter()
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.15):
                lat_ms = round((time.perf_counter() - t0) * 1000, 1)
                return True, lat_ms
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False, 0.0


class ServiceManager:
    @staticmethod
    def start_service(svc_key: str) -> dict:
        info = WATCHED_SERVICES.get(svc_key)
        if not info:
            return {"success": False, "error": "Unknown service"}

        port = info["port"]
        is_alive, _ = SystemMetrics.check_service_port(port)
        if is_alive:
            return {"success": True, "online": True, "message": "Already running"}

        systemd_svc = info.get("systemd")
        if systemd_svc:
            subprocess.run(["systemctl", "--user", "start", systemd_svc], check=False)
        elif "start_cmd" in info:
            workdir = info.get("workdir")
            subprocess.Popen(
                info["start_cmd"],
                shell=True,
                cwd=workdir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )

        # Brief pause to verify socket
        time.sleep(0.6)
        is_now_alive, lat = SystemMetrics.check_service_port(port)
        return {"success": True, "online": is_now_alive, "latency_ms": lat}

    @staticmethod
    def stop_service(svc_key: str) -> dict:
        info = WATCHED_SERVICES.get(svc_key)
        if not info:
            return {"success": False, "error": "Unknown service"}

        systemd_svc = info.get("systemd")
        if systemd_svc:
            subprocess.run(["systemctl", "--user", "stop", systemd_svc], check=False)

        # Terminate by port(s)
        port = info["port"]
        ports = info.get("ports", [port])
        for p in ports:
            try:
                subprocess.run(["fuser", "-k", f"{p}/tcp"], capture_output=True, check=False)
            except Exception:
                pass

        time.sleep(0.3)
        is_still_alive, _ = SystemMetrics.check_service_port(port)
        return {"success": True, "online": is_still_alive}


class BridgeRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/api/status", "/api/status/"):
            cpu = SystemMetrics.get_cpu_usage()
            ram = SystemMetrics.get_memory_info()
            gpu = SystemMetrics.get_gpu_info()

            services = {}
            for key, info in WATCHED_SERVICES.items():
                port_list = info.get("ports", [info["port"]])
                ports_status = []
                for p in port_list:
                    p_alive, p_lat = SystemMetrics.check_service_port(p)
                    if p in (3000, 33000):
                        label = "UI"
                    elif p in (7667, 37667, 8001, 38001):
                        label = "API"
                    elif p in (3001, 33001):
                        label = "Admin"
                    else:
                        label = f":{p}"
                    ports_status.append({
                        "port": p,
                        "online": p_alive,
                        "label": label,
                        "latency_ms": p_lat
                    })

                is_alive = any(ps["online"] for ps in ports_status)
                primary_lat = next((ps["latency_ms"] for ps in ports_status if ps["online"]), None)

                services[key] = {
                    "key": key,
                    "name": info["name"],
                    "port": info["port"],
                    "ports": ports_status,
                    "desc": info.get("desc", ""),
                    "online": is_alive,
                    "latency_ms": primary_lat
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

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            params = json.loads(body)
        except Exception:
            params = {}

        svc_key = str(params.get("service", ""))

        if self.path == "/api/service/start":
            res = ServiceManager.start_service(svc_key)
            self._send_json(res)
        elif self.path == "/api/service/stop":
            res = ServiceManager.stop_service(svc_key)
            self._send_json(res)
        elif self.path == "/api/service/toggle":
            info = WATCHED_SERVICES.get(svc_key)
            if info:
                is_alive, _ = SystemMetrics.check_service_port(info["port"])
                if is_alive:
                    res = ServiceManager.stop_service(svc_key)
                else:
                    res = ServiceManager.start_service(svc_key)
                self._send_json(res)
            else:
                self._send_json({"success": False, "error": "Unknown service"})
        else:
            self.send_response(404)
            self.end_headers()

    def _send_json(self, data: dict, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def log_message(self, format, *args):
        # Suppress routine log messages
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
