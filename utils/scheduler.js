const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { processTemplate } = require('../utils/messageProcessor');
const defaultValues = require('../utils/defaultValues');
const { store } = require('../controllers/sessionController'); // <-- usando o store de sessões

function enviarMensagensAgendadas(client, nomeSessao) {
  const sessionData = store.get(nomeSessao);

  if (!sessionData || !sessionData.agendamentos || !Array.isArray(sessionData.agendamentos)) {
    console.log(`⚠️ [${nomeSessao}] Nenhum agendamento encontrado na sessão.`);
    return;
  }

  const agendamentos = sessionData.agendamentos;
  const hoje = moment().format('YYYY-MM-DD');

  agendamentos.forEach((agendamento) => {
    const { nome, grupo, tipo, dataUltimoEnvio, cidade, regiao, primeiro_cargo, ultimos_cargos, url_site } = agendamento;

    if (dataUltimoEnvio === hoje) {
      console.log(`⏭️ [${nomeSessao}] ${nome} já recebeu hoje. Ignorando...`);
      return;
    }

    const mensagensPath = path.join(__dirname, '..', 'mensagens', `${grupo}.json`);
    if (!fs.existsSync(mensagensPath)) {
      console.log(`⚠️ Arquivo de mensagens ${grupo}.json não encontrado.`);
      return;
    }

    const mensagens = JSON.parse(fs.readFileSync(mensagensPath, 'utf-8'));
    const template = mensagens[Math.floor(Math.random() * mensagens.length)];

    // Gera a mensagem final com os dados do agendamento ou valores padrão
    const mensagemFinal = processTemplate(template, {
      data_hoje: hoje,
      cidade: cidade || defaultValues.cidade,
      regiao: regiao || defaultValues.regiao,
      quantidade: Math.floor(Math.random() * (defaultValues.quantidade.max - defaultValues.quantidade.min + 1)) + defaultValues.quantidade.min,
      primeiro_cargo: primeiro_cargo || defaultValues.primeiro_cargo,
      ultimos_cargos: ultimos_cargos || defaultValues.ultimos_cargos,
      url_site: url_site || defaultValues.url_site
    });

    const numeroComDDD = nome.includes('@c.us') ? nome : `${nome}@c.us`;

    client.sendMessage(numeroComDDD, mensagemFinal).then(() => {
      console.log(`📤 [${nomeSessao}] Mensagem enviada para ${nome}`);

      // Atualiza data do último envio
      agendamento.dataUltimoEnvio = hoje;

      // Atualiza os agendamentos na store
      store.set(nomeSessao, {
        ...sessionData,
        agendamentos: agendamentos
      });

      // Log
      const logPath = path.join(__dirname, '..', 'logs', 'logs-envios.txt');
      const logMsg = `[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${nomeSessao} => ${nome} | ${mensagemFinal}\n`;
      fs.appendFileSync(logPath, logMsg);
    }).catch((err) => {
      console.error(`❌ [${nomeSessao}] Erro ao enviar para ${nome}: ${err.message}`);
    });
  });
}

module.exports = {
  enviarMensagensAgendadas
};
