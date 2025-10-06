const { database } = require('../database/database');

class Schedule {
  static async create(data) {
    const {
      session_name,
      destination,
      message_id,
      custom_message,
      schedule_type = 'once',
      send_at,
      interval_days,
      created_by
    } = data;

    const result = await database.run(`
      INSERT INTO schedules (
        session_name, destination, message_id, custom_message, 
        schedule_type, send_at, interval_days, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [
      session_name, destination, message_id, custom_message,
      schedule_type, send_at, interval_days,
      new Date().toISOString(), new Date().toISOString()
    ]);
    
    return result.id;
  }

  static async count() {
    const result = await database.get('SELECT COUNT(*) as count FROM schedules');
    return result.count;
  }

  static async countByStatus(status) {
    const result = await database.get('SELECT COUNT(*) as count FROM schedules WHERE status = ?', [status]);
    return result.count;
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM schedules';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await database.all(query, params);
  }

  static async delete(id) {
    const result = await database.run('DELETE FROM schedules WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async findById(id) {
    return await database.get('SELECT * FROM schedules WHERE id = ?', [id]);
  }

  static async updateStatus(id, status, error_message = null) {
    const result = await database.run(
      'UPDATE schedules SET status = ?, error_message = ?, updated_at = ? WHERE id = ?',
      [status, error_message, new Date().toISOString(), id]
    );
    return result.changes > 0;
  }
}

module.exports = Schedule;