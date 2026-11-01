"""D05 and brand: remove sample contact values and old brand spellings from CMS rows.

Contact: earlier sample data published a phone, a WhatsApp number, a
non-deliverable email (``support@khalisni.local``) and an office address
(«مبنى خلصني للخدمات») that the owner never confirmed
(docs/audit/KHALSNI_OWNER_DECISION_DOSSIER.md §1). A field is blanked only when
it still holds one of those known sample values, an email on a reserved or
``example`` domain. Any other value an administrator entered is left as it is.

Brand: rows still holding the earlier shipped Arabic footer default (which
used the Latin word "Khalisni") take the approved default. In visible CMS text
fields (homepage content, advertisements, theme name) the old brand words
"Khalisni" and «خلّصني» become "Khalsni" and «خلصني»; everything else in the
text is kept. Domains, email addresses, URLs and DB identifiers are never
renamed ("khalisni.com", "x@khalisni.local" stay as they are).

Idempotent: a second run finds nothing to change.
"""

import re

from django.db import migrations

RESERVED_SUFFIXES = (".local", ".localhost", ".test", ".example", ".invalid", ".internal")
# Sample numbers (by digits); either sample was also stored in the other field.
PLACEHOLDER_PHONE_DIGITS = {"96265609000", "065609000", "962790000000", "0790000000"}
PHONE_FIELDS = ("contact_phone", "whatsapp_number")
PLACEHOLDER_ADDRESS_FRAGMENTS = (
    "مبنى خلصني للخدمات",
    "مبنى خلّصني للخدمات",
    "khalisni services building",
    "khalsni services building",
)

OLD_ARABIC_FOOTER = "Khalisni منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية."
NEW_ARABIC_FOOTER = "خلصني منصة أردنية لإدارة طلبات الخدمات الحكومية والإدارية."

# The Latin word, not when it is part of a domain, an address or a path.
OLD_LATIN = re.compile(r"(?<![@/.\w-])Khalisni(?![\w-]|\.[A-Za-z])")
OLD_ARABIC = "خلّصني"
TEXT_FIELDS = {
    "PublicPageContent": (
        "version_name", "hero_title_ar", "hero_title_en", "hero_subtitle_ar", "hero_subtitle_en",
        "primary_button_text", "primary_button_text_en", "secondary_button_text", "secondary_button_text_en",
        "how_it_works_text", "how_it_works_text_en", "office_address", "office_address_en",
        "footer_text", "footer_text_en", "privacy_policy_ar", "privacy_policy_en",
    ),
    "Advertisement": ("title_ar", "title_en", "description_ar", "description_en", "button_text_ar", "button_text_en"),
    "SiteTheme": ("name",),
}


def rebrand(text):
    if not text:
        return text
    return OLD_LATIN.sub("Khalsni", text).replace(OLD_ARABIC, "خلصني")


def _digits(value):
    return re.sub(r"\D", "", value or "")


def _placeholder_email(address):
    address = (address or "").strip().lower()
    if "@" not in address:
        return False
    domain = address.rsplit("@", 1)[1].rstrip(".")
    return domain == "localhost" or domain.endswith(RESERVED_SUFFIXES) or "example" in domain.split(".")


def _placeholder_address(value):
    text = " ".join((value or "").split()).lower()
    return bool(text) and any(fragment in text for fragment in PLACEHOLDER_ADDRESS_FRAGMENTS)


def forwards(apps, schema_editor):
    PublicPageContent = apps.get_model("public_site", "PublicPageContent")

    for row in PublicPageContent.objects.all().only(
        "pk", "contact_phone", "whatsapp_number", "email", "office_address", "office_address_en"
    ):
        changes = {}
        for field in PHONE_FIELDS:
            value = getattr(row, field) or ""
            if value and _digits(value) in PLACEHOLDER_PHONE_DIGITS:
                changes[field] = ""
        if row.email and _placeholder_email(row.email):
            changes["email"] = ""
        for field in ("office_address", "office_address_en"):
            if _placeholder_address(getattr(row, field)):
                changes[field] = ""
        if changes:
            # update(): no model validation or save() side effects in a data migration.
            PublicPageContent.objects.filter(pk=row.pk).update(**changes)

    PublicPageContent.objects.filter(footer_text=OLD_ARABIC_FOOTER).update(footer_text=NEW_ARABIC_FOOTER)

    for model_name, fields in TEXT_FIELDS.items():
        model = apps.get_model("public_site", model_name)
        manager = model._base_manager
        for row in manager.all().only("pk", *fields):
            changes = {}
            for field in fields:
                value = getattr(row, field)
                new_value = rebrand(value)
                if new_value != value:
                    changes[field] = new_value
            if changes:
                manager.filter(pk=row.pk).update(**changes)


class Migration(migrations.Migration):
    dependencies = [
        ("public_site", "0009_publicpagecontent_office_hours_legaldocument"),
    ]

    # Reverse is a no-op: removed placeholders were never real values, and rows that
    # already held the new brand spelling before this migration cannot be told apart.
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
