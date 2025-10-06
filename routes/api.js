const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { database } = require('../database/database');
const whatsappService = require('../services/WhatsAppService');
const Schedule = require('../models/Schedule');
const Log = require('../models/Log');

// Obter status das sessões
router.get('/sessions/status', async (req, res) => {
  try {
    const sessions = whatsappService.getAllSessions();
    const dbSessions = await database.all('SELECT * FROM sessions ORDER BY updated_at DESC');
    
    // Se não há sessões no banco, criar sessão principal
    if (dbSessions.length === 0) {
      await database.run(`
        INSERT INTO sessions (name, status, created_at, updated_at) 
        VALUES ('main', 'disconnected', ?, ?)
      `, [new Date().toISOString(), new Date().toISOString()]);
      
      dbSessions.push({
        name: 'main',
        status: 'disconnected',
        qr_code: null
      });
    }

    // Combinar dados
    const combinedSessions = dbSessions.map(dbSession => {
      const liveSession = sessions.find(s => s.name === dbSession.name);
      return {
        name: dbSession.name,
        status: liveSession ? liveSession.status : dbSession.status,
        qrCode: liveSession ? liveSession.qrCode : dbSession.qr_code,
        isActive: !!liveSession,
        lastUpdate: dbSession.updated_at
      };
    });

    res.json({ sessions: combinedSessions });
  } catch (error) {
    console.error('Erro ao obter status das sessões:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Conectar sessão WhatsApp
router.post('/sessions/:sessionName/connect', async (req, res) => {
  try {
    const { sessionName } = req.params;
    
    // Inicializar sessão
    await whatsappService.initializeSession(sessionName);
    
    res.json({ 
      success: true, 
      message: `Sessão ${sessionName} inicializada. Aguarde o QR Code.` 
    });
  } catch (error) {
    console.error('Erro ao conectar sessão:', error);
    res.status(500).json({ error: 'Erro ao conectar sessão' });
  }
});

// Obter QR Code
router.get('/sessions/:sessionName/qr', async (req, res) => {
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

// Listar sessões disponíveis para agendamento
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await whatsappService.getAllSessions();

    if (!Array.isArray(sessions)) {
      console.error('getAllSessions não retornou um array:', sessions);
      return res.json({ sessions: [] });
    }

    const availableSessions = sessions.map(session => ({
      name: session.name,
      status: session.status,
      available: session.status === 'connected'
    }));

    res.json({ sessions: availableSessions });
  } catch (error) {
    console.error('Erro ao listar sessões:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar agendamento
router.post('/schedules', async (req, res) => {
  try {
    const {
      sessao: session_name,
      destino: destination,
      mensagem: message,
      tipoAgendamento: schedule_type,
      enviarEm: send_at,
      intervaloDias: interval_days,
      grupos
    } = req.body;

    // Validações básicas
    if (!session_name || !message || !send_at) {
      return res.status(400).json({ 
        error: 'Sessão, mensagem e data de envio são obrigatórios' 
      });
    }

    // Se não tem destino individual, deve ter grupos
    if (!destination && (!grupos || grupos.length === 0)) {
      return res.status(400).json({ 
        error: 'Destino ou grupos são obrigatórios' 
      });
    }

    const schedules = [];

    // Criar agendamentos individuais
    if (destination) {
      const scheduleData = {
        session_name,
        destination,
        custom_message: message,
        schedule_type: schedule_type === 'recorrente' ? 'recurring' : 'once',
        send_at,
        interval_days: schedule_type === 'recorrente' ? parseInt(interval_days) || 1 : null
      };

      const scheduleId = await database.run(`
        INSERT INTO schedules (
          session_name, destination, custom_message, schedule_type, 
          send_at, interval_days, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `, [
        scheduleData.session_name,
        scheduleData.destination,
        scheduleData.custom_message,
        scheduleData.schedule_type,
        scheduleData.send_at,
        scheduleData.interval_days,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      schedules.push(scheduleId.id);
    }

    // Criar agendamentos para grupos
    if (grupos && grupos.length > 0) {
      for (const grupo of grupos) {
        const scheduleData = {
          session_name,
          destination: grupo,
          custom_message: message,
          schedule_type: schedule_type === 'recorrente' ? 'recurring' : 'once',
          send_at,
          interval_days: schedule_type === 'recorrente' ? parseInt(interval_days) || 1 : null
        };

        const scheduleId = await database.run(`
          INSERT INTO schedules (
            session_name, destination, custom_message, schedule_type, 
            send_at, interval_days, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
          scheduleData.session_name,
          scheduleData.destination,
          scheduleData.custom_message,
          scheduleData.schedule_type,
          scheduleData.send_at,
          scheduleData.interval_days,
          new Date().toISOString(),
          new Date().toISOString()
        ]);

        schedules.push(scheduleId.id);
      }
    }

    res.json({ 
      success: true, 
      message: `${schedules.length} agendamento(s) criado(s) com sucesso`,
      scheduleIds: schedules
    });

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Listar agendamentos
router.get('/schedules', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const schedules = await database.all(`
      SELECT * FROM schedules 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const total = await database.get('SELECT COUNT(*) as count FROM schedules');

    res.json({
      schedules,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Obter agendamento específico
router.get('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await database.get('SELECT * FROM schedules WHERE id = ?', [id]);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Erro ao obter agendamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar agendamento
router.delete('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.run('DELETE FROM schedules WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ success: true, message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

// Editar agendamento
router.put('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sessao: session_name,
      destino: destination,
      mensagem: message,
      tipoAgendamento: schedule_type,
      enviarEm: send_at,
      intervaloDias: interval_days
    } = req.body;

    // Verificar se agendamento existe
    const existingSchedule = await database.get('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Não permitir edição se já foi enviado
    if (existingSchedule.status === 'sent') {
      return res.status(400).json({ error: 'Não é possível editar agendamento já enviado' });
    }

    await database.run(`
      UPDATE schedules 
      SET session_name = ?, destination = ?, custom_message = ?, 
          schedule_type = ?, send_at = ?, interval_days = ?, 
          updated_at = ?
      WHERE id = ?
    `, [
      session_name,
      destination,
      message,
      schedule_type === 'recorrente' ? 'recurring' : 'once',
      send_at,
      schedule_type === 'recorrente' ? parseInt(interval_days) || 1 : null,
      new Date().toISOString(),
      id
    ]);

    res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao editar agendamento:', error);
    res.status(500).json({ error: 'Erro ao editar agendamento' });
  }
});

// Obter logs recentes
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await database.all(`
      SELECT * FROM logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit]);

    res.json({ logs });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Obter grupos disponíveis
router.get('/groups', async (req, res) => {
  try {
    // Carregar grupos dos arquivos JSON
    const fs = require('fs');
    const path = require('path');
    
    const groups = [];
    const groupFiles = ['grupos_rj.json', 'grupos_sp.json', 'grupos_vagas.json'];
    
    for (const file of groupFiles) {
      try {
        const filePath = path.join(__dirname, '../grupos', file);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const groupData = JSON.parse(fileContent);
          
          if (Array.isArray(groupData)) {
            groups.push(...groupData.map(group => ({
              ...group,
              category: file.replace('.json', '').replace('grupos_', '')
            })));
          }
        }
      } catch (error) {
        console.error(`Erro ao carregar ${file}:`, error);
      }
    }

    res.json({ groups });
  } catch (error) {
    console.error('Erro ao obter grupos:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Obter categorias de mensagens
router.get('/message-categories', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const categories = [];
    const messageFiles = ['noticias.json', 'vagas.json', 'vagas_sp.json'];
    
    for (const file of messageFiles) {
      try {
        const filePath = path.join(__dirname, '../public/mensagens', file);
        if (fs.existsSync(filePath)) {
          const category = file.replace('.json', '');
          categories.push({
            id: category,
            name: category.charAt(0).toUpperCase() + category.slice(1),
            file: file
          });
        }
      } catch (error) {
        console.error(`Erro ao verificar ${file}:`, error);
      }
    }

    res.json({ categories });
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Obter mensagens de uma categoria
router.get('/messages/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, '../public/mensagens', `${category}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const messages = JSON.parse(fileContent);

    res.json({ messages });
  } catch (error) {
    console.error('Erro ao obter mensagens:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Testar envio de mensagem
router.post('/test-message', async (req, res) => {
  try {
    const { sessionName, destination, message } = req.body;

    if (!sessionName || !destination || !message) {
      return res.status(400).json({ 
        error: 'Sessão, destino e mensagem são obrigatórios' 
      });
    }

    const result = await whatsappService.sendMessage(sessionName, destination, message);
    
    if (result.success) {
      // Criar log do teste
      await Log.create({
        session_name: sessionName,
        destination: destination,
        message_content: message,
        status: 'sent',
        attempts: 1,
        whatsapp_message_id: result.messageId
      });

      res.json({ 
        success: true, 
        message: 'Mensagem de teste enviada com sucesso',
        messageId: result.messageId
      });
    } else {
      throw new Error('Falha no envio');
    }

  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar categorias de mensagens disponíveis
router.get('/mensagens', async (req, res) => {
  try {
    const mensagensDir = path.join(__dirname, '../public/mensagens');
    const files = await fs.readdir(mensagensDir);

    // Filtrar apenas arquivos JSON
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Extrair nomes de categorias (remover .json)
    const categories = jsonFiles.map(file => file.replace('.json', ''));

    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Obter mensagem de uma categoria específica
router.get('/mensagens/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const filePath = path.join(__dirname, '../public/mensagens', `${categoria}.json`);

    // Verificar se arquivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Ler arquivo
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Se houver múltiplas mensagens, escolher uma aleatória
    let mensagem = '';
    if (data.mensagens && Array.isArray(data.mensagens)) {
      const randomIndex = Math.floor(Math.random() * data.mensagens.length);
      mensagem = data.mensagens[randomIndex];
    } else if (data.mensagem) {
      mensagem = data.mensagem;
    }

    // Substituir variáveis
    if (data.variaveis) {
      Object.keys(data.variaveis).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        mensagem = mensagem.replace(regex, data.variaveis[key]);
      });
    }

    // Substituir variáveis de data/hora
    const now = new Date();
    mensagem = mensagem.replace(/{{data_hoje}}/g, now.toLocaleDateString('pt-BR'));
    mensagem = mensagem.replace(/{{hora}}/g, now.toLocaleTimeString('pt-BR'));
    mensagem = mensagem.replace(/{{dia_semana}}/g, now.toLocaleDateString('pt-BR', { weekday: 'long' }));

    res.json({
      categoria,
      mensagem,
      variaveis: data.variaveis || {}
    });
  } catch (error) {
    console.error('Erro ao obter mensagem:', error);
    res.status(500).json({ error: 'Erro ao obter mensagem' });
  }
});

module.exports = router;