# Privacy Policy / سياسة الخصوصية — DRAFT 2026-11-01-draft

> **REQUIRES OWNER/LEGAL CONTENT APPROVAL BEFORE PRODUCTION**
>
> مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد
>
> Draft — requires owner/legal approval before production

| Field | Value |
|---|---|
| kind | `privacy` |
| version | `2026-11-01-draft` |
| effective_date | `2026-11-01` |
| approval_status | `draft_requires_approval` |
| Source of truth | `LegalDocument` rows seeded by `backend/public_site/migrations/0011_seed_legal_document_drafts.py`; served at `GET /api/public-site/legal/privacy/` |

This text was written from what the code does in this release (registration, order submission, uploads,
consent evidence, role-based access, in-app notifications, password-reset/changed emails, file storage,
no online payment). It does not state retention periods (they are set by the operator per configuration,
`python manage.py retention_report --show-policy`) and it makes no commitment the system does not implement.
Section 10 lists the points only the owner and the legal advisor can decide. Approving a version is recorded
in the admin legal editor (approval note + approver + time) and published as a new version.

## العربية — سياسة الخصوصية

هذه مسودة. تصف كيف تتعامل منصة خلصني مع البيانات الشخصية كما يعمل النظام في هذا الإصدار، ويجب أن يراجعها المالك والمستشار القانوني ويعتمداها قبل الاعتماد عليها في بيئة التشغيل.

1. من يشغّل المنصة
يشغّل منصة خلصني مشغّل المنصة، وبيانات التواصل المنشورة له موجودة في صفحة «تواصل معنا». يضيف المالك الاسم القانوني للمشغّل وعنوانه المسجّل قبل الاعتماد.

2. البيانات التي تجمعها المنصة
• عند إنشاء حساب: اسمك الكامل وبريدك الإلكتروني ورقم هاتفك المحمول وكلمة المرور، ورقم الهوية الوطنية اختياري. تُحفظ كلمة المرور بصيغة مشفّرة باتجاه واحد فقط.
• عند تقديم طلب خدمة: الخدمة المطلوبة واسمك ورقم هاتفك ومدينتك، ورقم الهوية الوطنية اختيارياً، وملاحظاتك، وإجاباتك عن أسئلة نموذج الخدمة، والمستندات التي ترفعها.
• موافقتك على نص الموافقة في نموذج الطلب: النص الذي وافقت عليه (رقم نسخته ونصه الحرفي)، واللغة، وهل تمت الموافقة من الموقع أو من تطبيق الهاتف، ووقتها، ونسختا سياسة الخصوصية وشروط الاستخدام المنشورتان في ذلك الوقت.
• الرسائل التي ترسلها من الموقع العام (نموذج التواصل أو طلب خدمة غير موجودة): اسمك ورقم هاتفك وبريدك الإلكتروني إن أدخلته ونص الرسالة.
• سجلات الأمان: وقت تسجيل الدخول وعنوان IP المستخدم، وطلبات إعادة تعيين كلمة المرور، وسجل تدقيق للعمليات الحساسة (مثل تغيير حالة الطلب ومراجعة المستندات والتعديلات الإدارية) وقد يتضمن عنوان IP ومعرّف المتصفح أو التطبيق.

3. كيف تُستخدم البيانات
• لمراجعة الخدمة التي تطلبها ومعالجتها وإنجازها.
• لإعلامك بتقدّم طلبك وبأي مستندات ناقصة عبر الإشعارات داخل حسابك.
• لإرسال رسائل الحساب بالبريد الإلكتروني: رابط إعادة تعيين كلمة المرور عند طلبه، وتأكيد عند تغيير كلمة المرور. لا ترسل المنصة رسائل نصية (SMS) أو رسائل واتساب في هذا الإصدار.
• لحماية الحسابات والاحتفاظ بسجل للعمليات الحساسة.

4. من يمكنه رؤية بياناتك
• أنت: حسابك وطلباتك والمستندات التي رفعتها والنتائج التي سُلّمت لك.
• فريق المنصة (المسؤولون والموظفون والدعم): يرون الطلبات والمستندات التي يحتاجها دور كل منهم، والوصول مضبوط بصلاحيات حسب الدور.
• مزوّد الخدمة المعيَّن لطلبك: يرى فقط ما يلزم لتنفيذه، وهو رقم الطلب والخدمة والمدينة والحالة وملاحظات الطلب وإجابات النموذج وتعليمات الفريق والمستندات المتاحة لذلك الطلب. لا تعرض شاشات المزوّد اسمك أو رقم هاتفك أو بريدك الإلكتروني أو رقم هويتك الوطنية.
• من يملك رقم الطلب ورقم الهاتف المرتبط به معاً يمكنه رؤية حالة الطلب في صفحة التتبع العامة.
• لإنجاز خدمة حكومية أو إدارية قد يحتاج الفريق أو المزوّد المعيَّن إلى تقديم بياناتك ومستنداتك للجهة المختصة بتلك الخدمة.
• لا توجد في المنصة أي ميزة أخرى تشارك بياناتك مع أطراف ثالثة.

5. التخزين والأمان
• تُخزَّن المستندات المرفوعة في مساحة تخزين الملفات الخاصة بالمنصة على الخوادم التي يحددها المشغّل، ولا يمكن تنزيلها إلا من حسابات مصرّح لها أو عبر رابط موقّع قصير الصلاحية.
• المستند الذي يُحذف داخل المنصة يُخفى عن الجميع، ويبقى الملف المخزَّن إلى أن تزيله مدة احتفاظ يضبطها المشغّل.
• سجلات الموافقة غير قابلة للتعديل أو الحذف من قبل النظام.

6. مدة الاحتفاظ
يحدد المشغّل في إعدادات النظام مدة الاحتفاظ بكل فئة من البيانات (المستندات، والطلبات المكتملة، والحسابات، والإشعارات، وسجلات التدقيق، والنسخ الاحتياطية). الفئة التي لم تُضبط لها مدة لا تُحذف تلقائياً. لا يحذف النظام الطلبات، ولا يحذف سجلات الموافقة.

7. الدفع
لا يتضمن هذا الإصدار الدفع الإلكتروني، ولا تطلب المنصة بيانات البطاقات.

8. خياراتك
يمكنك عرض بيانات ملفك الشخصي وتحديثها من حسابك. لأي طلب آخر يخص بياناتك، مثل الاطلاع عليها أو تصحيحها أو حذفها، تواصل مع المشغّل عبر القنوات المنشورة في صفحة «تواصل معنا». لا يوفّر هذا الإصدار حذف الحساب ذاتياً.

9. النسخ
لكل نسخة من هذه السياسة رقم نسخة وتاريخ سريان. تُنشر كل نسخة جديدة كسجل جديد وتُحفظ النسخ السابقة، وتُسجَّل النسخة السارية وقت تقديم طلبك مع موافقتك.

10. بنود تُستكمل قبل الاعتماد
يؤكد المالك والمستشار القانوني الهوية القانونية للمشغّل، وجهة التواصل لطلبات حماية البيانات، والأساس القانوني للمعالجة، وموقع الخوادم والنسخ الاحتياطية. هذه البنود لم تحسمها هذه المسودة.

## English — Privacy Policy

This is a draft. It describes how the Khalsni platform handles personal data as the system works in this release. It must be reviewed and approved by the owner and a legal advisor before it is relied on in production.

1. Who operates the platform
Khalsni is run by the platform operator. The operator's published contact details are on the Contact page. The owner adds the operator's legal name and registered address before approval.

2. Data the platform collects
• When you create an account: your full name, email address, mobile phone number and password. A national ID number is optional. Your password is stored only as a one-way hash.
• When you submit a service request: the service, your name, phone number and city, an optional national ID number, your notes, your answers to the service's form questions, and the documents you upload.
• Your acceptance of the consent statement on the request form: which statement you accepted (its version and exact text), the language, whether it came from the website or the mobile app, the time, and the versions of this Privacy Policy and of the Terms of Use published at that time.
• Messages you send from the public site (the contact form or a request for a service that is not listed): your name, phone number, optional email address and message.
• Security records: the time and IP address of sign-ins, password-reset requests, and an audit log of sensitive actions (for example status changes, document reviews and administrative changes), which may include the IP address and the browser or app identifier.

3. How the data is used
• To review, process and complete the service you request.
• To inform you about the progress of your request and about any missing documents through notifications inside your account.
• To send account emails: a password-reset link when you ask for one, and a confirmation when your password is changed. The platform does not send text (SMS) or WhatsApp messages in this release.
• To protect accounts and keep a record of sensitive actions.

4. Who can see your data
• You: your account, your requests, the documents you uploaded and the results delivered to you.
• Platform staff (administrators, employees and support) see the requests and documents their role needs; access is controlled by role-based permissions.
• The service provider assigned to your request sees only what is needed to carry it out: the request number, the service, the city, the status, the request notes and form answers, the instructions given by staff, and the documents made available for that request. The provider's screens do not show your name, phone number, email address or national ID number.
• Anyone who has both the request number and the phone number of the request can see its status on the public tracking page.
• To complete a government or administrative service, staff or the assigned provider may need to present your details and documents to the authority responsible for that service.
• The platform has no other built-in feature that shares your data with third parties.

5. Storage and security
• Uploaded documents are kept in the platform's file storage on the servers chosen by the operator. They can be downloaded only by authorised accounts or through a signed, short-lived link.
• A document deleted in the platform is hidden from everyone; the stored file is kept until a retention period configured by the operator removes it.
• Consent records cannot be changed or deleted by the system.

6. Retention
The operator sets in the system configuration how long each category of data is kept (documents, completed requests, accounts, notifications, audit records and backups). A category without a configured period is not removed automatically. The system does not delete requests and does not delete consent records.

7. Payments
This release does not take online payments, and the platform does not ask for card details.

8. Your choices
You can view and update your profile details in your account. For any other request about your data, such as access, correction or deletion, contact the operator through the channels published on the Contact page. This release does not offer self-service account deletion.

9. Versions
Each version of this policy has a version label and an effective date. A new version is published as a new record, previous versions are kept, and the version in force when you submit a request is recorded with your consent.

10. To be completed before approval
The owner and the legal advisor confirm the operator's legal identity, the contact for data-protection requests, the legal basis for processing, and where the servers and backups are located. This draft does not decide them.
