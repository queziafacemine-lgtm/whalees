# WhatsApp Bot Scheduler

Sistema de agendamento de mensagens para WhatsApp com interface web administrativa.

## 🚀 Funcionalidades

- ✅ Agendamento de mensagens individuais e em massa
- ✅ Interface web administrativa
- ✅ Sistema de autenticação
- ✅ Logs detalhados de envios
- ✅ Webhooks para notificações
- ✅ Sistema de retry automático
- ✅ Suporte a mensagens recorrentes
- ✅ Templates de mensagens personalizáveis

## 📋 Pré-requisitos

- Node.js 16+ 
- NPM ou Yarn
- Chrome/Chromium (para WhatsApp Web)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <seu-repositorio>
cd whatsapp-bot-scheduler
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**
```bash
npm run migrate
```

4. **Inicie o servidor**
```bash
npm start
```

5. **Acesse o painel administrativo**
```
http://localhost:3000/admin
```

## 🏗️ Configuração Inicial

1. **Primeiro acesso**: Acesse `/admin` para criar sua conta de administrador
2. **Conectar WhatsApp**: Use a interface para conectar suas sessões do WhatsApp
3. **Configurar Webhooks** (opcional): Configure URLs de webhook nas configurações

## 📁 Estrutura do Projeto

```
├── src/
│   └── index.js              # Servidor principal
├── routes/
│   ├── admin.js              # Rotas administrativas
│   └── settings.js           # Rotas de configurações
├── models/
│   ├── User.js               # Modelo de usuários
│   ├── Schedule.js           # Modelo de agendamentos
│   ├── Log.js                # Modelo de logs
│   └── Setting.js            # Modelo de configurações
├── middleware/
│   └── auth.js               # Middleware de autenticação
├── services/
│   └── JobProcessor.js       # Processador de jobs
├── public/
│   └── admin/                # Interface administrativa
├── database/
│   └── database.js           # Configuração do banco
└── scripts/
    └── migrate.js            # Script de migração
```

## 🔄 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                   # Inicia com nodemon
npm start                     # Inicia em produção
npm run migrate              # Executa migrações do banco
npm run setup               # Configura banco + instruções

# Produção com PM2
npm run pm2:start           # Inicia com PM2
npm run pm2:stop            # Para o processo
npm run pm2:restart         # Reinicia o processo
npm run pm2:logs            # Visualiza logs
```

## 🌐 API Endpoints

### Autenticação
- `POST /api/admin/setup` - Configuração inicial
- `POST /api/admin/login` - Login
- `POST /api/admin/logout` - Logout
- `GET /api/admin/me` - Dados do usuário logado

### Dashboard
- `GET /api/admin/dashboard` - Estatísticas gerais

### Agendamentos
- `GET /api/admin/schedules` - Listar agendamentos
- `POST /api/admin/schedules` - Criar agendamento
- `DELETE /api/admin/schedules/:id` - Deletar agendamento

### Logs
- `GET /api/admin/logs` - Listar logs

### Configurações
- `GET /api/settings` - Listar configurações
- `PUT /api/settings/:key` - Atualizar configuração
- `POST /api/settings/bulk` - Atualizar múltiplas configurações

## 🔧 Configurações do Sistema

### Webhook
Configure uma URL para receber notificações de status dos envios:

```json
{
  "scheduleId": "123",
  "sessao": "sessao1",
  "destino": "5511999999999",
  "mensagem": "Olá!",
  "status": "sent|failed",
  "whatsappMessageId": "msg_id",
  "timestamp": "2024-01-01T12:00:00Z",
  "tentativas": 1,
  "erro": null
}
```

### Retry System
- **Intervalos padrão**: 30s, 1min, 5min, 15min
- **Máximo de tentativas**: 3
- **Configurável** via interface administrativa

## 🚀 Deploy em Produção

### Com PM2 (Recomendado)

1. **Instale o PM2 globalmente**
```bash
npm install -g pm2
```

2. **Configure as variáveis de ambiente**
```bash
export NODE_ENV=production
export PORT=3000
```

3. **Inicie com PM2**
```bash
npm run pm2:start
```

4. **Configure auto-start no boot**
```bash
pm2 startup
pm2 save
```

### Com Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ Sessões seguras
- ✅ Middleware de autenticação
- ✅ Validação de entrada
- ✅ Rate limiting (recomendado para produção)

## 📊 Monitoramento

### Logs
- Logs de aplicação: `logs/`
- Logs do PM2: `logs/pm2-*.log`
- Logs de envio: `logs/log-envios.txt`

### Métricas
- Dashboard administrativo com estatísticas
- Logs detalhados de cada envio
- Status de agendamentos em tempo real

## 🐛 Troubleshooting

### Erro "JSON.parse: unexpected character"
- ✅ **Corrigido**: Rotas da API foram criadas
- Verifique se o servidor está rodando
- Confirme se as migrações foram executadas

### WhatsApp desconectando
- Mantenha o Chrome atualizado
- Evite usar o WhatsApp Web em outros lugares
- Monitore os logs para erros de conexão

### Performance
- Use PM2 para gerenciamento de processos
- Configure logs rotativos
- Monitore uso de memória

## 📝 Changelog

### v1.0.0
- ✅ Sistema de autenticação completo
- ✅ Interface administrativa funcional
- ✅ API REST completa
- ✅ Sistema de agendamentos
- ✅ Logs e monitoramento
- ✅ Webhooks
- ✅ Sistema de retry
- ✅ Configuração para produção

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através do email configurado no projeto.