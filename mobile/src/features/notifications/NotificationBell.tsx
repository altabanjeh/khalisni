import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { notificationsApi } from '../../api/notifications.api';
import { useAuthStore } from '../../state/authStore';
import { theme } from '../../theme';

export function NotificationBell({ navigation }: { navigation: any }) {
  const role = useAuthStore((state) => state.role);
  const { data } = useQuery({
    queryKey: ['notifications', 'count', role],
    queryFn: () => role === 'admin' ? notificationsApi.getAdminNotifications() : notificationsApi.getNotifications(),
  });

  const unreadCount = data?.filter((item) => !item.is_read).length ?? 0;

  return (
    <Pressable style={styles.button} onPress={() => navigation.navigate('Notifications')}>
      <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
      {unreadCount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});
