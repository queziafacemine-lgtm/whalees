const fs = require('fs');
const path = require('path');

function gerarMensagemPersonalizada(nomeArquivo, variaveis) {
  const caminho = path.join(__dirname, '..', 'mensagens', nomeArquivo);
  if (!fs.existsSync(caminho)) return null;

  const mensagens = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (!Array.isArray(mensagens) || mensagens.length === 0) return null;

  const mensagemAleatoria = mensagens[Math.floor(Math.random() * mensagens.length)];

  const substituida = mensagemAleatoria.replace(/{{(.*?)}}/g, (_, chave) => {
    if (variaveis.hasOwnProperty(chave)) {
      return variaveis[chave];
    }
    return '';
  });

  return substituida;
}

module.exports = { gerarMensagemPersonalizada };
