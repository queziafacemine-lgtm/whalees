const express = require('express');
const Schedule = require('../models/Schedule');
const Message = require('../models/Message');
const router = express.Router();

// Listar todos os agendamentos
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.findAll();
    res.json(schedules);
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter agendamento por ID
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json(schedule);
  } catch (error) {
    console.error('Erro ao obter agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    const { 
      sessionName, 
      destination, 
      messageId, 
      customMessage, 
      scheduleType, 
      sendAt, 
      intervalDays 
    } = req.body;

    // Validações
    if (!sessionName || !destination || !scheduleType || !sendAt) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: sessionName, destination, scheduleType, sendAt' 
      });
    }

    if (!messageId && !customMessage) {
      return res.status(400).json({ 
        error: 'É necessário especificar messageId ou customMessage' 
      });
    }

    if (scheduleType === 'recurring' && (!intervalDays || intervalDays < 1)) {
      return res.status(400).json({ 
        error: 'Para agendamento recorrente, intervalDays deve ser >= 1' 
      });
    }

    // Verificar se a mensagem existe (se messageId foi fornecido)
    if (messageId) {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(400).json({ error: 'Mensagem não encontrada' });
      }
    }

    // Validar formato da data
    const sendAtDate = new Date(sendAt);
    if (isNaN(sendAtDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido' });
    }

    const scheduleId = await Schedule.create(
      sessionName,
      destination,
      messageId || null,
      customMessage || '',
      scheduleType,
      sendAt,
      scheduleType === 'recurring' ? parseInt(intervalDays) : null
    );

    const newSchedule = await Schedule.findById(scheduleId);
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento
router.put('/:id', async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { 
      sessionName, 
      destination, 
      messageId, 
      customMessage, 
      scheduleType, 
      sendAt, 
      intervalDays 
    } = req.body;

    const existingSchedule = await Schedule.findById(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Validações
    if (!sessionName || !destination || !scheduleType || !sendAt) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: sessionName, destination, scheduleType, sendAt' 
      });
    }

    if (!messageId && !customMessage) {
      return res.status(400).json({ 
        error: 'É necessário especificar messageId ou customMessage' 
      });
    }

    if (scheduleType === 'recurring' && (!intervalDays || intervalDays < 1)) {
      return res.status(400).json({ 
        error: 'Para agendamento recorrente, intervalDays deve ser >= 1' 
      });
    }

    // Verificar se a mensagem existe (se messageId foi fornecido)
    if (messageId) {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(400).json({ error: 'Mensagem não encontrada' });
      }
    }

    // Validar formato da data
    const sendAtDate = new Date(sendAt);
    if (isNaN(sendAtDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido' });
    }

    await Schedule.update(
      scheduleId,
      sessionName,
      destination,
      messageId || null,
      customMessage || '',
      scheduleType,
      sendAt,
      scheduleType === 'recurring' ? parseInt(intervalDays) : null
    );

    const updatedSchedule = await Schedule.findById(scheduleId);
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agendamento
router.delete('/:id', async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const schedule = await Schedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    await Schedule.delete(scheduleId);
    res.json({ success: true, message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Executar agendamento imediatamente
router.post('/:id/execute', async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const schedule = await Schedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Atualizar para executar agora
    const now = new Date().toISOString();
    await Schedule.reschedule(scheduleId, now);

    res.json({ success: true, message: 'Agendamento marcado para execução imediata' });
  } catch (error) {
    console.error('Erro ao executar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;