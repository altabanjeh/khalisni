"""Data-retention report and (opt-in) apply (audit D06).

    python manage.py retention_report                 # dry run: what the configured policy WOULD affect
    python manage.py retention_report --show-policy   # print the configured policy (release evidence)
    python manage.py retention_report --apply         # perform the safe actions of configured categories

Periods come from settings.KHALSNI_RETENTION (environment variables); an unset
category is never touched. See core/retention.py for what each category does.
"""

from django.core.management.base import BaseCommand

from core.retention import describe_policy, run_retention


class Command(BaseCommand):
    help = "Report (default) or apply the configured data-retention policy. Unconfigured categories are never touched."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Perform the safe actions for configured categories.")
        parser.add_argument("--show-policy", action="store_true", help="Print the configured policy and exit.")

    def handle(self, *args, **options):
        self.stdout.write("Retention policy (settings.KHALSNI_RETENTION):")
        for line in describe_policy():
            self.stdout.write(f"  {line}")
        if options["show_policy"]:
            return

        apply = options["apply"]
        self.stdout.write("Mode: APPLY" if apply else "Mode: DRY RUN (nothing is changed; use --apply to act)")
        results = run_retention(apply=apply)
        for result in results:
            if not result.configured:
                self.stdout.write(f"  {result.key}: {result.summary}")
                continue
            line = f"  {result.key}: {result.summary}"
            if apply:
                line += f" -> applied to {result.applied}"
            self.stdout.write(line)
        if apply:
            self.stdout.write("Apply finished; an audit-log entry (apply_retention_policy) records the result.")
        else:
            self.stdout.write("Dry run finished; nothing was changed.")
