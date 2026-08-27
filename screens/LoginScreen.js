import { Pressable, Text } from 'react-native';

import { Logo } from '../components/Branding';
import Field from '../components/Field';
import Surface from '../components/Surface';
import styles from '../styles/commonStyles';

export default function LoginScreen({ authMode, form, onFieldChange, onSubmit, onToggleMode }) {
  return (
    <Surface style={styles.authCard}>
      <Logo />
      <Text style={styles.title}>{authMode === 'login' ? 'Entrar' : 'Cadastro'}</Text>
      <Field label="Email *" value={form.email} onChangeText={(value) => onFieldChange('email', value)} />
      <Field
        label="Senha *"
        value={form.password}
        secureTextEntry
        onChangeText={(value) => onFieldChange('password', value)}
      />
      {authMode === 'register' ? (
        <Field
          label="Username"
          value={form.username}
          onChangeText={(value) => onFieldChange('username', value)}
        />
      ) : null}
      <Pressable onPress={onSubmit} style={styles.primary}>
        <Text style={styles.primaryText}>{authMode === 'login' ? 'Entrar' : 'Cadastrar-se'}</Text>
      </Pressable>
      <Pressable onPress={onToggleMode} style={styles.ghost}>
        <Text style={styles.ghostText}>{authMode === 'login' ? 'Criar conta' : 'Ja tenho conta'}</Text>
      </Pressable>
    </Surface>
  );
}
