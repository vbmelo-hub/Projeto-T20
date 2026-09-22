export const filterKeys = [
  'type',
  'school',
  'circle',
  'execution',
  'range',
  'duration',
  'source',
  'target',
  'resistance',
];

export const filterLabels = {
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

export function createEmptyFilters() {
  return filterKeys.reduce((values, key) => ({ ...values, [key]: '' }), {});
}

export function filterAndSortSpells(spells, query, filters, sortAsc) {
  const text = query.trim().toLowerCase();

  return [...spells]
    .filter((spell) => {
      const matchesText =
        !text ||
        [
          spell.name,
          spell.description,
          spell.type,
          spell.school,
          spell.source,
          spell.target,
          spell.resistance,
          spell.tags,
          ...(spell.upgrades ?? []),
        ]
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
}

export function buildFilterOptions(spells) {
  return filterKeys.reduce((options, key) => {
    const values = [...new Set(spells.map((spell) => spell[key]).filter(Boolean))].sort(
      (a, b) =>
        String(a).localeCompare(String(b), 'pt-BR', {
          sensitivity: 'base',
          numeric: true,
        }),
    );
    return { ...options, [key]: values };
  }, {});
}
