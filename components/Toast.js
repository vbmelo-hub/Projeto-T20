import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';

const toastConfig = {
  success: { icon: '✓', title: 'Tudo certo', style: 'toastSuccess', iconStyle: 'toastIconSuccess' },
  error: { icon: '!', title: 'Algo deu errado', style: 'toastError', iconStyle: 'toastIconError' },
  warning: { icon: '!', title: 'Atenção', style: 'toastWarning', iconStyle: 'toastIconWarning' },
  info: { icon: 'i', title: 'Informação', style: 'toastInfo', iconStyle: 'toastIconInfo' },
};

export default function Toast({ notification, onClose }) {
  if (!notification?.message) return null;

  const config = toastConfig[notification.type] ?? toastConfig.info;

  return (
    <View style={styles.toastLayer} pointerEvents="box-none">
      <Pressable
        onPress={onClose}
        style={[styles.toast, styles[config.style]]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View style={styles.toastContent}>
          <Text style={[styles.toastIcon, styles[config.iconStyle]]}>{config.icon}</Text>
          <View style={styles.toastMessage}>
            <Text style={styles.toastTitle}>{notification.title ?? config.title}</Text>
            <Text style={styles.toastText}>{notification.message}</Text>
          </View>
          <Text style={styles.toastClose}>×</Text>
        </View>
      </Pressable>
    </View>
  );
}
