from django.urls import include, path
from rest_framework.routers import DefaultRouter

from organizations.views import (
    BranchViewSet,
    MyMembershipsAPIView,
    OrganizationBrandingViewSet,
    OrganizationMembershipViewSet,
    OrganizationViewSet,
    PartnerOnboardingAPIView,
    PartnerServiceConfigViewSet,
)

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organizations")
router.register("branches", BranchViewSet, basename="branches")
router.register("organization-memberships", OrganizationMembershipViewSet, basename="organization-memberships")
router.register("organization-branding", OrganizationBrandingViewSet, basename="organization-branding")
router.register("partner-service-configs", PartnerServiceConfigViewSet, basename="partner-service-configs")

urlpatterns = [
    path("platform/partner-onboarding/", PartnerOnboardingAPIView.as_view()),
    path("me/memberships/", MyMembershipsAPIView.as_view()),
    path("", include(router.urls)),
]
