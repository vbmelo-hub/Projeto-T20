import bcrypt from 'bcryptjs'
import cors from 'cors'
import Database from 'better-sqlite3'
import express from 'express'
import jwt from 'jsonwebtoken'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const dataDir = join(rootDir, 'data')
const dbPath = join(dataDir, 'grimorio20.sqlite')
const port = Number(process.env.PORT ?? 3001)
const jwtSecret = process.env.JWT_SECRET ?? 'grimorio20-dev-secret'

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS spell_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS ranges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS durations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS spells (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type_id TEXT REFERENCES spell_types(id) ON DELETE SET NULL,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
    execution_id TEXT REFERENCES executions(id) ON DELETE SET NULL,
    range_id TEXT REFERENCES ranges(id) ON DELETE SET NULL,
    duration_id TEXT REFERENCES durations(id) ON DELETE SET NULL,
    source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
    target TEXT NOT NULL DEFAULT '',
    resistance TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    upgrades TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    race TEXT NOT NULL DEFAULT '',
    class TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS character_spells (
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    spell_id TEXT NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
    prepared INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id, spell_id)
  );

  CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
  CREATE INDEX IF NOT EXISTS idx_character_spells_spell ON character_spells(spell_id);
  CREATE INDEX IF NOT EXISTS idx_spells_name ON spells(name);
`)

const spellColumns = db.prepare('PRAGMA table_info(spells)').all().map((column) => column.name)
if (!spellColumns.includes('created_by_user_id')) {
  db.prepare('ALTER TABLE spells ADD COLUMN created_by_user_id TEXT').run()
}
db.prepare('CREATE INDEX IF NOT EXISTS idx_spells_created_by_user ON spells(created_by_user_id)').run()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' })
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.created_at,
  }
}

function authenticate(req, res, next) {
  const [, token] = (req.headers.authorization ?? '').split(' ')
  if (!token) {
    res.status(401).json({ error: 'Autenticação obrigatória.' })
    return
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub)
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado.' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' })
  }
}

function requiredText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getOrCreate(table, value) {
  const name = optionalText(value)
  if (!name) return null

  const existing = db.prepare(`SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE`).get(name)
  if (existing) return existing.id

  const id = randomUUID()
  db.prepare(`INSERT INTO ${table} (id, name) VALUES (?, ?)`).run(id, name)
  return id
}

function normalizeUpgrades(value) {
  if (Array.isArray(value)) return value.map(optionalText).filter(Boolean).join('\n')
  return optionalText(value)
}

function mapSpell(row, userId = '') {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? '',
    school: row.school ?? '',
    circle: row.circle ?? '',
    execution: row.execution ?? '',
    range: row.range ?? '',
    duration: row.duration ?? '',
    source: row.source ?? '',
    target: row.target ?? '',
    resistance: row.resistance ?? '',
    description: row.description ?? '',
    upgrades: row.upgrades ? String(row.upgrades).split('\n').filter(Boolean) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isHomebrew: Boolean(row.created_by_user_id),
    canManage: Boolean(row.created_by_user_id && row.created_by_user_id === userId),
    prepared: Boolean(row.prepared),
    addedAt: row.added_at ?? '',
  }
}

function spellSelect(extra = '') {
  return `
    SELECT
      spells.*,
      spell_types.name AS type,
      schools.name AS school,
      circles.name AS circle,
      executions.name AS execution,
      ranges.name AS range,
      durations.name AS duration,
      sources.name AS source
      ${extra}
    FROM spells
    LEFT JOIN spell_types ON spell_types.id = spells.type_id
    LEFT JOIN schools ON schools.id = spells.school_id
    LEFT JOIN circles ON circles.id = spells.circle_id
    LEFT JOIN executions ON executions.id = spells.execution_id
    LEFT JOIN ranges ON ranges.id = spells.range_id
    LEFT JOIN durations ON durations.id = spells.duration_id
    LEFT JOIN sources ON sources.id = spells.source_id
  `
}

function mapCharacter(row) {
  return {
    id: row.id,
    name: row.name,
    race: row.race,
    characterClass: row.class,
    photo: row.photo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spellCount: row.spell_count ?? 0,
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: dbPath })
})

app.post('/api/auth/register', (req, res) => {
  const email = requiredText(req.body.email).toLowerCase()
  const password = requiredText(req.body.password)
  const username = requiredText(req.body.username)

  if (!email || !password || !username) {
    res.status(400).json({ error: 'Email, senha e username são obrigatórios.' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' })
    return
  }

  const id = randomUUID()
  const passwordHash = bcrypt.hashSync(password, 12)

  try {
    db.prepare('INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)').run(
      id,
      email,
      username,
      passwordHash,
    )
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    res.status(201).json({ user: publicUser(user), token: signToken(user) })
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      res.status(409).json({ error: 'Este email já está cadastrado.' })
      return
    }
    res.status(500).json({ error: 'Não foi possível cadastrar o usuário.' })
  }
})

app.post('/api/auth/login', (req, res) => {
  const email = requiredText(req.body.email).toLowerCase()
  const password = requiredText(req.body.password)
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Email ou senha inválidos.' })
    return
  }

  res.json({ user: publicUser(user), token: signToken(user) })
})

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

app.get('/api/spells', authenticate, (req, res) => {
  const clauses = []
  const params = {}
  const query = optionalText(req.query.query)

  if (query) {
    params.query = `%${query}%`
    clauses.push(`(
      spells.name LIKE @query COLLATE NOCASE OR
      spells.description LIKE @query COLLATE NOCASE OR
      spells.upgrades LIKE @query COLLATE NOCASE
    )`)
  }

  const filterMap = {
    type: 'spell_types.name',
    school: 'schools.name',
    circle: 'circles.name',
    execution: 'executions.name',
    range: 'ranges.name',
    duration: 'durations.name',
    source: 'sources.name',
    target: 'spells.target',
    resistance: 'spells.resistance',
  }

  for (const [key, column] of Object.entries(filterMap)) {
    const value = optionalText(req.query[key])
    if (!value) continue
    params[key] = value
    clauses.push(`${column} = @${key} COLLATE NOCASE`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db.prepare(`${spellSelect()} ${where} ORDER BY spells.name ASC`).all(params)
  res.json({ spells: rows.map((row) => mapSpell(row, req.user.id)) })
})

app.get('/api/spells/options', authenticate, (_req, res) => {
  const optionTable = (table) =>
    db.prepare(`SELECT name FROM ${table} ORDER BY name ASC`).all().map((row) => row.name)

  res.json({
    type: optionTable('spell_types'),
    school: optionTable('schools'),
    circle: optionTable('circles'),
    execution: optionTable('executions'),
    range: optionTable('ranges'),
    duration: optionTable('durations'),
    source: optionTable('sources'),
    target: db
      .prepare("SELECT DISTINCT target AS name FROM spells WHERE target <> '' ORDER BY target ASC")
      .all()
      .map((row) => row.name),
    resistance: db
      .prepare("SELECT DISTINCT resistance AS name FROM spells WHERE resistance <> '' ORDER BY resistance ASC")
      .all()
      .map((row) => row.name),
  })
})

app.get('/api/spells/:id', authenticate, (req, res) => {
  const row = db.prepare(`${spellSelect()} WHERE spells.id = ?`).get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'Magia não encontrada.' })
    return
  }
  res.json({ spell: mapSpell(row, req.user.id) })
})

app.post('/api/spells', authenticate, (req, res) => {
  const name = requiredText(req.body.name)
  if (!name) {
    res.status(400).json({ error: 'Nome da magia é obrigatório.' })
    return
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO spells (
      id, name, type_id, school_id, circle_id, execution_id, range_id,
      duration_id, source_id, target, resistance, description, upgrades, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    getOrCreate('spell_types', req.body.type),
    getOrCreate('schools', req.body.school),
    getOrCreate('circles', req.body.circle),
    getOrCreate('executions', req.body.execution),
    getOrCreate('ranges', req.body.range),
    getOrCreate('durations', req.body.duration),
    getOrCreate('sources', req.body.source),
    optionalText(req.body.target),
    optionalText(req.body.resistance),
    optionalText(req.body.description),
    normalizeUpgrades(req.body.upgrades),
    req.user.id,
  )

  const row = db.prepare(`${spellSelect()} WHERE spells.id = ?`).get(id)
  res.status(201).json({ spell: mapSpell(row, req.user.id) })
})

app.put('/api/spells/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT id, created_by_user_id FROM spells WHERE id = ?').get(req.params.id)
  const name = requiredText(req.body.name)
  if (!existing) {
    res.status(404).json({ error: 'Magia não encontrada.' })
    return
  }
  if (!existing.created_by_user_id || existing.created_by_user_id !== req.user.id) {
    res.status(403).json({ error: 'Voce so pode editar magias homebrew criadas por voce.' })
    return
  }
  if (!name) {
    res.status(400).json({ error: 'Nome da magia é obrigatório.' })
    return
  }

  db.prepare(`
    UPDATE spells SET
      name = ?,
      type_id = ?,
      school_id = ?,
      circle_id = ?,
      execution_id = ?,
      range_id = ?,
      duration_id = ?,
      source_id = ?,
      target = ?,
      resistance = ?,
      description = ?,
      upgrades = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name,
    getOrCreate('spell_types', req.body.type),
    getOrCreate('schools', req.body.school),
    getOrCreate('circles', req.body.circle),
    getOrCreate('executions', req.body.execution),
    getOrCreate('ranges', req.body.range),
    getOrCreate('durations', req.body.duration),
    getOrCreate('sources', req.body.source),
    optionalText(req.body.target),
    optionalText(req.body.resistance),
    optionalText(req.body.description),
    normalizeUpgrades(req.body.upgrades),
    req.params.id,
  )

  const row = db.prepare(`${spellSelect()} WHERE spells.id = ?`).get(req.params.id)
  res.json({ spell: mapSpell(row, req.user.id) })
})

app.delete('/api/spells/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT id, created_by_user_id FROM spells WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Magia nao encontrada.' })
    return
  }
  if (!existing.created_by_user_id || existing.created_by_user_id !== req.user.id) {
    res.status(403).json({ error: 'Voce so pode excluir magias homebrew criadas por voce.' })
    return
  }

  const result = db.prepare('DELETE FROM spells WHERE id = ?').run(req.params.id)
  if (false && !result.changes) {
    res.status(404).json({ error: 'Magia não encontrada.' })
    return
  }
  res.status(204).end()
})

app.get('/api/spells/:id/available-characters', authenticate, (req, res) => {
  const rows = db
    .prepare(`
      SELECT characters.*, 0 AS spell_count
      FROM characters
      WHERE characters.user_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM character_spells
          WHERE character_spells.character_id = characters.id
            AND character_spells.spell_id = ?
        )
      ORDER BY characters.created_at DESC
    `)
    .all(req.user.id, req.params.id)
  res.json({ characters: rows.map(mapCharacter) })
})

app.get('/api/characters', authenticate, (req, res) => {
  const rows = db
    .prepare(`
      SELECT characters.*, COUNT(character_spells.spell_id) AS spell_count
      FROM characters
      LEFT JOIN character_spells ON character_spells.character_id = characters.id
      WHERE characters.user_id = ?
      GROUP BY characters.id
      ORDER BY characters.created_at DESC
    `)
    .all(req.user.id)
  res.json({ characters: rows.map(mapCharacter) })
})

app.post('/api/characters', authenticate, (req, res) => {
  const name = requiredText(req.body.name)
  if (!name) {
    res.status(400).json({ error: 'Nome do personagem é obrigatório.' })
    return
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO characters (id, user_id, name, race, class, photo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.id,
    name,
    optionalText(req.body.race),
    optionalText(req.body.characterClass),
    optionalText(req.body.photo),
  )

  const row = db.prepare('SELECT *, 0 AS spell_count FROM characters WHERE id = ?').get(id)
  res.status(201).json({ character: mapCharacter(row) })
})

app.get('/api/characters/:id', authenticate, (req, res) => {
  const character = db
    .prepare(`
      SELECT characters.*, COUNT(character_spells.spell_id) AS spell_count
      FROM characters
      LEFT JOIN character_spells ON character_spells.character_id = characters.id
      WHERE characters.id = ? AND characters.user_id = ?
      GROUP BY characters.id
    `)
    .get(req.params.id, req.user.id)

  if (!character) {
    res.status(404).json({ error: 'Personagem não encontrado.' })
    return
  }

  const rows = db
    .prepare(`
      ${spellSelect(', character_spells.prepared, character_spells.added_at')}
      INNER JOIN character_spells ON character_spells.spell_id = spells.id
      WHERE character_spells.character_id = ?
      ORDER BY character_spells.added_at DESC
    `)
    .all(req.params.id)

  res.json({ character: mapCharacter(character), spells: rows.map((row) => mapSpell(row, req.user.id)) })
})

app.put('/api/characters/:id', authenticate, (req, res) => {
  const name = requiredText(req.body.name)
  if (!name) {
    res.status(400).json({ error: 'Nome do personagem é obrigatório.' })
    return
  }

  const result = db
    .prepare(`
      UPDATE characters
      SET name = ?, race = ?, class = ?, photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `)
    .run(
      name,
      optionalText(req.body.race),
      optionalText(req.body.characterClass),
      optionalText(req.body.photo),
      req.params.id,
      req.user.id,
    )

  if (false && !result.changes) {
    res.status(404).json({ error: 'Personagem não encontrado.' })
    return
  }

  const row = db.prepare('SELECT *, 0 AS spell_count FROM characters WHERE id = ?').get(req.params.id)
  res.json({ character: mapCharacter(row) })
})

app.delete('/api/characters/:id', authenticate, (req, res) => {
  const result = db
    .prepare('DELETE FROM characters WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id)
  if (!result.changes) {
    res.status(404).json({ error: 'Personagem não encontrado.' })
    return
  }
  res.status(204).end()
})

app.post('/api/characters/:id/spells', authenticate, (req, res) => {
  const spellId = requiredText(req.body.spellId)
  const character = db
    .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  const spell = db.prepare('SELECT id FROM spells WHERE id = ?').get(spellId)

  if (!character || !spell) {
    res.status(404).json({ error: 'Personagem ou magia não encontrado.' })
    return
  }

  try {
    db.prepare('INSERT INTO character_spells (character_id, spell_id) VALUES (?, ?)').run(
      req.params.id,
      spellId,
    )
    res.status(201).json({ ok: true })
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      res.status(409).json({ error: 'Esta magia já está vinculada ao personagem.' })
      return
    }
    res.status(500).json({ error: 'Não foi possível vincular a magia.' })
  }
})

app.patch('/api/characters/:characterId/spells/:spellId', authenticate, (req, res) => {
  const prepared = req.body.prepared ? 1 : 0
  const relation = db
    .prepare(`
      SELECT character_spells.prepared
      FROM character_spells
      INNER JOIN characters ON characters.id = character_spells.character_id
      WHERE character_spells.character_id = ?
        AND characters.user_id = ?
        AND character_spells.spell_id = ?
    `)
    .get(req.params.characterId, req.user.id, req.params.spellId)

  if (!relation) {
    res.status(404).json({ error: 'Vinculo entre personagem e magia nao encontrado.' })
    return
  }

  const result = db
    .prepare(`
      UPDATE character_spells
      SET prepared = ?
      WHERE character_id = (
        SELECT id FROM characters WHERE id = ? AND user_id = ?
      )
      AND spell_id = ?
    `)
    .run(prepared, req.params.characterId, req.user.id, req.params.spellId)

  if (!result.changes) {
    res.status(404).json({ error: 'Vínculo entre personagem e magia não encontrado.' })
    return
  }

  res.json({ ok: true, changed: Boolean(result.changes), prepared: Boolean(prepared) })
})

app.delete('/api/characters/:characterId/spells/:spellId', authenticate, (req, res) => {
  const result = db
    .prepare(`
      DELETE FROM character_spells
      WHERE character_id = (
        SELECT id FROM characters WHERE id = ? AND user_id = ?
      )
      AND spell_id = ?
    `)
    .run(req.params.characterId, req.user.id, req.params.spellId)

  if (!result.changes) {
    res.status(404).json({ error: 'Vínculo entre personagem e magia não encontrado.' })
    return
  }

  res.status(204).end()
})

const distDir = join(rootDir, 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Grimório 20 API em http://127.0.0.1:${port}`)
  console.log(`SQLite: ${dbPath}`)
})
