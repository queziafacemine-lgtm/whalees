# 📚 Exemplos de Uso da API - WhatsApp Bot

Este documento contém exemplos práticos de como usar a API do WhatsApp Bot.

## 🔐 Autenticação

### Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "sua-senha"
  }'
```

## 📱 Sessões WhatsApp

### Listar todas as sessões
```bash
curl -X GET http://localhost:3000/api/sessoes \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Iniciar uma sessão
```bash
curl -X POST http://localhost:3000/api/sessoes/minha-sessao/iniciar \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Enviar mensagem de texto
```bash
curl -X POST http://localhost:3000/api/sessoes/minha-sessao/enviar \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "numero": "5541999999999",
    "mensagem": "Olá! Esta é uma mensagem de teste."
  }'
```

### Enviar mídia
```bash
curl -X POST http://localhost:3000/api/sessoes/minha-sessao/enviar-midia \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -F "numero=5541999999999" \
  -F "mensagem=Aqui está sua imagem!" \
  -F "arquivo=@/caminho/para/imagem.jpg"
```

## 💬 Templates de Mensagens

### Criar template simples
```bash
curl -X POST http://localhost:3000/api/mensagens \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "name": "bom-dia",
    "content": "Bom dia! Hoje é {{data_hoje}} e temos {{quantidade}} oportunidades para você!",
    "variables": {
      "quantidade": "150"
    }
  }'
```

### Criar template com mídia
```bash
curl -X POST http://localhost:3000/api/mensagens \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -F "name=promocao-imagem" \
  -F "content=🔥 PROMOÇÃO ESPECIAL! Válida até {{data_limite}}" \
  -F "variables={\"data_limite\": \"31/12/2024\"}" \
  -F "media=@/caminho/para/promocao.jpg"
```

### Listar templates
```bash
curl -X GET http://localhost:3000/api/mensagens \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Atualizar template
```bash
curl -X PUT http://localhost:3000/api/mensagens/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "name": "bom-dia-atualizado",
    "content": "Bom dia! Hoje, {{data_hoje}}, temos {{quantidade}} vagas disponíveis!",
    "variables": {
      "quantidade": "200"
    }
  }'
```

## ⏰ Agendamentos

### Criar agendamento único
```bash
curl -X POST http://localhost:3000/api/agendamentos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "sessionName": "minha-sessao",
    "destination": "5541999999999",
    "messageId": 1,
    "scheduleType": "once",
    "sendAt": "2024-12-25T10:00:00.000Z"
  }'
```

### Criar agendamento recorrente
```bash
curl -X POST http://localhost:3000/api/agendamentos \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "sessionName": "minha-sessao",
    "destination": "5541999999999",
    "customMessage": "Lembrete diário: Não esqueça de beber água!",
    "scheduleType": "recurring",
    "sendAt": "2024-12-20T08:00:00.000Z",
    "intervalDays": 1
  }'
```

### Executar agendamento imediatamente
```bash
curl -X POST http://localhost:3000/api/agendamentos/1/execute \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Listar agendamentos
```bash
curl -X GET http://localhost:3000/api/agendamentos \
  -H "Cookie: connect.sid=sua-session-cookie"
```

## 📊 Logs

### Listar logs recentes
```bash
curl -X GET "http://localhost:3000/api/logs?limit=50&page=1" \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Filtrar logs por status
```bash
curl -X GET "http://localhost:3000/api/logs?status=failed&limit=20" \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Exportar logs em CSV
```bash
curl -X GET http://localhost:3000/api/logs/export \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -o logs_export.csv
```

### Obter estatísticas
```bash
curl -X GET http://localhost:3000/api/logs/stats \
  -H "Cookie: connect.sid=sua-session-cookie"
```

## ⚙️ Configurações

### Obter configurações atuais
```bash
curl -X GET http://localhost:3000/api/settings \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Atualizar configurações
```bash
curl -X PUT http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=sua-session-cookie" \
  -d '{
    "webhook_url": "https://meu-webhook.com/whatsapp-notifications",
    "max_attempts": 3,
    "retry_intervals": [30, 120, 300]
  }'
```

### Testar webhook
```bash
curl -X POST http://localhost:3000/api/admin/test-webhook \
  -H "Cookie: connect.sid=sua-session-cookie"
```

## 🔄 Exemplos de Integração

### Script Python para criar agendamento
```python
import requests
import json
from datetime import datetime, timedelta

# Login
login_data = {
    "username": "admin",
    "password": "sua-senha"
}

session = requests.Session()
login_response = session.post(
    "http://localhost:3000/api/admin/login",
    json=login_data
)

if login_response.status_code == 200:
    # Criar agendamento para amanhã às 9h
    tomorrow = datetime.now() + timedelta(days=1)
    send_at = tomorrow.replace(hour=9, minute=0, second=0).isoformat() + "Z"
    
    schedule_data = {
        "sessionName": "minha-sessao",
        "destination": "5541999999999",
        "customMessage": "Bom dia! Este é um lembrete automático.",
        "scheduleType": "once",
        "sendAt": send_at
    }
    
    response = session.post(
        "http://localhost:3000/api/agendamentos",
        json=schedule_data
    )
    
    print(f"Agendamento criado: {response.json()}")
```

### Script Node.js para monitorar logs
```javascript
const axios = require('axios');

async function monitorLogs() {
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:3000/api/admin/login', {
            username: 'admin',
            password: 'sua-senha'
        });
        
        const cookies = loginResponse.headers['set-cookie'];
        
        // Obter estatísticas
        const statsResponse = await axios.get('http://localhost:3000/api/logs/stats', {
            headers: {
                Cookie: cookies.join('; ')
            }
        });
        
        const stats = statsResponse.data;
        console.log(`Total de mensagens: ${stats.total}`);
        console.log(`Enviadas com sucesso: ${stats.sent}`);
        console.log(`Falharam: ${stats.failed}`);
        console.log(`Taxa de sucesso: ${stats.successRate}%`);
        
        // Listar falhas recentes
        if (stats.failed > 0) {
            const failedResponse = await axios.get('http://localhost:3000/api/logs?status=failed&limit=10', {
                headers: {
                    Cookie: cookies.join('; ')
                }
            });
            
            console.log('\nFalhas recentes:');
            failedResponse.data.logs.forEach(log => {
                console.log(`- ${log.destination}: ${log.error_message}`);
            });
        }
        
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

// Executar a cada 5 minutos
setInterval(monitorLogs, 5 * 60 * 1000);
monitorLogs(); // Executar imediatamente
```

### Webhook Receiver (Express.js)
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/whatsapp-webhook', (req, res) => {
    const notification = req.body;
    
    console.log('Notificação recebida:', {
        scheduleId: notification.scheduleId,
        status: notification.status,
        destino: notification.destino,
        tentativas: notification.tentativas
    });
    
    // Processar notificação
    if (notification.status === 'sent') {
        console.log(`✅ Mensagem enviada com sucesso para ${notification.destino}`);
        // Salvar no seu sistema, enviar email, etc.
    } else if (notification.status === 'failed') {
        console.log(`❌ Falha ao enviar para ${notification.destino}: ${notification.erro}`);
        // Alertar administrador, tentar canal alternativo, etc.
    }
    
    res.status(200).json({ received: true });
});

app.listen(3001, () => {
    console.log('Webhook receiver rodando na porta 3001');
});
```

## 📱 Exemplos de Uso via JavaScript (Frontend)

### Função para criar mensagem com upload
```javascript
async function createMessageWithMedia() {
    const formData = new FormData();
    formData.append('name', 'promocao-natal');
    formData.append('content', '🎄 Promoção de Natal! Desconto de {{desconto}}% até {{data_limite}}');
    formData.append('variables', JSON.stringify({
        desconto: '50',
        data_limite: '25/12/2024'
    }));
    
    const fileInput = document.getElementById('mediaFile');
    if (fileInput.files[0]) {
        formData.append('media', fileInput.files[0]);
    }
    
    try {
        const response = await fetch('/api/mensagens', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('Mensagem criada:', result);
    } catch (error) {
        console.error('Erro:', error);
    }
}
```

### Monitoramento em tempo real
```javascript
async function startRealTimeMonitoring() {
    setInterval(async () => {
        try {
            const response = await fetch('/api/logs/stats');
            const stats = await response.json();
            
            document.getElementById('total-messages').textContent = stats.total;
            document.getElementById('success-rate').textContent = stats.successRate + '%';
            
            // Atualizar gráfico ou indicadores visuais
            updateDashboard(stats);
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
        }
    }, 30000); // A cada 30 segundos
}
```

## 🔧 Troubleshooting com API

### Verificar status da sessão
```bash
# Verificar se a sessão está ativa
curl -X GET http://localhost:3000/api/sessoes \
  -H "Cookie: connect.sid=sua-session-cookie" | jq '.[] | select(.nome=="minha-sessao")'
```

### Testar conectividade
```bash
# Ping básico
curl -X GET http://localhost:3000/api/admin/setup-status

# Verificar autenticação
curl -X GET http://localhost:3000/api/admin/me \
  -H "Cookie: connect.sid=sua-session-cookie"
```

### Debug de agendamentos
```bash
# Listar agendamentos pendentes
curl -X GET http://localhost:3000/api/agendamentos \
  -H "Cookie: connect.sid=sua-session-cookie" | jq '.[] | select(.status=="pending")'

# Verificar logs de um agendamento específico
curl -X GET "http://localhost:3000/api/logs?limit=100" \
  -H "Cookie: connect.sid=sua-session-cookie" | jq '.logs[] | select(.schedule_id==1)'
```

---

**Dica**: Use ferramentas como [Postman](https://www.postman.com/) ou [Insomnia](https://insomnia.rest/) para testar as APIs de forma mais visual e organizada.