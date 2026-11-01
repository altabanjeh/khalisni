"""Restore-drill API journey (standard library only). Never point it at production.

    python scripts/drill/drill_api.py journey --base http://127.0.0.1:18080 --state state.json \
        --provider-profile <id>
    python scripts/drill/drill_api.py check   --base http://127.0.0.1:18080 --state state.json

journey: as the client-audit QA accounts (seed_client_audit_qa, password from
KHALSNI_QA_PASSWORD) a customer submits an order with an uploaded document and
consent, staff review it, verify the document and assign the QA provider, the
provider starts work and uploads the final result, and the customer downloads
the final result. The sha256 of every uploaded file and of the downloaded
final result is written to the state file.

check: signs in again and downloads every recorded document through the API;
exit 1 unless each download is byte-identical (sha256) to what was uploaded.
"""

import argparse
import hashlib
import json
import os
import secrets
import sys
import urllib.error
import urllib.request
import uuid

PREFIX = "client-audit-qa-202610"
DOCUMENT_CODE = f"{PREFIX}-authorization"


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.token = None

    def call(self, method, path, *, json_body=None, files=None, fields=None, raw=False, headers=None):
        request_headers = {"X-Forwarded-Proto": "https", "Accept-Language": "en"}
        request_headers.update(headers or {})
        if self.token:
            request_headers["Authorization"] = f"Bearer {self.token}"
        data = None
        if files is not None or fields is not None:
            boundary = uuid.uuid4().hex
            parts = []
            for name, value in fields or []:
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
            for name, filename, content in files or []:
                parts.append(
                    f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                    f"Content-Type: application/pdf\r\n\r\n".encode() + content + b"\r\n"
                )
            parts.append(f"--{boundary}--\r\n".encode())
            data = b"".join(parts)
            request_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        elif json_body is not None:
            data = json.dumps(json_body).encode()
            request_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(self.base + path, data=data, method=method, headers=request_headers)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
                status = response.status
        except urllib.error.HTTPError as exc:
            body, status = exc.read(), exc.code
        if raw:
            return status, body
        try:
            return status, json.loads(body or b"null")
        except ValueError:
            return status, body.decode("utf-8", "replace")[:500]

    def expect(self, wanted, method, path, **kwargs):
        status, body = self.call(method, path, **kwargs)
        if status != wanted:
            sys.exit(f"{method} {path}: HTTP {status}, expected {wanted}: {str(body)[:800]}")
        print(f"ok {method} {path} -> {status}")
        return body

    def login(self, role, password):
        self.token = None
        body = self.expect(200, "POST", "/api/auth/login/",
                           json_body={"email": f"{PREFIX}-{role}@example.test", "password": password})
        self.token = body["access"]
        return body


def pdf(label):
    return b"%PDF-1.4\n% khalsni restore drill " + label.encode() + b" " + secrets.token_hex(16).encode() + b"\n%%EOF\n"


def sha(content):
    return hashlib.sha256(content).hexdigest()


def documents_of(detail):
    for key in ("documents", "order_documents", "files"):
        if isinstance(detail.get(key), list):
            return detail[key]
    sys.exit(f"order detail has no document list; keys: {sorted(detail)}")


def journey(args, password):
    api = Api(args.base)
    services = None
    api.login("customer_a", password)
    customer = api.expect(200, "GET", "/api/auth/me/")
    status, services = api.call("GET", f"/api/services/?search={PREFIX}")
    service_id = args.service
    if service_id is None:
        items = services.get("results", services) if isinstance(services, dict) else services
        matches = [item for item in items or [] if str(item.get("slug", "")).startswith(PREFIX)]
        if not matches:
            sys.exit(f"QA service not found via /api/services/ (HTTP {status}); pass --service")
        service_id = matches[0]["id"]

    upload = pdf("customer-upload")
    created = api.expect(201, "POST", "/api/orders/", headers={"Idempotency-Key": str(uuid.uuid4())}, fields=[
        ("service", service_id), ("full_name", customer.get("full_name") or "QA Customer A"),
        ("phone", customer.get("phone") or "0798800103"), ("city", "Amman"),
        ("notes", "Restore drill order"), ("consent", "true"), ("document_types", DOCUMENT_CODE),
    ], files=[("documents", "drill-authorization.pdf", upload)])
    order_id = created.get("id") or created.get("order", {}).get("id")
    order_number = created.get("order_number") or created.get("order", {}).get("order_number")
    detail = api.expect(200, "GET", f"/api/customer/orders/{order_id}/")
    uploaded = [doc for doc in documents_of(detail) if not doc.get("is_final_document")]
    if len(uploaded) != 1:
        sys.exit(f"expected one uploaded document, got {uploaded}")
    upload_doc_id = uploaded[0]["id"]

    api.login("employee", password)
    api.expect(200, "PATCH", f"/api/admin/orders/{order_id}/status/",
               json_body={"status": "UNDER_REVIEW", "note": "Restore drill review"})
    api.expect(200, "POST", f"/api/staff/documents/{upload_doc_id}/verify/",
               json_body={"is_verified": True, "note": "Restore drill verified"})
    api.expect(200, "PATCH", f"/api/admin/orders/{order_id}/assign/",
               json_body={"provider_id": args.provider_profile, "note": "Restore drill assignment"})

    api.login("provider_a", password)
    api.expect(200, "PATCH", f"/api/provider/orders/{order_id}/status/",
               json_body={"status": "IN_PROGRESS", "note": "Restore drill work started"})
    final = pdf("final-result")
    final_body = api.expect(201, "POST", f"/api/provider/orders/{order_id}/final-document/",
                            fields=[("document_type", "final-result")],
                            files=[("file", "drill-final-result.pdf", final)])

    # A final result reaches the customer only once staff verified it and the
    # order is completed (documents.services.is_customer_visible_document).
    api.login("employee", password)
    staff_detail = api.expect(200, "GET", f"/api/admin/orders/{order_id}/")
    finals = [doc for doc in documents_of(staff_detail) if doc.get("is_final_document")]
    final_doc_id = (final_body or {}).get("id") if isinstance(final_body, dict) else None
    final_doc_id = final_doc_id or (finals[0]["id"] if finals else None)
    if final_doc_id is None:
        sys.exit("final document not found in the staff order detail")
    api.expect(200, "POST", f"/api/staff/documents/{final_doc_id}/verify/",
               json_body={"is_verified": True, "note": "Restore drill final verified"})
    api.expect(200, "POST", f"/api/admin/orders/{order_id}/complete/", json_body={"admin_confirmation": False})

    api.login("customer_a", password)
    detail = api.expect(200, "GET", f"/api/customer/orders/{order_id}/")
    status, downloaded = api.call("GET", f"/api/documents/{final_doc_id}/download/", raw=True)
    if status != 200 or sha(downloaded) != sha(final):
        sys.exit(f"final download HTTP {status}, sha256 {sha(downloaded)} != uploaded {sha(final)}")
    print(f"ok customer downloaded final result {final_doc_id}: {len(downloaded)} bytes, sha256 matches upload")

    state = {
        "order_id": order_id, "order_number": order_number, "order_status": detail.get("status"),
        "documents": [
            {"id": upload_doc_id, "role": "customer_upload", "downloader": "customer_a", "sha256": sha(upload), "bytes": len(upload)},
            {"id": final_doc_id, "role": "final_result", "downloader": "customer_a", "sha256": sha(final), "bytes": len(final)},
        ],
    }
    with open(args.state, "w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=1)
    print(json.dumps(state, indent=1))


def check(args, password):
    with open(args.state, encoding="utf-8") as handle:
        state = json.load(handle)
    api = Api(args.base)
    failures = 0
    for document in state["documents"]:
        api.login(document["downloader"], password)
        status, body = api.call("GET", f"/api/documents/{document['id']}/download/", raw=True)
        same = status == 200 and sha(body) == document["sha256"]
        failures += not same
        print(f"{'ok' if same else 'FAIL'} {document['role']} document {document['id']}: HTTP {status}, "
              f"{len(body)} bytes, sha256 {sha(body)} {'==' if same else '!='} recorded {document['sha256']}")
    api.login("customer_a", password)
    detail = api.expect(200, "GET", f"/api/customer/orders/{state['order_id']}/")
    print(f"order {detail.get('order_number')} status {detail.get('status')} (recorded {state['order_status']})")
    failures += detail.get("status") != state["order_status"]
    sys.exit(1 if failures else 0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["journey", "check"])
    parser.add_argument("--base", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--service", type=int)
    parser.add_argument("--provider-profile", type=int)
    args = parser.parse_args()
    password = os.environ.get("KHALSNI_QA_PASSWORD", "")
    if len(password) < 12:
        sys.exit("Set KHALSNI_QA_PASSWORD (the value used for seed_client_audit_qa).")
    if args.mode == "journey":
        if args.provider_profile is None:
            sys.exit("--provider-profile is required for journey")
        journey(args, password)
    else:
        check(args, password)


if __name__ == "__main__":
    main()
