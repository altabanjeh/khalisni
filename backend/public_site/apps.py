from django.apps import AppConfig


class PublicSiteConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "public_site"
    verbose_name = "Public Site"

    def ready(self):
        from public_site import checks  # noqa: F401  (registers the deployment checks)
