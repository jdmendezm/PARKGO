// PARKGO - Aplicación Client-Side para Portería Web y Empleado Celular
const API_URL = '/api/v1';

let currentToken = null;
let currentUser = null;
let currentInterface = 'PORTERIA'; // 'PORTERIA' o 'EMPLEADO'
let currentMobileTab = 'pase';
let catalogoCache = [];
let filtroActual = 'TODOS';
let currentPorteriaPiso = 'TODOS';
let currentPorteriaModo = 'PLANO';
let currentAdminPage = 'dashboard';
const adminCache = { cupos: [], reservas: [], vehiculos: [], usuarios: [] };

function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // Ignorar si el navegador bloquea almacenamiento local.
  }
}

function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    // Ignorar si el navegador bloquea almacenamiento local.
  }
}

currentToken = safeGetStorage('parkgo_token');
const storedUser = safeGetStorage('parkgo_user');
if (storedUser) {
  try {
    currentUser = JSON.parse(storedUser);
  } catch (err) {
    currentUser = null;
    safeRemoveStorage('parkgo_user');
  }
}

// Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('reservaFecha');
  if (dateInput) dateInput.value = today;

  if (currentToken) {
    verificarSesion();
  } else {
    mostrarLogin();
  }
});

function normalizeRoleLabel(rol) {
  const mappings = {
    ADMIN: 'Admin',
    GUARDA: 'Guarda',
    EMPLEADO: 'Empleado',
    EMPLEADO_CONDUCTOR: 'Empleado',
    USUARIO: 'Usuario'
  };

  return mappings[rol] || (rol ? rol.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Usuario');
}

function resolveDefaultInterfaceForUser(user) {
  const role = String(user?.rol || '').toUpperCase();
  if (['ADMIN', 'ADMIN_EMPRESA', 'SUPERADMIN'].includes(role)) return 'ADMIN';
  return role === 'GUARDA' ? 'PORTERIA' : 'EMPLEADO';
}

function isAdministrator(user = currentUser) {
  return ['ADMIN', 'ADMIN_EMPRESA', 'SUPERADMIN'].includes(String(user?.rol || '').toUpperCase());
}

// Autocompletado rápido de formulario de login
function autofillLogin(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
}

// Navegación entre Login y Registro
function mostrarFormularioRegistro() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('registroSection').classList.remove('hidden');
}

function mostrarFormularioLogin() {
  document.getElementById('registroSection').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
}

// Procesar Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const correo_corporativo = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo_corporativo, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      currentToken = data.token;
      currentUser = data.usuario;
      safeSetStorage('parkgo_token', currentToken);
      safeSetStorage('parkgo_user', JSON.stringify(currentUser));
      currentInterface = resolveDefaultInterfaceForUser(currentUser);
      inicializarDashboard();
    } else {
      alert(`❌ Error de autenticación: ${data.message || 'Credenciales incorrectas'}`);
    }
  } catch (err) {
    alert('❌ Error al conectar con el servidor PARKGO.');
  }
});

// Verificar token guardado en el servidor
async function verificarSesion() {
  if (!currentToken) {
    mostrarLogin();
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.usuario) {
      currentUser = data.usuario;
      safeSetStorage('parkgo_user', JSON.stringify(currentUser));
      currentInterface = resolveDefaultInterfaceForUser(currentUser);
      inicializarDashboard();
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

// Mostrar Dashboard e inicializar vistas
function inicializarDashboard() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('userInfoHeader').classList.remove('hidden');
  const selector = document.getElementById('viewSelectorGroup');
  const adminButton = document.getElementById('btnViewAdmin');
  selector.classList.toggle('hidden', !isAdministrator());
  adminButton.classList.toggle('hidden', !isAdministrator());

  const userName = currentUser.nombre_completo || `${currentUser.nombres || ''} ${currentUser.apellidos || ''}`.trim() || 'Usuario PARKGO';
  document.getElementById('userNameDisplay').innerText = userName;
  document.getElementById('userRoleBadge').innerText = normalizeRoleLabel(currentUser.rol || 'USUARIO');

  currentInterface = resolveDefaultInterfaceForUser(currentUser);
  switchInterface(currentInterface);
}

function setViewButtonState(activeTab) {
  const btnPorteria = document.getElementById('btnViewPorteria');
  const btnEmpleado = document.getElementById('btnViewEmpleado');
  const btnAdmin = document.getElementById('btnViewAdmin');

  if (!btnPorteria || !btnEmpleado) return;

  const basePorteria = 'px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2';
  const baseEmpleado = 'px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2';
  const baseAdmin = 'px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2';

  btnPorteria.className = `${basePorteria} ${activeTab === 'PORTERIA' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`;
  btnEmpleado.className = `${baseEmpleado} ${activeTab === 'EMPLEADO' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`;
  if (btnAdmin) btnAdmin.className = `${baseAdmin} ${activeTab === 'ADMIN' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`;
}

// Conmutar entre Portería Web y Empleado Celular
function switchInterface(targetInterface) {
  if (!isAdministrator()) {
    targetInterface = String(currentUser?.rol || '').toUpperCase() === 'GUARDA' ? 'PORTERIA' : 'EMPLEADO';
  }

  currentInterface = targetInterface;
  const viewPorteria = document.getElementById('interfacePorteriaWeb');
  const viewEmpleado = document.getElementById('interfaceEmpleadoCelular');
  const adminView = document.getElementById('interfaceAdmin');

  setViewButtonState(targetInterface);
  viewPorteria.classList.toggle('hidden', targetInterface !== 'PORTERIA');
  viewEmpleado.classList.toggle('hidden', targetInterface !== 'EMPLEADO');
  adminView.classList.toggle('hidden', targetInterface !== 'ADMIN');

  if (targetInterface === 'PORTERIA') {
    cargarCatalogoPorteria();
  } else if (targetInterface === 'EMPLEADO') {
    setMobileTab(currentMobileTab);
  } else if (targetInterface === 'ADMIN') {
    abrirPaginaAdmin(currentAdminPage);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function setMobileTab(tab) {
  const panels = ['pase', 'historial', 'vehiculos', 'perfil'];
  if (!panels.includes(tab)) return;
  currentMobileTab = tab;

  document.querySelectorAll('[data-mobile-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.mobilePanel !== tab);
  });
  document.querySelectorAll('[data-mobile-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.mobileTab === tab);
  });

  if (tab === 'pase') cargarPaseEmpleado();
  if (tab === 'historial') cargarHistorialEmpleado();
  if (tab === 'vehiculos') cargarVehiculosEmpleado();
  if (tab === 'perfil') cargarPerfilEmpleado();
}

let employeeVehiclesCache = [];
let employeeHistoryCache = [];
let currentModalPiso = 'TODOS';
let cuposDisponiblesCache = [];

async function cargarVehiculosEmpleado() {
  const container = document.getElementById('employeeVehiclesList');
  if (!container) return;
  container.innerHTML = '<p class="admin-loading py-6 text-center text-xs text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-orange-500 mr-1.5"></i> Consultando tu garaje...</p>';

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/vehiculos`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'No se pudieron consultar los vehículos.');

    employeeVehiclesCache = data.vehiculos || [];
    actualizarSelectorVehiculosReserva(employeeVehiclesCache);

    if (employeeVehiclesCache.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl mx-auto mb-2">
            <i class="fa-solid fa-car"></i>
          </div>
          <h4 class="text-xs font-bold text-slate-700">Tu garaje está vacío</h4>
          <p class="text-[11px] text-slate-400 mt-0.5 mb-3">Registra tu automóvil o motocicleta para reservar más rápido.</p>
          <button onclick="abrirModalNuevoVehiculo()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
            <i class="fa-solid fa-plus mr-1"></i> Añadir Vehículo
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-2.5">
        ${employeeVehiclesCache.map(vehicle => {
          const isMoto = (vehicle.tipo_vehiculo || '').toUpperCase() === 'MOTO';
          return `
            <article class="employee-vehicle-card">
              <div class="vehicle-info-block">
                <span class="vehicle-type-avatar">
                  <i class="fa-solid ${isMoto ? 'fa-motorcycle' : 'fa-car'}"></i>
                </span>
                <div>
                  <strong class="font-mono text-sm tracking-wider text-slate-900">${escapeHtml(vehicle.placa)}</strong>
                  <span class="block text-xs font-bold text-slate-700">${escapeHtml(`${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() || 'Vehículo')}</span>
                  <span class="text-[10px] text-slate-400 font-semibold">${escapeHtml(vehicle.tipo_vehiculo)} · ${escapeHtml(vehicle.color || 'Color no informado')}</span>
                </div>
              </div>
              <div class="vehicle-card-actions">
                <button type="button" class="btn-quick-book" onclick="prepararReservaConVehiculo(${Number(vehicle.id_vehiculo)})" title="Reservar con este vehículo">
                  <i class="fa-solid fa-bolt"></i> Reservar
                </button>
                <button type="button" class="btn-delete-veh" onclick="eliminarVehiculoEmpleado(${Number(vehicle.id_vehiculo)})" title="Eliminar vehículo">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="employee-empty-state error">${escapeHtml(error.message)}</p>`;
  }
}

function actualizarSelectorVehiculosReserva(vehiculos) {
  const select = document.getElementById('reservaVehiculoGuardado');
  if (!select) return;

  if (!vehiculos || vehiculos.length === 0) {
    select.innerHTML = '<option value="">-- No tienes vehículos guardados aún --</option>';
    return;
  }

  select.innerHTML = `
    <option value="">-- Elige un vehículo de tu garaje (Auto-completar) --</option>
    ${vehiculos.map(v => `
      <option value="${Number(v.id_vehiculo)}">
        ${escapeHtml(v.placa)} - ${escapeHtml(v.marca || '')} ${escapeHtml(v.modelo || '')} (${escapeHtml(v.tipo_vehiculo)})
      </option>
    `).join('')}
  `;
}

function seleccionarVehiculoGuardado(idVehiculo) {
  if (!idVehiculo) return;
  const veh = employeeVehiclesCache.find(v => Number(v.id_vehiculo) === Number(idVehiculo));
  if (!veh) return;

  const tipoSelect = document.getElementById('reservaTipoVehiculo');
  const placaInput = document.getElementById('reservaPlaca');
  const marcaInput = document.getElementById('reservaMarca');
  const modeloInput = document.getElementById('reservaModelo');
  const colorInput = document.getElementById('reservaColor');

  if (tipoSelect) tipoSelect.value = veh.tipo_vehiculo === 'MOTO' ? 'MOTO' : 'CARRO';
  if (placaInput) placaInput.value = veh.placa || '';
  if (marcaInput) marcaInput.value = veh.marca || '';
  if (modeloInput) modeloInput.value = veh.modelo || '';
  if (colorInput) colorInput.value = veh.color || '';

  cargarCuposDisponibles();
}

function prepararReservaConVehiculo(idVehiculo) {
  abrirModalNuevaReserva();
  const select = document.getElementById('reservaVehiculoGuardado');
  if (select) {
    select.value = String(idVehiculo);
    seleccionarVehiculoGuardado(idVehiculo);
  }
}

function abrirModalNuevoVehiculo() {
  const modal = document.getElementById('modalNuevoVehiculo');
  const form = document.getElementById('nuevoVehiculoForm');
  const errDiv = document.getElementById('nuevoVehError');
  if (form) form.reset();
  if (errDiv) errDiv.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

function cerrarModalNuevoVehiculo() {
  const modal = document.getElementById('modalNuevoVehiculo');
  if (modal) modal.classList.add('hidden');
}

document.getElementById('nuevoVehiculoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipo_vehiculo = document.getElementById('nuevoVehTipo').value;
  const placa = document.getElementById('nuevoVehPlaca').value.trim();
  const marca = document.getElementById('nuevoVehMarca').value.trim();
  const modelo = document.getElementById('nuevoVehModelo').value.trim();
  const color = document.getElementById('nuevoVehColor').value.trim();
  const errDiv = document.getElementById('nuevoVehError');
  const btnSubmit = document.getElementById('btnGuardarVehiculo');

  if (errDiv) errDiv.classList.add('hidden');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Guardando...';
  }

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/vehiculos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tipo_vehiculo, placa, marca, modelo, color })
    });
    const data = await res.json();

    if (res.ok) {
      cerrarModalNuevoVehiculo();
      await cargarVehiculosEmpleado();
    } else {
      if (errDiv) {
        errDiv.textContent = data.message || 'Error al registrar vehículo';
        errDiv.classList.remove('hidden');
      } else {
        alert(`❌ ${data.message}`);
      }
    }
  } catch (err) {
    if (errDiv) {
      errDiv.textContent = 'Error de red al registrar vehículo.';
      errDiv.classList.remove('hidden');
    }
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Guardar en mi Garaje';
    }
  }
});

async function eliminarVehiculoEmpleado(idVehiculo) {
  if (!confirm('¿Confirmas que deseas retirar este vehículo de tu garaje?')) return;

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/vehiculos/${idVehiculo}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok) {
      await cargarVehiculosEmpleado();
    } else {
      alert(`❌ ${data.message}`);
    }
  } catch (err) {
    alert('Error al eliminar vehículo');
  }
}

async function cargarPerfilEmpleado() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.usuario) throw new Error(data.message || 'No se pudo consultar el perfil.');

    const profile = data.usuario;
    document.getElementById('employeeProfileName').textContent =
      profile.nombre_completo || `${profile.nombres || ''} ${profile.apellidos || ''}`.trim();
    document.getElementById('employeeProfileRole').textContent = normalizeRoleLabel(profile.rol);
    document.getElementById('employeeProfileEmail').textContent = profile.correo || '—';
    document.getElementById('employeeProfilePosition').textContent = profile.cargo || '—';
    document.getElementById('employeeProfileCompany').textContent = profile.razon_social || '—';
    document.getElementById('employeeProfileSite').textContent = profile.nombre_sede || '—';
    document.getElementById('employeeProfileArea').textContent = profile.nombre_area || '—';
    document.getElementById('employeeMobileSite').textContent = profile.nombre_sede || 'Principal';
    safeSetStorage('parkgo_user', JSON.stringify(profile));
  } catch (error) {
    document.getElementById('employeeProfileName').textContent = error.message;
  }
}

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/admin/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${currentToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    logout();
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la operación.');
  return data;
}

const adminPageDetails = {
  dashboard: ['Resumen operativo', 'Estado actual del parqueadero y actividad reciente.'],
  reservas: ['Reservas', 'Consulta las reservas registradas dentro de tu ámbito.'],
  vehiculos: ['Vehículos', 'Vehículos asociados a usuarios de tu empresa.'],
  usuarios: ['Usuarios y perfiles', 'Administra cuentas y permisos con mínimo privilegio.'],
  reportes: ['Reportes', 'Resumen exportable de reservas y ocupación.'],
  perfil: ['Mi perfil', 'Información del usuario y rol de la sesión actual.']
};

function abrirPaginaAdmin(page) {
  if (!isAdministrator() || !adminPageDetails[page]) return;
  currentAdminPage = page;
  document.querySelectorAll('[data-admin-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.adminPanel !== page);
  });
  document.querySelectorAll('[data-admin-page]').forEach(button => {
    button.classList.toggle('active', button.dataset.adminPage === page);
  });
  document.getElementById('adminPageTitle').textContent = adminPageDetails[page][0];
  document.getElementById('adminPageDescription').textContent = adminPageDetails[page][1];
  cargarPaginaAdmin();
}

async function cargarPaginaAdmin() {
  if (!isAdministrator()) return;
  try {
    if (currentAdminPage === 'dashboard') {
      const [summary, spaces, reservations] = await Promise.all([
        adminRequest('resumen'), adminRequest('cupos'), adminRequest('reservas')
      ]);
      adminCache.cupos = spaces.cupos || [];
      adminCache.reservas = reservations.reservas || [];
      renderAdminDashboard(summary.resumen || {});
    } else if (currentAdminPage === 'reservas') {
      const data = await adminRequest('reservas');
      adminCache.reservas = data.reservas || [];
      renderAdminReservations();
    } else if (currentAdminPage === 'vehiculos') {
      const data = await adminRequest('vehiculos');
      adminCache.vehiculos = data.vehiculos || [];
      renderAdminVehicles();
    } else if (currentAdminPage === 'usuarios') {
      const data = await adminRequest('usuarios');
      adminCache.usuarios = data.usuarios || [];
      renderAdminUsers();
    } else if (currentAdminPage === 'reportes') {
      const [summary, reservations] = await Promise.all([
        adminRequest('resumen'), adminRequest('reservas')
      ]);
      adminCache.reservas = reservations.reservas || [];
      renderAdminReports(summary.resumen || {});
    } else if (currentAdminPage === 'perfil') {
      renderAdminProfile();
    }
  } catch (error) {
    const currentPanel = document.querySelector(`[data-admin-panel="${currentAdminPage}"]`);
    const message = document.createElement('p');
    message.className = 'admin-error';
    message.textContent = error.message;
    currentPanel?.replaceChildren(message);
  }
}

function renderAdminDashboard(summary) {
  document.getElementById('adminStatTotal').textContent = summary.totalCupos ?? 0;
  document.getElementById('adminStatOcupados').textContent = summary.ocupados ?? 0;
  document.getElementById('adminStatDisponibles').textContent = summary.disponibles ?? 0;
  document.getElementById('adminStatReservas').textContent = summary.reservasHoy ?? 0;

  const statusClass = { OCUPADO: 'occupied', RESERVADO: 'reserved', LIBRE: 'available', DISPONIBLE: 'available' };
  const statusLabel = { OCUPADO: 'Ocupado', RESERVADO: 'Reservado', LIBRE: 'Disponible', DISPONIBLE: 'Disponible' };
  const map = document.getElementById('adminParkingMap');
  map.innerHTML = adminCache.cupos.map(space => {
    const status = statusClass[space.estado_disponibilidad] || 'available';
    return `<article class="admin-parking-slot ${status}" title="${escapeHtml(statusLabel[space.estado_disponibilidad] || 'Disponible')}">
      <strong>${escapeHtml(space.codigo_espacio)}</strong><small>${escapeHtml(space.placa || space.tipo_cupo || '')}</small>
    </article>`;
  }).join('') || '<p class="admin-muted">No hay puestos configurados.</p>';

  const available = adminCache.cupos.filter(space => ['LIBRE', 'DISPONIBLE'].includes(space.estado_disponibilidad));
  document.getElementById('adminAvailableSpots').innerHTML = available.slice(0, 8).map(space =>
    `<span class="admin-available-spot">${escapeHtml(space.codigo_espacio)}</span>`
  ).join('') || '<span class="admin-muted">No hay puestos disponibles.</span>';

  document.getElementById('adminRecentReservations').innerHTML = adminCache.reservas.slice(0, 4).map(reservation =>
    `<article class="admin-recent-item"><span class="admin-recent-icon"><i class="fa-solid fa-car"></i></span><div><strong>${escapeHtml(reservation.placa || reservation.codigo)}</strong><small>${escapeHtml(reservation.codigo)} · Puesto ${escapeHtml(reservation.cupo)}</small></div><span class="admin-reservation-state">${escapeHtml(reservation.estado_reserva)}</span></article>`
  ).join('') || '<p class="admin-muted">No hay reservas registradas.</p>';
}

function renderAdminReservations() {
  const rows = adminCache.reservas.map(item => `<tr data-admin-row="${escapeHtml(`${item.codigo} ${item.placa} ${item.cupo}`.toLowerCase())}">
    <td><strong>${escapeHtml(item.codigo)}</strong></td><td>${escapeHtml(`${item.nombres || ''} ${item.apellidos || ''}`.trim())}</td>
    <td>${escapeHtml(item.placa)}</td><td>${escapeHtml(item.cupo)}</td><td>${escapeHtml(String(item.fecha_reserva || '').slice(0, 10))}</td>
    <td><span class="admin-table-state">${escapeHtml(item.estado_reserva)}</span></td></tr>`).join('');
  document.getElementById('adminReservationsTable').innerHTML = adminTable(['Código', 'Usuario', 'Placa', 'Puesto', 'Fecha', 'Estado'], rows);
}

function renderAdminVehicles() {
  const rows = adminCache.vehiculos.map(vehicle => `<tr data-admin-row="${escapeHtml(`${vehicle.placa} ${vehicle.nombres} ${vehicle.apellidos} ${vehicle.marca}`.toLowerCase())}">
    <td><strong>${escapeHtml(vehicle.placa)}</strong></td><td>${escapeHtml(vehicle.tipo_vehiculo)}</td>
    <td>${escapeHtml(`${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim())}</td><td>${escapeHtml(vehicle.color)}</td>
    <td>${escapeHtml(`${vehicle.nombres} ${vehicle.apellidos}`)}</td></tr>`).join('');
  document.getElementById('adminVehiclesTable').innerHTML = adminTable(['Placa', 'Tipo', 'Vehículo', 'Color', 'Usuario'], rows);
}

function renderAdminUsers() {
  const canManageAdmin = String(currentUser?.rol || '').toUpperCase() === 'SUPERADMIN';
  const roleOptions = canManageAdmin
    ? [['EMPLEADO_CONDUCTOR', 'Empleado'], ['GUARDA', 'Guarda'], ['ADMIN_EMPRESA', 'Administrador'], ['SUPERADMIN', 'Superadministrador']]
    : [['EMPLEADO_CONDUCTOR', 'Empleado'], ['GUARDA', 'Guarda']];
  const ownId = Number(currentUser?.id_usuario);
  const rows = adminCache.usuarios.map(user => {
    const roles = roleOptions.map(([value, label]) => `<option value="${value}" ${user.rol_sistema === value ? 'selected' : ''}>${label}</option>`).join('');
    const active = Boolean(user.estado_usuario);
    const self = Number(user.id_usuario) === ownId;
    return `<tr data-admin-row="${escapeHtml(`${user.nombres} ${user.apellidos} ${user.correo_corporativo}`.toLowerCase())}">
      <td><strong>${escapeHtml(`${user.nombres} ${user.apellidos}`)}</strong><small>${escapeHtml(user.correo_corporativo)}</small></td>
      <td><select class="admin-role-select" aria-label="Rol de ${escapeHtml(user.nombres)}" data-previous="${escapeHtml(user.rol_sistema)}" ${self ? 'disabled' : ''} onchange="actualizarRolAdmin(${Number(user.id_usuario)}, this)">${roles}</select></td>
      <td><span class="admin-user-status ${active ? 'active' : 'inactive'}">${active ? 'Activo' : 'Inactivo'}</span></td>
      <td><button class="admin-user-action" ${self ? 'disabled' : ''} onclick="actualizarEstadoAdmin(${Number(user.id_usuario)}, ${!active})">${self ? 'Tu cuenta' : active ? 'Desactivar' : 'Activar'}</button></td>
    </tr>`;
  }).join('');
  document.getElementById('adminUsersTable').innerHTML = adminTable(['Usuario', 'Perfil', 'Estado', 'Acción'], rows);
}

function renderAdminReports(summary) {
  document.getElementById('adminReportSummary').textContent =
    `${summary.totalCupos ?? 0} puestos · ${summary.ocupados ?? 0} ocupados · ${summary.disponibles ?? 0} disponibles · ${adminCache.reservas.length} reservas consultadas`;
  const rows = adminCache.reservas.slice(0, 12).map(item => `<tr>
    <td>${escapeHtml(item.codigo)}</td><td>${escapeHtml(item.placa)}</td><td>${escapeHtml(item.cupo)}</td>
    <td>${escapeHtml(String(item.fecha_reserva || '').slice(0, 10))}</td><td>${escapeHtml(item.estado_reserva)}</td></tr>`).join('');
  document.getElementById('adminReportsTable').innerHTML = adminTable(['Código', 'Placa', 'Puesto', 'Fecha', 'Estado'], rows);
}

function renderAdminProfile() {
  document.getElementById('adminProfileName').textContent = currentUser?.nombre_completo || `${currentUser?.nombres || ''} ${currentUser?.apellidos || ''}`.trim();
  document.getElementById('adminProfileEmail').textContent = currentUser?.correo || '';
  document.getElementById('adminProfileRole').textContent = currentUser?.rol || 'ADMIN';
}

function adminTable(headers, rows) {
  if (!rows) return '<p class="admin-muted">No hay registros disponibles.</p>';
  if (!rows.trim()) return '<p class="admin-muted">No hay registros disponibles.</p>';
  return `<table class="admin-table"><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function filtrarTablaAdmin(type) {
  const config = {
    reservas: { input: 'adminReservationSearch', table: 'adminReservationsTable' },
    vehiculos: { input: 'adminVehicleSearch', table: 'adminVehiclesTable' },
    usuarios: { input: 'adminUserSearch', table: 'adminUsersTable' }
  }[type];
  if (!config) return;
  const input = document.getElementById(config.input);
  const query = input.value.trim().toLowerCase();
  document.querySelectorAll(`#${config.table} [data-admin-row]`).forEach(row => {
    row.classList.toggle('hidden', !row.dataset.adminRow.includes(query));
  });
}

async function actualizarRolAdmin(id, select) {
  const previous = select.dataset.previous;
  try {
    await adminRequest(`usuarios/${id}/rol`, { method: 'PATCH', body: JSON.stringify({ rol_sistema: select.value }) });
    select.dataset.previous = select.value;
    await cargarPaginaAdmin();
  } catch (error) {
    select.value = previous;
    alert(error.message);
  }
}

async function actualizarEstadoAdmin(id, estado) {
  const action = estado ? 'activar' : 'desactivar';
  if (!confirm(`¿Confirmas ${action} esta cuenta?`)) return;
  try {
    await adminRequest(`usuarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado_usuario: estado }) });
    await cargarPaginaAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function descargarReporteReservas() {
  if (!isAdministrator()) return;
  const columns = ['codigo', 'nombres', 'apellidos', 'placa', 'cupo', 'fecha_reserva', 'estado_reserva'];
  const csv = [columns.join(','), ...adminCache.reservas.map(item => columns.map(column => {
    let value = String(item[column] ?? '');
    if (/^\s*[=+\-@]/.test(value)) value = `'${value}`;
    value = value.replace(/"/g, '""');
    return `"${value}"`;
  }).join(','))].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = 'parkgo-reservas.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Logout
function logout() {
  currentToken = null;
  currentUser = null;
  safeRemoveStorage('parkgo_token');
  safeRemoveStorage('parkgo_user');

  const loginSection = document.getElementById('loginSection');
  if (loginSection) loginSection.classList.remove('hidden');

  const regSec = document.getElementById('registroSection');
  if (regSec) regSec.classList.add('hidden');

  const userInfo = document.getElementById('userInfoHeader');
  if (userInfo) userInfo.classList.add('hidden');

  const selector = document.getElementById('viewSelectorGroup');
  if (selector) selector.classList.add('hidden');

  const porteriaView = document.getElementById('interfacePorteriaWeb');
  if (porteriaView) porteriaView.classList.add('hidden');

  const empleadoView = document.getElementById('interfaceEmpleadoCelular');
  if (empleadoView) empleadoView.classList.add('hidden');

  const adminView = document.getElementById('interfaceAdmin');
  if (adminView) adminView.classList.add('hidden');
}

function mostrarLogin() {
  logout();
}

// ========================================================
// LÓGICA PORTERÍA WEB (DESKTOP / GUARDA)
// ========================================================

async function cargarCatalogoPorteria() {
  const containerGrid = document.getElementById('gridCatalogoPorteria');
  const containerPlano = document.getElementById('canvasPlanoVial');

  if (containerGrid) {
    containerGrid.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-2xl text-orange-500 mb-2"></i><p>Cargando catálogo en tiempo real...</p></div>';
  }
  if (containerPlano) {
    containerPlano.innerHTML = '<div class="text-center py-12 text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-3xl text-orange-500 mb-3"></i><p>Construyendo plano vial 2D...</p></div>';
  }

  try {
    const res = await fetch(`${API_URL}/web/accesos/catalogo`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.catalogo) {
      catalogoCache = data.catalogo;
      actualizarEstadisticasPorteria(catalogoCache);
      renderizarVistasPorteria();
    } else {
      const errHtml = `<p class="text-center py-6 text-red-500 font-bold">Error: ${data.message || 'No se pudo cargar el catálogo'}</p>`;
      if (containerGrid) containerGrid.innerHTML = errHtml;
      if (containerPlano) containerPlano.innerHTML = errHtml;
    }
  } catch (err) {
    const errHtml = '<p class="text-center py-6 text-red-500 font-bold">Error de red al consultar el catálogo.</p>';
    if (containerGrid) containerGrid.innerHTML = errHtml;
    if (containerPlano) containerPlano.innerHTML = errHtml;
  }
}

function actualizarEstadisticasPorteria(catalogo) {
  const total = catalogo.length;
  const ocupados = catalogo.filter(c => c.estado_cupo === 'OCUPADO').length;
  const reservados = catalogo.filter(c => c.estado_cupo === 'RESERVADO').length;
  const disponibles = catalogo.filter(c => c.estado_cupo === 'DISPONIBLE').length;

  const elTotal = document.getElementById('statTotalCupos');
  const elOcupados = document.getElementById('statOcupados');
  const elReservados = document.getElementById('statReservados');
  const elDisponibles = document.getElementById('statDisponibles');

  if (elTotal) elTotal.innerText = total;
  if (elOcupados) elOcupados.innerText = ocupados;
  if (elReservados) elReservados.innerText = reservados;
  if (elDisponibles) elDisponibles.innerText = disponibles;
}

function filtrarCatalogo(estado) {
  filtroActual = estado;

  ['TODOS', 'RESERVADO', 'OCUPADO', 'DISPONIBLE'].forEach(f => {
    const btn = document.getElementById(`filterBtn${f}`);
    if (btn) {
      if (f === estado) {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-orange-500 text-white shadow-sm';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-slate-100 text-slate-600 hover:bg-slate-200';
      }
    }
  });

  renderizarVistasPorteria();
}

function cambiarPisoPorteria(piso) {
  currentPorteriaPiso = piso;

  ['TODOS', 'Piso 1', 'Piso 2'].forEach(p => {
    const btnId = p === 'TODOS' ? 'btnPisoTODOS' : p === 'Piso 1' ? 'btnPiso1' : 'btnPiso2';
    const btn = document.getElementById(btnId);
    if (btn) {
      if (p === piso) {
        btn.className = 'px-3 py-1.5 rounded-lg transition bg-white text-slate-800 shadow-sm font-bold';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg transition hover:bg-white/80 text-slate-500';
      }
    }
  });

  renderizarVistasPorteria();
}

function cambiarModoVisualizacionPorteria(modo) {
  currentPorteriaModo = modo;
  const btnPlano = document.getElementById('btnModoPlano');
  const btnTarjetas = document.getElementById('btnModoTarjetas');
  const viewPlano = document.getElementById('contenedorPlano2D');
  const viewTarjetas = document.getElementById('gridCatalogoPorteria');

  if (modo === 'PLANO') {
    if (btnPlano) btnPlano.className = 'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-orange-600 text-white shadow-sm';
    if (btnTarjetas) btnTarjetas.className = 'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-600 hover:bg-white';
    if (viewPlano) viewPlano.classList.remove('hidden');
    if (viewTarjetas) viewTarjetas.classList.add('hidden');
  } else {
    if (btnPlano) btnPlano.className = 'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 text-slate-600 hover:bg-white';
    if (btnTarjetas) btnTarjetas.className = 'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 bg-orange-600 text-white shadow-sm';
    if (viewPlano) viewPlano.classList.add('hidden');
    if (viewTarjetas) viewTarjetas.classList.remove('hidden');
  }
}

function renderizarVistasPorteria() {
  renderizarPlano2D(catalogoCache);
  renderizarGridCatalogo(catalogoCache);
}

// ========================================================
// RENDERIZADO DEL PLANO 2D ARQUITECTÓNICO VIAL
// ========================================================
function renderizarPlano2D(catalogo) {
  const canvas = document.getElementById('canvasPlanoVial');
  if (!canvas) return;

  // Filtrar según piso y estado
  let datos = catalogo;
  if (currentPorteriaPiso !== 'TODOS') {
    datos = datos.filter(c => (c.piso || 'Piso 1').toLowerCase() === currentPorteriaPiso.toLowerCase());
  }

  // Agrupar por piso
  const pisosMap = {};
  datos.forEach(item => {
    const p = item.piso || 'Piso 1';
    if (!pisosMap[p]) pisosMap[p] = [];
    pisosMap[p].push(item);
  });

  const pisosKeys = Object.keys(pisosMap).sort();

  if (pisosKeys.length === 0) {
    canvas.innerHTML = '<div class="text-center py-12 text-slate-400 font-bold bg-slate-900 rounded-3xl border border-slate-800">No se encontraron bahías para este filtro.</div>';
    return;
  }

  canvas.innerHTML = pisosKeys.map(pisoNombre => {
    const bahias = pisosMap[pisoNombre];

    // Aplicar filtro de estado para visualización o opacidad
    const totalPiso = bahias.length;
    const ocupadosPiso = bahias.filter(b => b.estado_cupo === 'OCUPADO').length;
    const reservadosPiso = bahias.filter(b => b.estado_cupo === 'RESERVADO').length;
    const disponiblesPiso = bahias.filter(b => b.estado_cupo === 'DISPONIBLE').length;

    // Dividir en 2 filas viales (arriba y abajo del carril de circulación)
    const mid = Math.ceil(bahias.length / 2);
    const filaNorte = bahias.slice(0, mid);
    const filaSur = bahias.slice(mid);

    const renderBay = (b) => {
      const matchFiltro = filtroActual === 'TODOS' || b.estado_cupo === filtroActual;
      const estadoClass = b.estado_cupo === 'OCUPADO' ? 'state-ocupado' : b.estado_cupo === 'RESERVADO' ? 'state-reservado' : 'state-disponible';
      const isMoto = (b.tipo_cupo || '').toUpperCase() === 'MOTO';
      const vehicleIcon = isMoto ? 'fa-motorcycle' : 'fa-car-side';
      const statusLabel = b.estado_cupo === 'OCUPADO' ? 'En Sitio' : b.estado_cupo === 'RESERVADO' ? 'Reservado' : 'Disponible';

      const opacityStyle = matchFiltro ? '' : 'opacity: 0.25; filter: grayscale(80%); pointer-events: none;';

      return `
        <div class="parking-bay-card ${estadoClass}" style="${opacityStyle}" onclick="abrirModalDetalleCupo(${Number(b.id_cupo)})" title="Clic para ver detalles de la bahía ${escapeHtml(b.codigo_espacio)}">
          <div class="bay-top">
            <span class="bay-code">${escapeHtml(b.codigo_espacio)}</span>
            <span class="bay-type-tag">
              <i class="fa-solid ${isMoto ? 'fa-motorcycle' : 'fa-car'}"></i>
              ${isMoto ? 'MOTO' : 'CARRO'}
            </span>
          </div>

          <div class="bay-center">
            <i class="fa-solid ${vehicleIcon} bay-vehicle-silhouette"></i>
            ${b.placa ? `<span class="bay-plate-badge">${escapeHtml(b.placa)}</span>` : '<span class="text-[10px] text-slate-500 font-bold mt-1 tracking-wider uppercase">LIBRE</span>'}
          </div>

          <div class="bay-foot">
            <span class="flex items-center gap-1.5">
              <span class="bay-status-dot"></span>
              <span class="bay-status-label">${statusLabel}</span>
            </span>
            <span class="bay-action-hint"><i class="fa-solid fa-up-right-from-square"></i></span>
          </div>
        </div>
      `;
    };

    return `
      <div class="blueprint-floor-block">
        <div class="blueprint-floor-header">
          <div class="blueprint-floor-title">
            <span class="blueprint-floor-badge"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(pisoNombre)}</span>
            <span class="text-xs text-slate-400 font-semibold hidden sm:inline">Distribución arquitectónica de bahías</span>
          </div>
          <div class="blueprint-floor-stats">
            <span class="text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-circle text-[6px]"></i> ${disponiblesPiso} libres</span>
            <span class="text-amber-400 flex items-center gap-1"><i class="fa-solid fa-circle text-[6px]"></i> ${reservadosPiso} reserv.</span>
            <span class="text-orange-400 flex items-center gap-1"><i class="fa-solid fa-circle text-[6px]"></i> ${ocupadosPiso} en sitio</span>
          </div>
        </div>

        <!-- FILA NORTE DE BAHÍAS -->
        <div class="blueprint-bays-row">
          ${filaNorte.map(renderBay).join('')}
        </div>

        <!-- CARRIL VIAL DE CIRCULACIÓN -->
        <div class="circulation-roadway">
          <span class="circulation-sign"><i class="fa-solid fa-arrow-right-to-bracket text-emerald-400"></i> Entrada</span>
          <span class="circulation-sign"><i class="fa-solid fa-road text-amber-400"></i> Carril Interno (Máx 10 km/h)</span>
          <span class="circulation-sign"><i class="fa-solid fa-arrow-right-from-bracket text-orange-400"></i> Salida</span>
        </div>

        <!-- FILA SUR DE BAHÍAS -->
        <div class="blueprint-bays-row">
          ${filaSur.map(renderBay).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// RENDERIZADO DE LA CUADRÍCULA TRADICIONAL
// ========================================================
function renderizarGridCatalogo(catalogo) {
  const container = document.getElementById('gridCatalogoPorteria');
  if (!container) return;

  let filtrados = catalogo;
  if (currentPorteriaPiso !== 'TODOS') {
    filtrados = filtrados.filter(c => (c.piso || 'Piso 1').toLowerCase() === currentPorteriaPiso.toLowerCase());
  }
  if (filtroActual !== 'TODOS') {
    filtrados = filtrados.filter(c => c.estado_cupo === filtroActual);
  }

  if (filtrados.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400 font-bold">No hay cupos en esta categoría.</div>';
    return;
  }

  container.innerHTML = filtrados.map(item => {
    let badge = '';
    let btnAccion = '';

    if (item.estado_cupo === 'OCUPADO') {
      badge = `<span class="badge-ocupado text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase flex items-center gap-1"><i class="fa-solid fa-car-side"></i> EN SITIO</span>`;
      if (item.codigo_pase) {
        btnAccion = `
          <button onclick="ejecutarCheckOut('${item.codigo_pase}')" class="mt-3 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-right-from-bracket"></i> Registrar Salida (Check-Out)
          </button>`;
      }
    } else if (item.estado_cupo === 'RESERVADO') {
      badge = `<span class="badge-reservado text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase flex items-center gap-1"><i class="fa-solid fa-clock"></i> RESERVADO</span>`;
      if (item.codigo_pase) {
        btnAccion = `
          <button onclick="ejecutarCheckIn('${item.codigo_pase}')" class="mt-3 w-full btn-orange font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-orange">
            <i class="fa-solid fa-right-to-bracket"></i> Registrar Entrada (Check-In)
          </button>`;
      }
    } else {
      badge = `<span class="badge-disponible text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> DISPONIBLE</span>`;
      btnAccion = `<div class="mt-3 text-center text-[11px] text-slate-400 font-medium py-1">Cupo libre para reserva</div>`;
    }

    return `
      <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition relative flex flex-col justify-between" onclick="abrirModalDetalleCupo(${Number(item.id_cupo)})" style="cursor: pointer;">
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/60">${escapeHtml(item.codigo_espacio)} (${escapeHtml(item.piso || 'Piso 1')})</span>
            ${badge}
          </div>

          <h4 class="text-lg font-black text-slate-800 tracking-tight mt-2">${escapeHtml(item.placa || 'Sin Vehículo')}</h4>
          <p class="text-xs font-semibold text-slate-500">${escapeHtml(item.vehiculo_info || 'Espacio libre')}</p>
          
          ${item.nombre_usuario ? `<p class="text-xs text-slate-600 mt-2 flex items-center gap-1 font-medium"><i class="fa-solid fa-user text-slate-400"></i> ${escapeHtml(item.nombre_usuario)}</p>` : ''}
          ${item.codigo_pase ? `<p class="text-[11px] font-mono text-orange-600 font-bold mt-1">Código: ${escapeHtml(item.codigo_pase)}</p>` : ''}
        </div>

        <div onclick="event.stopPropagation()">
          ${btnAccion}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// MODAL INTERACTIVO DE DETALLE DE BAHÍA
// ========================================================
function abrirModalDetalleCupo(idCupo) {
  const item = catalogoCache.find(c => Number(c.id_cupo) === Number(idCupo));
  if (!item) return;

  const modal = document.getElementById('modalDetalleCupoPorteria');
  const headerBar = document.getElementById('modalCupoHeaderBar');
  const iconSpan = document.getElementById('modalCupoIcon');
  const codigoEl = document.getElementById('modalCupoCodigo');
  const pisoEl = document.getElementById('modalCupoPiso');
  const tipoEl = document.getElementById('modalCupoTipo');
  const badgeEl = document.getElementById('modalCupoEstadoBadge');
  const bodyEl = document.getElementById('modalCupoDetallesCuerpo');
  const actionsEl = document.getElementById('modalCupoAcciones');

  const isMoto = (item.tipo_cupo || '').toUpperCase() === 'MOTO';
  codigoEl.textContent = item.codigo_espacio;
  pisoEl.textContent = item.piso || 'Nivel 1';
  tipoEl.textContent = `Tipo: ${isMoto ? 'MOTO' : 'CARRO'}`;
  iconSpan.innerHTML = `<i class="fa-solid ${isMoto ? 'fa-motorcycle' : 'fa-car'}"></i>`;

  let badgeColor = '';
  let badgeText = '';

  if (item.estado_cupo === 'OCUPADO') {
    headerBar.className = 'absolute top-0 left-0 right-0 h-2 bg-orange-600';
    badgeEl.className = 'p-3 rounded-2xl text-xs font-extrabold flex items-center justify-between bg-orange-50 text-orange-800 border border-orange-200';
    badgeEl.innerHTML = `<span><i class="fa-solid fa-car-side text-orange-600 mr-1.5"></i> EN SITIO (VEHÍCULO ADENTRO)</span><span class="w-2.5 h-2.5 rounded-full bg-orange-600"></span>`;
  } else if (item.estado_cupo === 'RESERVADO') {
    headerBar.className = 'absolute top-0 left-0 right-0 h-2 bg-amber-500';
    badgeEl.className = 'p-3 rounded-2xl text-xs font-extrabold flex items-center justify-between bg-amber-50 text-amber-800 border border-amber-200';
    badgeEl.innerHTML = `<span><i class="fa-solid fa-clock text-amber-600 mr-1.5"></i> RESERVADO (ESPERANDO LLEGADA)</span><span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>`;
  } else {
    headerBar.className = 'absolute top-0 left-0 right-0 h-2 bg-emerald-500';
    badgeEl.className = 'p-3 rounded-2xl text-xs font-extrabold flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200';
    badgeEl.innerHTML = `<span><i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> DISPONIBLE PARA RESERVAS</span><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>`;
  }

  bodyEl.innerHTML = `
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Vehículo</span>
      <span class="font-extrabold text-slate-800">${escapeHtml(item.vehiculo_info || (isMoto ? 'Motocicleta' : 'Automóvil'))}</span>
    </div>
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Placa Asignada</span>
      <span class="font-mono font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-xs">${escapeHtml(item.placa || 'SIN ASIGNAR')}</span>
    </div>
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Conductor</span>
      <span class="font-bold text-slate-700">${escapeHtml(item.nombre_usuario || 'Sin conductor')}</span>
    </div>
    <div class="flex justify-between items-center py-1">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Código Alfanumérico</span>
      <span class="font-mono font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">${escapeHtml(item.codigo_pase || 'N/A')}</span>
    </div>
  `;

  let actionButtons = '';
  if (item.estado_cupo === 'RESERVADO' && item.codigo_pase) {
    actionButtons = `
      <button onclick="ejecutarCheckIn('${escapeHtml(item.codigo_pase)}')" class="btn-orange flex-1 py-3 rounded-xl text-xs font-bold shadow-orange flex items-center justify-center gap-2">
        <i class="fa-solid fa-right-to-bracket"></i> Confirmar Entrada (Check-In)
      </button>
      <button onclick="cerrarModalDetalleCupo()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-xs font-bold transition">
        Cerrar
      </button>
    `;
  } else if (item.estado_cupo === 'OCUPADO' && item.codigo_pase) {
    actionButtons = `
      <button onclick="ejecutarCheckOut('${escapeHtml(item.codigo_pase)}')" class="bg-red-600 hover:bg-red-700 text-white flex-1 py-3 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition">
        <i class="fa-solid fa-right-from-bracket"></i> Confirmar Salida (Check-Out)
      </button>
      <button onclick="cerrarModalDetalleCupo()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-xs font-bold transition">
        Cerrar
      </button>
    `;
  } else {
    actionButtons = `
      <button onclick="cerrarModalDetalleCupo()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition">
        Entendido
      </button>
    `;
  }

  actionsEl.innerHTML = actionButtons;
  modal.classList.remove('hidden');
}

function cerrarModalDetalleCupo() {
  const modal = document.getElementById('modalDetalleCupoPorteria');
  if (modal) modal.classList.add('hidden');
}

// Búsqueda y Validación de Pase (Compatible con EN_USO y EN_SITIO)
document.getElementById('searchPassForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigoPaseInput').value.trim();
  if (codigo) {
    consultarPasePorteria(codigo);
  }
});

async function consultarPasePorteria(codigo) {
  const resultCard = document.getElementById('validationResultCard');
  resultCard.classList.remove('hidden');
  resultCard.innerHTML = '<div class="text-center py-3 text-slate-500 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-orange-500"></i> Validando código en el servidor...</div>';

  try {
    const res = await fetch(`${API_URL}/web/accesos/validar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });
    const data = await res.json();

    if (res.ok) {
      let btnAccionHtml = '';
      if (data.estado === 'ACTIVA') {
        btnAccionHtml = `
          <button onclick="ejecutarCheckIn('${data.codigo}')" class="btn-orange px-4 py-2 rounded-xl text-xs font-bold shadow-orange flex items-center gap-1">
            <i class="fa-solid fa-right-to-bracket"></i> Confirmar Entrada (Check-In)
          </button>`;
      } else if (data.estado === 'EN_SITIO' || data.estado === 'EN_USO') {
        btnAccionHtml = `
          <button onclick="ejecutarCheckOut('${data.codigo}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1">
            <i class="fa-solid fa-right-from-bracket"></i> Confirmar Salida (Check-Out)
          </button>`;
      } else {
        btnAccionHtml = `<span class="text-xs font-bold text-slate-400">Reserva Finalizada</span>`;
      }

      resultCard.className = 'mt-4 p-4 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3';
      resultCard.innerHTML = `
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded font-mono">${escapeHtml(data.codigo)}</span>
            <span class="text-xs font-bold uppercase text-orange-700">Cupo: ${escapeHtml(data.cupo)}</span>
          </div>
          <h4 class="text-base font-extrabold text-slate-800 mt-1">${escapeHtml(data.vehiculo?.marca || 'Vehículo')} (${escapeHtml(data.vehiculo?.placa || '')})</h4>
          <p class="text-xs text-slate-600">Conductor: ${escapeHtml(data.usuario?.nombre || 'Desconocido')} (${escapeHtml(data.usuario?.correo || '')})</p>
        </div>
        <div>
          ${btnAccionHtml}
        </div>
      `;
    } else {
      resultCard.className = 'mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold';
      resultCard.innerHTML = `<i class="fa-solid fa-circle-xmark text-base"></i> ${escapeHtml(data.message || 'Código inválido o no encontrado.')}`;
    }
  } catch (err) {
    resultCard.className = 'mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold';
    resultCard.innerHTML = 'Error al validar el pase.';
  }
}

async function ejecutarCheckIn(codigo) {
  if (!confirm(`¿Confirmar ENTRADA del pase ${codigo}?`)) return;

  try {
    const res = await fetch(`${API_URL}/web/accesos/check-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });
    const data = await res.json();

    if (res.ok) {
      alert(`✅ ${data.message || 'Check-In exitoso'}`);
      cerrarModalDetalleCupo();
      cargarCatalogoPorteria();
      const valCard = document.getElementById('validationResultCard');
      if (valCard) valCard.classList.add('hidden');
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (err) {
    alert('Error al registrar Check-In');
  }
}

async function ejecutarCheckOut(codigo) {
  if (!confirm(`¿Confirmar SALIDA del pase ${codigo}?`)) return;

  try {
    const res = await fetch(`${API_URL}/web/accesos/check-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });
    const data = await res.json();

    if (res.ok) {
      alert(`✅ ${data.message || 'Check-Out exitoso'}`);
      cerrarModalDetalleCupo();
      cargarCatalogoPorteria();
      const valCard = document.getElementById('validationResultCard');
      if (valCard) valCard.classList.add('hidden');
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (err) {
    alert('Error al registrar Check-Out');
  }
}

// ========================================================
// LÓGICA EMPLEADO CELULAR (MÓVIL / SMARTPHONE)
// ========================================================

async function cargarPaseEmpleado() {
  const container = document.getElementById('activePassCardMobile');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-8 text-slate-400 font-bold text-xs"><i class="fa-solid fa-spinner fa-spin text-orange-500 text-xl mb-2"></i><p>Obteniendo pase digital...</p></div>';

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/pase-activo`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.pase) {
      const pase = data.pase;
      const estaAdentro = pase.estado === 'EN_SITIO' || pase.estado === 'EN_USO';
      container.innerHTML = `
        <div class="bg-white rounded-[1.6rem] border border-orange-200 shadow-orange p-4 text-center relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-2 bg-orange-brand"></div>

          <div class="inline-block mb-3">
            <span class="${estaAdentro ? 'badge-ocupado' : 'badge-reservado'} text-[10px] font-extrabold px-3 py-1 rounded-full uppercase flex items-center gap-1">
              <i class="fa-solid ${estaAdentro ? 'fa-car-side' : 'fa-qrcode'} text-orange-500"></i> ${estaAdentro ? 'Dentro de la sede' : 'Reserva activa'}
            </span>
          </div>

          <div class="w-40 h-40 mx-auto bg-slate-900 rounded-[1.4rem] p-3 flex items-center justify-center relative shadow-inner my-2 border border-slate-700">
            <div class="scan-line"></div>
            <svg class="w-full h-full text-white fill-current" viewBox="0 0 24 24">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2z"/>
            </svg>
          </div>

          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] mt-2">Código de pase</p>
          <h3 class="text-2xl font-black text-orange-600 font-mono tracking-[0.22em]">${escapeHtml(pase.codigo)}</h3>

          <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase">Cupo</p>
              <p class="text-sm font-black text-slate-800">${escapeHtml(pase.cupo)}</p>
            </div>
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase">Vehículo</p>
              <p class="text-sm font-black text-slate-800">${escapeHtml(pase.vehiculo?.placa || 'KTM-300')}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-sm">
          <div class="w-12 h-12 bg-orange-50 rounded-2xl text-orange-500 flex items-center justify-center text-xl mx-auto mb-2">
            <i class="fa-solid fa-parking"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-800">No tienes pase activo</h4>
          <p class="text-xs text-slate-500 mt-1 mb-4">Genera una reserva para obtener tu código QR de parqueadero.</p>
          <button onclick="abrirModalNuevaReserva()" class="w-full btn-orange py-2.5 rounded-xl text-xs font-bold shadow-orange">
            <i class="fa-solid fa-plus"></i> Generar Pase Ahora
          </button>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<p class="text-xs text-red-500 text-center">Error al obtener el pase digital.</p>';
  }
}

async function cargarHistorialEmpleado() {
  const container = document.getElementById('employeeHistoryList');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/historial`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.historial && data.historial.length > 0) {
      employeeHistoryCache = data.historial;
      container.innerHTML = data.historial.map(item => {
        const estaAdentro = item.estado === 'EN_SITIO' || item.estado === 'EN_USO';
        return `
          <div class="history-item flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm mb-2 hover:border-orange-200 transition">
            <div class="flex-1 pr-2">
              <div class="flex items-center gap-2">
                <strong class="text-xs font-mono font-black text-slate-800">${escapeHtml(item.codigo)}</strong>
                <span class="status-chip ${estaAdentro ? 'orange' : 'slate'}">${escapeHtml(item.estado)}</span>
              </div>
              <small class="block text-[11px] text-slate-500 mt-0.5">Cupo: <strong class="text-slate-700">${escapeHtml(item.cupo)}</strong> • ${escapeHtml(item.vehiculo)}</small>
            </div>
            <button type="button" onclick="abrirModalTicket('${escapeHtml(item.codigo)}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-xs font-bold text-slate-600 transition flex items-center gap-1 shadow-2xs" title="Ver comprobante de parqueo">
              <i class="fa-solid fa-receipt text-orange-500"></i> Ticket
            </button>
          </div>
        `;
      }).join('');
    } else {
      employeeHistoryCache = [];
      container.innerHTML = '<p class="text-[11px] text-slate-400 text-center py-2">Sin historial reciente.</p>';
    }
  } catch (err) {
    container.innerHTML = '<p class="text-[11px] text-red-400 text-center">No se pudo cargar historial.</p>';
  }
}

// Modal de Comprobante / Ticket Digital
function abrirModalTicket(codigo) {
  const modal = document.getElementById('modalTicketParqueo');
  if (!modal) return;
  const item = employeeHistoryCache.find(h => h.codigo === codigo);
  if (!item) return;

  const codigoEl = document.getElementById('ticketCodigo');
  const cupoEl = document.getElementById('ticketCupo');
  const vehiculoEl = document.getElementById('ticketVehiculo');
  const fechaEl = document.getElementById('ticketFecha');
  const estadoBadgeEl = document.getElementById('ticketEstadoBadge');

  if (codigoEl) codigoEl.textContent = item.codigo || '—';
  if (cupoEl) cupoEl.textContent = item.cupo || '—';
  if (vehiculoEl) vehiculoEl.textContent = item.vehiculo || '—';
  if (fechaEl) fechaEl.textContent = item.fecha || new Date().toISOString().split('T')[0];

  if (estadoBadgeEl) {
    const estaAdentro = item.estado === 'EN_SITIO' || item.estado === 'EN_USO';
    estadoBadgeEl.className = estaAdentro ? 'badge-ocupado font-black text-xs px-2.5 py-1 rounded-full' : 'badge-reservado font-black text-xs px-2.5 py-1 rounded-full';
    estadoBadgeEl.textContent = item.estado;
  }

  modal.classList.remove('hidden');
}

function cerrarModalTicket() {
  const modal = document.getElementById('modalTicketParqueo');
  if (modal) modal.classList.add('hidden');
}

function imprimirTicketParqueo() {
  window.print();
}

// Modal de Nueva Reserva
function abrirModalNuevaReserva() {
  document.getElementById('modalNuevaReserva').classList.remove('hidden');
  document.getElementById('reservationSuccessPanel').classList.add('hidden');
  document.getElementById('reservaForm').classList.remove('hidden');
  document.getElementById('reservaFecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('reservaIdCupo').value = '';
  document.getElementById('reservaSubmitBtn').disabled = true;
  currentModalPiso = 'TODOS';
  actualizarBotonesPisoModal();
  if (employeeVehiclesCache.length === 0) {
    cargarVehiculosEmpleado();
  } else {
    actualizarSelectorVehiculosReserva(employeeVehiclesCache);
  }
  cargarCuposDisponibles();
}

function cerrarModalNuevaReserva() {
  document.getElementById('modalNuevaReserva').classList.add('hidden');
}

function cambiarPisoReservaModal(piso) {
  currentModalPiso = piso;
  actualizarBotonesPisoModal();
  renderizarMiniPlanoCupos();
}

function actualizarBotonesPisoModal() {
  const btnTodos = document.getElementById('btnModalPisoTODOS');
  const btnPiso1 = document.getElementById('btnModalPiso1');
  const btnPiso2 = document.getElementById('btnModalPiso2');
  [btnTodos, btnPiso1, btnPiso2].forEach(btn => {
    if (btn) btn.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:bg-white/60 transition';
  });
  if (currentModalPiso === 'TODOS' && btnTodos) {
    btnTodos.className = 'px-2.5 py-1 rounded-lg bg-white text-slate-900 font-extrabold shadow-2xs';
  } else if ((currentModalPiso === 'Piso 1' || currentModalPiso === '1') && btnPiso1) {
    btnPiso1.className = 'px-2.5 py-1 rounded-lg bg-white text-slate-900 font-extrabold shadow-2xs';
  } else if ((currentModalPiso === 'Piso 2' || currentModalPiso === '2') && btnPiso2) {
    btnPiso2.className = 'px-2.5 py-1 rounded-lg bg-white text-slate-900 font-extrabold shadow-2xs';
  }
}

async function cargarCuposDisponibles() {
  const grid = document.getElementById('availableCuposGrid');
  const count = document.getElementById('availableSpaceCount');
  const selected = document.getElementById('reservaIdCupo');
  const submit = document.getElementById('reservaSubmitBtn');
  if (selected) selected.value = '';
  if (submit) submit.disabled = true;
  if (grid) grid.innerHTML = '<span class="admin-loading py-4 block text-center text-xs text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-orange-500 mr-1.5"></i> Consultando puestos libres...</span>';
  if (count) count.textContent = 'Cargando';

  try {
    const tipoVehiculo = document.getElementById('reservaTipoVehiculo').value;
    const query = new URLSearchParams({ tipoVehiculo });
    const res = await fetch(`${API_URL}/mobile/empleado/cupos?${query}`, {
      headers: { Authorization: `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'No se pudo consultar la disponibilidad.');

    cuposDisponiblesCache = data.cupos || [];
    renderizarMiniPlanoCupos();
  } catch (error) {
    if (count) count.textContent = 'Error';
    if (grid) grid.innerHTML = `<span class="booking-no-spaces">${escapeHtml(error.message)}</span>`;
  }
}

function renderizarMiniPlanoCupos() {
  const grid = document.getElementById('availableCuposGrid');
  const count = document.getElementById('availableSpaceCount');
  if (!grid) return;

  let filtrados = cuposDisponiblesCache;
  if (currentModalPiso !== 'TODOS') {
    filtrados = cuposDisponiblesCache.filter(c => {
      const p = String(c.piso_nivel || '').trim().toLowerCase();
      return p.includes(currentModalPiso.toLowerCase());
    });
  }

  if (count) {
    count.textContent = `${filtrados.length} libres`;
  }

  if (!filtrados.length) {
    grid.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-slate-400 font-semibold"><i class="fa-solid fa-ban text-slate-300 text-lg mb-1 block"></i>No hay bahías disponibles en este piso para tu tipo de vehículo.</div>';
    return;
  }

  const selectedId = Number(document.getElementById('reservaIdCupo')?.value || 0);

  grid.innerHTML = filtrados.map(cupo => {
    const isSelected = selectedId === Number(cupo.id_cupo);
    const isMoto = (cupo.tipo_permitido || '').toUpperCase() === 'MOTO';
    return `
      <button type="button" class="mini-bay-btn ${isSelected ? 'selected' : ''}" data-cupo-id="${Number(cupo.id_cupo)}" onclick="seleccionarCupo(${Number(cupo.id_cupo)}, '${escapeHtml(cupo.codigo_espacio)}')">
        <i class="fa-solid ${isMoto ? 'fa-motorcycle' : 'fa-car-side'} bay-icon"></i>
        <span class="bay-code">${escapeHtml(cupo.codigo_espacio)}</span>
        <span class="bay-floor">${escapeHtml(cupo.piso_nivel || 'P1')}</span>
      </button>
    `;
  }).join('');
}

function seleccionarCupo(idCupo, codigo) {
  document.getElementById('reservaIdCupo').value = String(idCupo);
  document.querySelectorAll('.mini-bay-btn').forEach(button => {
    button.classList.toggle('selected', Number(button.dataset.cupoId) === Number(idCupo));
  });
  document.getElementById('reservaSubmitBtn').disabled = false;
  document.getElementById('bookingPickerTitle').textContent = `Bahía ${codigo} seleccionada`;
}

document.getElementById('reservaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipoVehiculo = document.getElementById('reservaTipoVehiculo').value;
  const placa = document.getElementById('reservaPlaca').value.trim();
  const marca = document.getElementById('reservaMarca').value.trim();
  const modelo = document.getElementById('reservaModelo').value.trim();
  const color = document.getElementById('reservaColor').value.trim();
  const fecha = document.getElementById('reservaFecha').value;
  const horaEntrada = document.getElementById('reservaHora').value;
  const idCupo = Number(document.getElementById('reservaIdCupo').value);
  const submit = document.getElementById('reservaSubmitBtn');

  if (!idCupo) {
    document.getElementById('bookingPickerTitle').textContent = 'Selecciona un puesto disponible';
    return;
  }

  try {
    submit.disabled = true;
    submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reservando...';
    const res = await fetch(`${API_URL}/mobile/empleado/reserva`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tipoVehiculo, placa, marca, modelo, color, fecha, horaEntrada, idCupo })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('reservaForm').classList.add('hidden');
      document.getElementById('reservationSuccessSpot').textContent = `Puesto ${data.cupo} · ${placa}`;
      document.getElementById('reservationSuccessCode').textContent = `Código ${data.codigo}`;
      document.getElementById('reservationSuccessPanel').classList.remove('hidden');
      cargarPaseEmpleado();
      cargarHistorialEmpleado();
      cargarVehiculosEmpleado();
    } else {
      alert(`❌ Error: ${data.message}`);
      await cargarCuposDisponibles();
    }
  } catch (err) {
    alert('Error al generar la reserva.');
  } finally {
    submit.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar reserva';
    submit.disabled = !document.getElementById('reservaIdCupo').value;
  }
});

// ========================================================
// LÓGICA DE REGISTRO DE NUEVA CUENTA (EMPLEADO MÓVIL)
// ========================================================

document.getElementById('registroForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombres    = document.getElementById('regNombres').value.trim();
  const apellidos  = document.getElementById('regApellidos').value.trim();
  const correo     = document.getElementById('regEmail').value.trim();
  const cargo      = document.getElementById('regCargo').value.trim();
  const password   = document.getElementById('regPassword').value;
  const passwordOk = document.getElementById('regPasswordConfirm').value;

  const errorDiv   = document.getElementById('regMensajeError');
  const errorSpan  = document.getElementById('regMensajeTexto');
  const submitBtn  = document.getElementById('regSubmitBtn');

  function mostrarError(msg) {
    errorSpan.textContent = msg;
    errorDiv.classList.remove('hidden');
  }

  errorDiv.classList.add('hidden');

  // Validaciones del lado cliente
  if (!nombres || !apellidos || !correo || !password) {
    return mostrarError('Por favor, completa todos los campos obligatorios.');
  }
  if (password.length < 6) {
    return mostrarError('La contraseña debe tener al menos 6 caracteres.');
  }
  if (password !== passwordOk) {
    return mostrarError('Las contraseñas no coinciden. Verifica e inténtalo de nuevo.');
  }

  // Deshabilitar botón durante el proceso
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';

  try {
    const res = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo_corporativo: correo,
        password,
        nombres,
        apellidos,
        cargo: cargo || 'Empleado'
      })
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      // Éxito: mostrar confirmación y redirigir al login
      alert(`✅ ${data.mensaje || 'Cuenta creada exitosamente'}\n\nYa puedes iniciar sesión con tu correo y contraseña.`);
      document.getElementById('registroForm').reset();
      mostrarFormularioLogin();
      // Pre-rellenar el email en login para facilitar el acceso
      document.getElementById('loginEmail').value = correo;
    } else {
      mostrarError(data.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    }
  } catch (err) {
    mostrarError('Error de conexión con el servidor. Verifica tu red e inténtalo de nuevo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Crear Mi Cuenta';
  }
});