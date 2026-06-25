from django.core import signing
from django.http import FileResponse, Http404
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import generics, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.generics import RetrieveAPIView
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanVerifyDocuments, IsAdminRole
from core.delete_guard import AdminDeleteGuardMixin
from documents.models import Document
from documents.selectors import get_documents_for_user
from documents.serializers import (
    DocumentAdminSerializer,
    DocumentSerializer,
    DocumentVerificationSerializer,
    StaffDocumentSerializer,
)
from documents.services import can_user_download_document, verify_document
from orders.selectors import get_reviewable_orders_for_user

_DOWNLOAD_TOKEN_MAX_AGE = 1800  # 30 minutes
_DOWNLOAD_TOKEN_SALT = "khalisni.document.download"


def _make_download_token(document_id):
    return signing.dumps({"doc": document_id}, salt=_DOWNLOAD_TOKEN_SALT)


def _verify_download_token(token):
    """Return document_id on success, None on invalid/expired token."""
    try:
        data = signing.loads(token, salt=_DOWNLOAD_TOKEN_SALT, max_age=_DOWNLOAD_TOKEN_MAX_AGE)
        return data.get("doc")
    except signing.SignatureExpired:
        return None
    except signing.BadSignature:
        return None


def _raise_drf_validation_error(exc):
    if hasattr(exc, "message_dict"):
        raise DRFValidationError(exc.message_dict)
    raise DRFValidationError(exc.messages)


class DocumentDownloadTokenAPIView(APIView):
    """Generate a short-lived signed download token for a document the caller may access."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(get_documents_for_user(request.user), pk=pk)
        if not can_user_download_document(user=request.user, document=document):
            raise PermissionDenied("You are not allowed to download this document.")
        token = _make_download_token(document.pk)
        return response.Response({"token": token, "expires_in": _DOWNLOAD_TOKEN_MAX_AGE})


class DocumentDownloadAPIView(RetrieveAPIView):
    queryset = Document.objects.select_related("order", "order__customer", "order__assigned_provider__user", "order__service")
    serializer_class = DocumentSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        # Authenticated users: permission-checked access.
        if request.user.is_authenticated:
            document = get_object_or_404(get_documents_for_user(request.user), pk=kwargs["pk"])
            if can_user_download_document(user=request.user, document=document):
                return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.original_filename)
            raise PermissionDenied("You are not allowed to access this document.")

        document = self.get_object()

        # Token-based access (preferred for anonymous/iframe use).
        token = request.query_params.get("token")
        if token:
            doc_id = _verify_download_token(token)
            if doc_id and int(doc_id) == document.pk:
                return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.original_filename)
            raise Http404

        # Legacy order_number + phone gate for public final-document tracking.
        order = document.order
        order_number = request.query_params.get("order_number")
        phone = request.query_params.get("phone")
        if order_number == order.order_number and phone == order.customer.phone and document.is_final_document:
            return FileResponse(document.file.open("rb"), as_attachment=True, filename=document.original_filename)
        raise Http404


class StaffDocumentListAPIView(generics.ListAPIView):
    serializer_class = StaffDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, CanVerifyDocuments]

    def get_queryset(self):
        queryset = Document.objects.select_related("order", "order__service", "uploaded_by", "verified_by").filter(
            is_deleted=False,
            order_id__in=get_reviewable_orders_for_user(self.request.user).values("pk"),
        )
        status_values = [value for value in self.request.query_params.getlist("status") if value]
        if status_values:
            queryset = queryset.filter(status__in=status_values)
        else:
            queryset = queryset.filter(
                status__in=[
                    Document.DocumentStatus.UPLOADED,
                    Document.DocumentStatus.PENDING_REVIEW,
                ]
            )
        order_id = self.request.query_params.get("order")
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        return queryset


class StaffDocumentVerifyAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanVerifyDocuments]

    def post(self, request, pk):
        document = generics.get_object_or_404(
            Document.objects.select_related("order"),
            pk=pk,
            is_deleted=False,
            order_id__in=get_reviewable_orders_for_user(request.user).values("pk"),
        )
        serializer = DocumentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            verify_document(
                document=document,
                actor=request.user,
                is_verified=serializer.validated_data["is_verified"],
                note=serializer.validated_data.get("note", ""),
                request=request,
            )
        except DjangoValidationError as exc:
            _raise_drf_validation_error(exc)
        return response.Response(StaffDocumentSerializer(document, context={"request": request}).data, status=status.HTTP_200_OK)


class AdminDocumentViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    queryset = Document.objects.select_related("order", "uploaded_by", "verified_by").all()
    serializer_class = DocumentAdminSerializer
    search_fields = ["order__order_number", "document_type", "original_filename", "mime_type"]
    delete_audit_fields = (
        "order_id",
        "uploaded_by_id",
        "verified_by_id",
        "document_type",
        "original_filename",
        "status",
        "is_final_document",
        "is_verified",
        "is_deleted",
    )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = self.get_delete_old_value(instance)
        self.enforce_delete_guard(request, instance=instance, old_value=old_value)
        with transaction.atomic():
            instance.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_document",
                entity_type="Document",
                entity_id=instance.pk,
                entity_name=instance.original_filename,
                old_value=old_value,
                new_value=self.get_delete_old_value(instance),
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)
