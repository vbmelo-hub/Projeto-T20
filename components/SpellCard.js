import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';
import { FolderGlyph } from './Icons';
import Surface from './Surface';

export default function SpellCard({
  spell,
  onOpen,
  onPrimary,
  primaryLabel,
  primaryA11y,
  onSecondary,
  secondaryLabel,
}) {
  return (
    <Surface style={styles.spellCard}>
      <Pressable onPress={onOpen}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{spell.name}</Text>
          {spell.prepared ? <View style={styles.bookmark} /> : null}
        </View>
        <View style={styles.tags}>
          {[spell.type, spell.school, spell.circle].filter(Boolean).map((tag) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>
        <Text style={styles.bodyText}>
          Execucao: {spell.execution || 'Nao informado'}; Alcance: {spell.range || 'Nao informado'}
        </Text>
        <Text style={styles.bodyText}>Fonte: {spell.source || 'Nao informado'}</Text>
        {spell.prepared ? <Text style={styles.prepared}>Preparada</Text> : null}
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={onOpen} style={styles.secondary}>
          <Text style={styles.secondaryText}>Detalhes</Text>
        </Pressable>
        <Pressable onPress={onPrimary} style={styles.primary} accessibilityLabel={primaryA11y}>
          {primaryA11y === 'Adicionar a personagem' ? (
            <FolderGlyph />
          ) : (
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          )}
        </Pressable>
        {onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.danger}>
            <Text style={styles.primaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Surface>
  );
}
