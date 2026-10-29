#!/usr/bin/env python3
"""
PulseLift 3D — Local Static & Auto-Backup Server (Port 8765)
Serves static app files and provides automatic disk persistence for workout history & state:
- GET  /api/backup          -> Returns workout-backup.json (plus available rolling snapshots)
- POST /api/backup          -> Atomically saves workoutHistory, appState, and rolling snapshots to disk
"""

import http.server
import json
import os
import shutil
import sys
import time
from datetime import datetime
from urllib.parse import urlparse

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_FILE = os.path.join(ROOT_DIR, "workout-backup.json")
BACKUP_DIR = os.path.join(ROOT_DIR, "backups")


def ensure_backup_storage():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
    if not os.path.exists(BACKUP_FILE):
        initial_payload = {
            "schemaVersion": 1,
            "updatedAt": datetime.now().isoformat(),
            "updatedAtMs": int(time.time() * 1000),
            "appState": None,
            "workoutHistory": [],
            "snapshots": []
        }
        with open(BACKUP_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_payload, f, indent=2)


def read_disk_backup():
    ensure_backup_storage()
    try:
        with open(BACKUP_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {
            "schemaVersion": 1,
            "updatedAt": datetime.now().isoformat(),
            "updatedAtMs": int(time.time() * 1000),
            "appState": None,
            "workoutHistory": [],
            "snapshots": []
        }


def merge_histories(existing_list, incoming_list):
    """Non-destructive union merge of workout history entries by id or (isoDate + dayKey + timestamp)."""
    by_key = {}
    for item in (existing_list or []) + (incoming_list or []):
        if not isinstance(item, dict):
            continue
        entry_id = item.get("id")
        key = str(entry_id) if entry_id is not None else f"{item.get('isoDate', '')}_{item.get('dayKey', '')}_{item.get('timestamp', '')}"
        by_key[key] = item
    merged = list(by_key.values())
    merged.sort(key=lambda x: int(x.get("id") or 0), reverse=True)
    return merged[:120]


class PulseLiftRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def end_headers(self):
        # Prevent stale caching on JSON backups and API responses
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/backup":
            data = read_disk_backup()
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/backup":
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            incoming = json.loads(raw_body)
        except Exception as exc:
            err = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(err)
            return

        ensure_backup_storage()
        existing = read_disk_backup()

        existing_history = existing.get("workoutHistory") if isinstance(existing.get("workoutHistory"), list) else []
        incoming_history = incoming.get("workoutHistory") if isinstance(incoming.get("workoutHistory"), list) else []
        allow_empty_overwrite = bool(incoming.get("allowEmptyOverwrite", False))

        # Protect against accidental wipe when a newly reloaded tab has 0 history entries
        if len(incoming_history) == 0 and len(existing_history) > 0 and not allow_empty_overwrite:
            final_history = existing_history
        elif bool(incoming.get("replaceExactHistory", False)):
            final_history = incoming_history
        else:
            final_history = merge_histories(existing_history, incoming_history)

        incoming_snapshots = incoming.get("snapshots")
        final_snapshots = (
            incoming_snapshots
            if isinstance(incoming_snapshots, list) and len(incoming_snapshots) > 0
            else existing.get("snapshots", [])
        )

        # Before overwriting if history count dropped, archive a timestamped snapshot in backups/
        if len(existing_history) > len(final_history) and len(existing_history) > 0:
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            archive_path = os.path.join(BACKUP_DIR, f"pre-change-{stamp}.json")
            try:
                shutil.copy2(BACKUP_FILE, archive_path)
            except Exception:
                pass

        now_iso = datetime.now().isoformat()
        now_ms = int(time.time() * 1000)
        payload = {
            "schemaVersion": 1,
            "updatedAt": now_iso,
            "updatedAtMs": now_ms,
            "reason": incoming.get("reason", "auto-sync"),
            "appState": incoming.get("appState") or existing.get("appState"),
            "workoutHistory": final_history,
            "snapshots": final_snapshots[:15]
        }

        tmp_file = BACKUP_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        os.replace(tmp_file, BACKUP_FILE)

        # Also maintain a daily rolling file in backups/
        day_stamp = datetime.now().strftime("%Y-%m-%d")
        daily_file = os.path.join(BACKUP_DIR, f"workout-backup-{day_stamp}.json")
        try:
            shutil.copy2(BACKUP_FILE, daily_file)
        except Exception:
            pass

        resp = json.dumps({
            "ok": True,
            "updatedAt": now_iso,
            "updatedAtMs": now_ms,
            "historyCount": len(final_history),
            "workoutHistory": final_history
        }).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)


if __name__ == "__main__":
    ensure_backup_storage()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    server = http.server.ThreadingHTTPServer((host, port), PulseLiftRequestHandler)
    print(f"PulseLift Server with Disk Auto-Backup running at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
