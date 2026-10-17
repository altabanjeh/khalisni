"""One definition of what a service request form may contain, and of what a
customer's answers to it must satisfy.

The form a customer fills in is rendered from ``Service.required_information_schema``
(web: ``frontend/src/utils/serviceForms.js``; mobile: ``mobile/src/utils/serviceForms.ts``).
The schema itself carries the rules (``required``, ``options``, ``visible_when``);
this module reads them the same way the clients do, so the admin editor, the
catalogue importer, the catalogue validator and order creation all apply the
same checks:

- ``schema_problems``: configuration that must not be saved or published
  (e.g. a required select with no options, which no customer can answer).
- ``order_blockers``: the subset that makes the form impossible to submit.
- ``validate_answers``: server-side validation of the answers to a published
  form, including conditional ``visible_when`` fields (audit B10-3).
"""

import json
import re
from datetime import date

FIELD_TYPES = ("text", "textarea", "number", "email", "tel", "date", "select", "checkbox")
KEY_NAMES = ("name", "key", "field", "id")
TRUE_VALUES = {"true", "1", "yes", "on"}
FALSE_VALUES = {"false", "0", "no", "off", ""}
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Messages (English; core/errors.py holds the Arabic).
NEEDS_OPTION = "A select field needs at least one option."
DUPLICATE_OPTION = "Option values must be unique."
OPTION_SHAPE = "Every option needs a value and a label."
DEFAULT_NOT_OPTION = "The default value is not one of the field options."
CONDITION_ANSWER = "The condition refers to an answer that the controlling field does not offer."
UNKNOWN_TYPE = "Unknown field type."
SEMANTIC_MESSAGES = {NEEDS_OPTION, DUPLICATE_OPTION, OPTION_SHAPE, DEFAULT_NOT_OPTION, CONDITION_ANSWER, UNKNOWN_TYPE}


def field_key(field, index):
    """The answer key of a field: the same resolution as the web and mobile clients."""
    for name in KEY_NAMES:
        value = field.get(name)
        if value is not None:
            return str(value)
    return f"field_{index + 1}"


def field_type(field):
    raw = field.get("type", field.get("field_type", field.get("input_type")))
    return str(raw or "text").strip().lower()


def field_label(field, language="ar"):
    first, second = ("label_ar", "label_en") if language == "ar" else ("label_en", "label_ar")
    return str(field.get(first) or field.get("label") or field.get(second) or "").strip()


def field_options(field):
    """Options as ``[{"value", "label_ar", "label_en"}]``; strings become value = label."""
    raw = field.get("options", field.get("choices", field.get("values")))
    if not isinstance(raw, list):
        return []
    options = []
    for option in raw:
        if isinstance(option, dict):
            value = next((option.get(name) for name in ("value", "id", "key", "slug") if option.get(name) not in (None, "")), None)
            options.append({
                "value": None if value is None else str(value),
                "label_ar": str(option.get("label_ar") or option.get("label") or ""),
                "label_en": str(option.get("label_en") or ""),
            })
        elif option not in (None, ""):
            options.append({"value": str(option), "label_ar": str(option), "label_en": ""})
    return options


def _structural_problems(schema):
    """The shape checks the admin editor has always applied (messages unchanged)."""
    if schema in (None, ""):
        return []
    if not isinstance(schema, list):
        return [(None, None, "The form schema must be a list of fields.")]
    problems = []
    seen = set()
    for index, field in enumerate(schema, start=1):
        if not isinstance(field, dict):
            problems.append((index, None, f"Field {index} must be an object."))
            continue
        key = next((field.get(name) for name in KEY_NAMES if field.get(name)), None)
        if not isinstance(key, (str, int)) or not str(key).strip():
            problems.append((index, None, f"Field {index} needs a key."))
            continue
        key = str(key).strip().lower()
        if key in seen:
            problems.append((index, key, f"Field key '{key}' is used more than once."))
        seen.add(key)
        raw_type = field.get("type", field.get("field_type", field.get("input_type")))
        if raw_type is not None and not isinstance(raw_type, str):
            problems.append((index, key, f"Field {index} has an invalid type."))
        options = field.get("options", field.get("choices", field.get("values")))
        if options is not None and not isinstance(options, list):
            problems.append((index, key, f"Field {index} options must be a list."))
        if not any(str(field.get(name) or "").strip() for name in ("label_ar", "label_en", "label")):
            problems.append((index, key, f"Field {index} needs a label."))
    for index, field in enumerate(schema, start=1):
        if not isinstance(field, dict) or field.get("visible_when") is None:
            continue
        condition = field["visible_when"]
        key = next((field.get(name) for name in KEY_NAMES if field.get(name)), None)
        key = str(key).strip().lower() if key is not None else None
        if (
            not isinstance(condition, dict)
            or not isinstance(condition.get("field"), str)
            or not isinstance(condition.get("equals"), str)
            or set(condition) - {"field", "equals"}
        ):
            problems.append((index, key, f'Field {index} visible_when must be {{"field": <key>, "equals": <value>}}.'))
            continue
        target = condition["field"].strip().lower()
        if target == key or target not in seen:
            problems.append((index, key, f"Field {index} visible_when refers to an unknown field."))
    return problems


def schema_problems(schema):
    """Every reason this form must not be saved or published.

    Returns ``[(field_number_or_None, key_or_None, message)]``.
    """
    problems = _structural_problems(schema)
    if problems or not schema:
        return problems
    by_key = {field_key(field, index).strip().lower(): field for index, field in enumerate(schema)}
    for index, field in enumerate(schema, start=1):
        key = field_key(field, index - 1)
        kind = field_type(field)
        if kind not in FIELD_TYPES:
            problems.append((index, key, UNKNOWN_TYPE))
            continue
        options = field_options(field)
        if kind == "select":
            if field.get("required") and not options:
                problems.append((index, key, NEEDS_OPTION))
            if any(not option["value"] or not (option["label_ar"] or option["label_en"]) for option in options):
                problems.append((index, key, OPTION_SHAPE))
            values = [option["value"] for option in options if option["value"]]
            if len(values) != len(set(values)):
                problems.append((index, key, DUPLICATE_OPTION))
            default = field.get("default")
            if default not in (None, "") and str(default) not in values:
                problems.append((index, key, DEFAULT_NOT_OPTION))
        condition = field.get("visible_when")
        if condition:
            controller = by_key.get(condition["field"].strip().lower())
            controller_kind = field_type(controller)
            if controller_kind == "select":
                offered = {option["value"] for option in field_options(controller)}
                if condition["equals"] not in offered:
                    problems.append((index, key, CONDITION_ANSWER))
            elif controller_kind == "checkbox" and condition["equals"].strip().lower() not in TRUE_VALUES | FALSE_VALUES:
                problems.append((index, key, CONDITION_ANSWER))
    return problems


def optional_select_warnings(schema):
    """Optional selects with no options: not blocking, but useless to customers."""
    if not isinstance(schema, list):
        return []
    return [
        (index, field_key(field, index - 1), "Optional select field has no options.")
        for index, field in enumerate(schema, start=1)
        if isinstance(field, dict) and field_type(field) == "select" and not field.get("required") and not field_options(field)
    ]


def order_blockers(schema):
    """Problems that make the published form impossible to submit."""
    return [problem for problem in schema_problems(schema) if problem[2] == NEEDS_OPTION]


def _is_visible(field, schema, answers, depth=0):
    condition = field.get("visible_when")
    if not condition or depth > len(schema):
        return True
    target = condition["field"].strip().lower()
    for index, candidate in enumerate(schema):
        if field_key(candidate, index).strip().lower() == target:
            if not _is_visible(candidate, schema, answers, depth + 1):
                return False
            answer = answers.get(field_key(candidate, index))
            if field_type(candidate) == "checkbox":
                answer = "true" if _as_bool(answer) else "false"
                expected = "true" if condition["equals"].strip().lower() in TRUE_VALUES else "false"
                return answer == expected
            return str("" if answer is None else answer) == condition["equals"]
    return False


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in TRUE_VALUES


def parse_answers(raw):
    """``service_answers`` arrives as a JSON string (multipart) or an object (JSON)."""
    if raw in (None, ""):
        return None
    if isinstance(raw, (list, tuple)):
        raw = raw[0] if raw else None
        if raw in (None, ""):
            return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raise ValueError("The service answers must be an object.")
    if not isinstance(raw, dict):
        raise ValueError("The service answers must be an object.")
    return {str(key): value for key, value in raw.items()}


def has_required_fields(schema):
    return isinstance(schema, list) and any(isinstance(field, dict) and field.get("required") for field in schema)


def validate_answers(schema, answers):
    """Check answers against the form. Returns ``(cleaned, errors)``.

    - Fields hidden by ``visible_when`` are dropped: never required, never stored.
    - Required visible fields must be answered (a required checkbox must be ticked).
    - Selects accept only listed option values; numbers, emails and dates are checked.
    - Keys that are not fields of this form are refused.
    """
    schema = schema if isinstance(schema, list) else []
    answers = dict(answers or {})
    keys = {field_key(field, index): field for index, field in enumerate(schema) if isinstance(field, dict)}
    errors = {}
    for key in answers:
        if key not in keys:
            errors[key] = "This field is not part of the service form."
    cleaned = {}
    for index, field in enumerate(schema):
        if not isinstance(field, dict):
            continue
        key = field_key(field, index)
        if not _is_visible(field, schema, answers):
            continue
        kind = field_type(field)
        value = answers.get(key)
        if kind == "checkbox":
            if value not in (None, "") and not isinstance(value, bool) and str(value).strip().lower() not in TRUE_VALUES | FALSE_VALUES:
                errors[key] = "Enter yes or no."
                continue
            ticked = _as_bool(value)
            if field.get("required") and not ticked:
                errors[key] = "This field is required."
                continue
            cleaned[key] = ticked
            continue
        text = "" if value is None else str(value).strip()
        if not text:
            if field.get("required"):
                errors[key] = "This field is required."
            continue
        if kind == "select":
            if text not in {option["value"] for option in field_options(field)}:
                errors[key] = "Choose one of the listed options."
                continue
        elif kind == "number":
            try:
                float(text.replace(",", "."))
            except ValueError:
                errors[key] = "Enter a number."
                continue
        elif kind == "email":
            if not EMAIL.match(text):
                errors[key] = "Enter a valid email address."
                continue
        elif kind == "date":
            try:
                if not ISO_DATE.match(text):
                    raise ValueError
                date.fromisoformat(text)
            except ValueError:
                errors[key] = "Enter a date as YYYY-MM-DD."
                continue
        cleaned[key] = text
    return cleaned, errors


def answers_notes_section(schema, cleaned):
    """The staff-readable block appended to the order notes (Arabic labels, option labels)."""
    lines = []
    for index, field in enumerate(schema if isinstance(schema, list) else []):
        if not isinstance(field, dict):
            continue
        key = field_key(field, index)
        if key not in cleaned:
            continue
        label = field_label(field, "ar") or key
        value = cleaned[key]
        if field_type(field) == "checkbox":
            if value:
                lines.append(f"{label}: نعم")
            continue
        if field_type(field) == "select":
            option = next((item for item in field_options(field) if item["value"] == value), None)
            if option:
                value = option["label_ar"] or option["label_en"] or value
        lines.append(f"{label}: {value}")
    if not lines:
        return ""
    return "\n".join(["البيانات الإضافية المطلوبة:", *lines])
