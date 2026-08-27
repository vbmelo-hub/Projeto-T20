import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  EMPTY_AUTH_FORM,
  EMPTY_CHARACTER,
  EMPTY_SPELL,
} from '../constants/appConstants';
import { loadAppState, saveAppState } from '../services/storage';
import {
  buildFilterOptions,
  createEmptyFilters,
  filterAndSortSpells,
} from '../utils/filters';
import { catalogSpells, mergeCatalogWithSavedSpells } from '../utils/spells';

export default function useAppController() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [spells, setSpells] = useState(catalogSpells);
  const [characters, setCharacters] = useState([]);
  const [links, setLinks] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(createEmptyFilters);
  const [draftFilters, setDraftFilters] = useState(createEmptyFilters);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);
  const [characterForm, setCharacterForm] = useState(EMPTY_CHARACTER);
  const [spellForm, setSpellForm] = useState(EMPTY_SPELL);
  const [modal, setModal] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    loadAppState()
      .then((data) => {
        if (!data) return;
        setUsers(data.users ?? []);
        setUser(data.user ?? null);
        setSpells(mergeCatalogWithSavedSpells(data.spells));
        setCharacters(data.characters ?? []);
        setLinks(data.links ?? []);
        setView(data.user ? 'home' : 'login');
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAppState({ users, user, spells, characters, links });
  }, [ready, users, user, spells, characters, links]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const visibleSpells = useMemo(
    () => filterAndSortSpells(spells, query, filters, sortAsc),
    [filters, query, sortAsc, spells],
  );

  const filterOptions = useMemo(() => buildFilterOptions(spells), [spells]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  const userCharacters = useMemo(
    () => characters.filter((character) => character.userId === user?.id),
    [characters, user],
  );

  const activeCharacterSpells = useMemo(() => {
    if (!selectedCharacter) return [];
    return links
      .filter((link) => link.characterId === selectedCharacter.id)
      .map((link) => ({
        ...spells.find((spell) => spell.id === link.spellId),
        prepared: link.prepared,
      }))
      .filter((spell) => spell.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [links, selectedCharacter, spells]);

  const spellCounts = useMemo(
    () =>
      links.reduce(
        (counts, link) => ({
          ...counts,
          [link.characterId]: (counts[link.characterId] ?? 0) + 1,
        }),
        {},
      ),
    [links],
  );

  const selectedCharacterLink = useMemo(() => {
    if (!selectedCharacter || !selectedSpell) return null;
    return (
      links.find(
        (link) =>
          link.characterId === selectedCharacter.id && link.spellId === selectedSpell.id,
      ) ?? null
    );
  }, [links, selectedCharacter, selectedSpell]);

  const availableCharacters = useMemo(() => {
    if (!selectedSpell) return [];
    const linkedCharacterIds = new Set(
      links
        .filter((link) => link.spellId === selectedSpell.id)
        .map((link) => link.characterId),
    );
    return userCharacters.filter((character) => !linkedCharacterIds.has(character.id));
  }, [links, selectedSpell, userCharacters]);

  function applyFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function openFilters() {
    setDraftFilters(filters);
    setModal('filters');
  }

  function submitFilters() {
    setFilters(draftFilters);
    setModal('');
    setToast('Filtros aplicados.');
  }

  function clearFilters() {
    const emptyFilters = createEmptyFilters();
    setFilters(emptyFilters);
    setDraftFilters(emptyFilters);
    setModal('');
    setToast('Filtros limpos.');
  }

  function openPickerForSpell(spell) {
    setSelectedSpell(spell);
    setModal('picker');
  }

  function goTo(nextView) {
    setView(nextView);
    setDrawerOpen(false);
  }

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

  function logout() {
    setUser(null);
    setSelectedCharacter(null);
    setSelectedSpell(null);
    setDrawerOpen(false);
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
    setToast(selectedCharacter ? 'Personagem atualizado.' : 'Personagem criado.');
  }

  function deleteCharacter(character) {
    setCharacters((current) => current.filter((item) => item.id !== character.id));
    setLinks((current) => current.filter((item) => item.characterId !== character.id));
    if (selectedCharacter?.id === character.id) setSelectedCharacter(null);
    setToast('Personagem excluido.');
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
    setToast(selectedSpell ? 'Magia atualizada.' : 'Magia cadastrada.');
  }

  function linkSpellToCharacter(characterId, spellId) {
    if (links.some((link) => link.characterId === characterId && link.spellId === spellId)) {
      Alert.alert('Magia ja vinculada', 'Este personagem ja possui essa magia.');
      return;
    }
    setLinks((current) => [...current, { characterId, spellId, prepared: false }]);
    closeModal();
    setToast('Magia adicionada ao personagem.');
  }

  function togglePrepared(spellId) {
    const currentLink = links.find(
      (link) => link.characterId === selectedCharacter?.id && link.spellId === spellId,
    );
    setLinks((current) =>
      current.map((link) =>
        link.characterId === selectedCharacter.id && link.spellId === spellId
          ? { ...link, prepared: !link.prepared }
          : link,
      ),
    );
    setToast(currentLink?.prepared ? 'Magia despreparada.' : 'Magia preparada.');
  }

  function removeSpellFromCharacter(spellId) {
    setLinks((current) =>
      current.filter(
        (link) =>
          !(link.characterId === selectedCharacter.id && link.spellId === spellId),
      ),
    );
    setToast('Magia removida do personagem.');
  }

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

  function openCharacterForm(character = null) {
    setSelectedCharacter(character);
    setCharacterForm(character ?? EMPTY_CHARACTER);
    setModal('character');
  }

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

  function openSpellForm(spell = null) {
    setSelectedSpell(spell);
    setSpellForm(spell ? { ...spell, upgrades: spell.upgrades.join('\n') } : EMPTY_SPELL);
    setModal('spell-form');
  }

  function closeModal() {
    setModal('');
    setSelectedSpell(null);
  }

  function openSpellDetails(spell) {
    setSelectedSpell(spell);
    setModal('spell');
  }

  function updateAuthField(key, value) {
    setAuthForm((current) => ({ ...current, [key]: value }));
  }

  function updateCharacterField(key, value) {
    setCharacterForm((current) => ({ ...current, [key]: value }));
  }

  function updateSpellField(key, value) {
    setSpellForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAuthMode() {
    setAuthMode((current) => (current === 'login' ? 'register' : 'login'));
  }

  function openCharacter(character) {
    setSelectedCharacter(character);
    setView('character');
  }

  function addSpellForCharacter(character) {
    setSelectedCharacter(character);
    setView('home');
  }

  function requestDeleteCharacter(character) {
    openConfirmDialog({
      title: 'Excluir personagem',
      message: `Deseja excluir ${character.name}? Esta acao tambem remove as magias vinculadas.`,
      confirmLabel: 'Excluir',
      onConfirm: () => deleteCharacter(character),
    });
  }

  function requestRemoveSpell(spell) {
    openConfirmDialog({
      title: 'Remover magia',
      message: `Deseja remover ${spell.name} deste personagem?`,
      confirmLabel: 'Remover',
      onConfirm: () => removeSpellFromCharacter(spell.id),
    });
  }

  function requestRemoveCharacterPhoto() {
    openConfirmDialog({
      title: 'Remover foto',
      message: 'Deseja remover a foto selecionada deste personagem?',
      confirmLabel: 'Remover',
      onConfirm: () => setCharacterForm((current) => ({ ...current, photo: '' })),
    });
  }

  return {
    ready,
    view,
    user,
    query,
    sortAsc,
    visibleSpells,
    activeFilterCount,
    userCharacters,
    activeCharacterSpells,
    spellCounts,
    selectedSpell,
    selectedCharacter,
    selectedCharacterLink,
    authMode,
    authForm,
    characterForm,
    spellForm,
    modal,
    draftFilters,
    filterOptions,
    availableCharacters,
    drawerOpen,
    toast,
    confirmDialog,
    setQuery,
    setSortAsc,
    setView,
    setDrawerOpen,
    setToast,
    applyFilter,
    openFilters,
    submitFilters,
    clearFilters,
    openPickerForSpell,
    goTo,
    submitAuth,
    logout,
    saveCharacter,
    saveSpell,
    linkSpellToCharacter,
    togglePrepared,
    openConfirmDialog,
    closeConfirmDialog,
    confirmDialogAction,
    openCharacterForm,
    pickCharacterPhoto,
    openSpellForm,
    closeModal,
    openSpellDetails,
    updateAuthField,
    updateCharacterField,
    updateSpellField,
    toggleAuthMode,
    openCharacter,
    addSpellForCharacter,
    requestDeleteCharacter,
    requestRemoveSpell,
    requestRemoveCharacterPhoto,
  };
}
