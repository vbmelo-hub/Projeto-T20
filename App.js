import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const heroImg = require('./assets/hero.png');

const storageKey = 'grimorio20_snack_state_v1';

const seedSpells = [
  {
    id: 'seta-infame',
    name: 'Seta Infame de Talude',
    type: 'Arcana',
    school: 'Evocacao',
    circle: '1o circulo',
    execution: 'Padrao',
    range: 'Medio',
    duration: 'Instantanea',
    source: 'Tormenta20',
    target: 'Uma criatura',
    resistance: 'Nenhuma',
    description: 'Dispara um projetil de energia contra uma criatura no alcance.',
    upgrades: ['+2 PM: aumenta o dano.', '+5 PM: muda o tipo de energia.'],
  },
  {
    id: 'curar-ferimentos',
    name: 'Curar Ferimentos',
    type: 'Divina',
    school: 'Evocacao',
    circle: '1o circulo',
    execution: 'Padrao',
    range: 'Toque',
    duration: 'Instantanea',
    source: 'Tormenta20',
    target: 'Uma criatura',
    resistance: 'Vontade reduz',
    description: 'Canaliza energia positiva para recuperar pontos de vida.',
    upgrades: ['+1 PM: aumenta a cura.', '+5 PM: remove uma condicao.'],
  },
  {
    id: 'armadura-arcana',
    name: 'Armadura Arcana',
    type: 'Arcana',
    school: 'Abjuracao',
    circle: '1o circulo',
    execution: 'Padrao',
    range: 'Pessoal',
    duration: 'Cena',
    source: 'Tormenta20',
    target: 'Voce',
    resistance: 'Nenhuma',
    description: 'Cria uma protecao magica que aumenta sua defesa.',
    upgrades: ['+2 PM: aumenta o bonus de Defesa.', '+5 PM: a duracao muda para dia.'],
  },
];

const emptyCharacter = { name: '', race: '', characterClass: '', photo: '' };
const emptySpell = {
  name: '',
  type: '',
  school: '',
  circle: '',
  execution: '',
  range: '',
  duration: '',
  source: '',
  target: '',
  resistance: '',
  description: '',
  upgrades: '',
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [spells, setSpells] = useState(seedSpells);
  const [characters, setCharacters] = useState([]);
  const [links, setLinks] = useState([]);
  const [query, setQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [characterForm, setCharacterForm] = useState(emptyCharacter);
  const [spellForm, setSpellForm] = useState(emptySpell);
  const [modal, setModal] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!raw) return;
        const data = JSON.parse(raw);
        setUsers(data.users ?? []);
        setUser(data.user ?? null);
        setSpells(data.spells?.length ? data.spells : seedSpells);
        setCharacters(data.characters ?? []);
        setLinks(data.links ?? []);
        setView(data.user ? 'home' : 'login');
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ users, user, spells, characters, links }),
    );
  }, [ready, users, user, spells, characters, links]);

  const visibleSpells = useMemo(() => {
    const text = query.trim().toLowerCase();
    return [...spells]
      .filter((spell) => {
        if (!text) return true;
        return [spell.name, spell.description, spell.type, spell.school, spell.source]
          .join(' ')
          .toLowerCase()
          .includes(text);
      })
      .sort((a, b) => {
        const result = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        return sortAsc ? result : -result;
      });
  }, [query, sortAsc, spells]);

  const userCharacters = useMemo(
    () => characters.filter((character) => character.userId === user?.id),
    [characters, user],
  );

  const activeCharacterSpells = useMemo(() => {
    if (!selectedCharacter) return [];
    return links
      .filter((link) => link.characterId === selectedCharacter.id)
      .map((link) => ({ ...spells.find((spell) => spell.id === link.spellId), prepared: link.prepared }))
      .filter((spell) => spell.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [links, selectedCharacter, spells]);

  function submitAuth() {
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const username = authForm.username.trim();

    if (!email || !password || (authMode === 'register' && !username)) {
      Alert.alert('Campos obrigatorios', 'Preencha email, senha e nome de usuario.');
      return;
    }

    if (authMode === 'register') {
      if (users.some((item) => item.email === email)) {
        Alert.alert('Email ja cadastrado', 'Use outro email ou faca login.');
        return;
      }
      const nextUser = { id: String(Date.now()), email, password, username };
      setUsers((current) => [...current, nextUser]);
      setUser(nextUser);
      setView('welcome');
      return;
    }

    const found = users.find((item) => item.email === email && item.password === password);
    if (!found) {
      Alert.alert('Login invalido', 'Email ou senha incorretos.');
      return;
    }
    setUser(found);
    setView('home');
  }

  function logout() {
    setUser(null);
    setSelectedCharacter(null);
    setSelectedSpell(null);
    setView('login');
  }

  function saveCharacter() {
    if (!characterForm.name.trim()) {
      Alert.alert('Nome obrigatorio', 'Informe o nome do personagem.');
      return;
    }
    const character = {
      ...characterForm,
      id: selectedCharacter?.id ?? String(Date.now()),
      userId: user.id,
      createdAt: selectedCharacter?.createdAt ?? new Date().toISOString(),
    };
    setCharacters((current) =>
      selectedCharacter
        ? current.map((item) => (item.id === selectedCharacter.id ? character : item))
        : [...current, character],
    );
    setSelectedCharacter(character);
    closeModal();
    setView('characters');
  }

  function deleteCharacter(character) {
    setCharacters((current) => current.filter((item) => item.id !== character.id));
    setLinks((current) => current.filter((item) => item.characterId !== character.id));
    if (selectedCharacter?.id === character.id) setSelectedCharacter(null);
  }

  function saveSpell() {
    if (!spellForm.name.trim()) {
      Alert.alert('Nome obrigatorio', 'Informe o nome da magia.');
      return;
    }
    const spell = {
      ...spellForm,
      id: selectedSpell?.id ?? String(Date.now()),
      upgrades: String(spellForm.upgrades)
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    setSpells((current) =>
      selectedSpell
        ? current.map((item) => (item.id === selectedSpell.id ? spell : item))
        : [...current, spell],
    );
    closeModal();
  }

  function linkSpellToCharacter(characterId, spellId) {
    if (links.some((link) => link.characterId === characterId && link.spellId === spellId)) {
      Alert.alert('Magia ja vinculada', 'Este personagem ja possui essa magia.');
      return;
    }
    setLinks((current) => [...current, { characterId, spellId, prepared: false }]);
    closeModal();
  }

  function togglePrepared(spellId) {
    setLinks((current) =>
      current.map((link) =>
        link.characterId === selectedCharacter.id && link.spellId === spellId
          ? { ...link, prepared: !link.prepared }
          : link,
      ),
    );
  }

  function removeSpellFromCharacter(spellId) {
    setLinks((current) =>
      current.filter((link) => !(link.characterId === selectedCharacter.id && link.spellId === spellId)),
    );
  }

  function openCharacterForm(character = null) {
    setSelectedCharacter(character);
    setCharacterForm(character ?? emptyCharacter);
    setModal('character');
  }

  function openSpellForm(spell = null) {
    setSelectedSpell(spell);
    setSpellForm(spell ? { ...spell, upgrades: spell.upgrades.join('\n') } : emptySpell);
    setModal('spell-form');
  }

  function closeModal() {
    setModal('');
    setSelectedSpell(null);
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.muted}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.app}>
        {user ? (
          <View style={styles.topBar}>
            <Pressable onPress={() => setView('home')} style={styles.brandButton}>
              <Text style={styles.brandMark}>G20</Text>
              <Text style={styles.brandText}>Grimorio 20</Text>
            </Pressable>
            <Pressable onPress={logout} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Sair</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content}>
          {!user ? renderAuth() : null}
          {user && view === 'welcome' ? renderWelcome() : null}
          {user && view === 'home' ? renderHome() : null}
          {user && view === 'characters' ? renderCharacters() : null}
          {user && view === 'character' ? renderCharacterDetails() : null}
          {user && view === 'about' ? renderAbout() : null}
        </ScrollView>

        {user ? (
          <View style={styles.bottomNav}>
            <Pressable onPress={() => setView('home')} style={styles.navButton}>
              <Text style={[styles.navText, view === 'home' && styles.navActive]}>Magias</Text>
            </Pressable>
            <Pressable onPress={() => openSpellForm()} style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
            <Pressable onPress={() => setView('characters')} style={styles.navButton}>
              <Text style={[styles.navText, view !== 'home' && styles.navActive]}>Personagens</Text>
            </Pressable>
          </View>
        ) : null}

        {renderModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderAuth() {
    return (
      <View style={styles.authCard}>
        <Image source={heroImg} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{authMode === 'login' ? 'Entrar' : 'Cadastro'}</Text>
        <Field label="Email" value={authForm.email} onChangeText={(email) => setAuthForm({ ...authForm, email })} />
        <Field
          label="Senha"
          value={authForm.password}
          secureTextEntry
          onChangeText={(password) => setAuthForm({ ...authForm, password })}
        />
        {authMode === 'register' ? (
          <Field
            label="Username"
            value={authForm.username}
            onChangeText={(username) => setAuthForm({ ...authForm, username })}
          />
        ) : null}
        <Pressable onPress={submitAuth} style={styles.primary}>
          <Text style={styles.primaryText}>{authMode === 'login' ? 'Entrar' : 'Cadastrar-se'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          style={styles.ghost}
        >
          <Text style={styles.ghostText}>{authMode === 'login' ? 'Criar conta' : 'Ja tenho conta'}</Text>
        </Pressable>
      </View>
    );
  }

  function renderWelcome() {
    return (
      <View style={styles.card}>
        <Image source={heroImg} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Ola, {user.username}</Text>
        <Text style={styles.bodyText}>
          Consulte magias, crie personagens e organize quais magias cada personagem conhece ou preparou.
        </Text>
        <Pressable onPress={() => setView('home')} style={styles.primary}>
          <Text style={styles.primaryText}>Abrir grimorio</Text>
        </Pressable>
        <Pressable onPress={() => setView('about')} style={styles.ghost}>
          <Text style={styles.ghostText}>Sobre o projeto</Text>
        </Pressable>
      </View>
    );
  }

  function renderHome() {
    return (
      <View>
        <SectionHeader title="Magias" detail={`${visibleSpells.length} magia(s) encontrada(s)`} />
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome, descricao ou fonte..."
            style={[styles.input, styles.searchInput]}
          />
          <Pressable onPress={() => setSortAsc(!sortAsc)} style={styles.sortButton}>
            <Text style={styles.sortText}>{sortAsc ? 'A-Z' : 'Z-A'}</Text>
          </Pressable>
        </View>
        {visibleSpells.map((spell) => (
          <SpellCard
            key={spell.id}
            spell={spell}
            primaryLabel="Vincular"
            onOpen={() => {
              setSelectedSpell(spell);
              setModal('spell');
            }}
            onPrimary={() => {
              setSelectedSpell(spell);
              setModal('picker');
            }}
          />
        ))}
      </View>
    );
  }

  function renderCharacters() {
    return (
      <View>
        <View style={styles.headerRow}>
          <SectionHeader title="Personagens" detail={`${userCharacters.length} personagem(s)`} />
          <Pressable onPress={() => openCharacterForm()} style={styles.squareButton}>
            <Text style={styles.squareButtonText}>+</Text>
          </Pressable>
        </View>
        {userCharacters.length ? null : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nenhum personagem criado</Text>
            <Text style={styles.bodyText}>Crie um personagem para vincular magias a ele.</Text>
          </View>
        )}
        {userCharacters.map((character) => {
          const spellCount = links.filter((link) => link.characterId === character.id).length;
          return (
            <Pressable
              key={character.id}
              onPress={() => {
                setSelectedCharacter(character);
                setView('character');
              }}
              style={styles.characterCard}
            >
              <Avatar character={character} />
              <View style={styles.characterBody}>
                <Text style={styles.cardTitle}>{character.name}</Text>
                <Text style={styles.bodyText}>{[character.race, character.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}</Text>
                <Text style={styles.bodyText}>{spellCount} magia(s)</Text>
              </View>
              <View style={styles.inlineActions}>
                <Pressable onPress={() => openCharacterForm(character)} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => deleteCharacter(character)} style={styles.danger}>
                  <Text style={styles.primaryText}>Excluir</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderCharacterDetails() {
    if (!selectedCharacter) return renderCharacters();
    return (
      <View>
        <View style={styles.cardCentered}>
          <Avatar character={selectedCharacter} large />
          <Text style={styles.title}>{selectedCharacter.name}</Text>
          <Text style={styles.bodyText}>{[selectedCharacter.race, selectedCharacter.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}</Text>
        </View>
        <Pressable onPress={() => setView('home')} style={styles.primary}>
          <Text style={styles.primaryText}>Aprender nova magia</Text>
        </Pressable>
        {activeCharacterSpells.length ? null : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lista de magias vazia</Text>
            <Text style={styles.bodyText}>Este personagem ainda nao possui magias vinculadas.</Text>
          </View>
        )}
        {activeCharacterSpells.map((spell) => (
          <SpellCard
            key={spell.id}
            spell={spell}
            primaryLabel={spell.prepared ? 'Despreparar' : 'Preparar'}
            secondaryLabel="Remover"
            onOpen={() => {
              setSelectedSpell(spell);
              setModal('spell');
            }}
            onPrimary={() => togglePrepared(spell.id)}
            onSecondary={() => removeSpellFromCharacter(spell.id)}
          />
        ))}
      </View>
    );
  }

  function renderAbout() {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Sobre o Grimorio 20</Text>
        <Text style={styles.bodyText}>
          Esta versao foi adaptada para Expo Snack. Os dados ficam salvos no armazenamento local do dispositivo ou do navegador.
        </Text>
        <Text style={styles.bodyText}>
          Esta e a versao completa para Expo Snack, sem servidor externo.
        </Text>
      </View>
    );
  }

  function renderModal() {
    return (
      <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalLayer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
            <ScrollView>
              {modal === 'spell' && selectedSpell ? renderSpellDetails() : null}
              {modal === 'picker' && selectedSpell ? renderPicker() : null}
              {modal === 'character' ? renderCharacterForm() : null}
              {modal === 'spell-form' ? renderSpellForm() : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  function renderSpellDetails() {
    return (
      <View>
        <ModalHeader title={selectedSpell.name} />
        <Text style={styles.subtitle}>{[selectedSpell.type, selectedSpell.school, selectedSpell.circle].filter(Boolean).join(' - ')}</Text>
        <Text style={styles.bodyText}>Execucao: {selectedSpell.execution || 'Nao informado'}</Text>
        <Text style={styles.bodyText}>Alcance: {selectedSpell.range || 'Nao informado'}</Text>
        <Text style={styles.bodyText}>Duracao: {selectedSpell.duration || 'Nao informado'}</Text>
        <Text style={styles.bodyText}>Alvo/area: {selectedSpell.target || 'Nao informado'}</Text>
        <Text style={styles.bodyText}>Resistencia: {selectedSpell.resistance || 'Nao informado'}</Text>
        <Text style={styles.description}>{selectedSpell.description || 'Sem descricao.'}</Text>
        {(selectedSpell.upgrades ?? []).map((upgrade) => (
          <Text key={upgrade} style={styles.bodyText}>{upgrade}</Text>
        ))}
        <Text style={styles.bodyText}>Fonte: {selectedSpell.source || 'Nao informado'}</Text>
        <Pressable onPress={() => openSpellForm(selectedSpell)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Editar magia</Text>
        </Pressable>
      </View>
    );
  }

  function renderPicker() {
    const available = userCharacters.filter(
      (character) => !links.some((link) => link.characterId === character.id && link.spellId === selectedSpell.id),
    );
    return (
      <View>
        <ModalHeader title={available.length ? 'Selecione um personagem' : 'Nenhum personagem disponivel'} />
        {available.map((character) => (
          <Pressable
            key={character.id}
            onPress={() => linkSpellToCharacter(character.id, selectedSpell.id)}
            style={styles.pickerItem}
          >
            <Text style={styles.cardTitle}>{character.name}</Text>
            <Text style={styles.bodyText}>{character.characterClass || 'Sem classe'}</Text>
          </Pressable>
        ))}
        {available.length ? null : (
          <Pressable onPress={() => openCharacterForm()} style={styles.primary}>
            <Text style={styles.primaryText}>Criar personagem</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderCharacterForm() {
    return (
      <View>
        <ModalHeader title={selectedCharacter ? 'Editar personagem' : 'Criar personagem'} />
        <Field label="Nome" value={characterForm.name} onChangeText={(name) => setCharacterForm({ ...characterForm, name })} />
        <Field label="Raca" value={characterForm.race} onChangeText={(race) => setCharacterForm({ ...characterForm, race })} />
        <Field label="Classe" value={characterForm.characterClass} onChangeText={(characterClass) => setCharacterForm({ ...characterForm, characterClass })} />
        <Field label="Foto URL" value={characterForm.photo} onChangeText={(photo) => setCharacterForm({ ...characterForm, photo })} />
        <Pressable onPress={saveCharacter} style={styles.primary}>
          <Text style={styles.primaryText}>Salvar</Text>
        </Pressable>
      </View>
    );
  }

  function renderSpellForm() {
    return (
      <View>
        <ModalHeader title={selectedSpell ? 'Editar magia' : 'Cadastrar magia'} />
        {Object.keys(emptySpell).map((key) => (
          <Field
            key={key}
            label={spellLabel(key)}
            value={String(spellForm[key] ?? '')}
            multiline={key === 'description' || key === 'upgrades'}
            onChangeText={(value) => setSpellForm({ ...spellForm, [key]: value })}
          />
        ))}
        <Pressable onPress={saveSpell} style={styles.primary}>
          <Text style={styles.primaryText}>Salvar magia</Text>
        </Pressable>
      </View>
    );
  }

  function ModalHeader({ title }) {
    return (
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Pressable onPress={closeModal} style={styles.closeButton}>
          <Text style={styles.closeText}>x</Text>
        </Pressable>
      </View>
    );
  }
}

function Field({ label, value, onChangeText, secureTextEntry, multiline }) {
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

function SectionHeader({ title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </View>
  );
}

function SpellCard({ spell, onOpen, onPrimary, primaryLabel, onSecondary, secondaryLabel }) {
  return (
    <View style={styles.spellCard}>
      <Pressable onPress={onOpen}>
        <Text style={styles.cardTitle}>{spell.name}</Text>
        <View style={styles.tags}>
          {[spell.type, spell.school, spell.circle].filter(Boolean).map((tag) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>
        <Text style={styles.bodyText}>Execucao: {spell.execution || 'Nao informado'}; Alcance: {spell.range || 'Nao informado'}</Text>
        <Text style={styles.bodyText}>Fonte: {spell.source || 'Nao informado'}</Text>
        {spell.prepared ? <Text style={styles.prepared}>Preparada</Text> : null}
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={onOpen} style={styles.secondary}>
          <Text style={styles.secondaryText}>Detalhes</Text>
        </Pressable>
        <Pressable onPress={onPrimary} style={styles.primary}>
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>
        {onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.danger}>
            <Text style={styles.primaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Avatar({ character, large }) {
  if (character.photo) {
    return <Image source={{ uri: character.photo }} style={[styles.avatar, large && styles.avatarLarge]} />;
  }
  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      <Text style={styles.avatarText}>{initials(character.name)}</Text>
    </View>
  );
}

function initials(name) {
  return String(name)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function spellLabel(key) {
  const labels = {
    name: 'Nome',
    type: 'Tipo',
    school: 'Escola',
    circle: 'Circulo',
    execution: 'Execucao',
    range: 'Alcance',
    duration: 'Duracao',
    source: 'Livro/Fonte',
    target: 'Alvo, area ou efeito',
    resistance: 'Resistencia',
    description: 'Descricao',
    upgrades: 'Aprimoramentos (um por linha)',
  };
  return labels[key] ?? key;
}

const colors = {
  bg: '#f5f1eb',
  surface: '#ffffff',
  surfaceSoft: '#faf7f2',
  text: '#211d1d',
  muted: '#716967',
  line: '#e4ddd5',
  brand: '#b72b31',
  brandDark: '#811d23',
  danger: '#be2630',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  app: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  topBar: {
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.brand,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '900',
  },
  brandText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    paddingBottom: 92,
  },
  authCard: {
    marginTop: 28,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  card: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardCentered: {
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  logo: {
    width: 128,
    height: 128,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  modalTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.muted,
    fontWeight: '800',
    marginBottom: 12,
  },
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 12,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: '#4d4442',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
    color: colors.text,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  primary: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  secondary: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#f3eee8',
    marginTop: 8,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '900',
  },
  ghost: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5b8ba',
    marginTop: 10,
  },
  ghostText: {
    color: colors.brand,
    fontWeight: '900',
  },
  danger: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.danger,
    marginTop: 8,
  },
  smallButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: '900',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
  },
  sortButton: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  sortText: {
    color: colors.text,
    fontWeight: '900',
  },
  spellCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.brandDark,
    backgroundColor: '#f6e7e8',
    fontSize: 12,
    fontWeight: '800',
  },
  prepared: {
    color: colors.brand,
    fontWeight: '900',
    marginTop: 6,
  },
  actions: {
    marginTop: 10,
  },
  characterCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  characterBody: {
    flex: 1,
    minWidth: 180,
  },
  inlineActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  squareButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  squareButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  navButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: colors.muted,
    fontWeight: '900',
  },
  navActive: {
    color: colors.brand,
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    transform: [{ translateY: -12 }],
    borderWidth: 4,
    borderColor: '#fff',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
  },
  modalLayer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 14, 12, 0.46)',
  },
  modal: {
    maxHeight: '88%',
    padding: 18,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  closeText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '900',
  },
  pickerItem: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSoft,
  },
});
