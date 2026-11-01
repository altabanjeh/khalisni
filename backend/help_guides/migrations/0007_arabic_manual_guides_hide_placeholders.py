"""D03 / C6 (option B now, then A): help content customers see is Arabic and real.

1. Screenshot placeholders ("Screenshot required: …", no image and no static
   path) are unpublished (``is_active=False``); they are kept so an admin can
   attach the real image later and re-activate them.
2. The three English-only guides seeded by ``help_guides.0004`` get Arabic
   content (a faithful translation of the English text). A guide is only
   rewritten while its title is still the seeded English title, so an admin's
   later edit is never overwritten.
3. The internal "How to Add Screenshots" guide stays restricted to admins
   (role ``admin`` + ``help_guides.manage_help_guides``).

Idempotent; reverse is a no-op.
"""

from django.db import migrations
from django.db.models import Q

PLACEHOLDER_PREFIX = "Screenshot required"

ARABIC_GUIDES = {
    ("manual_navigation", "all_users", "How to Navigate the System"): {
        "title": "كيفية التنقل في النظام",
        "short_description": "دليل عملي لتخطيط لوحة التحكم والقوائم والجداول والإجراءات ورسائل التحقق وتسميات الحالة.",
        "purpose": "استخدم هذا الدليل لفهم أنماط الاستخدام المشتركة في نظام خلّصني قبل البدء بالعمل الخاص بدورك.",
        "before_you_start": (
            "سجّل الدخول بالحساب المخصص لك.\n"
            "تأكد من فتح البوابة الصحيحة لدورك.\n"
            "استخدم زر المساعدة في الأعلى كلما كانت الصفحة الحالية غير واضحة."
        ),
        "step_by_step_guide": (
            "1. افتح لوحة التحكم واقرأ بطاقات الملخص لمعرفة حجم العمل الحالي.\n"
            "2. استخدم القائمة الجانبية للتنقل بين لوحات التحكم والقوائم والتقارير وصفحات الإعدادات.\n"
            "3. استخدم الشريط العلوي للإشعارات وفتح الدليل والعودة إلى الموقع العام.\n"
            "4. استخدم مربعات البحث والفلاتر قبل فتح السجلات عندما تحتوي القائمة على صفوف كثيرة.\n"
            "5. افتح السجل من صف الجدول أو من زر الإجراء، ثم راجع شارة الحالة قبل تنفيذ أي إجراء.\n"
            "6. استخدم أزرار الإجراءات الرئيسية للإنشاء أو الحفظ أو الإسناد أو طلب الوثائق أو الإكمال أو الرفض حسب الصفحة.\n"
            "7. اقرأ رسائل التحقق أسفل الحقل مباشرة، وصحّح المدخلات، ثم احفظ مرة أخرى.\n"
            "8. تأكد من نجاح كل إجراء من الحالة المحدّثة أو صف الجدول بعد التحديث أو رسالة النجاح."
        ),
        "when_to_use": "افتح هذا الدليل عندما يكون المستخدم جديداً على النظام أو يحتاج إلى تعريف سريع قبل اتباع دليل سير عمل.",
        "main_workflow": "التنقل والتعريف بالنظام",
        "expected_result": (
            "تتنقل بين الشاشات الرئيسية بثقة.\n"
            "تقرأ صفوف الجداول وتسميات الحالة وأزرار الإجراءات بشكل صحيح.\n"
            "تعرف إن كانت العملية قد نجحت أو فشلت."
        ),
        "common_errors": (
            "فتح بوابة غير مناسبة للدور الحالي.\n"
            "تجاهل الحالة الحالية قبل الضغط على زر الإجراء.\n"
            "تغيير الفلاتر دون مسح نص البحث السابق."
        ),
        "next_step": "افتح دليل الشاشة أو سير العمل الذي تحتاجه بعد ذلك.",
        "troubleshooting": (
            "إذا لم يظهر زر ما، فتحقق أولاً من دورك وصلاحياتك.\n"
            "إذا ظهر الجدول فارغاً، فامسح الفلاتر وحاول مرة أخرى.\n"
            "إذا لم تتحدث الصفحة بعد الحفظ، فحدّث العرض الحالي وتأكد من استجابة الخادم."
        ),
        "search_keywords": "تنقل لوحة التحكم القائمة الجانبية الشريط العلوي بحث فلتر حالة جداول أزرار رسائل التحقق navigate dashboard sidebar search filter status",
    },
    ("manual_account_access", "all_users", "Login and Account Access"): {
        "title": "تسجيل الدخول والوصول إلى الحساب",
        "short_description": "كيفية تسجيل الدخول واستعادة الوصول وتحديث بيانات الدخول بأمان.",
        "purpose": "يشرح هذا الدليل كيف يدخل المستخدمون إلى النظام، وكيف يتعاملون مع مشكلات الوصول الشائعة، ويعودون إلى العمل بسرعة.",
        "before_you_start": (
            "جهّز بريدك الإلكتروني وكلمة المرور.\n"
            "استخدم صفحة تسجيل الدخول الصحيحة للنظام.\n"
            "تأكد من قدرتك على الوصول إلى البريد الإلكتروني المستخدم لإعادة تعيين كلمة المرور."
        ),
        "step_by_step_guide": (
            "1. افتح صفحة تسجيل الدخول وأدخل بريدك الإلكتروني وكلمة المرور.\n"
            "2. اضغط «تسجيل الدخول» وانتظر حتى ينقلك النظام إلى لوحة التحكم المناسبة.\n"
            "3. إذا كانت بيانات الدخول غير صحيحة، فاقرأ رسالة الخطأ وصحّح البريد الإلكتروني أو كلمة المرور.\n"
            "4. استخدم «نسيت كلمة المرور» عندما لا تستطيع الدخول بكلمة المرور الحالية.\n"
            "5. افتح رابط إعادة التعيين من البريد الإلكتروني، وعيّن كلمة مرور جديدة، ثم سجّل الدخول مرة أخرى.\n"
            "6. بعد تسجيل الدخول، افتح صفحة ملفك الشخصي إذا احتجت إلى مراجعة بياناتك المحفوظة."
        ),
        "when_to_use": "استخدم هذا الدليل لتسجيل الدخول لأول مرة، وحالات كلمة المرور الخاطئة، وإعادة تعيين كلمة المرور، وأسئلة الوصول إلى الملف الشخصي.",
        "main_workflow": "تسجيل الدخول والوصول إلى الملف الشخصي",
        "expected_result": (
            "يصل المستخدم إلى لوحة التحكم المناسبة بعد تسجيل الدخول.\n"
            "تعيد إعادة تعيين كلمة المرور المستخدم إلى تسجيل دخول يعمل."
        ),
        "common_errors": (
            "إدخال كلمة مرور قديمة بعد إعادة تعيينها.\n"
            "استخدام بريد إلكتروني لا يطابق الحساب المسجل.\n"
            "فتح رابط إعادة تعيين منتهي الصلاحية."
        ),
        "next_step": "بعد تسجيل الدخول، افتح دليل التنقل الخاص بدورك أو دليل الشاشة الحالية.",
        "troubleshooting": (
            "إذا فشل تسجيل الدخول مراراً، فتحقق من البريد الإلكتروني أولاً.\n"
            "إذا لم تصل رسالة إعادة التعيين، فتحقق من مجلد الرسائل غير المرغوب فيها.\n"
            "إذا انتهت صلاحية الرابط، فاطلب رابطاً جديداً واستخدم أحدث رسالة فقط."
        ),
        "search_keywords": "تسجيل الدخول نسيت كلمة المرور إعادة تعيين كلمة المرور الحساب الملف الشخصي login forgot password reset account profile",
    },
    ("manual_add_screenshots", "admin", "How to Add Screenshots to the Manual"): {
        "title": "كيفية إضافة لقطات الشاشة إلى الدليل",
        "short_description": "تعليمات داخلية لالتقاط لقطات الدليل وتسميتها وحفظها وربطها.",
        "purpose": "استخدم هذا الدليل لإبقاء مكتبة المساعدة مطابقة للواجهة الحالية واستبدال العناصر المؤقتة بلقطات شاشة حقيقية بأمان.",
        "before_you_start": (
            "تأكد من وجود الدليل المستهدف في إدارة دليل المستخدم.\n"
            "التقط الحالة النهائية المعتمدة من الواجهة فقط.\n"
            "فضّل لقطات سطح المكتب الواضحة ما لم يكن سير العمل خاصاً بالجوال."
        ),
        "step_by_step_guide": (
            "1. افتح الصفحة أو النافذة التي تشرحها خطوة الدليل.\n"
            "2. التقط الشاشة بعرض سطح مكتب واضح مع إبقاء منطقة الإجراء الرئيسية ظاهرة.\n"
            "3. احفظ الملف في static/manual/screenshots/ ضمن المجلد المناسب مثل admin أو customer أو employee أو reports أو settings.\n"
            "4. استخدم صيغة التسمية manual_<role>_<module>_<step_number>_<short_description>.png.\n"
            "5. في إدارة دليل المستخدم، افتح قسم لقطات الشاشة وأنشئ سجل اللقطة للدليل المستهدف أو عدّله.\n"
            "6. ارفع الملف أو حدّد المسار الثابت، ثم أضف تعليقاً ومرجع الخطوة.\n"
            "7. استبدل أي عنصر مؤقت قديم بعد التأكد من ظهور الصورة الجديدة بشكل صحيح في الدليل.\n"
            "8. راجع الدليل من لوحة الدليل الظاهرة للمستخدمين بعد أي تغيير في الواجهة."
        ),
        "when_to_use": "استخدم هذا الدليل كلما تغيرت الواجهة، أو بقي عنصر مؤقت، أو احتاج دليل جديد إلى صور.",
        "main_workflow": "صيانة الدليل",
        "expected_result": (
            "تُحفظ لقطات الشاشة بأسماء متسقة.\n"
            "تعرض صفحات الدليل الصورة الصحيحة مع التعليق الصحيح.\n"
            "تُزال العناصر المؤقتة القديمة بعد إضافة لقطات حقيقية."
        ),
        "common_errors": (
            "حفظ لقطات الشاشة في مجلد خاطئ.\n"
            "استخدام أسماء ملفات لا تصف الدور والوحدة والخطوة.\n"
            "إبقاء عنصر مؤقت مفعّلاً بعد إضافة لقطة حقيقية."
        ),
        "next_step": "افتح لوحة الدليل الظاهرة للمستخدمين وتحقق من اللقطة في الدليل المنشور.",
        "troubleshooting": (
            "إذا لم تظهر اللقطة، فتأكد من صحة الملف المرفوع أو المسار الثابت.\n"
            "إذا كانت الصورة قديمة، فاستبدلها وراجع الدليل المرتبط فوراً.\n"
            "إذا تغير التخطيط، فأعد التقاط الشاشة قبل نشر الدليل."
        ),
        "search_keywords": "الدليل لقطات الشاشة عنصر مؤقت صورة تسمية رفع صيانة دليل المساعدة manual screenshots placeholder upload",
    },
}

INTERNAL_GUIDE_KEY = ("manual_add_screenshots", "help_guides.manage_help_guides")


def forwards(apps, schema_editor):
    HelpGuide = apps.get_model("help_guides", "HelpGuide")
    HelpGuideScreenshot = apps.get_model("help_guides", "HelpGuideScreenshot")

    placeholders = HelpGuideScreenshot._base_manager.filter(
        is_active=True,
        is_deleted=False,
        placeholder_label__startswith=PLACEHOLDER_PREFIX,
        static_path="",
    ).filter(Q(image="") | Q(image__isnull=True))
    placeholders.update(is_active=False)

    for (screen_key, role, english_title), content in ARABIC_GUIDES.items():
        HelpGuide._base_manager.filter(screen_key=screen_key, role=role, title=english_title).update(**content)

    screen_key, permission_key = INTERNAL_GUIDE_KEY
    HelpGuide._base_manager.filter(screen_key=screen_key).exclude(role="admin", permission_key=permission_key).update(
        role="admin", permission_key=permission_key
    )


class Migration(migrations.Migration):
    dependencies = [
        ("help_guides", "0006_helpguide_delete_reason_helpguide_deleted_at_and_more"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
