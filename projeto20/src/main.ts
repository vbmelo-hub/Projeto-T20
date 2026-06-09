import './style.css'
import heroImg from './assets/hero.png'

type View = 'login' | 'register' | 'welcome' | 'about' | 'home' | 'characters' | 'character'
type SortDirection = 'asc' | 'desc'

type Modal =
  | ''
  | 'spell-details'
  | 'filters'
  | 'character-picker'
  | 'character-form'
  | 'spell-form'
  | 'delete-character'
  | 'remove-spell'
  | 'delete-spell'

type User = {
  id: string
  email: string
  username: string
  createdAt: string
}

type Spell = {
  id: string
  name: string
  type: string
  school: string
  circle: string
  execution: string
  range: string
  duration: string
  source: string
  target: string
  resistance: string
  description: string
  upgrades: string[]
  createdAt: string
  updatedAt: string
  canManage: boolean
  prepared?: boolean
  addedAt?: string
}

type Character = {
  id: string
  name: string
  race: string
  characterClass: string
  photo: string
  createdAt: string
  updatedAt: string
  spellCount: number
}

type Filters = {
  type: string
  school: string
  circle: string
  execution: string
  range: string
  duration: string
  source: string
  target: string
  resistance: string
}

type Options = Record<keyof Filters, string[]>

const emptyFilters: Filters = {
  type: '',
  school: '',
  circle: '',
  execution: '',
  range: '',
  duration: '',
  source: '',
  target: '',
  resistance: '',
}

const optionLabels: Record<keyof Filters, string> = {
  type: 'Tipo',
  school: 'Escola',
  circle: 'Circulo',
  execution: 'Execucao',
  range: 'Alcance',
  duration: 'Duracao',
  source: 'Livro/Fonte',
  target: 'Alvo, area ou efeito',
  resistance: 'Resistencia',
}

const emptyOptions: Options = {
  type: [],
  school: [],
  circle: [],
  execution: [],
  range: [],
  duration: [],
  source: [],
  target: [],
  resistance: [],
}

const app = document.querySelector<HTMLDivElement>('#app')!
const tokenKey = 'grimorio20_token'

const state = {
  view: 'login' as View,
  modal: '' as Modal,
  user: null as User | null,
  token: localStorage.getItem(tokenKey) ?? '',
  drawerOpen: false,
  loading: false,
  message: '',
  error: '',
  query: '',
  spellSort: 'asc' as SortDirection,
  characterSort: 'asc' as SortDirection,
  characterSpellSort: 'asc' as SortDirection,
  filters: { ...emptyFilters },
  options: { ...emptyOptions },
  spells: [] as Spell[],
  characters: [] as Character[],
  activeCharacter: null as Character | null,
  activeCharacterSpells: [] as Spell[],
  availableCharacters: [] as Character[],
  selectedSpell: null as Spell | null,
  selectedCharacter: null as Character | null,
  editingSpell: null as Spell | null,
  editingCharacter: null as Character | null,
}

let searchTimer = 0
let toastTimer = 0

function setMessage(message: string) {
  state.message = message
  state.error = ''
  scheduleToastClear()
}

function setError(error: string) {
  state.error = error
  state.message = ''
  scheduleToastClear()
}

function clearFeedback() {
  state.message = ''
  state.error = ''
  window.clearTimeout(toastTimer)
}

function scheduleToastClear() {
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    state.message = ''
    state.error = ''
    render()
  }, 3500)
}

function closeModal() {
  state.modal = ''
  state.selectedSpell = null
  state.selectedCharacter = null
  state.availableCharacters = []
  state.editingSpell = null
  state.editingCharacter = null
}

async function api<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`)

  const response = await fetch(`/api${path}`, { ...options, headers })
  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? 'Erro ao comunicar com a API.')
  return data as T
}

async function boot() {
  render()
  if (!state.token) return

  try {
    const data = await api<{ user: User }>('/auth/me')
    state.user = data.user
    state.view = 'home'
    render()
    await refreshCurrentView()
  } catch {
    state.token = ''
    localStorage.removeItem(tokenKey)
    state.view = 'login'
  }
  render()
}

async function setView(view: View) {
  state.view = view
  state.drawerOpen = false
  closeModal()
  render()
  await refreshCurrentView()
}

async function refreshCurrentView() {
  if (!state.user) return
  if (state.view === 'home') {
    await Promise.all([loadSpells(), loadOptions(), loadCharacters()])
  }
  if (state.view === 'characters') await loadCharacters()
  if (state.view === 'character' && state.activeCharacter) {
    await loadCharacterDetails(state.activeCharacter.id)
  }
}

async function loadSpells() {
  state.loading = true
  render()
  try {
    const params = new URLSearchParams()
    if (state.query.trim()) params.set('query', state.query.trim())
    for (const [key, value] of Object.entries(state.filters)) {
      if (value) params.set(key, value)
    }
    const suffix = params.toString() ? `?${params}` : ''
    const data = await api<{ spells: Spell[] }>(`/spells${suffix}`)
    state.spells = data.spells
  } catch (error) {
    setError(errorMessage(error))
  } finally {
    state.loading = false
    render()
  }
}

async function loadOptions() {
  try {
    const data = await api<Options>('/spells/options')
    state.options = data
  } catch (error) {
    setError(errorMessage(error))
  }
}

async function loadCharacters() {
  state.loading = true
  render()
  try {
    const data = await api<{ characters: Character[] }>('/characters')
    state.characters = data.characters
  } catch (error) {
    setError(errorMessage(error))
  } finally {
    state.loading = false
    render()
  }
}

async function loadCharacterDetails(id: string) {
  state.loading = true
  render()
  try {
    const data = await api<{ character: Character; spells: Spell[] }>(`/characters/${id}`)
    state.activeCharacter = data.character
    state.activeCharacterSpells = data.spells
  } catch (error) {
    setError(errorMessage(error))
    state.view = 'characters'
  } finally {
    state.loading = false
    render()
  }
}

function render() {
  app.innerHTML = `
    <div class="app-shell ${state.drawerOpen ? 'drawer-is-open' : ''}">
      ${state.user ? renderTopBar() : ''}
      ${state.user ? renderDrawer() : ''}
      <main class="screen">${renderView()}</main>
      ${state.user && state.view !== 'welcome' ? renderBottomNav() : ''}
      ${renderFeedback()}
      ${renderModal()}
    </div>
  `
  bindEvents()
}

function renderTopBar() {
  return `
    <header class="top-bar">
      <button class="menu-button" data-action="toggle-drawer" aria-label="Abrir menu">Menu</button>
      <button class="brand" data-view="home">
        <span class="brand-mark">G20</span>
        <span>Grimorio 20</span>
      </button>
      <nav class="desktop-nav" aria-label="Navegacao principal">
        <button class="${state.view === 'home' ? 'active' : ''}" data-view="home">Magias</button>
        <button class="${state.view === 'characters' || state.view === 'character' ? 'active' : ''}" data-view="characters">Personagens</button>
        <button class="${state.view === 'about' ? 'active' : ''}" data-view="about">Sobre</button>
      </nav>
    </header>
  `
}

function renderDrawer() {
  return `
    <aside class="drawer" aria-label="Menu lateral">
      <button data-view="welcome">Boas-vindas</button>
      <button data-view="home">Grimorio</button>
      <button data-view="characters">Personagens</button>
      <button data-view="about">Sobre</button>
      <button data-action="logout">Sair</button>
    </aside>
  `
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav" aria-label="Navegacao principal">
      <button class="${state.view === 'home' ? 'active' : ''}" data-view="home">Grimorio</button>
      <button class="bottom-add" data-action="new-spell" aria-label="Cadastrar magia">+</button>
      <button class="${state.view === 'characters' || state.view === 'character' ? 'active' : ''}" data-view="characters">Personagens</button>
    </nav>
  `
}

function renderFeedback() {
  if (state.error) return `<div class="toast error">${escapeHtml(state.error)}</div>`
  if (state.message) return `<div class="toast">${escapeHtml(state.message)}</div>`
  return ''
}

function renderView() {
  if (!state.user && state.view !== 'register') return renderAuth('login')
  if (!state.user && state.view === 'register') return renderAuth('register')
  if (state.view === 'welcome') return renderWelcome()
  if (state.view === 'about') return renderAbout()
  if (state.view === 'characters') return renderCharacters()
  if (state.view === 'character') return renderCharacterDetails()
  return renderHome()
}

function renderAuth(mode: 'login' | 'register') {
  const isLogin = mode === 'login'
  return `
    <section class="auth-screen">
      <form class="auth-card parchment" data-form="${mode}">
        <img class="auth-logo" src="${heroImg}" alt="">
        <h1>${isLogin ? 'Entrar' : 'Cadastro'}</h1>
        <label>Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Senha<input name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="6" required></label>
        ${isLogin ? '' : '<label>Username<input name="username" autocomplete="name" required></label>'}
        <button class="primary full" type="submit">${isLogin ? 'Entrar' : 'Cadastrar-se'}</button>
        <button class="ghost full" type="button" data-view="${isLogin ? 'register' : 'login'}">${isLogin ? 'Criar conta' : 'Ja tenho conta'}</button>
      </form>
    </section>
  `
}

function renderWelcome() {
  return `
    <section class="welcome-screen parchment">
      <img class="welcome-logo" src="${heroImg}" alt="">
      <h1>Ola, ${escapeHtml(state.user?.username ?? 'aventureiro')}</h1>
      <p>Consulte magias, crie personagens e organize quais magias cada personagem conhece ou preparou.</p>
      <button class="primary" data-view="home">Abrir grimorio</button>
      <button class="ghost" data-view="about">Sobre o projeto</button>
    </section>
  `
}

function renderAbout() {
  return `
    <section class="content-page parchment">
      <h1>Sobre o Grimorio 20</h1>
      <p>O Grimorio 20 foi recriado fora do Adalo com separacao real entre usuarios, personagens, magias e vinculos entre personagens e magias.</p>
      <p>O preparo da magia fica no relacionamento personagem-magia. Assim, uma mesma magia pode estar preparada para um personagem e nao preparada para outro.</p>
      <p>Esta versao usa API Express e banco SQLite local em <code>data/grimorio20.sqlite</code>.</p>
    </section>
  `
}

function renderHome() {
  const spells = sortByName(state.spells, state.spellSort)

  return `
    <section class="list-page">
      <div class="section-heading">
        <div>
          <h1>Magias</h1>
          <p>${state.loading ? 'Carregando catalogo...' : `${state.spells.length} magia${state.spells.length === 1 ? '' : 's'} encontrada${state.spells.length === 1 ? '' : 's'}`}</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-row">
          <input id="search" value="${escapeAttr(state.query)}" placeholder="Buscar por nome, descricao ou aprimoramentos...">
          ${renderSortButton('spells', state.spellSort)}
          <button class="secondary filter-button" data-action="open-filters" aria-label="Abrir filtros" title="Filtros">
            <span class="filter-icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="cards">
        ${
          spells.length
            ? spells.map((spell) => renderSpellCard(spell, 'home')).join('')
            : renderEmpty('Nenhuma magia cadastrada', 'Cadastre magias reais no banco para comecar a consultar e vincular personagens.', 'new-spell', 'Cadastrar magia')
        }
      </div>
    </section>
  `
}

function renderSpellCard(spell: Spell, context: 'home' | 'character') {
  return `
    <article class="spell-card" data-spell="${escapeAttr(spell.id)}" data-context="${context}">
      <div class="spell-card-body">
        <div class="card-title">
          <h2>${escapeHtml(spell.name)}</h2>
          ${
            spell.prepared && context === 'character'
              ? `<button class="prepared-flag" data-action="toggle-prepared" data-spell-id="${escapeAttr(spell.id)}" title="Despreparar magia" aria-label="Despreparar magia"></button>`
              : ''
          }
        </div>
        <div class="spell-tags">
          ${[spell.type, spell.school, spell.circle]
            .filter(Boolean)
            .map((value) => `<span>${escapeHtml(value)}</span>`)
            .join('')}
        </div>
        <p><strong>Execucao:</strong> ${field(spell.execution)}; <strong>Alcance:</strong> ${field(spell.range)};</p>
        <p><strong>Fonte:</strong> ${field(spell.source)}</p>
      </div>
      <div class="card-actions">
        <button class="secondary" data-action="open-spell" data-spell-id="${escapeAttr(spell.id)}">Detalhes</button>
      ${
        context === 'home'
          ? `<button class="primary" data-action="pick-character" data-spell-id="${escapeAttr(spell.id)}">Vincular</button>`
          : `<button class="danger" data-action="ask-remove-spell" data-spell-id="${escapeAttr(spell.id)}">Remover</button>`
      }
      </div>
    </article>
  `
}

function renderSortButton(list: 'spells' | 'characters' | 'character-spells', direction: SortDirection) {
  return `
    <button class="sort-button" data-action="toggle-sort" data-sort-list="${list}" aria-label="Alternar ordenacao">
      ${direction === 'asc' ? 'A-Z' : 'Z-A'}
    </button>
  `
}

function renderCharacters() {
  const characters = sortByName(state.characters, state.characterSort)

  return `
    <section class="list-page">
      <div class="section-heading">
        <div>
          <h1>Personagens</h1>
          <p>${state.loading ? 'Carregando...' : `${state.characters.length} personagem${state.characters.length === 1 ? '' : 's'}`}</p>
        </div>
        <div class="section-actions">
          ${renderSortButton('characters', state.characterSort)}
          <button class="round-add" data-action="new-character" aria-label="Criar personagem">+</button>
        </div>
      </div>
      <div class="cards">
        ${
          characters.length
            ? characters.map(renderCharacterCard).join('')
            : renderEmpty('Nenhum personagem criado', 'Crie um personagem para vincular magias a ele.', 'new-character', 'Criar personagem')
        }
      </div>
    </section>
  `
}

function renderCharacterCard(character: Character) {
  return `
    <article class="character-card" data-character="${escapeAttr(character.id)}">
      <div class="avatar">${character.photo ? `<img src="${escapeAttr(character.photo)}" alt="">` : initials(character.name)}</div>
      <div>
        <h2>${escapeHtml(character.name)}</h2>
        <p>${field(character.race)} - ${field(character.characterClass)}</p>
        <p>Criado em: ${formatDate(character.createdAt)}</p>
        <p>${character.spellCount} magia${character.spellCount === 1 ? '' : 's'}</p>
      </div>
      <div class="inline-actions">
        <button class="primary" data-action="character-add-spells" data-character-id="${escapeAttr(character.id)}">Adicionar magias</button>
        <button data-action="edit-character" data-character-id="${escapeAttr(character.id)}">Editar</button>
        <button class="danger-text" data-action="ask-delete-character" data-character-id="${escapeAttr(character.id)}">Excluir</button>
      </div>
    </article>
  `
}

function renderCharacterDetails() {
  const character = state.activeCharacter
  const spells = sortByName(state.activeCharacterSpells, state.characterSpellSort)

  if (!character) {
    return renderEmpty('Personagem nao selecionado', 'Volte para a lista e selecione um personagem.', 'go-characters', 'Ver personagens')
  }

  return `
    <section class="list-page">
      <div class="character-hero parchment">
        <div class="avatar large">${character.photo ? `<img src="${escapeAttr(character.photo)}" alt="">` : initials(character.name)}</div>
        <h1>${escapeHtml(character.name)}</h1>
        <p>${field(character.race)} - ${field(character.characterClass)}</p>
      </div>
      <div class="character-spell-actions">
        ${renderSortButton('character-spells', state.characterSpellSort)}
        <button class="primary" data-action="character-add-spells" data-character-id="${escapeAttr(character.id)}">Aprender nova magia</button>
      </div>
      <div class="cards">
        ${
          spells.length
            ? spells.map((spell) => renderSpellCard(spell, 'character')).join('')
            : '<div class="empty parchment"><h2>Lista de magias vazia</h2><p>Este personagem ainda nao possui magias vinculadas.</p></div>'
        }
      </div>
    </section>
  `
}

function renderEmpty(title: string, text: string, action: string, label: string) {
  return `
    <div class="empty parchment">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      <button class="primary" data-action="${action}">${escapeHtml(label)}</button>
    </div>
  `
}

function renderModal() {
  if (!state.modal) return ''
  return `<div class="modal-layer">${renderModalContent()}</div>`
}

function renderModalContent() {
  if (state.modal === 'filters') return renderFiltersModal()
  if (state.modal === 'character-picker') return renderCharacterPicker()
  if (state.modal === 'character-form') return renderCharacterForm()
  if (state.modal === 'spell-form') return renderSpellForm()
  if (state.modal === 'delete-character') return renderConfirm('Excluir personagem', 'O personagem e seus vinculos com magias serao removidos.', 'delete-character', 'Excluir')
  if (state.modal === 'remove-spell') return renderConfirm('Remover magia', 'A magia sera removida apenas deste personagem.', 'remove-spell', 'Remover')
  if (state.modal === 'delete-spell') return renderConfirm('Excluir magia', 'A magia sera removida do banco geral e de todos os personagens.', 'delete-spell', 'Excluir')
  return renderSpellDetails()
}

function renderSpellDetails() {
  const spell = state.selectedSpell
  if (!spell) return ''
  const inCharacter = state.view === 'character' && state.activeCharacter
  const managementActions =
    inCharacter && spell.canManage
      ? `
        <div class="modal-management-actions">
          <button class="secondary full" data-action="edit-spell" data-spell-id="${escapeAttr(spell.id)}">Editar magia</button>
          <button class="danger full" data-action="ask-delete-spell" data-spell-id="${escapeAttr(spell.id)}">Excluir magia</button>
        </div>
      `
      : ''

  return `
    <article class="modal parchment">
      <button class="close" data-action="close-modal">x</button>
      <h1>${escapeHtml(spell.name)}</h1>
      <p class="subtitle">${spellLine([spell.type, spell.school, spell.circle])}</p>
      <dl>
        <dt>Execucao:</dt><dd>${field(spell.execution)}</dd>
        <dt>Alcance:</dt><dd>${field(spell.range)}</dd>
        <dt>Duracao:</dt><dd>${field(spell.duration)}</dd>
        <dt>Alvo/Area:</dt><dd>${field(spell.target)}</dd>
        <dt>Resistencia:</dt><dd>${field(spell.resistance)}</dd>
      </dl>
      <p>${field(spell.description)}</p>
      ${spell.upgrades.map((upgrade) => `<p>${escapeHtml(upgrade)}</p>`).join('')}
      <p><strong>Fonte:</strong> ${field(spell.source)}</p>
      <div class="spell-modal-footer">
        ${
          inCharacter
            ? `<button class="primary full" data-action="toggle-prepared" data-spell-id="${escapeAttr(spell.id)}">${spell.prepared ? 'Despreparar magia' : 'Preparar magia'}</button>`
            : `<button class="primary full" data-action="pick-character" data-spell-id="${escapeAttr(spell.id)}">Vincular a personagem</button>`
        }
        ${managementActions}
      </div>
    </article>
  `
}

function renderFiltersModal() {
  const keys = Object.keys(optionLabels) as Array<keyof Filters>
  return `
    <article class="modal parchment">
      <button class="close" data-action="close-modal">x</button>
      <h1>Filtros</h1>
      <form data-form="filters">
        <div class="filter-grid">
          ${keys
            .map((key) => {
              const options = state.options[key] ?? []
              return `
                <label>${optionLabels[key]}
                  <select name="${key}">
                    <option value="">Todos</option>
                    ${options
                      .map((value) => `<option value="${escapeAttr(value)}" ${state.filters[key] === value ? 'selected' : ''}>${escapeHtml(value)}</option>`)
                      .join('')}
                  </select>
                </label>
              `
            })
            .join('')}
        </div>
        <div class="modal-actions">
          <button class="secondary" type="button" data-action="clear-filters">Limpar</button>
          <button class="primary" type="submit">Aplicar</button>
        </div>
      </form>
    </article>
  `
}

function renderCharacterPicker() {
  const spell = state.selectedSpell
  return `
    <article class="modal parchment">
      <button class="close" data-action="close-modal">x</button>
      <h1>${state.availableCharacters.length ? 'Selecione um personagem' : 'Nenhum personagem disponivel'}</h1>
      <p>${spell ? `Magia: ${escapeHtml(spell.name)}` : ''}</p>
      <div class="picker-list">
        ${
          state.availableCharacters.length
            ? state.availableCharacters
                .map((character) => `<button data-action="link-spell" data-character-id="${escapeAttr(character.id)}">${escapeHtml(character.name)}<span>${field(character.characterClass)}</span></button>`)
                .join('')
            : '<button class="primary" data-action="new-character">Criar personagem</button>'
        }
      </div>
    </article>
  `
}

function renderCharacterForm() {
  const character = state.editingCharacter
  return `
    <article class="modal parchment">
      <button class="close" data-action="close-modal">x</button>
      <h1>${character ? 'Editar personagem' : 'Criar personagem'}</h1>
      <form data-form="character">
        <label>Nome<input name="name" value="${escapeAttr(character?.name ?? '')}" required></label>
        <label>Raca<input name="race" value="${escapeAttr(character?.race ?? '')}"></label>
        <label>Classe<input name="characterClass" value="${escapeAttr(character?.characterClass ?? '')}"></label>
        <label>Foto URL<input name="photo" value="${escapeAttr(character?.photo ?? '')}"></label>
        <button class="primary full" type="submit">${character ? 'Salvar' : 'Criar'}</button>
      </form>
    </article>
  `
}

function renderSpellForm() {
  const spell = state.editingSpell
  const value = (key: keyof Spell) => String(spell?.[key] ?? '')
  return `
    <article class="modal parchment">
      <button class="close" data-action="close-modal">x</button>
      <h1>${spell ? 'Editar magia' : 'Cadastrar magia'}</h1>
      <form data-form="spell">
        <label>Nome<input name="name" value="${escapeAttr(value('name'))}" required></label>
        <div class="two-columns">
          <label>Tipo<input name="type" value="${escapeAttr(value('type'))}"></label>
          <label>Escola<input name="school" value="${escapeAttr(value('school'))}"></label>
        </div>
        <div class="two-columns">
          <label>Circulo<input name="circle" value="${escapeAttr(value('circle'))}"></label>
          <label>Execucao<input name="execution" value="${escapeAttr(value('execution'))}"></label>
        </div>
        <div class="two-columns">
          <label>Alcance<input name="range" value="${escapeAttr(value('range'))}"></label>
          <label>Duracao<input name="duration" value="${escapeAttr(value('duration'))}"></label>
        </div>
        <label>Alvo, area ou efeito<input name="target" value="${escapeAttr(value('target'))}"></label>
        <label>Resistencia<input name="resistance" value="${escapeAttr(value('resistance'))}"></label>
        <label>Livro/Fonte<input name="source" value="${escapeAttr(value('source'))}"></label>
        <label>Descricao<textarea name="description" rows="5">${escapeHtml(value('description'))}</textarea></label>
        <label>Aprimoramentos<textarea name="upgrades" rows="4">${escapeHtml(spell?.upgrades.join('\n') ?? '')}</textarea></label>
        <button class="primary full" type="submit">${spell ? 'Salvar magia' : 'Cadastrar magia'}</button>
      </form>
    </article>
  `
}

function renderConfirm(title: string, text: string, action: string, label: string) {
  return `
    <article class="modal alert">
      <button class="close" data-action="close-modal">x</button>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <div class="modal-actions">
        <button class="secondary" data-action="close-modal">Cancelar</button>
        <button class="danger" data-action="${action}">${escapeHtml(label)}</button>
      </div>
    </article>
  `
}

function bindEvents() {
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((element) => {
    element.addEventListener('click', () => void setView(element.dataset.view as View))
  })

  document.querySelectorAll<HTMLElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      void handleAction(element)
    })
  })

  document.querySelectorAll<HTMLElement>('[data-spell]').forEach((element) => {
    element.addEventListener('click', () => {
      const spell = findSpellForContext(element.dataset.spell ?? '', element.dataset.context)
      if (!spell) return
      state.selectedSpell = spell
      state.modal = 'spell-details'
      render()
    })
  })

  document.querySelectorAll<HTMLElement>('[data-character]').forEach((element) => {
    element.addEventListener('click', () => {
      const character = state.characters.find((item) => item.id === element.dataset.character)
      if (!character) return
      state.activeCharacter = character
      void setView('character')
    })
  })

  document.querySelector<HTMLInputElement>('#search')?.addEventListener('input', (event) => {
    state.query = (event.target as HTMLInputElement).value
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => void loadSpells(), 300)
  })

  document.querySelectorAll<HTMLFormElement>('[data-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      void handleForm(form)
    })
  })
}

async function handleAction(element: HTMLElement) {
  const action = element.dataset.action ?? ''

  if (action === 'toggle-drawer') {
    state.drawerOpen = !state.drawerOpen
    if (state.drawerOpen) clearFeedback()
    render()
    return
  }

  if (action === 'logout') {
    state.user = null
    state.token = ''
    state.view = 'login'
    localStorage.removeItem(tokenKey)
    closeModal()
    render()
    return
  }

  if (action === 'close-modal') {
    clearFeedback()
    closeModal()
    render()
    return
  }

  if (action === 'open-filters') {
    await loadOptions()
    state.modal = 'filters'
    render()
    return
  }

  if (action === 'toggle-sort') {
    const list = element.dataset.sortList
    if (list === 'spells') state.spellSort = toggleSort(state.spellSort)
    if (list === 'characters') state.characterSort = toggleSort(state.characterSort)
    if (list === 'character-spells') state.characterSpellSort = toggleSort(state.characterSpellSort)
    render()
    return
  }

  if (action === 'open-spell') {
    const spell = findSpellForContext(
      element.dataset.spellId ?? '',
      element.closest<HTMLElement>('[data-context]')?.dataset.context,
    )
    if (!spell) return
    state.selectedSpell = spell
    state.modal = 'spell-details'
    render()
    return
  }

  if (action === 'clear-filters') {
    state.filters = { ...emptyFilters }
    closeModal()
    await loadSpells()
    return
  }

  if (action === 'new-character') {
    state.editingCharacter = null
    state.modal = 'character-form'
    render()
    return
  }

  if (action === 'edit-character') {
    state.editingCharacter = state.characters.find((item) => item.id === element.dataset.characterId) ?? null
    state.modal = 'character-form'
    render()
    return
  }

  if (action === 'ask-delete-character') {
    state.selectedCharacter = state.characters.find((item) => item.id === element.dataset.characterId) ?? null
    state.modal = 'delete-character'
    render()
    return
  }

  if (action === 'delete-character') {
    if (!state.selectedCharacter) return
    await api(`/characters/${state.selectedCharacter.id}`, { method: 'DELETE' })
    setMessage('Personagem excluido.')
    closeModal()
    await setView('characters')
    return
  }

  if (action === 'character-add-spells') {
    const characterId = element.dataset.characterId || state.activeCharacter?.id
    state.activeCharacter = state.characters.find((item) => item.id === characterId) ?? state.activeCharacter
    await setView('home')
    return
  }

  if (action === 'new-spell') {
    state.editingSpell = null
    state.modal = 'spell-form'
    render()
    return
  }

  if (action === 'edit-spell') {
    state.editingSpell = findSpell(element.dataset.spellId ?? '') ?? null
    state.modal = 'spell-form'
    render()
    return
  }

  if (action === 'ask-delete-spell') {
    state.selectedSpell = findSpell(element.dataset.spellId ?? '') ?? state.selectedSpell
    state.modal = 'delete-spell'
    render()
    return
  }

  if (action === 'delete-spell') {
    if (!state.selectedSpell) return
    await api(`/spells/${state.selectedSpell.id}`, { method: 'DELETE' })
    setMessage('Magia excluida.')
    closeModal()
    await refreshCurrentView()
    return
  }

  if (action === 'pick-character') {
    state.selectedSpell = findSpell(element.dataset.spellId ?? '') ?? state.selectedSpell
    if (!state.selectedSpell) return
    const data = await api<{ characters: Character[] }>(
      `/spells/${state.selectedSpell.id}/available-characters`,
    )
    state.availableCharacters = data.characters
    state.modal = 'character-picker'
    render()
    return
  }

  if (action === 'link-spell') {
    if (!state.selectedSpell) return
    const characterId = element.dataset.characterId ?? ''
    await api(`/characters/${characterId}/spells`, {
      method: 'POST',
      body: JSON.stringify({ spellId: state.selectedSpell.id }),
    })
    setMessage('Magia vinculada ao personagem.')
    closeModal()
    await refreshCurrentView()
    return
  }

  if (action === 'ask-remove-spell') {
    state.selectedSpell = findSpell(element.dataset.spellId ?? '') ?? null
    state.modal = 'remove-spell'
    render()
    return
  }

  if (action === 'remove-spell') {
    if (!state.activeCharacter || !state.selectedSpell) return
    await api(`/characters/${state.activeCharacter.id}/spells/${state.selectedSpell.id}`, {
      method: 'DELETE',
    })
    setMessage('Magia removida do personagem.')
    closeModal()
    await loadCharacterDetails(state.activeCharacter.id)
    return
  }

  if (action === 'toggle-prepared') {
    const spell = findCharacterSpell(element.dataset.spellId ?? '') ?? state.selectedSpell
    if (!state.activeCharacter || !spell) return
    await api(`/characters/${state.activeCharacter.id}/spells/${spell.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ prepared: !spell.prepared }),
    })
    setMessage(spell.prepared ? 'Magia despreparada.' : 'Magia preparada.')
    closeModal()
    await loadCharacterDetails(state.activeCharacter.id)
    return
  }

  if (action === 'go-characters') {
    await setView('characters')
  }
}

async function handleForm(form: HTMLFormElement) {
  const formType = form.dataset.form ?? ''

  try {
    if (formType === 'login' || formType === 'register') {
      await submitAuth(form, formType)
      return
    }
    if (formType === 'filters') {
      submitFilters(form)
      closeModal()
      await loadSpells()
      return
    }
    if (formType === 'character') {
      await submitCharacter(form)
      return
    }
    if (formType === 'spell') {
      await submitSpell(form)
    }
  } catch (error) {
    setError(errorMessage(error))
    render()
  }
}

async function submitAuth(form: HTMLFormElement, mode: string) {
  const payload = {
    email: formValue(form, 'email'),
    password: formValue(form, 'password'),
    username: formValue(form, 'username'),
  }
  const data = await api<{ user: User; token: string }>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  state.user = data.user
  state.token = data.token
  localStorage.setItem(tokenKey, data.token)
  state.view = mode === 'register' ? 'welcome' : 'home'
  setMessage(mode === 'register' ? 'Conta criada com sucesso.' : 'Login realizado.')
  render()
  await refreshCurrentView()
}

function submitFilters(form: HTMLFormElement) {
  const next = { ...emptyFilters }
  for (const key of Object.keys(emptyFilters) as Array<keyof Filters>) {
    next[key] = formValue(form, key)
  }
  state.filters = next
}

async function submitCharacter(form: HTMLFormElement) {
  const payload = {
    name: formValue(form, 'name'),
    race: formValue(form, 'race'),
    characterClass: formValue(form, 'characterClass'),
    photo: formValue(form, 'photo'),
  }
  const editing = state.editingCharacter
  await api(editing ? `/characters/${editing.id}` : '/characters', {
    method: editing ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  })
  setMessage(editing ? 'Personagem atualizado.' : 'Personagem criado.')
  closeModal()
  await setView('characters')
}

async function submitSpell(form: HTMLFormElement) {
  const payload = {
    name: formValue(form, 'name'),
    type: formValue(form, 'type'),
    school: formValue(form, 'school'),
    circle: formValue(form, 'circle'),
    execution: formValue(form, 'execution'),
    range: formValue(form, 'range'),
    duration: formValue(form, 'duration'),
    target: formValue(form, 'target'),
    resistance: formValue(form, 'resistance'),
    source: formValue(form, 'source'),
    description: formValue(form, 'description'),
    upgrades: formValue(form, 'upgrades'),
  }
  const editing = state.editingSpell
  await api(editing ? `/spells/${editing.id}` : '/spells', {
    method: editing ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  })
  setMessage(editing ? 'Magia atualizada.' : 'Magia cadastrada.')
  closeModal()
  await refreshCurrentView()
}

function findSpell(id: string) {
  return [...state.spells, ...state.activeCharacterSpells].find((spell) => spell.id === id)
}

function findCharacterSpell(id: string) {
  return state.activeCharacterSpells.find((spell) => spell.id === id)
}

function findSpellForContext(id: string, context: string | undefined) {
  if (context === 'character') return findCharacterSpell(id) ?? findSpell(id)
  return state.spells.find((spell) => spell.id === id) ?? findSpell(id)
}

function sortByName<T extends { name: string }>(items: T[], direction: SortDirection) {
  return [...items].sort((a, b) => {
    const result = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base', numeric: true })
    return direction === 'asc' ? result : -result
  })
}

function toggleSort(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc'
}

function formValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function spellLine(values: string[]) {
  const clean = values.filter(Boolean).map(escapeHtml)
  return clean.length ? clean.join(' - ') : 'Sem classificacao'
}

function field(value: string | undefined) {
  return value ? escapeHtml(value) : 'Nao informado'
}

function initials(name: string) {
  return escapeHtml(
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttr(value: string) {
  return escapeHtml(value)
}

void boot()
