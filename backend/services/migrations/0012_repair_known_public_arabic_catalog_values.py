from django.db import migrations


def repair_known_values(apps, schema_editor):
    Category = apps.get_model("services", "ServiceCategory")
    Requirement = apps.get_model("services", "ServiceRequiredDocument")

    Category.objects.filter(
        slug="social-security",
        name_ar="Social Security",
    ).update(name_ar="الضمان الاجتماعي")
    Category.objects.filter(
        slug="social-security",
        description_ar="Social security certificates and contribution follow-up.",
    ).update(description_ar="شهادات الضمان الاجتماعي ومتابعة الاشتراكات.")

    for document_type, english_name, arabic_name in (
        ("national-id", "National ID", "الهوية الوطنية"),
        ("authorization-letter", "Authorization Letter", "خطاب تفويض"),
    ):
        Requirement.objects.filter(
            document_type=document_type,
            name_ar=english_name,
        ).update(name_ar=arabic_name)


class Migration(migrations.Migration):
    dependencies = [("services", "0011_backfill_required_document_definitions")]

    operations = [migrations.RunPython(repair_known_values, migrations.RunPython.noop)]
