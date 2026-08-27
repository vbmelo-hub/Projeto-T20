import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function ModalHeader({ title, onClose }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>x</Text>
      </Pressable>
    </View>
  );
}
