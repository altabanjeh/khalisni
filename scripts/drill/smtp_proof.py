"""SMTP pipeline proof against the drill SMTP sink (scripts/drill/docker-compose.drill.yml).

    COMPOSE="docker compose -p <drill> --env-file <env> -f docker-compose.yml -f scripts/drill/docker-compose.drill.yml" \
    python scripts/drill/smtp_proof.py --base http://127.0.0.1:18080 --email <customer email> \
        --expect-from no-reply@khalisni.com --expect-link-host khalisni.com --out <evidence dir>

For Arabic and English in turn: request a password reset through the API,
read the reset message from the sink, use the link's token to set a new
password (which sends the "password changed" message), then try the same token
again (must be refused). Every message is checked for language, subject,
sender and link host, and saved with the token redacted. Exit 1 on any failure.
Drill only: it changes the password of the account it is given.
"""

import argparse
import email
import email.policy
import hashlib
import json
import os
import re
import secrets
import shlex
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

SUBJECTS = {
    ("password_reset", "ar"): "إعادة تعيين كلمة المرور في خلّصني",
    ("password_reset", "en"): "Khalsni password reset",
    ("password_changed", "ar"): "تم تغيير كلمة المرور في خلّصني",
    ("password_changed", "en"): "Khalsni password changed",
}
ARABIC = re.compile(r"[؀-ۿ]")
LINK = re.compile(r"(https?://[^\s<>\"]+/reset-password/([A-Za-z0-9_\-%]+))")


def compose(*args, capture=True):
    command = shlex.split(os.environ["COMPOSE"]) + list(args)
    return subprocess.run(command, check=True, capture_output=capture, text=True)


def api(base, method, path, body, language):
    request = urllib.request.Request(
        base.rstrip("/") + path, data=json.dumps(body).encode(), method=method,
        headers={"Content-Type": "application/json", "Accept-Language": language, "X-Forwarded-Proto": "https"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read() or b"null")
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"null")


def fetch_messages(workdir):
    target = os.path.join(workdir, "mail")
    if os.path.isdir(target):
        for name in os.listdir(target):
            os.remove(os.path.join(target, name))
    compose("cp", "smtp-sink:/mail/.", target)
    messages = {}
    for name in os.listdir(target):
        if name.endswith(".eml"):
            with open(os.path.join(target, name), "rb") as handle:
                messages[int(name[:-4])] = handle.read()
    return messages


def wait_for(workdir, count, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        messages = fetch_messages(workdir)
        if len(messages) >= count:
            return messages
        time.sleep(2)
    sys.exit(f"timed out waiting for message {count} in the sink")


def redact(text, token):
    marker = f"<REDACTED-TOKEN len={len(token)} sha256={hashlib.sha256(token.encode()).hexdigest()[:12]}>"
    return text.replace(token, marker)


def check_message(raw, *, kind, language, expect_from, expect_link_host, expect_to):
    message = email.message_from_bytes(raw, policy=email.policy.default)
    body = message.get_body(preferencelist=("plain",)).get_content()
    subject = str(message["Subject"])
    sender = str(message["From"])
    results = {
        "kind": kind, "language": language, "subject": subject, "from": sender, "to": str(message["To"]),
        "checks": {},
    }
    checks = results["checks"]
    checks["subject_matches"] = subject == SUBJECTS[(kind, language)]
    has_arabic = bool(ARABIC.search(body))
    checks["body_language_matches"] = has_arabic if language == "ar" else not has_arabic
    checks["from_is_configured_sender"] = expect_from in sender and ".local" not in sender
    checks["to_is_account"] = expect_to in results["to"]
    token = None
    if kind == "password_reset":
        match = LINK.search(body)
        checks["has_reset_link"] = bool(match)
        if match:
            link, token = match.group(1), match.group(2)
            checks["link_host_is_public_domain"] = urlparse(link).hostname == expect_link_host
            checks["link_is_https"] = urlparse(link).scheme == "https"
            results["link_redacted"] = redact(link, token)
    else:
        checks["no_reset_link"] = not LINK.search(body)
    results["ok"] = all(checks.values())
    return results, token


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--expect-from", required=True)
    parser.add_argument("--expect-link-host", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--between-languages", default="", help="shell command run between AR and EN (e.g. flush throttle counters)")
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    workdir = tempfile.mkdtemp(prefix="khalsni-smtp-")
    seen = len(fetch_messages(workdir))
    report, failures = [], 0

    for language in ("ar", "en"):
        if language == "en" and args.between_languages:
            subprocess.run(args.between_languages, shell=True, check=True)
        status, body = api(args.base, "POST", "/api/auth/forgot-password/", {"email": args.email}, language)
        print(f"[{language}] forgot-password -> HTTP {status}")
        failures += status != 200
        messages = wait_for(workdir, seen + 1)
        seen += 1
        reset_result, token = check_message(messages[seen], kind="password_reset", language=language,
                                            expect_from=args.expect_from, expect_link_host=args.expect_link_host,
                                            expect_to=args.email)
        if not token:
            sys.exit(f"[{language}] no reset token in the message")
        new_password = "Drill-" + secrets.token_urlsafe(18)
        payload = {"new_password": new_password, "confirm_new_password": new_password}
        status, body = api(args.base, "POST", f"/api/auth/reset-password/{token}/", payload, language)
        reset_result["first_use_http"] = status
        status_again, body_again = api(args.base, "POST", f"/api/auth/reset-password/{token}/", payload, language)
        reset_result["reuse_http"] = status_again
        reset_result["reuse_detail"] = (body_again or {}).get("detail")
        reset_result["checks"]["link_works_once"] = status == 200
        reset_result["checks"]["link_rejected_on_reuse"] = status_again == 400
        reset_result["ok"] = all(reset_result["checks"].values())
        status_login, _ = api(args.base, "POST", "/api/auth/login/", {"email": args.email, "password": new_password}, language)
        reset_result["checks"]["new_password_signs_in"] = status_login == 200
        reset_result["ok"] = all(reset_result["checks"].values())

        messages = wait_for(workdir, seen + 1)
        seen += 1
        changed_result, _ = check_message(messages[seen], kind="password_changed", language=language,
                                          expect_from=args.expect_from, expect_link_host=args.expect_link_host,
                                          expect_to=args.email)
        for result, number, tok in ((reset_result, seen - 1, token), (changed_result, seen, None)):
            # Decoded rendering (bodies may be base64/quoted-printable on the
            # wire, which would hide the token from a plain text redaction).
            parsed = email.message_from_bytes(messages[number], policy=email.policy.default)
            headers = "".join(f"{key}: {value}\n" for key, value in parsed.items())
            part = parsed.get_body(preferencelist=("plain",))
            raw = (f"{headers}X-Drill-Note: decoded copy of message {number} from the SMTP sink; "
                   f"wire encoding {part['Content-Transfer-Encoding']}\n\n{part.get_content()}")
            if tok:
                raw = redact(raw, tok)
            name = f"smtp_{language}_{result['kind']}.eml.txt"
            with open(os.path.join(args.out, name), "w", encoding="utf-8", newline="\n") as handle:
                handle.write(raw)
            result["saved_as"] = name
            report.append(result)
            failures += not result["ok"]
            print(f"[{language}] {result['kind']}: {'OK' if result['ok'] else 'FAIL'} {result['checks']}")

    with open(os.path.join(args.out, "smtp_proof_report.json"), "w", encoding="utf-8") as handle:
        json.dump({"messages": report, "failures": failures}, handle, ensure_ascii=False, indent=1)
    print(f"{'SMTP PROOF OK' if not failures else 'SMTP PROOF FAILED'}: {len(report)} message(s), {failures} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
