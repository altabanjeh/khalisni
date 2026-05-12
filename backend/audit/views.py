from rest_framework import generics, permissions, response
from rest_framework.views import APIView

from audit.models import AuditLog
from audit.serializers import AuditLogSerializer
from config.permissions import IsAdminRole
from orders.selectors import get_orders_for_user
from orders.serializers import OrderStatusLogSerializer


class AuditLogListAPIView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    queryset = AuditLog.objects.select_related("user")

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("user"):
            queryset = queryset.filter(user_id=params["user"])
        if params.get("action"):
            queryset = queryset.filter(action=params["action"])
        if params.get("module"):
            queryset = queryset.filter(entity_type__icontains=params["module"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("date_from"):
            queryset = queryset.filter(created_at__date__gte=params["date_from"])
        if params.get("date_to"):
            queryset = queryset.filter(created_at__date__lte=params["date_to"])
        return queryset


class OrderTimelineAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = generics.get_object_or_404(get_orders_for_user(request.user), pk=pk)
        timeline = order.status_logs.select_related("changed_by")
        return response.Response(OrderStatusLogSerializer(timeline, many=True).data)
