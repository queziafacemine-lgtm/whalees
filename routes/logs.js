const express = require('express');
const Log = require('../models/Log');
const router = express.Router();

// Listar logs com paginação e filtros
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      session 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let logs;
    let totalCount;

    if (status) {
      logs = await Log.findByStatus(status, parseInt(limit), offset);
      totalCount = await Log.countByStatus(status);
    } else if (session) {
      logs = await Log.findBySession(session, parseInt(limit), offset);
      // Para sessão específica, usar contagem geral por simplicidade
      totalCount = await Log.count();
    } else {
      logs = await Log.findAll(parseInt(limit), offset);
      totalCount = await Log.count();
    }

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar logs em CSV
router.get('/export', async (req, res) => {
  try {
    const { status, session } = req.query;
    let logs;

    if (status) {
      logs = await Log.findByStatus(status, 10000, 0); // Limite alto para exportação
    } else if (session) {
      logs = await Log.findBySession(session, 10000, 0);
    } else {
      logs = await Log.findAll(10000, 0);
    }

    // Gerar CSV
    const csvHeader = 'ID,Data,Sessão,Destino,Status,Tentativas,ID WhatsApp,Erro\n';
    const csvRows = logs.map(log => {
      const date = new Date(log.created_at).toLocaleString('pt-BR');
      const messagePreview = log.message_content ? 
        log.message_content.substring(0, 50).replace(/"/g, '""') : '';
      
      return [
        log.id,
        `"${date}"`,
        `"${log.session_name}"`,
        `"${log.destination}"`,
        `"${log.status}"`,
        log.attempts,
        `"${log.whatsapp_message_id || ''}"`,
        `"${log.error_message || ''}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas dos logs
router.get('/stats', async (req, res) => {
  try {
    const totalLogs = await Log.count();
    const sentCount = await Log.countByStatus('sent');
    const failedCount = await Log.countByStatus('failed');

    res.json({
      total: totalLogs,
      sent: sentCount,
      failed: failedCount,
      successRate: totalLogs > 0 ? ((sentCount / totalLogs) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;