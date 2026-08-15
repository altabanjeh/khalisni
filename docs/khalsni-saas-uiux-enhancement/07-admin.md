# Admin Enhancement Notes

Admin changes in this phase:
- Hide the background users table while the user form modal is open, preventing duplicate table and modal controls from sharing accessible roles.
- Hide the provider-service assignment table while its form modal is open.
- Localize the enhanced admin users table status filter, headings, and action labels to Arabic.

Evidence:
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:307-312`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:357-409`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx:485-499`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:233-265`
- `frontend/src/pages/admin/AdminUsersRolesPage.test.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.test.jsx`

