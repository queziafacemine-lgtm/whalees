// Função para buscar agendamentos
async function carregarAgendamentos() {
  const res = await fetch('/api/agendamentos');
  const agendamentos = await res.json();
  mostrarAgendamentos(agendamentos);
}

// Função para carregar grupos e exibir checkboxes no formulário
async function carregarGrupos() {
  const res = await fetch('/api/grupos');
  const grupos = await res.json();

  const container = document.getElementById('grupos-container');
  container.innerHTML = ''; // limpar antes de preencher

  grupos.forEach((grupo, i) => {
    const label = document.createElement('label');
    label.style.display = 'inline-flex';
    label.style.alignItems = 'center';
    label.style.margin = '4px 8px';
    label.style.fontSize = '14px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'grupo';
    checkbox.value = grupo;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + grupo));
    container.appendChild(label);
  });
}

// Enviar novo agendamento
async function enviarAgendamento(e) {
  e.preventDefault();

  const tipo = document.getElementById('tipo').value;
  const mensagem = document.getElementById('mensagem').value;
  const destinos = document.getElementById('destinos').value.split(',').map(d => d.trim()).filter(Boolean);
  const gruposSelecionados = Array.from(document.querySelectorAll('input[name="grupo"]:checked')).map(g => g.value);

  if (!mensagem || (!destinos.length && !gruposSelecionados.length)) {
    alert('Preencha a mensagem e selecione ao menos um destino ou grupo.');
    return;
  }

  const body = {
    tipo,
    mensagem,
    destinos,
    grupos: gruposSelecionados,
  };

  await fetch('/api/agendamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  document.getElementById('form-agendamento').reset();
  carregarAgendamentos();
}

// Exibe agendamentos na tabela
function mostrarAgendamentos(agendamentos) {
  const tabelaBody = document.getElementById('tabela-agendamentos');
  tabelaBody.innerHTML = '';

  agendamentos.forEach((a, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.tipo}</td>
      <td>${a.mensagem}</td>
      <td>${(a.destinos || []).join('<br>')}</td>
      <td>${(a.grupos || []).join('<br>')}</td>
      <td>
        <button data-index="${i}" class="editar">✏️</button>
        <button data-index="${i}" class="remover">🗑️</button>
      </td>
    `;
    tabelaBody.appendChild(tr);
  });
}

// Delegação de eventos para editar/remover
document.getElementById('tabela-agendamentos').addEventListener('click', async e => {
  const index = e.target.dataset.index;
  if (!index) return;

  if (e.target.classList.contains('remover')) {
    if (confirm('Tem certeza que deseja remover este agendamento?')) {
      await fetch(`/api/agendamentos/${index}`, { method: 'DELETE' });
      carregarAgendamentos();
    }
  }

  if (e.target.classList.contains('editar')) {
    const res = await fetch('/api/agendamentos');
    const dados = await res.json();
    const item = dados[index];

    document.getElementById('tipo').value = item.tipo || '';
    document.getElementById('mensagem').value = item.mensagem || '';
    document.getElementById('destinos').value = (item.destinos || []).join(', ');

    document.querySelectorAll('input[name="grupo"]').forEach(cb => {
      cb.checked = item.grupos?.includes(cb.value);
    });

    await fetch(`/api/agendamentos/${index}`, { method: 'DELETE' });
    carregarAgendamentos();
  }
});

// Iniciar carregamento
document.getElementById('form-agendamento').addEventListener('submit', enviarAgendamento);
carregarAgendamentos();
carregarGrupos(); // novo: carrega os checkboxes com estilo otimizado
