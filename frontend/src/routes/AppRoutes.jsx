import {
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  Database,
  Eye,
  FilePlus2,
  FileSearch,
  FileText,
  FolderTree,
  FolderKanban,
  GitBranchPlus,
  Home,
  ImagePlus,
  LayoutDashboard,
  LineChart,
  MessageSquareMore,
  Monitor,
  Palette,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
} from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RouteErrorBoundary from '../components/RouteErrorBoundary'
import DashboardLayout from '../layouts/DashboardLayout'
import PublicLayout from '../layouts/PublicLayout'
import ProtectedRoute from './ProtectedRoute'

import HomePage from '../pages/public/HomePage'
import ServicesPage from '../pages/public/ServicesPage'
import ServiceDetailsPage from '../pages/public/ServiceDetailsPage'
import LoginPage from '../pages/public/LoginPage'
import RegisterPage from '../pages/public/RegisterPage'

const CreateOrderPage = lazy(() => import('../pages/public/CreateOrderPage'))
const TrackOrderPage = lazy(() => import('../pages/public/TrackOrderPage'))
const AboutPage = lazy(() => import('../pages/public/AboutPage'))
const ContactPage = lazy(() => import('../pages/public/ContactPage'))
const FaqPage = lazy(() => import('../pages/public/FaqPage'))
const PrivacyPolicyPage = lazy(() => import('../pages/public/PrivacyPolicyPage'))

const CustomerDashboardHome = lazy(() => import('../pages/customer/CustomerDashboardHome'))
const CustomerCreateOrderPage = lazy(() => import('../pages/customer/CustomerCreateOrderPage'))
const MyOrdersPage = lazy(() => import('../pages/customer/MyOrdersPage'))
const CustomerOrderDetailsPage = lazy(() => import('../pages/customer/CustomerOrderDetailsPage'))
const MissingDocumentsResponsePage = lazy(() => import('../pages/customer/MissingDocumentsResponsePage'))
const ProfilePage = lazy(() => import('../pages/customer/ProfilePage'))

const EmployeeDashboardHome = lazy(() => import('../pages/employee/EmployeeDashboardHome'))
const EmployeeReviewQueuePage = lazy(() => import('../pages/employee/EmployeeReviewQueuePage'))
const EmployeeOrderReviewPage = lazy(() => import('../pages/employee/EmployeeOrderReviewPage'))
const EmployeeVerifyDocumentsPage = lazy(() => import('../pages/employee/EmployeeVerifyDocumentsPage'))
const EmployeeReportsPage = lazy(() => import('../pages/employee/EmployeeReportsPage'))
const MissingServiceRequestsPage = lazy(() => import('../pages/shared/MissingServiceRequestsPage'))
const ServiceCategoryManagementPage = lazy(() => import('../pages/shared/ServiceCategoryManagementPage'))
const ServiceRelationsManagementPage = lazy(() => import('../pages/shared/ServiceRelationsManagementPage'))

const AdminOverviewPage = lazy(() => import('../pages/admin/AdminOverviewPage'))
const OrdersManagementPage = lazy(() => import('../pages/admin/OrdersManagementPage'))
const AdminOrderDetailsPage = lazy(() => import('../pages/admin/AdminOrderDetailsPage'))
const AdminRuleManagementPage = lazy(() => import('../pages/admin/AdminRuleManagementPage'))
const AdminCmsPage = lazy(() => import('../pages/admin/AdminCmsPage'))
const ServicesManagementPage = lazy(() => import('../pages/admin/ServicesManagementPage'))
const PublicSiteManagementPage = lazy(() => import('../pages/admin/PublicSiteManagementPage'))
const HomepageContentEditorPage = lazy(() => import('../pages/admin/HomepageContentEditorPage'))
const AdvertisementManagerPage = lazy(() => import('../pages/admin/AdvertisementManagerPage'))
const ThemeSettingsPage = lazy(() => import('../pages/admin/ThemeSettingsPage'))
const PreviewPublicPage = lazy(() => import('../pages/admin/PreviewPublicPage'))
const AdminUsersRolesPage = lazy(() => import('../pages/admin/AdminUsersRolesPage'))
const ProvidersManagementPage = lazy(() => import('../pages/admin/ProvidersManagementPage'))
const ServiceProviderAssignmentsPage = lazy(() => import('../pages/admin/ServiceProviderAssignmentsPage'))
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage'))
const NotificationsPage = lazy(() => import('../pages/admin/NotificationsPage'))
const PaymentsManagementPage = lazy(() => import('../pages/admin/PaymentsManagementPage'))
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'))
const HelpGuideManagementPage = lazy(() => import('../pages/admin/HelpGuideManagementPage'))

const ProviderDashboardHome = lazy(() => import('../pages/provider/ProviderDashboardHome'))
const AssignedOrdersPage = lazy(() => import('../pages/provider/AssignedOrdersPage'))
const ProviderOrderDetailsPage = lazy(() => import('../pages/provider/ProviderOrderDetailsPage'))

const customerLinks = [
  { to: '/customer', label: 'الرئيسية', icon: Home },
  { to: '/customer/orders/new', label: 'طلب جديد', icon: FilePlus2 },
  { to: '/customer/orders', label: 'طلباتي', icon: ClipboardList },
  { to: '/customer/profile', label: 'الملف الشخصي', icon: UserCog },
]

const employeeLinks = [
  { to: '/employee', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/employee/orders', label: 'قائمة المراجعة', icon: FileSearch },
  { to: '/employee/missing-service-requests', label: 'طلبات خدمات جديدة', icon: MessageSquareMore },
  { to: '/employee/service-categories', label: 'تصنيفات الخدمات', icon: FolderTree, roles: ['support'] },
  { to: '/employee/service-relations', label: 'علاقات الخدمات', icon: GitBranchPlus, roles: ['support'] },
  { to: '/employee/documents/verify', label: 'التحقق من الوثائق', icon: ShieldCheck },
  { to: '/employee/reports', label: 'تقارير الموظف', icon: LineChart },
]

const adminLinks = [
  { to: '/admin', label: 'لوحة الإدارة', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'إدارة الطلبات', icon: FolderKanban },
  { to: '/admin/rules', label: 'قواعد التشغيل', icon: Settings },
  { to: '/admin/cms', label: 'إعدادات النظام', icon: Database },
  { to: '/admin/service-categories', label: 'تصنيفات الخدمات', icon: FolderTree },
  { to: '/admin/services', label: 'الخدمات', icon: Settings },
  { to: '/admin/service-relations', label: 'علاقات الخدمات', icon: GitBranchPlus },
  { to: '/admin/public-site', label: 'الموقع العام', icon: Monitor },
  { to: '/admin/public-site/content', label: 'محتوى الرئيسية', icon: FileText },
  { to: '/admin/public-site/advertisements', label: 'الإعلانات', icon: ImagePlus },
  { to: '/admin/public-site/theme', label: 'المظهر العام', icon: Palette },
  { to: '/admin/public-site/preview', label: 'معاينة الواجهة', icon: Eye },
  { to: '/admin/missing-service-requests', label: 'طلبات الخدمات الجديدة', icon: MessageSquareMore },
  { to: '/admin/users', label: 'المستخدمون والأدوار', icon: UsersRound },
  { to: '/admin/providers', label: 'المزودون', icon: BriefcaseBusiness },
  { to: '/admin/provider-services', label: 'خدمات المزودين', icon: ClipboardList },
  { to: '/admin/payments', label: 'المدفوعات', icon: CreditCard },
  { to: '/admin/reports', label: 'التقارير', icon: LineChart },
  { to: '/admin/notifications', label: 'الإشعارات', icon: Bell },
  { to: '/admin/audit', label: 'سجل التدقيق', icon: ShieldCheck },
  { to: '/admin/help-guides', label: 'Help Guides', icon: BookOpenText },
]

const providerLinks = [
  { to: '/provider', label: 'الرئيسية', icon: Home },
  { to: '/provider/orders', label: 'الطلبات المعينة', icon: ClipboardList },
]

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  )
}

function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:slug" element={<ServiceDetailsPage />} />
            <Route path="/create-order" element={<CreateOrderPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route element={<DashboardLayout links={customerLinks} title="بوابة العميل" />}>
              <Route path="/customer" element={<CustomerDashboardHome />} />
              <Route path="/customer/orders/new" element={<CustomerCreateOrderPage />} />
              <Route path="/customer/orders" element={<MyOrdersPage />} />
              <Route path="/customer/orders/:id" element={<CustomerOrderDetailsPage />} />
              <Route path="/customer/orders/:id/missing-docs" element={<MissingDocumentsResponsePage />} />
              <Route path="/customer/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['employee', 'support']} />}>
            <Route element={<DashboardLayout links={employeeLinks} title="بوابة الموظف" />}>
              <Route path="/employee" element={<EmployeeDashboardHome />} />
              <Route path="/employee/orders" element={<EmployeeReviewQueuePage />} />
              <Route path="/employee/missing-service-requests" element={<MissingServiceRequestsPage />} />
              <Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} />
              <Route path="/employee/documents/verify" element={<EmployeeVerifyDocumentsPage />} />
              <Route path="/employee/reports" element={<EmployeeReportsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['support']} />}>
            <Route element={<DashboardLayout links={employeeLinks} title="بوابة الموظف" />}>
              <Route path="/employee/service-categories" element={<ServiceCategoryManagementPage />} />
              <Route path="/employee/service-relations" element={<ServiceRelationsManagementPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<DashboardLayout links={adminLinks} title="لوحة الإدارة" />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/orders" element={<OrdersManagementPage />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetailsPage />} />
              <Route path="/admin/rules" element={<AdminRuleManagementPage />} />
              <Route path="/admin/cms" element={<AdminCmsPage />} />
              <Route path="/admin/service-categories" element={<ServiceCategoryManagementPage />} />
              <Route path="/admin/services" element={<ServicesManagementPage />} />
              <Route path="/admin/service-relations" element={<ServiceRelationsManagementPage />} />
              <Route path="/admin/public-site" element={<PublicSiteManagementPage />} />
              <Route path="/admin/public-site/content" element={<HomepageContentEditorPage />} />
              <Route path="/admin/public-site/advertisements" element={<AdvertisementManagerPage />} />
              <Route path="/admin/public-site/theme" element={<ThemeSettingsPage />} />
              <Route path="/admin/public-site/preview" element={<PreviewPublicPage />} />
              <Route path="/admin/missing-service-requests" element={<MissingServiceRequestsPage />} />
              <Route path="/admin/users" element={<AdminUsersRolesPage />} />
              <Route path="/admin/providers" element={<ProvidersManagementPage />} />
              <Route path="/admin/provider-services" element={<ServiceProviderAssignmentsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/payments" element={<PaymentsManagementPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
              <Route path="/admin/help-guides" element={<HelpGuideManagementPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['provider']} />}>
            <Route element={<DashboardLayout links={providerLinks} title="بوابة المزود" />}>
              <Route path="/provider" element={<ProviderDashboardHome />} />
              <Route path="/provider/orders" element={<AssignedOrdersPage />} />
              <Route path="/provider/orders/:id" element={<ProviderOrderDetailsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default AppRoutes
