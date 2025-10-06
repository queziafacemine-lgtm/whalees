// utils/messageProcessor.js
const fs = require('fs');
const path = require('path');

// Função para gerar número aleatório entre min e max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para processar variáveis da mensagem
function processTemplate(template, variables = {}) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return variables[key.trim()] || '';
  });
}

// Função principal que carrega o JSON, escolhe uma mensagem e substitui variáveis
function getMensagemFormatada(tipo = 'vagas_sp', extras = {}) {
  const filePath = path.join(__dirname, '..', 'mensagens', `${tipo}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath);
  const json = JSON.parse(raw);

  const mensagens = json.mensagens || [];
  if (mensagens.length === 0) return null;

  const mensagemAleatoria = mensagens[Math.floor(Math.random() * mensagens.length)];

  const dataAtual = new Date();
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

  // Exemplo: separar cargos para {{primeiro_cargo}} e {{ultimos_cargos}}
  const cargos = (json.cargos || []);
  const primeiroCargo = cargos[0] || '';
  const ultimosCargos = cargos.slice(1).join(', ') || '';

  const variaveis = {
    data_hoje: dataFormatada,
    cidade: json.cidade || '',
    regiao: json.regiao || '',
    quantidade: randomBetween(40, 250),
    primeiro_cargo: primeiroCargo,
    ultimos_cargos: ultimosCargos,
    url_site: json.url || '',
    ...extras // permite sobrescrever qualquer variável via parâmetro
  };

  const mensagemFinal = processTemplate(mensagemAleatoria, variaveis);

  return {
    mensagem: mensagemFinal,
    grupos: json.grupos || [],
    variaveis,
  };
}

module.exports = {
  getMensagemFormatada
};
