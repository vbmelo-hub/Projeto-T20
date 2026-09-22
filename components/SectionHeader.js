import { Text, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function SectionHeader({ title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDetail}>{detail}</Text>
    </View>
  );
}
