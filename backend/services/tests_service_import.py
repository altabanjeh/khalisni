import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from django.test import TestCase

from services.models import Service, ServiceCategory, ServiceRequiredDocument
from services.service_import import apply_import, discover_and_normalize


def _paragraph(text):
    return f"<w:p><w:r><w:t>{escape(text)}</w:t></w:r></w:p>"


def _write_docx(path, paragraphs):
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{''.join(_paragraph(item) for item in paragraphs)}</w:body></w:document>"
    )
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", document_xml.encode("utf-8"))


def _service_paragraphs(*, number="1", short_description="وصف مختصر", full_description="وصف كامل"):
    return [
        "خلّصني - الدليل التشغيلي للخدمات",
        f"الخدمة رقم ({number}): طلب اختبار",
        "الإصدار",
        "1.0",
        "آخر تحديث",
        "2026-06-29",
        "الفئة",
        "العقارات والأراضي",
        "اسم الخدمة بالعربية",
        "طلب اختبار",
        "اسم الخدمة بالإنجليزية",
        "Test Service",
        "المعرف (Slug)",
        "request-test-service",
        "ترتيب العرض",
        number,
        "الوصف المختصر",
        short_description,
        "الوصف الكامل",
        full_description,
        "الشروط",
        "• تقديم بيانات صحيحة.",
        "البيانات المطلوبة من العميل",
        "• الاسم الكامل.• الرقم الوطني.• رقم الهاتف.",
        "الوثائق المطلوبة",
        "• صورة الهوية.• وكالة قانونية (إن وجدت).",
        "مدة الإنجاز",
        "حسب إجراءات الجهة المختصة.",
        "السعر الأساسي",
        "0 (يحدد لاحقاً)",
        "رسوم الخدمة",
        "تحدد لاحقاً.",
        "الرسوم الحكومية",
        "حسب الرسوم الرسمية.",
        "إعدادات الخدمة",
        "✓ مفعلة✓ تحتاج مزود خدمة✓ تحتاج مراجعة يدوية✓ متاحة للأفراد والشركات",
        "الأسئلة الديناميكية المقترحة",
        "• هل يوجد وكيل قانوني؟",
        "معلومات التشغيل",
        "الجهة المنفذة: جهة مختصة.",
    ]


class ProductionServiceImportTests(TestCase):
    def test_parser_reconciles_duplicate_slug_and_preserves_non_free_placeholder_price(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _write_docx(root / "first.docx", _service_paragraphs(number="1", short_description="أقصر", full_description="وصف قصير"))
            _write_docx(
                root / "second.docx",
                _service_paragraphs(number="2", short_description="وصف أطول للطلب", full_description="وصف تفصيلي أطول للطلب"),
            )

            result = discover_and_normalize(root)

        self.assertEqual(result.normalized["source_documents"], 2)
        self.assertEqual(len(result.normalized["source_traceability"]), 2)
        self.assertEqual(len(result.normalized["services"]), 1)
        self.assertTrue(result.conflicts)

        service = result.normalized["services"][0]
        self.assertEqual(service["price_type"], "quotation")
        self.assertFalse(service["show_total_price_public"])
        self.assertEqual(len(service["fields"]), 4)
        legal_proxy = next(item for item in service["documents"] if item["code"] == "legal_power_of_attorney")
        self.assertFalse(legal_proxy["is_required"])
        self.assertEqual(legal_proxy["requirement_type"], "conditional")

    def test_apply_import_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            _write_docx(root / "source.docx", _service_paragraphs())

            first = discover_and_normalize(root)
            apply_import(first)
            second = discover_and_normalize(root)
            apply_import(second)

        self.assertEqual(ServiceCategory.objects.filter(slug="land-and-survey").count(), 1)
        self.assertEqual(Service.objects.filter(slug="request-test-service").count(), 1)
        service = Service.objects.get(slug="request-test-service")
        self.assertEqual(service.price_type, Service.PriceType.QUOTATION)
        self.assertFalse(service.show_total_price_public)
        self.assertEqual(ServiceRequiredDocument.objects.filter(service=service, is_deleted=False).count(), 2)
        self.assertEqual(second.created["services"], 0)
        self.assertEqual(second.updated["services"], 0)
        self.assertEqual(second.unchanged["services"], 1)
