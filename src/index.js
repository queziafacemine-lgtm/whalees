const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { initializeDatabase } = require('../database/database');
const whatsappService = require('../services/WhatsAppService');
const jobProcessor = require('../services/JobProcessor');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sessões
app.use(session({
  secret: 'whatsapp-bot-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true apenas para HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Importar rotas
const adminRoutes = require('../routes/admin');
const apiRoutes = require('../routes/api');
const templatesRoutes = require('../routes/templates');

// Rotas da API (devem vir antes do static para não serem interceptadas)
app.use('/api/admin', adminRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api', apiRoutes);

// Rota principal - redirecionar para login ou dashboard
app.get('/', (req, res) => {
    if (req.session.userId) {
        // Se já estiver logado, redirecionar para o dashboard
        res.redirect('/admin/dashboard');
    } else {
        // Se não estiver logado, redirecionar para a página de login
        res.redirect('/admin');
    }
});

// Rota para o painel admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin', 'index.html'));
});

// Rota para o dashboard admin
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'admin', 'dashboard.html'));
});

// Servir arquivos estáticos (deve vir após as rotas específicas)
app.use(express.static(path.join(__dirname, '../public')));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Função para inicializar serviços
async function initializeServices() {
    try {
        console.log('🔄 Inicializando serviços...');
        
        // Inicializar banco de dados
        await initializeDatabase();
        console.log('✅ Banco de dados inicializado');
        
        // Inicializar sessão principal do WhatsApp (opcional)
        // await whatsappService.initializeSession('main');
        console.log('📱 Serviço WhatsApp pronto');
        
        // Inicializar processador de jobs
        jobProcessor.start();
        console.log('⚙️  Processador de jobs iniciado');
        
        console.log('🎉 Todos os serviços inicializados com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar serviços:', error);
        throw error;
    }
}

// Função para parar serviços graciosamente
async function stopServices() {
    try {
        console.log('🛑 Parando serviços...');
        
        // Parar processador de jobs
        jobProcessor.stop();
        
        // Desconectar todas as sessões WhatsApp
        const sessions = whatsappService.getAllSessions();
        for (const session of sessions) {
            await whatsappService.disconnectSession(session.name);
        }
        
        console.log('✅ Serviços parados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao parar serviços:', error);
    }
}

// Inicializar banco de dados e servidor
async function startServer() {
    try {
        // Inicializar serviços
        await initializeServices();
        
        // Iniciar servidor
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ========================================');
            console.log('📱 WHATSAPP BOT AGENDADOR INICIADO!');
            console.log('🚀 ========================================');
            console.log(`🌐 Servidor rodando na porta ${PORT}`);
            console.log(`📱 Aplicação: http://localhost:${PORT}`);
            console.log(`⚙️  Admin: http://localhost:${PORT}/admin`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/admin/dashboard`);
            console.log('🚀 ========================================');
            console.log('');
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('📡 Recebido SIGTERM, parando servidor...');
            await stopServices();
            server.close(() => {
                console.log('✅ Servidor parado');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            console.log('📡 Recebido SIGINT, parando servidor...');
            await stopServices();
            server.close(() => {
                console.log('✅ Servidor parado');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Erro ao inicializar o servidor:', error);
        process.exit(1);
    }
}

// Iniciar aplicação
startServer();