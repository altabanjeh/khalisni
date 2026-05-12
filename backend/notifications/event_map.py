from dataclasses import dataclass

from notifications.models import Notification


ALLOWED_TEMPLATE_PLACEHOLDERS = {
    "{{order_number}}",
    "{{service_name}}",
    "{{customer_name}}",
    "{{status_label}}",
}


@dataclass(frozen=True)
class NotificationEventDefinition:
    key: str
    trigger_source: str
    recipients: tuple[str, ...]
    channels: tuple[str, ...]
    template_key: str
    required_variables: tuple[str, ...]
    audit_action: str
    fallback_title: str
    fallback_message: str


NOTIFICATION_EVENT_MAP = {
    "order_submitted": NotificationEventDefinition(
        key="order_submitted",
        trigger_source="orders.create_public_order",
        recipients=("customer", "admins"),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_submitted",
        required_variables=("order_number", "service_name"),
        audit_action="notification_event_dispatched",
        fallback_title="Order received",
        fallback_message="Your order {{order_number}} was created successfully.",
    ),
    "order_under_review": NotificationEventDefinition(
        key="order_under_review",
        trigger_source="orders.review_order",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_under_review",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order under review",
        fallback_message="Your order {{order_number}} is under review.",
    ),
    "missing_documents_requested": NotificationEventDefinition(
        key="missing_documents_requested",
        trigger_source="orders.request_missing_documents",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="missing_documents_requested",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="More documents required",
        fallback_message="Please review the latest note for order {{order_number}}.",
    ),
    "client_uploaded_missing_document": NotificationEventDefinition(
        key="client_uploaded_missing_document",
        trigger_source="orders.upload_customer_document",
        recipients=("assigned_employee", "admins"),
        channels=(Notification.Channel.SYSTEM,),
        template_key="client_uploaded_missing_document",
        required_variables=("order_number", "customer_name"),
        audit_action="notification_event_dispatched",
        fallback_title="Customer uploaded a missing document",
        fallback_message="{{customer_name}} uploaded a requested document for order {{order_number}}.",
    ),
    "document_rejected": NotificationEventDefinition(
        key="document_rejected",
        trigger_source="documents.verify_document",
        recipients=("document_uploader",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="document_rejected",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Document rejected",
        fallback_message="A document for order {{order_number}} was rejected and needs correction.",
    ),
    "document_verified": NotificationEventDefinition(
        key="document_verified",
        trigger_source="documents.verify_document",
        recipients=("document_uploader",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="document_verified",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Document verified",
        fallback_message="A document for order {{order_number}} was verified successfully.",
    ),
    "provider_assigned": NotificationEventDefinition(
        key="provider_assigned",
        trigger_source="orders.assign_provider_to_order",
        recipients=("customer", "provider"),
        channels=(Notification.Channel.SYSTEM,),
        template_key="provider_assigned",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order assigned",
        fallback_message="Order {{order_number}} was assigned to the service provider.",
    ),
    "provider_started_work": NotificationEventDefinition(
        key="provider_started_work",
        trigger_source="orders.start_work",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="provider_started_work",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Provider started work",
        fallback_message="Work started on order {{order_number}}.",
    ),
    "provider_completed_work": NotificationEventDefinition(
        key="provider_completed_work",
        trigger_source="orders.complete_provider_work",
        recipients=("customer", "assigned_employee", "admins"),
        channels=(Notification.Channel.SYSTEM,),
        template_key="provider_completed_work",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Final result uploaded",
        fallback_message="The provider uploaded the final result for order {{order_number}}.",
    ),
    "provider_result_returned": NotificationEventDefinition(
        key="provider_result_returned",
        trigger_source="orders.return_to_provider",
        recipients=("provider",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="provider_result_returned",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order returned for rework",
        fallback_message="Order {{order_number}} was returned to the provider for rework.",
    ),
    "order_ready_for_delivery": NotificationEventDefinition(
        key="order_ready_for_delivery",
        trigger_source="orders.upload_final_document",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_ready_for_delivery",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order ready for delivery",
        fallback_message="Order {{order_number}} is ready for delivery.",
    ),
    "order_completed": NotificationEventDefinition(
        key="order_completed",
        trigger_source="orders.complete_order",
        recipients=("customer", "provider"),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_completed",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order completed",
        fallback_message="Order {{order_number}} is completed.",
    ),
    "order_cancelled": NotificationEventDefinition(
        key="order_cancelled",
        trigger_source="orders.cancel_order",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_cancelled",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order cancelled",
        fallback_message="Order {{order_number}} was cancelled.",
    ),
    "order_reopened": NotificationEventDefinition(
        key="order_reopened",
        trigger_source="orders.reopen_order",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="order_reopened",
        required_variables=("order_number",),
        audit_action="notification_event_dispatched",
        fallback_title="Order reopened",
        fallback_message="Order {{order_number}} was reopened for more work.",
    ),
    "payment_status_changed": NotificationEventDefinition(
        key="payment_status_changed",
        trigger_source="payment.update_payment_status",
        recipients=("customer",),
        channels=(Notification.Channel.SYSTEM,),
        template_key="payment_status_changed",
        required_variables=("order_number", "status_label"),
        audit_action="notification_event_dispatched",
        fallback_title="Payment status updated",
        fallback_message="Payment status for order {{order_number}} is now {{status_label}}.",
    ),
}
