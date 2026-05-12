from datetime import date, timedelta
from collections import Counter

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions, response
from rest_framework.views import APIView

from config.permissions import CanViewReportsDashboard, CanViewScopedReports
from documents.models import Document
from orders.models import Order, OrderStatusLog
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user
from orders.serializers import OrderListSerializer
from payment.models import Payment


def _active_orders(queryset):
    return queryset.exclude(
        status__in=[Order.Status.COMPLETED, Order.Status.REJECTED, Order.Status.CANCELLED, Order.Status.ARCHIVED]
    )


def _employee_order_payload(queryset, request, *, limit=5):
    return OrderListSerializer(queryset[:limit], many=True, context={"request": request}).data


def _final_order_states():
    return [
        Order.Status.COMPLETED,
        Order.Status.REJECTED,
        Order.Status.CANCELLED,
        Order.Status.ARCHIVED,
    ]


def _scoped_orders_for_reports(user):
    role = (getattr(user, "role", "") or "").lower()
    if role == "admin":
        return Order.objects.select_related("service", "customer", "assigned_provider__user", "assigned_employee")
    if role in {"employee", "support"}:
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


def _service_volume(queryset):
    return list(
        queryset.values("service__name_ar", "service__name_en")
        .annotate(total=Count("pk", distinct=True))
        .order_by("-total", "service__name_ar")[:10]
    )


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
        orders = Order.objects.select_related("service", "assigned_provider__user")
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
                orders.values("service__name_ar").annotate(total=Count("id")).order_by("-total")[:5]
            ),
            "provider_performance": list(
                orders.exclude(assigned_provider=None)
                .values("assigned_provider__user__full_name")
                .annotate(total=Count("id"))
                .order_by("-total")[:5]
            ),
        }
        if getattr(request.user, "role", "") == "admin":
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
        queryset = Order.objects.filter(created_at__date=today)
        full_data = {
            "date": str(today),
            "created_orders": queryset.count(),
            "completed_orders": queryset.filter(status=Order.Status.COMPLETED).count(),
            "revenue": queryset.filter(status=Order.Status.COMPLETED).aggregate(total=Sum("final_price"))["total"] or 0,
            "top_services": list(queryset.values("service__name_ar").annotate(total=Count("id")).order_by("-total")[:5]),
        }
        if getattr(request.user, "role", "") == "admin":
            return response.Response(full_data)
        return response.Response(
            {
                "date": full_data["date"],
                "created_orders": full_data["created_orders"],
                "completed_orders": full_data["completed_orders"],
                "top_services": full_data["top_services"],
            }
        )


class WeeklyReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewReportsDashboard]

    def get(self, request):
        today = timezone.localdate()
        start = today - timedelta(days=6)
        queryset = Order.objects.filter(created_at__date__gte=start, created_at__date__lte=today)
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
        }
        if getattr(request.user, "role", "") == "admin":
            return response.Response(full_data)
        return response.Response(
            {
                "start_date": full_data["start_date"],
                "end_date": full_data["end_date"],
                "daily_breakdown": full_data["daily_breakdown"],
                "delayed_orders": full_data["delayed_orders"],
            }
        )


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
        start_date = date.fromisoformat(date_from) if date_from else today - timedelta(days=29)
        end_date = date.fromisoformat(date_to) if date_to else today

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
            "order_status_summary": list(
                orders.values("status").annotate(total=Count("pk", distinct=True)).order_by("status")
            ),
            "employee_workload": _employee_workload(orders, request.user),
            "provider_performance": _provider_performance(orders, request.user),
            "missing_document_frequency": _missing_document_frequency(orders),
            "delayed_orders": _delayed_orders_payload(orders, request),
            "completed_orders": _completed_orders_payload(orders, request),
            "service_volume": _service_volume(orders),
            "payment_summary": _payment_summary(orders),
        }
        return response.Response(data)
