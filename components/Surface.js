import { View } from 'react-native';

import styles from '../styles/commonStyles';

export default function Surface({ children, style, centered = false }) {
  return (
    <View style={[styles.surfaceBackground, centered && styles.surfaceCentered, style]}>
      <View style={styles.cardImageTint} />
      <View style={[styles.surfaceContent, centered && styles.surfaceCenteredContent]}>
        {children}
      </View>
    </View>
  );
}
