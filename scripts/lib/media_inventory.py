"""Inventory of the media volume, run inside the backend container.

    docker compose exec -T backend python - [root] < scripts/lib/media_inventory.py

Prints one line per regular file below <root> (default /app/media), sorted:

    <sha256>\t<size in bytes>\t<path relative to the parent of root>

e.g. ``3f2a...\t1234\tmedia/secure_orders/12/file.pdf``. The paths are exactly
what scripts/backup.sh archives, so the archive and the inventory describe the
same set of files. Exits 3 on a file name that cannot be listed safely.
Standard library only.
"""

import hashlib
import os
import sys

root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "/app/media")
base = os.path.dirname(root)
if not os.path.isdir(root):
    sys.exit(f"media_inventory: {root} is not a directory")

entries = []
for directory, _dirs, files in os.walk(root):
    for name in files:
        full = os.path.join(directory, name)
        if os.path.islink(full) or not os.path.isfile(full):
            continue
        relative = os.path.relpath(full, base).replace(os.sep, "/")
        if any(char in relative for char in "\t\r\n"):
            print(f"media_inventory: unsupported file name {relative!r}", file=sys.stderr)
            sys.exit(3)
        digest = hashlib.sha256()
        with open(full, "rb") as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b""):
                digest.update(chunk)
        entries.append((relative, digest.hexdigest(), os.path.getsize(full)))

out = sys.stdout
for relative, digest, size in sorted(entries):
    out.write(f"{digest}\t{size}\t{relative}\n")
