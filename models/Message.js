const { database } = require('../database/database');

class Message {
  static async create(name, content, variables = {}, mediaPath = null) {
    const result = await database.run(
      'INSERT INTO messages (name, content, variables, media_path) VALUES (?, ?, ?, ?)',
      [name, content, JSON.stringify(variables), mediaPath]
    );
    return result.id;
  }

  static async findById(id) {
    const message = await database.get('SELECT * FROM messages WHERE id = ?', [id]);
    if (message && message.variables) {
      message.variables = JSON.parse(message.variables);
    }
    return message;
  }

  static async findByName(name) {
    const message = await database.get('SELECT * FROM messages WHERE name = ?', [name]);
    if (message && message.variables) {
      message.variables = JSON.parse(message.variables);
    }
    return message;
  }

  static async findAll() {
    const messages = await database.all('SELECT * FROM messages ORDER BY created_at DESC');
    return messages.map(msg => ({
      ...msg,
      variables: msg.variables ? JSON.parse(msg.variables) : {}
    }));
  }

  static async update(id, name, content, variables = {}, mediaPath = null) {
    await database.run(
      'UPDATE messages SET name = ?, content = ?, variables = ?, media_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, content, JSON.stringify(variables), mediaPath, id]
    );
  }

  static async delete(id) {
    await database.run('DELETE FROM messages WHERE id = ?', [id]);
  }
}

module.exports = Message;