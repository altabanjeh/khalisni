from django.contrib import admin

from documents.models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "document_id",
        "order",
        "document_type",
        "uploaded_by",
        "is_final_document",
        "is_verified",
        "status",
        "created_at",
    )
    list_filter = ("status", "is_verified", "is_final_document", "document_type", "created_at")
    search_fields = ("order__order_number", "original_filename", "document_type", "uploaded_by__full_name")
    readonly_fields = (
        "stored_filename",
        "checksum_sha256",
        "uploaded_by",
        "uploaded_by_role",
        "verified_by",
        "verified_at",
        "created_at",
        "updated_at",
    )
