import { Pressable, Text, View } from 'react-native';

import { EMPTY_SPELL } from '../../constants/appConstants';
import styles from '../../styles/commonStyles';
import { spellLabel } from '../../utils/helpers';
import Field from '../Field';
import ModalHeader from '../ModalHeader';

export default function SpellFormModal({ editing, form, onFieldChange, onSave, onClose }) {
  return (
    <View>
      <ModalHeader title={editing ? 'Editar magia' : 'Cadastrar magia'} onClose={onClose} />
      {Object.keys(EMPTY_SPELL).map((key) => (
        <Field
          key={key}
          label={spellLabel(key)}
          value={String(form[key] ?? '')}
          multiline={key === 'description' || key === 'upgrades'}
          onChangeText={(value) => onFieldChange(key, value)}
        />
      ))}
      <Pressable onPress={onSave} style={styles.primary}>
        <Text style={styles.primaryText}>Salvar magia</Text>
      </Pressable>
    </View>
  );
}
