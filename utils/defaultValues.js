const moment = require('moment');

function getValoresMensagem(agendamento) {
  return {
    data_hoje: moment().format('YYYY-MM-DD'),
    cidade: agendamento.cidade || 'São Paulo',
    regiao: agendamento.regiao || 'SP',
    quantidade: Math.floor(Math.random() * (250 - 40 + 1)) + 40,
    primeiro_cargo: agendamento.primeiro_cargo || 'Auxiliar Administrativo',
    ultimos_cargos: agendamento.ultimos_cargos || 'Repositor, Operador de Caixa, Atendente...',
    url_site: agendamento.url_site || 'https://empregosjoinville.com'
  };
}

module.exports = { getValoresMensagem };
