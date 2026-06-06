from django.db import migrations, models
from django.utils.text import slugify


def _category_for(screen_key: str, title: str) -> str:
    screen_key = str(screen_key or "").strip().lower()
    title = str(title or "").strip().lower()

    if screen_key == "manual_navigation":
        return "navigation"
    if screen_key in {"manual_account_access", "public_login", "public_forgot_password"}:
        return "account"
    if screen_key == "manual_add_screenshots":
        return "manual"
    if screen_key.endswith("_reports"):
        return "reports"
    if screen_key.startswith("customer_"):
        return "customer"
    if screen_key.startswith("employee_"):
        return "employee"
    if screen_key.startswith("provider_"):
        return "provider"
    if screen_key.startswith("admin_"):
        if any(token in screen_key for token in ("settings", "users", "help_guides", "rules")):
            return "settings"
        return "admin"
    if "login" in title or "password" in title:
        return "account"
    return "general"


def _unique_slug(HelpGuide, value: str, current_pk=None) -> str:
    base = slugify(value)[:140] or "help-guide"
    slug = base
    index = 2
    while HelpGuide.objects.exclude(pk=current_pk).filter(slug=slug).exists():
        suffix = f"-{index}"
        slug = f"{base[: max(1, 140 - len(suffix))]}{suffix}"
        index += 1
    return slug


def _ensure_guide(HelpGuide, *, screen_key: str, role: str, slug: str, defaults: dict):
    guide = HelpGuide.objects.filter(
        screen_key=screen_key,
        role=role,
        workflow_status=defaults.get("workflow_status", ""),
        permission_key=defaults.get("permission_key", ""),
    ).first()
    if guide is None:
        guide = HelpGuide(screen_key=screen_key, role=role, **defaults)

    for field, value in defaults.items():
        current_value = getattr(guide, field, None)
        if field in {"category", "slug", "is_quick_link"} or current_value in (None, ""):
            setattr(guide, field, value)

    guide.slug = _unique_slug(HelpGuide, slug, current_pk=guide.pk)
    guide.save()
    return guide


def seed_manual_library(apps, schema_editor):
    HelpGuide = apps.get_model("help_guides", "HelpGuide")
    HelpGuideScreenshot = apps.get_model("help_guides", "HelpGuideScreenshot")

    quick_link_pairs = {
        ("manual_navigation", "all_users"),
        ("manual_account_access", "all_users"),
        ("customer_create_order", "customer"),
        ("customer_orders", "customer"),
        ("employee_order_review", "employee"),
        ("employee_verify_documents", "employee"),
        ("employee_reports", "employee"),
        ("admin_users_roles", "admin"),
        ("admin_reports", "admin"),
        ("manual_add_screenshots", "admin"),
    }

    for guide in HelpGuide.objects.all().order_by("help_guide_id"):
        guide.slug = _unique_slug(HelpGuide, guide.slug or guide.title or guide.screen_key or f"help-guide-{guide.pk}", current_pk=guide.pk)
        guide.category = guide.category or _category_for(guide.screen_key, guide.title)
        guide.is_quick_link = (guide.screen_key, guide.role) in quick_link_pairs
        guide.save(update_fields=["slug", "category", "is_quick_link"])

    navigation_guide = _ensure_guide(
        HelpGuide,
        screen_key="manual_navigation",
        role="all_users",
        slug="how-to-navigate-the-system",
        defaults={
            "route_path": "/help/manual/navigation",
            "category": "navigation",
            "title": "How to Navigate the System",
            "short_description": "A practical guide to dashboard layout, menus, tables, actions, validation messages, and status labels.",
            "purpose": "Use this guide to understand the common interaction patterns that appear across the Khalisni system before starting role-specific work.",
            "before_you_start": (
                "Log in with your assigned account.\n"
                "Make sure the correct portal is open for your role.\n"
                "Use the top help button whenever the current page is unclear."
            ),
            "step_by_step_guide": (
                "1. Open your dashboard and read the summary cards to see the current workload.\n"
                "2. Use the sidebar to move between dashboards, lists, reports, and settings pages.\n"
                "3. Use the top bar for notifications, opening the manual, and returning to the public site.\n"
                "4. Use search boxes and filters before opening records when the list contains many rows.\n"
                "5. Open a record from its table row or action button, then review the status badge before taking action.\n"
                "6. Use the main action buttons to create, save, assign, request documents, complete, or reject depending on the page.\n"
                "7. Read validation errors directly under the field, correct the input, then save again.\n"
                "8. Confirm success from the updated status, refreshed table row, or success toast after each action."
            ),
            "when_to_use": "Open this guide when a user is new to the system or needs a quick orientation before following a workflow guide.",
            "main_workflow": "Navigation and orientation",
            "expected_result": (
                "You can move between major screens confidently.\n"
                "You can read table rows, status labels, and action buttons correctly.\n"
                "You can tell whether an operation succeeded or failed."
            ),
            "common_errors": (
                "Opening the wrong portal for the current role.\n"
                "Ignoring the current status before pressing an action button.\n"
                "Changing filters without clearing the old search text."
            ),
            "next_step": "Open the guide for the exact screen or workflow you need next.",
            "troubleshooting": (
                "If a button is missing, check your role and permissions first.\n"
                "If a table looks empty, clear filters and try again.\n"
                "If the page does not update after saving, refresh the current view and confirm the server response."
            ),
            "search_keywords": "navigate dashboard sidebar top bar search filter status labels tables action buttons validation errors",
            "display_order": 1,
            "is_active": True,
            "is_quick_link": True,
        },
    )

    account_guide = _ensure_guide(
        HelpGuide,
        screen_key="manual_account_access",
        role="all_users",
        slug="login-and-account-access",
        defaults={
            "route_path": "/login",
            "category": "account",
            "title": "Login and Account Access",
            "short_description": "How to sign in, recover access, and update account credentials safely.",
            "purpose": "This guide explains how users enter the system, recover from common access problems, and return to work quickly.",
            "before_you_start": (
                "Have your email and password ready.\n"
                "Use the correct login page for the system.\n"
                "Make sure you can access the email inbox used for password reset."
            ),
            "step_by_step_guide": (
                "1. Open the login page and enter your email and password.\n"
                "2. Press Sign in and wait for the system to route you to the correct dashboard.\n"
                "3. If the credentials are wrong, read the error message and correct the email or password.\n"
                "4. Use Forgot password when you cannot sign in with your current password.\n"
                "5. Open the reset link from email, set a new password, then sign in again.\n"
                "6. After login, open your profile page if you need to review your saved personal information."
            ),
            "when_to_use": "Use this guide for first-time login, wrong password cases, reset password flows, and profile access questions.",
            "main_workflow": "Authentication and profile access",
            "expected_result": (
                "The user reaches the correct dashboard after login.\n"
                "Password reset returns the user to a working sign-in flow."
            ),
            "common_errors": (
                "Typing an old password after it was already reset.\n"
                "Using an email address that does not match the registered account.\n"
                "Opening an expired password reset link."
            ),
            "next_step": "After login, open the role-specific navigation guide or the current screen guide.",
            "troubleshooting": (
                "If sign in fails repeatedly, verify the email address first.\n"
                "If the reset email does not arrive, check spam or junk folders.\n"
                "If the reset link expires, request a new one and use the latest email only."
            ),
            "search_keywords": "login forgot password reset password account access profile sign in credentials",
            "display_order": 2,
            "is_active": True,
            "is_quick_link": True,
        },
    )

    screenshot_guide = _ensure_guide(
        HelpGuide,
        screen_key="manual_add_screenshots",
        role="admin",
        slug="how-to-add-screenshots-to-the-manual",
        defaults={
            "route_path": "/help/manual/screenshots",
            "category": "manual",
            "permission_key": "help_guides.manage_help_guides",
            "title": "How to Add Screenshots to the Manual",
            "short_description": "Internal instructions for capturing, naming, storing, and linking manual screenshots.",
            "purpose": "Use this guide to keep the help library aligned with the current interface and replace placeholders with real screenshots safely.",
            "before_you_start": (
                "Confirm the target guide already exists in Help Guide Management.\n"
                "Capture the final approved UI state only.\n"
                "Prefer clear desktop screenshots unless the workflow is mobile-specific."
            ),
            "step_by_step_guide": (
                "1. Open the exact page or modal that the guide step explains.\n"
                "2. Capture the screen at a clear desktop width, keeping the main action area visible.\n"
                "3. Save the file under static/manual/screenshots/ in the matching folder such as admin, customer, employee, reports, or settings.\n"
                "4. Use the naming format manual_<role>_<module>_<step_number>_<short_description>.png.\n"
                "5. In Help Guide Management, open the Screenshots section and create or edit the screenshot record for the target guide.\n"
                "6. Upload the file or set the static path, then add a caption and step reference.\n"
                "7. Replace any old placeholder entry after confirming the new image appears correctly in the manual.\n"
                "8. Review the guide from the user-facing manual panel after any UI change."
            ),
            "when_to_use": "Use this guide whenever the UI changes, a placeholder still exists, or a new guide needs image support.",
            "main_workflow": "Manual maintenance",
            "expected_result": (
                "Screenshots are stored with consistent names.\n"
                "Manual pages show the right image with the right caption.\n"
                "Outdated placeholders are removed after real screenshots are added."
            ),
            "common_errors": (
                "Saving screenshots in the wrong folder.\n"
                "Using filenames that do not describe the role, module, and step.\n"
                "Leaving a placeholder active after a real screenshot was added."
            ),
            "next_step": "Open the user-facing manual panel and verify the screenshot on the live guide.",
            "troubleshooting": (
                "If a screenshot does not display, confirm the uploaded file or static path is correct.\n"
                "If the image is outdated, replace it and review the matching guide immediately.\n"
                "If the layout changed, recapture the screenshot before publishing the guide."
            ),
            "search_keywords": "manual screenshots placeholder image naming upload help guide maintenance",
            "display_order": 3,
            "is_active": True,
            "is_quick_link": True,
        },
    )

    navigation_guide.related_guides.set([account_guide])
    account_guide.related_guides.set([navigation_guide])
    screenshot_guide.related_guides.set(
        list(
            HelpGuide.objects.filter(screen_key__in=["admin_help_guides", "admin_users_roles", "admin_reports"], role="admin")
        )
    )

    for guide in HelpGuide.objects.all():
        if not HelpGuideScreenshot.objects.filter(help_guide=guide).exists():
            HelpGuideScreenshot.objects.create(
                help_guide=guide,
                caption=f"{guide.title} screenshot",
                placeholder_label=f"Screenshot required: {guide.title}",
                alt_text=guide.title,
                step_reference="overview",
                display_order=10,
                is_active=True,
            )

    special_placeholders = {
        navigation_guide.pk: [
            ("Dashboard layout overview", "dashboard_layout"),
            ("Sidebar and top navigation", "navigation_controls"),
            ("Table actions and status labels", "table_actions"),
        ],
        account_guide.pk: [
            ("Login screen", "login"),
            ("Forgot password flow", "forgot_password"),
        ],
        screenshot_guide.pk: [
            ("Screenshot management in admin help page", "admin_help_screenshots"),
        ],
    }

    for guide_id, rows in special_placeholders.items():
        for index, (caption, step_reference) in enumerate(rows, start=1):
            if HelpGuideScreenshot.objects.filter(help_guide_id=guide_id, step_reference=step_reference).exists():
                continue
            guide = HelpGuide.objects.get(pk=guide_id)
            HelpGuideScreenshot.objects.create(
                help_guide=guide,
                caption=caption,
                placeholder_label=f"Screenshot required: {caption}",
                alt_text=caption,
                step_reference=step_reference,
                display_order=index,
                is_active=True,
            )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("help_guides", "0003_helpguide_internal_notes_helpguide_main_workflow_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="helpguide",
            name="category",
            field=models.CharField(
                choices=[
                    ("navigation", "Navigation"),
                    ("account", "Account access"),
                    ("customer", "Customer"),
                    ("employee", "Employee"),
                    ("support", "Support"),
                    ("provider", "Provider"),
                    ("admin", "Admin"),
                    ("reports", "Reports"),
                    ("settings", "Settings"),
                    ("manual", "Manual maintenance"),
                    ("general", "General"),
                ],
                db_index=True,
                default="general",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="helpguide",
            name="is_quick_link",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="helpguide",
            name="slug",
            field=models.SlugField(blank=True, db_index=False, max_length=160, null=True),
        ),
        migrations.AddField(
            model_name="helpguide",
            name="troubleshooting",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="helpguide",
            name="related_guides",
            field=models.ManyToManyField(blank=True, related_name="referenced_by", symmetrical=False, to="help_guides.helpguide"),
        ),
        migrations.CreateModel(
            name="HelpGuideScreenshot",
            fields=[
                ("screenshot_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("caption", models.CharField(max_length=255)),
                ("image", models.ImageField(blank=True, null=True, upload_to="manual/screenshots/uploads/")),
                ("static_path", models.CharField(blank=True, max_length=255)),
                ("placeholder_label", models.CharField(blank=True, max_length=255)),
                ("alt_text", models.CharField(blank=True, max_length=255)),
                ("step_reference", models.CharField(blank=True, max_length=80)),
                ("display_order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "help_guide",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="screenshots", to="help_guides.helpguide"),
                ),
            ],
            options={
                "ordering": ["display_order", "screenshot_id"],
            },
        ),
        migrations.AddIndex(
            model_name="helpguide",
            index=models.Index(fields=["slug", "is_active"], name="help_guides_slug_active_idx"),
        ),
        migrations.AddIndex(
            model_name="helpguide",
            index=models.Index(fields=["category", "role", "is_active"], name="help_guides_cat_role_idx"),
        ),
        migrations.AddIndex(
            model_name="helpguidescreenshot",
            index=models.Index(fields=["help_guide", "is_active", "display_order"], name="help_guide_shot_idx"),
        ),
        migrations.RunPython(seed_manual_library, migrations.RunPython.noop),
    ]
