# 🚀 Guia de Instalação Completo - WhatsApp Bot

Este guia detalha todo o processo de instalação e configuração do WhatsApp Bot do zero.

## 📋 Pré-requisitos Detalhados

### 1. Node.js
- **Versão mínima**: 16.x
- **Versão recomendada**: 18.x ou superior

#### Windows
1. Baixe o instalador em https://nodejs.org
2. Execute o instalador e siga as instruções
3. Verifique a instalação:
```cmd
node --version
npm --version
```

#### Linux (Ubuntu/Debian)
```bash
# Atualizar repositórios
sudo apt update

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

#### macOS
```bash
# Com Homebrew
brew install node

# Verificar instalação
node --version
npm --version
```

### 2. Git (opcional, para clonar repositório)
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Windows: baixar de https://git-scm.com
```

## 📦 Instalação Passo-a-Passo

### Passo 1: Obter o Código
```bash
# Se usando Git
git clone <url-do-repositorio>
cd whatsapp-bot

# Ou extrair arquivo ZIP baixado
unzip whatsapp-bot.zip
cd whatsapp-bot
```

### Passo 2: Instalar Dependências
```bash
# Instalar todas as dependências
npm install

# Em caso de erro, tente:
npm install --force

# Ou limpar cache e reinstalar:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Passo 3: Verificar Estrutura
Certifique-se de que os seguintes arquivos existem:
```
✅ app.js
✅ package.json
✅ database/database.js
✅ models/
✅ routes/
✅ public/admin/
✅ scripts/migrate.js
```

### Passo 4: Configuração Inicial (Opcional)
Crie arquivo `.env` na raiz do projeto:
```bash
# Criar arquivo .env
touch .env

# Adicionar configurações (opcional)
echo "PORT=3000" >> .env
echo "NODE_ENV=development" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

### Passo 5: Migração de Dados (Se Aplicável)
Se você já possui dados nos formatos antigos:
```bash
# Executar migração
node scripts/migrate.js

# Verificar se foi bem-sucedida
ls -la database/
# Deve mostrar: whatsapp_bot.db
```

### Passo 6: Primeiro Startup
```bash
# Iniciar servidor
npm start

# Ou para desenvolvimento (com auto-reload)
npm run dev
```

Você deve ver:
```
✅ Conectado ao banco SQLite
✅ Tabelas do banco inicializadas
🚀 Job Processor iniciado
📋 0 jobs pendentes carregados
🌐 Servidor rodando na porta 3000
```

## 🔧 Configuração Inicial

### 1. Acessar Painel Admin
1. Abra o navegador
2. Vá para: http://localhost:3000/admin
3. Você verá a tela de setup inicial

### 2. Criar Usuário Admin
1. Preencha os campos:
   - **Nome de usuário**: admin (ou outro de sua escolha)
   - **Senha**: mínimo 6 caracteres
   - **Confirmar senha**: repetir a senha
2. Clique em "Criar Admin"
3. Aguarde confirmação e faça login

### 3. Configurar Primeira Sessão WhatsApp
1. No painel, clique em "Sessões"
2. Clique em "Nova Sessão"
3. Digite um nome (ex: "principal")
4. Clique em "Criar"
5. Aguarde o QR Code aparecer
6. Escaneie com seu WhatsApp
7. Aguarde status mudar para "Conectado"

### 4. Configurar Webhook (Opcional)
1. Vá em "Configurações"
2. Insira URL do webhook (ex: https://seu-site.com/webhook)
3. Clique em "Testar Webhook" para verificar
4. Salve as configurações

## 🧪 Teste de Funcionamento

### 1. Teste Manual via Painel
1. Vá em "Mensagens" → "Nova Mensagem"
2. Crie um template simples:
   - **Nome**: teste
   - **Conteúdo**: Olá! Este é um teste em {{data_hoje}}
3. Vá em "Agendamentos" → "Novo Agendamento"
4. Configure:
   - **Sessão**: sua sessão criada
   - **Destino**: seu próprio número (com código do país)
   - **Mensagem**: selecione o template "teste"
   - **Tipo**: Único
   - **Data**: agora + 1 minuto
5. Salve e aguarde o envio
6. Verifique em "Logs" se apareceu como "sent"

### 2. Teste via API
```bash
# Fazer login
curl -c cookies.txt -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua-senha"}'

# Listar sessões
curl -b cookies.txt http://localhost:3000/api/sessoes

# Enviar mensagem teste
curl -b cookies.txt -X POST http://localhost:3000/api/sessoes/principal/enviar \
  -H "Content-Type: application/json" \
  -d '{"numero":"seu-numero","mensagem":"Teste via API"}'
```

## 🔧 Configurações Avançadas

### 1. Configurar como Serviço (Linux)
Criar arquivo de serviço:
```bash
sudo nano /etc/systemd/system/whatsapp-bot.service
```

Conteúdo:
```ini
[Unit]
Description=WhatsApp Bot
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/whatsapp-bot
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Ativar serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bot
sudo systemctl start whatsapp-bot
sudo systemctl status whatsapp-bot
```

### 2. Configurar Proxy Reverso (Nginx)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Configurar SSL (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 Verificação de Problemas

### 1. Porta já em uso
```bash
# Verificar o que está usando a porta 3000
sudo lsof -i :3000

# Matar processo se necessário
sudo kill -9 PID_DO_PROCESSO

# Ou usar porta diferente
PORT=3001 npm start
```

### 2. Permissões de arquivo
```bash
# Dar permissões corretas
chmod +x app.js
chmod -R 755 public/
chmod -R 755 uploads/
```

### 3. Dependências faltando
```bash
# Reinstalar dependências específicas
npm install sqlite3 --build-from-source
npm install whatsapp-web.js
npm install express
```

### 4. Banco de dados
```bash
# Verificar se banco foi criado
ls -la database/whatsapp_bot.db

# Se não existir, reiniciar aplicação
rm -f database/whatsapp_bot.db
npm start
```

## 📊 Monitoramento

### 1. Logs da Aplicação
```bash
# Ver logs em tempo real
tail -f logs/app.log

# Ver apenas erros
tail -f logs/error.log | grep ERROR
```

### 2. Monitoramento de Recursos
```bash
# CPU e memória
top -p $(pgrep -f "node app.js")

# Espaço em disco
df -h
du -sh database/ uploads/
```

### 3. Status das Sessões
```bash
# Via API
curl -b cookies.txt http://localhost:3000/api/sessoes | jq '.[].status'

# Via banco direto
sqlite3 database/whatsapp_bot.db "SELECT name, status FROM sessions;"
```

## 🔄 Backup e Restauração

### 1. Backup Completo
```bash
#!/bin/bash
# Script de backup
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_$DATE"

mkdir -p $BACKUP_DIR
cp -r database/ $BACKUP_DIR/
cp -r uploads/ $BACKUP_DIR/
cp package.json $BACKUP_DIR/
cp .env $BACKUP_DIR/ 2>/dev/null || true

tar -czf whatsapp_bot_backup_$DATE.tar.gz $BACKUP_DIR/
rm -rf $BACKUP_DIR/

echo "Backup criado: whatsapp_bot_backup_$DATE.tar.gz"
```

### 2. Restauração
```bash
#!/bin/bash
# Script de restauração
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: ./restore.sh backup_file.tar.gz"
    exit 1
fi

# Parar aplicação
sudo systemctl stop whatsapp-bot 2>/dev/null || true

# Backup atual
mv database/ database_old_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
mv uploads/ uploads_old_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true

# Restaurar
tar -xzf $BACKUP_FILE
BACKUP_DIR=$(tar -tzf $BACKUP_FILE | head -1 | cut -f1 -d"/")

cp -r $BACKUP_DIR/database/ ./
cp -r $BACKUP_DIR/uploads/ ./
cp $BACKUP_DIR/.env ./ 2>/dev/null || true

# Reiniciar aplicação
sudo systemctl start whatsapp-bot 2>/dev/null || npm start &

echo "Restauração concluída!"
```

## 🆘 Suporte e Troubleshooting

### Problemas Comuns

#### 1. "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 2. "EADDRINUSE: address already in use"
```bash
# Encontrar e matar processo
sudo lsof -ti:3000 | xargs sudo kill -9
# Ou usar porta diferente
PORT=3001 npm start
```

#### 3. "Permission denied"
```bash
sudo chown -R $USER:$USER .
chmod +x app.js
```

#### 4. WhatsApp não conecta
1. Verificar se QR Code está válido (expira em 20 segundos)
2. Fechar WhatsApp Web em outros navegadores
3. Reiniciar a sessão no painel
4. Verificar logs para erros específicos

### Logs Úteis
```bash
# Logs da aplicação
tail -f logs/app.log

# Logs do sistema (se usando systemd)
sudo journalctl -u whatsapp-bot -f

# Logs do banco de dados
sqlite3 database/whatsapp_bot.db ".log stdout"
```

### Contatos de Suporte
- **Documentação**: README.md e API_EXAMPLES.md
- **Logs**: Sempre incluir logs relevantes ao reportar problemas
- **Versão**: Especificar versão do Node.js e sistema operacional

---

**✅ Instalação Concluída!**

Após seguir este guia, você deve ter:
- ✅ Servidor rodando em http://localhost:3000
- ✅ Painel admin acessível em http://localhost:3000/admin
- ✅ Pelo menos uma sessão WhatsApp conectada
- ✅ Sistema de agendamento funcionando
- ✅ Logs sendo gerados corretamente

**Próximos passos**: Explore o painel admin, crie seus primeiros templates e agendamentos!