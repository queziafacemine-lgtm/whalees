const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Garante que o diretório database existe
const dbDir = path.dirname(__filename);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(__dirname, 'whatsapp_bot.db');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar com o banco:', err.message);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco SQLite');
          this.initTables();
          resolve();
        }
      });
    });
  }

  initTables() {
    // Tabela de usuários admin
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de sessões WhatsApp
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'disconnected',
        qr_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de templates de mensagens
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        variables TEXT, -- JSON string
        media_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de templates de variáveis
    this.db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        variables TEXT NOT NULL, -- JSON string: [{"key": "cidade", "values": ["joinville", "blumenau"]}]
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de agendamentos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT NOT NULL,
        destination TEXT NOT NULL,
        message_id INTEGER,
        custom_message TEXT,
        schedule_type TEXT NOT NULL, -- 'once' ou 'recurring'
        send_at DATETIME NOT NULL,
        interval_days INTEGER,
        status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
        attempts INTEGER DEFAULT 0,
        last_attempt DATETIME,
        whatsapp_message_id TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages (id)
      )
    `);

    // Tabela de logs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER,
        session_name TEXT NOT NULL,
        destination TEXT NOT NULL,
        message_content TEXT,
        status TEXT NOT NULL, -- 'sent', 'failed'
        attempts INTEGER DEFAULT 1,
        whatsapp_message_id TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules (id)
      )
    `);

    // Tabela de configurações
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir configurações padrão
    this.db.run(`
      INSERT OR IGNORE INTO settings (key, value) VALUES 
      ('webhook_url', ''),
      ('max_attempts', '3'),
      ('retry_intervals', '[30, 120, 300]'),
      ('admin_created', 'false')
    `);

    console.log('✅ Tabelas do banco inicializadas');
  }

  // Métodos auxiliares para queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const database = new Database();

// Função para inicializar o banco
async function initializeDatabase() {
  await database.initialize();
  return database;
}

module.exports = { database, initializeDatabase };