"""The approved slogan replaces a leftover demo headline (CN-VIS-04).

0008 replaced the previous shipped default. A development database also held a
hand-made row named "... Demo Homepage" with the headline «أنجز معاملاتك
الحكومية والإدارية من مكان واحد», which never shipped as a default and is demo
content (it hid the approved slogan). Only a row that is BOTH named as a demo
and still carries exactly that headline is changed; a headline written by the
client through the CMS is never touched. Idempotent; reverse restores it.
"""

from django.db import migrations

DEMO_AR = "أنجز معاملاتك الحكومية والإدارية من مكان واحد"
DEMO_EN = "Complete government and administrative requests from one place"
SLOGAN_AR = "ركّز على اللي بهمّك… وإحنا بنخلّص الباقي."
SLOGAN_EN = "Focus on what matters… and we will handle the rest."


def forwards(apps, schema_editor):
    PublicPageContent = apps.get_model("public_site", "PublicPageContent")
    rows = PublicPageContent.objects.filter(version_name__icontains="demo", hero_title_ar=DEMO_AR)
    for row in rows:
        updates = {"hero_title_ar": SLOGAN_AR}
        if row.hero_title_en == DEMO_EN:
            updates["hero_title_en"] = SLOGAN_EN
        PublicPageContent.objects.filter(pk=row.pk).update(**updates)


def backwards(apps, schema_editor):
    PublicPageContent = apps.get_model("public_site", "PublicPageContent")
    PublicPageContent.objects.filter(version_name__icontains="demo", hero_title_ar=SLOGAN_AR).update(hero_title_ar=DEMO_AR, hero_title_en=DEMO_EN)


class Migration(migrations.Migration):
    dependencies = [("public_site", "0011_seed_legal_document_drafts")]
    operations = [migrations.RunPython(forwards, backwards)]
