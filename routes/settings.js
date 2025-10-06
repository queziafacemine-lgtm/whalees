const express = require('express');
const Setting = require('../models/Setting');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Buscar todas as configurações
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar configuração específica
router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await Setting.get(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({ key, value });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configuração
router.put('/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    await Setting.set(key, value);
    res.json({ 
      success: true, 
      message: 'Configuração atualizada com sucesso',
      key,
      value 
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar múltiplas configurações
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings deve ser um objeto' });
    }

    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      await Setting.set(key, value);
      results.push({ key, value });
    }

    res.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso',
      updated: results
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar configuração
router.delete('/:key', authMiddleware, async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await Setting.delete(key);

    if (!deleted) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({ 
      success: true, 
      message: 'Configuração deletada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao deletar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurações específicas do sistema
router.get('/system/webhook', authMiddleware, async (req, res) => {
  try {
    const webhookUrl = await Setting.getWebhookUrl();
    res.json({ webhookUrl });
  } catch (error) {
    console.error('Erro ao buscar webhook URL:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/system/webhook', authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    await Setting.setWebhookUrl(url);
    res.json({ 
      success: true, 
      message: 'Webhook URL atualizada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar webhook URL:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/system/retry-intervals', authMiddleware, async (req, res) => {
  try {
    const intervals = await Setting.getRetryIntervals();
    res.json({ retryIntervals: intervals });
  } catch (error) {
    console.error('Erro ao buscar intervalos de retry:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/system/retry-intervals', authMiddleware, async (req, res) => {
  try {
    const { intervals } = req.body;
    
    if (!Array.isArray(intervals)) {
      return res.status(400).json({ error: 'Intervals deve ser um array' });
    }

    await Setting.setRetryIntervals(intervals);
    res.json({ 
      success: true, 
      message: 'Intervalos de retry atualizados com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar intervalos de retry:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/system/max-attempts', authMiddleware, async (req, res) => {
  try {
    const maxAttempts = await Setting.getMaxAttempts();
    res.json({ maxAttempts });
  } catch (error) {
    console.error('Erro ao buscar máximo de tentativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/system/max-attempts', authMiddleware, async (req, res) => {
  try {
    const { maxAttempts } = req.body;
    
    if (typeof maxAttempts !== 'number' || maxAttempts < 1) {
      return res.status(400).json({ error: 'maxAttempts deve ser um número maior que 0' });
    }

    await Setting.setMaxAttempts(maxAttempts);
    res.json({ 
      success: true, 
      message: 'Máximo de tentativas atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar máximo de tentativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;