from django.urls import path

from reports.views import (
    AdminDashboardAPIView,
    DailyReportAPIView,
    EmployeeDashboardAPIView,
    EmployeeWorkflowReportAPIView,
    OperationalSummaryReportAPIView,
    WeeklyReportAPIView,
)

urlpatterns = [
    path("admin/dashboard/", AdminDashboardAPIView.as_view()),
    path("admin/reports/daily/", DailyReportAPIView.as_view()),
    path("admin/reports/weekly/", WeeklyReportAPIView.as_view()),
    path("employee/dashboard/", EmployeeDashboardAPIView.as_view()),
    path("employee/reports/summary/", EmployeeWorkflowReportAPIView.as_view()),
    path("reports/summary/", OperationalSummaryReportAPIView.as_view()),
]
