import { Picker } from '@react-native-picker/picker';
import { Pressable, Text, View } from 'react-native';

import styles from '../../styles/commonStyles';
import { filterKeys, filterLabels } from '../../utils/filters';
import ModalHeader from '../ModalHeader';

export default function FilterModal({
  filters,
  options,
  onChange,
  onClear,
  onSubmit,
  onClose,
}) {
  return (
    <View>
      <ModalHeader title="Filtros" onClose={onClose} />
      {filterKeys.map((key) => (
        <View key={key} style={styles.filterGroup}>
          <Text style={styles.label}>{filterLabels[key]}</Text>
          <View style={styles.pickerFrame}>
            <Picker
              selectedValue={filters[key]}
              onValueChange={(value) => onChange(key, value)}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {(options[key] ?? []).map((value) => (
                <Picker.Item key={value} label={value} value={value} />
              ))}
            </Picker>
          </View>
        </View>
      ))}
      <View style={styles.modalActionRow}>
        <Pressable onPress={onClear} style={[styles.secondary, styles.modalActionButton]}>
          <Text style={styles.secondaryText}>Limpar</Text>
        </Pressable>
        <Pressable onPress={onSubmit} style={[styles.primary, styles.modalActionButton]}>
          <Text style={styles.primaryText}>Filtrar itens</Text>
        </Pressable>
      </View>
    </View>
  );
}
