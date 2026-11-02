# Consolidation parcel gate (B10-1/2/3, approved 2026-11-02): the server side of the
# parity check. Run with the real-catalogue copy:
#   manage.py shell -c "exec(open('<this file>', encoding='utf-8').read())"
# Writes the migrated schema and the server verdicts for the shared cases.
import json
import pathlib

from services.models import Service
from services.schema_rules import validate_answers

HERE = pathlib.Path(r"D:/ghassan/docs/audit/evidence/khalsni-total-closure-2026-11-01")
schema = Service.objects.get(slug="request-property-consolidation").required_information_schema
gate = next(f["key"] for f in schema if f.get("type") == "select" and any(o.get("value") == "yes" for o in f.get("options") or []))
base = {f["key"]: "قيمة" for f in schema if f.get("required") and f.get("type") in ("text", "textarea", "tel") and not f.get("visible_when")}
cases = {
    "no_without_rows": {gate: "no"},
    "no_with_partial_row": {gate: "no", "plots": [{"parcel_number": "1"}]},
    "yes_without_rows": {gate: "yes"},
    "yes_one_complete_row": {gate: "yes", "plots": [{"parcel_number": "1", "basin_number": "2"}]},
    "yes_two_complete_rows": {gate: "yes", "plots": [{"parcel_number": "1", "basin_number": "2"}, {"parcel_number": "3", "basin_number": "4"}]},
}
verdicts = {}
for name, answers in cases.items():
    cleaned, errors = validate_answers(schema, {**base, **answers})
    verdicts[name] = {"plots_error": errors.get("plots"), "plots_sent": "plots" in cleaned, "other_errors": sorted(k for k in errors if k != "plots")}
(HERE / "evidence" / "consolidation_schema.json").write_text(json.dumps({"gate": gate, "base": base, "schema": schema}, ensure_ascii=False, indent=1), encoding="utf-8")
(HERE / "evidence" / "CONSOLIDATION-PARITY-backend.json").write_text(json.dumps(verdicts, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(verdicts, ensure_ascii=False))
