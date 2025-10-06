const { database } = require('../database/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await database.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hashedPassword]
    );
    return result.id;
  }

  static async findByUsername(username) {
    return await database.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findById(id) {
    return await database.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async count() {
    const result = await database.get('SELECT COUNT(*) as count FROM users');
    return result.count;
  }

  static async exists() {
    const result = await database.get('SELECT COUNT(*) as count FROM users');
    return result.count > 0;
  }

  static async validatePassword(username, password) {
    const user = await this.findByUsername(username);
    if (!user) {
      return false;
    }
    return await bcrypt.compare(password, user.password_hash);
  }

  static async getAll() {
    return await database.all('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
  }

  static async delete(id) {
    const result = await database.run('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

module.exports = User;