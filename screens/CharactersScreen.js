import { Pressable, Text, View } from 'react-native';

import Avatar from '../components/Avatar';
import { AddMagicGlyph, DeleteGlyph, EditGlyph } from '../components/Icons';
import SectionHeader from '../components/SectionHeader';
import Surface from '../components/Surface';
import styles from '../styles/commonStyles';
import { formatDate } from '../utils/helpers';

export default function CharactersScreen({
  characters,
  spellCounts,
  onCreate,
  onOpen,
  onAddSpell,
  onEdit,
  onRequestDelete,
}) {
  return (
    <View>
      <View style={styles.headerRow}>
        <SectionHeader title="Personagens" detail={`${characters.length} personagem(s)`} />
        <Pressable onPress={onCreate} style={styles.squareButton}>
          <Text style={styles.squareButtonText}>+</Text>
        </Pressable>
      </View>
      {characters.length ? null : (
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Nenhum personagem criado</Text>
          <Text style={styles.bodyText}>Crie um personagem para vincular magias a ele.</Text>
        </Surface>
      )}
      {characters.map((character) => (
        <Surface key={character.id} style={styles.characterCard}>
          <Pressable onPress={() => onOpen(character)} style={styles.characterMain}>
            <Avatar character={character} />
            <View style={styles.characterBody}>
              <Text style={styles.cardTitle}>{character.name}</Text>
              <Text style={styles.bodyText}>
                {[character.race, character.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}
              </Text>
              <Text style={styles.bodyText}>Criado em: {formatDate(character.createdAt)}</Text>
              <Text style={styles.bodyText}>{spellCounts[character.id] ?? 0} magia(s)</Text>
            </View>
          </Pressable>
          <View style={styles.inlineActions}>
            <Pressable onPress={() => onAddSpell(character)} style={styles.characterAddAction}>
              <AddMagicGlyph />
              <Text style={styles.characterAddActionText}>ADD. MAGIA</Text>
            </Pressable>
            <Pressable onPress={() => onEdit(character)} style={styles.characterIconAction}>
              <EditGlyph />
            </Pressable>
            <Pressable onPress={() => onRequestDelete(character)} style={styles.characterIconAction}>
              <DeleteGlyph />
            </Pressable>
          </View>
        </Surface>
      ))}
    </View>
  );
}
