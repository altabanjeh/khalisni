# Architecture Review

React/Vite consumes Django REST APIs. Django owns validation, authorization, workflow transition rules, pricing visibility, required-document registry, media validation, and persistence. Frontend route protection complements, but does not replace, backend permissions.

Catalog media is nullable `ImageField` data served by existing storage, represented by public/admin serializers, uploaded via multipart, and rendered with fallbacks. No duplicate catalog or order model was introduced. Remaining architecture limitation: browser E2E and automated accessibility tooling are not configured.
