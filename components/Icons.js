import { Text, View } from 'react-native';

import styles from '../styles/commonStyles';

export function MenuGlyph() {
  return (
    <View style={styles.menuGlyph}>
      <View style={styles.menuGlyphLine} />
      <View style={styles.menuGlyphLine} />
      <View style={styles.menuGlyphLine} />
    </View>
  );
}

export function FilterGlyph() {
  return (
    <View style={styles.filterGlyph}>
      <View style={styles.filterGlyphTop} />
      <View style={styles.filterGlyphMiddle} />
      <View style={styles.filterGlyphBottom} />
    </View>
  );
}

export function FolderGlyph() {
  return (
    <View style={styles.folderGlyph}>
      <View style={styles.folderTab} />
      <View style={styles.folderBody}>
        <Text style={styles.folderPlus}>+</Text>
      </View>
    </View>
  );
}

export function AddMagicGlyph() {
  return (
    <View style={styles.addMagicGlyph}>
      <View style={styles.addMagicGlyphFrame}>
        <View style={styles.addMagicGlyphTop} />
        <View style={styles.addMagicGlyphPlusHorizontal} />
        <View style={styles.addMagicGlyphPlusVertical} />
      </View>
    </View>
  );
}

export function EditGlyph() {
  return (
    <View style={styles.editGlyph}>
      <View style={styles.editGlyphBody} />
      <View style={styles.editGlyphTip} />
    </View>
  );
}

export function DeleteGlyph() {
  return (
    <View style={styles.deleteGlyph}>
      <View style={styles.deleteGlyphLid} />
      <View style={styles.deleteGlyphHandle} />
      <View style={styles.deleteGlyphBody}>
        <View style={styles.deleteGlyphCrossA} />
        <View style={styles.deleteGlyphCrossB} />
      </View>
    </View>
  );
}

export function SmallFolderGlyph({ active }) {
  return (
    <View style={[styles.smallFolderGlyph, active && styles.navGlyphActive]}>
      <View style={styles.smallFolderTab} />
      <View style={styles.smallFolderBody} />
    </View>
  );
}

export function BookGlyph({ active }) {
  return (
    <View style={[styles.bookGlyph, active && styles.navGlyphActive]}>
      <View style={styles.bookPage} />
      <View style={styles.bookPage} />
    </View>
  );
}
