# Critical Flow Results

| Flow | Result | Evidence |
|---|---|---|
| Public discovery | PASS | `public-home-ar-1440.png`, `public-home-en-390.png`, `services-en-1024.png` |
| Auth login/role redirect | PASS | `LoginPage.test.jsx`, `login-en-1024.png` |
| Public application/order creation | PARTIAL | `CreateOrderPage.test.jsx`, `application-ar-390.png`; browser flow reached registration gate |
| Public tracking | PASS | `TrackOrderPage.test.jsx`, `tracking-en-768.png` |
| Customer portal/request workspace | PASS WITH CONDITIONS | `customer-dashboard-ar-1440.png`, `customer-requests-en-1024.png`, `request-workspace-ar-390.png` |
| Missing documents | PASS WITH CONDITIONS | `MissingDocumentsResponsePage.test.jsx`; localized `FileUploader` present |
| Employee/staff operations | PASS WITH CONDITIONS | `EmployeeOrderReviewPage.test.jsx`, `employee-queue-ar-1440.png`, `employee-order-detail-ar-768.png` |
| Provider workflow | PASS WITH CONDITIONS | `ProviderOrderDetailsPage.test.jsx`, `provider-work-view-ar-1024.png` |
| Admin operations/configuration | PARTIAL | `AdminUsersRolesPage.test.jsx`, `ServicesManagementPage.test.jsx`, `admin-users-en-1024.png`, `admin-services-ar-1024.png` |

Passed critical flows: 6 / 8 if counting partial flows as not passed.

