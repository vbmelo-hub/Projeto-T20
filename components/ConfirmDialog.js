import { Modal, Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import Toast from './Toast';

export default function ConfirmDialog({ dialog, onClose, onConfirm, notification, onToastClose }) {
  return (
    <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <View style={styles.confirmDialog}>
          <Text style={styles.confirmTitle}>{dialog?.title || 'Confirmar exclusao'}</Text>
          <Text style={styles.bodyText}>{dialog?.message || 'Tem certeza que deseja continuar?'}</Text>
          <View style={styles.modalActionRow}>
            <Pressable onPress={onClose} style={[styles.secondary, styles.modalActionButton]}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.danger, styles.modalActionButton]}>
              <Text style={styles.primaryText}>{dialog?.confirmLabel || 'Excluir'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <Toast notification={notification} onClose={onToastClose} />
    </Modal>
  );
}
