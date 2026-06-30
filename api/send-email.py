from http.server import BaseHTTPRequestHandler
import json, os, io, csv, smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication


def _build_csv(data, bizno_fields, crawl_fields, tele_fields, mapping_fields) -> bytes:
    buf = io.StringIO()
    columns = ["사업자번호"]
    if bizno_fields:
        columns.extend([f"bizno_{f}" for f in bizno_fields])
    if crawl_fields:
        columns.extend([f"crawl_{f}" for f in crawl_fields])
    if tele_fields:
        columns.extend([f"tele_{f}" for f in tele_fields])
    if mapping_fields:
        columns.extend([f"mapping_{f}" for f in mapping_fields])

    writer = csv.DictWriter(buf, fieldnames=columns)
    writer.writeheader()

    for item in data:
        row = {"사업자번호": item.get("brno_formatted", item.get("brno", ""))}

        if bizno_fields and item.get("api", {}).get("bizno", {}).get("items"):
            bizno_data = item["api"]["bizno"]["items"][0]
            for f in bizno_fields:
                row[f"bizno_{f}"] = bizno_data.get(f, "")

        if crawl_fields:
            crawl_info = item.get("crawl") or {}
            search_data = crawl_info.get("search") or {}
            detail_data = crawl_info.get("detail") or {}
            for f in crawl_fields:
                if f in search_data:
                    row[f"crawl_{f}"] = search_data.get(f, "")
                elif f.startswith("국세청산업분류_") and "국세청산업분류" in detail_data:
                    ind = detail_data["국세청산업분류"]
                    key = f.replace("국세청산업분류_", "")
                    row[f"crawl_{f}"] = str(ind.get(key, "")) if isinstance(ind, dict) else ""
                else:
                    row[f"crawl_{f}"] = str(detail_data.get(f, ""))

        if tele_fields and item.get("api", {}).get("gov", {}).get("items"):
            gov_data = item["api"]["gov"]["items"][0]
            for f in tele_fields:
                row[f"tele_{f}"] = gov_data.get(f, "")

        if mapping_fields and item.get("mapping"):
            m = item["mapping"]
            for f in mapping_fields:
                if f == "mct_ry_cd" and m.get("mct_ry_cd"):
                    row["mapping_mct_ry_cd"] = m["mct_ry_cd"].get("code", "")
                elif f == "mct_ry_nm" and m.get("mct_ry_cd"):
                    row["mapping_mct_ry_nm"] = m["mct_ry_cd"].get("name", "")
                elif f == "hpsn_mct_zcd" and m.get("hpsn_mct_zcd"):
                    row["mapping_hpsn_mct_zcd"] = m["hpsn_mct_zcd"].get("code", "")
                elif f == "hpsn_mct_nm" and m.get("hpsn_mct_zcd"):
                    row["mapping_hpsn_mct_nm"] = m["hpsn_mct_zcd"].get("name", "")

        writer.writerow(row)

    return buf.getvalue().encode("utf-8-sig")


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(length))

        email_address = payload.get("email", "").strip()
        data = payload.get("data", [])
        bizno_fields = payload.get("bizno_fields", [])
        tele_fields = payload.get("tele_fields", [])
        crawl_fields = payload.get("crawl_fields", [])
        mapping_fields = payload.get("mapping_fields", [])

        if not email_address:
            return self._respond(400, {"success": False, "error": "메일 주소가 필요합니다."})
        if not data:
            return self._respond(400, {"success": False, "error": "조회 데이터가 필요합니다."})

        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        from_email = os.environ.get("SMTP_FROM_EMAIL", smtp_user)

        if not smtp_user or not smtp_password:
            return self._respond(500, {"success": False, "error": "이메일 서버 설정이 필요합니다."})

        try:
            csv_bytes = _build_csv(data, bizno_fields, crawl_fields, tele_fields, mapping_fields)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"business_registration_{len(data)}_{timestamp}.csv"

            msg = MIMEMultipart()
            msg["From"] = from_email
            msg["To"] = email_address
            msg["Subject"] = f"[사업자번호 조회] 조회결과 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            msg.attach(MIMEText("조회 결과를 첨부파일로 보내드립니다.", "plain", "utf-8"))

            attachment = MIMEApplication(csv_bytes, _subtype="octet-stream")
            attachment.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(attachment)

            with smtplib.SMTP(smtp_server, smtp_port) as s:
                s.starttls()
                s.login(smtp_user, smtp_password)
                s.send_message(msg)

            self._respond(200, {"success": True, "message": "메일이 발송되었습니다."})
        except smtplib.SMTPException as e:
            self._respond(500, {"success": False, "error": f"이메일 발송 실패: {str(e)}"})
        except Exception as e:
            self._respond(500, {"success": False, "error": f"오류: {str(e)}"})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _respond(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
