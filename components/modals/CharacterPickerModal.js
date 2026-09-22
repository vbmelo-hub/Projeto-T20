import { Pressable, Text, View } from 'react-native';

import styles from '../../styles/commonStyles';
import ModalHeader from '../ModalHeader';

export default function CharacterPickerModal({
  availableCharacters,
  hasCharacters,
  spell,
  onSelect,
  onCreateCharacter,
  onClose,
}) {
  const allCharactersAlreadyLinked = hasCharacters && availableCharacters.length === 0;

  return (
    <View>
      <ModalHeader
        title={
          availableCharacters.length
            ? 'Selecione um personagem'
            : !hasCharacters
              ? 'Lista de personagens vazia'
              : 'Nenhum personagem disponivel'
        }
        onClose={onClose}
      />
      {!hasCharacters ? (
        <Text style={styles.bodyText}>Crie um personagem antes de adicionar magias.</Text>
      ) : null}
      {allCharactersAlreadyLinked ? (
        <Text style={styles.bodyText}>Todos os seus personagens ja possuem esta magia.</Text>
      ) : null}
      {availableCharacters.map((character) => (
        <View key={character.id} style={styles.pickerItem}>
          <Pressable onPress={() => onSelect(character.id, spell.id)}>
            <Text style={styles.cardTitle}>{character.name}</Text>
            <Text style={styles.bodyText}>{character.characterClass || 'Sem classe'}</Text>
          </Pressable>
        </View>
      ))}
      {!hasCharacters ? (
        <Pressable onPress={onCreateCharacter} style={styles.primary}>
          <Text style={styles.primaryText}>Criar personagem</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
