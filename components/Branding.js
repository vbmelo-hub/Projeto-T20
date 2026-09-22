import { Image, View } from 'react-native';

import imagemLogo from '../data/imagem-logo';
import styles from '../styles/commonStyles';

export function Logo() {
  return (
    <View style={styles.logo}>
      <Image source={{ uri: imagemLogo }} style={styles.imagemLogo} resizeMode="contain" />
    </View>
  );
}

export function EyeMark({ compact = false }) {
  return (
    <View style={[styles.eyeImage, compact && styles.eyeImageCompact]}>
      <Image
        source={{ uri: imagemLogo }}
        style={[styles.eyeLogo, compact && styles.eyeLogoCompact]}
        resizeMode="contain"
      />
    </View>
  );
}
