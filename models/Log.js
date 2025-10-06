const { database } = require('../database/database');

class Log {
  static async create(data) {
    const {
      schedule_id,
      session_name,
      destination,
      message_content,
      status,
      attempts = 1,
      whatsapp_message_id,
      error_message
    } = data;

    const result = await database.run(`
      INSERT INTO logs (
        schedule_id, session_name, destination, message_content,
        status, attempts, whatsapp_message_id, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      schedule_id, session_name, destination, message_content,
      status, attempts, whatsapp_message_id, error_message,
      new Date().toISOString()
    ]);
    
    return result.id;
  }

  static async count() {
    const result = await database.get('SELECT COUNT(*) as count FROM logs');
    return result.count;
  }

  static async getRecent(limit = 10) {
    return await database.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?', [limit]);
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 50, status } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM logs';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await database.all(query, params);
  }

  static async findByScheduleId(scheduleId) {
    return await database.all('SELECT * FROM logs WHERE schedule_id = ? ORDER BY created_at DESC', [scheduleId]);
  }
}

module.exports = Log;