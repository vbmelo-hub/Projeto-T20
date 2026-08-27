const puppeteer = require('puppeteer-core');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const appUrl = 'http://localhost:8089';
const storageKey = 'grimorio20_snack_state_v2';
let activeBrowser;

const removedNames = [
  'Detectar Magia',
  'Faíscas',
  'Seta Infalível',
  'Aterrorizar',
  'Barreira de Energia',
  'Cone de Frio',
  'Conhecimento Divino',
  'Convocar Relâmpagos',
  'Curar Ferimentos em Massa',
  'Domínio Animal',
  'Espada Justiceira',
  'Falar com Animais',
  'Forma Gasosa',
  'Lendas e Histórias',
  'Muralha de Pedra',
  'Porta Dimensional',
  'Restauração',
  'Ressurreição',
  'Telepatia',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function clickText(page, text, useLast = false) {
  const clicked = await page.evaluate(({ text, useLast }) => {
    const nodes = [...document.querySelectorAll('body *')].filter(
      (node) => node.children.length === 0 && node.textContent.trim() === text,
    );
    const target = useLast ? nodes.at(-1) : nodes[0];
    if (!target) return false;
    target.click();
    return true;
  }, { text, useLast });

  if (!clicked) throw new Error(`Texto não encontrado: ${text}`);
}

async function waitForText(page, text) {
  await page.waitForFunction(
    (expected) => document.body.innerText.includes(expected),
    { timeout: 15000 },
    text,
  );
}

async function hasExactLeaf(page, text) {
  return page.evaluate((expected) =>
    [...document.querySelectorAll('body *')].some(
      (node) => node.children.length === 0 && node.textContent.trim() === expected,
    ), text);
}

async function setSearch(page, value) {
  const selector = 'input[placeholder^="Buscar por nome"]';
  await page.waitForSelector(selector);
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (value) await page.type(selector, value);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function visibleSpellCount(page) {
  return page.evaluate(() => {
    const match = document.body.innerText.match(/(\d+) magia\(s\) encontrada\(s\)/);
    return match ? Number(match[1]) : null;
  });
}

async function dismissToast(page) {
  if (await hasExactLeaf(page, '×')) await clickText(page, '×', true);
}

async function clearFilters(page) {
  await page.click('[aria-label="Abrir filtros"]');
  await waitForText(page, 'Filtrar itens');
  await clickText(page, 'Limpar');
  await new Promise((resolve) => setTimeout(resolve, 120));
  await dismissToast(page);
}

async function applyFilter(page, index, value) {
  await page.click('[aria-label="Abrir filtros"]');
  await waitForText(page, 'Filtrar itens');
  const selects = await page.$$('select');
  assert(selects.length === 9, `Esperados 9 filtros, encontrados ${selects.length}.`);
  await selects[index].select(value);
  await clickText(page, 'Filtrar itens');
  await new Promise((resolve) => setTimeout(resolve, 150));
  const count = await visibleSpellCount(page);
  assert(count > 0 && count < 276, `Filtro ${value} retornou ${count}.`);
  await dismissToast(page);
  return count;
}

async function openAndCheckRange(page, spellName, expectedRange, expectedTarget) {
  await setSearch(page, spellName);
  assert(await hasExactLeaf(page, spellName), `${spellName} não apareceu na busca.`);
  await clickText(page, 'Detalhes');
  await waitForText(page, `Alcance: ${expectedRange}`);
  assert(await hasExactLeaf(page, `Alcance: ${expectedRange}`), `${spellName}: alcance incorreto.`);
  if (expectedTarget) {
    assert(await hasExactLeaf(page, `Alvo/area: ${expectedTarget}`), `${spellName}: alvo/área incorreto.`);
  }
  await clickText(page, 'x', true);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  activeBrowser = browser;
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
  });

  await page.goto(appUrl, { waitUntil: 'networkidle0' });
  const user = { id: 'migration-user', email: 'migracao@teste.local', password: 'senha123', username: 'Migração' };
  const character = {
    id: 'migration-character',
    userId: user.id,
    name: 'Personagem Migrado',
    race: 'Humano',
    characterClass: 'Arcanista',
    photo: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const customSpell = {
    id: 'custom-migration-test',
    name: 'Magia Personalizada Migrada',
    type: 'Personalizada',
    school: 'Teste',
    circle: '1o circulo',
    execution: 'padrão',
    range: 'curto',
    duration: 'cena',
    source: 'Criação do usuário',
    target: '1 criatura',
    resistance: 'nenhuma',
    description: 'Conteúdo personalizado preservado durante a migração.',
    upgrades: ['+1 PM:\nAprimoramento personalizado.'],
    tags: 'personalizada migração',
    page: '',
    review: false,
    catalog: false,
  };
  const staleCatalogSpell = {
    id: 'catalog-22',
    name: 'Detectar Magia',
    description: 'Registro legado removido.',
    upgrades: [],
    catalog: true,
  };
  const staleCanonicalData = {
    id: 'catalog-1',
    name: 'Nome canônico antigo incorreto',
    description: 'Descrição antiga incorreta.',
    upgrades: ['Aprimoramento antigo incorreto.'],
    catalog: true,
  };
  const initialState = {
    users: [user],
    user: null,
    spells: [staleCatalogSpell, staleCanonicalData, customSpell],
    characters: [character],
    links: [
      { characterId: character.id, spellId: 'catalog-22', prepared: false },
      { characterId: character.id, spellId: 'catalog-1', prepared: true },
      { characterId: character.id, spellId: customSpell.id, prepared: false },
    ],
  };

  await page.evaluate(({ storageKey, initialState }) => {
    localStorage.clear();
    localStorage.setItem(storageKey, JSON.stringify(initialState));
  }, { storageKey, initialState });
  await page.reload({ waitUntil: 'networkidle0' });
  await waitForText(page, 'Entrar');

  const loginInputs = await page.$$('input');
  await loginInputs[0].type(user.email);
  await loginInputs[1].type(user.password);
  await clickText(page, 'Entrar', true);
  await waitForText(page, '276 magia(s) encontrada(s)');
  await dismissToast(page);

  await new Promise((resolve) => setTimeout(resolve, 350));
  let persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  assert(!persisted.spells.some((spell) => spell.id === 'catalog-22'), 'Magia legada removida continuou no AsyncStorage.');
  assert(persisted.spells.some((spell) => spell.id === customSpell.id), 'Magia personalizada foi removida.');
  assert(!persisted.links.some((link) => link.spellId === 'catalog-22'), 'Vínculo órfão não foi removido.');
  assert(persisted.links.some((link) => link.spellId === 'catalog-1'), 'Vínculo canônico válido foi removido.');
  assert(persisted.links.some((link) => link.spellId === customSpell.id), 'Vínculo personalizado válido foi removido.');

  const removedSearchResults = {};
  for (const name of removedNames) {
    await setSearch(page, name);
    removedSearchResults[name] = await visibleSpellCount(page);
    assert(!await hasExactLeaf(page, name), `A magia removida ${name} ainda aparece como resultado exato.`);
  }

  await setSearch(page, '');
  const filterResults = {
    arcana: await applyFilter(page, 0, 'Arcana'),
  };
  await clearFilters(page);
  filterResults.deuses = await applyFilter(page, 6, 'Deuses de Arton');
  await clearFilters(page);

  await setSearch(page, 'Abençoar Alimentos');
  await clickText(page, 'Detalhes');
  await waitForText(page, 'Você purifica e abençoa uma porção de comida');
  const detailsText = await page.evaluate(() => document.body.innerText);
  assert(!detailsText.includes('Descrição antiga incorreta.'), 'Descrição persistida antiga venceu o catálogo.');
  assert(!detailsText.includes('function confirmDelete'), 'Artefato do scraper apareceu nos detalhes.');
  assert(detailsText.includes('Truque:'), 'Aprimoramentos não foram exibidos.');
  await clickText(page, 'x', true);

  await openAndCheckRange(page, 'Aliado Animal', 'curto', '1 animal prestativo');
  await openAndCheckRange(page, 'Área Escorregadia', 'curto', 'quadrado de 3m ou 1 objeto');
  await openAndCheckRange(page, 'Explosão Caleidoscópica', 'curto', 'esfera com 6m de raio');

  await setSearch(page, customSpell.name);
  await clickText(page, 'Detalhes');
  await waitForText(page, customSpell.description);
  await clickText(page, 'x', true);

  await clickText(page, 'Personagens', true);
  await waitForText(page, '2 magia(s)');
  await clickText(page, character.name);
  await waitForText(page, 'Abençoar Alimentos');
  await waitForText(page, customSpell.name);
  assert(!await hasExactLeaf(page, 'Detectar Magia'), 'Magia removida apareceu no personagem.');
  await clickText(page, 'Preparar');
  await waitForText(page, 'Magia preparada');
  await dismissToast(page);

  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.reload({ waitUntil: 'networkidle0' });
  await waitForText(page, 'Magias');
  await clickText(page, 'Personagens', true);
  await clickText(page, character.name);
  await waitForText(page, 'Preparada');

  await clickText(page, 'Aprender nova magia');
  await setSearch(page, 'Adaga Mental');
  await page.click('[aria-label="Adicionar a personagem"]');
  await waitForText(page, 'Selecione um personagem');
  await clickText(page, character.name);
  await waitForText(page, 'Magia adicionada');
  await dismissToast(page);

  await clickText(page, 'Personagens', true);
  await clickText(page, character.name);
  await waitForText(page, 'Adaga Mental');
  await clickText(page, 'Preparar');
  await waitForText(page, 'Magia preparada');
  await dismissToast(page);
  await clickText(page, 'Remover');
  await waitForText(page, 'Remover magia');
  await clickText(page, 'Remover', true);
  await waitForText(page, 'Magia removida');
  await dismissToast(page);

  await new Promise((resolve) => setTimeout(resolve, 350));
  persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
  assert(!persisted.links.some((link) => link.spellId === 'catalog-22'), 'Vínculo órfão reapareceu após recarga.');
  assert(persisted.links.some((link) => link.spellId === customSpell.id && link.prepared), 'Vínculo personalizado preparado não persistiu.');
  assert(persisted.spells.some((spell) => spell.id === customSpell.id), 'Magia personalizada não persistiu.');
  assert(errors.length === 0, `Erros no navegador: ${errors.join(' | ')}`);

  console.log(JSON.stringify({
    status: 'aprovado',
    login: true,
    totalComMagiaPersonalizada: 276,
    migracao: {
      vinculoOrfaoRemovido: true,
      vinculoCatalogoPreservado: true,
      magiaEVinculoPersonalizadosPreservados: true,
    },
    buscasRemovidas: removedSearchResults,
    filtros: filterResults,
    detalhesDescricoesEAprimoramentos: true,
    correcoesDeDados: true,
    personagemVinculoPreparacaoRemocao: true,
    recargaEAsyncStorage: true,
    errosNoNavegador: errors,
  }, null, 2));

  await browser.close();
})().catch(async (error) => {
  console.error(error);
  await activeBrowser?.close();
  process.exitCode = 1;
});
