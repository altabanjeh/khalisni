from django.utils import timezone

from public_site.models import Advertisement, PublicPageContent, SiteTheme


def get_active_theme():
    return (
        SiteTheme.objects.filter(active_theme=True).order_by("-updated_at", "-theme_id").first()
        or SiteTheme.objects.order_by("-updated_at", "-theme_id").first()
    )


def get_active_public_page_content():
    return (
        PublicPageContent.objects.filter(active_content=True).order_by("-updated_at", "-content_id").first()
        or PublicPageContent.objects.order_by("-updated_at", "-content_id").first()
    )


def get_current_public_advertisements(now=None):
    current_time = now or timezone.now()
    return Advertisement.objects.currently_public(current_time)


def get_current_important_alert(now=None):
    return get_current_public_advertisements(now).filter(
        advertisement_type=Advertisement.Type.IMPORTANT_ALERT
    ).order_by("display_order", "-start_date", "-advertisement_id").first()

