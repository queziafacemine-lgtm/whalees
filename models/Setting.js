const { database } = require('../database/database');

class Setting {
  static async get(key) {
    const row = await database.get('SELECT value FROM settings WHERE key = ?', [key]);
    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    }
    return null;
  }

  static async set(key, value) {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    const now = new Date().toISOString();
    
    await database.run(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, ?)
    `, [key, jsonValue, now]);
    
    return true;
  }

  static async getAll() {
    const rows = await database.all('SELECT * FROM settings');
    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    return settings;
  }

  static async delete(key) {
    const result = await database.run('DELETE FROM settings WHERE key = ?', [key]);
    return result.changes > 0;
  }

  static async getWebhookUrl() {
    const url = await this.get('webhook_url');
    return url || null;
  }

  static async setWebhookUrl(url) {
    return await this.set('webhook_url', url);
  }

  static async getRetryIntervals() {
    const intervals = await this.get('retry_intervals');
    return intervals || [30, 60, 300, 900]; // padrão: 30s, 1min, 5min, 15min
  }

  static async setRetryIntervals(intervals) {
    return await this.set('retry_intervals', intervals);
  }

  static async getMaxAttempts() {
    const maxAttempts = await this.get('max_attempts');
    return maxAttempts || 3;
  }

  static async setMaxAttempts(maxAttempts) {
    return await this.set('max_attempts', maxAttempts);
  }
}

module.exports = Setting;