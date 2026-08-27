import catalogRaw from '../data/magias-tormenta20-catalogo-inicial.json';

export function splitLines(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const catalogSpells = catalogRaw.map((item) => ({
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

export function mergeCatalogWithSavedSpells(savedSpells) {
  if (!Array.isArray(savedSpells)) return catalogSpells;

  const savedById = new Map(savedSpells.map((spell) => [spell.id, spell]));
  const mergedCatalog = catalogSpells.map((spell) => ({
    ...spell,
    ...(savedById.get(spell.id) ?? {}),
  }));
  const customSpells = savedSpells.filter(
    (spell) => !String(spell.id).startsWith('catalog-'),
  );

  return [...mergedCatalog, ...customSpells];
}
