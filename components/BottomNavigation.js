import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import { BookGlyph, SmallFolderGlyph } from './Icons';

export default function BottomNavigation({ view, onGoHome, onCreateSpell, onGoCharacters }) {
  return (
    <View style={styles.bottomNav}>
      <Pressable onPress={onGoHome} style={styles.navButton}>
        <BookGlyph active={view === 'home'} />
        <Text style={[styles.navText, view === 'home' && styles.navActive]}>Grimorio</Text>
      </Pressable>
      {view === 'home' ? (
        <Pressable onPress={onCreateSpell} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      ) : (
        <View style={styles.addButtonSpacer} />
      )}
      <Pressable onPress={onGoCharacters} style={styles.navButton}>
        <SmallFolderGlyph active={view === 'characters' || view === 'character'} />
        <Text style={[styles.navText, (view === 'characters' || view === 'character') && styles.navActive]}>
          Personagens
        </Text>
      </Pressable>
    </View>
  );
}
