const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { database } = require('../database/database');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Log = require('../models/Log');
const Setting = require('../models/Setting');
const whatsappService = require('../services/WhatsAppService');
const jobProcessor = require('../services/JobProcessor');

// Middleware de autenticação
const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Verificar se precisa de setup inicial
router.get('/setup-status', async (req, res) => {
  try {
    const userCount = await User.count();
    res.json({ setupRequired: userCount === 0 });
  } catch (error) {
    console.error('Erro ao verificar setup:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Setup inicial - criar primeiro usuário admin
router.post('/setup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    // Verificar se já existe usuário
    const userCount = await User.count();
    if (userCount > 0) {
      return res.status(400).json({ error: 'Setup já foi realizado' });
    }

    // Criar usuário admin
    const hashedPassword = await bcrypt.hash(password, 10);
    await database.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hashedPassword]
    );

    // Marcar setup como concluído
    await Setting.set('admin_created', 'true');

    res.json({ success: true, message: 'Admin criado com sucesso' });
  } catch (error) {
    console.error('Erro no setup:', error);
    res.status(500).json({ error: 'Erro ao criar admin' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    const user = await database.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Criar sessão
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username 
      } 
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ success: true });
  });
});

// Verificar usuário logado
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username
  });
});

// Dashboard - estatísticas gerais
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [
      totalSchedules,
      pendingSchedules,
      sentSchedules,
      failedSchedules,
      totalLogs,
      recentLogs
    ] = await Promise.all([
      database.get('SELECT COUNT(*) as count FROM schedules'),
      database.get('SELECT COUNT(*) as count FROM schedules WHERE status = "pending"'),
      database.get('SELECT COUNT(*) as count FROM schedules WHERE status = "sent"'),
      database.get('SELECT COUNT(*) as count FROM schedules WHERE status = "failed"'),
      database.get('SELECT COUNT(*) as count FROM logs'),
      database.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT 10')
    ]);

    res.json({
      totalSchedules: totalSchedules.count,
      pendingSchedules: pendingSchedules.count,
      sentSchedules: sentSchedules.count,
      failedSchedules: failedSchedules.count,
      totalLogs: totalLogs.count,
      recentLogs: recentLogs
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

// Sessões WhatsApp
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await whatsappService.getAllSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Erro ao carregar sessões:', error);
    res.status(500).json({ error: 'Erro ao carregar sessões' });
  }
});

// Inicializar sessão WhatsApp
router.post('/sessions/:sessionName/connect', requireAuth, async (req, res) => {
  try {
    const { sessionName } = req.params;
    await whatsappService.initializeSession(sessionName);
    res.json({ success: true, message: 'Sessão inicializada' });
  } catch (error) {
    console.error('Erro ao conectar sessão:', error);
    res.status(500).json({ error: 'Erro ao conectar sessão' });
  }
});

// Obter QR Code
router.get('/sessions/:sessionName/qr', requireAuth, (req, res) => {
  try {
    const { sessionName } = req.params;
    const qrCode = whatsappService.getQRCode(sessionName);
    
    if (!qrCode) {
      return res.status(404).json({ error: 'QR Code não disponível' });
    }

    res.json({ qrCode });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({ error: 'Erro ao obter QR Code' });
  }
});

// Desconectar sessão
router.post('/sessions/:sessionName/disconnect', requireAuth, async (req, res) => {
  try {
    const { sessionName } = req.params;
    await whatsappService.disconnectSession(sessionName);
    res.json({ success: true, message: 'Sessão desconectada' });
  } catch (error) {
    console.error('Erro ao desconectar sessão:', error);
    res.status(500).json({ error: 'Erro ao desconectar sessão' });
  }
});

// Reiniciar sessão
router.post('/sessions/:sessionName/restart', requireAuth, async (req, res) => {
  try {
    const { sessionName } = req.params;
    
    // Primeiro desconectar se estiver conectada
    await whatsappService.disconnectSession(sessionName);
    
    // Aguardar um pouco para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Limpar dados de autenticação
    await whatsappService.clearAuthData(sessionName);
    
    // Reconectar
    await whatsappService.initializeSession(sessionName);
    
    res.json({ success: true, message: 'Sessão reiniciada com sucesso' });
  } catch (error) {
    console.error('Erro ao reiniciar sessão:', error);
    res.status(500).json({ error: 'Erro ao reiniciar sessão' });
  }
});

// Agendamentos
router.get('/schedules', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const schedules = await Schedule.findAll({ page, limit, status });
    res.json({ schedules });
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao carregar agendamentos' });
  }
});

// Criar agendamento
router.post('/schedules', requireAuth, async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      created_by: req.user.id
    };

    const scheduleId = await Schedule.create(scheduleData);
    res.json({ success: true, scheduleId });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Deletar agendamento
router.delete('/schedules/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Schedule.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

// Executar agendamento imediatamente
router.post('/schedules/:id/execute', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await jobProcessor.executeScheduleNow(id);
    res.json({ success: true, message: 'Agendamento executado' });
  } catch (error) {
    console.error('Erro ao executar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;

    const logs = await Log.findAll({ page, limit, status });
    res.json({ logs });
  } catch (error) {
    console.error('Erro ao carregar logs:', error);
    res.status(500).json({ error: 'Erro ao carregar logs' });
  }
});

// Exportar logs CSV
router.get('/logs/export', requireAuth, async (req, res) => {
  try {
    const logs = await database.all(`
      SELECT 
        created_at,
        session_name,
        destination,
        status,
        attempts,
        error_message
      FROM logs 
      ORDER BY created_at DESC
    `);

    // Gerar CSV
    const csvHeader = 'Data,Sessão,Destino,Status,Tentativas,Erro\n';
    const csvRows = logs.map(log => {
      return [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.session_name,
        log.destination,
        log.status,
        log.attempts,
        (log.error_message || '').replace(/,/g, ';')
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    res.status(500).json({ error: 'Erro ao exportar logs' });
  }
});

// Configurações
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({ settings });
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
});

// Salvar configurações
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { webhook_url, max_attempts, retry_intervals } = req.body;

    if (webhook_url !== undefined) {
      await Setting.setWebhookUrl(webhook_url);
    }
    
    if (max_attempts !== undefined) {
      await Setting.setMaxAttempts(max_attempts);
    }
    
    if (retry_intervals !== undefined) {
      await Setting.setRetryIntervals(retry_intervals);
    }

    res.json({ success: true, message: 'Configurações salvas' });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Testar webhook
router.post('/test-webhook', requireAuth, async (req, res) => {
  try {
    const webhookUrl = await Setting.getWebhookUrl();
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'URL do webhook não configurada' });
    }

    // Enviar teste
    const axios = require('axios');
    const testData = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Teste de webhook do WhatsApp Bot'
      }
    };

    await axios.post(webhookUrl, testData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({ success: true, message: 'Webhook testado com sucesso' });
  } catch (error) {
    console.error('Erro ao testar webhook:', error);
    res.status(500).json({ 
      error: 'Erro ao testar webhook',
      details: error.message 
    });
  }
});

// Status do sistema
router.get('/status', requireAuth, (req, res) => {
  try {
    const sessions = whatsappService.getAllSessions();
    const jobStatus = jobProcessor.getStatus();

    res.json({
      sessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'connected').length,
      jobProcessor: jobStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Listar chats/grupos de uma sessão
router.get('/sessions/:sessionName/chats', requireAuth, async (req, res) => {
  try {
    const { sessionName } = req.params;

    // Verificar se sessão existe e está conectada
    const session = whatsappService.getSession(sessionName);
    if (!session || session.status !== 'connected') {
      return res.status(400).json({
        error: 'Sessão não está conectada',
        status: session ? session.status : 'not_found'
      });
    }

    // Obter chats da sessão
    const chats = await whatsappService.getChats(sessionName);

    res.json(chats);
  } catch (error) {
    console.error('Erro ao obter chats:', error);
    res.status(500).json({ error: 'Erro ao obter chats' });
  }
});

module.exports = router;