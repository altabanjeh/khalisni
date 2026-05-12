from django.urls import include, path
from rest_framework.routers import DefaultRouter

from orders.views import (
    AdminDashboardOrderListAPIView,
    AdminOrderAssignAPIView,
    AdminOrderCancelAPIView,
    AdminOrderCompleteAPIView,
    AdminOrderDetailAPIView,
    AdminOrderFinalDocumentAPIView,
    AdminOrderIssueViewSet,
    AdminOrderNoteViewSet,
    AdminOrderNotesAPIView,
    AdminOrderRecordViewSet,
    AdminWorkflowRulesAPIView,
    AdminRatingViewSet,
    AdminOrderRejectAPIView,
    AdminOrderStatusUpdateAPIView,
    AdminRequestDocumentsAPIView,
    CreateOrderAPIView,
    CustomerOrderCancelAPIView,
    CustomerOrderDetailAPIView,
    CustomerOrderDocumentUploadAPIView,
    CustomerOrderListAPIView,
    CustomerOrderRatingAPIView,
    TrackOrderAPIView,
)

router = DefaultRouter()
router.register("admin/order-records", AdminOrderRecordViewSet, basename="admin-order-records")
router.register("admin/order-notes", AdminOrderNoteViewSet, basename="admin-order-notes")
router.register("admin/order-issues", AdminOrderIssueViewSet, basename="admin-order-issues")
router.register("admin/ratings", AdminRatingViewSet, basename="admin-ratings")

urlpatterns = [
    path("", include(router.urls)),
    path("orders/", CreateOrderAPIView.as_view()),
    path("orders/track/", TrackOrderAPIView.as_view()),
    path("customer/orders/", CustomerOrderListAPIView.as_view()),
    path("customer/orders/<int:pk>/", CustomerOrderDetailAPIView.as_view()),
    path("customer/orders/<int:pk>/documents/", CustomerOrderDocumentUploadAPIView.as_view()),
    path("customer/orders/<int:pk>/cancel/", CustomerOrderCancelAPIView.as_view()),
    path("customer/orders/<int:pk>/rating/", CustomerOrderRatingAPIView.as_view()),
    path("admin/orders/", AdminDashboardOrderListAPIView.as_view()),
    path("admin/orders/<int:pk>/", AdminOrderDetailAPIView.as_view()),
    path("admin/orders/<int:pk>/status/", AdminOrderStatusUpdateAPIView.as_view()),
    path("admin/orders/<int:pk>/assign/", AdminOrderAssignAPIView.as_view()),
    path("admin/orders/<int:pk>/request-documents/", AdminRequestDocumentsAPIView.as_view()),
    path("admin/orders/<int:pk>/notes/", AdminOrderNotesAPIView.as_view()),
    path("admin/orders/<int:pk>/final-document/", AdminOrderFinalDocumentAPIView.as_view()),
    path("admin/orders/<int:pk>/complete/", AdminOrderCompleteAPIView.as_view()),
    path("admin/orders/<int:pk>/reject/", AdminOrderRejectAPIView.as_view()),
    path("admin/orders/<int:pk>/cancel/", AdminOrderCancelAPIView.as_view()),
    path("admin/workflow-rules/", AdminWorkflowRulesAPIView.as_view()),
]
