"""CN-BIZ-01 / CN-BIZ-04: repeater fields for partners and plots.

* Company registration (and any form with the four imported ``partner_*``
  fields: «اسم كل شريك», «الرقم الوطني / رقم الجواز للشريك», «جنسية كل شريك»,
  «حصة كل شريك»): one ``partners`` repeater whose rows hold name / id /
  nationality / share, with the imported Arabic labels («حسب عدد الشركاء»).
* ``request-property-consolidation``: «أرقام القطع المطلوب توحيدها» and
  «أرقام الأحواض» become one ``plots`` repeater (rows of parcel_number /
  basin_number, at least two plots: «توحيد قطعتين أو أكثر»), behind the parcel
  yes/no gate «هل تعرف رقم القطعة والحوض؟» (owner decision B10-1/2/3, B4 option
  A): shown and required only when the answer is "yes".

``catalogue_rules.apply_repeater_rules`` converts only the known imported
shape (keys, Arabic labels, plain types), so admin edits are left alone; the
importer applies the same function. Idempotent. Orders are not touched: their
answers live in the order notes and their requirements in frozen snapshots.
Reverse is a no-op.
"""

from django.db import migrations

from services.catalogue_rules import apply_repeater_rules


def forwards(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service._base_manager.all().order_by("pk").iterator():
        schema = apply_repeater_rules(service.required_information_schema, service.slug)
        if schema != service.required_information_schema:
            Service._base_manager.filter(pk=service.pk).update(required_information_schema=schema)


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0022_english_terms_and_help"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
