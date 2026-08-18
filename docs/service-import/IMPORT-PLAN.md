# Import Plan

1. Discover `.docx` files recursively from the supplied source directory.
2. Extract paragraphs and Word tables into a normalized intermediate JSON file.
3. Reconcile duplicates by explicit identifier/slug first, then preserve source numbering in traceability.
4. Upsert categories, services, document definitions, and service document requirements through Django models.
5. Keep placeholder prices non-public with `price_type=quotation`.
6. Preserve conditional document requirements as non-mandatory requirements with source instructions because the current model has no conditional rule table.
7. Write inventory, conflict, developer-note, import, and validation reports on every run.
