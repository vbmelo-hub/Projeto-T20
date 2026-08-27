import { Pressable, Text } from 'react-native';

import styles from '../styles/commonStyles';

export default function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <Pressable onPress={onClose} style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </Pressable>
  );
}
