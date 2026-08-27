import { Image, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import { initials } from '../utils/helpers';

export default function Avatar({ character, large }) {
  if (character.photo) {
    return <Image source={{ uri: character.photo }} style={[styles.avatar, large && styles.avatarLarge]} />;
  }

  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      <Text style={styles.avatarText}>{initials(character.name)}</Text>
    </View>
  );
}
