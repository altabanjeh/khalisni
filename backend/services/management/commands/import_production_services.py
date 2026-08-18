from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from services.service_import import apply_import, discover_and_normalize, write_artifacts


class Command(BaseCommand):
    help = "Import production service catalog definitions from supplied Khalsni Word documents."

    def add_arguments(self, parser):
        parser.add_argument("--source", required=True, help="Directory containing source .docx files.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without mutating the database.",
        )
        parser.add_argument(
            "--repo-root",
            default=None,
            help="Repository root for docs/service-import and data/service-import artifacts.",
        )

    def handle(self, *args, **options):
        source = Path(options["source"])
        if not source.exists() or not source.is_dir():
            raise CommandError(f"Source directory does not exist: {source}")

        result = discover_and_normalize(source)
        applied = False
        if not options["dry_run"]:
            apply_import(result)
            applied = True

        repo_root = Path(options["repo_root"]) if options["repo_root"] else Path(__file__).resolve().parents[4]
        write_artifacts(result, repo_root, applied=applied, dry_run=options["dry_run"])

        self.stdout.write(
            self.style.SUCCESS(
                "Parsed {docs} documents, {raw} raw services, {canonical} canonical services. {mode}.".format(
                    docs=result.normalized["source_documents"],
                    raw=len(result.normalized["source_traceability"]),
                    canonical=len(result.normalized["services"]),
                    mode="Dry run only" if options["dry_run"] else "Database import applied",
                )
            )
        )
