import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0007_order_missing_document_types"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MissingDocumentRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="missing_document_requests",
                        to="orders.order",
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="missing_document_requests_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("document_types", models.JSONField(default=list, help_text="List of document_type strings that were requested.")),
                ("reason", models.TextField(blank=True, help_text="Reason communicated to the customer.")),
                ("requested_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "responded_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        help_text="Set when all requested documents have been uploaded and the order resumes review.",
                    ),
                ),
                ("is_resolved", models.BooleanField(db_index=True, default=False)),
            ],
            options={
                "verbose_name": "Missing document request",
                "verbose_name_plural": "Missing document requests",
                "ordering": ["-requested_at"],
            },
        ),
        migrations.AddIndex(
            model_name="missingdocumentrequest",
            index=models.Index(fields=["order", "requested_at"], name="orders_miss_order_i_req_at_idx"),
        ),
        migrations.AddIndex(
            model_name="missingdocumentrequest",
            index=models.Index(fields=["is_resolved", "requested_at"], name="orders_miss_resolved_req_at_idx"),
        ),
    ]
