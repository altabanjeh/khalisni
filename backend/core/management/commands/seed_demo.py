from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed demo roles, users, services, and required documents."

    def handle(self, *args, **options):
        call_command("setup_roles")
        call_command("seed_initial_data")
        call_command("seed_public_site_demo")
        self.stdout.write(self.style.SUCCESS("Demo data and roles seeded successfully."))
