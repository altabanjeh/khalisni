"""Deployment checks for published public content (``manage.py check --deploy``)."""

from django.core.checks import Error, Tags, Warning, register
from django.db import DatabaseError

from public_site.contact_checks import contact_placeholder_findings


@register(Tags.security, deploy=True)
def published_contact_has_no_placeholders(app_configs, **kwargs):
    """D05: the published contact block must not show placeholder values.

    Refuses reserved or ``example`` email domains, filler numbers (``000000``,
    ``1234567``) and the sample values shipped before the owner supplied real
    data. Blank fields are not an error here (they show as "not published");
    ``check_public_content --strict`` lists them.
    """
    from public_site.selectors import get_active_public_page_content

    try:
        content = get_active_public_page_content()
    except DatabaseError as exc:
        return [
            Warning(
                f"Published contact details could not be read ({exc.__class__.__name__}); placeholder check skipped.",
                hint="Run `manage.py check --deploy` against the migrated production database.",
                id="khalsni.W002",
            )
        ]
    return [
        Error(
            f"Published contact field {field} holds a placeholder value ({reason}): {value!r}.",
            hint="Publish the owner-confirmed value in the content editor, or leave the field blank.",
            obj=f"PublicPageContent:{content.pk}",
            id="khalsni.E002",
        )
        for field, value, reason in contact_placeholder_findings(content)
    ]
