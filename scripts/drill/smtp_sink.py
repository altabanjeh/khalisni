"""Minimal SMTP sink for drills: accepts every message and stores it, sends nothing.

    python smtp_sink.py [--host 0.0.0.0] [--port 1025] [--out /mail]

Each accepted message is written unchanged to <out>/<n>.eml (n = 1, 2, ...)
together with <n>.envelope.json (client, MAIL FROM, RCPT TO). Supports the
commands Django's SMTP backend uses without TLS or authentication: EHLO/HELO,
MAIL, RCPT, DATA, RSET, NOOP, QUIT. Only for local drills; never expose it.
Standard library only (smtpd was removed in Python 3.12).
"""

import argparse
import itertools
import json
import os
import socketserver
import threading

COUNTER = itertools.count(1)
LOCK = threading.Lock()


class Handler(socketserver.StreamRequestHandler):
    def reply(self, line):
        self.wfile.write((line + "\r\n").encode("ascii"))
        self.wfile.flush()

    def handle(self):
        mail_from, rcpt_to = None, []
        self.reply("220 khalsni-smtp-sink ready")
        while True:
            raw = self.rfile.readline(65536)
            if not raw:
                return
            line = raw.decode("utf-8", "replace").rstrip("\r\n")
            verb = line[:4].upper()
            if verb == "EHLO":
                self.wfile.write(b"250-khalsni-smtp-sink\r\n250-8BITMIME\r\n250-SMTPUTF8\r\n250 SIZE 52428800\r\n")
                self.wfile.flush()
            elif verb == "HELO":
                self.reply("250 khalsni-smtp-sink")
            elif verb == "MAIL":
                mail_from, rcpt_to = line[5:].strip(), []
                self.reply("250 OK")
            elif verb == "RCPT":
                rcpt_to.append(line[5:].strip())
                self.reply("250 OK")
            elif verb == "DATA":
                self.reply("354 End data with <CR><LF>.<CR><LF>")
                chunks = []
                while True:
                    data = self.rfile.readline(1 << 20)
                    if not data or data in (b".\r\n", b".\n"):
                        break
                    chunks.append(data[1:] if data.startswith(b"..") else data)
                with LOCK:
                    number = next(COUNTER)
                base = os.path.join(self.server.out_dir, str(number))
                with open(base + ".eml", "wb") as handle:
                    handle.write(b"".join(chunks))
                with open(base + ".envelope.json", "w", encoding="utf-8") as handle:
                    json.dump({"client": self.client_address[0], "mail_from": mail_from, "rcpt_to": rcpt_to}, handle)
                print(f"stored message {number} from {mail_from} to {rcpt_to}", flush=True)
                self.reply("250 OK stored")
            elif verb == "RSET":
                mail_from, rcpt_to = None, []
                self.reply("250 OK")
            elif verb == "NOOP":
                self.reply("250 OK")
            elif verb == "QUIT":
                self.reply("221 Bye")
                return
            else:
                self.reply("502 Command not implemented")


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=1025)
    parser.add_argument("--out", default="/mail")
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    with Server((args.host, args.port), Handler) as server:
        server.out_dir = args.out
        print(f"smtp sink listening on {args.host}:{args.port}, writing to {args.out}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
