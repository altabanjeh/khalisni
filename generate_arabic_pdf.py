#!/usr/bin/env python3
"""
Khalisni Arabic User Manual — PDF Generator
Produces: d:\ghassan\Khalisni_User_Manual_AR.pdf
Uses: reportlab + arabic_reshaper + python-bidi + Pillow
"""

import os, re, textwrap
from PIL import Image as PILImage
import arabic_reshaper
from bidi.algorithm import get_display

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
    Table, TableStyle, HRFlowable, PageBreak, KeepTogether,
    BaseDocTemplate, Frame, PageTemplate
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle

# ─── Paths ────────────────────────────────────────────────
MANUAL_MD  = r"d:\ghassan\Khalisni_User_Manual_AR.md"
IMG_DIR    = r"d:\ghassan\user image"
OUTPUT_PDF = r"d:\ghassan\Khalisni_User_Manual_AR.pdf"
FONT_REG   = r"C:\Windows\Fonts\trado.ttf"
FONT_BOLD  = r"C:\Windows\Fonts\tradbdo.ttf"

# ─── Colors ───────────────────────────────────────────────
C_BLUE        = HexColor('#1A56DB')
C_DARK        = HexColor('#1E293B')
C_LIGHT_BLUE  = HexColor('#EFF6FF')
C_GREY        = HexColor('#64748B')
C_GREEN       = HexColor('#059669')
C_WARN_BG     = HexColor('#FFFBEB')
C_WARN_BORDER = HexColor('#F59E0B')
C_TABLE_HEAD  = HexColor('#1E3A5F')
C_TABLE_ALT   = HexColor('#F8FAFC')
C_TABLE_BRD   = HexColor('#CBD5E1')
C_HR          = HexColor('#E2E8F0')
C_CHAPTER_BG  = HexColor('#1A56DB')
C_COVER_BG    = HexColor('#0F172A')

# ─── Section → screenshot mapping ────────────────────────
# Each entry: list of (screenshot_number, arabic_caption) tuples.
# ALL captions verified by actually viewing each screenshot.
IMG_MAP = {
    # ── Chapter 4: Customer (screenshots 232–236 only) ──
    "4.1": [
        (232, "لوحة تحكم العميل — ترى هنا ملخص طلباتك وآخر الإشعارات. الشريط البرتقالي تحذير: لديك طلب يحتاج وثائق إضافية منك الآن"),
    ],
    "4.5": [
        (233, "نموذج طلب جديد — الخطوة 1: اختر تصنيف الخدمة، والخطوة 2: اختر الخدمة وأدخل بياناتك الأساسية"),
        (234, "اختيار التصنيف — القائمة تعرض جميع أنواع الخدمات المتاحة مثل الأحوال المدنية والجوازات والخدمات البلدية"),
        (235, "بيانات الطلب — بعد اختيار الخدمة تأكد من صحة اسمك ورقم هاتفك ثم انتقل للخطوة الثالثة"),
    ],
    "4.6": [
        (236, "الخطوة 3 — ارفع الوثائق المطلوبة (PDF/PNG/JPG/DOCX)، أضف ملاحظاتك، وافق على الشروط، ثم اضغط إرسال الطلب"),
    ],
    # ── Chapter 5: Employee (screenshots 223–229) ──
    "5.1": [
        (223, "لوحة عمل الموظف — ترى هنا عدد الطلبات الجديدة وقيد المراجعة والمنجزة والعاجلة دفعةً واحدة"),
    ],
    "5.2": [
        (224, "طلبات المراجعة — أدوات التصفية في الأعلى تساعدك على تضييق القائمة حسب الأولوية أو الخدمة أو التاريخ"),
        (225, "نتائج قائمة المراجعة — كل طلب يظهر مع رقمه واسم العميل واسم الخدمة ومستوى الأولوية والتاريخ"),
    ],
    "5.5": [
        (228, "قائمة وثائق الطلب — تظهر كل وثيقة مع حالتها: قيد الانتظار أو موافق عليها أو مرفوضة"),
    ],
    "5.15": [
        (229, "تقرير المراجعة — إحصائيات تفصيلية عن الطلبات المنجزة وقيد المراجعة والمعيّنة والمرفوضة"),
    ],
    "5.16": [
        (226, "طلبات الخدمات غير الموجودة — خدمات طلبها المواطنون ولا تتوفر بعد في المنصة، قائمة فارغة حالياً"),
        (227, "تصفية الخدمات غير الموجودة — استخدم قائمة 'كل الطلبات' للبحث حسب نوع الطلب أو حالته"),
    ],
    # ── Chapter 6: Provider (screenshots 230–231) ──
    "6.1": [
        (230, "لوحة تحكم مزود الخدمة — ملخص سريع لجميع الطلبات المعيّنة لك: جديدة، قيد التنفيذ، منجزة"),
    ],
    "6.2": [
        (231, "الطلبات المعيّنة — قائمة بجميع الطلبات الموكلة إليك، ابدأ بالأقدم وافتح كل طلب لتنفيذه"),
    ],
    # ── Chapter 7: Admin (screenshots 156–210) ──
    # 7.2 — Admin orders management
    "7.2": [
        (156, "إدارة الطلبات الحالية — المشرف يرى جميع الطلبات مرتبةً مع اسم الخدمة والعميل والحالة والأولوية"),
    ],
    # 7.3 — Rule Management overview (all tabs)
    "7.3": [
        (157, "مركز إدارة القواعد — جميع إعدادات المنصة في مكان واحد: الخدمات، الوثائق، المزودون، الإشعارات، وأكثر"),
    ],
    # 7.3.1 — Services and pricing list
    "7.3.1": [
        (158, "قائمة الخدمات والأسعار — جميع الخدمات المتاحة مع أسعارها ومدتها الزمنية وحالتها"),
        (183, "إدارة الخدمات — نظرة شاملة على الخدمات مع عمودي الفئات والمتطلبات وإمكانية تعديل كل خدمة"),
    ],
    # 7.3.2 — Create new service (3 screenshots, 3 parts of the same form)
    "7.3.2": [
        (159, "نموذج إنشاء خدمة جديدة — الجزء الأول: أدخل اسم الخدمة بالعربية والإنجليزية والسعر الأساسي"),
        (160, "نموذج الخدمة — الجزء الثاني: الرسوم الإضافية، وحدة المدة (أيام)، المدة المتوقعة، الوصف"),
        (161, "نموذج الخدمة — الجزء الثالث: فعّل 'يتطلب مزوداً' و'يتطلب مراجعة موظف' وحالة الخدمة، ثم احفظ"),
    ],
    # 7.3.5 — Document rules (3 screenshots)
    "7.3.5": [
        (162, "قاعدة وثيقة جديدة — الجزء الأول: اختر الخدمة وأدخل اسم الوثيقة بالعربية والإنجليزية"),
        (163, "قاعدة الوثيقة — الجزء الثاني: حدد الحجم الأقصى للملف وما إذا كانت الوثيقة إلزامية وتحتاج تحقق"),
        (164, "قاعدة الوثيقة — الجزء الثالث: هل يمكن للعميل استبدال الملف؟ هل يرى المزود هذه الوثيقة؟"),
    ],
    # 7.3.6 — Provider assignment rules
    "7.3.6": [
        (165, "قاعدة تعيين مزود — اربط مزوداً معتمداً بخدمة محددة حتى يُعيَّن لها تلقائياً عند ورود الطلبات"),
    ],
    # 7.3.8 — Notification templates (4 screenshots)
    "7.3.8": [
        (166, "قوالب الإشعارات — قائمة القوالب الجاهزة. كل قالب يُرسل رسالة تلقائية عند حدث معين في المنصة"),
        (167, "إنشاء قالب إشعار — الجزء الأول: مفتاح القالب والقناة (نظام) والعنوان والرسالة بالعربية"),
        (168, "إنشاء قالب إشعار — الجزء الثاني: استكمال الرسالة العربية والمتغيرات المسموح بها والعنوان الإنجليزي"),
        (169, "إنشاء قالب إشعار — الجزء الثالث: الرسالة الإنجليزية وتفعيل القالب ثم اضغط حفظ القالب"),
    ],
    # 7.3.9 — Payments
    "7.3.9": [
        (170, "إدارة المدفوعات — سجل مدفوعات الطلبات. السجلات تُنشأ تلقائياً، ولا يمكن تعديل المعاملات المالية يدوياً"),
    ],
    # 7.3.10 — System settings (4 screenshots)
    "7.3.10": [
        (176, "إعداد نظام جديد — الجزء الأول: اختر نوع الإعداد (مثل صفحة الموقع) والعنوان الرئيسي"),
        (177, "إعداد النظام — الجزء الثاني: النص التوضيحي وملاحظة داخلية للمشرف وسبب تغيير هذا الإعداد"),
        (178, "نموذج إعداد نظام بالعربية — حدد المفتاح ومحتوى الصفحة الرئيسية: العنوان الرئيسي والنص الترويجي"),
        (179, "إعداد النظام — محتوى الصفحة الرئيسية: العنوان، النص الترويجي، وأزرار الإجراء الرئيسية والثانوية"),
    ],
    # 7.3.11 — Audit logs (2 screenshots)
    "7.3.11": [
        (174, "سجل التدقيق — فلتر حسب المستخدم أو الوحدة أو الإجراء أو التاريخ للعثور على أي حدث محدد"),
        (175, "نتائج سجل التدقيق — كل سجل يعرض التاريخ والرسالة والنتيجة (نجاح/فشل) والإجراء والمستخدم"),
    ],
    # 7.3.12 — Users and roles (5 screenshots)
    "7.3.12": [
        (171, "قائمة المستخدمين والأدوار — جميع المستخدمين مع أدوارهم وحالات حساباتهم وإمكانية التعديل"),
        (172, "مستخدم جديد — الجزء الأول: الاسم الكامل والبريد الإلكتروني ورقم الهاتف وكلمة المرور"),
        (173, "مستخدم جديد — الجزء الثاني: الدور (عميل/موظف/مزود/دعم) ورقم الهوية وتفعيل الحساب والتحقق"),
        (204, "صفحة المستخدمين والأدوار — نظرة شاملة على جميع المستخدمين مع أزرار التعديل والتعطيل"),
        (205, "نموذج إضافة مستخدم جديد — أدخل البيانات واختر الدور المناسب ثم اضغط إضافة المستخدم"),
    ],
    # 7.4 — Service categories (5 screenshots)
    "7.4": [
        (180, "تصنيفات الخدمات — جميع التصنيفات الحالية مثل 'الأحوال المدنية والجوازات' و'تسجيل العقارات'"),
        (181, "تصنيف خدمات جديد — الجزء الأول: الاسم بالإنجليزية والعربية والتصنيف الأب والمعرّف والأيقونة"),
        (182, "تصنيف الخدمات — الجزء الثاني: الأيقونة والوصف وترتيب العرض وهل يظهر في الموقع العام"),
        (184, "فئة جديدة (بالعربية) — أدخل الاسم والمعرّف ورقم الهاتف والأوصاف بالعربية والإنجليزية"),
        (185, "تكملة نموذج الفئة — استكمال الأوصاف وترتيب العرض وتفعيل الفئة ثم اضغط إضافة الفئة"),
    ],
    # 7.5 — Service relations (3 screenshots)
    "7.5": [
        (186, "إدارة علاقات الخدمات — أربعة أنواع: بديلة، إضافية، موصى بها بعد الإنجاز، ومطلوبة قبل التقديم"),
        (187, "علاقة خدمة جديدة — الجزء الأول: اختر الخدمة المصدر والخدمة الهدف والتصنيفات ونوع العلاقة"),
        (188, "علاقة الخدمة — الجزء الثاني: حدد إذا كانت إلزامية، أضف رسالة للعميل، ثم فعّل العلاقة واحفظ"),
    ],
    # 7.6 — Providers management (3 screenshots)
    "7.6": [
        (206, "صفحة المزودين — جميع مزودي الخدمة المسجّلين مع مناطقهم وخدماتهم وحالات حساباتهم"),
        (207, "مزود جديد — الجزء الأول: الاسم والبريد الإلكتروني وكلمة المرور ونوع المزود والعنوان التجاري"),
        (208, "مزود جديد — الجزء الثاني: اختر الخدمات المتاحة للمزود وفعّل الحساب وصلاحية التعيين التلقائي"),
    ],
    # 7.7 — Provider service assignments
    "7.7": [
        (209, "ربط مزود بخدمة — اختر المزود والخدمة ثم اضغط 'ربط الخدمة' لتفعيل التعيين التلقائي"),
    ],
    # 7.8 — Admin missing service requests
    "7.8": [
        (202, "طلبات الخدمات غير الموجودة (المشرف) — قائمة فارغة تظهر عند عدم وجود خدمات مفقودة مبلَّغ عنها"),
        (203, "قسم الخدمات الجديدة المقترحة — الخدمات التي طلبها المواطنون ولا تتوفر بعد في المنصة"),
    ],
    # 7.9 — Public site management overview
    "7.9": [
        (189, "إدارة الموقع العام — أربع أدوات: محرر الصفحة الرئيسية، إدارة الإعلانات، معاينة الصفحة، وإعدادات المظهر"),
    ],
    # 7.9.1 — Homepage content editor (4 screenshots)
    "7.9.1": [
        (190, "محرر محتوى الصفحة الرئيسية — عدّل قسم Hero وقسم 'كيف يعمل' مع معاينة النص بالعربية والإنجليزية"),
        (191, "محرر الصفحة — قسم Hero الثانوي: الأزرار والروابط والعناوين الفرعية بكلتا اللغتين"),
        (192, "محرر الصفحة — قسم التواصل والتذييل: الهاتف والواتساب والبريد والعنوان وصور Hero"),
        (193, "حفظ محتوى الصفحة — بعد إدخال جميع البيانات اضغط 'حفظ المحتوى' لتطبيق التغييرات على الموقع"),
    ],
    # 7.9.2 — Advertisement manager (6 screenshots)
    "7.9.2": [
        (194, "مدير الإعلانات — قائمة الإعلانات والبانرات النشطة مع تاريخ كل منها وزر إضافة إعلان جديد"),
        (195, "إعلان جديد — الجزء الأول: العنوان والوصف بالعربية والإنجليزية"),
        (196, "إعلان جديد — الجزء الثاني: الوصف الإنجليزي ونوع الإعلان (عام) وصورة الإعلان"),
        (197, "إعلان جديد — الجزء الثالث: نص زر الإجراء بالعربية والإنجليزية ورابط الزر وألوان النص والخلفية"),
        (198, "إعلان جديد — الجزء الرابع: ترتيب العرض وتاريخ بداية الإعلان وتاريخ انتهائه"),
        (199, "إعلان جديد — الجزء الأخير: تأكيد التواريخ وتفعيل الإعلان ثم اضغط 'إضافة الإعلان' للحفظ"),
    ],
    # 7.9.3 — Theme settings (2 screenshots)
    "7.9.3": [
        (200, "إعدادات المظهر — غيّر الشعار واسم المنصة والألوان الأساسية والثانوية ولون النص والخلفية"),
        (201, "معاينة المظهر — شاهد كيف تبدو الألوان في الشريط والأزرار والتذييل قبل الضغط على حفظ"),
    ],
    # 7.10 — Help guides
    "7.10": [
        (210, "إضافة لقطة شاشة لدليل المساعدة — أدخل ملخصاً تعريفياً وارفع صورة توضيحية لمساعدة المستخدمين"),
    ],
}

EMOJI_MAP = {
    '✅': '(v)', '❌': '(x)', '⚠️': '(!)', '💡': '*', '📌': '*',
    '🔴': '*', '🟡': '*', '🟢': '*', '📋': '*', '🔒': '*',
    '📁': '[ملف]', '📎': '-', '📧': '[بريد]', '🖊': '-',
    '⚙': '', '📊': '[تقرير]', '💬': '[رسالة]', '🔔': '[إشعار]',
    '👤': '[مستخدم]', '🏢': '[مبنى]', '🌐': '[رابط]', '📱': '[جهاز]',
    '🔑': '[مفتاح]', '💰': '[مبلغ]', '📝': '[ملاحظة]',
    # Box-drawing chars (used in flow diagrams)
    '┌': '+', '┐': '+', '└': '+', '┘': '+',
    '│': '|', '─': '-', '├': '+', '┤': '+',
    '┬': '+', '┴': '+', '┼': '+',
    # Arrows
    '↓': '|', '↑': '|', '←': '<', '→': '>',
    '⇒': '>>', '⇐': '<<',
    # Geometric shapes / symbols not in Traditional Arabic font
    '️': '',  # variation selector-16 (invisible)
    '✓': '(v)', '✗': '(x)',
    '⚠': '(!)',
    '◄': '-', '►': '-', '▸': '-', '◆': '-', '■': '-', '□': '-',
    '●': '-', '◑': '-', '○': '-', '▼': '|', '▲': '|',
}


# ─── Arabic text processing ────────────────────────────────
def clean_emoji(text):
    for ch, rep in EMOJI_MAP.items():
        text = text.replace(ch, rep)
    # Remove remaining emoji-range and unsupported symbol characters
    text = re.sub(r'[\U0001F300-\U0001FFFF]', '', text)
    text = re.sub(r'[☀-⛿]', '', text)       # misc symbols block
    text = re.sub(r'[✀-➿]', '', text)       # dingbats block
    text = re.sub(r'[◀-⧿]', '-', text)      # geometric shapes & misc math
    text = re.sub(r'[■-◿]', '-', text)  # geometric shapes block
    return text


def ar(text):
    """Reshape + bidi-apply Arabic text for correct visual rendering."""
    text = clean_emoji(text)
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


def strip_md_inline(text):
    """Remove markdown inline markers, leaving plain text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # [text](url) → text
    return text


def ar_clean(text):
    """Strip markdown inline then apply Arabic reshaping."""
    return ar(strip_md_inline(text))


def ar_bold_para(text, styles):
    """
    Build a Paragraph with bold segments handled.
    **text** → bold font face.
    """
    text = clean_emoji(text)
    # Split by bold markers
    parts = re.split(r'\*\*(.+?)\*\*', text)
    segments = []
    for i, part in enumerate(parts):
        if not part:
            continue
        clean = re.sub(r'\*(.+?)\*', r'\1', part)
        clean = re.sub(r'`(.+?)`', r'\1', clean)
        clean = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', clean)
        reshaped = arabic_reshaper.reshape(clean)
        bidi_part = get_display(reshaped)
        # Escape XML special chars
        bidi_part = bidi_part.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        if i % 2 == 1:  # bold segment
            segments.append(f'<font name="ArabicBold">{bidi_part}</font>')
        else:
            segments.append(bidi_part)
    # RTL: segments in visual order are reversed relative to logical order
    segments.reverse()
    return ''.join(segments)


# ─── Register fonts ────────────────────────────────────────
def register_fonts():
    pdfmetrics.registerFont(TTFont('Arabic', FONT_REG))
    pdfmetrics.registerFont(TTFont('ArabicBold', FONT_BOLD))


# ─── Paragraph styles ─────────────────────────────────────
def make_styles():
    base = dict(fontName='Arabic', textColor=C_DARK, leading=22,
                alignment=TA_RIGHT, rightIndent=0, leftIndent=0)

    styles = {
        'title': ParagraphStyle('title',
            fontName='ArabicBold', fontSize=28, textColor=white,
            alignment=TA_CENTER, leading=38, spaceAfter=8),

        'subtitle': ParagraphStyle('subtitle',
            fontName='Arabic', fontSize=14, textColor=HexColor('#93C5FD'),
            alignment=TA_CENTER, leading=22, spaceAfter=4),

        'h1': ParagraphStyle('h1',
            fontName='ArabicBold', fontSize=22, textColor=white,
            alignment=TA_RIGHT, leading=30, spaceBefore=0, spaceAfter=10,
            backColor=C_CHAPTER_BG,
            rightIndent=-1*cm, leftIndent=-1*cm,
            borderPad=10),

        'h2': ParagraphStyle('h2',
            fontName='ArabicBold', fontSize=17, textColor=C_DARK,
            alignment=TA_RIGHT, leading=26, spaceBefore=18, spaceAfter=8,
            borderColor=C_BLUE, borderWidth=0, leftBorderPadding=0),

        'h3': ParagraphStyle('h3',
            fontName='ArabicBold', fontSize=14, textColor=C_BLUE,
            alignment=TA_RIGHT, leading=22, spaceBefore=14, spaceAfter=6),

        'h4': ParagraphStyle('h4',
            fontName='ArabicBold', fontSize=12, textColor=C_DARK,
            alignment=TA_RIGHT, leading=20, spaceBefore=10, spaceAfter=4),

        'body': ParagraphStyle('body',
            fontName='Arabic', fontSize=11, textColor=C_DARK,
            alignment=TA_RIGHT, leading=20, spaceBefore=4, spaceAfter=6),

        'bullet': ParagraphStyle('bullet',
            fontName='Arabic', fontSize=11, textColor=C_DARK,
            alignment=TA_RIGHT, leading=20, spaceBefore=2, spaceAfter=2,
            rightIndent=18, leftIndent=0),

        'ordered': ParagraphStyle('ordered',
            fontName='Arabic', fontSize=11, textColor=C_DARK,
            alignment=TA_RIGHT, leading=20, spaceBefore=2, spaceAfter=2,
            rightIndent=18, leftIndent=0),

        'blockquote': ParagraphStyle('blockquote',
            fontName='Arabic', fontSize=10.5, textColor=HexColor('#374151'),
            alignment=TA_RIGHT, leading=19, spaceBefore=6, spaceAfter=6,
            rightIndent=10, leftIndent=10,
            backColor=C_LIGHT_BLUE,
            borderColor=C_BLUE, borderWidth=0,
            borderPad=8),

        'warn': ParagraphStyle('warn',
            fontName='Arabic', fontSize=10.5, textColor=HexColor('#92400E'),
            alignment=TA_RIGHT, leading=19, spaceBefore=6, spaceAfter=6,
            rightIndent=10, leftIndent=10,
            backColor=C_WARN_BG,
            borderPad=8),

        'table_head': ParagraphStyle('table_head',
            fontName='ArabicBold', fontSize=10, textColor=white,
            alignment=TA_CENTER, leading=16),

        'table_cell': ParagraphStyle('table_cell',
            fontName='Arabic', fontSize=10, textColor=C_DARK,
            alignment=TA_RIGHT, leading=16),

        'caption': ParagraphStyle('caption',
            fontName='Arabic', fontSize=9, textColor=C_GREY,
            alignment=TA_CENTER, leading=14, spaceBefore=2, spaceAfter=8),

        'toc_chapter': ParagraphStyle('toc_chapter',
            fontName='ArabicBold', fontSize=12, textColor=C_DARK,
            alignment=TA_RIGHT, leading=22, spaceBefore=4, spaceAfter=2),

        'toc_section': ParagraphStyle('toc_section',
            fontName='Arabic', fontSize=10.5, textColor=C_GREY,
            alignment=TA_RIGHT, leading=18, spaceBefore=1, spaceAfter=1,
            rightIndent=20),
    }
    return styles


# ─── Image helpers ─────────────────────────────────────────
PAGE_W = A4[0] - 2 * cm  # usable width

def screenshot(number, caption=None, styles=None, max_w=None, max_h=None):
    """Build flowables for a screenshot with optional caption."""
    path = os.path.join(IMG_DIR, f'Screenshot ({number}).png')
    if not os.path.exists(path):
        return []

    try:
        with PILImage.open(path) as img:
            iw, ih = img.size
    except Exception:
        return []

    max_w = max_w or PAGE_W
    max_h = max_h or 14 * cm

    scale = min(max_w / iw, max_h / ih, 1.0)
    disp_w = iw * scale
    disp_h = ih * scale

    items = [Spacer(1, 5 * mm)]

    # Wrap image + caption in a light-bordered box for visual clarity
    img_cell = RLImage(path, width=disp_w, height=disp_h, hAlign='CENTER')

    if caption and styles:
        cap_text = ar_clean(caption)
        cap_para = Paragraph(cap_text, ParagraphStyle(
            'cap_box', fontName='ArabicBold', fontSize=10,
            textColor=HexColor('#1E3A5F'), alignment=TA_CENTER,
            leading=17, spaceBefore=4, spaceAfter=0,
            backColor=HexColor('#EFF6FF')))
        box = Table(
            [[img_cell], [cap_para]],
            colWidths=[disp_w],
            hAlign='CENTER'
        )
        box.setStyle(TableStyle([
            ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX',           (0, 0), (-1, -1), 1, HexColor('#CBD5E1')),
            ('BACKGROUND',    (0, 1), (-1, 1),  HexColor('#EFF6FF')),
            ('TOPPADDING',    (0, 0), (0, 0),   4),
            ('BOTTOMPADDING', (0, 0), (0, 0),   0),
            ('LEFTPADDING',   (0, 0), (-1, -1), 4),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 4),
            ('TOPPADDING',    (0, 1), (0, 1),   5),
            ('BOTTOMPADDING', (0, 1), (0, 1),   6),
        ]))
        items.append(box)
    else:
        items.append(img_cell)

    items.append(Spacer(1, 6 * mm))
    return items


def section_screenshots(section_num, styles):
    """Return screenshot flowables for a section number if mapped.
    Each entry in IMG_MAP is a (number, caption_ar) tuple."""
    entries = IMG_MAP.get(section_num, [])
    items = []
    for entry in entries:
        if isinstance(entry, tuple):
            num, cap = entry
        else:
            num, cap = entry, None
        items.extend(screenshot(num, caption=cap, styles=styles))
    return items


# ─── Markdown block parser ─────────────────────────────────
def parse_heading_num(text):
    """Extract section number like '4.5' from '### 4.5 تقديم طلب'."""
    m = re.match(r'^#+\s+([\d]+(?:\.[\d]+)*)\b', text)
    return m.group(1) if m else None


def is_table_row(line):
    return line.strip().startswith('|') and line.strip().endswith('|')


def is_separator_row(line):
    return bool(re.match(r'^\|[-| :]+\|$', line.strip()))


def parse_table(lines):
    """Parse a markdown table into list-of-rows, skipping separator rows."""
    rows = []
    for line in lines:
        if is_separator_row(line):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        rows.append(cells)
    return rows


# ─── Build PDF ─────────────────────────────────────────────
def build_cover(story, styles):
    from reportlab.platypus import Table as RLTable, TableStyle as RLTableStyle
    story.append(Spacer(1, 3 * cm))
    # Title block
    story.append(Paragraph(ar('منصة خلّصني'), styles['title']))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(ar('دليل المستخدم الشامل'), ParagraphStyle(
        'cover_sub', fontName='ArabicBold', fontSize=20, textColor=HexColor('#93C5FD'),
        alignment=TA_CENTER, leading=28)))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(ar('لإتمام معاملاتك الحكومية والإدارية بسهولة تامة'), styles['subtitle']))
    story.append(Spacer(1, 1.5 * cm))

    # Info box
    info_data = [
        [Paragraph(ar('الإصدار'), styles['table_head']),
         Paragraph(ar('2.0'), styles['table_cell'])],
        [Paragraph(ar('التاريخ'), styles['table_head']),
         Paragraph(ar('يونيو 2026'), styles['table_cell'])],
        [Paragraph(ar('الرابط'), styles['table_head']),
         Paragraph('khalisni.raedaltabanjeh.com', styles['table_cell'])],
    ]
    t = RLTable(info_data, colWidths=[4*cm, 8*cm], hAlign='CENTER')
    t.setStyle(RLTableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#1E3A5F')),
        ('TEXTCOLOR',  (0, 0), (-1, -1), white),
        ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [HexColor('#1E3A5F'), HexColor('#2D4A6F')]),
        ('GRID',       (0, 0), (-1, -1), 0.5, HexColor('#3B5998')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(t)
    story.append(Spacer(1, 1 * cm))

    # Role badges
    roles_ar = ['العميل', 'الموظف', 'مزود الخدمة', 'المشرف', 'الدعم']
    badge_data = [[Paragraph(ar(r), ParagraphStyle('badge', fontName='ArabicBold',
        fontSize=10, textColor=white, alignment=TA_CENTER, leading=16))
        for r in roles_ar]]
    bt = RLTable(badge_data, colWidths=[3.2*cm]*5, hAlign='CENTER')
    bt.setStyle(RLTableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), C_BLUE),
        ('ALIGN',      (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4]),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#1245C0')),
    ]))
    story.append(bt)
    story.append(PageBreak())


def build_toc(story, styles):
    """Insert a visual table of contents page."""
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(ar('فهرس المحتويات'), styles['h2']))
    story.append(HRFlowable(width='100%', thickness=2, color=C_BLUE, spaceAfter=12))

    chapters = [
        ('1', 'مقدمة ونظرة عامة على المنصة'),
        ('2', 'نظرة عامة على أدوار المستخدمين'),
        ('3', 'البدء — التسجيل وتسجيل الدخول وإعداد الحساب'),
        ('4', 'دليل العميل — الدليل الكامل'),
        ('5', 'دليل الموظف — الدليل الكامل'),
        ('6', 'دليل مزود الخدمة — الدليل الكامل'),
        ('7', 'دليل المشرف — الدليل الكامل'),
        ('8', 'مرجع حالات الطلب'),
        ('9', 'الأسئلة الشائعة'),
        ('10', 'قاموس المصطلحات'),
    ]
    for num, title in chapters:
        row_text = f'{ar(title)}  {ar(num + ".")} '
        story.append(Paragraph(row_text, styles['toc_chapter']))

    story.append(PageBreak())


def build_story(styles):
    story = []
    build_cover(story, styles)
    build_toc(story, styles)

    with open(MANUAL_MD, encoding='utf-8') as f:
        lines = f.readlines()

    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')
        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            story.append(Spacer(1, 3 * mm))
            i += 1
            continue

        # ── Horizontal rule ──
        if re.match(r'^---+$', stripped):
            story.append(HRFlowable(width='100%', thickness=1,
                                    color=C_HR, spaceBefore=6, spaceAfter=6))
            i += 1
            continue

        # ── Fenced code block (```) ──
        if stripped.startswith('```'):
            # Collect all lines until closing ```
            code_lines = []
            i += 1
            while i < len(lines):
                cl = lines[i].rstrip('\n')
                if cl.strip().startswith('```'):
                    i += 1
                    break
                code_lines.append(cl)
                i += 1
            # Render as a lightly styled box — clean non-font chars, apply ar()
            for cl in code_lines:
                if cl.strip():
                    cl_clean = ar_clean(cl)
                    story.append(Paragraph(cl_clean, ParagraphStyle(
                        'code', fontName='Arabic', fontSize=9,
                        textColor=HexColor('#374151'), alignment=TA_RIGHT,
                        leading=16, backColor=HexColor('#F1F5F9'),
                        leftIndent=8, rightIndent=8, spaceBefore=1, spaceAfter=1)))
            story.append(Spacer(1, 4 * mm))
            continue

        # ── Headings ──
        m = re.match(r'^(#{1,4})\s+(.+)$', line)
        if m:
            level = len(m.group(1))
            heading_text = m.group(2).strip()
            sec_num = parse_heading_num(line)

            if level == 1:
                style_key = 'h1'
            elif level == 2:
                style_key = 'h2'
            elif level == 3:
                style_key = 'h3'
            else:
                style_key = 'h4'

            text_ar = ar_clean(heading_text)

            if level == 2 and re.match(r'^\d+\.', heading_text):
                # Major chapter heading → add page break before (except first)
                if len(story) > 10:
                    story.append(PageBreak())
                story.append(Spacer(1, 2 * mm))

                # Chapter banner
                banner = Table(
                    [[Paragraph(text_ar, ParagraphStyle('ch_banner',
                        fontName='ArabicBold', fontSize=18, textColor=white,
                        alignment=TA_RIGHT, leading=26))]],
                    colWidths=[PAGE_W],
                )
                banner.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), C_CHAPTER_BG),
                    ('TOPPADDING', (0, 0), (-1, -1), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                    ('LEFTPADDING', (0, 0), (-1, -1), 16),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 16),
                    ('ROUNDEDCORNERS', [4]),
                ]))
                story.append(banner)
                story.append(Spacer(1, 8 * mm))
            else:
                story.append(Paragraph(text_ar, styles[style_key]))

            # Insert section screenshots
            if sec_num:
                imgs = section_screenshots(sec_num, styles)
                if imgs:
                    story.extend(imgs)

            i += 1
            continue

        # ── Table ──
        if is_table_row(stripped):
            table_lines = []
            while i < len(lines) and is_table_row(lines[i].strip()):
                table_lines.append(lines[i].strip())
                i += 1
            rows = parse_table(table_lines)
            if rows:
                story.append(build_table(rows, styles))
            continue

        # ── Blockquote ──
        if stripped.startswith('>'):
            bq_text = stripped.lstrip('> ').strip()
            # Detect warning vs info
            is_warn = any(k in bq_text for k in ['تنبيه', 'تحذير', 'مهم', 'ملاحظة'])
            s = styles['warn'] if is_warn else styles['blockquote']
            story.append(Paragraph(ar_clean(bq_text), s))
            i += 1
            continue

        # ── Unordered list ──
        if re.match(r'^[-*+]\s+', stripped):
            bullet_items = []
            while i < len(lines):
                l = lines[i].strip()
                if re.match(r'^[-*+]\s+', l):
                    bullet_items.append(l[2:].strip())
                    i += 1
                elif re.match(r'^\s{2,}', lines[i]) and bullet_items:
                    # continuation indent
                    bullet_items[-1] += ' ' + l
                    i += 1
                else:
                    break
            for item in bullet_items:
                text = '- ' + ar_clean(item)
                story.append(Paragraph(text, styles['bullet']))
            continue

        # ── Ordered list ──
        if re.match(r'^\d+\.\s+', stripped):
            ol_items = []
            while i < len(lines):
                l = lines[i].strip()
                m2 = re.match(r'^(\d+)\.\s+(.+)', l)
                if m2:
                    ol_items.append((m2.group(1), m2.group(2).strip()))
                    i += 1
                else:
                    break
            for num, item in ol_items:
                text = f'{ar_clean(item)} .{num}'
                story.append(Paragraph(text, styles['ordered']))
            continue

        # ── Regular paragraph ──
        para_lines = [stripped]
        i += 1
        while i < len(lines):
            next_l = lines[i].strip()
            if not next_l:
                break
            if re.match(r'^(#{1,4}|\||>|[-*+]\s|\d+\.)', next_l):
                break
            if re.match(r'^---+$', next_l):
                break
            para_lines.append(next_l)
            i += 1

        full_text = ' '.join(para_lines)
        if full_text.strip():
            # Use bold-aware processing for paragraphs
            xml_text = ar_bold_para(full_text, styles)
            try:
                story.append(Paragraph(xml_text, styles['body']))
            except Exception:
                # Fallback: plain text if XML parsing fails
                story.append(Paragraph(ar_clean(full_text), styles['body']))

    return story


def build_table(rows, styles):
    """Build a reportlab Table from parsed markdown rows."""
    if not rows:
        return Spacer(1, 1 * mm)

    header = rows[0]
    body   = rows[1:] if len(rows) > 1 else []
    n_cols = len(header)

    # Calculate column widths
    col_w = PAGE_W / n_cols

    # Header row
    header_cells = [
        Paragraph(ar_clean(cell), styles['table_head'])
        for cell in header
    ]

    all_rows = [header_cells]
    for row_idx, row in enumerate(body):
        # Pad/trim to match column count
        row = (row + [''] * n_cols)[:n_cols]
        cells = [
            Paragraph(ar_clean(cell), styles['table_cell'])
            for cell in row
        ]
        all_rows.append(cells)

    t = Table(all_rows, colWidths=[col_w] * n_cols, repeatRows=1)

    ts = TableStyle([
        # Header
        ('BACKGROUND',    (0, 0), (-1, 0),  C_TABLE_HEAD),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  white),
        ('ALIGN',         (0, 0), (-1, 0),  'CENTER'),
        ('FONTNAME',      (0, 0), (-1, 0),  'ArabicBold'),
        ('FONTSIZE',      (0, 0), (-1, 0),  10),
        ('TOPPADDING',    (0, 0), (-1, 0),  10),
        ('BOTTOMPADDING', (0, 0), (-1, 0),  10),
        # Body
        ('BACKGROUND',    (0, 1), (-1, -1), white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, C_TABLE_ALT]),
        ('ALIGN',         (0, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME',      (0, 1), (-1, -1), 'Arabic'),
        ('FONTSIZE',      (0, 1), (-1, -1), 10),
        ('TOPPADDING',    (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
        # Grid
        ('GRID',          (0, 0), (-1, -1), 0.5, C_TABLE_BRD),
        ('BOX',           (0, 0), (-1, -1), 1.0, C_TABLE_BRD),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ])
    t.setStyle(ts)
    return t


def on_page(canvas, doc):
    """Draw page header/footer on every page."""
    canvas.saveState()
    w, h = A4

    # Header bar
    canvas.setFillColor(C_DARK)
    canvas.rect(0, h - 1.2*cm, w, 1.2*cm, fill=1, stroke=0)
    canvas.setFont('ArabicBold', 9)
    canvas.setFillColor(white)
    title_ar = ar('دليل المستخدم الشامل — منصة خلّصني')
    canvas.drawRightString(w - 1*cm, h - 0.8*cm, title_ar)

    # Footer bar
    canvas.setFillColor(C_DARK)
    canvas.rect(0, 0, w, 0.9*cm, fill=1, stroke=0)
    canvas.setFont('Arabic', 8)
    canvas.setFillColor(white)
    page_ar = ar(f'صفحة {doc.page}')
    canvas.drawCentredString(w / 2, 0.28*cm, page_ar)
    copy_ar = ar('© خلّصني 2026')
    canvas.drawRightString(w - 1*cm, 0.28*cm, copy_ar)

    canvas.restoreState()


def on_first_page(canvas, doc):
    """Cover page: dark full-page background."""
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(C_COVER_BG)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Decorative gradient bar at top
    canvas.setFillColor(C_BLUE)
    canvas.rect(0, h - 1.5*cm, w, 1.5*cm, fill=1, stroke=0)
    canvas.restoreState()


def on_later_pages(canvas, doc):
    on_page(canvas, doc)


# ─── Main ─────────────────────────────────────────────────
def main():
    print("Registering fonts...")
    register_fonts()
    styles = make_styles()

    print("Building story...")
    story = build_story(styles)

    print(f"Generating PDF -> {OUTPUT_PDF}")
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1.5*cm,
        bottomMargin=1.2*cm,
        title='دليل المستخدم الشامل — منصة خلّصني',
        author='خلّصني',
        subject='دليل المستخدم',
        creator='Khalisni PDF Generator',
    )
    doc.build(story,
              onFirstPage=on_first_page,
              onLaterPages=on_later_pages)
    print("Done!")


if __name__ == '__main__':
    main()
