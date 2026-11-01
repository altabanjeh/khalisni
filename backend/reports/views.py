import calendar
import csv
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal
from io import StringIO

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from config.permissions import CanViewReportsDashboard, CanViewScopedReports
from core.i18n import request_language
from documents.models import Document
from organizations.selectors import is_provider_user, is_platform_super_admin, is_platform_support
from orders.models import Order, OrderStatusLog, Rating
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user
from orders.serializers import OrderListSerializer, ProviderOrderListSerializer
from payment.models import Payment


def _active_orders(queryset):
    return queryset.exclude(
        status__in=[Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED, Order.Status.ARCHIVED]
    )


def _employee_order_payload(queryset, request, *, limit=5):
    # Providers get the provider projection of an order (no customer identity,
    # no price), the same one their own order endpoints use.
    serializer_class = ProviderOrderListSerializer if is_provider_user(getattr(request, "user", None)) else OrderListSerializer
    return serializer_class(queryset[:limit], many=True, context={"request": request}).data


def _final_order_states():
    return [
        Order.Status.COMPLETED,
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
        Order.Status.ARCHIVED,
    ]


def _scoped_orders_for_reports(user):
    role = (getattr(user, "role", "") or "").lower()
    if is_platform_super_admin(user):
        return Order.objects.select_related("service", "customer", "assigned_provider__user", "assigned_employee")
    if role in {"employee", "support"} or is_platform_support(user):
        return get_reviewable_orders_for_user(user)
    return get_orders_for_user(user)


def _missing_document_frequency(queryset):
    counter = Counter()
    for order in queryset:
        for document_type in order.missing_document_types or []:
            counter[str(document_type)] += 1
    return [
        {"document_type": document_type, "total": total}
        for document_type, total in counter.most_common()
    ]


def _payment_summary(queryset):
    payments = Payment.objects.filter(order__in=queryset)
    return {
        "total_records": payments.count(),
        "total_amount": payments.aggregate(total=Sum("amount"))["total"] or 0,
        "by_status": list(payments.values("status").annotate(total=Count("pk")).order_by("status")),
    }


def _payments_by_method(queryset):
    """Paid payment records per method (B05: staff-recorded payments only)."""
    return list(
        Payment.objects.filter(order__in=queryset, status=Payment.PaymentStatus.PAID)
        .values("method")
        .annotate(records=Count("pk"), amount=Sum("amount"))
        .order_by("method")
    )


def _report_period(request):
    """``(period, start, end)`` from ``?period=daily|weekly|monthly&month=YYYY-MM``."""
    today = timezone.localdate()
    period = request.query_params.get("period") or "monthly"
    if period == "daily":
        return period, today, today
    if period == "weekly":
        return period, today - timedelta(days=6), today
    if period != "monthly":
        raise ValidationError({"period": "Use daily, weekly or monthly."})
    month = request.query_params.get("month") or today.strftime("%Y-%m")
    try:
        year, number = (int(part) for part in month.split("-"))
        start = date(year, number, 1)
    except (TypeError, ValueError):
        raise ValidationError({"month": "Use YYYY-MM."})
    return period, start, date(year, number, calendar.monthrange(year, number)[1])


def _employee_workload(queryset, user):
    role = (getattr(user, "role", "") or "").lower()
    final_statuses = _final_order_states()
    if role in {"employee", "support"}:
        my_orders = queryset.filter(assigned_employee=user).distinct()
        active_orders = _active_orders(my_orders)
        return {
            "assigned_orders": my_orders.count(),
            "active_orders": active_orders.count(),
            "completed_orders": my_orders.filter(status=Order.Status.COMPLETED).count(),
            "delayed_orders": active_orders.filter(expected_delivery_date__lt=timezone.localdate()).count(),
        }

    rows = (
        queryset.exclude(assigned_employee=None)
        .values("assigned_employee__full_name")
        .annotate(
            total_orders=Count("pk", distinct=True),
            active_orders=Count("pk", filter=~Q(status__in=final_statuses), distinct=True),
            completed_orders=Count("pk", filter=Q(status=Order.Status.COMPLETED), distinct=True),
        )
        .order_by("-active_orders", "-total_orders", "assigned_employee__full_name")
    )
    return [
        {
            "employee_name": row["assigned_employee__full_name"] or "Unassigned employee",
            "total_orders": row["total_orders"],
            "active_orders": row["active_orders"],
            "completed_orders": row["completed_orders"],
        }
        for row in rows[:10]
    ]


def _provider_performance(queryset, user):
    role = (getattr(user, "role", "") or "").lower()
    if role == "provider":
        return {
            "assigned_orders": queryset.count(),
            "completed_orders": queryset.filter(status=Order.Status.COMPLETED).count(),
            "ready_for_delivery": queryset.filter(status=Order.Status.READY_FOR_DELIVERY).count(),
        }
    rows = (
        queryset.exclude(assigned_provider=None)
        .values("assigned_provider__user__full_name")
        .annotate(
            total_orders=Count("pk", distinct=True),
            completed_orders=Count("pk", filter=Q(status=Order.Status.COMPLETED), distinct=True),
            in_progress_orders=Count(
                "pk",
                filter=Q(status__in=[Order.Status.ASSIGNED, Order.Status.IN_PROGRESS, Order.Status.WAITING_GOVERNMENT]),
                distinct=True,
            ),
        )
        .order_by("-completed_orders", "-total_orders", "assigned_provider__user__full_name")
    )
    return [
        {
            "provider_name": row["assigned_provider__user__full_name"] or "Unassigned provider",
            "total_orders": row["total_orders"],
            "completed_orders": row["completed_orders"],
            "in_progress_orders": row["in_progress_orders"],
        }
        for row in rows[:10]
    ]


def _median(values):
    values = sorted(values)
    if not values:
        return None
    middle = len(values) // 2
    return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2


def _success_metrics(queryset):
    """The five PRD success metrics (docs/PRD.md), from recorded data only."""
    finished = queryset.filter(status__in=[Order.Status.COMPLETED, Order.Status.ARCHIVED])
    followed_up = set(
        OrderStatusLog.objects.filter(order__in=finished, new_status=Order.Status.WAITING_CUSTOMER).values_list("order_id", flat=True)
    )
    finished_ids = list(finished.values_list("pk", flat=True))
    durations = list(queryset.exclude(form_duration_seconds=None).values_list("form_duration_seconds", flat=True))

    per_service = {}
    for service_id, name_ar, name_en, created_at, completed_at in finished.exclude(completed_at=None).values_list(
        "service_id", "service__name_ar", "service__name_en", "created_at", "completed_at"
    ):
        row = per_service.setdefault(service_id, {"service_name_ar": name_ar, "service_name_en": name_en, "hours": []})
        row["hours"].append((completed_at - created_at).total_seconds() / 3600)
    processing = sorted(
        (
            {
                "service_name_ar": row["service_name_ar"],
                "service_name_en": row["service_name_en"],
                "completed_orders": len(row["hours"]),
                "average_hours": round(sum(row["hours"]) / len(row["hours"]), 1),
            }
            for row in per_service.values()
        ),
        key=lambda row: (-row["completed_orders"], row["service_name_ar"] or ""),
    )[:10]

    providers = (
        queryset.exclude(assigned_provider=None)
        .values("assigned_provider__user__full_name")
        .annotate(
            total_orders=Count("pk", distinct=True),
            completed_orders=Count("pk", filter=Q(status__in=[Order.Status.COMPLETED, Order.Status.ARCHIVED]), distinct=True),
        )
        .order_by("-completed_orders", "assigned_provider__user__full_name")[:10]
    )
    ratings = Rating.objects.filter(order__in=queryset, is_deleted=False)
    rating_summary = ratings.aggregate(average=Avg("score"), total=Count("pk"))
    return {
        "time_to_create_request": {
            "measured_orders": len(durations),
            "median_seconds": _median(durations),
        },
        "completed_without_follow_up": {
            "completed_orders": len(finished_ids),
            "without_missing_document_request": len([pk for pk in finished_ids if pk not in followed_up]),
            "percent": round(100 * (len(finished_ids) - len(followed_up)) / len(finished_ids), 1) if finished_ids else None,
        },
        "processing_duration_by_service": processing,
        "provider_throughput": [
            {
                "provider_name": row["assigned_provider__user__full_name"] or "",
                "total_orders": row["total_orders"],
                "completed_orders": row["completed_orders"],
                "completion_rate": round(100 * row["completed_orders"] / row["total_orders"], 1) if row["total_orders"] else None,
            }
            for row in providers
        ],
        "customer_satisfaction": {
            "ratings": rating_summary["total"],
            "average_score": round(rating_summary["average"], 2) if rating_summary["average"] is not None else None,
            "distribution": {
                str(score): count
                for score, count in ratings.values_list("score").annotate(count=Count("pk")).order_by("score")
            },
        },
    }


def _service_volume(queryset):
    return list(
        queryset.values("service__name_ar", "service__name_en")
        .annotate(total=Count("pk", distinct=True))
        .order_by("-total", "service__name_ar")[:10]
    )


def _resolved_category_name(order):
    if order.service_category_name_snapshot:
        return order.service_category_name_snapshot
    service = getattr(order, "service", None)
    category = getattr(service, "category", None)
    if category is not None:
        return category.name_ar
    return "Uncategorized"


def _category_name_en(order, arabic_name):
    category = getattr(getattr(order, "service", None), "category", None)
    if category is not None and category.name_ar == arabic_name and category.name_en:
        return category.name_en
    return arabic_name


def _category_summary(queryset):
    rows = {}
    for order in queryset.select_related("service", "service__category"):
        category_name = _resolved_category_name(order)
        entry = rows.setdefault(
            category_name,
            {
                "category_name": category_name,
                # English screens read this; the snapshot name stays the key.
                "category_name_en": _category_name_en(order, category_name),
                "orders_count": 0,
                "revenue": Decimal("0.00"),
                "completed_orders": 0,
                "delayed_orders": 0,
                "average_completion_time_hours": 0,
                "_completion_samples": [],
            },
        )
        entry["orders_count"] += 1
        entry["revenue"] += order.final_price or Decimal("0.00")
        if order.status == Order.Status.COMPLETED:
            entry["completed_orders"] += 1
            if order.completed_at and order.created_at:
                hours = (order.completed_at - order.created_at).total_seconds() / 3600
                entry["_completion_samples"].append(round(hours, 2))
        if order.expected_delivery_date and order.expected_delivery_date < timezone.localdate() and order.status not in _final_order_states():
            entry["delayed_orders"] += 1

    results = []
    for entry in rows.values():
        samples = entry.pop("_completion_samples")
        entry["average_completion_time_hours"] = round(sum(samples) / len(samples), 2) if samples else 0
        results.append(entry)
    return sorted(results, key=lambda item: (-item["orders_count"], item["category_name"]))


def _organization_summary(queryset):
    rows = (
        queryset.values("organization_name_snapshot", "organization__name")
        .annotate(
            orders_count=Count("pk", distinct=True),
            revenue=Sum("final_price"),
            completed_orders=Count("pk", filter=Q(status=Order.Status.COMPLETED), distinct=True),
        )
        .order_by("-orders_count", "organization_name_snapshot", "organization__name")
    )
    return [
        {
            "organization_name": row["organization_name_snapshot"] or row["organization__name"] or "Unknown organization",
            "orders_count": row["orders_count"],
            "revenue": row["revenue"] or 0,
            "completed_orders": row["completed_orders"],
        }
        for row in rows
    ]


def _branch_summary(queryset):
    rows = (
        queryset.values("branch__name")
        .annotate(
            orders_count=Count("pk", distinct=True),
            revenue=Sum("final_price"),
            completed_orders=Count("pk", filter=Q(status=Order.Status.COMPLETED), distinct=True),
        )
        .order_by("-orders_count", "branch__name")
    )
    return [
        {
            "branch_name": row["branch__name"] or "Unassigned branch",
            "orders_count": row["orders_count"],
            "revenue": row["revenue"] or 0,
            "completed_orders": row["completed_orders"],
        }
        for row in rows
    ]


def _status_summary(queryset):
    return list(queryset.values("status").annotate(total=Count("pk", distinct=True)).order_by("status"))


def _delayed_orders_payload(queryset, request):
    today = timezone.localdate()
    delayed_orders = _active_orders(queryset).filter(expected_delivery_date__lt=today).distinct()
    return {
        "total": delayed_orders.count(),
        "orders": _employee_order_payload(delayed_orders.order_by("expected_delivery_date"), request, limit=5),
    }


def _completed_orders_payload(queryset, request):
    completed_orders = queryset.filter(status=Order.Status.COMPLETED).distinct()
    return {
        "total": completed_orders.count(),
        "orders": _employee_order_payload(completed_orders.order_by("-completed_at", "-updated_at"), request, limit=5),
    }


class AdminDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        week_ago = today - timedelta(days=7)
        orders = _scoped_orders_for_reports(request.user)
        full_data = {
            "cards": {
                "new_orders_today": orders.filter(created_at__date=today, status=Order.Status.NEW).count(),
                "orders_in_progress": orders.filter(status=Order.Status.IN_PROGRESS).count(),
                "waiting_customer": orders.filter(status=Order.Status.WAITING_CUSTOMER).count(),
                "completed_this_week": orders.filter(completed_at__date__gte=week_ago).count(),
                "delayed_orders": orders.filter(expected_delivery_date__lt=today).exclude(
                    status__in=[Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED]
                ).count(),
                "revenue_estimate": orders.filter(status=Order.Status.COMPLETED).aggregate(total=Sum("final_price"))["total"] or 0,
            },
            "orders_by_status": list(orders.values("status").annotate(total=Count("id")).order_by("status")),
            "top_services": list(
                orders.values("service__name_ar", "service__name_en").annotate(total=Count("id")).order_by("-total")[:5]
            ),
            "provider_performance": list(
                orders.exclude(assigned_provider=None)
                .values("assigned_provider__user__full_name")
                .annotate(total=Count("id"))
                .order_by("-total")[:5]
            ),
        }
        if is_platform_super_admin(request.user):
            return response.Response(full_data)

        limited_cards = {
            key: value
            for key, value in full_data["cards"].items()
            if key != "revenue_estimate"
        }
        limited_data = {
            "cards": limited_cards,
            "orders_by_status": full_data["orders_by_status"],
            "top_services": full_data["top_services"],
        }
        return response.Response(limited_data)


class DailyReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        queryset = _scoped_orders_for_reports(request.user).filter(created_at__date=today)
        full_data = {
            "date": str(today),
            "created_orders": queryset.count(),
            "completed_orders": queryset.filter(status=Order.Status.COMPLETED).count(),
            "revenue": queryset.filter(status=Order.Status.COMPLETED).aggregate(total=Sum("final_price"))["total"] or 0,
            "top_services": list(queryset.values("service__name_ar", "service__name_en").annotate(total=Count("id")).order_by("-total")[:5]),
            "orders_by_category": _category_summary(queryset),
            "orders_by_organization": _organization_summary(queryset),
            "orders_by_branch": _branch_summary(queryset),
            "orders_by_status": _status_summary(queryset),
        }
        if is_platform_super_admin(request.user):
            return response.Response(full_data)
        return response.Response(
            {
                "date": full_data["date"],
                "created_orders": full_data["created_orders"],
                "completed_orders": full_data["completed_orders"],
                "top_services": full_data["top_services"],
                "orders_by_status": full_data["orders_by_status"],
            }
        )


class WeeklyReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        start = today - timedelta(days=6)
        queryset = _scoped_orders_for_reports(request.user).filter(created_at__date__gte=start, created_at__date__lte=today)
        full_data = {
            "start_date": str(start),
            "end_date": str(today),
            "revenue_summary": queryset.filter(status=Order.Status.COMPLETED).aggregate(total=Sum("final_price"))["total"] or 0,
            "daily_breakdown": list(
                queryset.annotate(day=TruncDate("created_at"))
                .values("day")
                .annotate(total=Count("id"))
                .order_by("day")
            ),
            "delayed_orders": queryset.filter(expected_delivery_date__lt=today).exclude(
                status__in=[Order.Status.COMPLETED, Order.Status.CANCELLED, Order.Status.REJECTED]
            ).count(),
            "provider_performance": list(
                queryset.exclude(assigned_provider=None)
                .values("assigned_provider__user__full_name")
                .annotate(total=Count("id"))
                .order_by("-total")[:5]
            ),
            "orders_by_category": _category_summary(queryset),
            "orders_by_organization": _organization_summary(queryset),
            "orders_by_branch": _branch_summary(queryset),
            "orders_by_status": _status_summary(queryset),
            "payments_by_method": _payments_by_method(queryset),
        }
        if is_platform_super_admin(request.user):
            return response.Response(full_data)
        return response.Response(
            {
                "start_date": full_data["start_date"],
                "end_date": full_data["end_date"],
                "daily_breakdown": full_data["daily_breakdown"],
                "delayed_orders": full_data["delayed_orders"],
                "orders_by_status": full_data["orders_by_status"],
            }
        )


class MonthlyReportAPIView(APIView):
    """Monthly management report (PROP-WEB-05): volume, revenue, categories, payment methods."""

    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        if not is_platform_super_admin(request.user):
            return response.Response({"detail": "Only administrators can read the monthly report."}, status=403)
        _period, start, end = _report_period(request)
        queryset = _scoped_orders_for_reports(request.user).filter(created_at__date__gte=start, created_at__date__lte=end)
        finished = queryset.filter(status__in=[Order.Status.COMPLETED, Order.Status.ARCHIVED])
        return response.Response({
            "month": start.strftime("%Y-%m"),
            "start_date": str(start),
            "end_date": str(end),
            "created_orders": queryset.count(),
            "completed_orders": finished.count(),
            "revenue_summary": finished.aggregate(total=Sum("final_price"))["total"] or 0,
            "orders_by_category": _category_summary(queryset),
            "orders_by_status": _status_summary(queryset),
            "payments_by_method": _payments_by_method(queryset),
        })


class ReportExportAPIView(APIView):
    """CSV export of the orders in a report period (PROP-WEB-05).

    One row per order with operational columns only: no customer name, phone,
    national ID or notes leave the system through this file.
    """

    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        if not is_platform_super_admin(request.user):
            return response.Response({"detail": "Only administrators can export reports."}, status=403)
        period, start, end = _report_period(request)
        english = request_language(request) == "en"
        orders = (
            _scoped_orders_for_reports(request.user)
            .filter(created_at__date__gte=start, created_at__date__lte=end)
            .select_related("service__category")
            .order_by("created_at")
        )
        payments = {}
        for order_id, method, status in Payment.objects.filter(order__in=orders).order_by("created_at").values_list("order_id", "method", "status"):
            payments[order_id] = (method, status)
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["Order number", "Created", "Service", "Category", "Status", "Final price (JOD)", "Completed", "Payment method", "Payment status"]
            if english else
            ["رقم الطلب", "تاريخ الإنشاء", "الخدمة", "التصنيف", "الحالة", "السعر النهائي (د.أ)", "تاريخ الإنجاز", "طريقة الدفع", "حالة الدفع"]
        )
        for order in orders:
            service = order.service
            category = getattr(service, "category", None)
            method, payment_status = payments.get(order.pk, ("", ""))
            writer.writerow([
                order.order_number,
                timezone.localtime(order.created_at).strftime("%Y-%m-%d %H:%M"),
                ((service.name_en if english else "") or service.name_ar) if service else order.service_name_snapshot,
                ((category.name_en if english else "") or category.name_ar) if category else order.service_category_name_snapshot,
                order.status,
                order.final_price if order.final_price is not None else "",
                timezone.localtime(order.completed_at).strftime("%Y-%m-%d %H:%M") if order.completed_at else "",
                method,
                payment_status,
            ])
        # UTF-8 with BOM so spreadsheet programs read the Arabic text correctly.
        result = HttpResponse("﻿" + buffer.getvalue(), content_type="text/csv; charset=utf-8")
        result["Content-Disposition"] = f'attachment; filename="khalsni-{period}-{start}-{end}.csv"'
        return result


class EmployeeDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        near_deadline_end = today + timedelta(days=2)
        orders = get_reviewable_orders_for_user(request.user)
        active_orders = _active_orders(orders)
        waiting_review = orders.filter(status__in=[Order.Status.NEW, Order.Status.UNDER_REVIEW]).distinct()
        resubmitted_by_client = orders.filter(
            status=Order.Status.UNDER_REVIEW,
            status_logs__old_status=Order.Status.WAITING_CUSTOMER,
            status_logs__new_status=Order.Status.UNDER_REVIEW,
        ).distinct()
        internal_verification = orders.filter(status=Order.Status.READY_FOR_DELIVERY).distinct()
        returned_from_provider = internal_verification.filter(
            documents__is_final_document=True,
            documents__uploaded_by_role=Document.UploadedByRole.PROVIDER,
            documents__is_deleted=False,
        ).distinct()
        delayed_orders = active_orders.filter(expected_delivery_date__lt=today).distinct()
        near_deadline_orders = active_orders.filter(
            expected_delivery_date__gte=today,
            expected_delivery_date__lte=near_deadline_end,
        ).distinct()
        my_workload = active_orders.filter(assigned_employee=request.user).distinct()

        data = {
            "summary": {
                "waiting_review": waiting_review.count(),
                "missing_documents_returned": resubmitted_by_client.count(),
                "waiting_internal_verification": internal_verification.count(),
                "returned_from_provider": returned_from_provider.count(),
                "near_deadline": near_deadline_orders.count(),
                "delayed": delayed_orders.count(),
                "assigned_workload": my_workload.count(),
            },
            "queues": {
                "waiting_review": _employee_order_payload(waiting_review.order_by("-created_at"), request),
                "missing_documents_returned": _employee_order_payload(resubmitted_by_client.order_by("-updated_at"), request),
                "waiting_internal_verification": _employee_order_payload(internal_verification.order_by("expected_delivery_date"), request),
                "returned_from_provider": _employee_order_payload(returned_from_provider.order_by("expected_delivery_date"), request),
                "near_deadline": _employee_order_payload(near_deadline_orders.order_by("expected_delivery_date"), request),
                "delayed": _employee_order_payload(delayed_orders.order_by("expected_delivery_date"), request),
                "assigned_workload": _employee_order_payload(my_workload.order_by("expected_delivery_date"), request),
            },
        }
        return response.Response(data)


class EmployeeWorkflowReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        try:
            start_date = date.fromisoformat(date_from) if date_from else today - timedelta(days=29)
            end_date = date.fromisoformat(date_to) if date_to else today
        except ValueError:
            raise ValidationError({"detail": "Use YYYY-MM-DD for date_from and date_to."})

        reviewable_orders = get_reviewable_orders_for_user(request.user)
        review_logs = OrderStatusLog.objects.filter(
            changed_by=request.user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        )
        completed_logs = review_logs.filter(new_status=Order.Status.COMPLETED)

        data = {
            "period": {"date_from": str(start_date), "date_to": str(end_date)},
            "totals": {
                "orders_reviewed": review_logs.filter(new_status=Order.Status.UNDER_REVIEW).count(),
                "pending_reviews": reviewable_orders.filter(
                    status__in=[Order.Status.NEW, Order.Status.UNDER_REVIEW, Order.Status.WAITING_CUSTOMER]
                ).distinct().count(),
                "delayed_reviews": _active_orders(reviewable_orders).filter(expected_delivery_date__lt=today).distinct().count(),
                "missing_document_requests": review_logs.filter(new_status=Order.Status.WAITING_CUSTOMER).count(),
                "provider_returns": review_logs.filter(
                    old_status=Order.Status.READY_FOR_DELIVERY,
                    new_status=Order.Status.IN_PROGRESS,
                ).count(),
                "completed_orders": completed_logs.count(),
            },
            "completed_orders_by_day": list(
                completed_logs.annotate(day=TruncDate("created_at"))
                .values("day")
                .annotate(total=Count("id"))
                .order_by("day")
            ),
        }
        return response.Response(data)


class OperationalSummaryReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewScopedReports]

    def get(self, request):
        orders = _scoped_orders_for_reports(request.user).distinct()
        role = (getattr(request.user, "role", "") or "").lower()

        data = {
            "scope": role,
            "visible_orders": orders.count(),
            "order_status_summary": _status_summary(orders),
            "orders_by_category": _category_summary(orders),
            "orders_by_organization": _organization_summary(orders),
            "orders_by_branch": _branch_summary(orders),
            "employee_workload": _employee_workload(orders, request.user),
            "provider_performance": _provider_performance(orders, request.user),
            "missing_document_frequency": _missing_document_frequency(orders),
            "delayed_orders": _delayed_orders_payload(orders, request),
            "completed_orders": _completed_orders_payload(orders, request),
            "service_volume": _service_volume(orders),
            "payment_summary": _payment_summary(orders),
            "success_metrics": _success_metrics(orders),
        }
        if role == "customer":
            # A customer's own summary: no staff or provider names.
            data.pop("employee_workload")
            data.pop("provider_performance")
            data.pop("success_metrics")
        if is_provider_user(request.user):
            # SRS: providers cannot access finance figures.
            data.pop("payment_summary")
            data.pop("success_metrics")
            for key in ("orders_by_category", "orders_by_organization", "orders_by_branch"):
                for row in data[key]:
                    row.pop("revenue", None)
        return response.Response(data)
