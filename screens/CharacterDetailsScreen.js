import { Pressable, Text, View } from 'react-native';

import Avatar from '../components/Avatar';
import SpellCard from '../components/SpellCard';
import Surface from '../components/Surface';
import styles from '../styles/commonStyles';

export default function CharacterDetailsScreen({
  character,
  spells,
  onOpenSpell,
  onTogglePrepared,
  onRequestRemoveSpell,
  onLearnSpell,
}) {
  if (!character) return null;

  return (
    <View>
      <Surface style={styles.cardCentered} centered>
        <Avatar character={character} large />
        <Text style={styles.title}>{character.name}</Text>
        <Text style={styles.bodyText}>
          {[character.race, character.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}
        </Text>
      </Surface>
      {spells.length ? null : (
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Lista de magias vazia</Text>
          <Text style={styles.bodyText}>Este personagem ainda nao possui magias vinculadas.</Text>
        </Surface>
      )}
      {spells.map((spell) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          primaryLabel={spell.prepared ? 'Despreparar' : 'Preparar'}
          secondaryLabel="Remover"
          onOpen={() => onOpenSpell(spell)}
          onPrimary={() => onTogglePrepared(spell.id)}
          onSecondary={() => onRequestRemoveSpell(spell)}
        />
      ))}
      <Pressable onPress={onLearnSpell} style={styles.learnSpellButton}>
        <Text style={styles.primaryText}>Aprender nova magia</Text>
      </Pressable>
    </View>
  );
}
