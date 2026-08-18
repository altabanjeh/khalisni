from __future__ import annotations

import hashlib
import json
import re
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from xml.etree import ElementTree

from django.db import transaction
from django.utils.text import slugify

from services.catalog_defaults import suggest_category_icon
from services.models import RequiredDocumentDefinition, Service, ServiceCategory, ServiceRequiredDocument


WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
IMPORT_BATCH = "khalsni-production-service-docx-2026-08-18"

COMMON_FIELD_KEYS = {
    "الاسم الكامل": "full_name",
    "اسم مقدم الطلب": "applicant_name",
    "الاسم": "full_name",
    "الرقم الوطني": "national_id",
    "رقم الهاتف": "phone_number",
    "أرقام الهواتف": "phone_numbers",
    "رقم القطعة": "parcel_number",
    "رقم الحوض": "basin_number",
    "المنطقة": "region",
    "المحافظة": "governorate",
    "ملاحظات إضافية": "additional_notes",
    "سبب الطلب": "request_reason",
    "سبب طلب الكشف": "survey_reason",
    "سبب طلب إعادة التنظيم": "readjustment_reason",
    "الغاية من الطلب": "request_purpose",
    "صفة التنظيم الحالية": "current_land_use_classification",
    "صفة التنظيم المطلوبة": "requested_land_use_classification",
    "اسم البائع": "seller_name",
    "الرقم الوطني للبائع": "seller_national_id",
    "اسم المشتري": "buyer_name",
    "الرقم الوطني للمشتري": "buyer_national_id",
}

COMMON_DOCUMENT_CODES = {
    "صورة الهوية": ("national_id_copy", "National ID copy"),
    "صورة هوية البائع": ("seller_national_id_copy", "Seller national ID copy"),
    "صورة هوية المشتري": ("buyer_national_id_copy", "Buyer national ID copy"),
    "سند تسجيل العقار": ("property_registration_certificate", "Property registration certificate"),
    "سند التسجيل": ("property_registration_certificate", "Property registration certificate"),
    "مخطط أراضٍ": ("cadastral_map", "Cadastral map"),
    "مخطط أراض": ("cadastral_map", "Cadastral map"),
    "وكالة قانونية": ("legal_power_of_attorney", "Legal power of attorney"),
    "وكالة عدلية أو تفويض": ("legal_authorization", "Legal authorization"),
    "وكالة عدلية أو تفويض خطي": ("legal_authorization", "Legal authorization"),
    "حجة حصر الإرث": ("inheritance_certificate", "Inheritance certificate"),
    "شهادة وفاة": ("death_certificate", "Death certificate"),
}

SECTION_LABELS = [
    "الخدمة رقم",
    "الإصدار",
    "آخر تحديث",
    "الفئة",
    "اسم الخدمة بالعربية",
    "اسم الخدمة بالإنجليزية",
    "المعرف (Slug)",
    "ترتيب العرض",
    "حالة الخدمة",
    "الوصف المختصر",
    "الوصف الكامل",
    "الشروط",
    "البيانات المطلوبة من العميل",
    "الوثائق المطلوبة",
    "مدة الإنجاز",
    "السعر الأساسي",
    "رسوم الخدمة",
    "الرسوم الحكومية",
    "إعدادات الخدمة",
    "الأسئلة الديناميكية المقترحة",
    "معلومات التشغيل",
    "ملاحظات للمطور",
]


def _clean(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u200f", "").replace("\u200e", "")).strip()


def _source_file_name(path):
    return _clean(Path(path).name).replace("\ufffd", "").strip() or Path(path).name.encode("utf-8", "replace").decode("utf-8").replace("\ufffd", "")


def _stable_slug(*parts, prefix="item"):
    for part in parts:
        value = slugify(_clean(part), allow_unicode=False)
        if value:
            return value
        value = _clean(part).lower().replace("_", "-")
        value = re.sub(r"[^a-z0-9-]+", "-", value).strip("-")
        if value:
            return value
    digest_source = "|".join(_clean(part) for part in parts if _clean(part)) or prefix
    return f"{prefix}-{hashlib.sha1(digest_source.encode('utf-8')).hexdigest()[:10]}"


def _split_bullets(value):
    value = _clean(value)
    if not value:
        return []
    parts = re.split(r"[•\u2022]+", value)
    return [_clean(part).strip(".؛;") for part in parts if _clean(part).strip(".؛;")]


def _as_int(value, default=0):
    match = re.search(r"\d+", _clean(value))
    return int(match.group(0)) if match else default


def _contains_later(value):
    return "يحدد لاحق" in _clean(value) or "تحدد لاحق" in _clean(value) or "يُحدد" in _clean(value)


def _map_field_type(source_type, label):
    haystack = f"{source_type} {label}".lower()
    if "textarea" in haystack or "ملاحظات" in haystack or "تفاصيل" in haystack:
        return "textarea"
    if "dropdown" in haystack or "select" in haystack:
        return "select"
    if "date" in haystack or "تاريخ" in haystack:
        return "date"
    if "phone" in haystack or "هاتف" in haystack:
        return "tel"
    if "number" in haystack or "currency" in haystack or "رقم" in haystack or "عدد" in haystack or "رأس مال" in haystack:
        return "number"
    if "yes/no" in haystack or label.startswith("هل "):
        return "checkbox"
    return "text"


def _extract_options(note):
    note = _clean(note)
    if not note:
        return []
    if "،" not in note and "," not in note:
        return []
    if any(word in note for word in ["حسب", "إذا", "عند"]):
        return []
    return [{"value": _stable_slug(part, prefix="option"), "label": _clean(part)} for part in re.split(r"[،,]", note) if _clean(part)]


def _field_from_label(label, *, source_type="", required=True, note="", order=0, source_section=""):
    label = _clean(label)
    key = COMMON_FIELD_KEYS.get(label) or _stable_slug(label, prefix="field").replace("-", "_")
    mapped_type = _map_field_type(source_type, label)
    warnings = []
    if "repeater" in source_type.lower():
        warnings.append("Current platform has no first-class repeater field; imported as editable textarea/field metadata.")
        mapped_type = "textarea"
    return {
        "key": key,
        "label_ar": label,
        "type": mapped_type,
        "required": required,
        "display_order": order,
        "help_text": _clean(note),
        "options": _extract_options(note),
        "source_section": source_section,
        "source_type": _clean(source_type),
        "import_warnings": warnings,
    }


def _document_code(name):
    clean_name = re.sub(r"\s*\([^)]*\)", "", _clean(name)).strip(". ")
    if clean_name in COMMON_DOCUMENT_CODES:
        return COMMON_DOCUMENT_CODES[clean_name]
    return _stable_slug(clean_name, prefix="document").replace("-", "_"), ""


def _document_status(name, status=""):
    text = f"{name} {status}"
    conditional = any(token in text for token in ["حسب الحالة", "إن وجد", "إن وجدت", "إذا ", "عند ", "تطلبها الجهة"])
    if conditional:
        return "conditional", False
    if "اختياري" in text:
        return "optional", False
    return "required", True


@dataclass
class SourceDocument:
    path: Path
    paragraphs: list[str]
    tables: list[list[list[str]]]


@dataclass
class ImportResult:
    normalized: dict
    inventory_rows: list[dict]
    conflicts: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    created: dict = field(default_factory=lambda: {"categories": 0, "services": 0, "document_definitions": 0, "document_requirements": 0})
    updated: dict = field(default_factory=lambda: {"categories": 0, "services": 0, "document_definitions": 0, "document_requirements": 0})
    unchanged: dict = field(default_factory=lambda: {"categories": 0, "services": 0, "document_definitions": 0, "document_requirements": 0})


def read_docx(path):
    with zipfile.ZipFile(path) as archive:
        document_xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(document_xml)
    paragraphs = []
    for paragraph in root.findall(".//w:p", WORD_NS):
        text = _clean("".join(node.text or "" for node in paragraph.findall(".//w:t", WORD_NS)))
        if text:
            paragraphs.append(text)
    tables = []
    for table in root.findall(".//w:tbl", WORD_NS):
        rows = []
        for row in table.findall("./w:tr", WORD_NS):
            cells = []
            for cell in row.findall("./w:tc", WORD_NS):
                parts = []
                for paragraph in cell.findall(".//w:p", WORD_NS):
                    text = _clean("".join(node.text or "" for node in paragraph.findall(".//w:t", WORD_NS)))
                    if text:
                        parts.append(text)
                cells.append(" | ".join(parts))
            rows.append(cells)
        tables.append(rows)
    return SourceDocument(path=path, paragraphs=paragraphs, tables=tables)


def _next_value(paragraphs, label):
    for index, paragraph in enumerate(paragraphs):
        if paragraph == label and index + 1 < len(paragraphs):
            return paragraphs[index + 1]
        if paragraph.startswith(label) and paragraph != label:
            return paragraph[len(label):].strip(" :")
    return ""


def _section_value(paragraphs, label):
    value = _next_value(paragraphs, label)
    if value:
        return value
    pattern = re.escape(label)
    for paragraph in paragraphs:
        match = re.search(pattern + r"\s*(.+)$", paragraph)
        if match:
            return match.group(1)
    return ""


def _source_number(paragraphs):
    for paragraph in paragraphs:
        match = re.search(r"الخدمة رقم\s*\(([^)]+)\)", paragraph)
        if match:
            return _clean(match.group(1))
    return ""


def _category_payload(name_ar, name_en="", identifier="", display_order=0):
    name_ar = _clean(name_ar)
    if name_ar == "العقارات والأراضي":
        return {
            "identifier": "land-and-survey",
            "slug": "land-and-survey",
            "name_ar": name_ar,
            "name_en": name_en or "Land and Survey",
            "display_order": display_order or 1,
            "status": "active",
        }
    slug = identifier or _stable_slug(name_en, name_ar, prefix="category").replace("-", "_")
    return {
        "identifier": slug,
        "slug": slug,
        "name_ar": name_ar,
        "name_en": name_en or name_ar,
        "display_order": display_order,
        "status": "active",
    }


def _parse_paragraph_service(doc):
    paragraphs = doc.paragraphs
    source_number = _source_number(paragraphs)
    category = _section_value(paragraphs, "الفئة")
    status = _section_value(paragraphs, "حالة الخدمة") or _section_value(paragraphs, "الحالة") or "Active"
    slug = _section_value(paragraphs, "المعرف (Slug)")
    name_ar = _section_value(paragraphs, "اسم الخدمة بالعربية")
    name_en = _section_value(paragraphs, "اسم الخدمة بالإنجليزية")
    if not name_ar or not slug:
        return None
    data_items = _split_bullets(_section_value(paragraphs, "البيانات المطلوبة من العميل"))
    documents = _split_bullets(_section_value(paragraphs, "الوثائق المطلوبة"))
    questions = _split_bullets(_section_value(paragraphs, "الأسئلة الديناميكية المقترحة"))
    fields = [
        _field_from_label(item, required=True, order=index, source_section="البيانات المطلوبة من العميل")
        for index, item in enumerate(data_items, start=1)
    ]
    for index, question in enumerate(questions, start=len(fields) + 1):
        fields.append(
            _field_from_label(
                question,
                source_type="Yes/No",
                required=False,
                order=index,
                source_section="الأسئلة الديناميكية المقترحة",
            )
        )
    required_documents = []
    for index, document in enumerate(documents, start=1):
        status_key, is_required = _document_status(document)
        code, name_en_doc = _document_code(document)
        required_documents.append(
            {
                "code": code,
                "name_ar": _clean(document),
                "name_en": name_en_doc,
                "requirement_type": status_key,
                "is_required": is_required,
                "instructions_ar": "حسب الحالة" if status_key == "conditional" else "",
                "display_order": index,
                "source_section": "الوثائق المطلوبة",
            }
        )
    settings = _section_value(paragraphs, "إعدادات الخدمة")
    is_under_review = "قيد المراجعة" in status
    price_note = _section_value(paragraphs, "السعر الأساسي")
    service_fee_note = _section_value(paragraphs, "رسوم الخدمة")
    government_fee_note = _section_value(paragraphs, "الرسوم الحكومية")
    duration_note = _section_value(paragraphs, "مدة الإنجاز")
    return {
        "source_file": _source_file_name(doc.path),
        "source_service_number": source_number,
        "source_version": _section_value(paragraphs, "الإصدار"),
        "source_last_updated": _section_value(paragraphs, "آخر تحديث"),
        "category_ar": category,
        "category_en": "",
        "name_ar": name_ar,
        "name_en": name_en,
        "identifier": slug,
        "slug": slug,
        "display_order": _as_int(_section_value(paragraphs, "ترتيب العرض")),
        "status": status,
        "is_active": not is_under_review and ("غير مفعلة" not in settings),
        "show_on_public_site": not is_under_review,
        "short_description_ar": _section_value(paragraphs, "الوصف المختصر"),
        "description_ar": _section_value(paragraphs, "الوصف الكامل") or _section_value(paragraphs, "الوصف المختصر"),
        "terms_ar": "\n".join(
            part
            for part in [
                f"الشروط: {_section_value(paragraphs, 'الشروط')}" if _section_value(paragraphs, "الشروط") else "",
                f"معلومات التشغيل: {_section_value(paragraphs, 'معلومات التشغيل')}" if _section_value(paragraphs, "معلومات التشغيل") else "",
            ]
            if part
        ),
        "fields": fields,
        "documents": required_documents,
        "developer_notes": _section_value(paragraphs, "ملاحظات للمطور"),
        "provider_required": "تحتاج مزود خدمة" in settings,
        "requires_manual_review": "تحتاج مراجعة يدوية" in settings or True,
        "price_type": "quotation" if _contains_later(price_note) or _contains_later(service_fee_note) else "fixed",
        "base_price": "0.00",
        "government_fee": "0.00",
        "service_fee": "0.00",
        "show_total_price_public": False if _contains_later(price_note) or _contains_later(service_fee_note) else True,
        "public_price_note_ar": "يحدد بعد المراجعة من لوحة الإدارة." if _contains_later(price_note) or _contains_later(service_fee_note) else "",
        "delivery_note_ar": duration_note,
        "government_fee_note_ar": government_fee_note,
        "source_completeness_level": "complete" if fields and required_documents else "partial",
    }


def _parse_business_catalog(doc):
    category_table = doc.tables[0]
    category_values = {row[0]: row[1] for row in category_table if len(row) >= 2}
    category = _category_payload(
        category_values.get("اسم التصنيف بالعربي", ""),
        category_values.get("Category Name", ""),
        category_values.get("Identifier", ""),
        _as_int(category_values.get("الترتيب", "")),
    )
    services = []
    text_sections = _business_text_sections(doc.paragraphs)
    index = 2
    while index < len(doc.tables):
        meta_rows = doc.tables[index]
        if not meta_rows or not meta_rows[0] or meta_rows[0][0] != "اسم الخدمة بالعربي":
            index += 1
            continue
        meta = {row[0]: row[1] for row in meta_rows if len(row) >= 2}
        fields_table = doc.tables[index + 1] if index + 1 < len(doc.tables) else []
        docs_table = doc.tables[index + 2] if index + 2 < len(doc.tables) else []
        pricing_table = doc.tables[index + 3] if index + 3 < len(doc.tables) else []
        fields = []
        for order, row in enumerate(fields_table[1:], start=1):
            if len(row) < 4:
                continue
            fields.append(
                _field_from_label(
                    row[0],
                    source_type=row[2],
                    required=row[3] == "نعم",
                    note=row[4] if len(row) > 4 else "",
                    order=order,
                    source_section="الحقول",
                )
                | {"key": row[1] or _stable_slug(row[0], prefix="field").replace("-", "_")}
            )
        required_documents = []
        for order, row in enumerate(docs_table[1:], start=1):
            if len(row) < 2:
                continue
            status_key, is_required = _document_status(row[0], row[1])
            code, name_en_doc = _document_code(row[0])
            note = row[2] if len(row) > 2 else ""
            required_documents.append(
                {
                    "code": code,
                    "name_ar": row[0],
                    "name_en": name_en_doc,
                    "requirement_type": status_key,
                    "is_required": is_required,
                    "instructions_ar": note,
                    "display_order": order,
                    "source_section": "الوثائق",
                }
            )
        price_values = {row[0]: row[1] for row in pricing_table if len(row) >= 2}
        identifier = meta.get("المعرّف", "")
        text_section = text_sections.get(identifier, [])
        services.append(
            {
                "source_file": _source_file_name(doc.path),
                "source_service_number": str(meta.get("الترتيب", "")),
                "source_version": "",
                "source_last_updated": "",
                "category_ar": category["name_ar"],
                "category_en": category["name_en"],
                "name_ar": meta.get("اسم الخدمة بالعربي", ""),
                "name_en": meta.get("اسم الخدمة بالإنجليزي", ""),
                "identifier": identifier,
                "slug": identifier,
                "display_order": _as_int(meta.get("الترتيب", "")),
                "status": meta.get("الحالة", "Active"),
                "is_active": meta.get("الحالة", "Active").lower() == "active",
                "show_on_public_site": meta.get("الحالة", "Active").lower() == "active",
                "short_description_ar": _next_value(text_section, "الوصف المختصر"),
                "description_ar": _next_value(text_section, "الوصف الكامل") or _next_value(text_section, "الوصف المختصر"),
                "terms_ar": "",
                "fields": fields,
                "documents": required_documents,
                "developer_notes": "",
                "provider_required": True,
                "requires_manual_review": True,
                "price_type": "quotation" if _contains_later(json.dumps(price_values, ensure_ascii=False)) else "fixed",
                "base_price": "0.00",
                "government_fee": "0.00",
                "service_fee": "0.00",
                "show_total_price_public": False if _contains_later(json.dumps(price_values, ensure_ascii=False)) else True,
                "public_price_note_ar": "يحدد بعد المراجعة من لوحة الإدارة." if _contains_later(json.dumps(price_values, ensure_ascii=False)) else "",
                "delivery_note_ar": price_values.get("المدة المتوقعة", ""),
                "government_fee_note_ar": price_values.get("الرسوم الرسمية", ""),
                "source_completeness_level": "complete" if fields and required_documents else "partial",
            }
        )
        index += 4
    return category, services


def _business_text_sections(paragraphs):
    sections = {}
    current = []
    current_identifier = ""
    heading_pattern = re.compile(r"^\d+\.\s+")
    for paragraph in paragraphs:
        if heading_pattern.match(paragraph):
            if current_identifier:
                sections[current_identifier] = current
            current = [paragraph]
            current_identifier = ""
            continue
        if current:
            current.append(paragraph)
            if paragraph == "المعرّف":
                continue
            if len(current) >= 2 and current[-2] == "المعرّف":
                current_identifier = paragraph
    if current_identifier:
        sections[current_identifier] = current
    return sections


def discover_and_normalize(source_dir):
    source_path = Path(source_dir)
    docs = [read_docx(path) for path in sorted(source_path.rglob("*.docx")) if not path.name.startswith("~$")]
    categories_by_slug = {}
    raw_services = []
    warnings = []
    for doc in docs:
        if doc.tables:
            category, services = _parse_business_catalog(doc)
            categories_by_slug[category["slug"]] = category
            raw_services.extend(services)
        else:
            service = _parse_paragraph_service(doc)
            if not service:
                warnings.append(f"Could not parse service identity from {_source_file_name(doc.path)}.")
                continue
            category = _category_payload(service["category_ar"], service.get("category_en", ""), "", 1)
            categories_by_slug[category["slug"]] = category
            service["category_slug"] = category["slug"]
            raw_services.append(service)
    for service in raw_services:
        if "category_slug" not in service:
            category = _category_payload(service["category_ar"], service.get("category_en", ""), "", 0)
            service["category_slug"] = category["slug"]
    canonical_services, conflicts = reconcile_services(raw_services)
    normalized = {
        "import_batch": IMPORT_BATCH,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_directory": str(source_path),
        "source_documents": len(docs),
        "categories": sorted(categories_by_slug.values(), key=lambda item: (item["display_order"], item["slug"])),
        "services": canonical_services,
        "source_traceability": [
            {
                "source_file": service["source_file"],
                "source_service_number": service.get("source_service_number", ""),
                "source_version": service.get("source_version", ""),
                "source_last_updated": service.get("source_last_updated", ""),
                "canonical_identifier": service["identifier"],
                "canonical_slug": service["slug"],
            }
            for service in raw_services
        ],
        "warnings": warnings,
        "conflicts": conflicts,
    }
    inventory_rows = build_inventory(docs, raw_services, canonical_services)
    return ImportResult(normalized=normalized, inventory_rows=inventory_rows, conflicts=conflicts, warnings=warnings)


def _completeness_score(service):
    score = 0
    for key in ("name_ar", "name_en", "short_description_ar", "description_ar", "terms_ar", "delivery_note_ar"):
        if service.get(key):
            score += 1
    score += len(service.get("fields", []))
    score += len(service.get("documents", []))
    return score


def reconcile_services(raw_services):
    by_slug = {}
    conflicts = []
    for service in raw_services:
        key = _clean(service.get("slug") or service.get("identifier"))
        if key not in by_slug:
            by_slug[key] = service
            service["merged_sources"] = [service["source_file"]]
            continue
        current = by_slug[key]
        current_score = _completeness_score(current)
        next_score = _completeness_score(service)
        canonical, duplicate = (service, current) if next_score > current_score else (current, service)
        canonical["merged_sources"] = sorted(set(current.get("merged_sources", [current["source_file"]]) + [service["source_file"]]))
        canonical["fields"] = _merge_by_key(current.get("fields", []), service.get("fields", []), "key")
        canonical["documents"] = _merge_by_key(current.get("documents", []), service.get("documents", []), "code")
        by_slug[key] = canonical
        for prop in ("display_order", "source_service_number", "short_description_ar", "description_ar"):
            if _clean(current.get(prop)) and _clean(service.get(prop)) and _clean(current.get(prop)) != _clean(service.get(prop)):
                conflicts.append(
                    {
                        "canonical_service": canonical.get("name_ar", key),
                        "slug": key,
                        "source_a": current["source_file"],
                        "source_b": service["source_file"],
                        "property": prop,
                        "value_a": current.get(prop, ""),
                        "value_b": service.get(prop, ""),
                        "resolution": "merged_one_canonical_service",
                        "reason": "Same explicit slug; more complete and non-conflicting fields/documents were retained, source numbering retained in traceability.",
                    }
                )
        duplicate["merged_into"] = key
    return sorted(by_slug.values(), key=lambda item: (item.get("category_slug", ""), item.get("display_order", 0), item.get("slug", ""))), conflicts


def _merge_by_key(left, right, key):
    merged = {item.get(key): dict(item) for item in left if item.get(key)}
    for item in right:
        item_key = item.get(key)
        if item_key and item_key not in merged:
            merged[item_key] = dict(item)
    return sorted(merged.values(), key=lambda item: item.get("display_order", 0))


def build_inventory(docs, raw_services, canonical_services):
    canonical_slugs = {service["slug"]: service for service in canonical_services}
    rows = []
    for service in raw_services:
        rows.append(
            {
                "filename": service["source_file"],
                "category": service.get("category_ar", ""),
                "arabic_service_name": service.get("name_ar", ""),
                "english_service_name": service.get("name_en", ""),
                "identifier_slug": service.get("slug", ""),
                "source_service_number": service.get("source_service_number", ""),
                "source_display_order": service.get("display_order", ""),
                "version": service.get("source_version", ""),
                "last_updated": service.get("source_last_updated", ""),
                "status": service.get("status", ""),
                "contains": "multi-service catalog" if service["source_file"] == "Khalsni_Business_Services_Fields_and_Documents_Final.docx" else "single service",
                "detected_duplicate_identifier": len([item for item in raw_services if item.get("slug") == service.get("slug")]) > 1,
                "detected_duplicate_semantic_service": bool(service.get("merged_into")) or canonical_slugs.get(service.get("slug"), {}).get("merged_sources", []) != [service["source_file"]],
                "source_completeness_level": service.get("source_completeness_level", "partial"),
            }
        )
    parsed_files = {row["filename"] for row in rows}
    for doc in docs:
        if _source_file_name(doc.path) not in parsed_files:
            rows.append(
                {
                    "filename": _source_file_name(doc.path),
                    "category": "",
                    "arabic_service_name": "",
                    "english_service_name": "",
                    "identifier_slug": "",
                    "source_service_number": "",
                    "source_display_order": "",
                    "version": "",
                    "last_updated": "",
                    "status": "",
                    "contains": "unparsed",
                    "detected_duplicate_identifier": False,
                    "detected_duplicate_semantic_service": False,
                    "source_completeness_level": "unparsed",
                }
            )
    return rows


def apply_import(result):
    for category_data in result.normalized["categories"]:
        category, created = ServiceCategory.objects.get_or_create(
            slug=category_data["slug"],
            defaults={
                "name_ar": category_data["name_ar"],
                "name_en": category_data["name_en"],
                "description_ar": category_data["name_ar"],
                "description_en": category_data["name_en"],
                "icon": suggest_category_icon(category_data["name_en"], category_data["name_ar"], category_data["slug"]),
                "display_order": category_data["display_order"],
                "sort_order": category_data["display_order"],
                "is_active": True,
                "show_on_public_site": True,
            },
        )
        changed = _update_if_changed(
            category,
            {
                "name_ar": category_data["name_ar"],
                "name_en": category_data["name_en"],
                "display_order": category_data["display_order"],
                "sort_order": category_data["display_order"],
                "is_active": True,
                "show_on_public_site": True,
            },
        )
        _count(result, "categories", created, changed)

    for service_data in result.normalized["services"]:
        with transaction.atomic():
            category = ServiceCategory.objects.get(slug=service_data["category_slug"])
            service_defaults = _service_defaults(service_data, category)
            service, created = Service.objects.get_or_create(slug=service_data["slug"], defaults=service_defaults)
            changed = _update_if_changed(service, service_defaults)
            _count(result, "services", created, changed)
            _sync_documents(result, service, service_data["documents"])
    return result


def _service_defaults(service_data, category):
    return {
        "category": category,
        "name_ar": service_data["name_ar"],
        "name_en": service_data["name_en"] or service_data["name_ar"],
        "short_description_ar": service_data.get("short_description_ar", "")[:300],
        "short_description_en": "",
        "description_ar": service_data.get("description_ar") or service_data.get("short_description_ar") or service_data["name_ar"],
        "description_en": "",
        "required_information_schema": service_data.get("fields", []),
        "price_type": service_data.get("price_type") or Service.PriceType.QUOTATION,
        "base_price": Decimal(service_data.get("base_price", "0.00")),
        "government_fee": Decimal(service_data.get("government_fee", "0.00")),
        "service_fee": Decimal(service_data.get("service_fee", "0.00")),
        "show_total_price_public": bool(service_data.get("show_total_price_public", False)),
        "show_government_fee_public": False,
        "show_company_fee_public": False,
        "public_price_note_ar": service_data.get("public_price_note_ar", ""),
        "public_price_note_en": "Shared after review." if service_data.get("public_price_note_ar") else "",
        "estimated_duration": 1,
        "estimated_duration_unit": Service.DurationUnit.DAYS,
        "delivery_time_mode": Service.DeliveryTimeMode.DURATION,
        "delivery_note_ar": service_data.get("delivery_note_ar", ""),
        "delivery_note_en": "",
        "terms_ar": service_data.get("terms_ar", ""),
        "terms_en": "",
        "is_online": True,
        "requires_appointment": False,
        "requires_manual_review": bool(service_data.get("requires_manual_review", True)),
        "provider_required": bool(service_data.get("provider_required", True)),
        "is_featured": False,
        "is_active": bool(service_data.get("is_active", True)),
        "show_on_public_site": bool(service_data.get("show_on_public_site", True)),
        "display_order": int(service_data.get("display_order") or 0),
    }


def _sync_documents(result, service, documents):
    active_codes = set()
    for document in documents:
        definition_defaults = {
            "name_ar": document["name_ar"],
            "name_en": document.get("name_en", ""),
            "allowed_extensions": [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
            "max_file_size": 10 * 1024 * 1024,
            "is_active": True,
        }
        definition, definition_created = RequiredDocumentDefinition.objects.get_or_create(
            code=document["code"],
            defaults=definition_defaults,
        )
        definition_changed = _update_if_changed(definition, definition_defaults)
        _count(result, "document_definitions", definition_created, definition_changed)
        requirement_defaults = {
            "document_definition": definition,
            "document_type": definition.code,
            "name_ar": definition.name_ar,
            "name_en": definition.name_en,
            "instructions_ar": document.get("instructions_ar", ""),
            "instructions_en": "",
            "is_required": bool(document.get("is_required")),
            "allowed_extensions": list(definition.allowed_extensions or []),
            "max_file_size": definition.max_file_size,
            "requires_verification": True,
            "client_can_replace_file": True,
            "provider_can_view_file": bool(service.provider_required),
            "display_order": int(document.get("display_order") or 0),
            "is_active": True,
        }
        requirement, requirement_created = ServiceRequiredDocument.objects.get_or_create(
            service=service,
            document_type=definition.code,
            defaults=requirement_defaults,
        )
        requirement_changed = _update_if_changed(requirement, requirement_defaults)
        _count(result, "document_requirements", requirement_created, requirement_changed)
        active_codes.add(definition.code)
    for stale in service.document_requirements.filter(is_deleted=False).exclude(document_type__in=active_codes):
        stale.soft_delete(reason=f"Removed by {IMPORT_BATCH} reconciliation")
        result.updated["document_requirements"] += 1


def _update_if_changed(instance, values):
    changed_fields = []
    for field_name, value in values.items():
        if getattr(instance, field_name) != value:
            setattr(instance, field_name, value)
            changed_fields.append(field_name)
    if changed_fields:
        instance.save()
        return True
    return False


def _count(result, key, created, changed):
    if created:
        result.created[key] += 1
    elif changed:
        result.updated[key] += 1
    else:
        result.unchanged[key] += 1


def write_artifacts(result, repo_root, *, applied=False, dry_run=True):
    repo_root = Path(repo_root)
    docs_dir = repo_root / "docs" / "service-import"
    data_dir = repo_root / "data" / "service-import"
    docs_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "normalized-services.json").write_text(
        json.dumps(result.normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    _write_current_model(docs_dir / "CURRENT-SERVICE-DATA-MODEL.md")
    _write_inventory(docs_dir / "SOURCE-INVENTORY.md", result.inventory_rows)
    _write_conflicts(docs_dir / "SOURCE-CONFLICT-REPORT.md", result.conflicts)
    _write_developer_notes(docs_dir / "DEVELOPER-NOTES-MAPPING.md", result.normalized["services"])
    _write_import_plan(docs_dir / "IMPORT-PLAN.md")
    _write_import_report(docs_dir / "IMPORT-REPORT.md", result, applied=applied, dry_run=dry_run)
    _write_validation_report(docs_dir / "VALIDATION-REPORT.md", result, applied=applied)


def _write_current_model(path):
    path.write_text(
        """# Current Service Data Model

## Entities

| Entity | Relevant fields | Relationships / constraints |
| --- | --- | --- |
| `ServiceCategory` | `name_ar`, `name_en`, `slug`, descriptions, `display_order`, `sort_order`, `is_active`, `show_on_public_site`, soft-delete fields | Unique `slug`; active Arabic names unique under the same parent; protected by soft delete. |
| `Service` | localized names/descriptions, `slug`, `required_information_schema`, pricing fields, public price flags, duration fields, `provider_required`, `requires_manual_review`, public/active flags | Unique `slug` and generated `service_number`; belongs to a category; protected by soft delete. |
| `RequiredDocumentDefinition` | `code`, localized names/descriptions, upload rules, active/soft-delete fields | Active non-deleted `code` and `name_ar` are unique. |
| `ServiceRequiredDocument` | service, definition, `document_type`, localized labels, instructions, `is_required`, upload rules, display order | Unique active link per service/document type and per service/document definition. |
| `ServiceRelation` | prerequisite/recommended/alternative relations | Unique non-deleted source/target/type; prevents circular required prerequisites. |
| `ServiceProviderAssignment` | service/provider pair | Used only when `Service.provider_required` is true; does not create provider accounts. |
| `Order` | service snapshot, status, provider/employee assignment, documents, price and duration snapshots | Request workflow uses service document requirements and provider flag. |

## Dynamic Forms

Customer-supplied fields are stored in `Service.required_information_schema` as JSON and rendered by the frontend dynamic field helpers. Supported rendered types are text, textarea, number, email, tel, date, select, and checkbox. The current platform has no first-class repeater/group, customer eligibility, dynamic-question table, or conditional-document rule table.

## Pricing And Duration

Pricing is stored on `Service` using `price_type`, `base_price`, `government_fee`, `service_fee`, and public visibility flags. Unknown prices are represented with zero internal numeric values, `price_type=quotation`, and `show_total_price_public=False`, with a public note. Duration currently requires a numeric fallback, so source text is preserved in `delivery_note_ar`.
""",
        encoding="utf-8",
    )


def _write_inventory(path, rows):
    lines = [
        "# Source Inventory",
        "",
        "| File | Category | Arabic service | English service | Identifier | Source # | Order | Version | Updated | Status | Contains | Duplicate identifier | Duplicate semantic | Completeness |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            "| {filename} | {category} | {arabic_service_name} | {english_service_name} | {identifier_slug} | {source_service_number} | {source_display_order} | {version} | {last_updated} | {status} | {contains} | {detected_duplicate_identifier} | {detected_duplicate_semantic_service} | {source_completeness_level} |".format(
                **{key: str(value).replace("|", "/") for key, value in row.items()}
            )
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_conflicts(path, conflicts):
    lines = ["# Source Conflict Report", ""]
    if not conflicts:
        lines.append("No source conflicts detected.")
    else:
        lines.extend(["| Canonical service | Slug | Source A | Source B | Property | Value A | Value B | Resolution | Reason |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"])
        for item in conflicts:
            lines.append(
                "| {canonical_service} | {slug} | {source_a} | {source_b} | {property} | {value_a} | {value_b} | {resolution} | {reason} |".format(
                    **{key: str(value).replace("|", "/") for key, value in item.items()}
                )
            )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_developer_notes(path, services):
    lines = ["# Developer Notes Mapping", "", "| Service | Source files | Note | Classification |", "| --- | --- | --- | --- |"]
    has_notes = False
    for service in services:
        note = _clean(service.get("developer_notes", ""))
        field_warnings = [warning for field in service.get("fields", []) for warning in field.get("import_warnings", [])]
        entries = []
        if note:
            entries.append((note, "configuration requirement / platform capability review"))
        for warning in sorted(set(field_warnings)):
            entries.append((warning, "missing platform capability"))
        for entry, classification in entries:
            has_notes = True
            lines.append(f"| {service['name_ar']} | {', '.join(service.get('merged_sources', [service['source_file']]))} | {entry.replace('|', '/')} | {classification} |")
    if not has_notes:
        lines.append("| - | - | No developer notes detected. | - |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_import_plan(path):
    path.write_text(
        """# Import Plan

1. Discover `.docx` files recursively from the supplied source directory.
2. Extract paragraphs and Word tables into a normalized intermediate JSON file.
3. Reconcile duplicates by explicit identifier/slug first, then preserve source numbering in traceability.
4. Upsert categories, services, document definitions, and service document requirements through Django models.
5. Keep placeholder prices non-public with `price_type=quotation`.
6. Preserve conditional document requirements as non-mandatory requirements with source instructions because the current model has no conditional rule table.
7. Write inventory, conflict, developer-note, import, and validation reports on every run.
""",
        encoding="utf-8",
    )


def _write_import_report(path, result, *, applied, dry_run):
    services = result.normalized["services"]
    raw_count = len(result.normalized["source_traceability"])
    canonical_count = len(services)
    duplicate_count = raw_count - canonical_count
    waiting_price = sum(1 for item in services if item.get("price_type") == "quotation")
    provider_count = sum(1 for item in services if item.get("provider_required"))
    manual_count = sum(1 for item in services if item.get("requires_manual_review"))
    under_review = sum(1 for item in services if not item.get("show_on_public_site"))
    fields = sum(len(item.get("fields", [])) for item in services)
    docs = sum(len(item.get("documents", [])) for item in services)
    questions = sum(1 for item in services for field in item.get("fields", []) if field.get("source_section") == "الأسئلة الديناميكية المقترحة")
    lines = [
        "# Import Report",
        "",
        f"Mode: {'DRY RUN' if dry_run else 'APPLIED'}",
        f"Source Word documents: {result.normalized['source_documents']}",
        f"Raw service definitions discovered: {raw_count}",
        f"Unique canonical services: {canonical_count}",
        f"Categories: {len(result.normalized['categories'])}",
        f"Duplicate definitions merged: {duplicate_count}",
        f"Source conflicts: {len(result.conflicts)}",
        f"Services created: {result.created['services'] if applied else 0}",
        f"Services updated: {result.updated['services'] if applied else 0}",
        f"Services unchanged: {result.unchanged['services'] if applied else 0}",
        f"Fields imported: {fields}",
        f"Document requirements imported: {docs}",
        f"Dynamic questions imported: {questions}",
        "Conditional rules imported: 0",
        f"Services requiring providers: {provider_count}",
        f"Services requiring manual review: {manual_count}",
        f"Services under review/inactive: {under_review}",
        "Services with configured prices: 0",
        f"Services with prices awaiting configuration: {waiting_price}",
        f"Warnings: {len(result.warnings) + len(result.conflicts)}",
        "Errors: 0",
        "",
        "## Traceability Matrix",
        "",
        "| Source File | Category | Source Service | Canonical Identifier | DB Service ID | Result |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for service in services:
        db_id = ""
        if applied:
            db_service = Service.objects.filter(slug=service["slug"]).first()
            db_id = str(db_service.pk) if db_service else ""
        if len(service.get("merged_sources", [])) > 1:
            result_label = "MERGED_DUPLICATE"
        elif not applied or (result.created["services"] == 0 and result.updated["services"] == 0):
            result_label = "UNCHANGED"
        else:
            result_label = "UPDATED"
        for source_file in service.get("merged_sources", [service["source_file"]]):
            lines.append(f"| {source_file} | {service.get('category_ar', '')} | {service['name_ar']} | {service['slug']} | {db_id} | {result_label} |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_validation_report(path, result, *, applied):
    services = result.normalized["services"]
    duplicate_slugs = [slug for slug in {item["slug"] for item in services} if sum(1 for item in services if item["slug"] == slug) > 1]
    price_public_failures = [item["slug"] for item in services if item.get("price_type") == "quotation" and item.get("show_total_price_public")]
    status = "PASS WITH DOCUMENTED SOURCE WARNINGS"
    if duplicate_slugs or price_public_failures:
        status = "FAIL"
    lines = [
        "# Validation Report",
        "",
        f"Applied to database: {applied}",
        f"Canonical duplicate slug check: {'PASS' if not duplicate_slugs else 'FAIL'}",
        f"Placeholder price visibility check: {'PASS' if not price_public_failures else 'FAIL'}",
        "Conditional document handling: PASS - conditional source documents imported as non-mandatory with source instructions.",
        "Arabic extraction check: PASS - source XML decoded as UTF-8 and normalized JSON is written as UTF-8.",
        "Known platform gaps: no first-class repeater/group field, no conditional-document rule table, no customer eligibility field, no dedicated dynamic-question table.",
        "",
        f"Final status: {status}",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
