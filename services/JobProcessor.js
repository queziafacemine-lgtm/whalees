const cron = require('node-cron');
const { database } = require('../database/database');
const whatsappService = require('./WhatsAppService');
const Log = require('../models/Log');
const Setting = require('../models/Setting');

class JobProcessor {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Job processor já está rodando');
      return;
    }

    console.log('🚀 Iniciando processador de jobs...');
    
    // Executar a cada minuto
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledMessages();
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    this.isRunning = true;
    console.log('✅ Job processor iniciado');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Job processor parado');
  }

  async processScheduledMessages() {
    try {
      // Buscar mensagens pendentes que devem ser enviadas agora
      const now = new Date().toISOString();
      const pendingSchedules = await database.all(`
        SELECT * FROM schedules 
        WHERE status = 'pending' 
        AND send_at <= ? 
        ORDER BY send_at ASC
        LIMIT 50
      `, [now]);

      if (pendingSchedules.length === 0) {
        return;
      }

      console.log(`📋 Processando ${pendingSchedules.length} agendamentos...`);

      for (const schedule of pendingSchedules) {
        await this.processSchedule(schedule);
      }

    } catch (error) {
      console.error('❌ Erro no processador de jobs:', error);
    }
  }

  async processSchedule(schedule) {
    try {
      console.log(`📤 Processando agendamento ID: ${schedule.id}`);

      // Marcar como processando
      await database.run(
        'UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?',
        ['processing', new Date().toISOString(), schedule.id]
      );

      // Determinar a mensagem a ser enviada
      let messageContent = schedule.custom_message;
      
      if (schedule.message_id) {
        const messageTemplate = await database.get(
          'SELECT * FROM messages WHERE id = ?', 
          [schedule.message_id]
        );
        
        if (messageTemplate) {
          messageContent = messageTemplate.content;
          
          // Processar variáveis se existirem
          if (messageTemplate.variables) {
            const variables = JSON.parse(messageTemplate.variables);
            messageContent = this.processMessageVariables(messageContent, variables);
          }
        }
      }

      if (!messageContent) {
        throw new Error('Conteúdo da mensagem não encontrado');
      }

      // Enviar mensagem
      const result = await whatsappService.sendMessage(
        schedule.session_name,
        schedule.destination,
        messageContent
      );

      if (result.success) {
        // Sucesso - atualizar status
        await database.run(`
          UPDATE schedules 
          SET status = 'sent', 
              whatsapp_message_id = ?, 
              attempts = attempts + 1,
              last_attempt = ?,
              updated_at = ?
          WHERE id = ?
        `, [
          result.messageId, 
          new Date().toISOString(),
          new Date().toISOString(),
          schedule.id
        ]);

        // Criar log de sucesso
        await Log.create({
          schedule_id: schedule.id,
          session_name: schedule.session_name,
          destination: schedule.destination,
          message_content: messageContent,
          status: 'sent',
          attempts: schedule.attempts + 1,
          whatsapp_message_id: result.messageId
        });

        console.log(`✅ Mensagem enviada com sucesso - ID: ${schedule.id}`);

        // Se for recorrente, criar próximo agendamento
        if (schedule.schedule_type === 'recurring' && schedule.interval_days) {
          await this.createNextRecurringSchedule(schedule);
        }

      } else {
        throw new Error('Falha no envio da mensagem');
      }

    } catch (error) {
      console.error(`❌ Erro ao processar agendamento ${schedule.id}:`, error);
      await this.handleScheduleError(schedule, error.message);
    }
  }

  async handleScheduleError(schedule, errorMessage) {
    try {
      const maxAttempts = await Setting.getMaxAttempts();
      const newAttempts = schedule.attempts + 1;

      if (newAttempts >= maxAttempts) {
        // Máximo de tentativas atingido - marcar como falhou
        await database.run(`
          UPDATE schedules 
          SET status = 'failed', 
              error_message = ?,
              attempts = ?,
              last_attempt = ?,
              updated_at = ?
          WHERE id = ?
        `, [
          errorMessage,
          newAttempts,
          new Date().toISOString(),
          new Date().toISOString(),
          schedule.id
        ]);

        // Criar log de falha
        await Log.create({
          schedule_id: schedule.id,
          session_name: schedule.session_name,
          destination: schedule.destination,
          message_content: schedule.custom_message || 'Mensagem template',
          status: 'failed',
          attempts: newAttempts,
          error_message: errorMessage
        });

        console.log(`❌ Agendamento ${schedule.id} falhou após ${newAttempts} tentativas`);

      } else {
        // Reagendar para nova tentativa
        const retryIntervals = await Setting.getRetryIntervals();
        const retryDelay = retryIntervals[newAttempts - 1] || 300; // 5 minutos padrão
        
        const nextAttempt = new Date();
        nextAttempt.setSeconds(nextAttempt.getSeconds() + retryDelay);

        await database.run(`
          UPDATE schedules 
          SET status = 'pending',
              send_at = ?,
              error_message = ?,
              attempts = ?,
              last_attempt = ?,
              updated_at = ?
          WHERE id = ?
        `, [
          nextAttempt.toISOString(),
          errorMessage,
          newAttempts,
          new Date().toISOString(),
          new Date().toISOString(),
          schedule.id
        ]);

        console.log(`🔄 Agendamento ${schedule.id} reagendado para ${nextAttempt.toLocaleString('pt-BR')} (tentativa ${newAttempts})`);
      }

    } catch (error) {
      console.error('Erro ao tratar falha do agendamento:', error);
    }
  }

  async createNextRecurringSchedule(originalSchedule) {
    try {
      const nextSendDate = new Date(originalSchedule.send_at);
      nextSendDate.setDate(nextSendDate.getDate() + originalSchedule.interval_days);

      await database.run(`
        INSERT INTO schedules (
          session_name, destination, message_id, custom_message,
          schedule_type, send_at, interval_days, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `, [
        originalSchedule.session_name,
        originalSchedule.destination,
        originalSchedule.message_id,
        originalSchedule.custom_message,
        'recurring',
        nextSendDate.toISOString(),
        originalSchedule.interval_days,
        new Date().toISOString()
      ]);

      console.log(`🔄 Próximo agendamento recorrente criado para ${nextSendDate.toLocaleString('pt-BR')}`);

    } catch (error) {
      console.error('Erro ao criar próximo agendamento recorrente:', error);
    }
  }

  processMessageVariables(message, variables) {
    let processedMessage = message;
    
    // Variáveis padrão
    const defaultVars = {
      '{data}': new Date().toLocaleDateString('pt-BR'),
      '{hora}': new Date().toLocaleTimeString('pt-BR'),
      '{dia_semana}': new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
    };

    // Aplicar variáveis padrão
    for (const [key, value] of Object.entries(defaultVars)) {
      processedMessage = processedMessage.replace(new RegExp(key, 'g'), value);
    }

    // Aplicar variáveis customizadas
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
    }

    return processedMessage;
  }

  // Executar agendamento específico imediatamente
  async executeScheduleNow(scheduleId) {
    try {
      const schedule = await database.get('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
      
      if (!schedule) {
        throw new Error('Agendamento não encontrado');
      }

      if (schedule.status !== 'pending') {
        throw new Error('Agendamento não está pendente');
      }

      await this.processSchedule(schedule);
      return true;

    } catch (error) {
      console.error(`Erro ao executar agendamento ${scheduleId}:`, error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDate() : null
    };
  }
}

// Instância singleton
const jobProcessor = new JobProcessor();

module.exports = jobProcessor;