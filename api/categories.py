from http.server import BaseHTTPRequestHandler
import json
import pathlib

_BASE = pathlib.Path(__file__).parent.parent / "data"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            with open(_BASE / "mct_ry_cd.json", encoding="utf-8") as f:
                mct = json.load(f)
            with open(_BASE / "hpsn_mct_zcd.json", encoding="utf-8") as f:
                hpsn = json.load(f)
            data = {"success": True, "mct_ry_cd": mct, "hpsn_mct_zcd": hpsn}
        except Exception as e:
            data = {"success": False, "error": str(e)}
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
