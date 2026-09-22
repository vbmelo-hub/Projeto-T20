import { Image, Text, View } from 'react-native';

import imagemMago from '../data/imagem-mago';
import styles from '../styles/commonStyles';

export default function WelcomeScreen() {
  return (
    <View style={styles.welcomePaper}>
      <View style={styles.welcomeTint} />
      <View style={styles.welcomeMessage}>
        <Text style={styles.welcomeTitle}>Bem-vindo ao Grimório 20!</Text>
        <Text style={styles.welcomeQuote}>
          "Seu grimório digital para consultar, organizar e explorar magias com mais facilidade."
        </Text>
        <Text style={styles.welcomeMessageText}>
          O Grimório 20 nasceu com a proposta de tornar a consulta de magias mais simples e agradável, ajudando jogadores a encontrarem com mais rapidez aquilo que precisam durante suas aventuras. Mais do que um catálogo, este projeto busca oferecer uma experiência útil, acessível e organizada para quem deseja explorar melhor seu grimório.
        </Text>
      </View>
      <Image source={{ uri: imagemMago }} style={styles.magoBoasVindas} resizeMode="contain" />
    </View>
  );
}
