// Estado global da aplicação
let currentSection = 'dashboard';
let currentUser = null;
let sessionPollingInterval = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  setupNavigation();
  loadSection('dashboard');
});

// Verificar autenticação
async function checkAuth() {
  try {
    const response = await fetch('/api/admin/me');
    if (response.ok) {
      const data = await response.json();
      currentUser = data;
      document.getElementById('username-display').textContent = data.username;
    } else {
      window.location.href = '/admin/';
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    window.location.href = '/admin/';
  }
}

// Configurar navegação
function setupNavigation() {
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = e.target.closest('[data-section]').dataset.section;
      loadSection(section);
    });
  });
}

// Carregar seção
async function loadSection(section) {
  // Atualizar navegação ativa
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-section="${section}"]`).classList.add('active');
  
  // Atualizar título
  const titles = {
    dashboard: 'Dashboard',
    sessions: 'Sessões WhatsApp',
    scheduler: 'Agendador de Mensagens',
    schedules: 'Agendamentos',
    logs: 'Logs e Histórico',
    settings: 'Configurações'
  };
  document.getElementById('page-title').textContent = titles[section];
  
  currentSection = section;
  
  // Carregar conteúdo
  try {
    switch (section) {
      case 'dashboard':
        await loadDashboard();
        break;
      case 'sessions':
        await loadSessions();
        break;
      case 'scheduler':
        await loadScheduler();
        break;
      case 'schedules':
        await loadSchedules();
        break;
      case 'logs':
        await loadLogs();
        break;
      case 'settings':
        await loadSettings();
        break;
    }
  } catch (error) {
    showError(`Erro ao carregar seção: ${error.message}`);
  }
}

// Dashboard
async function loadDashboard() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/dashboard');
        
        if (!response.ok) {
            if (response.status === 403) {
                const data = await response.json();
                if (data.setupRequired) {
                    window.location.href = '/admin/';
                    return;
                }
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Primeiro, criar o HTML do dashboard
        const container = document.getElementById('content-container');
        if (container) {
            container.innerHTML = `
                <div class="row">
                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                            Total de Agendamentos
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="total-schedules">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="bi bi-calendar-check fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-warning shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                            Pendentes
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="pending-schedules">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="bi bi-clock fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-success shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                            Enviados
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="sent-schedules">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="bi bi-check-circle fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-danger shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                            Falharam
                                        </div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="failed-schedules">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="bi bi-x-circle fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ações Rápidas -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card shadow">
                            <div class="card-header bg-white py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Ações Rápidas</h6>
                            </div>
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-md-3">
                                        <button class="btn btn-primary btn-lg w-100 mb-2" onclick="loadSection('sessions')">
                                            <i class="bi bi-phone d-block mb-2" style="font-size: 2rem;"></i>
                                            Conectar WhatsApp
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-success btn-lg w-100 mb-2" onclick="loadSection('scheduler')">
                                            <i class="bi bi-calendar-plus d-block mb-2" style="font-size: 2rem;"></i>
                                            Novo Agendamento
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-info btn-lg w-100 mb-2" onclick="loadSection('schedules')">
                                            <i class="bi bi-list-task d-block mb-2" style="font-size: 2rem;"></i>
                                            Ver Agendamentos
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-secondary btn-lg w-100 mb-2" onclick="loadSection('logs')">
                                            <i class="bi bi-journal-text d-block mb-2" style="font-size: 2rem;"></i>
                                            Ver Logs
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-xl-6 col-lg-7">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                                <h6 class="m-0 font-weight-bold text-primary">Taxa de Sucesso</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center">
                                    <div class="h2 mb-0 font-weight-bold text-gray-800" id="success-rate">0%</div>
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Taxa de Entrega
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-6 col-lg-5">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                                <h6 class="m-0 font-weight-bold text-primary">Total de Logs</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center">
                                    <div class="h2 mb-0 font-weight-bold text-gray-800" id="total-logs">0</div>
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        Registros do Sistema
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow mb-4">
                    <div class="card-header py-3">
                        <h6 class="m-0 font-weight-bold text-primary">Logs Recentes</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered" width="100%" cellspacing="0">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Sessão</th>
                                        <th>Destino</th>
                                        <th>Status</th>
                                        <th>Tentativas</th>
                                    </tr>
                                </thead>
                                <tbody id="recent-logs">
                                    <tr>
                                        <td colspan="5" class="text-center">Carregando logs...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card shadow">
                            <div class="card-body">
                                <div class="text-center">
                                    <small class="text-muted">
                                        Última atualização: <span id="last-update">Carregando...</span>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Aguardar um pouco para garantir que os elementos foram criados
        setTimeout(() => {
            // Atualizar estatísticas com verificação de existência
            const totalSchedulesEl = document.getElementById('total-schedules');
            const pendingSchedulesEl = document.getElementById('pending-schedules');
            const sentSchedulesEl = document.getElementById('sent-schedules');
            const failedSchedulesEl = document.getElementById('failed-schedules');
            const totalLogsEl = document.getElementById('total-logs');
            const successRateEl = document.getElementById('success-rate');
            const lastUpdateEl = document.getElementById('last-update');

            if (totalSchedulesEl) totalSchedulesEl.textContent = data.totalSchedules || 0;
            if (pendingSchedulesEl) pendingSchedulesEl.textContent = data.pendingSchedules || 0;
            if (sentSchedulesEl) sentSchedulesEl.textContent = data.sentSchedules || 0;
            if (failedSchedulesEl) failedSchedulesEl.textContent = data.failedSchedules || 0;
            if (totalLogsEl) totalLogsEl.textContent = data.totalLogs || 0;

            // Calcular taxa de sucesso
            const total = (data.sentSchedules || 0) + (data.failedSchedules || 0);
            const successRate = total > 0 ? Math.round((data.sentSchedules / total) * 100) : 0;
            if (successRateEl) successRateEl.textContent = successRate + '%';

            // Carregar logs recentes
            loadRecentLogs(data.recentLogs || []);
            
            // Atualizar timestamp
            if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString('pt-BR');
        }, 100);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function loadRecentLogs(logs) {
    const tbody = document.getElementById('recent-logs');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum log encontrado</td></tr>';
        return;
    }

    logs.forEach(log => {
        const row = document.createElement('tr');
        const statusClass = log.status === 'sent' ? 'success' : 
                           log.status === 'failed' ? 'danger' : 'warning';
        
        row.innerHTML = `
            <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
            <td>${log.session_name || '-'}</td>
            <td>${log.destination || '-'}</td>
            <td><span class="badge bg-${statusClass}">${log.status}</span></td>
            <td>${log.attempts || 0}</td>
        `;
        tbody.appendChild(row);
    });
}

// Nova seção: Agendador integrado
async function loadScheduler() {
  const container = document.getElementById('content-container');
  
  try {
    showLoading(true);
    
    // Carregar dados necessários
    const [sessionsRes, categoriesRes] = await Promise.all([
      fetch('/api/sessions'),
      fetch('/api/mensagens')
    ]);
    
    const sessionsData = await sessionsRes.json();
    const categories = await categoriesRes.json();
    
    const sessions = sessionsData.sessions || [];
    
    container.innerHTML = `
      <div class="row">
        <!-- Formulário de Agendamento -->
        <div class="col-lg-8">
          <div class="card shadow">
            <div class="card-header bg-white py-3">
              <h5 class="mb-0 d-flex align-items-center">
                <i class="bi bi-calendar-plus me-2 text-primary"></i>
                Novo Agendamento
              </h5>
            </div>
            <div class="card-body">
              <form id="scheduler-form">
                <!-- Linha 1: Sessão / Destino -->
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label for="scheduler-session" class="form-label fw-semibold">
                      <i class="bi bi-phone me-1"></i>
                      Sessão WhatsApp
                    </label>
                    <select id="scheduler-session" name="session" class="form-select" required>
                      <option value="">Selecione uma sessão</option>
                      ${sessions.map(s => `
                        <option value="${s.name}">${s.name} (${getStatusText(s.status)})</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label for="scheduler-destination" class="form-label fw-semibold">
                      <i class="bi bi-person me-1"></i>
                      Destino (número com DDD)
                    </label>
                    <input type="text" id="scheduler-destination" name="destination" class="form-control"
                      placeholder="Ex: 5511999999999" pattern="\\d{10,15}" />
                  </div>
                </div>

                <!-- Linha 2: Tipo / Categoria / Data -->
                <div class="row mb-3">
                  <div class="col-md-4">
                    <label for="scheduler-type" class="form-label fw-semibold">
                      <i class="bi bi-arrow-repeat me-1"></i>
                      Tipo de Agendamento
                    </label>
                    <select id="scheduler-type" name="type" class="form-select">
                      <option value="unico" selected>Enviar uma vez</option>
                      <option value="recorrente">Enviar a cada X dias</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label for="scheduler-category" class="form-label fw-semibold">
                      <i class="bi bi-tags me-1"></i>
                      Categoria da mensagem
                    </label>
                    <select id="scheduler-category" name="category" class="form-select">
                      <option value="">Nenhuma (mensagem personalizada)</option>
                      ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                  </div>
                  <div class="col-md-4" id="scheduler-datetime-container">
                    <label for="scheduler-datetime" class="form-label fw-semibold">
                      <i class="bi bi-calendar-event me-1"></i>
                      Enviar em (data e hora)
                    </label>
                    <input type="datetime-local" id="scheduler-datetime" name="datetime" class="form-control" required />
                  </div>
                  <div class="col-md-4" id="scheduler-interval-container" style="display: none;">
                    <label for="scheduler-interval" class="form-label fw-semibold">
                      <i class="bi bi-clock me-1"></i>
                      Repetir a cada (dias)
                    </label>
                    <input type="number" id="scheduler-interval" name="interval" min="1" value="1" class="form-control" />
                  </div>
                </div>

                <!-- Linha 3: Grupos / Mensagem -->
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      <i class="bi bi-people me-1"></i>
                      Selecione grupos (opcional)
                    </label>
                    <div id="scheduler-groups" class="border rounded-3 p-3 bg-light" style="min-height: 200px; max-height: 300px; overflow-y: auto;">
                      <div class="text-center text-muted py-4">
                        <p class="mb-0">Selecione uma sessão para carregar grupos</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label for="scheduler-message" class="form-label fw-semibold">
                      <i class="bi bi-chat-text me-1"></i>
                      Mensagem
                    </label>
                    <textarea id="scheduler-message" name="message" rows="10" class="form-control" required 
                              placeholder="Digite sua mensagem aqui..."></textarea>
                    <div class="form-text">
                      <span id="scheduler-char-count">0</span>/1000 caracteres
                    </div>
                  </div>
                </div>

                <!-- Botões -->
                <div class="text-center">
                  <button type="submit" class="btn btn-success btn-lg me-3">
                    <i class="bi bi-send me-2"></i> 
                    Agendar Mensagem
                  </button>
                  <button type="button" class="btn btn-outline-secondary btn-lg" onclick="clearSchedulerForm()">
                    <i class="bi bi-arrow-clockwise me-2"></i> 
                    Limpar Formulário
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Painel de Status -->
        <div class="col-lg-4">
          <div class="card shadow mb-4">
            <div class="card-header bg-white">
              <h6 class="mb-0">Status das Sessões</h6>
            </div>
            <div class="card-body">
              <div id="scheduler-sessions-status">
                ${renderSessionsStatus(sessions)}
              </div>
            </div>
          </div>

          <div class="card shadow">
            <div class="card-header bg-white">
              <h6 class="mb-0">Dicas</h6>
            </div>
            <div class="card-body">
              <ul class="list-unstyled mb-0">
                <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Use números com DDD (55 + DDD + número)</li>
                <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Teste mensagens antes de agendar</li>
                <li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>Verifique se a sessão está conectada</li>
                <li><i class="bi bi-check-circle text-success me-2"></i>Use variáveis: {data}, {hora}, {dia_semana}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Setup event listeners
    setupSchedulerEventListeners();
    
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar agendador: ${error.message}</div>`;
  } finally {
    showLoading(false);
  }
}

function renderSessionsStatus(sessions) {
  if (!sessions || sessions.length === 0) {
    return `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Nenhuma sessão encontrada. <a href="#" onclick="loadSection('sessions')">Conecte uma sessão</a> primeiro.
      </div>
    `;
  }
  
  return sessions.map(session => `
    <div class="d-flex align-items-center mb-2 p-2 border rounded">
      <i class="bi bi-whatsapp ${getStatusIconColor(session.status)} me-2"></i>
      <div class="flex-grow-1">
        <small class="fw-bold">${session.name}</small><br>
        <span class="badge ${getStatusBadgeClass(session.status)} badge-sm">
          ${getStatusText(session.status)}
        </span>
      </div>
    </div>
  `).join('');
}

function setupSchedulerEventListeners() {
  // Contador de caracteres
  const messageTextarea = document.getElementById('scheduler-message');
  const charCount = document.getElementById('scheduler-char-count');
  
  if (messageTextarea && charCount) {
    messageTextarea.addEventListener('input', function() {
      const count = this.value.length;
      charCount.textContent = count;
      
      if (count > 1000) {
        charCount.classList.add('text-danger');
      } else {
        charCount.classList.remove('text-danger');
      }
    });
  }
  
  // Mudança de tipo de agendamento
  const typeSelect = document.getElementById('scheduler-type');
  const datetimeContainer = document.getElementById('scheduler-datetime-container');
  const intervalContainer = document.getElementById('scheduler-interval-container');
  
  if (typeSelect) {
    typeSelect.addEventListener('change', function() {
      if (this.value === 'recorrente') {
        intervalContainer.style.display = 'block';
      } else {
        intervalContainer.style.display = 'none';
      }
    });
  }
  
  // Mudança de sessão - carregar grupos
  const sessionSelect = document.getElementById('scheduler-session');
  if (sessionSelect) {
    sessionSelect.addEventListener('change', function() {
      loadGroupsForSession(this.value);
    });
  }
  
  // Mudança de categoria - carregar mensagem
  const categorySelect = document.getElementById('scheduler-category');
  if (categorySelect && messageTextarea) {
    categorySelect.addEventListener('change', async function() {
      if (this.value) {
        try {
          const response = await fetch(`/api/mensagens/${this.value}`);
          const data = await response.json();
          if (data.mensagem) {
            messageTextarea.value = data.mensagem;
            messageTextarea.dispatchEvent(new Event('input'));
          }
        } catch (error) {
          console.error('Erro ao carregar mensagem da categoria:', error);
        }
      } else {
        messageTextarea.value = '';
        messageTextarea.dispatchEvent(new Event('input'));
      }
    });
  }
  
  // Submit do formulário
  const form = document.getElementById('scheduler-form');
  if (form) {
    form.addEventListener('submit', handleSchedulerSubmit);
  }
}

async function loadGroupsForSession(sessionName) {
  const groupsContainer = document.getElementById('scheduler-groups');
  if (!groupsContainer) return;
  
  if (!sessionName) {
    groupsContainer.innerHTML = `
      <div class="text-center text-muted py-4">
        <p class="mb-0">Selecione uma sessão para carregar grupos</p>
      </div>
    `;
    return;
  }
  
  groupsContainer.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <p class="mt-2 mb-0">Carregando grupos...</p>
    </div>
  `;
  
  try {
    const response = await fetch(`/api/admin/sessions/${sessionName}/chats`);
    const chats = await response.json();
    const groups = chats.filter(c => c.isGroup);
    
    if (groups.length === 0) {
      groupsContainer.innerHTML = `
        <div class="text-center text-muted py-4">
          <p class="mb-0">Nenhum grupo encontrado nesta sessão</p>
        </div>
      `;
      return;
    }
    
    groupsContainer.innerHTML = groups.map(group => `
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" value="${group.id}" id="group-${group.id}">
        <label class="form-check-label" for="group-${group.id}">
          ${group.nome}
        </label>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erro ao carregar grupos:', error);
    groupsContainer.innerHTML = `
      <div class="alert alert-danger">
        Erro ao carregar grupos: ${error.message}
      </div>
    `;
  }
}

async function handleSchedulerSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const session = formData.get('session');
  const destination = formData.get('destination');
  const message = formData.get('message');
  const datetime = formData.get('datetime');
  const type = formData.get('type');
  const interval = formData.get('interval');
  const category = formData.get('category');
  
  // Coletar grupos selecionados
  const selectedGroups = Array.from(document.querySelectorAll('#scheduler-groups input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  
  // Validações
  if (!session) {
    showError('Selecione uma sessão');
    return;
  }
  
  if (!destination && selectedGroups.length === 0) {
    showError('Informe um destino ou selecione grupos');
    return;
  }
  
  if (!message && !category) {
    showError('Digite uma mensagem ou selecione uma categoria');
    return;
  }
  
  if (!datetime) {
    showError('Selecione data e hora');
    return;
  }
  
  const sendAt = new Date(datetime);
  if (sendAt < new Date()) {
    showError('Data/hora deve ser no futuro');
    return;
  }
  
  try {
    showLoading(true);
    
    // Determinar destinos
    const destinations = destination ? [destination] : selectedGroups;
    
    // Criar agendamentos
    for (const dest of destinations) {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao: session,
          destino: dest,
          mensagem: message,
          enviarEm: sendAt.toISOString(),
          tipoAgendamento: type,
          intervaloDias: type === 'recorrente' ? parseInt(interval) : null,
          categoriaMensagem: category || null
        })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar agendamento');
      }
    }
    
    showSuccess(`${destinations.length} agendamento(s) criado(s) com sucesso!`);
    clearSchedulerForm();
    
    // Atualizar dashboard se estiver visível
    if (currentSection === 'dashboard') {
      setTimeout(() => loadDashboard(), 1000);
    }
    
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    showError(`Erro ao criar agendamento: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

function clearSchedulerForm() {
  const form = document.getElementById('scheduler-form');
  if (form) {
    form.reset();
    
    // Limpar grupos selecionados
    const groupsContainer = document.getElementById('scheduler-groups');
    if (groupsContainer) {
      groupsContainer.innerHTML = `
        <div class="text-center text-muted py-4">
          <p class="mb-0">Selecione uma sessão para carregar grupos</p>
        </div>
      `;
    }
    
    // Reset contador de caracteres
    const charCount = document.getElementById('scheduler-char-count');
    if (charCount) {
      charCount.textContent = '0';
      charCount.classList.remove('text-danger');
    }
    
    // Reset tipo de agendamento
    const intervalContainer = document.getElementById('scheduler-interval-container');
    if (intervalContainer) {
      intervalContainer.style.display = 'none';
    }
  }
}

// Sessões
async function loadSessions() {
  const container = document.getElementById('content-container');
  
  try {
    showLoading(true);
    console.log('🔄 Carregando sessões...');
    
    const response = await fetch('/api/admin/sessions');
    console.log('📡 Resposta da API:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Dados recebidos:', data);
    
    container.innerHTML = `
      <div class="card shadow">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0 d-flex align-items-center">
            <i class="bi bi-phone me-2 text-primary"></i>
            Sessões WhatsApp
          </h5>
          <button class="btn btn-outline-secondary btn-sm" onclick="refreshSessions()">
            <i class="bi bi-arrow-clockwise"></i> Atualizar
          </button>
        </div>
        <div class="card-body">
          <div id="sessions-container">
            ${renderSessions(data.sessions || [])}
          </div>
          
          <div class="alert alert-info mt-4">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Como conectar:</strong> Clique em "Conectar" para gerar um QR Code e escaneie com seu WhatsApp.
          </div>
        </div>
      </div>
    `;
    
    // Iniciar polling se houver sessões conectando
    const connectingSessions = (data.sessions || []).filter(s => 
      s.status === 'qr_ready' || s.status === 'connecting'
    );
    
    if (connectingSessions.length > 0) {
      console.log('🔄 Iniciando polling para sessões conectando:', connectingSessions.length);
      startSessionPolling();
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar sessões:', error);
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar sessões: ${error.message}</div>`;
  } finally {
    showLoading(false);
  }
}

function renderSessions(sessions) {
  if (!sessions || sessions.length === 0) {
    return `
      <div class="row">
        <div class="col-md-6">
          <div class="card border-left-primary">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="me-3">
                  <i class="bi bi-whatsapp text-success" style="font-size: 2rem;"></i>
                </div>
                <div>
                  <h6 class="mb-1">Sessão Principal</h6>
                  <p class="mb-1"><span class="badge bg-danger">Desconectado</span></p>
                  <small class="text-muted">Nunca conectado</small>
                </div>
                <div class="ms-auto">
                  <button class="btn btn-outline-primary btn-sm" onclick="connectSession('main')">
                    <i class="bi bi-link"></i> Conectar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="row">
      ${sessions.map(session => `
        <div class="col-md-6 mb-3">
          <div class="card border-left-${getSessionBorderColor(session.status)}">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="me-3">
                  <i class="bi bi-whatsapp ${getSessionIconColor(session.status)}" style="font-size: 2rem;"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1">Sessão: ${session.name}</h6>
                  <p class="mb-1">
                    <span class="badge ${getSessionBadgeClass(session.status)}">
                      ${getStatusText(session.status)}
                    </span>
                  </p>
                  <small class="text-muted">
                    Última atualização: ${session.lastUpdate ? new Date(session.lastUpdate).toLocaleString('pt-BR') : 'Nunca'}
                  </small>
                </div>
                <div class="ms-auto">
                  ${renderSessionActions(session)}
                </div>
              </div>
              ${session.status === 'qr_ready' && session.qrCode ? renderQRCode(session.name, session.qrCode) : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSessionActions(session) {
  switch (session.status) {
    case 'connected':
      return `
        <div class="btn-group-vertical btn-group-sm">
          <button class="btn btn-outline-danger btn-sm" onclick="disconnectSession('${session.name}')">
            <i class="bi bi-x-circle"></i> Desconectar
          </button>
          <button class="btn btn-outline-warning btn-sm mt-1" onclick="restartSession('${session.name}')">
            <i class="bi bi-arrow-clockwise"></i> Reiniciar
          </button>
        </div>
      `;
    case 'qr_ready':
      return `
        <button class="btn btn-outline-warning btn-sm" onclick="disconnectSession('${session.name}')">
          <i class="bi bi-x-circle"></i> Cancelar
        </button>
      `;
    case 'connecting':
    case 'authenticated':
      return `
        <button class="btn btn-outline-secondary btn-sm" disabled>
          <div class="spinner-border spinner-border-sm me-1" role="status"></div>
          Conectando...
        </button>
      `;
    default:
      return `
        <button class="btn btn-outline-primary btn-sm" onclick="connectSession('${session.name}')">
          <i class="bi bi-link"></i> Conectar
        </button>
      `;
  }
}

function renderQRCode(sessionName, qrCode) {
  return `
    <div class="mt-3 p-3 bg-light rounded text-center">
      <h6 class="mb-2">Escaneie o QR Code com seu WhatsApp:</h6>
      <div id="qr-${sessionName}" class="mb-2"></div>
      <small class="text-muted">O QR Code expira em alguns minutos</small>
    </div>
  `;
}

function getSessionBorderColor(status) {
  switch (status) {
    case 'connected': return 'success';
    case 'qr_ready': return 'warning';
    case 'connecting': case 'authenticated': return 'info';
    case 'auth_failed': return 'danger';
    default: return 'secondary';
  }
}

function getSessionIconColor(status) {
  switch (status) {
    case 'connected': return 'text-success';
    case 'qr_ready': return 'text-warning';
    case 'connecting': case 'authenticated': return 'text-info';
    case 'auth_failed': return 'text-danger';
    default: return 'text-muted';
  }
}

function getSessionBadgeClass(status) {
  switch (status) {
    case 'connected': return 'bg-success';
    case 'qr_ready': return 'bg-warning';
    case 'connecting': case 'authenticated': return 'bg-info';
    case 'auth_failed': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'connected': return 'Conectado';
    case 'qr_ready': return 'QR Code Pronto';
    case 'connecting': return 'Conectando';
    case 'authenticated': return 'Autenticado';
    case 'auth_failed': return 'Falha na Autenticação';
    case 'disconnected': return 'Desconectado';
    default: return 'Desconhecido';
  }
}

// Funções de controle de sessão
async function connectSession(sessionName) {
  try {
    showLoading(true);
    console.log(`🔄 Tentando conectar sessão: ${sessionName}`);
    
    const response = await fetch(`/api/admin/sessions/${sessionName}/connect`, {
      method: 'POST'
    });
    
    console.log('📡 Resposta da conexão:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Dados da conexão:', data);
    
    if (data.success) {
      showSuccess('Sessão inicializada! Aguarde o QR Code...');
      // Recarregar sessões após um pequeno delay
      setTimeout(() => {
        console.log('🔄 Recarregando sessões após conexão...');
        refreshSessions();
        startSessionPolling();
      }, 2000);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar sessão:', error);
    showError(`Erro ao conectar sessão: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

async function disconnectSession(sessionName) {
  if (!confirm(`Tem certeza que deseja desconectar a sessão "${sessionName}"?`)) {
    return;
  }
  
  try {
    showLoading(true);
    
    const response = await fetch(`/api/admin/sessions/${sessionName}/disconnect`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showSuccess('Sessão desconectada com sucesso!');
      refreshSessions();
      stopSessionPolling();
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('Erro ao desconectar sessão:', error);
    showError(`Erro ao desconectar sessão: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

async function restartSession(sessionName) {
  if (!confirm(`Tem certeza que deseja reiniciar a sessão "${sessionName}"?`)) {
    return;
  }
  
  try {
    showLoading(true);
    
    const response = await fetch(`/api/admin/sessions/${sessionName}/restart`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      showSuccess('Sessão reiniciada! Aguarde o novo QR Code...');
      // Recarregar sessões após um pequeno delay
      setTimeout(() => {
        refreshSessions();
        startSessionPolling();
      }, 3000);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
  } catch (error) {
    console.error('Erro ao reiniciar sessão:', error);
    showError(`Erro ao reiniciar sessão: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

async function refreshSessions() {
  if (currentSection === 'sessions') {
    await loadSessions();
  }
}

// Polling para atualizar status das sessões
function startSessionPolling() {
  if (sessionPollingInterval) {
    clearInterval(sessionPollingInterval);
  }
  
  sessionPollingInterval = setInterval(async () => {
    if (currentSection === 'sessions') {
      try {
        const response = await fetch('/api/admin/sessions');
        const data = await response.json();
        
        // Atualizar apenas o container de sessões sem recarregar toda a página
        const container = document.getElementById('sessions-container');
        if (container) {
          container.innerHTML = renderSessions(data.sessions || []);
          
          // Renderizar QR codes se necessário
          const sessions = data.sessions || [];
          sessions.forEach(session => {
            if (session.status === 'qr_ready' && session.qrCode) {
              renderQRCodeImage(session.name, session.qrCode);
            }
          });
          
          // Parar polling se não há mais sessões conectando
          const connectingSessions = sessions.filter(s => 
            s.status === 'qr_ready' || s.status === 'connecting'
          );
          
          if (connectingSessions.length === 0) {
            stopSessionPolling();
          }
        }
      } catch (error) {
        console.error('Erro no polling de sessões:', error);
      }
    } else {
      stopSessionPolling();
    }
  }, 3000); // Atualizar a cada 3 segundos
}

function stopSessionPolling() {
  if (sessionPollingInterval) {
    clearInterval(sessionPollingInterval);
    sessionPollingInterval = null;
  }
}

// Renderizar QR Code como imagem
function renderQRCodeImage(sessionName, qrCode) {
  const qrContainer = document.getElementById(`qr-${sessionName}`);
  if (qrContainer && qrCode) {
    // Limpar container anterior
    qrContainer.innerHTML = `
      <div class="qr-code-container" style="background: white; padding: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div id="qrcode-${sessionName}"></div>
      </div>
    `;
    
    // Usar a biblioteca QRCode.js
    if (typeof QRCode !== 'undefined') {
      try {
        QRCode.toCanvas(document.getElementById(`qrcode-${sessionName}`), qrCode, {
          width: 200,
          height: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }, function (error) {
          if (error) {
            console.error('Erro ao gerar QR Code:', error);
            // Fallback para serviço online
            document.getElementById(`qrcode-${sessionName}`).innerHTML = `
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}" 
                   alt="QR Code" style="max-width: 100%; height: auto; border-radius: 4px;">
            `;
          }
        });
      } catch (error) {
        console.error('Erro ao usar QRCode.js:', error);
        // Fallback para serviço online
        document.getElementById(`qrcode-${sessionName}`).innerHTML = `
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}" 
               alt="QR Code" style="max-width: 100%; height: auto; border-radius: 4px;">
        `;
      }
    } else {
      // Fallback: usar um serviço online de QR code
      document.getElementById(`qrcode-${sessionName}`).innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}" 
             alt="QR Code" style="max-width: 100%; height: auto; border-radius: 4px;">
      `;
    }
  }
}

// Agendamentos
async function loadSchedules() {
  const container = document.getElementById('content-container');
  
  try {
    const response = await fetch('/api/admin/schedules');
    const data = await response.json();
    
    container.innerHTML = `
      <div class="card shadow">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0 d-flex align-items-center">
            <i class="bi bi-calendar-event me-2 text-primary"></i>
            Agendamentos
          </h5>
          <div>
            <button class="btn btn-success btn-sm me-2" onclick="loadSection('scheduler')">
              <i class="bi bi-plus"></i> Novo Agendamento
            </button>
            <button class="btn btn-outline-secondary btn-sm" onclick="refreshData()">
              <i class="bi bi-arrow-clockwise"></i> Atualizar
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Sessão</th>
                  <th>Destino</th>
                  <th>Tipo</th>
                  <th>Enviar em</th>
                  <th>Status</th>
                  <th>Tentativas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${data.schedules && data.schedules.length > 0 ? 
                  data.schedules.map(schedule => `
                    <tr>
                      <td>${schedule.id}</td>
                      <td>${schedule.session_name}</td>
                      <td>${schedule.destination}</td>
                      <td>
                        <span class="badge ${schedule.schedule_type === 'recurring' ? 'bg-info' : 'bg-secondary'}">
                          ${schedule.schedule_type === 'recurring' ? 'Recorrente' : 'Único'}
                        </span>
                      </td>
                      <td>${new Date(schedule.send_at).toLocaleString('pt-BR')}</td>
                      <td>
                        <span class="badge ${getScheduleStatusBadgeClass(schedule.status)}">
                          ${schedule.status}
                        </span>
                      </td>
                      <td>${schedule.attempts}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-success" onclick="executeSchedule(${schedule.id})" 
                                  ${schedule.status !== 'pending' ? 'disabled' : ''}>
                            <i class="bi bi-play"></i>
                          </button>
                          <button class="btn btn-outline-danger" onclick="deleteSchedule(${schedule.id})">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('') :
                  '<tr><td colspan="8" class="text-center py-4 text-muted">Nenhum agendamento encontrado</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar agendamentos: ${error.message}</div>`;
  }
}

// Logs
async function loadLogs() {
  const container = document.getElementById('content-container');
  
  try {
    const response = await fetch('/api/admin/logs?limit=100');
    const data = await response.json();
    
    container.innerHTML = `
      <div class="card shadow">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 class="mb-0 d-flex align-items-center">
            <i class="bi bi-list-ul me-2 text-primary"></i>
            Logs de Envio
          </h5>
          <div>
            <button class="btn btn-outline-secondary btn-sm" onclick="exportLogs()">
              <i class="bi bi-download"></i> Exportar CSV
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>Data</th>
                  <th>Sessão</th>
                  <th>Destino</th>
                  <th>Status</th>
                  <th>Tentativas</th>
                  <th>Erro</th>
                </tr>
              </thead>
              <tbody>
                ${data.logs && data.logs.length > 0 ?
                  data.logs.map(log => `
                    <tr>
                      <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                      <td>${log.session_name}</td>
                      <td>${log.destination}</td>
                      <td>
                        <span class="badge ${log.status === 'sent' ? 'bg-success' : 'bg-danger'}">
                          ${log.status}
                        </span>
                      </td>
                      <td>${log.attempts}</td>
                      <td>
                        ${log.error_message ? 
                          `<span class="text-danger" title="${log.error_message}">${log.error_message.substring(0, 30)}...</span>` : 
                          '-'
                        }
                      </td>
                    </tr>
                  `).join('') :
                  '<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum log encontrado</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar logs: ${error.message}</div>`;
  }
}

// Configurações
async function loadSettings() {
  const container = document.getElementById('content-container');
  
  container.innerHTML = `
    <div class="row">
      <div class="col-lg-8">
        <div class="card shadow">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 d-flex align-items-center">
              <i class="bi bi-gear me-2 text-primary"></i>
              Configurações do Sistema
            </h5>
          </div>
          <div class="card-body">
            <form id="settingsForm">
              <div class="mb-3">
                <label for="webhook_url" class="form-label">URL do Webhook</label>
                <input type="url" class="form-control" id="webhook_url" value="" 
                       placeholder="https://seu-webhook.com/endpoint">
                <div class="form-text">URL para receber notificações de envio</div>
              </div>
              
              <div class="mb-3">
                <label for="max_attempts" class="form-label">Máximo de Tentativas</label>
                <input type="number" class="form-control" id="max_attempts" value="3" 
                       min="1" max="10">
                <div class="form-text">Número máximo de tentativas para envio</div>
              </div>
              
              <div class="mb-3">
                <label for="retry_intervals" class="form-label">Intervalos de Retry (segundos)</label>
                <input type="text" class="form-control" id="retry_intervals" 
                       value="30, 120, 300"
                       placeholder="30, 120, 300">
                <div class="form-text">Intervalos entre tentativas, separados por vírgula</div>
              </div>
              
              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check"></i> Salvar Configurações
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="testWebhook()">
                  <i class="bi bi-lightning"></i> Testar Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card shadow">
          <div class="card-header bg-white">
            <h6 class="mb-0">Informações do Sistema</h6>
          </div>
          <div class="card-body">
            <p class="mb-2"><strong>Versão:</strong> 1.0.0</p>
            <p class="mb-2"><strong>Plataforma:</strong> Node.js</p>
            <p class="mb-0"><strong>Status:</strong> <span class="badge bg-success">Online</span></p>
          </div>
        </div>
        
        <div class="card shadow mt-4">
          <div class="card-header bg-white">
            <h6 class="mb-0">Sistema Integrado</h6>
          </div>
          <div class="card-body">
            <div class="alert alert-success">
              <i class="bi bi-check-circle me-2"></i>
              <strong>Tudo integrado!</strong><br>
              Agora você tem acesso a todas as funcionalidades em um só lugar:
              <ul class="mt-2 mb-0">
                <li>Conexão WhatsApp com QR Code</li>
                <li>Agendamento de mensagens</li>
                <li>Monitoramento de logs</li>
                <li>Gerenciamento completo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Setup form handler
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
}

// Funções auxiliares
function getScheduleStatusBadgeClass(status) {
  switch (status) {
    case 'sent': return 'bg-success';
    case 'failed': return 'bg-danger';
    case 'pending': return 'bg-warning';
    default: return 'bg-secondary';
  }
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.content-area');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'block' : 'none';
    }
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="bi bi-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.content-area');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Funções de ação
async function refreshData() {
  console.log('🔄 Atualizando dados...');
  
  switch (currentSection) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'sessions':
      refreshSessions();
      break;
    case 'scheduler':
      loadScheduler();
      break;
    case 'schedules':
      loadSchedules();
      break;
    case 'logs':
      loadLogs();
      break;
    case 'settings':
      loadSettings();
      break;
    default:
      loadDashboard();
  }
}

async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/';
  } catch (error) {
    console.error('Erro no logout:', error);
    window.location.href = '/admin/';
  }
}

async function deleteSchedule(id) {
  if (confirm('Tem certeza que deseja deletar este agendamento?')) {
    try {
      const response = await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showSuccess('Agendamento deletado com sucesso!');
        refreshData();
      } else {
        showError('Erro ao deletar agendamento');
      }
    } catch (error) {
      showError('Erro de conexão');
    }
  }
}

async function executeSchedule(id) {
  try {
    const response = await fetch(`/api/admin/schedules/${id}/execute`, { method: 'POST' });
    if (response.ok) {
      showSuccess('Agendamento marcado para execução imediata');
      refreshData();
    } else {
      showError('Erro ao executar agendamento');
    }
  } catch (error) {
    showError('Erro de conexão');
  }
}

function exportLogs() {
  window.open('/api/admin/logs/export', '_blank');
}

async function saveSettings(e) {
  e.preventDefault();
  
  const webhookUrl = document.getElementById('webhook_url').value;
  const maxAttempts = parseInt(document.getElementById('max_attempts').value);
  const retryIntervalsStr = document.getElementById('retry_intervals').value;
  
  try {
    const retryIntervals = retryIntervalsStr.split(',').map(s => parseInt(s.trim()));
    
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        max_attempts: maxAttempts,
        retry_intervals: retryIntervals
      })
    });
    
    if (response.ok) {
      showSuccess('Configurações salvas com sucesso!');
    } else {
      const error = await response.json();
      showError(`Erro: ${error.error}`);
    }
  } catch (error) {
    showError('Erro ao salvar configurações');
  }
}

async function testWebhook() {
  try {
    const response = await fetch('/api/admin/test-webhook', { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      showSuccess('Webhook testado com sucesso!');
    } else {
      showError(`Erro no teste: ${data.error}`);
    }
  } catch (error) {
    showError('Erro ao testar webhook');
  }
}