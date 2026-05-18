import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ClientDashboardScreen } from '../features/client/screens/ClientDashboardScreen';
import { ServiceListScreen } from '../features/client/screens/ServiceListScreen';
import { MyOrdersScreen } from '../features/client/screens/MyOrdersScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { ServiceDetailScreen } from '../features/client/screens/ServiceDetailScreen';
import { CreateOrderScreen } from '../features/client/screens/CreateOrderScreen';
import { UploadOrderDocumentsScreen } from '../features/client/screens/UploadOrderDocumentsScreen';
import { ClientOrderDetailScreen } from '../features/client/screens/ClientOrderDetailScreen';
import { MissingDocumentRequestsScreen } from '../features/client/screens/MissingDocumentRequestsScreen';
import { RespondToMissingDocumentScreen } from '../features/client/screens/RespondToMissingDocumentScreen';
import { FinalDocumentScreen } from '../features/client/screens/FinalDocumentScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { OrderDetailResolverScreen } from '../screens/shared/OrderDetailResolverScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen name="ClientDashboard" component={ClientDashboardScreen} options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tab.Screen name="ServiceList" component={ServiceListScreen} options={{ title: 'الخدمات', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
      <Tab.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'طلباتي', tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات', tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen name="UploadOrderDocuments" component={UploadOrderDocumentsScreen} />
      <Stack.Screen name="ClientOrderDetail" component={ClientOrderDetailScreen} />
      <Stack.Screen name="MissingDocumentRequests" component={MissingDocumentRequestsScreen} />
      <Stack.Screen name="RespondToMissingDocument" component={RespondToMissingDocumentScreen} />
      <Stack.Screen name="FinalDocument" component={FinalDocumentScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OrderDetailResolver" component={OrderDetailResolverScreen} />
    </Stack.Navigator>
  );
}
