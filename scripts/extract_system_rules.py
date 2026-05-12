#!/usr/bin/env python
import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCAN_ROOTS = [ROOT / "backend", ROOT / "frontend" / "src"]
SKIP_PARTS = {"node_modules", "__pycache__", "dist", "media", ".venv"}

PATH_RE = re.compile(r'path\(\s*["\']([^"\']+)["\']')
ROUTER_RE = re.compile(r'router\.register\(\s*["\']([^"\']+)["\']')
PERMISSION_RE = re.compile(r"permission_classes\s*=\s*\[([^\]]*)\]")
ROLE_CHECK_RE = re.compile(r'role[^"\n]*["\'](admin|employee|support|provider|customer)["\']', re.IGNORECASE)
TEXTCHOICE_RE = re.compile(r"class\s+(\w+)\(models\.TextChoices\):")
CHOICE_VALUE_RE = re.compile(r"^\s+([A-Z0-9_]+)\s*=\s*['\"]([^'\"]+)['\"]")


def should_scan(path: Path) -> bool:
    return not any(part in SKIP_PARTS for part in path.parts)


def iter_source_files():
    for scan_root in DEFAULT_SCAN_ROOTS:
        if not scan_root.exists():
            continue
        for path in scan_root.rglob("*"):
            if not path.is_file() or not should_scan(path):
                continue
            if path.suffix not in {".py", ".jsx", ".js"}:
                continue
            yield path


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def scan():
    result = {
        "routes": [],
        "router_registrations": [],
        "permission_blocks": [],
        "text_choices": [],
        "role_checks": [],
    }

    for path in iter_source_files():
        text = read_text(path)
        relative_path = str(path.relative_to(ROOT)).replace("\\", "/")
        lines = text.splitlines()

        for lineno, line in enumerate(lines, start=1):
            path_match = PATH_RE.search(line)
            if path_match:
                result["routes"].append(
                    {
                        "file": relative_path,
                        "line": lineno,
                        "path": path_match.group(1),
                        "raw": line.strip(),
                    }
                )

            router_match = ROUTER_RE.search(line)
            if router_match:
                result["router_registrations"].append(
                    {
                        "file": relative_path,
                        "line": lineno,
                        "prefix": router_match.group(1),
                        "raw": line.strip(),
                    }
                )

            permission_match = PERMISSION_RE.search(line)
            if permission_match:
                permissions = [item.strip() for item in permission_match.group(1).split(",") if item.strip()]
                result["permission_blocks"].append(
                    {
                        "file": relative_path,
                        "line": lineno,
                        "permissions": permissions,
                        "raw": line.strip(),
                    }
                )

            if ROLE_CHECK_RE.search(line):
                result["role_checks"].append(
                    {
                        "file": relative_path,
                        "line": lineno,
                        "raw": line.strip(),
                    }
                )

        for match in TEXTCHOICE_RE.finditer(text):
            class_name = match.group(1)
            start_line = text[: match.start()].count("\n") + 1
            choices = []
            for lineno in range(start_line, min(start_line + 50, len(lines) + 1)):
                line = lines[lineno - 1]
                choice_match = CHOICE_VALUE_RE.match(line)
                if not choice_match:
                    if line.startswith("class ") and lineno != start_line:
                        break
                    continue
                choices.append(
                    {
                        "name": choice_match.group(1),
                        "value": choice_match.group(2),
                        "line": lineno,
                    }
                )
            result["text_choices"].append(
                {
                    "file": relative_path,
                    "class": class_name,
                    "line": start_line,
                    "choices": choices,
                }
            )

    return result


def main():
    parser = argparse.ArgumentParser(description="Scan the repository for route, permission, choice, and role-check patterns.")
    parser.add_argument("--output", help="Optional JSON output file path.")
    args = parser.parse_args()

    result = scan()
    payload = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(payload, encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
