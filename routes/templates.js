const express = require('express');
const router = express.Router();
const { database } = require('../database/database');

// Listar todos os templates
router.get('/', async (req, res) => {
  try {
    const templates = await database.all('SELECT * FROM templates ORDER BY created_at DESC');

    const parsedTemplates = templates.map(template => ({
      ...template,
      variables: JSON.parse(template.variables)
    }));

    res.json({ templates: parsedTemplates });
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro ao listar templates' });
  }
});

// Obter template específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await database.get('SELECT * FROM templates WHERE id = ?', [id]);

    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.json({
      template: {
        ...template,
        variables: JSON.parse(template.variables)
      }
    });
  } catch (error) {
    console.error('Erro ao obter template:', error);
    res.status(500).json({ error: 'Erro ao obter template' });
  }
});

// Criar novo template
router.post('/', async (req, res) => {
  try {
    const { name, variables } = req.body;

    if (!name || !variables || !Array.isArray(variables)) {
      return res.status(400).json({
        error: 'Nome e variáveis são obrigatórios'
      });
    }

    const variablesJson = JSON.stringify(variables);

    const result = await database.run(
      'INSERT INTO templates (name, variables) VALUES (?, ?)',
      [name, variablesJson]
    );

    res.json({
      success: true,
      templateId: result.id,
      message: 'Template criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar template:', error);

    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Já existe um template com este nome' });
    }

    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// Atualizar template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, variables } = req.body;

    if (!name || !variables || !Array.isArray(variables)) {
      return res.status(400).json({
        error: 'Nome e variáveis são obrigatórios'
      });
    }

    const variablesJson = JSON.stringify(variables);

    const result = await database.run(
      'UPDATE templates SET name = ?, variables = ?, updated_at = ? WHERE id = ?',
      [name, variablesJson, new Date().toISOString(), id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.json({
      success: true,
      message: 'Template atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);

    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Já existe um template com este nome' });
    }

    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// Deletar template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.run('DELETE FROM templates WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.json({
      success: true,
      message: 'Template deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar template:', error);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

// Processar variáveis de um template
router.post('/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { count = 1 } = req.body;

    const template = await database.get('SELECT * FROM templates WHERE id = ?', [id]);

    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const variables = JSON.parse(template.variables);
    const results = [];

    for (let i = 0; i < count; i++) {
      const processed = {};

      variables.forEach(variable => {
        const randomValue = variable.values[Math.floor(Math.random() * variable.values.length)];
        processed[variable.key] = randomValue;
      });

      results.push(processed);
    }

    res.json({
      template: template.name,
      variables: results
    });
  } catch (error) {
    console.error('Erro ao processar template:', error);
    res.status(500).json({ error: 'Erro ao processar template' });
  }
});

module.exports = router;
