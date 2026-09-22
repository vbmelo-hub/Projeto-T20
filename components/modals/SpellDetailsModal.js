import { Pressable, Text, View } from 'react-native';

import styles from '../../styles/commonStyles';
import ModalHeader from '../ModalHeader';

export default function SpellDetailsModal({
  spell,
  characterLink,
  onTogglePrepared,
  onAddToCharacter,
  onEdit,
  onClose,
}) {
  return (
    <View>
      <ModalHeader title={spell.name} onClose={onClose} />
      <Text style={styles.subtitle}>{[spell.type, spell.school, spell.circle].filter(Boolean).join(' - ')}</Text>
      <Text style={styles.bodyText}>Execucao: {spell.execution || 'Nao informado'}</Text>
      <Text style={styles.bodyText}>Alcance: {spell.range || 'Nao informado'}</Text>
      <Text style={styles.bodyText}>Duracao: {spell.duration || 'Nao informado'}</Text>
      <Text style={styles.bodyText}>Alvo/area: {spell.target || 'Nao informado'}</Text>
      <Text style={styles.bodyText}>Resistencia: {spell.resistance || 'Nao informado'}</Text>
      <Text style={styles.description}>{spell.description || 'Sem descricao.'}</Text>
      {(spell.upgrades ?? []).map((upgrade, index) => (
        <Text key={`${spell.id}-upgrade-${index}`} style={styles.bodyText}>{upgrade}</Text>
      ))}
      <Text style={styles.bodyText}>Fonte: {spell.source || 'Nao informado'}</Text>
      {characterLink ? (
        <Pressable onPress={() => onTogglePrepared(spell.id)} style={styles.primary}>
          <Text style={styles.primaryText}>
            {characterLink.prepared ? 'Despreparar magia' : 'Preparar magia'}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => onAddToCharacter(spell)} style={styles.primary}>
          <Text style={styles.primaryText}>Adicionar a personagem</Text>
        </Pressable>
      )}
      <Pressable onPress={() => onEdit(spell)} style={styles.secondary}>
        <Text style={styles.secondaryText}>Editar magia</Text>
      </Pressable>
    </View>
  );
}
