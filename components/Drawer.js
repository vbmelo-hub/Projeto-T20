import { Modal, Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import Toast from './Toast';

export default function Drawer({ visible, onClose, onNavigate, onLogout, notification, onToastClose }) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerLayer} onPress={onClose}>
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Grimorio 20</Text>
          <Pressable onPress={() => onNavigate('welcome')} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>Boas-vindas</Text>
          </Pressable>
          <Pressable onPress={() => onNavigate('home')} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>Magias</Text>
          </Pressable>
          <Pressable onPress={() => onNavigate('characters')} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>Personagens</Text>
          </Pressable>
          <Pressable onPress={() => onNavigate('about')} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>Sobre</Text>
          </Pressable>
          <Pressable onPress={onLogout} style={styles.drawerDanger}>
            <Text style={styles.primaryText}>Sair</Text>
          </Pressable>
        </View>
      </Pressable>
      <Toast notification={notification} onClose={onToastClose} />
    </Modal>
  );
}
