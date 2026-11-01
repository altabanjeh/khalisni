# Terms of Use / شروط الاستخدام — DRAFT 2026-11-01-draft

> **REQUIRES OWNER/LEGAL CONTENT APPROVAL BEFORE PRODUCTION**
>
> مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد
>
> Draft — requires owner/legal approval before production

| Field | Value |
|---|---|
| kind | `terms` |
| version | `2026-11-01-draft` |
| effective_date | `2026-11-01` |
| approval_status | `draft_requires_approval` |
| Source of truth | `LegalDocument` rows seeded by `backend/public_site/migrations/0011_seed_legal_document_drafts.py`; served at `GET /api/public-site/legal/terms/` |

This text was written from what the code does in this release (registration, order submission, uploads,
consent evidence, role-based access, in-app notifications, password-reset/changed emails, file storage,
no online payment). It does not state retention periods (they are set by the operator per configuration,
`python manage.py retention_report --show-policy`) and it makes no commitment the system does not implement.
Section 10 lists the points only the owner and the legal advisor can decide. Approving a version is recorded
in the admin legal editor (approval note + approver + time) and published as a new version.

## العربية — شروط الاستخدام

هذه مسودة. تصف شروط استخدام منصة خلصني كما يعمل النظام في هذا الإصدار، ويجب أن يراجعها المالك والمستشار القانوني ويعتمداها قبل الاعتماد عليها في بيئة التشغيل.

1. الخدمة
تتيح منصة خلصني للعملاء طلب الخدمات الحكومية والإدارية، ورفع المستندات المطلوبة، ومتابعة تقدّم كل طلب، واستلام النتيجة. يراجع فريق المنصة كل طلب، وقد يُعيَّن مزوّد خدمة لتنفيذ العمل.

2. حسابك
• أدخل بيانات صحيحة عند التسجيل وحافظ على تحديثها.
• حافظ على سرية كلمة المرور، فأي نشاط يتم من حسابك يُعدّ صادراً عنك.
• يحق للمشغّل إيقاف الحساب الذي يُستخدم بما يخالف هذه الشروط.

3. تقديم الطلب
• لا يُقدَّم الطلب إلا بعد موافقتك على نص الموافقة في نموذج الطلب.
• قدّم معلومات صحيحة، ولا ترفع إلا مستندات أصلية يحق لك تقديمها.
• قد يطلب منك الفريق مستندات ناقصة أو أوضح، ويصلك ذلك كإشعار داخل حسابك.
• قد يُرفض الطلب أو يُلغى، ويُسجَّل السبب ويُعرض لك.

4. الأسعار والدفع
معلومات السعر المعروضة للخدمة هي المعلومات المنشورة على المنصة في حينه. لا يتضمن هذا الإصدار الدفع الإلكتروني، ويبلغك المشغّل بطريقة الدفع.

5. المدد
المدد المعروضة للخدمات مدد متوقعة، وقد تختلف المدة الفعلية بحسب الجهة المختصة بالخدمة والمستندات المقدَّمة.

6. النتائج
عند اكتمال الطلب تتاح النتيجة في حسابك وتظهر حالته في صفحة التتبع.

7. الاستخدام المقبول
لا تستخدم المنصة لأغراض مخالفة للقانون، ولا ترفع مستندات مزوّرة أو مضللة، ولا تحاول الوصول إلى بيانات لا تخصك.

8. الخصوصية
توضح سياسة الخصوصية كيفية التعامل مع البيانات الشخصية، وهي جزء من هذه الشروط.

9. النسخ
لكل نسخة من هذه الشروط رقم نسخة وتاريخ سريان. تُنشر كل نسخة جديدة كسجل جديد وتُحفظ النسخ السابقة، وتُسجَّل النسخة السارية وقت تقديم طلبك مع موافقتك.

10. بنود تُستكمل قبل الاعتماد
يحدد المالك والمستشار القانوني الهوية القانونية للمشغّل، والقانون الواجب التطبيق، والمسؤولية، وآلية الشكاوى، وأي قواعد للاسترداد. هذه البنود لم تحسمها هذه المسودة.

## English — Terms of Use

This is a draft. It describes the terms for using the Khalsni platform as the system works in this release. It must be reviewed and approved by the owner and a legal advisor before it is relied on in production.

1. The service
Khalsni lets customers request government and administrative services, upload the required documents, follow the progress of each request and receive the result. Platform staff review each request, and a service provider may be assigned to carry out the work.

2. Your account
• Provide accurate details when you register and keep them up to date.
• Keep your password confidential. Activity carried out with your account is treated as yours.
• The operator may deactivate an account that is used in breach of these terms.

3. Submitting a request
• A request is submitted only after you accept the consent statement on the request form.
• Provide correct information, and upload only genuine documents that you are entitled to submit.
• Staff may ask you for missing or clearer documents; you are told through a notification inside your account.
• A request may be rejected or cancelled; the reason is recorded and shown to you.

4. Prices and payment
The price information shown for a service is the information published on the platform at the time. This release does not take online payments; the operator tells you how payment is made.

5. Timelines
Durations shown for services are expected durations. The actual time can vary with the authority responsible for the service and with the documents provided.

6. Results
When a request is completed, the result is made available in your account and its status appears on the tracking page.

7. Acceptable use
Do not use the platform for unlawful purposes, do not upload forged or misleading documents, and do not try to access data that does not belong to you.

8. Privacy
How personal data is handled is described in the Privacy Policy, which forms part of these terms.

9. Versions
Each version of these terms has a version label and an effective date. A new version is published as a new record, previous versions are kept, and the version in force when you submit a request is recorded with your consent.

10. To be completed before approval
The owner and the legal advisor set the operator's legal identity, the governing law, liability, complaints handling and any refund rules. This draft does not decide them.
