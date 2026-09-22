export function initials(name) {
  return String(name)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatDate(value) {
  if (!value) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function spellLabel(key) {
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
