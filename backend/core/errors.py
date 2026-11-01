"""Customer-facing language for the error messages the API writes itself.

The backend raises its own validation and workflow errors in English. The web
and mobile clients show ``detail`` and field messages as they arrive, so an
Arabic screen used to show English text (audit D03 / DEF-K01).

This module is the one place that knows the Arabic wording of those
system-generated messages. ``localize_message`` maps a known English message
(exact text, or a pattern for messages that carry a value) to the language of
the request. Text that is not in the catalogue is returned unchanged: typed
content, names and anything authored by people are never translated.

Database implementation details must not reach users: a message that is a
raw constraint violation is replaced by a plain conflict message.
"""

import re

from core.i18n import request_language

# English message -> Arabic message. Keep the English exactly as raised.
MESSAGES = {
    # Uploads and documents
    "Unsupported file extension for this document.": "امتداد الملف غير مسموح لهذا المستند.",
    "This document exceeds the allowed file size.": "حجم الملف أكبر من الحد المسموح لهذا المستند.",
    "File content does not match its extension.": "محتوى الملف لا يطابق امتداده.",
    "File exceeds maximum allowed size.": "حجم الملف أكبر من الحد المسموح.",
    "Unsupported file extension.": "امتداد الملف غير مسموح.",
    "Unsupported file type.": "نوع الملف غير مسموح.",
    "Unsupported image type.": "نوع الصورة غير مسموح.",
    "The uploaded file is not a readable image.": "الملف المرفوع ليس صورة صالحة للقراءة.",
    "Each uploaded file must have a matching document type.": "يجب أن يرتبط كل ملف مرفوع بنوع مستند.",
    "Upload each required document in its own field.": "ارفع كل مستند مطلوب في الحقل الخاص به.",
    "This document is not required for the selected service.": "هذا المستند غير مطلوب للخدمة المختارة.",
    "This document was uploaded more than once.": "تم رفع هذا المستند أكثر من مرة.",
    "Documents cannot be uploaded to a closed order.": "لا يمكن رفع مستندات لطلب مغلق.",
    "Documents can be uploaded only while the request is under review.": "يمكن رفع المستندات فقط أثناء مراجعة الطلب.",
    "This document is not part of this request.": "هذا المستند ليس من مستندات هذا الطلب.",
    "This document type cannot be replaced by the client after upload.": "لا يمكن استبدال هذا النوع من المستندات بعد رفعه.",
    "This document is no longer available.": "هذا المستند لم يعد متاحاً.",
    "This document is already verified.": "تم اعتماد هذا المستند مسبقاً.",
    "This document is already rejected.": "تم رفض هذا المستند مسبقاً.",
    "Documents of a closed order cannot be reviewed.": "لا يمكن مراجعة مستندات طلب مغلق.",
    "A rejection note is required when rejecting a document.": "سبب الرفض مطلوب عند رفض المستند.",
    "You are not allowed to access this document.": "لا تملك صلاحية الوصول إلى هذا المستند.",
    "You are not allowed to download this document.": "لا تملك صلاحية تنزيل هذا المستند.",
    "All requested missing documents must be uploaded before review can resume.": "يجب رفع جميع المستندات الناقصة المطلوبة قبل استئناف المراجعة.",
    "This order has no valid missing-document request to resubmit.": "لا يوجد طلب نواقص صالح لإعادة إرساله في هذا الطلب.",
    "Select at least one configured document requirement.": "اختر مستنداً واحداً على الأقل من مستندات الخدمة.",
    # Ordering
    "Consent is required.": "الموافقة على استخدام البيانات مطلوبة.",
    "Unknown consent statement version.": "نص الموافقة المرسل غير معروف.",
    "This service cannot be ordered online.": "لا يمكن طلب هذه الخدمة إلكترونياً.",
    "This service is not currently available.": "هذه الخدمة غير متاحة حالياً.",
    "This service is not available for the selected organization.": "هذه الخدمة غير متاحة للجهة المختارة.",
    "Branch must belong to the selected organization.": "يجب أن يتبع الفرع الجهة المختارة.",
    "Only authenticated customer accounts can create orders.": "يمكن إنشاء الطلبات من حسابات العملاء المسجلة فقط.",
    "Orders can only be created by customer accounts.": "يمكن إنشاء الطلبات من حسابات العملاء فقط.",
    "Phone number belongs to a non-customer account.": "رقم الهاتف مرتبط بحساب ليس حساب عميل.",
    "Direct order creation is disabled. Use the public/customer order creation flow.": "إنشاء الطلب المباشر غير متاح. استخدم نموذج طلب العميل.",
    "A partner organization is required for this order.": "يجب تحديد الجهة الشريكة لهذا الطلب.",
    "Use a UUID submission key.": "مفتاح الإرسال غير صالح.",
    "This submission key was used for different request data.": "تم استخدام مفتاح الإرسال نفسه لبيانات مختلفة. أعد إرسال الطلب.",
    "This service needs configuration before it can be ordered online.": "هذه الخدمة تحتاج إلى استكمال إعدادها قبل طلبها إلكترونياً. أرسل طلباً خاصاً وسيتواصل معك الفريق.",
    "Send the answers to the service questions.": "أرسل إجابات أسئلة الخدمة.",
    "The service answers must be an object.": "يجب إرسال إجابات أسئلة الخدمة بالشكل الصحيح.",
    "This field is not part of the service form.": "هذا الحقل ليس من نموذج الخدمة.",
    "This field is required.": "هذا الحقل مطلوب.",
    "Choose one of the listed options.": "اختر أحد الخيارات المتاحة.",
    "Enter a number.": "أدخل رقماً.",
    "Enter a valid email address.": "أدخل بريداً إلكترونياً صالحاً.",
    "Enter a date as YYYY-MM-DD.": "أدخل التاريخ بالصيغة سنة-شهر-يوم.",
    "Enter yes or no.": "اختر نعم أو لا.",
    "Enter a single value.": "أدخل قيمة واحدة.",
    "Enter the entries as a list.": "أرسل الإدخالات على شكل قائمة.",
    "Each entry must be an object.": "كل إدخال يجب أن يكون مجموعة حقول.",
    # Account conflicts
    "This phone number is already used by another account.": "رقم الهاتف مستخدم في حساب آخر.",
    "This phone number is already used by another account. Sign in or use a different number.": "رقم الهاتف مستخدم في حساب آخر. سجّل الدخول أو استخدم رقماً آخر.",
    "This national ID is already used by another account.": "الرقم الوطني مستخدم في حساب آخر.",
    "This email is already used by another account.": "البريد الإلكتروني مستخدم في حساب آخر.",
    "The entered details conflict with an existing record.": "البيانات المدخلة تتعارض مع سجل موجود.",
    "Passwords do not match.": "كلمتا المرور غير متطابقتين.",
    "The current password is incorrect.": "كلمة المرور الحالية غير صحيحة.",
    "Enter your current password to change your email or phone number.": "أدخل كلمة المرور الحالية لتغيير البريد الإلكتروني أو رقم الهاتف.",
    "Token has been revoked. Please sign in again.": "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
    "Provider accounts require a phone number.": "حسابات مزودي الخدمة تتطلب رقم هاتف.",
    "Password is required when creating a provider account.": "كلمة المرور مطلوبة عند إنشاء حساب مزود خدمة.",
    "Password is required when creating a user.": "كلمة المرور مطلوبة عند إنشاء مستخدم.",
    "Delete password is required.": "كلمة مرور الحذف مطلوبة.",
    "Delete passwords do not match.": "كلمتا مرور الحذف غير متطابقتين.",
    # Workflow
    "A reason is required for this workflow action.": "السبب مطلوب لهذا الإجراء.",
    "Cancelled orders require a cancellation reason.": "إلغاء الطلب يتطلب ذكر السبب.",
    "Rejected orders require a rejection reason.": "رفض الطلب يتطلب ذكر السبب.",
    "Completed order must have final document or admin confirmation.": "إكمال الطلب يتطلب النتيجة النهائية أو تأكيد المدير.",
    "Final document must be verified before completing the order.": "يجب اعتماد النتيجة النهائية قبل إكمال الطلب.",
    "Only an administrator may override final-result verification.": "لا يمكن تجاوز اعتماد النتيجة النهائية إلا من قبل المدير.",
    "Order is already completed.": "الطلب مكتمل مسبقاً.",
    "Order is not completed yet.": "الطلب لم يكتمل بعد.",
    "Order has already been rated.": "تم تقييم الطلب مسبقاً.",
    "Only completed orders can be reopened.": "يمكن إعادة فتح الطلبات المكتملة فقط.",
    "Only new orders can be submitted.": "يمكن إرسال الطلبات الجديدة فقط.",
    "Only internal staff can review orders.": "مراجعة الطلبات متاحة لفريق العمل فقط.",
    "Order cannot be assigned before review.": "لا يمكن إسناد الطلب قبل مراجعته.",
    "No workflow action is configured for this transition.": "لا يوجد إجراء معرّف لهذا الانتقال.",
    "This status cannot be changed through the generic status endpoint.": "لا يمكن تغيير هذه الحالة من نموذج تحديث الحالة العام.",
    "This transition is not available through the generic status endpoint.": "هذا الانتقال غير متاح من نموذج تحديث الحالة العام.",
    "This field can only be changed through dedicated workflow actions.": "لا يمكن تغيير هذا الحقل إلا من خلال إجراءات سير العمل المخصصة.",
    "Finalized orders cannot be cancelled.": "لا يمكن إلغاء طلب منتهٍ.",
    "Finalized orders cannot be edited through this endpoint.": "لا يمكن تعديل طلب منتهٍ من هنا.",
    "Customers may cancel only newly submitted orders.": "يمكن للعميل إلغاء الطلب الجديد فقط.",
    "Employees may cancel only review-stage orders.": "يمكن للموظف إلغاء الطلبات في مرحلة المراجعة فقط.",
    "Only the assigned employee can cancel this order.": "يمكن للموظف المسؤول فقط إلغاء هذا الطلب.",
    "Only the assigned employee can perform this action.": "يمكن للموظف المسؤول فقط تنفيذ هذا الإجراء.",
    "Only the assigned provider can perform this action.": "يمكن لمزود الخدمة المسند إليه الطلب فقط تنفيذ هذا الإجراء.",
    "Only the order customer can cancel this order.": "يمكن لصاحب الطلب فقط إلغاؤه.",
    "Only the order customer can perform this action.": "يمكن لصاحب الطلب فقط تنفيذ هذا الإجراء.",
    "You are not allowed to cancel this order.": "لا تملك صلاحية إلغاء هذا الطلب.",
    "Status not allowed for provider.": "هذه الحالة غير متاحة لمزود الخدمة.",
    "This order has no assigned provider to return work to.": "لا يوجد مزود خدمة مسند لإعادة العمل إليه.",
    "Only orders waiting for the customer can be recovered.": "يمكن معالجة الطلبات التي بانتظار العميل فقط.",
    "Only staff can recover a missing-document request.": "معالجة طلب النواقص متاحة لفريق العمل فقط.",
    "This order has a valid missing-document request; the customer can answer it.": "طلب النواقص في هذا الطلب صالح ويمكن للعميل الرد عليه.",
    "Provider is required.": "مزود الخدمة مطلوب.",
    "Provider account is not active.": "حساب مزود الخدمة غير نشط.",
    "Provider is not currently available.": "مزود الخدمة غير متاح حالياً.",
    "Provider must be approved before assignment.": "يجب اعتماد مزود الخدمة قبل الإسناد.",
    "Provider is not linked to this service or its category.": "مزود الخدمة غير مرتبط بهذه الخدمة أو تصنيفها.",
    "This service does not require a provider.": "هذه الخدمة لا تتطلب مزود خدمة.",
    "A reason is required when deactivating a provider.": "السبب مطلوب عند إيقاف مزود الخدمة.",
    "A reason is required when rejecting a provider.": "السبب مطلوب عند رفض مزود الخدمة.",
    "Consent evidence is append-only and cannot be changed.": "سجل الموافقة لا يمكن تعديله.",
    "Consent evidence is append-only and cannot be deleted.": "سجل الموافقة لا يمكن حذفه.",
    "Amount must be greater than zero.": "يجب أن يكون المبلغ أكبر من صفر.",
    # Admin catalogue and settings
    "The form schema must be a list of fields.": "يجب أن يكون نموذج الخدمة قائمة حقول.",
    "Document definition is required.": "تعريف المستند مطلوب.",
    "This document definition is already linked to the service.": "تعريف المستند مرتبط بالخدمة مسبقاً.",
    "Maximum file size must be greater than zero.": "يجب أن يكون الحد الأقصى لحجم الملف أكبر من صفر.",
    "Source service and target service must be different.": "يجب أن تختلف الخدمة المصدر عن الخدمة الهدف.",
    "Circular category hierarchy is not allowed.": "لا يمكن أن يكون التصنيف تابعاً لنفسه بشكل دائري.",
    "This category is shared and is managed by the platform team.": "هذا التصنيف مشترك ويديره فريق المنصة.",
    "You do not have permission to reorder service categories.": "لا تملك صلاحية إعادة ترتيب التصنيفات.",
    "You do not have permission to deactivate service relations.": "لا تملك صلاحية إيقاف علاقات الخدمات.",
    "You can manage only your own organization's services.": "يمكنك إدارة خدمات جهتك فقط.",
    "You can link only your own organization's services.": "يمكنك ربط خدمات جهتك فقط.",
    "This setting is not available in the admin rule screen.": "هذا الإعداد غير متاح في شاشة القواعد.",
    "System settings cannot be deleted from this screen.": "لا يمكن حذف إعدادات النظام من هذه الشاشة.",
    "Only admin users can delete or deactivate records.": "الحذف أو الإيقاف متاح للمديرين فقط.",
    # Delete guard (core/delete_guard.py): shown inside the web and mobile delete modals.
    "Current admin password is required.": "أدخل كلمة مرور حسابك الإداري الحالية لتأكيد الحذف.",
    "Current admin password is incorrect.": "كلمة مرور حسابك الإداري غير صحيحة.",
    "Only a platform super admin can approve or activate providers.": "اعتماد مزودي الخدمة أو تفعيلهم متاح لمدير المنصة فقط.",
    "Only a platform super admin can assign platform roles.": "تعيين أدوار المنصة متاح لمدير المنصة فقط.",
    "Only a platform super admin can assign this role.": "تعيين هذا الدور متاح لمدير المنصة فقط.",
    "Only a platform super admin can change this field.": "تعديل هذا الحقل متاح لمدير المنصة فقط.",
    "Only a platform super admin can change user permissions.": "تعديل صلاحيات المستخدمين متاح لمدير المنصة فقط.",
    "Only super admin can change admin-level users.": "تعديل حسابات المديرين متاح لمدير المنصة فقط.",
    "Customer users are created automatically and cannot be assigned manually.": "حسابات العملاء تُنشأ تلقائياً ولا يمكن تعيينها يدوياً.",
    "Customer users are created automatically from the public customer flow.": "حسابات العملاء تُنشأ تلقائياً من مسار العميل.",
    "Choose the organization and membership role for the new user.": "اختر الجهة ودور العضوية للمستخدم الجديد.",
    "Organization is required when assigning a membership role.": "الجهة مطلوبة عند تعيين دور العضوية.",
    "Organization was not found.": "لم يتم العثور على الجهة.",
    "This account is shared with another organization or the platform and can be changed only by a platform super admin.": "هذا الحساب مشترك مع جهة أخرى أو مع المنصة ولا يعدله إلا مدير المنصة.",
    "Employees may send only in-app notification templates.": "يمكن للموظف إرسال قوالب الإشعارات داخل النظام فقط.",
    "The selected notification template is not active.": "قالب الإشعار المختار غير نشط.",
    "HTML and script tags are not allowed in notification templates.": "لا يسمح بوسوم HTML أو النصوص البرمجية في قوالب الإشعارات.",
    "JavaScript or unsafe HTML is not allowed in public site content.": "لا يسمح بنصوص برمجية أو HTML غير آمن في محتوى الموقع.",
    "Enter a complete URL including the domain name.": "أدخل رابطاً كاملاً يتضمن اسم النطاق.",
    "Enter a complete contact URL.": "أدخل رابط تواصل كاملاً.",
    "Only relative, http, https, mailto, and tel URLs are allowed.": "يسمح فقط بروابط داخلية أو http أو https أو mailto أو tel.",
    "Protocol-relative URLs are not allowed.": "الروابط التي تبدأ بـ // غير مسموحة.",
    "This address is on a reserved domain that cannot receive mail. Publish a real support address or leave it blank.": "هذا البريد على نطاق محجوز لا يستقبل الرسائل. انشر بريد دعم حقيقياً أو اترك الحقل فارغاً.",
    "Use YYYY-MM-DD for date_from and date_to.": "استخدم صيغة سنة-شهر-يوم لتاريخ البداية والنهاية.",
    "Slug is required.": "المعرّف مطلوب.",
    "Messages cannot be sent on an archived order.": "لا يمكن إرسال رسائل على طلب مؤرشف.",
    "The provider can be changed only while the order is assigned or in progress.": "يمكن تغيير مزود الخدمة فقط أثناء الإسناد أو التنفيذ.",
    "This provider is already assigned to the order.": "مزود الخدمة هذا مسند إلى الطلب مسبقاً.",
    "This complaint is already resolved.": "تمت معالجة هذه الشكوى مسبقاً.",
    "Paper delivery needs instructions for the customer.": "التسليم الورقي يحتاج إلى تعليمات للعميل.",
    "Delivery details cannot be changed on a finished order.": "لا يمكن تغيير تفاصيل التسليم لطلب منتهٍ.",
    "Service help was not found.": "لم يتم العثور على دليل لهذه الخدمة.",
    "A select field needs at least one option.": "حقل القائمة يحتاج إلى خيار واحد على الأقل.",
    "Option values must be unique.": "يجب ألا تتكرر قيم الخيارات.",
    "Every option needs a value and a label.": "كل خيار يحتاج إلى قيمة وعنوان.",
    "The default value is not one of the field options.": "القيمة الافتراضية ليست من خيارات الحقل.",
    "The condition refers to an answer that the controlling field does not offer.": "الشرط يشير إلى إجابة غير موجودة في الحقل المتحكم.",
    "A required field cannot depend on a hidden controlling field.": "لا يمكن أن يعتمد حقل مطلوب على حقل متحكم مخفي.",
    "Unknown field type.": "نوع الحقل غير معروف.",
    "A repeater field needs at least one item field.": "الحقل المتكرر يحتاج إلى حقل فرعي واحد على الأقل.",
    "Every repeater item field needs a key, a label and a supported type.": "كل حقل فرعي في الحقل المتكرر يحتاج إلى مفتاح وعنوان ونوع مدعوم.",
    "Repeater item field keys must be unique.": "مفاتيح الحقول الفرعية في الحقل المتكرر يجب أن تكون مختلفة.",
    "Repeater item fields cannot have conditions or nested repeaters.": "الحقول الفرعية في الحقل المتكرر لا تقبل شروط ظهور أو حقولاً متكررة داخلها.",
    "Repeater limits must be whole numbers with 0 <= min_items <= max_items <= 20.": "حدود الحقل المتكرر يجب أن تكون أعداداً صحيحة: الحد الأدنى من 0 والحد الأقصى حتى 20، والأدنى لا يتجاوز الأقصى.",
    "A condition cannot refer to a repeater field.": "لا يمكن أن يعتمد شرط الظهور على حقل متكرر.",
}

# Messages that carry a value. Each entry: (compiled English pattern, Arabic template).
PATTERNS = [
    (re.compile(r"^Missing required documents: (?P<v>.+)\.$"), "المستندات المطلوبة ناقصة: {v}."),
    (re.compile(r"^Requested documents still need a valid upload: (?P<v>.+)\.$"), "المستندات المطلوبة ما زالت تحتاج إلى رفع صحيح: {v}."),
    (re.compile(r"^Required documents are incomplete: (?P<v>.+)$"), "المستندات المطلوبة غير مكتملة: {v}"),
    (re.compile(r"^Unknown or inactive service document requirement: (?P<v>.+)\.$"), "مستند غير معروف أو غير نشط في هذه الخدمة: {v}."),
    (re.compile(r"^File content does not match its extension\. Upload a genuine (?P<v>.+) file\.$"), "محتوى الملف لا يطابق امتداده. ارفع ملف {v} حقيقياً."),
    (re.compile(r"^Order cannot be assigned while its status is (?P<v>.+)\.$"), "لا يمكن إسناد الطلب في حالته الحالية."),
    (re.compile(r"^Invalid status transition from (?P<a>\S+) to (?P<b>\S+)\.$"), "لا يمكن نقل الطلب من حالته الحالية إلى الحالة المطلوبة."),
    (re.compile(r"^Role '(?P<r>[^']+)' cannot move order from (?P<a>\S+) to (?P<b>\S+)\.$"), "لا تملك صلاحية نقل الطلب إلى هذه الحالة."),
    (re.compile(r"^Allowed file types must be one of: (?P<v>.+)\.$"), "أنواع الملفات المسموحة يجب أن تكون من: {v}."),
    (re.compile(r"^Allowed image extensions are: (?P<v>.+)\.$"), "امتدادات الصور المسموحة: {v}."),
    (re.compile(r"^Maximum file size cannot exceed (?P<v>\d+) bytes\.$"), "لا يمكن أن يتجاوز الحد الأقصى لحجم الملف {v} بايت."),
    (re.compile(r"^Image size must not exceed (?P<v>\d+) bytes\.$"), "يجب ألا يتجاوز حجم الصورة {v} بايت."),
    (re.compile(r"^Maximum file size cannot exceed (?P<v>\d+) MB\.$"), "لا يمكن أن يتجاوز الحد الأقصى لحجم الملف {v} ميغابايت."),
    (re.compile(r"^This required prerequisite creates a circular dependency: (?P<v>.+)$"), "هذا المتطلب يُنشئ اعتماداً دائرياً: {v}"),
    (re.compile(r"^Field key '(?P<v>[^']+)' is used more than once\.$"), "مفتاح الحقل '{v}' مستخدم أكثر من مرة."),
    (re.compile(r"^Field (?P<v>\d+) must be an object\.$"), "الحقل {v} يجب أن يكون كائناً."),
    (re.compile(r"^Field (?P<v>\d+) needs a key\.$"), "الحقل {v} يحتاج إلى مفتاح."),
    (re.compile(r"^Field (?P<v>\d+) has an invalid type\.$"), "نوع الحقل {v} غير صالح."),
    (re.compile(r"^Field (?P<v>\d+) options must be a list\.$"), "خيارات الحقل {v} يجب أن تكون قائمة."),
    (re.compile(r"^Field (?P<v>\d+) needs a label\.$"), "الحقل {v} يحتاج إلى عنوان."),
    (re.compile(r"^Field (?P<v>\d+) visible_when must be .+$"), "شرط ظهور الحقل {v} غير صالح."),
    (re.compile(r"^Field (?P<v>\d+) visible_when refers to an unknown field\.$"), "شرط ظهور الحقل {v} يشير إلى حقل غير موجود."),
    (re.compile(r"^Field '(?P<k>[^']+)': (?P<m>.+)$"), None),  # schema problem wrapper, see below
    (re.compile(r"^Add at least (?P<v>\d+) entries\.$"), "أضف إدخالات حتى تصل إلى الحد الأدنى: {v}."),
    (re.compile(r"^Add no more than (?P<v>\d+) entries\.$"), "عدد الإدخالات أكبر من الحد الأقصى: {v}."),
    (re.compile(r"^Unknown status group: (?P<v>.+)$"), "مجموعة حالات غير معروفة."),
    (re.compile(r"^Invalid order status: (?P<v>.+)$"), "حالة الطلب غير صالحة."),
]

# Raw database constraint text (Django model validation) must never reach a user.
CONSTRAINT = re.compile(r"^Constraint “(?P<name>[^”]+)” is violated\.$|^Constraint \"(?P<name2>[^\"]+)\" is violated\.$")
CONSTRAINT_MESSAGES = {
    "unique_non_empty_user_phone": "This phone number is already used by another account.",
    "unique_non_empty_user_national_id": "This national ID is already used by another account.",
}
GENERIC_CONFLICT = "The entered details conflict with an existing record."


def safe_english(text):
    """Replace implementation text (constraint names) with a plain English message."""
    match = CONSTRAINT.match(text)
    if not match:
        return text
    name = match.group("name") or match.group("name2")
    return CONSTRAINT_MESSAGES.get(name, GENERIC_CONFLICT)


def localize_message(text, language):
    """Return ``text`` in ``language`` when it is a known system message."""
    if not isinstance(text, str):
        return text
    english = safe_english(text)
    if language != "ar":
        return english
    if english in MESSAGES:
        return MESSAGES[english]
    for pattern, template in PATTERNS:
        match = pattern.match(english)
        if not match:
            continue
        if template is None:
            # "Field '<key>': <message>" — keep the key, localize the message.
            return f"الحقل '{match.group('k')}': {localize_message(match.group('m'), language)}"
        return template.format(**match.groupdict())
    return english


def localize_payload(data, language):
    """Localize every string in an error payload (dicts, lists, strings)."""
    if isinstance(data, dict):
        return {key: localize_payload(value, language) for key, value in data.items()}
    if isinstance(data, list):
        return [localize_payload(item, language) for item in data]
    if isinstance(data, str):
        localized = localize_message(data, language)
        if localized is data:
            return data
        # Keep DRF's ErrorDetail code when present.
        code = getattr(data, "code", None)
        if code is not None:
            from rest_framework.exceptions import ErrorDetail

            return ErrorDetail(localized, code=code)
        return localized
    return data


def localized_exception_handler(exc, context):
    """DRF exception handler: the default handler, then request-language messages."""
    from django.core.exceptions import ValidationError as DjangoValidationError
    from django.db import IntegrityError
    from rest_framework import status
    from rest_framework.response import Response
    from rest_framework.views import exception_handler

    request = context.get("request")
    language = request_language(request)
    if isinstance(exc, DjangoValidationError):
        payload = exc.message_dict if hasattr(exc, "error_dict") else {"detail": exc.messages}
        return Response(localize_payload(payload, language), status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, IntegrityError):
        # A unique constraint raced past validation. Never show database text.
        return Response({"detail": localize_message(GENERIC_CONFLICT, language)}, status=status.HTTP_400_BAD_REQUEST)
    response = exception_handler(exc, context)
    if response is not None and response.status_code < 500:
        response.data = localize_payload(response.data, language)
    return response
