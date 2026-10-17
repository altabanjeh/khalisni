"""The client-approved slogan is the default homepage headline (CN-VIS-04).

Visual Design Notes (2026-08-30) §4 approve «ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.».
The CMS row is the one source of the headline. Rows still holding the previous
shipped default (never edited by an admin) take the approved slogan; a headline
an admin wrote is left as it is.
"""

from django.db import migrations

OLD = {"hero_title_ar": "خلّص معاملاتك الحكومية والإدارية بدون تعب", "hero_title_en": "Finish your government and admin requests without the hassle"}
NEW = {"hero_title_ar": "ركّز على اللي بهمّك… وإحنا بنخلّص الباقي.", "hero_title_en": "Focus on what matters… and we will handle the rest."}


def forwards(apps, schema_editor):
    PublicPageContent = apps.get_model("public_site", "PublicPageContent")
    for field, old in OLD.items():
        PublicPageContent.objects.filter(**{field: old}).update(**{field: NEW[field]})


def backwards(apps, schema_editor):
    PublicPageContent = apps.get_model("public_site", "PublicPageContent")
    for field, new in NEW.items():
        PublicPageContent.objects.filter(**{field: new}).update(**{field: OLD[field]})


class Migration(migrations.Migration):
    dependencies = [
        ("public_site", "0007_publicpagecontent_privacy_policy_ar_and_more"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
