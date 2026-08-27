import { Text, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function AboutScreen() {
  return (
    <View style={styles.aboutPaper}>
      <View style={styles.aboutTint} />
      <View style={styles.aboutPanel}>
        <Text style={styles.aboutTitle}>Sobre o Grimório 20</Text>
        <Text style={styles.aboutBody}>
          O Grimório 20 é um projeto acadêmico desenvolvido como parte da avaliação da disciplina de Dispositivos Móveis, no curso de Sistemas para Internet do Instituto Federal do Acre (IFAC).
        </Text>
        <Text style={styles.aboutBody}>
          Seu propósito é disponibilizar uma aplicação prática, intuitiva e organizada para consulta e gerenciamento de magias no universo de Tormenta 20, unindo utilidade, acessibilidade e uma experiência visual agradável.
        </Text>
        <View style={styles.aboutCredits}>
          <Text style={styles.aboutCreditText}>Disciplina ministrada por:</Text>
          <Text style={styles.aboutCreditText}>Flávio Miranda</Text>
        </View>
        <View style={styles.aboutCredits}>
          <Text style={styles.aboutCreditText}>Projeto desenvolvido por:</Text>
          <Text style={styles.aboutCreditText}>Vinícius Barros de Melo</Text>
        </View>
      </View>
    </View>
  );
}
