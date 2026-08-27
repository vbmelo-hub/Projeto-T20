import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import { EyeMark } from './Branding';
import { MenuGlyph } from './Icons';

export default function Header({ onOpenDrawer, onGoHome, onGoAbout }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onOpenDrawer} style={styles.iconButton} accessibilityLabel="Abrir menu">
        <MenuGlyph />
      </Pressable>
      <Pressable onPress={onGoHome} style={styles.brandButton}>
        <EyeMark compact />
      </Pressable>
      <Pressable onPress={onGoAbout} style={styles.iconButton} accessibilityLabel="Sobre o projeto">
        <Text style={styles.iconButtonText}>i</Text>
      </Pressable>
    </View>
  );
}
