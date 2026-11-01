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

Repeater fields (CN-BIZ-01 partners, CN-BIZ-04 plots): ``type: "repeater"``
with ``item_fields`` (ordinary fields, no conditions, no nesting), optional
``min_items`` and ``max_items`` (at most ``REPEATER_MAX_ITEMS``). The answer
is a list of rows, each an object keyed by the item field keys. A required
repeater needs at least ``max(min_items, 1)`` rows; an optional one may be
left empty, but rows that are sent must reach ``min_items``. Rows are never
dropped or reordered, so a per-row error index matches the row on screen.
"""

import json
import re
from datetime import date

ITEM_FIELD_TYPES = ("text", "textarea", "number", "email", "tel", "date", "select", "checkbox")
FIELD_TYPES = ITEM_FIELD_TYPES + ("repeater",)
REPEATER_MAX_ITEMS = 20
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
REPEATER_NEEDS_ITEMS = "A repeater field needs at least one item field."
REPEATER_ITEM_SHAPE = "Every repeater item field needs a key, a label and a supported type."
REPEATER_DUPLICATE_ITEM = "Repeater item field keys must be unique."
REPEATER_ITEM_CONDITION = "Repeater item fields cannot have conditions or nested repeaters."
REPEATER_LIMITS = "Repeater limits must be whole numbers with 0 <= min_items <= max_items <= 20."
CONDITION_ON_REPEATER = "A condition cannot refer to a repeater field."
SEMANTIC_MESSAGES = {
    NEEDS_OPTION, DUPLICATE_OPTION, OPTION_SHAPE, DEFAULT_NOT_OPTION, CONDITION_ANSWER, UNKNOWN_TYPE,
    REPEATER_NEEDS_ITEMS, REPEATER_ITEM_SHAPE, REPEATER_DUPLICATE_ITEM, REPEATER_ITEM_CONDITION, REPEATER_LIMITS,
    CONDITION_ON_REPEATER,
}

# Answer messages (English; core/errors.py holds the Arabic).
REQUIRED = "This field is required."
NOT_IN_FORM = "This field is not part of the service form."
ROWS_NOT_LIST = "Enter the entries as a list."
ROW_NOT_OBJECT = "Each entry must be an object."
TOO_FEW_ROWS = "Add at least {n} entries."
TOO_MANY_ROWS = "Add no more than {n} entries."


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


def item_fields(field):
    """The item fields of a repeater (dicts only)."""
    raw = field.get("item_fields") if isinstance(field, dict) else None
    return [item for item in raw if isinstance(item, dict)] if isinstance(raw, list) else []


def _whole_number(value):
    return isinstance(value, int) and not isinstance(value, bool)


def repeater_limits(field):
    """``(min_items, max_items, required_min)`` for a repeater.

    ``max_items`` defaults to, and is capped at, ``REPEATER_MAX_ITEMS``;
    ``required_min`` is the number of rows a required repeater needs.
    """
    min_items = field.get("min_items")
    min_items = min_items if _whole_number(min_items) and min_items > 0 else 0
    max_items = field.get("max_items")
    max_items = max_items if _whole_number(max_items) and max_items > 0 else REPEATER_MAX_ITEMS
    max_items = min(max_items, REPEATER_MAX_ITEMS)
    min_items = min(min_items, max_items)
    required_min = max(min_items, 1) if field.get("required") else 0
    return min_items, max_items, required_min


def _repeater_problems(field):
    """Definition problems of one repeater field."""
    problems = []
    min_items, max_items = field.get("min_items"), field.get("max_items")
    if (
        (min_items is not None and (not _whole_number(min_items) or not 0 <= min_items <= REPEATER_MAX_ITEMS))
        or (max_items is not None and (not _whole_number(max_items) or not 1 <= max_items <= REPEATER_MAX_ITEMS))
        or (_whole_number(min_items) and _whole_number(max_items) and min_items > max_items)
    ):
        problems.append(REPEATER_LIMITS)
    raw = field.get("item_fields")
    if not isinstance(raw, list) or not raw:
        problems.append(REPEATER_NEEDS_ITEMS)
        return problems
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            problems.append(REPEATER_ITEM_SHAPE)
            continue
        key = next((item.get(name) for name in KEY_NAMES if item.get(name)), None)
        raw_type = item.get("type", item.get("field_type", item.get("input_type")))
        if (
            not isinstance(key, (str, int))
            or not str(key).strip()
            or not any(str(item.get(name) or "").strip() for name in ("label_ar", "label_en", "label"))
            or (raw_type is not None and not isinstance(raw_type, str))
        ):
            problems.append(REPEATER_ITEM_SHAPE)
            continue
        kind = field_type(item)
        if item.get("visible_when") is not None or kind == "repeater" or "item_fields" in item:
            problems.append(REPEATER_ITEM_CONDITION)
            continue
        if kind not in ITEM_FIELD_TYPES:
            problems.append(REPEATER_ITEM_SHAPE)
            continue
        key = str(key).strip().lower()
        if key in seen:
            problems.append(REPEATER_DUPLICATE_ITEM)
        seen.add(key)
        options = item.get("options", item.get("choices", item.get("values")))
        if options is not None and not isinstance(options, list):
            problems.append(OPTION_SHAPE)
            continue
        if kind == "select":
            item_options = field_options(item)
            if item.get("required") and not item_options:
                problems.append(NEEDS_OPTION)
            if any(not option["value"] or not (option["label_ar"] or option["label_en"]) for option in item_options):
                problems.append(OPTION_SHAPE)
            values = [option["value"] for option in item_options if option["value"]]
            if len(values) != len(set(values)):
                problems.append(DUPLICATE_OPTION)
    # One message of each kind is enough for the editor.
    return list(dict.fromkeys(problems))


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
        if kind == "repeater":
            problems.extend((index, key, message) for message in _repeater_problems(field))
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
            if controller_kind == "repeater":
                problems.append((index, key, CONDITION_ON_REPEATER))
            elif controller_kind == "select":
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
    """Problems that make the published form impossible to submit.

    A required select with no options (top level or inside a repeater) cannot
    be answered, and a repeater without item fields cannot be filled in.
    """
    return [problem for problem in schema_problems(schema) if problem[2] in (NEEDS_OPTION, REPEATER_NEEDS_ITEMS)]


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


def _clean_scalar(field, value):
    """Validate one non-repeater answer. Returns ``(present, cleaned, error)``.

    ``present`` is False for an unanswered field (nothing is stored).
    """
    kind = field_type(field)
    if kind == "checkbox":
        if value not in (None, "") and not isinstance(value, bool) and str(value).strip().lower() not in TRUE_VALUES | FALSE_VALUES:
            return False, None, "Enter yes or no."
        ticked = _as_bool(value)
        if field.get("required") and not ticked:
            return False, None, REQUIRED
        return True, ticked, None
    if isinstance(value, (list, dict)):
        return False, None, "Enter a single value." if value else (REQUIRED if field.get("required") else None)
    text = "" if value is None else str(value).strip()
    if not text:
        return False, None, REQUIRED if field.get("required") else None
    if kind == "select":
        if text not in {option["value"] for option in field_options(field)}:
            return False, None, "Choose one of the listed options."
    elif kind == "number":
        try:
            float(text.replace(",", "."))
        except ValueError:
            return False, None, "Enter a number."
    elif kind == "email":
        if not EMAIL.match(text):
            return False, None, "Enter a valid email address."
    elif kind == "date":
        try:
            if not ISO_DATE.match(text):
                raise ValueError
            date.fromisoformat(text)
        except ValueError:
            return False, None, "Enter a date as YYYY-MM-DD."
    return True, text, None


def _clean_repeater(field, value):
    """Validate a repeater answer. Returns ``(present, rows, error)``.

    ``error`` is a message (the whole field) or ``{"<row>": {"<item key>": message}}``.
    """
    min_items, max_items, required_min = repeater_limits(field)
    if value in (None, ""):
        rows = []
    elif isinstance(value, list):
        rows = value
    else:
        return False, None, ROWS_NOT_LIST
    if not rows:
        if required_min:
            return False, None, REQUIRED if required_min == 1 else TOO_FEW_ROWS.format(n=required_min)
        return False, None, None
    if len(rows) > max_items:
        return False, None, TOO_MANY_ROWS.format(n=max_items)
    if len(rows) < max(min_items, required_min):
        return False, None, TOO_FEW_ROWS.format(n=max(min_items, required_min))
    items = [(field_key(item, index), item) for index, item in enumerate(item_fields(field))]
    known = {key for key, _item in items}
    cleaned_rows, row_errors = [], {}
    for number, row in enumerate(rows):
        if not isinstance(row, dict):
            row_errors[str(number)] = {"__all__": ROW_NOT_OBJECT}
            continue
        errors = {str(key): NOT_IN_FORM for key in row if str(key) not in known}
        cleaned = {}
        for key, item in items:
            present, item_value, error = _clean_scalar(item, row.get(key))
            if error:
                errors[key] = error
            elif present:
                cleaned[key] = item_value
        if errors:
            row_errors[str(number)] = errors
        cleaned_rows.append(cleaned)
    if row_errors:
        return False, None, row_errors
    return True, cleaned_rows, None


def validate_answers(schema, answers):
    """Check answers against the form. Returns ``(cleaned, errors)``.

    - Fields hidden by ``visible_when`` are dropped: never required, never stored.
    - Required visible fields must be answered (a required checkbox must be ticked).
    - Selects accept only listed option values; numbers, emails and dates are checked.
    - Repeaters take a list of rows; each row is checked against the item fields,
      and the row count against ``min_items`` / ``max_items``.
    - Keys that are not fields of this form are refused.
    """
    schema = schema if isinstance(schema, list) else []
    answers = dict(answers or {})
    keys = {field_key(field, index): field for index, field in enumerate(schema) if isinstance(field, dict)}
    errors = {}
    for key in answers:
        if key not in keys:
            errors[key] = NOT_IN_FORM
    cleaned = {}
    for index, field in enumerate(schema):
        if not isinstance(field, dict):
            continue
        key = field_key(field, index)
        if not _is_visible(field, schema, answers):
            continue
        if field_type(field) == "repeater":
            present, value, error = _clean_repeater(field, answers.get(key))
        else:
            present, value, error = _clean_scalar(field, answers.get(key))
        if error:
            errors[key] = error
        elif present:
            cleaned[key] = value
    return cleaned, errors


def _display_value(field, value, language="ar"):
    kind = field_type(field)
    if kind == "checkbox":
        return ("نعم" if language == "ar" else "Yes") if value else ""
    if kind == "select":
        option = next((item for item in field_options(field) if item["value"] == value), None)
        if option:
            first, second = ("label_ar", "label_en") if language == "ar" else ("label_en", "label_ar")
            return option[first] or option[second] or value
    return "" if value is None else str(value)


def answers_notes_section(schema, cleaned):
    """The staff-readable block appended to the order notes (Arabic labels, option labels).

    A repeater is its label, then one numbered line per row:
    ``  1. <item label>: <value>؛ <item label>: <value>``.
    """
    lines = []
    for index, field in enumerate(schema if isinstance(schema, list) else []):
        if not isinstance(field, dict):
            continue
        key = field_key(field, index)
        if key not in cleaned:
            continue
        label = field_label(field, "ar") or key
        value = cleaned[key]
        if field_type(field) == "repeater":
            items = [(field_key(item, number), item) for number, item in enumerate(item_fields(field))]
            rows = []
            for number, row in enumerate(value if isinstance(value, list) else [], start=1):
                parts = []
                for item_key, item in items:
                    if item_key not in row:
                        continue
                    shown = _display_value(item, row[item_key])
                    if shown:
                        parts.append(f"{field_label(item, 'ar') or item_key}: {shown}")
                rows.append(f"  {number}. " + ("؛ ".join(parts) if parts else "—"))
            if rows:
                lines.append(f"{label}:")
                lines.extend(rows)
            continue
        if field_type(field) == "checkbox":
            if value:
                lines.append(f"{label}: نعم")
            continue
        lines.append(f"{label}: {_display_value(field, value)}")
    if not lines:
        return ""
    return "\n".join(["البيانات الإضافية المطلوبة:", *lines])
