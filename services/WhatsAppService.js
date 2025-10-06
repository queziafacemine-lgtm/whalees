const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { database } = require('../database/database');

class WhatsAppService {
  constructor() {
    this.clients = new Map();
    this.qrCodes = new Map();
    this.sessionStatuses = new Map();
  }

  async initializeSession(sessionName = 'main') {
    try {
      console.log(`🔄 Inicializando sessão: ${sessionName}`);
      
      // Verificar se a sessão já existe
      if (this.clients.has(sessionName)) {
        console.log(`⚠️  Sessão ${sessionName} já existe`);
        const existingClient = this.clients.get(sessionName);
        const currentStatus = this.sessionStatuses.get(sessionName);
        
        // Se já está conectada, retornar
        if (currentStatus === 'connected') {
          return existingClient;
        }
        
        // Se está em processo de conexão, aguardar
        if (currentStatus === 'connecting' || currentStatus === 'qr_ready') {
          console.log(`⏳ Sessão ${sessionName} já está em processo de conexão`);
          return existingClient;
        }
        
        // Caso contrário, limpar e reconectar
        await this.disconnectSession(sessionName);
      }

      // Definir status inicial
      this.sessionStatuses.set(sessionName, 'connecting');
      await this.saveSessionStatus(sessionName, 'connecting');

      // Criar cliente WhatsApp
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionName,
          dataPath: path.join(__dirname, '../.wwebjs_auth')
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      });

      // Event listeners
      client.on('qr', (qr) => {
        console.log(`📱 QR Code gerado para sessão: ${sessionName}`);
        this.qrCodes.set(sessionName, qr);
        this.sessionStatuses.set(sessionName, 'qr_ready');
        
        // Salvar QR no banco
        this.saveSessionStatus(sessionName, 'qr_ready', qr);
        
        // Mostrar QR no terminal (opcional)
        console.log('QR Code disponível para escaneamento');
      });

      client.on('ready', () => {
        console.log(`✅ Sessão ${sessionName} conectada e pronta!`);
        this.sessionStatuses.set(sessionName, 'connected');
        this.qrCodes.delete(sessionName);
        
        // Salvar status no banco
        this.saveSessionStatus(sessionName, 'connected');
      });

      client.on('authenticated', () => {
        console.log(`🔐 Sessão ${sessionName} autenticada`);
        this.sessionStatuses.set(sessionName, 'authenticated');
        this.saveSessionStatus(sessionName, 'authenticated');
      });

      client.on('auth_failure', (msg) => {
        console.error(`❌ Falha na autenticação da sessão ${sessionName}:`, msg);
        this.sessionStatuses.set(sessionName, 'auth_failed');
        this.saveSessionStatus(sessionName, 'auth_failed');
        
        // Limpar cliente com falha
        this.clients.delete(sessionName);
        this.qrCodes.delete(sessionName);
      });

      client.on('disconnected', (reason) => {
        console.log(`🔌 Sessão ${sessionName} desconectada:`, reason);
        this.sessionStatuses.set(sessionName, 'disconnected');
        this.clients.delete(sessionName);
        this.qrCodes.delete(sessionName);
        this.saveSessionStatus(sessionName, 'disconnected');
      });

      client.on('message', async (message) => {
        // Log de mensagens recebidas (opcional)
        console.log(`📨 Mensagem recebida na sessão ${sessionName}:`, message.from, message.body?.substring(0, 50));
      });

      // Adicionar timeout para inicialização
      const initTimeout = setTimeout(() => {
        console.error(`⏰ Timeout na inicialização da sessão ${sessionName}`);
        this.sessionStatuses.set(sessionName, 'timeout');
        this.saveSessionStatus(sessionName, 'timeout');
        client.destroy();
      }, 60000); // 60 segundos

      // Limpar timeout quando conectar
      client.on('ready', () => {
        clearTimeout(initTimeout);
      });

      client.on('auth_failure', () => {
        clearTimeout(initTimeout);
      });

      // Inicializar cliente
      console.log(`🚀 Iniciando cliente WhatsApp para sessão: ${sessionName}`);
      await client.initialize();
      
      this.clients.set(sessionName, client);
      console.log(`✅ Cliente ${sessionName} inicializado com sucesso`);
      
      return client;
    } catch (error) {
      console.error(`❌ Erro ao inicializar sessão ${sessionName}:`, error);
      this.sessionStatuses.set(sessionName, 'error');
      this.saveSessionStatus(sessionName, 'error');
      
      // Limpar dados em caso de erro
      this.clients.delete(sessionName);
      this.qrCodes.delete(sessionName);
      
      throw error;
    }
  }

  async saveSessionStatus(sessionName, status, qrCode = null) {
    try {
      await database.run(`
        INSERT OR REPLACE INTO sessions (name, status, qr_code, updated_at) 
        VALUES (?, ?, ?, ?)
      `, [sessionName, status, qrCode, new Date().toISOString()]);
    } catch (error) {
      console.error('Erro ao salvar status da sessão:', error);
    }
  }

  async sendMessage(sessionName, destination, message, mediaPath = null) {
    try {
      const client = this.clients.get(sessionName);
      
      if (!client) {
        throw new Error(`Sessão ${sessionName} não encontrada`);
      }

      if (this.sessionStatuses.get(sessionName) !== 'connected') {
        throw new Error(`Sessão ${sessionName} não está conectada`);
      }

      // Formatar número
      const chatId = this.formatPhoneNumber(destination);
      
      let sentMessage;
      
      if (mediaPath && fs.existsSync(mediaPath)) {
        // Enviar com mídia
        const media = MessageMedia.fromFilePath(mediaPath);
        sentMessage = await client.sendMessage(chatId, media, { caption: message });
      } else {
        // Enviar apenas texto
        sentMessage = await client.sendMessage(chatId, message);
      }

      console.log(`✅ Mensagem enviada para ${destination} via ${sessionName}`);
      
      return {
        success: true,
        messageId: sentMessage.id._serialized,
        timestamp: sentMessage.timestamp
      };
      
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error);
      throw error;
    }
  }

  formatPhoneNumber(phone) {
    // Remove caracteres não numéricos
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return cleanPhone + '@c.us';
  }

  getSessionStatus(sessionName) {
    return this.sessionStatuses.get(sessionName) || 'disconnected';
  }

  getQRCode(sessionName) {
    return this.qrCodes.get(sessionName) || null;
  }

  async getAllSessions() {
    try {
      // Buscar sessões do banco de dados
      const dbSessions = await database.all('SELECT * FROM sessions ORDER BY updated_at DESC');
      
      // Combinar com sessões ativas na memória
      const sessions = [];
      
      // Se não há sessões no banco, criar uma sessão padrão
      if (dbSessions.length === 0) {
        sessions.push({
          name: 'main',
          status: 'disconnected',
          qrCode: null,
          isReady: false,
          lastUpdate: null
        });
      } else {
        // Processar sessões do banco
        for (const dbSession of dbSessions) {
          const liveClient = this.clients.get(dbSession.name);
          const liveStatus = this.sessionStatuses.get(dbSession.name);
          const qrCode = this.qrCodes.get(dbSession.name);
          
          sessions.push({
            name: dbSession.name,
            status: liveStatus || dbSession.status || 'disconnected',
            qrCode: qrCode || dbSession.qr_code || null,
            isReady: liveClient && liveClient.info ? true : false,
            lastUpdate: dbSession.updated_at
          });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Erro ao obter todas as sessões:', error);
      // Retornar sessão padrão em caso de erro
      return [{
        name: 'main',
        status: 'disconnected',
        qrCode: null,
        isReady: false,
        lastUpdate: null
      }];
    }
  }

  async disconnectSession(sessionName) {
    try {
      const client = this.clients.get(sessionName);
      if (client) {
        await client.destroy();
        this.clients.delete(sessionName);
        this.sessionStatuses.delete(sessionName);
        this.qrCodes.delete(sessionName);
        
        await this.saveSessionStatus(sessionName, 'disconnected');
        console.log(`🔌 Sessão ${sessionName} desconectada`);
      }
    } catch (error) {
      console.error(`Erro ao desconectar sessão ${sessionName}:`, error);
    }
  }

  async restartSession(sessionName) {
    await this.disconnectSession(sessionName);
    return await this.initializeSession(sessionName);
  }

  // Verificar se um número existe no WhatsApp
  async checkNumber(sessionName, phoneNumber) {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new Error(`Sessão ${sessionName} não encontrada`);
      }

      const chatId = this.formatPhoneNumber(phoneNumber);
      const isRegistered = await client.isRegisteredUser(chatId);
      
      return {
        exists: isRegistered,
        number: phoneNumber,
        chatId: chatId
      };
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      return { exists: false, error: error.message };
    }
  }

  // Obter informações do contato
  async getContactInfo(sessionName, phoneNumber) {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new Error(`Sessão ${sessionName} não encontrada`);
      }

      const chatId = this.formatPhoneNumber(phoneNumber);
      const contact = await client.getContactById(chatId);
      
      return {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || phoneNumber,
        number: contact.number,
        isMyContact: contact.isMyContact,
        profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
      };
    } catch (error) {
      console.error('Erro ao obter info do contato:', error);
      return null;
    }
  }

  // Limpar dados de autenticação
  async clearAuthData(sessionName) {
    try {
      const authPath = path.join(__dirname, '../.wwebjs_auth', `session-${sessionName}`);
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`🗑️  Dados de autenticação da sessão ${sessionName} removidos`);
      }
    } catch (error) {
      console.error('Erro ao limpar dados de auth:', error);
    }
  }

  // Obter sessão específica
  getSession(sessionName) {
    const client = this.clients.get(sessionName);
    if (!client) {
      return null;
    }

    const status = this.sessionStatuses.get(sessionName) || 'disconnected';
    const qrCode = this.qrCodes.get(sessionName);

    return {
      name: sessionName,
      status,
      qrCode,
      client,
      isReady: status === 'connected'
    };
  }

  // Obter chats/grupos de uma sessão
  async getChats(sessionName) {
    try {
      const client = this.clients.get(sessionName);
      if (!client) {
        throw new Error(`Sessão ${sessionName} não encontrada`);
      }

      const status = this.sessionStatuses.get(sessionName);
      if (status !== 'connected') {
        throw new Error(`Sessão ${sessionName} não está conectada`);
      }

      // Obter todos os chats
      const chats = await client.getChats();

      // Formatar dados dos chats
      const formattedChats = chats.map(chat => ({
        id: chat.id._serialized,
        nome: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp
      }));

      return formattedChats;
    } catch (error) {
      console.error(`Erro ao obter chats da sessão ${sessionName}:`, error);
      throw error;
    }
  }
}

// Instância singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;