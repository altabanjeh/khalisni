import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EmployeeDashboardScreen } from '../features/employee/screens/EmployeeDashboardScreen';
import { ReviewOrdersScreen } from '../features/employee/screens/ReviewOrdersScreen';
import { EmployeeTasksScreen } from '../features/employee/screens/EmployeeTasksScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { EmployeeOrderDetailScreen } from '../features/employee/screens/EmployeeOrderDetailScreen';
import { VerifyDocumentsScreen } from '../features/employee/screens/VerifyDocumentsScreen';
import { RequestMissingDocumentScreen } from '../features/employee/screens/RequestMissingDocumentScreen';
import { AssignProviderScreen } from '../features/employee/screens/AssignProviderScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { OrderDetailResolverScreen } from '../screens/shared/OrderDetailResolverScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function EmployeeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tab.Screen name="ReviewOrders" component={ReviewOrdersScreen} options={{ title: 'المراجعة', tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} /> }} />
      <Tab.Screen name="EmployeeTasks" component={EmployeeTasksScreen} options={{ title: 'المهام', tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function EmployeeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
      <Stack.Screen name="EmployeeOrderDetail" component={EmployeeOrderDetailScreen} />
      <Stack.Screen name="VerifyDocuments" component={VerifyDocumentsScreen} />
      <Stack.Screen name="RequestMissingDocument" component={RequestMissingDocumentScreen} />
      <Stack.Screen name="AssignProvider" component={AssignProviderScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OrderDetailResolver" component={OrderDetailResolverScreen} />
    </Stack.Navigator>
  );
}
