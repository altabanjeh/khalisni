from django.core.management.base import BaseCommand

from orders.overdue import notify_overdue_orders


class Command(BaseCommand):
    help = "Alert the assigned employee and admins about orders past their expected delivery date (run daily)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List late orders without notifying anyone.")

    def handle(self, *args, **options):
        orders = notify_overdue_orders(dry_run=options["dry_run"])
        for order in orders:
            self.stdout.write(f"{order.order_number} | {order.status} | expected {order.expected_delivery_date}")
        mode = "listed (dry run)" if options["dry_run"] else "alerted"
        self.stdout.write(f"{len(orders)} late order(s) {mode}.")
