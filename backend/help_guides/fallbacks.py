from collections import defaultdict

from core.choices import OrderStatus, UserRole
from orders.models import Order
from services.models import Service
from workflow.rules import WORKFLOW_TRANSITIONS


ORDER_SCREEN_KEYS = {
    "customer_order_details",
    "customer_missing_documents",
    "employee_order_review",
    "admin_order_details",
    "provider_order_details",
}


FALLBACK_FIELD_GUIDES = {
    "customer_create_order": [
        {
            "field_key": "category_slug",
            "field_label": "Service category",
            "model_name": "ServiceCategory",
            "model_field": "slug",
            "purpose": "Filters the service list so the customer picks the correct business area first.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one active category from the dropdown.",
            "valid_example": "residency-services",
            "invalid_example": "Free text typed into the field.",
            "validation_rule": "The selected category must exist and expose at least one active service.",
            "error_explanation": "If the category is missing, the service list will stay empty or the form will reject submission.",
            "tooltip_text": "Pick the category first so the service list is narrowed to valid options.",
            "placeholder_text": "Choose category",
            "max_length": None,
            "default_value": "",
            "who_can_edit": "Customer creating the order.",
            "locked_when": "",
            "display_order": 10,
        },
        {
            "field_key": "service",
            "field_label": "Service",
            "model_name": "Service",
            "model_field": "id",
            "purpose": "Defines the exact government or business service the order will request.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one active service from the filtered list.",
            "valid_example": "Commercial registration renewal",
            "invalid_example": "A service from another category or an inactive service.",
            "validation_rule": "The service must be active, visible to the current customer, and allowed for online ordering.",
            "error_explanation": "If the service is unavailable or offline, the backend rejects the order.",
            "tooltip_text": "Choose the exact service because documents, price, and workflow all depend on it.",
            "placeholder_text": "Choose service",
            "who_can_edit": "Customer creating the order.",
            "display_order": 20,
        },
        {
            "field_key": "full_name",
            "field_label": "Full name",
            "model_name": "Order",
            "model_field": "customer.full_name",
            "purpose": "Stores the customer name used by staff and providers during the order lifecycle.",
            "required": True,
            "editable": True,
            "data_type": "text",
            "accepted_format": "Plain text up to 255 characters.",
            "valid_example": "Ahmad Khaled",
            "invalid_example": "",
            "validation_rule": "Cannot be blank.",
            "error_explanation": "The order cannot be created without a customer name.",
            "tooltip_text": "Use the customer name that should appear in order processing and notifications.",
            "display_order": 30,
        },
        {
            "field_key": "phone",
            "field_label": "Phone number",
            "model_name": "Order",
            "model_field": "customer.phone",
            "purpose": "Primary contact number used for follow-up and missing-document requests.",
            "required": True,
            "editable": True,
            "data_type": "text",
            "accepted_format": "A phone number up to 30 characters.",
            "valid_example": "0791234567",
            "invalid_example": "An empty phone field.",
            "validation_rule": "Cannot be blank.",
            "error_explanation": "The backend rejects the order when no phone is provided.",
            "tooltip_text": "Use a reachable phone number because operations staff may contact the customer through it.",
            "display_order": 40,
        },
        {
            "field_key": "national_id",
            "field_label": "National ID",
            "model_name": "Order",
            "model_field": "customer.national_id",
            "purpose": "Optional identity reference used by some services and document checks.",
            "required": False,
            "editable": True,
            "data_type": "text",
            "accepted_format": "Plain text up to 32 characters.",
            "valid_example": "9876543210",
            "invalid_example": "A value longer than the allowed field length.",
            "validation_rule": "Optional, but must fit within the model length.",
            "error_explanation": "If the value is too long or mismatched with uploaded identity documents, staff may request a correction.",
            "tooltip_text": "Fill this when the service depends on identity matching or government records.",
            "display_order": 50,
        },
        {
            "field_key": "city",
            "field_label": "City",
            "model_name": "Order",
            "model_field": "city",
            "purpose": "Helps route the order and assign local providers when needed.",
            "required": True,
            "editable": True,
            "data_type": "text",
            "accepted_format": "Plain text up to 120 characters.",
            "valid_example": "Amman",
            "invalid_example": "",
            "validation_rule": "Cannot be blank.",
            "error_explanation": "A missing city blocks order creation.",
            "tooltip_text": "Use the city relevant to the requested service or customer record.",
            "display_order": 60,
        },
        {
            "field_key": "notes",
            "field_label": "Additional notes",
            "model_name": "Order",
            "model_field": "customer_notes",
            "purpose": "Carries customer instructions plus any dynamic service-form answers into the order record.",
            "required": False,
            "editable": True,
            "data_type": "textarea",
            "accepted_format": "Free text.",
            "valid_example": "Preferred pickup after 3 PM.",
            "invalid_example": "",
            "validation_rule": "Optional.",
            "error_explanation": "Leave this empty rather than repeating the same data from other fields.",
            "tooltip_text": "Use notes only for operational details that do not have a dedicated field.",
            "display_order": 70,
        },
        {
            "field_key": "documents",
            "field_label": "Required documents",
            "model_name": "Document",
            "model_field": "file",
            "purpose": "Uploads the required files for the chosen service.",
            "required": False,
            "editable": True,
            "data_type": "file",
            "accepted_format": "PDF, JPG, JPEG, PNG, DOC, or DOCX up to 10 MB per file unless the service rule is stricter.",
            "valid_example": "A readable PDF scan of the national ID.",
            "invalid_example": "A file above 10 MB or an unsupported extension.",
            "validation_rule": "Each uploaded file must match a declared required document type when the service defines specific document slots.",
            "error_explanation": "Common backend errors are unsupported extension, size limit exceeded, duplicate document type, or missing required documents.",
            "tooltip_text": "Upload one clear file per required document type.",
            "display_order": 80,
        },
        {
            "field_key": "consent",
            "field_label": "Consent",
            "model_name": "Order",
            "model_field": "consent",
            "purpose": "Confirms the customer agrees to use submitted data and documents for the service.",
            "required": True,
            "editable": True,
            "data_type": "checkbox",
            "accepted_format": "Checked or unchecked.",
            "valid_example": "Checked",
            "invalid_example": "Unchecked on submit.",
            "validation_rule": "Must be true.",
            "error_explanation": "The form rejects submission until consent is checked.",
            "tooltip_text": "The order cannot be sent without consent.",
            "display_order": 90,
        },
    ],
    "customer_order_details": [
        {
            "field_key": "document_type",
            "field_label": "Document type",
            "model_name": "Document",
            "model_field": "document_type",
            "purpose": "Specifies which missing or replacement document the customer is uploading.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one type from the missing-document list for this order.",
            "valid_example": "national_id",
            "invalid_example": "A document type that is not requested for the current service.",
            "validation_rule": "Must match a required or missing document for the current order.",
            "error_explanation": "The upload is rejected if the type does not belong to the service requirements.",
            "tooltip_text": "Choose the exact requested document type before uploading the file.",
            "display_order": 10,
        },
        {
            "field_key": "file",
            "field_label": "Document file",
            "model_name": "Document",
            "model_field": "file",
            "purpose": "Uploads a replacement or requested customer file for the order.",
            "required": True,
            "editable": True,
            "data_type": "file",
            "accepted_format": "PDF, JPG, JPEG, PNG, DOC, or DOCX up to 10 MB.",
            "valid_example": "Readable PDF document.",
            "invalid_example": "Unsupported extension or oversized file.",
            "validation_rule": "Uses document upload validation for extension, size, and MIME type.",
            "error_explanation": "If upload fails, check extension, file size, and whether the document type is valid for the order.",
            "tooltip_text": "Use a clear, final file version so staff can approve it without asking again.",
            "display_order": 20,
        },
        {
            "field_key": "score",
            "field_label": "Rating score",
            "model_name": "Rating",
            "model_field": "score",
            "purpose": "Captures customer satisfaction after completion.",
            "required": True,
            "editable": True,
            "data_type": "number",
            "accepted_format": "Whole number between 1 and 5.",
            "valid_example": "5",
            "invalid_example": "0 or 6",
            "validation_rule": "Submitted only when the order is completed and not yet rated.",
            "error_explanation": "Rating fails if the order is not complete or already has a rating.",
            "tooltip_text": "Rate only after reviewing the final delivered result.",
            "display_order": 30,
        },
    ],
    "customer_missing_documents": [
        {
            "field_key": "missing_document_file",
            "field_label": "Missing document file",
            "model_name": "Document",
            "model_field": "file",
            "purpose": "Uploads each specifically requested missing document back to the order.",
            "required": True,
            "editable": True,
            "data_type": "file",
            "accepted_format": "Service-specific allowed extensions, usually PDF or image formats, up to 10 MB.",
            "valid_example": "A readable scan of the missing certificate.",
            "invalid_example": "A placeholder image or unsupported file format.",
            "validation_rule": "Each requested document must be uploaded in its own slot before re-submission.",
            "error_explanation": "The screen stays blocked if any requested document is still missing.",
            "tooltip_text": "Upload every requested document before pressing re-submit.",
            "display_order": 10,
        }
    ],
    "employee_order_review": [
        {
            "field_key": "request_missing_note",
            "field_label": "Missing-document note",
            "model_name": "OrderNote",
            "model_field": "note",
            "purpose": "Explains to the customer what is missing or incorrect.",
            "required": True,
            "editable": True,
            "data_type": "textarea",
            "accepted_format": "Plain text with a clear action request.",
            "valid_example": "Please upload a readable copy of the passport page.",
            "invalid_example": "Fix docs",
            "validation_rule": "A note is required before moving the order to WAITING_CUSTOMER.",
            "error_explanation": "Short or vague notes cause customer confusion and repeat cycles.",
            "tooltip_text": "Be specific about the exact document or issue the customer must fix.",
            "display_order": 10,
        },
        {
            "field_key": "document_types",
            "field_label": "Requested document types",
            "model_name": "Order",
            "model_field": "missing_document_types",
            "purpose": "Marks which service documents are still missing or invalid.",
            "required": False,
            "editable": True,
            "data_type": "checkbox-group",
            "accepted_format": "Select one or more of the service requirement document types.",
            "valid_example": "national_id, authorization_letter",
            "invalid_example": "A type not defined for the service.",
            "validation_rule": "Should match the actual service document requirements.",
            "error_explanation": "Wrong selections send the customer back with an incorrect checklist.",
            "tooltip_text": "Tick only the documents that actually need a replacement or new upload.",
            "display_order": 20,
        },
        {
            "field_key": "provider_id",
            "field_label": "Provider",
            "model_name": "Order",
            "model_field": "assigned_provider",
            "purpose": "Chooses the provider who will execute the service after review completes.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one approved matching provider from the candidate list.",
            "valid_example": "Provider profile #15",
            "invalid_example": "An unavailable or unmatched provider.",
            "validation_rule": "The provider must be available, approved, and valid for the service.",
            "error_explanation": "Assignment is blocked until all required documents are approved and the provider matches the service.",
            "tooltip_text": "This field stays blocked until the order is actually ready for provider assignment.",
            "display_order": 30,
        },
        {
            "field_key": "internal_note",
            "field_label": "Internal note",
            "model_name": "OrderNote",
            "model_field": "note",
            "purpose": "Stores an internal-only operational note for staff.",
            "required": True,
            "editable": True,
            "data_type": "textarea",
            "accepted_format": "Plain text.",
            "valid_example": "Customer confirmed corrected name spelling by phone.",
            "invalid_example": "",
            "validation_rule": "Shown only to internal staff or provider when note visibility allows.",
            "error_explanation": "Do not use internal notes for customer-facing requests.",
            "tooltip_text": "Use this for staff handoff details, audit context, or provider guidance.",
            "display_order": 40,
        },
        {
            "field_key": "template_id",
            "field_label": "Notification template",
            "model_name": "NotificationTemplate",
            "model_field": "template_id",
            "purpose": "Selects the approved notification template for a manual send.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one active manual template.",
            "valid_example": "review_started",
            "invalid_example": "Free text or a missing template.",
            "validation_rule": "Manual sends use predefined templates only.",
            "error_explanation": "If no template is selected, the notification action fails.",
            "tooltip_text": "Manual notifications are restricted to approved templates for consistency and auditability.",
            "display_order": 50,
        },
    ],
    "provider_order_details": [
        {
            "field_key": "status",
            "field_label": "Execution status",
            "model_name": "Order",
            "model_field": "status",
            "purpose": "Moves the order between provider execution stages that the workflow currently allows.",
            "required": True,
            "editable": True,
            "data_type": "select",
            "accepted_format": "Choose one status from the available transition list.",
            "valid_example": "IN_PROGRESS",
            "invalid_example": "A status outside the available transition options.",
            "validation_rule": "Only statuses permitted by the workflow and current role appear.",
            "error_explanation": "No options means the workflow does not allow a provider transition right now.",
            "tooltip_text": "Only update the status when the actual work stage changed.",
            "display_order": 10,
        },
        {
            "field_key": "verification_note",
            "field_label": "Final upload note",
            "model_name": "Document",
            "model_field": "verification_note",
            "purpose": "Adds context to the final result file for internal review.",
            "required": False,
            "editable": True,
            "data_type": "textarea",
            "accepted_format": "Plain text.",
            "valid_example": "Signed final letter attached.",
            "invalid_example": "",
            "validation_rule": "Optional.",
            "error_explanation": "Use it only when internal reviewers need context beyond the file itself.",
            "tooltip_text": "Add a note if the final file has special handling or review context.",
            "display_order": 20,
        },
        {
            "field_key": "final_file",
            "field_label": "Final result file",
            "model_name": "Document",
            "model_field": "file",
            "purpose": "Uploads the provider’s final deliverable for internal approval.",
            "required": True,
            "editable": True,
            "data_type": "file",
            "accepted_format": "PDF, JPG, JPEG, PNG, DOC, or DOCX up to 10 MB.",
            "valid_example": "Final stamped PDF result.",
            "invalid_example": "A draft or missing file.",
            "validation_rule": "Uses document upload validation and workflow transition checks.",
            "error_explanation": "Upload stays blocked until the workflow allows final-result submission.",
            "tooltip_text": "Upload the final customer-facing document only when execution is complete.",
            "display_order": 30,
        },
    ],
}


FALLBACK_ACTION_GUIDES = {
    "customer_create_order": [
        {
            "button_key": "save_draft",
            "button_label": "Save draft",
            "role": UserRole.CUSTOMER,
            "purpose": "Stores the current order form locally on the customer device.",
            "when_to_use": "Use before leaving the screen or when required documents are not ready yet.",
            "action_result": "The form values are saved to local storage and can be restored on the same device.",
            "warning_message": "Uploaded files are not kept in the saved draft.",
            "common_errors": "Expecting saved files to be restored later.",
            "safety_rule": "Do not rely on draft storage for shared or public devices.",
            "display_order": 10,
        },
        {
            "button_key": "submit_order",
            "button_label": "Submit order",
            "role": UserRole.CUSTOMER,
            "purpose": "Creates the order and sends it into the review workflow.",
            "when_to_use": "Use after all mandatory fields and required files are complete.",
            "action_result": "A new order number is created and the order enters the first review stage.",
            "status_after": OrderStatus.NEW,
            "common_errors": "Missing required documents, unsupported files, or leaving mandatory fields blank.",
            "safety_rule": "Review the service and attached documents before sending because staff will review the exact submitted data.",
            "display_order": 20,
        },
    ],
    "customer_order_details": [
        {
            "button_key": "open_missing_documents",
            "button_label": "Open missing documents screen",
            "role": UserRole.CUSTOMER,
            "purpose": "Navigates the customer to the dedicated missing-document response screen.",
            "when_to_use": "Use when the order status is WAITING_CUSTOMER.",
            "action_result": "The user lands on the re-upload screen listing each requested document.",
            "status_before": OrderStatus.WAITING_CUSTOMER,
            "display_order": 10,
        },
        {
            "button_key": "upload_customer_document",
            "button_label": "Upload document",
            "role": UserRole.CUSTOMER,
            "purpose": "Adds a requested replacement document directly from the order details screen.",
            "when_to_use": "Use when the order already lists missing document types.",
            "action_result": "The file is attached to the order for review.",
            "common_errors": "Choosing the wrong document type or uploading an unsupported file.",
            "display_order": 20,
        },
        {
            "button_key": "submit_rating",
            "button_label": "Submit rating",
            "role": UserRole.CUSTOMER,
            "purpose": "Sends a post-completion service rating.",
            "when_to_use": "Use after the order is completed and the final output has been reviewed.",
            "action_result": "The rating is stored and becomes visible for service-quality tracking.",
            "status_before": OrderStatus.COMPLETED,
            "display_order": 30,
        },
        {
            "button_key": "cancel_order",
            "button_label": "Cancel order",
            "role": UserRole.CUSTOMER,
            "purpose": "Stops the customer order when cancellation is still permitted.",
            "when_to_use": "Use only when the customer wants to stop processing and the workflow still allows cancellation.",
            "action_result": "The order is moved to CANCELLED and no further processing continues.",
            "status_after": OrderStatus.CANCELLED,
            "notification_triggered": "Cancellation may notify internal staff depending on workflow setup.",
            "warning_message": "Cancellation is treated as a final workflow action.",
            "display_order": 40,
        },
    ],
    "customer_missing_documents": [
        {
            "button_key": "resubmit_missing_documents",
            "button_label": "Upload documents and re-submit",
            "role": UserRole.CUSTOMER,
            "purpose": "Uploads all missing files and returns the order to review.",
            "when_to_use": "Use only after every requested document has been attached.",
            "action_result": "The order becomes eligible to move from WAITING_CUSTOMER back into internal review.",
            "status_before": OrderStatus.WAITING_CUSTOMER,
            "status_after": OrderStatus.UNDER_REVIEW,
            "display_order": 10,
        }
    ],
    "employee_order_review": [
        {
            "button_key": "start_review",
            "button_label": "Start review",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.review_order",
            "purpose": "Moves a new order into active internal review.",
            "when_to_use": "Use when the order is NEW and the employee is starting actual review work.",
            "action_result": "The order status changes to UNDER_REVIEW.",
            "status_before": OrderStatus.NEW,
            "status_after": OrderStatus.UNDER_REVIEW,
            "display_order": 10,
        },
        {
            "button_key": "verify_documents",
            "button_label": "Open document verification",
            "role": UserRole.EMPLOYEE,
            "permission_key": "documents.verify_document",
            "purpose": "Opens the staff document verification workflow for the order.",
            "when_to_use": "Use before requesting missing documents or assigning a provider.",
            "action_result": "The user lands on the verification screen with the current order pre-filtered.",
            "display_order": 20,
        },
        {
            "button_key": "request_missing_documents",
            "button_label": "Request missing documents",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.request_missing_documents",
            "purpose": "Returns the order to the customer with clear missing-document instructions.",
            "when_to_use": "Use when required documents are missing, unreadable, or invalid.",
            "action_result": "The order moves to WAITING_CUSTOMER and stores the missing document checklist.",
            "status_after": OrderStatus.WAITING_CUSTOMER,
            "notification_triggered": "The customer is notified about the missing documents request.",
            "display_order": 30,
        },
        {
            "button_key": "assign_provider",
            "button_label": "Assign provider",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.assign_order",
            "purpose": "Sends a fully reviewed order to an approved provider.",
            "when_to_use": "Use after every required document is approved and a valid provider is selected.",
            "action_result": "The order moves to ASSIGNED and the provider receives the work item.",
            "status_after": OrderStatus.ASSIGNED,
            "notification_triggered": "Provider assignment triggers the provider-facing workflow notification.",
            "warning_message": "Do not assign the order until required documents are approved.",
            "display_order": 40,
        },
        {
            "button_key": "complete_order",
            "button_label": "Approve result and complete",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.complete_order",
            "purpose": "Approves the final provider result and completes the order.",
            "when_to_use": "Use after the final document is present and valid.",
            "action_result": "The order moves to COMPLETED.",
            "status_before": OrderStatus.READY_FOR_DELIVERY,
            "status_after": OrderStatus.COMPLETED,
            "display_order": 50,
        },
        {
            "button_key": "return_to_provider",
            "button_label": "Return to provider",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.manage_order_workflow",
            "purpose": "Sends the order back to the provider for correction.",
            "when_to_use": "Use when the final result needs provider-side fixes.",
            "action_result": "The order returns to IN_PROGRESS with the correction note.",
            "status_before": OrderStatus.READY_FOR_DELIVERY,
            "status_after": OrderStatus.IN_PROGRESS,
            "display_order": 60,
        },
        {
            "button_key": "return_to_internal_review",
            "button_label": "Return to internal review",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.manage_order_workflow",
            "purpose": "Moves the order back to internal review without returning it to the provider.",
            "when_to_use": "Use when the issue should be re-checked internally first.",
            "action_result": "The order returns to UNDER_REVIEW.",
            "status_before": OrderStatus.READY_FOR_DELIVERY,
            "status_after": OrderStatus.UNDER_REVIEW,
            "display_order": 70,
        },
        {
            "button_key": "send_manual_notification",
            "button_label": "Send notification",
            "role": UserRole.EMPLOYEE,
            "permission_key": "notifications.send_manual_notification",
            "purpose": "Sends an approved manual notification template tied to the order.",
            "when_to_use": "Use when the standard automated transitions are not enough.",
            "action_result": "A templated notification is sent and logged.",
            "display_order": 80,
        },
        {
            "button_key": "reject_order",
            "button_label": "Reject order",
            "role": UserRole.EMPLOYEE,
            "permission_key": "orders.reject_order",
            "purpose": "Closes the order as rejected when the service cannot proceed.",
            "when_to_use": "Use only when rejection is the correct final business decision.",
            "action_result": "The order moves to REJECTED with a reason.",
            "status_after": OrderStatus.REJECTED,
            "warning_message": "Rejection is a hard workflow stop and requires a defensible reason.",
            "display_order": 90,
        },
    ],
    "provider_order_details": [
        {
            "button_key": "update_status",
            "button_label": "Update status",
            "role": UserRole.PROVIDER,
            "purpose": "Moves the assigned order through the provider execution stages allowed right now.",
            "when_to_use": "Use when the actual work stage changed.",
            "action_result": "The order status changes and a timeline entry is recorded.",
            "display_order": 10,
        },
        {
            "button_key": "add_provider_note",
            "button_label": "Add note",
            "role": UserRole.PROVIDER,
            "purpose": "Stores a provider-side execution note on the order.",
            "when_to_use": "Use when internal staff needs context about the execution progress.",
            "action_result": "A provider note is added to the order history.",
            "display_order": 20,
        },
        {
            "button_key": "upload_final_result",
            "button_label": "Upload final result",
            "role": UserRole.PROVIDER,
            "permission_key": "documents.upload_final_document",
            "purpose": "Uploads the final service deliverable for internal completion review.",
            "when_to_use": "Use only when the execution work is complete.",
            "action_result": "The final file is attached and the order becomes ready for internal review.",
            "status_after": OrderStatus.READY_FOR_DELIVERY,
            "warning_message": "Do not upload drafts or unfinished results as final output.",
            "display_order": 30,
        },
    ],
}


ACTION_PERMISSION_MAP = {
    "start_review": "orders.review_order",
    "request_missing_documents": "orders.request_missing_documents",
    "assign_provider": "orders.assign_order",
    "reject_order": "orders.reject_order",
    "complete_order": "orders.complete_order",
    "provider_start_work": "orders.process_order",
    "provider_pause_for_government": "orders.process_order",
    "provider_resume_work": "orders.process_order",
    "mark_ready_for_delivery": "documents.upload_final_document",
    "cancel_order": "orders.cancel_order",
}


def get_fallback_field_guides(screen_key: str):
    return list(FALLBACK_FIELD_GUIDES.get(screen_key, []))


def get_fallback_action_guides(screen_key: str):
    return list(FALLBACK_ACTION_GUIDES.get(screen_key, []))


def build_service_fallback(service: Service):
    required_documents = []
    optional_documents = []
    for requirement in service.document_requirements.filter(is_active=True, is_deleted=False).order_by("display_order", "requirement_id"):
        item = requirement.name_ar or requirement.document_type
        if requirement.is_required:
            required_documents.append(item)
        else:
            optional_documents.append(item)

    required_data = []
    for field in service.required_information_schema or []:
        label = field.get("label") or field.get("name") or field.get("key") or "Field"
        suffix = "required" if field.get("required") else "optional"
        required_data.append(f"{label} ({suffix})")

    prerequisites = [
        relation.source_service.name_ar
        for relation in service.incoming_relations.filter(
            relation_type="prerequisite",
            is_active=True,
            source_service__is_active=True,
        ).select_related("source_service")
    ]
    related_services = [
        relation.target_service.name_ar
        for relation in service.outgoing_relations.filter(is_active=True, target_service__is_active=True).select_related("target_service")
    ]

    who_can_use = "Customers through the authenticated order flow."
    if not service.is_online:
        who_can_use += " This service is not configured for direct online ordering."

    return {
        "service_id": service.id,
        "service_name": service.name_ar,
        "category_name": getattr(service.category, "name_ar", ""),
        "role": UserRole.CUSTOMER,
        "description": service.description_ar,
        "who_can_use": who_can_use,
        "required_documents": "\n".join(required_documents),
        "optional_documents": "\n".join(optional_documents),
        "required_data": "\n".join(required_data),
        "prerequisites": "\n".join(prerequisites),
        "related_services": "\n".join(related_services),
        "workflow_summary": "Order created\nInternal review\nCustomer correction if needed\nProvider execution when required\nFinal completion",
        "final_output": "Final service document or completed transaction result.",
        "common_errors": "Uploading unclear files\nChoosing the wrong service\nLeaving required service fields blank",
        "common_rejection_reasons": "Documents do not match the request\nMandatory service data is incorrect\nThe request does not meet the service prerequisites",
        "common_missing_document_reasons": "Unreadable upload\nWrong document type\nA required document was not attached",
        "estimated_processing_time": service.delivery_time_payload().get("label_en") or f"{service.estimated_duration} {service.estimated_duration_unit}",
        "price_rule": f"{service.get_price_type_display()} pricing with a total fee of {service.total_fee}.",
        "provider_requirement": "Provider assignment required." if service.provider_required else "No provider assignment required.",
        "source": "registry",
    }


def build_workflow_fallbacks(screen_key: str, current_status: str = ""):
    if screen_key not in ORDER_SCREEN_KEYS:
        return []

    rows = []
    for index, rule in enumerate(WORKFLOW_TRANSITIONS, start=1):
        if current_status and rule.from_status != current_status:
            continue
        permission_key = ACTION_PERMISSION_MAP.get(rule.action, "")
        system_effect = f"Order moves from {rule.from_status} to {rule.to_status}."
        notification_effect = "Notification is triggered." if rule.notification_trigger else "No automatic notification is defined."
        blocked_cases = "\n".join(rule.validation_checks) if rule.validation_checks else ""
        rows.append(
            {
                "workflow_key": f"{rule.from_status.lower()}__{rule.action}",
                "screen_key": screen_key,
                "current_status": rule.from_status,
                "action_key": rule.action,
                "action_label": rule.action.replace("_", " ").title(),
                "button_key": rule.action,
                "role": next(iter(rule.allowed_roles)) if len(rule.allowed_roles) == 1 else HelpRole.ALL_USERS,
                "permission_key": permission_key,
                "next_status": rule.to_status,
                "required_fields": "\n".join(rule.validation_checks),
                "system_effect": system_effect,
                "notification_effect": notification_effect,
                "blocked_cases": blocked_cases,
                "correction_process": "Review the validation checks, supply the missing data, and retry the action.",
                "display_order": index * 10,
                "source": "registry",
            }
        )
    return rows


class HelpRole:
    ALL_USERS = "all_users"


def build_searchable_fallback_rows():
    rows = defaultdict(list)
    for screen_key, items in FALLBACK_FIELD_GUIDES.items():
        rows["fields"].extend({"screen_key": screen_key, "role": UserRole.CUSTOMER if screen_key.startswith("customer") else HelpRole.ALL_USERS, "source": "registry", **item} for item in items)
    for screen_key, items in FALLBACK_ACTION_GUIDES.items():
        rows["actions"].extend({"screen_key": screen_key, "source": "registry", **item} for item in items)
    for status_value, _label in Order.Status.choices:
        rows["workflows"].extend(build_workflow_fallbacks("employee_order_review", status_value))
    return rows
