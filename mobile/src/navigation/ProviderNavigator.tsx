import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProviderDashboardScreen } from '../features/provider/screens/ProviderDashboardScreen';
import { AssignedOrdersScreen } from '../features/provider/screens/AssignedOrdersScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { ProviderOrderDetailScreen } from '../features/provider/screens/ProviderOrderDetailScreen';
import { UploadFinalDocumentScreen } from '../features/provider/screens/UploadFinalDocumentScreen';
import { ProviderTaskUpdateScreen } from '../features/provider/screens/ProviderTaskUpdateScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { OrderDetailResolverScreen } from '../screens/shared/OrderDetailResolverScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProviderTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="ProviderDashboard" component={ProviderDashboardScreen} options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tab.Screen name="AssignedOrders" component={AssignedOrdersScreen} options={{ title: 'الأعمال', tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function ProviderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderTabs" component={ProviderTabs} />
      <Stack.Screen name="ProviderOrderDetail" component={ProviderOrderDetailScreen} />
      <Stack.Screen name="UploadFinalDocument" component={UploadFinalDocumentScreen} />
      <Stack.Screen name="ProviderTaskUpdate" component={ProviderTaskUpdateScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OrderDetailResolver" component={OrderDetailResolverScreen} />
    </Stack.Navigator>
  );
}
