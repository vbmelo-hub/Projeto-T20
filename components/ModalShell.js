import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function ModalShell({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
          <View style={styles.modalBackground}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
