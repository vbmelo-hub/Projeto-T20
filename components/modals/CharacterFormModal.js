import { Image, Pressable, Text, View } from 'react-native';

import styles from '../../styles/commonStyles';
import Field from '../Field';
import ModalHeader from '../ModalHeader';

export default function CharacterFormModal({
  editing,
  form,
  onFieldChange,
  onPickPhoto,
  pickingPhoto,
  onRequestRemovePhoto,
  onSave,
  onClose,
}) {
  return (
    <View>
      <ModalHeader title={editing ? 'Editar personagem' : 'Criar personagem'} onClose={onClose} />
      <Field label="Nome*" value={form.name} onChangeText={(value) => onFieldChange('name', value)} />
      <Field label="Raca" value={form.race} onChangeText={(value) => onFieldChange('race', value)} />
      <Field
        label="Classe"
        value={form.characterClass}
        onChangeText={(value) => onFieldChange('characterClass', value)}
      />
      <View style={styles.field}>
        <Text style={styles.label}>Foto</Text>
        {form.photo ? (
          <View style={styles.characterPhotoPreview}>
            <Image source={{ uri: form.photo }} style={styles.characterPhotoPreviewImage} />
          </View>
        ) : (
          <Text style={styles.bodyText}>Nenhuma imagem selecionada.</Text>
        )}
        <View style={styles.modalActionRow}>
          <Pressable
            onPress={onPickPhoto}
            disabled={pickingPhoto}
            style={[
              styles.secondary,
              styles.modalActionButton,
              pickingPhoto && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.secondaryText}>
              {pickingPhoto ? 'Abrindo galeria...' : form.photo ? 'Trocar imagem' : 'Selecionar imagem'}
            </Text>
          </Pressable>
          {form.photo ? (
            <Pressable onPress={onRequestRemovePhoto} style={[styles.ghost, styles.modalActionButton]}>
              <Text style={styles.ghostText}>Remover</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Pressable onPress={onSave} style={styles.primary}>
        <Text style={styles.primaryText}>Salvar</Text>
      </Pressable>
    </View>
  );
}
