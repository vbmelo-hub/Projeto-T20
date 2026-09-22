import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, '..');

const PATHS = {
  raw: resolve(ROOT_DIR, 'data/imports/magias-t20-completas.raw.json'),
  catalog: resolve(ROOT_DIR, 'data/magias-tormenta20-catalogo-inicial.json'),
  imported: resolve(ROOT_DIR, 'data/magias-tormenta20-catalogo-importado.json'),
  report: resolve(ROOT_DIR, 'data/imports/relatorio-importacao.json'),
};

const EXPECTED_IMPORT_COUNT = 275;
const REQUIRED_STRING_FIELDS = [
  'tipo',
  'escola',
  'execucao',
  'alcance',
  'duracao',
  'fonte',
  'descricao',
  'aprimoramentos',
  'url_referencia',
];
const IMPORTED_CANONICAL_FIELDS = [
  'site_id',
  'nome',
  'tipo',
  'escola',
  'circulo',
  'execucao',
  'alcance',
  'duracao',
  'alvo_area_efeito',
  'resistencia',
  'fonte',
  'pagina',
  'descricao',
  'aprimoramentos',
  'url_referencia',
  'tags_busca',
  'revisar_no_material_oficial',
];
const SCRAPER_ARTIFACT =
  /(?:function\s+confirmDelete\s*\(\s*\)|window\.location\.href|\/delete_spell\/|confirmDelete\s*\(\s*\))/i;
const KNOWN_CORRECTIONS = new Map([
  [
    'aliado animal',
    {
      field: 'alcance',
      from: 'curto;',
      to: 'curto',
      reason: 'Remoção de pontuação indevida no alcance.',
    },
  ],
  [
    'area escorregadia',
    {
      field: 'alcance',
      from: 'curtoAlvo ou',
      to: 'curto',
      reason: 'Remoção de rótulo concatenado ao alcance.',
    },
  ],
  [
    'explosao caleidoscopica',
    {
      field: 'alcance',
      from: 'curto Área: esfera com 6m de raio',
      to: 'curto',
      expectedTarget: 'esfera com 6m de raio',
      reason: 'A área já está registrada em alvo_area_efeito e foi removida do alcance.',
    },
  ],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function normalizeName(value) {
  return String(value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLineEndings(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n');
}

function readUtf8Json(path, label) {
  const bytes = readFileSync(path);
  let text;

  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} não está codificado como UTF-8 válido.`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} contém JSON inválido: ${error.message}`);
  }
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function findDuplicates(values, keyFor = (value) => String(value)) {
  const occurrences = new Map();

  values.forEach((value) => {
    const key = keyFor(value);
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  });

  return [...occurrences.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function validateImportedData(imported) {
  invariant(Array.isArray(imported), 'O JSON importado deve conter um array.');
  invariant(
    imported.length === EXPECTED_IMPORT_COUNT,
    `Quantidade inválida: esperados ${EXPECTED_IMPORT_COUNT}, recebidos ${imported.length}.`,
  );

  const duplicateIds = findDuplicates(imported.map((item) => item.id));
  const duplicateSiteIds = findDuplicates(imported.map((item) => item.site_id));
  const duplicateNames = findDuplicates(imported, (item) => normalizeName(item.nome));

  invariant(duplicateIds.length === 0, `IDs duplicados no arquivo importado: ${JSON.stringify(duplicateIds)}`);
  invariant(
    duplicateSiteIds.length === 0,
    `site_ids duplicados no arquivo importado: ${JSON.stringify(duplicateSiteIds)}`,
  );
  invariant(
    duplicateNames.length === 0,
    `Nomes duplicados após normalização: ${JSON.stringify(duplicateNames)}`,
  );

  imported.forEach((item, index) => {
    const label = item.nome || `registro ${index + 1}`;
    invariant(Number.isInteger(item.id) && item.id > 0, `${label}: id deve ser inteiro positivo.`);
    invariant(
      Number.isInteger(item.site_id) && item.site_id > 0,
      `${label}: site_id deve ser inteiro positivo.`,
    );
    invariant(typeof item.nome === 'string' && item.nome.trim(), `${label}: nome é obrigatório.`);
    invariant(typeof item.circulo === 'number' && Number.isFinite(item.circulo), `${label}: círculo deve ser número.`);

    REQUIRED_STRING_FIELDS.forEach((field) => {
      invariant(typeof item[field] === 'string', `${label}: ${field} deve ser string.`);
    });
  });
}

function validateOldCatalog(catalog) {
  invariant(Array.isArray(catalog), 'O catálogo atual deve conter um array.');

  const duplicateIds = findDuplicates(catalog.map((item) => item.id));
  const duplicateNames = findDuplicates(catalog, (item) => normalizeName(item.nome));

  invariant(duplicateIds.length === 0, `O catálogo atual possui IDs duplicados: ${JSON.stringify(duplicateIds)}`);
  invariant(
    duplicateNames.length === 0,
    `O catálogo atual possui nomes duplicados após normalização: ${JSON.stringify(duplicateNames)}`,
  );

  catalog.forEach((item) => {
    invariant(Number.isInteger(item.id) && item.id > 0, `${item.nome}: id antigo inválido.`);
    invariant(typeof item.nome === 'string' && item.nome.trim(), `Magia antiga sem nome no ID ${item.id}.`);
  });
}

function cleanScraperText(value) {
  const normalized = normalizeLineEndings(value);
  const match = SCRAPER_ARTIFACT.exec(normalized);

  if (!match) return { value: normalized.trim(), removed: false };

  return {
    value: normalized.slice(0, match.index).trim(),
    removed: true,
  };
}

function ascii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function detectSuspiciousFields(item) {
  const suspicious = [];
  const metadataFields = [
    'tipo',
    'escola',
    'execucao',
    'alcance',
    'duracao',
    'alvo_area_efeito',
    'resistencia',
    'fonte',
  ];

  metadataFields.forEach((field) => {
    const originalValue = String(item[field] ?? '');
    const value = ascii(originalValue).toLowerCase();
    let reason = '';

    if (/(?:alcance|duracao|alvo(?:\s*\/\s*area\s*\/\s*efeito)?|resistencia|publicacao|fonte)\s*:/.test(value)) {
      reason = 'Possível rótulo de outro campo capturado junto ao valor.';
    } else if (
      /(?:curto|medio|longo|pessoal|toque)(?:alvo|area|efeito|duracao|resistencia|fonte)/.test(
        value.replace(/\s+/g, ''),
      )
    ) {
      reason = 'Possível concatenação acidental entre valor e rótulo.';
    } else if (field === 'alcance' && /;$/.test(value.trim())) {
      reason = 'Pontuação final incomum para um valor de alcance.';
    }

    if (reason) {
      suspicious.push({
        nome: item.nome,
        campo: field,
        valor: originalValue,
        motivo: reason,
        url_referencia: item.url_referencia,
      });
    }
  });

  normalizeLineEndings(item.aprimoramentos)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\+\d+\s*PM/i.test(line) && line.includes('(') && !line.includes(')'))
    .forEach((line) => {
      suspicious.push({
        nome: item.nome,
        campo: 'aprimoramentos',
        valor: line,
        motivo: 'Cabeçalho de aprimoramento contém parêntese sem fechamento.',
        url_referencia: item.url_referencia,
      });
    });

  return suspicious;
}

function applyKnownCorrection(record) {
  const correction = KNOWN_CORRECTIONS.get(normalizeName(record.nome));
  if (!correction) return { record, corrections: [] };

  invariant(
    record[correction.field] === correction.from,
    `${record.nome}: o valor de ${correction.field} mudou e a correção conhecida precisa ser revisada.`,
  );
  if (correction.expectedTarget) {
    invariant(
      record.alvo_area_efeito === correction.expectedTarget,
      `${record.nome}: alvo_area_efeito não contém o valor esperado antes da correção.`,
    );
  }

  return {
    record: { ...record, [correction.field]: correction.to },
    corrections: [
      {
        nome: record.nome,
        campo: correction.field,
        valor_anterior: correction.from,
        valor_corrigido: correction.to,
        motivo: correction.reason,
      },
    ],
  };
}

function importedRecord(item, id) {
  const description = cleanScraperText(item.descricao);
  const upgrades = cleanScraperText(item.aprimoramentos);
  const converted = applyKnownCorrection({
    id,
    site_id: item.site_id,
    nome: item.nome,
    tipo: item.tipo,
    escola: item.escola,
    circulo: item.circulo,
    execucao: item.execucao,
    alcance: item.alcance,
    duracao: item.duracao,
    alvo_area_efeito: item.alvo_area_efeito,
    resistencia: item.resistencia,
    fonte: item.fonte,
    pagina: String(item.pagina ?? ''),
    descricao: description.value,
    aprimoramentos: upgrades.value,
    url_referencia: item.url_referencia,
    tags_busca: String(item.tags_busca ?? ''),
    revisar_no_material_oficial: Boolean(item.revisar_no_material_oficial),
  });

  return {
    record: converted.record,
    corrections: converted.corrections,
    artifactsRemoved: Number(description.removed) + Number(upgrades.removed),
  };
}

function buildCatalog(imported, oldCatalog) {
  const oldByName = new Map(oldCatalog.map((item) => [normalizeName(item.nome), item]));
  const importedNames = new Set(imported.map((item) => normalizeName(item.nome)));
  const maxOldId = Math.max(...oldCatalog.map((item) => item.id), 0);
  let nextId = maxOldId + 1;

  const existing = [];
  const added = [];
  const corrections = [];
  const cleanedNames = new Set();
  let artifactsRemoved = 0;

  const importedRecords = imported.map((item) => {
    const oldItem = oldByName.get(normalizeName(item.nome));
    const id = oldItem ? oldItem.id : nextId++;
    const converted = importedRecord(item, id);

    artifactsRemoved += converted.artifactsRemoved;
    corrections.push(...converted.corrections);
    if (converted.artifactsRemoved) cleanedNames.add(item.nome);

    if (oldItem) existing.push({ nome: item.nome, id });
    else added.push({ nome: item.nome, id });

    return converted.record;
  });

  const oldOnly = oldCatalog
    .filter((item) => !importedNames.has(normalizeName(item.nome)));

  const catalog = [...importedRecords].sort((a, b) => a.id - b.id);
  const suspiciousFields = importedRecords.flatMap(detectSuspiciousFields);
  const descriptionsEmpty = importedRecords.filter((item) => !item.descricao).map((item) => item.nome);
  const upgradesEmpty = importedRecords.filter((item) => !item.aprimoramentos).map((item) => item.nome);

  return {
    catalog,
    reportData: {
      existing,
      added,
      oldOnly,
      corrections,
      artifactsRemoved,
      cleanedNames: [...cleanedNames],
      descriptionsEmpty,
      upgradesEmpty,
      suspiciousFields,
      maxOldId,
    },
  };
}

function validateFinalCatalog(catalog, oldCatalog, imported, maxOldId) {
  invariant(Array.isArray(catalog), 'O catálogo final deve conter um array.');
  invariant(
    catalog.length === imported.length,
    `O catálogo final deve conter apenas as ${imported.length} magias importadas, mas contém ${catalog.length}.`,
  );

  const duplicateIds = findDuplicates(catalog.map((item) => item.id));
  const duplicateNames = findDuplicates(catalog, (item) => normalizeName(item.nome));
  const siteIds = catalog.map((item) => item.site_id).filter((siteId) => siteId !== null && siteId !== undefined);
  const duplicateSiteIds = findDuplicates(siteIds);

  invariant(duplicateIds.length === 0, `IDs duplicados no catálogo final: ${JSON.stringify(duplicateIds)}`);
  invariant(
    duplicateNames.length === 0,
    `Nomes duplicados no catálogo final: ${JSON.stringify(duplicateNames)}`,
  );
  invariant(
    duplicateSiteIds.length === 0,
    `site_ids duplicados no catálogo final: ${JSON.stringify(duplicateSiteIds)}`,
  );
  invariant(siteIds.length === catalog.length, 'Todos os registros finais devem possuir site_id.');

  catalog.forEach((item) => {
    invariant(Number.isInteger(item.id) && item.id > 0, `${item.nome}: id final deve ser inteiro positivo.`);
    invariant(typeof item.nome === 'string' && item.nome.trim(), `Registro final sem nome no ID ${item.id}.`);

    const searchableText = `${item.descricao ?? ''}\n${item.aprimoramentos ?? ''}`;
    invariant(!SCRAPER_ARTIFACT.test(searchableText), `${item.nome}: artefato do scraper ainda presente.`);
  });

  const finalByName = new Map(catalog.map((item) => [normalizeName(item.nome), item]));
  const finalById = new Map(catalog.map((item) => [item.id, item]));
  const importedNames = new Set(imported.map((item) => normalizeName(item.nome)));

  oldCatalog.forEach((oldItem) => {
    const byName = finalByName.get(normalizeName(oldItem.nome));
    const byId = finalById.get(oldItem.id);

    if (importedNames.has(normalizeName(oldItem.nome))) {
      invariant(byName, `${oldItem.nome}: magia existente ausente no catálogo final.`);
      invariant(byName.id === oldItem.id, `${oldItem.nome}: ID antigo ${oldItem.id} foi alterado para ${byName.id}.`);
      invariant(
        byId && normalizeName(byId.nome) === normalizeName(oldItem.nome),
        `catalog-${oldItem.id} deixou de apontar para ${oldItem.nome}.`,
      );
    } else {
      invariant(!byName, `${oldItem.nome}: magia antiga deveria ter sido removida.`);
      invariant(!byId, `O ID removido ${oldItem.id} foi reutilizado por ${byId?.nome}.`);
    }
  });

  const oldNames = new Set(oldCatalog.map((item) => normalizeName(item.nome)));
  imported
    .filter((item) => !oldNames.has(normalizeName(item.nome)))
    .forEach((item) => {
      const finalItem = finalByName.get(normalizeName(item.nome));
      invariant(finalItem.id > maxOldId, `${item.nome}: magia nova reutilizou um ID antigo.`);
    });

  imported.forEach((item) => {
    const finalItem = finalByName.get(normalizeName(item.nome));
    const expected = importedRecord(item, finalItem.id).record;

    IMPORTED_CANONICAL_FIELDS.forEach((field) => {
      invariant(
        JSON.stringify(finalItem[field]) === JSON.stringify(expected[field]),
        `${item.nome}: o campo canônico ${field} diverge do arquivo importado limpo.`,
      );
    });
  });

  return {
    ids_unicos: true,
    nomes_unicos: true,
    site_ids_unicos: true,
    sem_confirmDelete: true,
    sem_delete_spell: true,
    sem_window_location_href: true,
    ids_antigos_preservados: true,
    vinculos_catalog_id_preservados: true,
    magias_antigas_ausentes: true,
    ids_removidos_nao_reutilizados: true,
    novas_magias_com_ids_novos: true,
    json_valido: true,
  };
}

function createReport(imported, oldCatalog, result, validations, catalogText) {
  const { reportData } = result;

  return {
    total_importado: imported.length,
    magias_existentes_atualizadas: reportData.existing.length,
    magias_novas: reportData.added.length,
    magias_antigas_removidas_total: reportData.oldOnly.length,
    magias_antigas_removidas: reportData.oldOnly.map(({ nome }) => nome),
    magias_antigas_removidas_com_ids: reportData.oldOnly.map(({ id, nome }) => ({ id, nome })),
    total_final: result.catalog.length,
    artefatos_confirmDelete_removidos: reportData.artifactsRemoved,
    registros_com_artefatos_removidos: reportData.cleanedNames,
    descricoes_vazias: reportData.descriptionsEmpty,
    aprimoramentos_vazios: reportData.upgradesEmpty,
    campos_suspeitos_corrigidos: reportData.corrections.length,
    correcoes_dados_aplicadas: reportData.corrections,
    campos_suspeitos_pendentes: reportData.suspiciousFields,
    ids_preservados: reportData.existing.length,
    total_ids_catalogo_antigo_preservados: reportData.existing.length,
    magias_novas_com_ids_atribuidos: reportData.added,
    mapeamento_ids_catalogo_antigo: oldCatalog.map(({ id, nome }) => ({ id, nome })),
    validacoes: validations,
    fonte_bruta_sha256: sha256(readFileSync(PATHS.raw)),
    catalogo_final_sha256: sha256(catalogText),
  };
}

function safelyReplaceJson(temporaryPath, destinationPath, label) {
  const backupPath = `${destinationPath}.backup-importacao`;

  invariant(
    !existsSync(backupPath),
    `Existe um backup pendente em ${backupPath}. Verifique-o antes de executar novamente.`,
  );
  if (existsSync(destinationPath)) renameSync(destinationPath, backupPath);

  try {
    renameSync(temporaryPath, destinationPath);
    readUtf8Json(destinationPath, label);
    if (existsSync(backupPath)) unlinkSync(backupPath);
  } catch (error) {
    if (existsSync(destinationPath)) unlinkSync(destinationPath);
    if (existsSync(backupPath)) renameSync(backupPath, destinationPath);
    throw error;
  }
}

function runImport() {
  const imported = readUtf8Json(PATHS.raw, 'Arquivo bruto importado');
  const currentCatalog = readUtf8Json(PATHS.catalog, 'Catálogo atual');
  let oldCatalog = currentCatalog;

  if (existsSync(PATHS.report) && existsSync(PATHS.catalog)) {
    const previousReport = readUtf8Json(PATHS.report, 'Relatório de importação existente');
    const sameRaw = previousReport.fonte_bruta_sha256 === sha256(readFileSync(PATHS.raw));
    const sameCatalog = previousReport.catalogo_final_sha256 === sha256(jsonText(currentCatalog));

    if (sameRaw && sameCatalog) {
      const currentById = new Map(currentCatalog.map((item) => [item.id, item]));
      oldCatalog = previousReport.mapeamento_ids_catalogo_antigo.map(({ id, nome }) => {
        const item = currentById.get(id);
        if (!item) return { id, nome };
        invariant(
          normalizeName(item.nome) === normalizeName(nome),
          `O ID histórico ${id} está associado a uma magia diferente.`,
        );
        return item;
      });
    }
  }

  validateImportedData(imported);
  validateOldCatalog(oldCatalog);

  const firstResult = buildCatalog(imported, oldCatalog);
  const secondResult = buildCatalog(imported, oldCatalog);
  invariant(
    jsonText(firstResult.catalog) === jsonText(secondResult.catalog),
    'A geração do catálogo não é determinística.',
  );

  const catalogText = jsonText(firstResult.catalog);
  writeFileSync(PATHS.imported, catalogText, 'utf8');

  const generatedCatalog = readUtf8Json(PATHS.imported, 'Catálogo importado temporário');
  const validations = validateFinalCatalog(
    generatedCatalog,
    oldCatalog,
    imported,
    firstResult.reportData.maxOldId,
  );
  const report = createReport(imported, oldCatalog, firstResult, validations, catalogText);
  const reportTemp = `${PATHS.report}.tmp`;

  mkdirSync(dirname(PATHS.report), { recursive: true });
  writeFileSync(reportTemp, jsonText(report), 'utf8');
  readUtf8Json(reportTemp, 'Relatório temporário');

  safelyReplaceJson(PATHS.imported, PATHS.catalog, 'Catálogo final gravado');
  safelyReplaceJson(reportTemp, PATHS.report, 'Relatório final gravado');

  console.log(JSON.stringify({
    status: 'importado',
    total_importado: report.total_importado,
    magias_existentes_atualizadas: report.magias_existentes_atualizadas,
    magias_novas: report.magias_novas,
    magias_antigas_removidas: report.magias_antigas_removidas_total,
    total_final: report.total_final,
    artefatos_removidos: report.artefatos_confirmDelete_removidos,
    descricoes_vazias: report.descricoes_vazias.length,
    aprimoramentos_vazios: report.aprimoramentos_vazios.length,
    campos_suspeitos_corrigidos: report.campos_suspeitos_corrigidos,
    campos_suspeitos_pendentes: report.campos_suspeitos_pendentes.length,
    validacoes: report.validacoes,
  }, null, 2));
}

function runCheck() {
  const imported = readUtf8Json(PATHS.raw, 'Arquivo bruto importado');
  const catalog = readUtf8Json(PATHS.catalog, 'Catálogo final');
  const report = readUtf8Json(PATHS.report, 'Relatório de importação');
  const oldCatalog = report.mapeamento_ids_catalogo_antigo;

  validateImportedData(imported);
  validateOldCatalog(oldCatalog);

  const validations = validateFinalCatalog(
    catalog,
    oldCatalog,
    imported,
    Math.max(...oldCatalog.map((item) => item.id), 0),
  );

  invariant(catalog.length === report.total_final, 'O total atual diverge do relatório de importação.');
  invariant(
    sha256(jsonText(catalog)) === report.catalogo_final_sha256,
    'O catálogo atual diverge do hash registrado no relatório.',
  );

  console.log(JSON.stringify({
    status: 'válido',
    total_importado: imported.length,
    total_catalogo: catalog.length,
    ids_unicos: validations.ids_unicos,
    nomes_unicos: validations.nomes_unicos,
    site_ids_unicos: validations.site_ids_unicos,
    ids_antigos_preservados: validations.ids_antigos_preservados,
    vinculos_catalog_id_preservados: validations.vinculos_catalog_id_preservados,
    magias_antigas_ausentes: validations.magias_antigas_ausentes,
    ids_removidos_nao_reutilizados: validations.ids_removidos_nao_reutilizados,
    artefatos_do_scraper_ausentes: validations.sem_confirmDelete,
    json_valido: validations.json_valido,
  }, null, 2));
}

if (process.argv.includes('--check')) runCheck();
else runImport();
