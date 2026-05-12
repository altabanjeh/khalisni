from django.core.management.base import BaseCommand
from django.utils import timezone

from public_site.defaults import (
    DEFAULT_PUBLIC_PAGE_CONTENT,
    DEFAULT_SAMPLE_ADVERTISEMENT,
    DEFAULT_SITE_THEME,
)
from public_site.models import Advertisement, PublicPageContent, SiteTheme


class Command(BaseCommand):
    help = "Seed demo public-site theme, homepage content, and advertisement."

    def handle(self, *args, **options):
        theme, _ = SiteTheme.objects.update_or_create(
            name=DEFAULT_SITE_THEME["name"],
            defaults=DEFAULT_SITE_THEME,
        )

        content, _ = PublicPageContent.objects.update_or_create(
            version_name=DEFAULT_PUBLIC_PAGE_CONTENT["version_name"],
            defaults=DEFAULT_PUBLIC_PAGE_CONTENT,
        )

        advertisement_defaults = {
            **DEFAULT_SAMPLE_ADVERTISEMENT,
            "start_date": timezone.now(),
            "end_date": None,
        }
        advertisement, _ = Advertisement.objects.update_or_create(
            title_ar=DEFAULT_SAMPLE_ADVERTISEMENT["title_ar"],
            defaults=advertisement_defaults,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Public site demo data seeded: theme={theme.pk}, content={content.pk}, advertisement={advertisement.pk}."
            )
        )

