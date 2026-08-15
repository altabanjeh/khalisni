# Route And Screen Inventory

Reachable production routes audited: 57. Wildcard redirect: 1.

| Route | Screen | Persona | Layout | Data Source | Reachable? | Working? |
|---|---|---|---|---|---|---|
| `/` | Home | Public | PublicLayout | Public site/services APIs | Yes | Confirmed by screenshot |
| `/services` | Service directory | Public | PublicLayout | Services/categories APIs | Yes | Confirmed by screenshot/test |
| `/services/category/:slug` | Category detail | Public | PublicLayout | Category/services APIs | Yes | Confirmed by route/test |
| `/services/:slug` | Service detail | Public | PublicLayout | Service detail API | Yes | Confirmed by route/test |
| `/create-order` | Public create order | Public/customer | PublicLayout | Services/order APIs | Yes | Confirmed by route/test |
| `/track-order` | Track order | Public | PublicLayout | Tracking API | Yes | Confirmed by screenshot/test |
| `/about` | About | Public | PublicLayout | Static/CMS content | Yes | Source confirmed |
| `/contact` | Contact | Public | PublicLayout | Static/CMS content | Yes | Source confirmed |
| `/faq` | FAQ | Public | PublicLayout | Static/CMS content | Yes | Source confirmed |
| `/privacy` | Privacy | Public | PublicLayout | Static content | Yes | Source confirmed |
| `/login` | Login | Auth | PublicLayout | Auth API | Yes | Confirmed by screenshot/test |
| `/forgot-password` | Forgot password | Auth | PublicLayout | Auth API | Yes | Source confirmed |
| `/reset-password/:token` | Reset password | Auth | PublicLayout | Auth API | Yes | Source confirmed |
| `/register` | Register | Auth | PublicLayout | Auth API | Yes | Confirmed by test |
| `/customer` | Customer dashboard | Customer | DashboardLayout | Customer APIs | Yes, auth required | Test/source confirmed |
| `/customer/orders/new` | New customer request | Customer | DashboardLayout | Services/order APIs | Yes, auth required | Source confirmed |
| `/customer/orders` | My orders | Customer | DashboardLayout | Customer orders API | Yes, auth required | Test confirmed |
| `/customer/orders/:id` | Customer order detail | Customer | DashboardLayout | Order detail API | Yes, auth required | Source confirmed |
| `/customer/orders/:id/missing-docs` | Missing documents response | Customer | DashboardLayout | Order/doc upload APIs | Yes, auth required | Test confirmed |
| `/customer/profile` | Profile | Customer | DashboardLayout | Account API | Yes, auth required | Source confirmed |
| `/customer/manual` | Customer manual | Customer | DashboardLayout | Help/manual assets | Yes, auth required | Source confirmed |
| `/employee` | Employee dashboard | Employee/support | DashboardLayout | Employee APIs | Yes, auth required | Source confirmed |
| `/employee/orders` | Review queue | Employee/support | DashboardLayout | Orders API | Yes, auth required | Test confirmed |
| `/employee/missing-service-requests` | Missing service requests | Employee/support | DashboardLayout | Missing service APIs | Yes, auth required | Source confirmed |
| `/employee/orders/:id` | Employee order review | Employee/support | DashboardLayout | Order/review APIs | Yes, auth required | Test confirmed |
| `/employee/documents/verify` | Document verification | Employee/support | DashboardLayout | Documents API | Yes, auth required | Source confirmed |
| `/employee/reports` | Employee reports | Employee/support | DashboardLayout | Reports API | Yes, auth required | Test confirmed |
| `/employee/manual` | Employee manual | Employee/support | DashboardLayout | Help/manual assets | Yes, auth required | Source confirmed |
| `/employee/service-categories` | Service categories | Support | DashboardLayout | Service category APIs | Yes, support auth required | Source confirmed |
| `/employee/service-relations` | Service relations | Support | DashboardLayout | Service relation APIs | Yes, support auth required | Source confirmed |
| `/admin` | Admin overview | Admin | DashboardLayout | Admin summary APIs | Yes, auth required | Source confirmed |
| `/admin/orders` | Orders management | Admin | DashboardLayout | Orders API | Yes, auth required | Source confirmed |
| `/admin/orders/:id` | Admin order detail | Admin | DashboardLayout | Order APIs | Yes, auth required | Source confirmed |
| `/admin/rules` | Workflow rules | Admin | DashboardLayout | Rules/services APIs | Yes, auth required | Test confirmed |
| `/admin/cms` | CMS/settings | Admin | DashboardLayout | CMS/settings APIs | Yes, auth required | Source confirmed |
| `/admin/service-categories` | Service categories | Admin | DashboardLayout | Category APIs | Yes, auth required | Source confirmed |
| `/admin/services` | Services management | Admin | DashboardLayout | Services/schema APIs | Yes, auth required | Test confirmed |
| `/admin/service-relations` | Service relations | Admin | DashboardLayout | Relation APIs | Yes, auth required | Source confirmed |
| `/admin/public-site` | Public site management | Admin | DashboardLayout | Public site APIs | Yes, auth required | Source confirmed |
| `/admin/public-site/content` | Homepage content editor | Admin | DashboardLayout | Public content APIs | Yes, auth required | Source confirmed |
| `/admin/public-site/advertisements` | Advertisements | Admin | DashboardLayout | Advertisement APIs | Yes, auth required | Source confirmed |
| `/admin/public-site/theme` | Theme settings | Admin | DashboardLayout | Theme APIs | Yes, auth required | Source confirmed |
| `/admin/public-site/preview` | Public preview | Admin | DashboardLayout | Public site APIs | Yes, auth required | Source confirmed |
| `/admin/missing-service-requests` | Missing service requests | Admin | DashboardLayout | Missing service APIs | Yes, auth required | Source confirmed |
| `/admin/users` | Users and roles | Admin | DashboardLayout | Users/permissions APIs | Yes, auth required | Test confirmed |
| `/admin/providers` | Providers | Admin | DashboardLayout | Provider APIs | Yes, auth required | Test confirmed |
| `/admin/provider-services` | Provider-service assignments | Admin | DashboardLayout | Services/provider APIs | Yes, auth required | Test confirmed |
| `/admin/reports` | Reports | Admin | DashboardLayout | Reports APIs | Yes, auth required | Source confirmed |
| `/admin/notifications` | Notifications | Admin | DashboardLayout | Notifications APIs | Yes, auth required | Source confirmed |
| `/admin/payments` | Payments | Admin | DashboardLayout | Payments APIs | Yes, auth required | Source confirmed |
| `/admin/audit` | Audit log | Admin | DashboardLayout | Audit APIs | Yes, auth required | Source confirmed |
| `/admin/help-guides` | Help guide management | Admin | DashboardLayout | Help guide APIs | Yes, auth required | Source confirmed |
| `/admin/manual` | Admin manual | Admin | DashboardLayout | Help/manual assets | Yes, auth required | Source confirmed |
| `/provider` | Provider dashboard | Provider | DashboardLayout | Provider APIs | Yes, auth required | Source confirmed |
| `/provider/orders` | Assigned orders | Provider | DashboardLayout | Provider order APIs | Yes, auth required | Source confirmed |
| `/provider/orders/:id` | Provider order detail | Provider | DashboardLayout | Provider order/upload APIs | Yes, auth required | Test confirmed |
| `/provider/manual` | Provider manual | Provider | DashboardLayout | Help/manual assets | Yes, auth required | Source confirmed |

Navigation observations:
- Public and protected routes are centralized in one route component.
- Admin navigation exposes 22 links in the sidebar, which is high-density for daily use.
- Employee support-only maintenance routes are separate protected route groups and are represented in employee links with role metadata.
- No orphan production route was found in `AppRoutes.jsx`; runtime reachability of all protected screens still requires authenticated browser sweep.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:95-153` role navigation link arrays.
- `frontend/src/routes/AppRoutes.jsx:158-242` route definitions.
- `frontend/src/routes/ProtectedRoute.jsx`
