from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed explicit demo roles, users, services, public-site content, and example orders."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-passwords",
            action="store_true",
            help="Reset existing demo account passwords back to the configured defaults.",
        )

    def handle(self, *args, **options):
        call_command("setup_roles")
        call_command(
            "seed_initial_data",
            include_demo_users=True,
            include_demo_orders=True,
            reset_demo_passwords=options["reset_passwords"],
        )
        call_command("seed_public_site_demo")
        self.stdout.write(self.style.SUCCESS("Demo data and roles seeded successfully."))
