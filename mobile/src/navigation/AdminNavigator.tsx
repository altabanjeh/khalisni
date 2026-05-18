import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../features/admin/screens/AdminDashboardScreen';
import { ManageOrdersScreen } from '../features/admin/screens/ManageOrdersScreen';
import { ManageUsersScreen } from '../features/admin/screens/ManageUsersScreen';
import { ReportsDashboardScreen } from '../features/admin/screens/ReportsDashboardScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { AdminOrderDetailScreen } from '../features/admin/screens/AdminOrderDetailScreen';
import { ManageRolesScreen } from '../features/admin/screens/ManageRolesScreen';
import { ManageServicesScreen } from '../features/admin/screens/ManageServicesScreen';
import { ManagePricesScreen } from '../features/admin/screens/ManagePricesScreen';
import { ManageAdvertisementsScreen } from '../features/admin/screens/ManageAdvertisementsScreen';
import { ManagePublicContentScreen } from '../features/admin/screens/ManagePublicContentScreen';
import { AuditLogScreen } from '../features/admin/screens/AuditLogScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { OrderDetailResolverScreen } from '../screens/shared/OrderDetailResolverScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tab.Screen name="ManageOrders" component={ManageOrdersScreen} options={{ title: 'الطلبات', tabBarIcon: ({ color, size }) => <Ionicons name="file-tray-full-outline" color={color} size={size} /> }} />
      <Tab.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: 'المستخدمون', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tab.Screen name="ReportsDashboard" component={ReportsDashboardScreen} options={{ title: 'التقارير', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} />
      <Stack.Screen name="ManageRoles" component={ManageRolesScreen} />
      <Stack.Screen name="ManageServices" component={ManageServicesScreen} />
      <Stack.Screen name="ManagePrices" component={ManagePricesScreen} />
      <Stack.Screen name="ManageAdvertisements" component={ManageAdvertisementsScreen} />
      <Stack.Screen name="ManagePublicContent" component={ManagePublicContentScreen} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OrderDetailResolver" component={OrderDetailResolverScreen} />
    </Stack.Navigator>
  );
}
