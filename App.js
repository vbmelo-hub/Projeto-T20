// =========================
// Imports
// =========================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
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

import catalogRaw from './data/magias-tormenta20-catalogo-inicial.json';
import imagemLogo from './data/imagem-logo';
import imagemMago from './data/imagem-mago';

// =========================
// Configuracao e dados base
// =========================

// Chave unica para persistir o estado inteiro do app no AsyncStorage.
const storageKey = 'grimorio20_snack_state_v2';

// Campos de filtro usados na tela de lista de magias.
const filterKeys = ['type', 'school', 'circle', 'execution', 'range', 'duration', 'source', 'target', 'resistance'];

const filterLabels = {
  type: 'Tipo',
  school: 'Escola',
  circle: 'Circulo',
  execution: 'Execucao',
  range: 'Alcance',
  duration: 'Duracao',
  source: 'Livro/Fonte',
  target: 'Alvo, area ou efeito',
  resistance: 'Resistencia',
};

// Estruturas padrao usadas para limpar ou inicializar formularios.
const emptyFilters = filterKeys.reduce((values, key) => ({ ...values, [key]: '' }), {});

// Catalogo base importado do arquivo local e adaptado ao formato consumido pelo app.
const catalogSpells = catalogRaw.map((item) => ({
  id: `catalog-${item.id}`,
  name: item.nome,
  type: item.tipo,
  school: item.escola,
  circle: `${item.circulo}o circulo`,
  execution: item.execucao,
  range: item.alcance,
  duration: item.duracao,
  source: item.fonte,
  target: item.alvo_area_efeito,
  resistance: item.resistencia,
  description: item.descricao,
  upgrades: splitLines(item.aprimoramentos),
  tags: item.tags_busca,
  page: item.pagina,
  review: item.revisar_no_material_oficial,
  catalog: true,
}));

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

// =========================
// Componente principal
// =========================

export default function App() {
  // Estado global de navegacao, autenticacao, dados, formularios e modais.
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [spells, setSpells] = useState(catalogSpells);
  const [characters, setCharacters] = useState([]);
  const [links, setLinks] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [characterForm, setCharacterForm] = useState(emptyCharacter);
  const [spellForm, setSpellForm] = useState(emptySpell);
  const [modal, setModal] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Carrega o estado salvo ao abrir o app.
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!raw) return;
        const data = JSON.parse(raw);
        setUsers(data.users ?? []);
        setUser(data.user ?? null);
        setSpells(mergeCatalogWithSavedSpells(data.spells));
        setCharacters(data.characters ?? []);
        setLinks(data.links ?? []);
        setView(data.user ? 'home' : 'login');
      })
      .finally(() => setReady(true));
  }, []);

  // Salva automaticamente os dados principais sempre que algo relevante muda.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ users, user, spells, characters, links }),
    );
  }, [ready, users, user, spells, characters, links]);

  // Fecha a notificacao temporaria depois de alguns segundos.
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  // Lista final de magias mostradas na tela Home, ja com busca, filtros e ordenacao.
  const visibleSpells = useMemo(() => {
    const text = query.trim().toLowerCase();
    return [...spells]
      .filter((spell) => {
        const matchesText =
          !text ||
          [spell.name, spell.description, spell.type, spell.school, spell.source, spell.target, spell.resistance, spell.tags, ...(spell.upgrades ?? [])]
            .join(' ')
            .toLowerCase()
            .includes(text);
        if (!matchesText) return false;
        return filterKeys.every((key) => !filters[key] || spell[key] === filters[key]);
      })
      .sort((a, b) => {
        const result = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        return sortAsc ? result : -result;
      });
  }, [query, sortAsc, spells, filters]);

  // Opcoes disponiveis em cada select do modal de filtros.
  const filterOptions = useMemo(() => {
    return filterKeys.reduce((options, key) => {
      const values = [...new Set(spells.map((spell) => spell[key]).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true }),
      );
      return { ...options, [key]: values };
    }, {});
  }, [spells]);

  // Contador exibido no botao de filtros da tela Home.
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  // Lista apenas os personagens do usuario logado.
  const userCharacters = useMemo(
    () => characters.filter((character) => character.userId === user?.id),
    [characters, user],
  );

  // Lista as magias vinculadas ao personagem aberto na tela de detalhes.
  const activeCharacterSpells = useMemo(() => {
    if (!selectedCharacter) return [];
    return links
      .filter((link) => link.characterId === selectedCharacter.id)
      .map((link) => ({ ...spells.find((spell) => spell.id === link.spellId), prepared: link.prepared }))
      .filter((spell) => spell.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [links, selectedCharacter, spells]);

  // Garante que o catalogo local continue existindo mesmo quando ha dados salvos no dispositivo.
  function mergeCatalogWithSavedSpells(savedSpells) {
    if (!Array.isArray(savedSpells)) return catalogSpells;
    const savedById = new Map(savedSpells.map((spell) => [spell.id, spell]));
    const mergedCatalog = catalogSpells.map((spell) => ({ ...spell, ...(savedById.get(spell.id) ?? {}) }));
    const customSpells = savedSpells.filter((spell) => !String(spell.id).startsWith('catalog-'));
    return [...mergedCatalog, ...customSpells];
  }

  // Atualiza um filtro em rascunho dentro do modal da tela Home.
  function applyFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  // Abre o modal de filtros da tela de magias.
  function openFilters() {
    setDraftFilters(filters);
    setModal('filters');
  }

  // Confirma e aplica os filtros escolhidos na tela de magias.
  function submitFilters() {
    setFilters(draftFilters);
    setModal('');
    setToast('Filtros aplicados.');
  }

  // Limpa todos os filtros da tela de magias.
  function clearFilters() {
    setFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    setModal('');
    setToast('Filtros limpos.');
  }

  // Abre o modal que escolhe em qual personagem a magia sera adicionada.
  function openPickerForSpell(spell) {
    setSelectedSpell(spell);
    setModal('picker');
  }

  // Troca a tela atual e fecha o menu lateral, quando aberto.
  function goTo(nextView) {
    setView(nextView);
    setDrawerOpen(false);
  }

  // Tela de autenticacao: valida e autentica o usuario localmente.
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
      setToast('Conta criada.');
      return;
    }

    const found = users.find((item) => item.email === email && item.password === password);
    if (!found) {
      Alert.alert('Login invalido', 'Email ou senha incorretos.');
      return;
    }
    setUser(found);
    setView('home');
    setToast('Login realizado.');
  }

  // Encerra a sessao e volta para a tela de login.
  function logout() {
    setUser(null);
    setSelectedCharacter(null);
    setSelectedSpell(null);
    setDrawerOpen(false);
    setView('login');
  }

  // Modal de personagem: cria ou atualiza um personagem do usuario.
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
    setToast(selectedCharacter ? 'Personagem atualizado.' : 'Personagem criado.');
  }

  // Tela de personagens: remove um personagem e seus vinculos com magias.
  function deleteCharacter(character) {
    setCharacters((current) => current.filter((item) => item.id !== character.id));
    setLinks((current) => current.filter((item) => item.characterId !== character.id));
    if (selectedCharacter?.id === character.id) setSelectedCharacter(null);
    setToast('Personagem excluido.');
  }

  // Modal de magia: cria ou atualiza uma magia.
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
    setToast(selectedSpell ? 'Magia atualizada.' : 'Magia cadastrada.');
  }

  // Vincula uma magia escolhida a um personagem do usuario.
  function linkSpellToCharacter(characterId, spellId) {
    if (links.some((link) => link.characterId === characterId && link.spellId === spellId)) {
      Alert.alert('Magia ja vinculada', 'Este personagem ja possui essa magia.');
      return;
    }
    setLinks((current) => [...current, { characterId, spellId, prepared: false }]);
    closeModal();
    setToast('Magia adicionada ao personagem.');
  }

  // Tela de detalhe do personagem: alterna o estado de magia preparada.
  function togglePrepared(spellId) {
    const currentLink = links.find((link) => link.characterId === selectedCharacter?.id && link.spellId === spellId);
    setLinks((current) =>
      current.map((link) =>
        link.characterId === selectedCharacter.id && link.spellId === spellId
          ? { ...link, prepared: !link.prepared }
          : link,
      ),
    );
    setToast(currentLink?.prepared ? 'Magia despreparada.' : 'Magia preparada.');
  }

  // Tela de detalhe do personagem: remove uma magia da lista dele.
  function removeSpellFromCharacter(spellId) {
    setLinks((current) =>
      current.filter((link) => !(link.characterId === selectedCharacter.id && link.spellId === spellId)),
    );
    setToast('Magia removida do personagem.');
  }

  // Modal generico de confirmacao para exclusoes e remocoes.
  function openConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm }) {
    setConfirmDialog({ title, message, confirmLabel, onConfirm });
  }

  function closeConfirmDialog() {
    setConfirmDialog(null);
  }

  function confirmDialogAction() {
    if (!confirmDialog?.onConfirm) return;
    confirmDialog.onConfirm();
    setConfirmDialog(null);
  }

  // Abre o formulario da tela de personagens para criar ou editar.
  function openCharacterForm(character = null) {
    setSelectedCharacter(character);
    setCharacterForm(character ?? emptyCharacter);
    setModal('character');
  }

  // Seleciona uma imagem local para o avatar do personagem.
  async function pickCharacterPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const photo = asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setCharacterForm((current) => ({ ...current, photo }));
    } catch (error) {
      Alert.alert('Falha ao selecionar imagem', 'Nao foi possivel carregar a foto do personagem.');
    }
  }

  // Abre o formulario de cadastro/edicao de magia.
  function openSpellForm(spell = null) {
    setSelectedSpell(spell);
    setSpellForm(spell ? { ...spell, upgrades: spell.upgrades.join('\n') } : emptySpell);
    setModal('spell-form');
  }

  // Fecha o modal principal em uso.
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
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.app}>
        {/* Layout global: barra superior das telas internas, visivel apos login. */}
        {user ? (
          <View style={styles.topBar}>
            <Pressable onPress={() => setDrawerOpen(true)} style={styles.iconButton} accessibilityLabel="Abrir menu">
              <MenuGlyph />
            </Pressable>
            <Pressable onPress={() => goTo('home')} style={styles.brandButton}>
              <EyeMark compact />
            </Pressable>
            <Pressable onPress={() => goTo('about')} style={styles.iconButton} accessibilityLabel="Sobre o projeto">
              <Text style={styles.iconButtonText}>i</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.screenBackground}>
          {/* Roteador visual: escolhe qual tela principal aparece no centro do app. */}
          <ScrollView contentContainerStyle={user && view === 'welcome' ? styles.welcomeContent : styles.content}>
            {/* Tela Login/Cadastro: exibida antes de existir usuario autenticado. */}
            {!user ? renderAuth() : null}
            {/* Tela Boas-vindas: exibida apos cadastro e tambem pelo menu lateral. */}
            {user && view === 'welcome' ? renderWelcome() : null}
            {/* Tela Grimorio/Magias: lista, busca, filtros e cadastro de magias. */}
            {user && view === 'home' ? renderHome() : null}
            {/* Tela Personagens: lista os personagens criados pelo usuario. */}
            {user && view === 'characters' ? renderCharacters() : null}
            {/* Tela Detalhe do Personagem: mostra dados e magias vinculadas. */}
            {user && view === 'character' ? renderCharacterDetails() : null}
            {/* Tela Sobre: apresenta contexto academico e creditos do projeto. */}
            {user && view === 'about' ? renderAbout() : null}
          </ScrollView>
        </View>

        {/* Layout global: barra inferior de navegacao entre Grimorio e Personagens. */}
        {user ? (
          <View style={styles.bottomNav}>
            <Pressable onPress={() => setView('home')} style={styles.navButton}>
              <BookGlyph active={view === 'home'} />
              <Text style={[styles.navText, view === 'home' && styles.navActive]}>Grimorio</Text>
            </Pressable>
            {view === 'home' ? (
              <Pressable onPress={() => openSpellForm()} style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            ) : (
              <View style={styles.addButtonSpacer} />
            )}
            <Pressable onPress={() => setView('characters')} style={styles.navButton}>
              <SmallFolderGlyph active={view !== 'home'} />
              <Text style={[styles.navText, view !== 'home' && styles.navActive]}>Personagens</Text>
            </Pressable>
          </View>
        ) : null}

        {renderModal()}
        {renderConfirmDialog()}
        {renderDrawer()}
        {/* Feedback global: toast temporario para confirmar acoes do usuario. */}
        {toast ? (
          <Pressable onPress={() => setToast('')} style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // =========================
  // Telas e modais
  // =========================

  // Tela Login/Cadastro:
  // Renderiza o formulario de autenticacao local. Alterna entre entrar e criar conta,
  // sem depender de backend, usando os dados salvos no AsyncStorage.
  function renderAuth() {
    return (
      <Surface style={styles.authCard}>
        <Logo />
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
      </Surface>
    );
  }

  // Tela Boas-vindas:
  // Aparece logo apos o cadastro e tambem pode ser aberta pelo menu lateral.
  // Contem a mensagem de apresentacao do Grimorio 20 e a imagem embutida do mago.
  function renderWelcome() {  
    return (
      <View style={styles.welcomePaper}>
        <View style={styles.welcomeTint} />
        <Text style={styles.welcomeTitle}>Bem-vindo ao Grimório 20!</Text>
        <Text style={styles.welcomeQuote}>
          "Seu grimório digital para consultar, organizar e explorar magias com mais facilidade."
        </Text>
        <View style={styles.welcomeMessage}>
          <Text style={styles.welcomeMessageText}>
            O Grimório 20 nasceu com a proposta de tornar a consulta de magias mais simples e agradável, ajudando jogadores a encontrarem com mais rapidez aquilo que precisam durante suas aventuras. Mais do que um catálogo, este projeto busca oferecer uma experiência útil, acessível e organizada para quem deseja explorar melhor seu grimório.
          </Text>
        </View>
        <Image source={{ uri: imagemMago }} style={styles.magoBoasVindas} resizeMode="contain" />
      </View>
    );
  }

  // Tela Grimorio/Magias:
  // Tela principal apos login.
  // ordenacao e filtros, e abre os modais de detalhe, vinculo e cadastro.
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
          <Pressable onPress={openFilters} style={styles.filterButton} accessibilityLabel="Abrir filtros">
            <FilterGlyph />
            {activeFilterCount ? <Text style={styles.filterBadge}>{activeFilterCount}</Text> : null}
          </Pressable>
        </View>
        {visibleSpells.length ? null : (
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Nenhuma magia encontrada</Text>
            <Text style={styles.bodyText}>Ajuste a busca ou limpe os filtros para ver mais resultados.</Text>
          </Surface>
        )}
        {visibleSpells.map((spell) => (
          <SpellCard
            key={spell.id}
            spell={spell}
            primaryLabel="+"
            primaryA11y="Adicionar a personagem"
            onOpen={() => {
              setSelectedSpell(spell);
              setModal('spell');
            }}
            onPrimary={() => {
              openPickerForSpell(spell);
            }}
          />
        ))}
      </View>
    );
  }

  // Tela Personagens:
  // Lista todos os personagens do usuario autenticado. A partir daqui e possivel
  // abrir detalhes, editar, excluir ou iniciar o fluxo para adicionar magias.
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
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Nenhum personagem criado</Text>
            <Text style={styles.bodyText}>Crie um personagem para vincular magias a ele.</Text>
          </Surface>
        )}
        {userCharacters.map((character) => {
          const spellCount = links.filter((link) => link.characterId === character.id).length;
          return (
            <Surface
              key={character.id}
              style={styles.characterCard}
            >
              <Pressable
                onPress={() => {
                  setSelectedCharacter(character);
                  setView('character');
                }}
                style={styles.characterMain}
              >
                <Avatar character={character} />
                <View style={styles.characterBody}>
                  <Text style={styles.cardTitle}>{character.name}</Text>
                  <Text style={styles.bodyText}>{[character.race, character.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}</Text>
                  <Text style={styles.bodyText}>Criado em: {formatDate(character.createdAt)}</Text>
                  <Text style={styles.bodyText}>{spellCount} magia(s)</Text>
                </View>
              </Pressable>
              <View style={styles.inlineActions}>
                <Pressable
                  onPress={() => {
                    setSelectedCharacter(character);
                    setView('home');
                  }}
                  style={styles.characterAddAction}
                >
                  <AddMagicGlyph />
                  <Text style={styles.characterAddActionText}>ADD. MAGIA</Text>
                </Pressable>
                <Pressable onPress={() => openCharacterForm(character)} style={styles.characterIconAction}>
                  <EditGlyph />
                </Pressable>
                <Pressable
                  onPress={() =>
                    openConfirmDialog({
                      title: 'Excluir personagem',
                      message: `Deseja excluir ${character.name}? Esta acao tambem remove as magias vinculadas.`,
                      confirmLabel: 'Excluir',
                      onConfirm: () => deleteCharacter(character),
                    })
                  }
                  style={styles.characterIconAction}
                >
                  <DeleteGlyph />
                </Pressable>
              </View>
            </Surface>
          );
        })}
      </View>
    );
  }

  // Tela Detalhe do Personagem:
  // Mostra o personagem selecionado, suas informacoes principais e todas as
  // magias vinculadas a ele, incluindo acoes de preparar, despreparar e remover.
  function renderCharacterDetails() {
    if (!selectedCharacter) return renderCharacters();
    return (
      <View>
        <Surface style={styles.cardCentered} centered>
          <Avatar character={selectedCharacter} large />
          <Text style={styles.title}>{selectedCharacter.name}</Text>
          <Text style={styles.bodyText}>{[selectedCharacter.race, selectedCharacter.characterClass].filter(Boolean).join(' - ') || 'Sem detalhes'}</Text>
        </Surface>
        {activeCharacterSpells.length ? null : (
          <Surface style={styles.card}>
            <Text style={styles.cardTitle}>Lista de magias vazia</Text>
            <Text style={styles.bodyText}>Este personagem ainda nao possui magias vinculadas.</Text>
          </Surface>
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
            onSecondary={() =>
              openConfirmDialog({
                title: 'Remover magia',
                message: `Deseja remover ${spell.name} deste personagem?`,
                confirmLabel: 'Remover',
                onConfirm: () => removeSpellFromCharacter(spell.id),
              })
            }
          />
        ))}
        <Pressable onPress={() => setView('home')} style={styles.learnSpellButton}>
          <Text style={styles.primaryText}>Aprender nova magia</Text>
        </Pressable>
      </View>
    );
  }

  // Tela Sobre:
  // Tela institucional do app. Explica o contexto academico, o objetivo do
  // projeto e os creditos da disciplina/desenvolvimento.
  function renderAbout() {
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

  // Modal Principal:
  // Container compartilhado dos fluxos sobrepostos. O conteudo interno muda
  // conforme `modal`: detalhe de magia, seletor de personagem, filtros,
  // formulario de personagem ou formulario de magia.
  function renderModal() {
    return (
      <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalLayer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modal}>
            <View style={styles.modalBackground}>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {modal === 'spell' && selectedSpell ? renderSpellDetails() : null}
                {modal === 'picker' && selectedSpell ? renderPicker() : null}
                {modal === 'filters' ? renderFilters() : null}
                {modal === 'character' ? renderCharacterForm() : null}
                {modal === 'spell-form' ? renderSpellForm() : null}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  // Modal Confirmacao:
  // Dialogo pequeno usado antes de acoes destrutivas, como excluir personagem
  // ou remover magia vinculada.
  function renderConfirmDialog() {
    return (
      <Modal visible={Boolean(confirmDialog)} transparent animationType="fade" onRequestClose={closeConfirmDialog}>
        <View style={styles.modalLayer}>
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>{confirmDialog?.title || 'Confirmar exclusao'}</Text>
            <Text style={styles.bodyText}>{confirmDialog?.message || 'Tem certeza que deseja continuar?'}</Text>
            <View style={styles.modalActionRow}>
              <Pressable onPress={closeConfirmDialog} style={[styles.secondary, styles.modalActionButton]}>
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmDialogAction} style={[styles.danger, styles.modalActionButton]}>
                <Text style={styles.primaryText}>{confirmDialog?.confirmLabel || 'Excluir'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Menu Lateral:
  // Drawer de navegacao das telas internas: Boas-vindas, Magias,
  // Personagens, Sobre e acao de sair.
  function renderDrawer() {
    if (!drawerOpen) return null;
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <Pressable style={styles.drawerLayer} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Grimorio 20</Text>
            <Pressable onPress={() => goTo('welcome')} style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Boas-vindas</Text>
            </Pressable>
            <Pressable onPress={() => goTo('home')} style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Magias</Text>
            </Pressable>
            <Pressable onPress={() => goTo('characters')} style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Personagens</Text>
            </Pressable>
            <Pressable onPress={() => goTo('about')} style={styles.drawerItem}>
              <Text style={styles.drawerItemText}>Sobre</Text>
            </Pressable>
            <Pressable onPress={logout} style={styles.drawerDanger}>
              <Text style={styles.primaryText}>Sair</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Modal Detalhe da Magia:
  // Mostra os campos completos da magia selecionada e as acoes disponiveis
  // no contexto atual, como adicionar a personagem ou editar.
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
        {renderSpellDetailAction()}
        <Pressable onPress={() => openSpellForm(selectedSpell)} style={styles.secondary}>
          <Text style={styles.secondaryText}>Editar magia</Text>
        </Pressable>
      </View>
    );
  }

  // Acao principal do modal da magia: preparar ou vincular, dependendo da tela.
  // Acao do Modal Detalhe da Magia:
  // Define qual botao aparece no rodape do detalhe da magia, variando conforme
  // a tela de origem: adicionar a personagem, remover da ficha ou apenas fechar.
  function renderSpellDetailAction() {
    const isCharacterSpell =
      selectedCharacter && links.some((link) => link.characterId === selectedCharacter.id && link.spellId === selectedSpell.id);
    if (isCharacterSpell) {
      const link = links.find((item) => item.characterId === selectedCharacter.id && item.spellId === selectedSpell.id);
      return (
        <Pressable onPress={() => togglePrepared(selectedSpell.id)} style={styles.primary}>
          <Text style={styles.primaryText}>{link?.prepared ? 'Despreparar magia' : 'Preparar magia'}</Text>
        </Pressable>
      );
    }
    return (
      <Pressable onPress={() => openPickerForSpell(selectedSpell)} style={styles.primary}>
        <Text style={styles.primaryText}>Adicionar a personagem</Text>
      </Pressable>
    );
  }

  // Modal Adicionar Magia a Personagem:
  // Lista somente os personagens que ainda nao possuem a magia selecionada,
  // evitando vinculos duplicados.
  function renderPicker() {
    const linkedCharacterIds = new Set(
      links
        .filter((link) => link.spellId === selectedSpell.id)
        .map((link) => link.characterId),
    );
    const available = userCharacters.filter((character) => !linkedCharacterIds.has(character.id));
    const noCharacters = userCharacters.length === 0;
    const allCharactersAlreadyLinked = !noCharacters && available.length === 0;

    return (
      <View>
        <ModalHeader title={available.length ? 'Selecione um personagem' : noCharacters ? 'Lista de personagens vazia' : 'Nenhum personagem disponivel'} />
        {noCharacters ? (
          <Text style={styles.bodyText}>Crie um personagem antes de adicionar magias.</Text>
        ) : null}
        {allCharactersAlreadyLinked ? (
          <Text style={styles.bodyText}>Todos os seus personagens ja possuem esta magia.</Text>
        ) : null}
        {available.map((character) => (
          <View
            key={character.id}
            style={styles.pickerItem}
          >
            <Pressable onPress={() => linkSpellToCharacter(character.id, selectedSpell.id)}>
              <Text style={styles.cardTitle}>{character.name}</Text>
              <Text style={styles.bodyText}>{character.characterClass || 'Sem classe'}</Text>
            </Pressable>
          </View>
        ))}
        {noCharacters ? (
          <Pressable onPress={() => openCharacterForm()} style={styles.primary}>
            <Text style={styles.primaryText}>Criar personagem</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // Modal Filtros da Tela Grimorio/Magias:
  // Renderiza os campos de filtro usados pela lista principal de magias.
  function renderFilters() {
    return (
      <View>
        <ModalHeader title="Filtros" />
        {filterKeys.map((key) => (
          <View key={key} style={styles.filterGroup}>
                <Text style={styles.label}>{filterLabels[key]}</Text>
            <View style={styles.pickerFrame}>
              <Picker
                selectedValue={draftFilters[key]}
                onValueChange={(value) => applyFilter(key, value)}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="" />
                {(filterOptions[key] ?? []).map((value) => (
                  <Picker.Item key={value} label={value} value={value} />
                ))}
              </Picker>
            </View>
          </View>
        ))}
        <View style={styles.modalActionRow}>
          <Pressable onPress={clearFilters} style={[styles.secondary, styles.modalActionButton]}>
            <Text style={styles.secondaryText}>Limpar</Text>
          </Pressable>
          <Pressable onPress={submitFilters} style={[styles.primary, styles.modalActionButton]}>
            <Text style={styles.primaryText}>Filtrar itens</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Modal Criar/Editar Personagem:
  // Formulario usado tanto para cadastrar um novo personagem quanto para editar
  // nome, raca, classe e foto de um personagem existente.
  function renderCharacterForm() {
    return (
      <View>
        <ModalHeader title={selectedCharacter ? 'Editar personagem' : 'Criar personagem'} />
        <Field label="Nome" value={characterForm.name} onChangeText={(name) => setCharacterForm({ ...characterForm, name })} />
        <Field label="Raca" value={characterForm.race} onChangeText={(race) => setCharacterForm({ ...characterForm, race })} />
        <Field label="Classe" value={characterForm.characterClass} onChangeText={(characterClass) => setCharacterForm({ ...characterForm, characterClass })} />
        <View style={styles.field}>
          <Text style={styles.label}>Foto</Text>
          {characterForm.photo ? (
            <View style={styles.characterPhotoPreview}>
              <Image source={{ uri: characterForm.photo }} style={styles.characterPhotoPreviewImage} />
            </View>
          ) : (
            <Text style={styles.bodyText}>Nenhuma imagem selecionada.</Text>
          )}
          <View style={styles.modalActionRow}>
            <Pressable onPress={pickCharacterPhoto} style={[styles.secondary, styles.modalActionButton]}>
              <Text style={styles.secondaryText}>{characterForm.photo ? 'Trocar imagem' : 'Selecionar imagem'}</Text>
            </Pressable>
            {characterForm.photo ? (
              <Pressable
                onPress={() =>
                  openConfirmDialog({
                    title: 'Remover foto',
                    message: 'Deseja remover a foto selecionada deste personagem?',
                    confirmLabel: 'Remover',
                    onConfirm: () => setCharacterForm((current) => ({ ...current, photo: '' })),
                  })
                }
                style={[styles.ghost, styles.modalActionButton]}
              >
                <Text style={styles.ghostText}>Remover</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Pressable onPress={saveCharacter} style={styles.primary}>
          <Text style={styles.primaryText}>Salvar</Text>
        </Pressable>
      </View>
    );
  }

  // Modal Criar/Editar Magia:
  // Formulario administrativo do catalogo. Permite criar uma magia manualmente
  // ou editar os campos da magia selecionada.
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

  // Cabecalho padrao de todos os modais principais.
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

// =========================
// Componentes reutilizaveis
// =========================

// Campo de formulario reutilizado nos modais de login, personagem e magia.
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

// Cartao base com textura de fundo usado em varias telas e listas.
function Surface({ children, style, centered = false }) {
  return (
    <View style={[styles.surfaceBackground, centered && styles.surfaceCentered, style]}>
      <View style={styles.cardImageTint} />
      <View style={[styles.surfaceContent, centered && styles.surfaceCenteredContent]}>{children}</View>
    </View>
  );
}

// Logo completa usada na tela de autenticacao.
function Logo() {
  return (
    <View style={styles.logo}>
      <Image source={{ uri: imagemLogo }} style={styles.imagemLogo} resizeMode="contain" />
    </View>
  );
}

// Marca compacta exibida na barra superior.
function EyeMark({ compact = false }) {
  return (
    <View style={[styles.eyeImage, compact && styles.eyeImageCompact]}>
      <Image
        source={{ uri: imagemLogo }}
        style={[styles.eyeLogo, compact && styles.eyeLogoCompact]}
        resizeMode="contain"
      />
    </View>
  );
}

// Icone do menu lateral.
function MenuGlyph() {
  return (
    <View style={styles.menuGlyph}>
      <View style={styles.menuGlyphLine} />
      <View style={styles.menuGlyphLine} />
      <View style={styles.menuGlyphLine} />
    </View>
  );
}

// Icone do botao de filtros da tela Home.
function FilterGlyph() {
  return (
    <View style={styles.filterGlyph}>
      <View style={styles.filterGlyphTop} />
      <View style={styles.filterGlyphMiddle} />
      <View style={styles.filterGlyphBottom} />
    </View>
  );
}

// Icone de pasta usado no botao de adicionar magia aos cards de magia.
function FolderGlyph() {
  return (
    <View style={styles.folderGlyph}>
      <View style={styles.folderTab} />
      <View style={styles.folderBody}>
        <Text style={styles.folderPlus}>+</Text>
      </View>
    </View>
  );
}

// Icone do botao "ADD. MAGIA" na lista de personagens.
function AddMagicGlyph() {
  return (
    <View style={styles.addMagicGlyph}>
      <View style={styles.addMagicGlyphFrame}>
        <View style={styles.addMagicGlyphTop} />
        <View style={styles.addMagicGlyphPlusHorizontal} />
        <View style={styles.addMagicGlyphPlusVertical} />
      </View>
    </View>
  );
}

// Icone de editar personagem.
function EditGlyph() {
  return (
    <View style={styles.editGlyph}>
      <View style={styles.editGlyphBody} />
      <View style={styles.editGlyphTip} />
    </View>
  );
}

// Icone de excluir personagem.
function DeleteGlyph() {
  return (
    <View style={styles.deleteGlyph}>
      <View style={styles.deleteGlyphLid} />
      <View style={styles.deleteGlyphHandle} />
      <View style={styles.deleteGlyphBody}>
        <View style={styles.deleteGlyphCrossA} />
        <View style={styles.deleteGlyphCrossB} />
      </View>
    </View>
  );
}

// Icone de pasta da barra de navegacao inferior.
function SmallFolderGlyph({ active }) {
  return (
    <View style={[styles.smallFolderGlyph, active && styles.navGlyphActive]}>
      <View style={styles.smallFolderTab} />
      <View style={styles.smallFolderBody} />
    </View>
  );
}

// Icone de livro da barra de navegacao inferior.
function BookGlyph({ active }) {
  return (
    <View style={[styles.bookGlyph, active && styles.navGlyphActive]}>
      <View style={styles.bookPage} />
      <View style={styles.bookPage} />
    </View>
  );
}

// Titulo padrao de secao das telas principais.
function SectionHeader({ title, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDetail}>{detail}</Text>
    </View>
  );
}

// Card reutilizado para cada magia listada no app.
function SpellCard({ spell, onOpen, onPrimary, primaryLabel, primaryA11y, onSecondary, secondaryLabel }) {
  return (
    <Surface style={styles.spellCard}>
      <Pressable onPress={onOpen}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{spell.name}</Text>
          {spell.prepared ? <View style={styles.bookmark} /> : null}
        </View>
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
        <Pressable onPress={onPrimary} style={styles.primary} accessibilityLabel={primaryA11y}>
          {primaryA11y === 'Adicionar a personagem' ? <FolderGlyph /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
        </Pressable>
        {onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.danger}>
            <Text style={styles.primaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Surface>
  );
}

// Avatar do personagem: usa foto escolhida ou gera iniciais quando nao ha imagem.
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

// Gera iniciais para o avatar fallback.
function initials(name) {
  return String(name)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// Normaliza textos com quebra de linha em arrays de aprimoramentos.
function splitLines(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Formata data para exibir criacao do personagem em padrao brasileiro.
function formatDate(value) {
  if (!value) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// Traduz as chaves internas do formulario de magia para labels amigaveis.
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

// =========================
// Tema e estilos
// =========================

// Paleta centralizada do app.
const cores = {
  fundoApp: '#592222', // Fundo geral das telas Magias, Personagens e Detalhe do Personagem.
  superficieCartoesEModais: '#fff8ec', // Fundo dos cards, formularios, modais e toast.
  textoPrincipal: '#2f1b15', // Texto principal escuro.
  textoSecundario: '#765d50', // Texto auxiliar, detalhes e placeholders.
  linhaDivisoria: 'rgba(142, 83, 45, 0.24)', // Bordas suaves dos cards e campos.
  vermelhoPrincipalApp: '#a63f3f', // Top bar, drawer, botoes principais e icones de acao.
  vermelhoEscuroApp: '#7d2f32', // Estados destacados, sombras e botoes centrais/saida.
  vermelhoAcaoPerigosa: '#b74146', // Acoes destrutivas, como excluir.
  fundoContadorFiltros: '#8b5a1f', // Badge numerico do botao de filtros.
};

// Estilos compartilhados de todas as telas, modais e componentes.
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: cores.fundoApp,
  },
  app: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundoApp,
  },
  topBar: {
    height: 72,
    paddingHorizontal: 16,
    backgroundColor: cores.vermelhoPrincipalApp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: cores.vermelhoPrincipalApp,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '900',
  },
  brandText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 248, 236, 0.16)',
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  menuGlyph: {
    width: 18,
    gap: 4,
  },
  menuGlyphLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#fff8ec',
  },
  screenBackground: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: cores.fundoApp,
  },
  content: {
    padding: 16,
    paddingBottom: 92,
  },
  welcomeContent: {
    minHeight: '100%',
    paddingBottom: 92,
  },
  authCard: {
    marginTop: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 8,
  },
  card: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  cardCentered: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  surfaceBackground: {
    overflow: 'hidden',
    backgroundColor: cores.superficieCartoesEModais,
    borderRadius: 8,
  },
  cardImageTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(244, 216, 172, 0.28)',
  },
  surfaceContent: {
    padding: 18,
  },
  surfaceCentered: {
    alignItems: 'stretch',
  },
  surfaceCenteredContent: {
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    minHeight: 170,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagemLogo: {
    width: '100%',
    height: 150,
  },
  eyeImage: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeImageCompact: {
    width: 62,
    height: 54,
  },
  eyeLogo: {
    width: '100%',
    height: '100%',
  },
  eyeLogoCompact: {
    width: 62,
    height: 54,
  },
  title: {
    color: cores.textoPrincipal,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  sectionDetail: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalTitle: {
    flex: 1,
    color: cores.textoPrincipal,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  cardTitle: {
    flex: 1,
    color: '#1e0908',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bookmark: {
    width: 14,
    height: 20,
    backgroundColor: cores.vermelhoPrincipalApp,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  subtitle: {
    color: cores.vermelhoEscuroApp,
    fontWeight: '800',
    marginBottom: 12,
  },
  bodyText: {
    color: '#4a211b',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  welcomePaper: {
    minHeight: '100%',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  welcomeTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 248, 236, 0.72)',
  },
  welcomeTitle: {
    color: cores.vermelhoPrincipalApp,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  welcomeQuote: {
    maxWidth: 310,
    color: cores.textoSecundario,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  welcomeMessage: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#f3dfba',
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    marginBottom: 10,
  },
  welcomeMessageText: {
    color: cores.textoPrincipal,
    fontSize: 12,
    lineHeight: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  magoBoasVindas: {
    width: '112%',
    maxWidth: 430,
    height: 500,
    marginTop: 0,
  },
  aboutPaper: {
    minHeight: 760,
    marginTop: 18,
    marginBottom: 18,
    paddingHorizontal: 38,
    paddingVertical: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    backgroundColor: cores.superficieCartoesEModais,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  aboutTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(246, 228, 196, 0.42)',
  },
  aboutPanel: {
    minHeight: 632,
    paddingTop: 0,
    paddingHorizontal: 2,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 236, 0.44)',
  },
  aboutTitle: {
    width: '100%',
    color: cores.vermelhoPrincipalApp,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
  },
  aboutBody: {
    color: '#090505',
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 21,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 30,
  },
  aboutCredits: {
    width: '100%',
    marginTop: 2,
    marginBottom: 26,
  },
  aboutCreditText: {
    color: '#090505',
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    fontSize: 20,
    lineHeight: 22,
  },
  description: {
    color: cores.textoPrincipal,
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 12,
  },
  muted: {
    color: '#5f2c23',
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
    borderColor: 'rgba(127, 21, 24, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    color: cores.textoPrincipal,
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
    backgroundColor: cores.vermelhoPrincipalApp,
    marginTop: 8,
    shadowColor: cores.vermelhoEscuroApp,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  learnSpellButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: cores.vermelhoPrincipalApp,
    marginTop: 18,
    marginBottom: 16,
    shadowColor: cores.vermelhoEscuroApp,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
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
    borderColor: 'rgba(127, 21, 24, 0.18)',
    backgroundColor: 'rgba(255, 244, 225, 0.88)',
    marginTop: 8,
  },
  secondaryText: {
    color: cores.textoPrincipal,
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
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    marginTop: 10,
  },
  ghostText: {
    color: cores.vermelhoPrincipalApp,
    fontWeight: '900',
  },
  danger: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: cores.vermelhoAcaoPerigosa,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 2,
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
    flexWrap: 'wrap',
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
    borderColor: 'rgba(255, 198, 121, 0.64)',
    backgroundColor: 'rgba(255, 240, 211, 0.94)',
  },
  filterButton: {
    width: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 198, 121, 0.64)',
    backgroundColor: 'rgba(255, 240, 211, 0.94)',
    position: 'relative',
  },
  filterGlyph: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterGlyphTop: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: cores.vermelhoPrincipalApp,
  },
  filterGlyphMiddle: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: cores.vermelhoPrincipalApp,
  },
  filterGlyphBottom: {
    width: 7,
    height: 3,
    borderRadius: 2,
    backgroundColor: cores.vermelhoPrincipalApp,
  },
  filterBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    color: '#fff',
    backgroundColor: cores.fundoContadorFiltros,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 11,
    fontWeight: '900',
  },
  sortText: {
    color: cores.textoPrincipal,
    fontWeight: '900',
  },
  filterGroup: {
    marginBottom: 14,
  },
  pickerFrame: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
    backgroundColor: cores.superficieCartoesEModais,
    overflow: 'hidden',
  },
  picker: {
    minHeight: 44,
    color: cores.textoPrincipal,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalActionButton: {
    flex: 1,
  },
  spellCard: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
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
    color: '#fff5df',
    backgroundColor: cores.vermelhoEscuroApp,
    fontSize: 12,
    fontWeight: '800',
  },
  prepared: {
    color: cores.vermelhoEscuroApp,
    fontWeight: '900',
    marginTop: 6,
  },
  actions: {
    marginTop: 10,
  },
  folderGlyph: {
    width: 30,
    height: 22,
    justifyContent: 'flex-end',
  },
  folderTab: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 12,
    height: 7,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#fff',
  },
  folderBody: {
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  folderPlus: {
    color: cores.vermelhoPrincipalApp,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },
  characterCard: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
  },
  characterPhotoPreview: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(127, 21, 24, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  characterPhotoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  characterMain: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  characterBody: {
    flex: 1,
    minWidth: 180,
  },
  inlineActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  characterAddAction: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 34,
    minWidth: 150,
    maxWidth: 185,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2ca32f',
  },
  characterAddActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  characterIconAction: {
    width: 44,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  addMagicGlyph: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMagicGlyphFrame: {
    width: 18,
    height: 14,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
  },
  addMagicGlyphTop: {
    position: 'absolute',
    top: 0,
    left: 5,
    width: 14,
    height: 11,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  addMagicGlyphPlusHorizontal: {
    position: 'absolute',
    top: 4.5,
    left: 8,
    width: 8,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#2ca32f',
  },
  addMagicGlyphPlusVertical: {
    position: 'absolute',
    top: 2,
    left: 10.75,
    width: 2.5,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#2ca32f',
  },
  editGlyph: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  editGlyphBody: {
    width: 22,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#9c9c9c',
  },
  editGlyphTip: {
    position: 'absolute',
    right: -1,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#d2d2d2',
  },
  deleteGlyph: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteGlyphLid: {
    position: 'absolute',
    top: 4,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: cores.vermelhoPrincipalApp,
  },
  deleteGlyphHandle: {
    position: 'absolute',
    top: 1,
    width: 10,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: cores.vermelhoPrincipalApp,
  },
  deleteGlyphBody: {
    position: 'absolute',
    top: 7,
    width: 19,
    height: 17,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: cores.vermelhoPrincipalApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteGlyphCrossA: {
    position: 'absolute',
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  deleteGlyphCrossB: {
    position: 'absolute',
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '-45deg' }],
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.vermelhoPrincipalApp,
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
    backgroundColor: cores.vermelhoPrincipalApp,
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: cores.vermelhoPrincipalApp,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '900',
  },
  navActive: {
    color: '#fff',
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.vermelhoEscuroApp,
    transform: [{ translateY: -12 }],
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 6,
  },
  addButtonSpacer: {
    width: 58,
    height: 58,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
  },
  navGlyphActive: {
    opacity: 1,
  },
  smallFolderGlyph: {
    width: 22,
    height: 17,
    opacity: 0.78,
    marginBottom: 2,
  },
  smallFolderTab: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 9,
    height: 5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: '#fff',
  },
  smallFolderBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 13,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  bookGlyph: {
    width: 24,
    height: 18,
    flexDirection: 'row',
    gap: 2,
    opacity: 0.78,
    marginBottom: 2,
  },
  bookPage: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopWidth: 3,
  },
  modalLayer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 27, 21, 0.36)',
  },
  modal: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: cores.superficieCartoesEModais,
    borderWidth: 1,
    borderColor: cores.linhaDivisoria,
  },
  modalBackground: {
    maxHeight: '100%',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 18,
    paddingBottom: 26,
    backgroundColor: cores.superficieCartoesEModais,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  confirmDialog: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 198, 121, 0.42)',
    backgroundColor: 'rgba(255, 244, 225, 0.98)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmTitle: {
    color: cores.textoPrincipal,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(127, 21, 24, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
  },
  closeText: {
    color: cores.textoSecundario,
    fontSize: 18,
    fontWeight: '900',
  },
  pickerItem: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(127, 21, 24, 0.28)',
    backgroundColor: 'rgba(255, 248, 232, 0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  drawerLayer: {
    flex: 1,
    backgroundColor: 'rgba(47, 27, 21, 0.24)',
  },
  drawer: {
    width: 280,
    maxWidth: '82%',
    minHeight: '100%',
    padding: 18,
    paddingTop: 54,
    backgroundColor: cores.vermelhoPrincipalApp,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.18)',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 18,
  },
  drawerItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  drawerItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  drawerDanger: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 14,
    backgroundColor: cores.vermelhoEscuroApp,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 74,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 83, 45, 0.3)',
    backgroundColor: '#fff8ec',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: cores.textoPrincipal,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});
