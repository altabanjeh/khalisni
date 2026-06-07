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
import { useLanguage } from '../context/LanguageContext'
import DashboardLayout from '../layouts/DashboardLayout'
import PublicLayout from '../layouts/PublicLayout'
import ManualLaunchPage from '../pages/shared/ManualLaunchPage'
import ProtectedRoute from './ProtectedRoute'

import HomePage from '../pages/public/HomePage'
import ServicesPage from '../pages/public/ServicesPage'
import ServiceDetailsPage from '../pages/public/ServiceDetailsPage'
import ForgotPasswordPage from '../pages/public/ForgotPasswordPage'
import LoginPage from '../pages/public/LoginPage'
import RegisterPage from '../pages/public/RegisterPage'
import ResetPasswordPage from '../pages/public/ResetPasswordPage'

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

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  )
}

function AppRoutes() {
  const { t } = useLanguage()

  const customerLinks = [
    { to: '/customer', label: t('public.home', 'الرئيسية'), icon: Home },
    { to: '/customer/orders/new', label: t('customer.newOrder', 'طلب جديد'), icon: FilePlus2 },
    { to: '/customer/orders', label: t('customer.myOrders', 'طلباتي'), icon: ClipboardList },
    { to: '/customer/profile', label: t('customer.profile', 'الملف الشخصي'), icon: UserCog },
    { to: '/customer/manual', label: t('routes.manual', 'الدليل'), icon: BookOpenText },
  ]

  const employeeLinks = [
    { to: '/employee', label: t('employee.dashboard', 'الرئيسية'), icon: LayoutDashboard },
    { to: '/employee/orders', label: t('employee.reviewQueue', 'قائمة المراجعة'), icon: FileSearch },
    { to: '/employee/missing-service-requests', label: t('employee.missingServices', 'طلبات خدمات جديدة'), icon: MessageSquareMore },
    { to: '/employee/service-categories', label: t('employee.serviceCategories', 'تصنيفات الخدمات'), icon: FolderTree, roles: ['support'] },
    { to: '/employee/service-relations', label: t('employee.serviceRelations', 'علاقات الخدمات'), icon: GitBranchPlus, roles: ['support'] },
    { to: '/employee/documents/verify', label: t('employee.verifyDocuments', 'التحقق من الوثائق'), icon: ShieldCheck },
    { to: '/employee/reports', label: t('employee.reports', 'تقارير الموظف'), icon: LineChart },
    { to: '/employee/manual', label: t('routes.manual', 'الدليل'), icon: BookOpenText },
  ]

  const adminLinks = [
    { to: '/admin', label: t('routes.adminPortal', 'لوحة الإدارة'), icon: LayoutDashboard },
    { to: '/admin/orders', label: t('admin.orders', 'إدارة الطلبات'), icon: FolderKanban },
    { to: '/admin/rules', label: t('admin.rules', 'قواعد التشغيل'), icon: Settings },
    { to: '/admin/cms', label: t('admin.settings', 'إعدادات النظام'), icon: Database },
    { to: '/admin/service-categories', label: t('admin.serviceCategories', 'تصنيفات الخدمات'), icon: FolderTree },
    { to: '/admin/services', label: t('admin.services', 'الخدمات'), icon: Settings },
    { to: '/admin/service-relations', label: t('admin.serviceRelations', 'علاقات الخدمات'), icon: GitBranchPlus },
    { to: '/admin/public-site', label: t('admin.publicSite', 'الموقع العام'), icon: Monitor },
    { to: '/admin/public-site/content', label: t('admin.homepageContent', 'محتوى الرئيسية'), icon: FileText },
    { to: '/admin/public-site/advertisements', label: t('admin.advertisements', 'الإعلانات'), icon: ImagePlus },
    { to: '/admin/public-site/theme', label: t('admin.theme', 'المظهر العام'), icon: Palette },
    { to: '/admin/public-site/preview', label: t('admin.preview', 'معاينة الواجهة'), icon: Eye },
    { to: '/admin/missing-service-requests', label: t('admin.missingServices', 'طلبات الخدمات الجديدة'), icon: MessageSquareMore },
    { to: '/admin/users', label: t('admin.usersRoles', 'المستخدمون والأدوار'), icon: UsersRound },
    { to: '/admin/providers', label: t('admin.providers', 'المزوّدون'), icon: BriefcaseBusiness },
    { to: '/admin/provider-services', label: t('admin.providerServices', 'خدمات المزوّدين'), icon: ClipboardList },
    { to: '/admin/payments', label: t('admin.payments', 'المدفوعات'), icon: CreditCard },
    { to: '/admin/reports', label: t('admin.reports', 'التقارير'), icon: LineChart },
    { to: '/admin/notifications', label: t('admin.notifications', 'الإشعارات'), icon: Bell },
    { to: '/admin/audit', label: t('admin.audit', 'سجل التدقيق'), icon: ShieldCheck },
    { to: '/admin/help-guides', label: t('admin.helpGuides', 'إدارة الدليل'), icon: BookOpenText },
    { to: '/admin/manual', label: t('routes.manual', 'الدليل'), icon: BookOpenText },
  ]

  const providerLinks = [
    { to: '/provider', label: t('provider.dashboard', 'الرئيسية'), icon: Home },
    { to: '/provider/orders', label: t('provider.orders', 'الطلبات المعيّنة'), icon: ClipboardList },
    { to: '/provider/manual', label: t('routes.manual', 'الدليل'), icon: BookOpenText },
  ]

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
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route element={<DashboardLayout links={customerLinks} title={t('routes.customerPortal', 'بوابة العميل')} />}>
              <Route path="/customer" element={<CustomerDashboardHome />} />
              <Route path="/customer/orders/new" element={<CustomerCreateOrderPage />} />
              <Route path="/customer/orders" element={<MyOrdersPage />} />
              <Route path="/customer/orders/:id" element={<CustomerOrderDetailsPage />} />
              <Route path="/customer/orders/:id/missing-docs" element={<MissingDocumentsResponsePage />} />
              <Route path="/customer/profile" element={<ProfilePage />} />
              <Route path="/customer/manual" element={<ManualLaunchPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['employee', 'support']} />}>
            <Route element={<DashboardLayout links={employeeLinks} title={t('routes.employeePortal', 'بوابة الموظف')} />}>
              <Route path="/employee" element={<EmployeeDashboardHome />} />
              <Route path="/employee/orders" element={<EmployeeReviewQueuePage />} />
              <Route path="/employee/missing-service-requests" element={<MissingServiceRequestsPage />} />
              <Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} />
              <Route path="/employee/documents/verify" element={<EmployeeVerifyDocumentsPage />} />
              <Route path="/employee/reports" element={<EmployeeReportsPage />} />
              <Route path="/employee/manual" element={<ManualLaunchPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['support']} />}>
            <Route element={<DashboardLayout links={employeeLinks} title={t('routes.employeePortal', 'بوابة الموظف')} />}>
              <Route path="/employee/service-categories" element={<ServiceCategoryManagementPage />} />
              <Route path="/employee/service-relations" element={<ServiceRelationsManagementPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<DashboardLayout links={adminLinks} title={t('routes.adminPortal', 'لوحة الإدارة')} />}>
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
              <Route path="/admin/manual" element={<ManualLaunchPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['provider']} />}>
            <Route element={<DashboardLayout links={providerLinks} title={t('routes.providerPortal', 'بوابة المزود')} />}>
              <Route path="/provider" element={<ProviderDashboardHome />} />
              <Route path="/provider/orders" element={<AssignedOrdersPage />} />
              <Route path="/provider/orders/:id" element={<ProviderOrderDetailsPage />} />
              <Route path="/provider/manual" element={<ManualLaunchPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export default AppRoutes
