// === CONFIG GERAL ===
const paginaTamanho = 5;
let paginaAtual = 1;
let agendamentos = [];
let grupos = [];
let sessoes = [];

const sessaoSelect = document.getElementById('sessao');
const gruposContainer = document.getElementById('grupos-container');
const tabelaBody = document.querySelector('#tabela-agendamentos tbody');
const logsDiv = document.getElementById('logs');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const paginaSpan = document.getElementById('pagina-atual');
const form = document.getElementById('form-agendamento');
const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
const btnSubmit = document.getElementById('btnAgendar');
const inputDestino = document.getElementById('destino');
const inputEditarId = document.getElementById('editarId');

const tipoAgendamentoSelect = document.getElementById('tipo-agendamento');
const campoEnviarEmContainer = document.getElementById('campo-enviarEm-container');
const campoIntervaloContainer = document.getElementById('campo-intervalo-container');
const intervaloDiasInput = document.getElementById('intervaloDias');
const categoriaMensagemSelect = document.getElementById('categoriaMensagem');
const mensagemTextarea = document.getElementById('mensagem');
const inputEnviarEm = document.getElementById('enviarEm');

// === MODAL ===
const modal = new bootstrap.Modal(document.getElementById('modalMensagem'));
const modalTexto = document.getElementById('conteudoMensagem');
const modalFechar = document.querySelector('.fechar-modal');

// === VARIÁVEL GLOBAL DO CALENDÁRIO ===
let calendar;  // <-- para armazenar instância do FullCalendar e usar depois

// === FUNÇÕES DE STATUS DAS SESSÕES ===
async function loadSessionsStatus() {
  try {
    const response = await fetch('/api/sessions/status');
    const data = await response.json();
    
    const container = document.getElementById('sessions-status');
    if (!container) return;
    
    // Verificar se data tem a propriedade sessions
    const sessoes = data.sessions || [];
    
    if (!Array.isArray(sessoes) || sessoes.length === 0) {
      container.innerHTML = `
        <div class="col-md-6">
          <div class="card border-left-warning">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="me-3">
                  <i class="bi bi-whatsapp text-muted" style="font-size: 2rem;"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1">Sessão Principal</h6>
                  <p class="mb-1">
                    <span class="status-indicator status-disconnected"></span>
                    <span class="badge bg-danger">Desconectado</span>
                  </p>
                  <small class="text-muted">Nunca conectado</small>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-whatsapp btn-sm" onclick="connectWhatsApp('main')">
                    <i class="bi bi-link me-1"></i> Conectar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = sessoes.map(sessao => `
      <div class="col-md-6 mb-3">
        <div class="card border-left-${getStatusColor(sessao.status)}">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="me-3">
                <i class="bi bi-whatsapp ${getStatusIconColor(sessao.status)}" style="font-size: 2rem;"></i>
              </div>
              <div class="flex-grow-1">
                <h6 class="mb-1">Sessão: ${sessao.name}</h6>
                <p class="mb-1">
                  <span class="status-indicator status-${sessao.status}"></span>
                  <span class="badge ${getStatusBadgeClass(sessao.status)}">
                    ${getStatusText(sessao.status)}
                  </span>
                </p>
                <small class="text-muted">
                  Última atualização: ${sessao.lastUpdate ? new Date(sessao.lastUpdate).toLocaleString('pt-BR') : 'Nunca'}
                </small>
              </div>
              <div class="ms-auto">
                ${renderSessionButton(sessao)}
              </div>
            </div>
            ${sessao.status === 'qr_ready' && sessao.qrCode ? renderQRCodeSection(sessao.name, sessao.qrCode) : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    // Renderizar QR codes se necessário
    sessoes.forEach(sessao => {
      if (sessao.status === 'qr_ready' && sessao.qrCode) {
        renderQRCodeImage(sessao.name, sessao.qrCode);
      }
    });
    
  } catch (error) {
    console.error('Erro ao carregar status das sessões:', error);
    const container = document.getElementById('sessions-status');
    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Erro ao carregar sessões: ${error.message}
          </div>
        </div>
      `;
    }
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'connected': return 'success';
    case 'qr_ready': return 'warning';
    case 'connecting': return 'info';
    case 'auth_failed': return 'danger';
    default: return 'secondary';
  }
}

function getStatusIconColor(status) {
  switch (status) {
    case 'connected': return 'text-success';
    case 'qr_ready': return 'text-warning';
    case 'connecting': return 'text-info';
    case 'auth_failed': return 'text-danger';
    default: return 'text-muted';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'connected': return 'bg-success';
    case 'qr_ready': return 'bg-warning';
    case 'connecting': return 'bg-info';
    case 'auth_failed': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'connected': return 'Conectado';
    case 'qr_ready': return 'QR Code Pronto';
    case 'connecting': return 'Conectando';
    case 'auth_failed': return 'Falha na Autenticação';
    case 'disconnected': return 'Desconectado';
    default: return 'Desconhecido';
  }
}

function renderSessionButton(sessao) {
  switch (sessao.status) {
    case 'connected':
      return `
        <div class="btn-group-vertical btn-group-sm">
          <button class="btn btn-outline-danger btn-sm" onclick="disconnectWhatsApp('${sessao.name}')">
            <i class="bi bi-x-circle"></i> Desconectar
          </button>
          <button class="btn btn-outline-warning btn-sm mt-1" onclick="restartWhatsApp('${sessao.name}')">
            <i class="bi bi-arrow-clockwise"></i> Reiniciar
          </button>
        </div>
      `;
    case 'qr_ready':
      return `
        <button class="btn btn-outline-warning btn-sm" onclick="disconnectWhatsApp('${sessao.name}')">
          <i class="bi bi-x-circle"></i> Cancelar
        </button>
      `;
    case 'connecting':
      return `
        <button class="btn btn-outline-secondary btn-sm" disabled>
          <div class="spinner-border spinner-border-sm me-1" role="status"></div>
          Conectando...
        </button>
      `;
    default:
      return `
        <button class="btn btn-whatsapp btn-sm" onclick="connectWhatsApp('${sessao.name}')">
          <i class="bi bi-link me-1"></i> Conectar
        </button>
      `;
  }
}

function renderQRCodeSection(sessionName, qrCode) {
  return `
    <div class="mt-3 p-3 bg-light rounded text-center">
      <h6 class="mb-2">Escaneie o QR Code com seu WhatsApp:</h6>
      <div id="qr-${sessionName}" class="mb-2"></div>
      <small class="text-muted">O QR Code expira em alguns minutos</small>
    </div>
  `;
}

function renderQRCodeImage(sessionName, qrCode) {
  const qrContainer = document.getElementById(`qr-${sessionName}`);
  if (qrContainer && qrCode) {
    qrContainer.innerHTML = `
      <div class="qr-code-container" style="background: white; padding: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}" 
             alt="QR Code WhatsApp" style="max-width: 100%; height: auto; border-radius: 4px;">
      </div>
    `;
  }
}

// Funções de controle das sessões
async function connectWhatsApp(sessionName) {
  try {
    showNotification('Iniciando conexão...', 'info');
    
    const response = await fetch(`/api/sessions/${sessionName}/connect`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Sessão inicializada! Aguarde o QR Code...', 'success');
      // Atualizar status após delay
      setTimeout(() => {
        loadSessionsStatus();
        startSessionPolling();
      }, 2000);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('Erro ao conectar WhatsApp:', error);
    showNotification(`Erro ao conectar: ${error.message}`, 'danger');
  }
}

async function disconnectWhatsApp(sessionName) {
  if (!confirm(`Tem certeza que deseja desconectar a sessão "${sessionName}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/sessions/${sessionName}/disconnect`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Sessão desconectada com sucesso!', 'success');
      loadSessionsStatus();
      stopSessionPolling();
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    showNotification(`Erro ao desconectar: ${error.message}`, 'danger');
  }
}

async function restartWhatsApp(sessionName) {
  if (!confirm(`Tem certeza que deseja reiniciar a sessão "${sessionName}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/sessions/${sessionName}/restart`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Sessão reiniciada! Aguarde o novo QR Code...', 'success');
      setTimeout(() => {
        loadSessionsStatus();
        startSessionPolling();
      }, 3000);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('Erro ao reiniciar:', error);
    showNotification(`Erro ao reiniciar: ${error.message}`, 'danger');
  }
}

// Polling para atualizar status das sessões
let sessionPollingInterval = null;

function startSessionPolling() {
  if (sessionPollingInterval) {
    clearInterval(sessionPollingInterval);
  }
  
  sessionPollingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/sessions/status');
      const data = await response.json();
      const sessoes = data.sessions || [];
      
      if (Array.isArray(sessoes)) {
        const connectingSessions = sessoes.filter(s => 
          s.status === 'qr_ready' || s.status === 'connecting'
        );
        
        if (connectingSessions.length > 0) {
          loadSessionsStatus(); // Atualizar interface
        } else {
          stopSessionPolling(); // Parar polling se não há sessões conectando
        }
      }
    } catch (error) {
      console.error('Erro no polling de sessões:', error);
    }
  }, 3000); // Atualizar a cada 3 segundos
}

function stopSessionPolling() {
  if (sessionPollingInterval) {
    clearInterval(sessionPollingInterval);
    sessionPollingInterval = null;
  }
}

function refreshSessions() {
  loadSessionsStatus();
}

function refreshSchedules() {
  carregarAgendamentos();
}

function refreshLogs() {
  carregarLogs();
}

// === FUNÇÕES DE CARREGAMENTO ===
async function carregarSessoes() {
  try {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    
    // Verificar se data tem a propriedade sessions e se é um array
    const sessoes = data.sessions || [];
    
    if (!Array.isArray(sessoes)) {
      console.error('Resposta da API não contém array de sessões:', data);
      sessaoSelect.innerHTML = '<option value="">Erro: dados inválidos</option>';
      return;
    }
    
    sessaoSelect.innerHTML = '<option value="">Selecione uma sessão</option>';
    
    if (sessoes.length === 0) {
      // Se não há sessões, criar uma opção padrão
      const option = document.createElement('option');
      option.value = 'main';
      option.textContent = 'main (desconectado)';
      sessaoSelect.appendChild(option);
    } else {
      sessoes.forEach(s => {
        const option = document.createElement('option');
        option.value = s.name;
        option.textContent = `${s.name} (${getStatusText(s.status)})`;
        sessaoSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar sessões', err);
    sessaoSelect.innerHTML = '<option value="">Erro ao carregar sessões</option>';
  }
}

async function carregarGrupos(sessao) {
  gruposContainer.innerHTML = 'Carregando grupos...';
  if (!sessao) {
    gruposContainer.innerHTML = 'Selecione uma sessão.';
    return;
  }
  try {
    const res = await fetch(`/api/admin/sessions/${sessao}/chats`);
    const chats = await res.json();
    grupos = chats.filter(c => c.isGroup);
    grupos.sort((a, b) => a.nome.localeCompare(b.nome));
    if (grupos.length === 0) {
      gruposContainer.innerHTML = 'Nenhum grupo encontrado.';
      return;
    }
    gruposContainer.innerHTML = '';
    grupos.forEach(g => {
      const label = document.createElement('label');
      label.classList.add('grupo-item');
      label.innerHTML = `<input type="checkbox" value="${g.id}"> ${g.nome}`;
      gruposContainer.appendChild(label);
    });
  } catch (err) {
    console.error('Erro ao carregar grupos', err);
    gruposContainer.innerHTML = 'Erro ao carregar grupos.';
  }
}

async function carregarCategorias() {
  try {
    const res = await fetch('/api/mensagens');
    const categorias = await res.json();
    categoriaMensagemSelect.innerHTML = '<option value="">Nenhuma (mensagem fixa)</option>';
    categorias.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoriaMensagemSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar categorias', err);
    categoriaMensagemSelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
  }
}

// 🔄 MANTEVE A FUNÇÃO carregarAgendamentos ORIGINAL (tabela)
async function carregarAgendamentos() {
  try {
    const res = await fetch('/api/agendamentos');
    agendamentos = await res.json();
    paginaAtual = 1;
    mostrarPagina();
  } catch (err) {
    console.error('Erro ao carregar agendamentos', err);
    tabelaBody.innerHTML = '<tr><td colspan="8">Erro ao carregar agendamentos.</td></tr>';
  }
}

// ✅ NOVA FUNÇÃO: Carrega eventos para o FullCalendar
// (mas agora passamos a usar diretamente o endpoint no config do calendar)
async function carregarEventosCalendario() {
  try {
    const response = await fetch('/api/fullcalendar');
    if (!response.ok) throw new Error('Erro ao buscar eventos do calendário');
    const eventos = await response.json();

    // Formata os eventos para o FullCalendar
	return eventos.map(ev => ({
  id: ev.id,
  title: `${ev.sessao || ''} - ${ev.destino || 'Evento'}`.trim(),
  start: ev.enviarEm || ev.start || ev.inicio,
  end: ev.fim || ev.end || ev.enviarEm,
  allDay: false,
  extendedProps: {
    ...ev,
    mensagem: ev.mensagem || ev.title || 'Sem mensagem disponível'
  }
}));
  } catch (error) {
    console.error('Erro ao carregar eventos para o calendário:', error);
    return [];
  }
}

// ✅ Inicializa o calendário no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: async function(fetchInfo, successCallback, failureCallback) {
  try {
    const eventos = await carregarEventosCalendario(); // aqui sua função será chamada
    successCallback(eventos);
  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
    failureCallback(err);
  }
}, // seu endpoint que retorna eventos JSON
    locale: 'pt-br',
    height: 'auto',
    eventDidMount: function(info) {
      // Tooltip simples com mensagem no hover
      const extended = info.event.extendedProps;
      if (extended && extended.mensagem) {
        const tooltip = document.createElement('div');
        tooltip.className = 'fc-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#333';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '12px';
        tooltip.style.whiteSpace = 'pre-wrap';
        tooltip.style.zIndex = 1000;
        tooltip.style.display = 'none';

        info.el.addEventListener('mouseenter', () => {
          tooltip.textContent = extended.mensagem.length > 200 ? extended.mensagem.slice(0, 200) + '...' : extended.mensagem;
          document.body.appendChild(tooltip);
          const rect = info.el.getBoundingClientRect();
          tooltip.style.top = rect.top + window.scrollY - tooltip.offsetHeight - 30 + 'px';
          tooltip.style.left = rect.left + window.scrollX + 'px';
          tooltip.style.display = 'block';
        });
        info.el.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
          if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        });
      }
    },
    eventClick: function(info) {
  try {
    const extended = info.event.extendedProps;

    if (!modal || !modalTexto) {
      console.warn('Modal ou modalTexto não estão presentes no DOM');
      return;
    }

    modalTexto.textContent = info.event.extendedProps.mensagem || 'Sem detalhes disponíveis.';
	document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    modal.show();

  } catch (e) {
    console.error('Erro ao abrir modal no clique do evento:', e);
  }
}

  });

  calendar.render();
});

// === EXIBIÇÃO DE TABELA ===
function mostrarPagina() {
  tabelaBody.innerHTML = '';
  const inicio = (paginaAtual - 1) * paginaTamanho;
  const fim = inicio + paginaTamanho;
  const pagina = agendamentos.slice(inicio, fim);
  if (pagina.length === 0) {
    tabelaBody.innerHTML = '<tr><td colspan="8">Nenhum agendamento nesta página.</td></tr>';
  } else {
    pagina.forEach(a => {
      let tipo = 'Padrão';
      if (a.categoriaMensagem && a.mensagem.includes('[RANDOM]')) tipo = 'Random';
      else if (a.categoriaMensagem) tipo = 'Fixa';

      const preview = tipo === 'Padrão'
        ? (a.mensagem.length > 30 ? a.mensagem.slice(0, 30) + '...' : a.mensagem)
        : `${tipo} (${a.categoriaMensagem})`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.id}</td>
        <td>${a.sessao}</td>
        <td>${a.destino}</td>
        <td>${preview} <button class="btn-preview" data-id="${a.id}">🔍</button></td>
        <td>${tipo}</td>
        <td>${new Date(a.enviarEm).toLocaleString()}</td>
        <td class="${a.enviado ? 'enviado' : 'pendente'}">${a.enviado ? 'Enviado' : 'Pendente'}</td>
        <td>
          <button class="btn-editar" data-id="${a.id}">Editar</button>
          <button class="btn-remover" data-id="${a.id}">Remover</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });
  }

  document.querySelectorAll('.btn-preview').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const res = await fetch(`/api/agendamentos/${id}`);
      const ag = await res.json();
      let conteudo = '';

      if (ag.categoriaMensagem) {
        try {
          const msgRes = await fetch(`/mensagens/${ag.categoriaMensagem}.json`);
          const lista = await msgRes.json();
          conteudo = ag.mensagem.includes('[RANDOM]') ? lista.join('\n\n') : lista[0];
        } catch {
          conteudo = '(Erro ao carregar mensagem da categoria)';
        }
      } else {
        conteudo = ag.mensagem;
      }

      modalTexto.textContent = conteudo;
	  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      modal.show();
    });
  });

  const totalPaginas = Math.max(Math.ceil(agendamentos.length / paginaTamanho), 1);
  paginaSpan.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  btnPrev.disabled = paginaAtual <= 1;
  btnNext.disabled = paginaAtual >= totalPaginas;
}

// === CONTROLES DE PAGINAÇÃO ===
btnPrev.onclick = () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    mostrarPagina();
  }
};

btnNext.onclick = () => {
  const totalPaginas = Math.ceil(agendamentos.length / paginaTamanho);
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    mostrarPagina();
  }
};

// === FORMULÁRIO ===
sessaoSelect.addEventListener('change', () => {
  carregarGrupos(sessaoSelect.value);
  gruposContainer.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  inputDestino.value = '';
});

tipoAgendamentoSelect.addEventListener('change', () => {
  if (tipoAgendamentoSelect.value === 'recorrente') {
    campoEnviarEmContainer.style.display = 'block';
    campoIntervaloContainer.style.display = 'block';
    inputEnviarEm.required = true;
    intervaloDiasInput.required = true;
  } else {
    campoEnviarEmContainer.style.display = 'block';
    campoIntervaloContainer.style.display = 'none';
    inputEnviarEm.required = true;
    intervaloDiasInput.required = false;
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();

  const sessao = sessaoSelect.value;
  const destinoNumero = inputDestino.value.trim();
  const gruposSelecionados = [...gruposContainer.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
  const mensagem = mensagemTextarea.value.trim();
  const tipoAgendamento = tipoAgendamentoSelect.value;
  const categoriaMensagem = categoriaMensagemSelect.value || "";
  const editarId = inputEditarId.value;

  let enviarEm = null;
  let intervaloDias = null;

  const dt = inputEnviarEm.value;
  if (!dt) return alert('Informe a data/hora');
  const dtParsed = new Date(dt);
  if (isNaN(dtParsed) || dtParsed < new Date()) return alert('Data/hora inválida');
  enviarEm = dtParsed.toISOString();

  if (tipoAgendamento === 'recorrente') {
    intervaloDias = parseInt(intervaloDiasInput.value);
    if (!intervaloDias || intervaloDias < 1) return alert('Intervalo inválido');
  }

  if (!sessao) return alert('Selecione uma sessão');
  if (!destinoNumero && gruposSelecionados.length === 0) return alert('Informe destino(s)');
  if (!mensagem && !categoriaMensagem) return alert('Digite a mensagem ou selecione uma categoria');

  try {
    if (editarId) {
      const res = await fetch(`/api/agendamentos/${editarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao,
          destino: destinoNumero || gruposSelecionados.join(','),
          mensagem,
          enviarEm,
          tipoAgendamento,
          intervaloDias,
          categoriaMensagem
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Atualizado!');
        limparFormulario();
        await carregarAgendamentos();
        calendar.refetchEvents();  // << Atualiza calendário após edição
      } else {
        alert('Erro: ' + (data.error || 'Erro desconhecido'));
      }
    } else {
      const destinos = destinoNumero ? [destinoNumero] : gruposSelecionados;
      for (const d of destinos) {
        const res = await fetch('/api/agendamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessao,
            destino: d,
            mensagem,
            enviarEm,
            tipoAgendamento,
            intervaloDias,
            categoriaMensagem
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Erro ao agendar');
      }
      alert('Agendamentos criados!');
      limparFormulario();
      await carregarAgendamentos();
      calendar.refetchEvents();  // << Atualiza calendário após criação
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

function limparFormulario() {
  form.reset();
  inputEditarId.value = '';
  btnSubmit.textContent = 'Agendar Mensagem';
  btnCancelarEdicao.style.display = 'none';
  tipoAgendamentoSelect.value = 'unico';
  tipoAgendamentoSelect.dispatchEvent(new Event('change'));
  gruposContainer.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}

btnCancelarEdicao.onclick = limparFormulario;

// === AÇÕES NA TABELA ===
tabelaBody.addEventListener('click', async e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('btn-remover')) {
    if (!confirm(`Remover agendamento ${id}?`)) return;
    try {
      const res = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await carregarAgendamentos();
        calendar.refetchEvents();  // << Atualiza calendário após remoção
      } else alert('Erro: ' + (data.error || 'Erro desconhecido'));
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  }

  if (e.target.classList.contains('btn-editar')) {
    const ag = agendamentos.find(a => a.id == id);
    if (!ag) return;

    sessaoSelect.value = ag.sessao;
    await carregarGrupos(ag.sessao);

    if (/^\d{10,15}$/.test(ag.destino)) {
      inputDestino.value = ag.destino;
    } else {
      inputDestino.value = '';
      const ids = ag.destino.split(',');
      gruposContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.checked = ids.includes(cb.value);
      });
    }

    mensagemTextarea.value = ag.mensagem;
    tipoAgendamentoSelect.value = ag.tipoAgendamento || 'unico';
    tipoAgendamentoSelect.dispatchEvent(new Event('change'));

    if (ag.tipoAgendamento === 'recorrente') {
      intervaloDiasInput.value = ag.intervaloDias || 1;
    } else {
      const dt = new Date(ag.enviarEm).toISOString().slice(0, 16);
      inputEnviarEm.value = dt;
    }

    categoriaMensagemSelect.value = ag.categoriaMensagem || '';
    inputEditarId.value = ag.id;
    btnSubmit.textContent = 'Salvar Edição';
    btnCancelarEdicao.style.display = 'inline-block';
  }
});

// === CATEGORIA => preencher campo de mensagem ===
categoriaMensagemSelect.addEventListener('change', async () => {
  const categoria = categoriaMensagemSelect.value;
  if (!categoria) {
    mensagemTextarea.value = '';
    return;
  }

  try {
    const res = await fetch(`/api/mensagens/${categoria}`);
    if (!res.ok) throw new Error('Erro ao buscar categoria');

    const json = await res.json();
    if (json.mensagem) {
      mensagemTextarea.value = json.mensagem;
    } else {
      throw new Error('JSON inválido');
    }
  } catch (err) {
    alert('Erro ao carregar a mensagem: ' + err.message);
    mensagemTextarea.value = '';
  }
});

// === MODAL CLOSE ===
if (modalFechar && modal) {
  modalFechar.onclick = () => {
    modal.hide(); // CORRETO: Esconde o modal
  };

  window.onclick = (event) => {
    const modalElement = document.getElementById('modalMensagem');
    if (event.target === modalElement) {
      modal.hide(); // CORRETO: Fecha ao clicar fora
    }
  };
}

// === LOGS ===
async function carregarLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    
    // Verificar se data tem a propriedade logs e se é um array
    const logs = data.logs || [];
    
    if (!Array.isArray(logs)) {
      console.error('Resposta da API não contém array de logs:', data);
      return;
    }
    
    const tbody = document.querySelector('#logs-table tbody');
    if (!tbody) return;
    
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum log encontrado</td></tr>';
      return;
    }
    
    tbody.innerHTML = logs.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
        <td>${log.session_name || 'N/A'}</td>
        <td>${log.destination || 'N/A'}</td>
        <td>
          <span class="badge ${getLogStatusBadgeClass(log.status)}">
            ${getLogStatusText(log.status)}
          </span>
        </td>
        <td>${log.attempts || 0}</td>
        <td>
          <small class="text-muted">${log.error_message || 'Sem erros'}</small>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error('Erro ao carregar logs:', err);
    const tbody = document.querySelector('#logs-table tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar logs</td></tr>';
    }
  }
}

function getLogStatusBadgeClass(status) {
  switch (status) {
    case 'success': return 'bg-success';
    case 'failed': return 'bg-danger';
    case 'pending': return 'bg-warning';
    default: return 'bg-secondary';
  }
}

function getLogStatusText(status) {
  switch (status) {
    case 'success': return 'Sucesso';
    case 'failed': return 'Falhou';
    case 'pending': return 'Pendente';
    default: return 'Desconhecido';
  }
}

// === INICIALIZAÇÃO ===
carregarSessoes()
  .then(() => {
    carregarAgendamentos();
    carregarCategorias();
    setInterval(carregarLogs, 5000);
  });

// Funções auxiliares para formulário
function clearForm() {
  limparFormulario();
}

function testMessage() {
  // Preencher modal de teste com dados do formulário
  const testModal = new bootstrap.Modal(document.getElementById('modalTeste'));
  
  // Copiar sessão selecionada
  const sessionSelect = document.getElementById('test-session');
  const currentSession = document.getElementById('sessao').value;
  sessionSelect.innerHTML = document.getElementById('sessao').innerHTML;
  sessionSelect.value = currentSession;
  
  // Copiar mensagem
  const testMessage = document.getElementById('test-message');
  testMessage.value = document.getElementById('mensagem').value;
  
  testModal.show();
}

async function sendTestMessage() {
  const session = document.getElementById('test-session').value;
  const destination = document.getElementById('test-destination').value;
  const message = document.getElementById('test-message').value;
  
  if (!session || !destination || !message) {
    alert('Preencha todos os campos do teste');
    return;
  }
  
  try {
    const response = await fetch('/api/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session,
        destination,
        message
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Mensagem de teste enviada com sucesso!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modalTeste')).hide();
    } else {
      throw new Error(data.error || 'Erro ao enviar teste');
    }
  } catch (error) {
    console.error('Erro no teste:', error);
    showNotification(`Erro no teste: ${error.message}`, 'danger');
  }
}