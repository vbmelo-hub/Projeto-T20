import { Pressable, Text, View } from 'react-native';

import styles from '../styles/commonStyles';

export default function AboutScreen({ onBack }) {
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
        <Text style={styles.aboutLegalText}>
          Tormenta20 e seus conteúdos são propriedade de seus respectivos titulares, incluindo a
          Jambô Editora. Este é um projeto acadêmico e fan-made, sem afiliação oficial. Os dados de
          referência foram compilados a partir dos materiais e das fontes de consulta utilizados no
          desenvolvimento do projeto.
        </Text>
        <View style={styles.aboutBackArea}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.aboutBackButton, pressed && styles.aboutBackButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Voltar para a tela anterior"
          >
            <Text style={styles.aboutBackButtonText}>Voltar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
