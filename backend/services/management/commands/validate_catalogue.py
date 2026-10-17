import json

from django.core.management.base import BaseCommand, CommandError

from services.catalogue_validation import validate_catalogue


class Command(BaseCommand):
    help = (
        "Check the service catalogue before an import is published or a release ships: "
        "forms customers cannot submit, broken conditions, duplicate keys/options, missing labels, "
        "invalid document links and placeholder durations. Read-only."
    )

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="Exit with an error while any error-level finding exists.")
        parser.add_argument("--json", action="store_true", help="Print findings as JSON.")
        parser.add_argument("--no-warnings", action="store_true", help="List errors only.")

    def handle(self, *args, **options):
        report = validate_catalogue()
        findings = report.errors if options["no_warnings"] else report.findings
        if options["json"]:
            self.stdout.write(json.dumps({
                "services": report.services,
                "customer_visible": report.customer_visible,
                "errors": len(report.errors),
                "warnings": len(report.warnings),
                "findings": [finding.__dict__ for finding in findings],
            }, ensure_ascii=False, indent=1))
        else:
            for finding in findings:
                self.stdout.write(f"{finding.level.upper():7} {finding.service} | {finding.where} | {finding.message}")
            self.stdout.write(
                f"Services: {report.services} ({report.customer_visible} customer-visible). "
                f"Errors: {len(report.errors)}. Warnings: {len(report.warnings)}."
            )
        if options["strict"] and report.errors:
            raise CommandError(f"{len(report.errors)} catalogue error(s).")
