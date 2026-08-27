import { Text, TextInput, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function Field({ label, value, onChangeText, secureTextEntry, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
        autoCapitalize="none"
      />
    </View>
  );
}
