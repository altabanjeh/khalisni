from django.urls import path

from payment.views import (
    AdminPaymentDetailAPIView,
    AdminPaymentListAPIView,
    AdminPaymentStatusAPIView,
    CustomerPaymentDetailAPIView,
    CustomerPaymentListAPIView,
)

urlpatterns = [
    path("customer/payments/", CustomerPaymentListAPIView.as_view()),
    path("customer/payments/<int:pk>/", CustomerPaymentDetailAPIView.as_view()),
    path("admin/payments/", AdminPaymentListAPIView.as_view()),
    path("admin/payments/<int:pk>/", AdminPaymentDetailAPIView.as_view()),
    path("admin/payments/<int:pk>/status/", AdminPaymentStatusAPIView.as_view()),
]
