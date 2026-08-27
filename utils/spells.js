import catalogRaw from '../data/magias-tormenta20-catalogo-inicial.json';

export function splitLines(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitUpgrades(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).replace(/\r\n?/g, '\n').trim())
      .filter(Boolean);
  }

  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];

  const headerPattern = /^(?:Truque|\+\d+\s*PM)(?:\s*\([^:\n]*\)?)?\s*:/gim;
  const headers = [...text.matchAll(headerPattern)];

  if (!headers.length) return [text];

  const blocks = [];
  const introduction = text.slice(0, headers[0].index).trim();
  if (introduction) blocks.push(introduction);

  headers.forEach((header, index) => {
    const nextHeader = headers[index + 1];
    const block = text.slice(header.index, nextHeader?.index ?? text.length).trim();
    if (block) blocks.push(block);
  });

  return blocks;
}

export const catalogSpells = catalogRaw.map((item) => ({
  id: `catalog-${item.id}`,
  siteId: item.site_id,
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
  upgrades: splitUpgrades(item.aprimoramentos),
  tags: item.tags_busca,
  page: item.pagina,
  review: item.revisar_no_material_oficial,
  referenceUrl: item.url_referencia,
  catalog: true,
}));

export function mergeCatalogWithSavedSpells(savedSpells) {
  if (!Array.isArray(savedSpells)) return catalogSpells;

  const savedById = new Map(savedSpells.map((spell) => [spell.id, spell]));
  const mergedCatalog = catalogSpells.map((catalogSpell) => ({
    ...(savedById.get(catalogSpell.id) ?? {}),
    ...catalogSpell,
  }));
  const customSpells = savedSpells.filter(
    (spell) => !String(spell.id).startsWith('catalog-'),
  );

  return [...mergedCatalog, ...customSpells];
}

export function sanitizeLinks(links, spells) {
  if (!Array.isArray(links) || !Array.isArray(spells)) return [];

  const validSpellIds = new Set(spells.map((spell) => spell.id));
  return links.filter((link) => validSpellIds.has(link?.spellId));
}
