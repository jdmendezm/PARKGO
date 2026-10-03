// PARKGO - Aplicación Client-Side para Portería Web y Empleado Celular
const API_URL = '/api/v1';

let currentToken = localStorage.getItem('parkgo_token');
let currentUser = null;
let currentInterface = 'PORTERIA'; // 'PORTERIA' o 'EMPLEADO'
let catalogoCache = [];
let filtroActual = 'TODOS';

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
      localStorage.setItem('parkgo_token', currentToken);
      
      // Ajustar la interfaz según el rol por defecto
      if (currentUser.rol === 'EMPLEADO') {
        currentInterface = 'EMPLEADO';
      } else {
        currentInterface = 'PORTERIA';
      }

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
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.usuario) {
      currentUser = data.usuario;
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
  document.getElementById('viewSelectorGroup').classList.remove('hidden');

  const userName = currentUser.nombre_completo || `${currentUser.nombres || ''} ${currentUser.apellidos || ''}`.trim() || 'Usuario PARKGO';
  document.getElementById('userNameDisplay').innerText = userName;
  document.getElementById('userRoleBadge').innerText = normalizeRoleLabel(currentUser.rol || 'USUARIO');

  switchInterface(currentInterface);
}

function setViewButtonState(activeTab) {
  const btnPorteria = document.getElementById('btnViewPorteria');
  const btnEmpleado = document.getElementById('btnViewEmpleado');

  if (!btnPorteria || !btnEmpleado) return;

  const basePorteria = 'px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2';
  const baseEmpleado = 'px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2';

  if (activeTab === 'PORTERIA') {
    btnPorteria.className = `${basePorteria} bg-white text-orange-600 shadow-sm`;
    btnEmpleado.className = `${baseEmpleado} text-white hover:bg-orange-700/50`;
  } else {
    btnEmpleado.className = `${baseEmpleado} bg-white text-orange-600 shadow-sm`;
    btnPorteria.className = `${basePorteria} text-white hover:bg-orange-700/50`;
  }
}

// Conmutar entre Portería Web y Empleado Celular
function switchInterface(targetInterface) {
  currentInterface = targetInterface;
  const viewPorteria = document.getElementById('interfacePorteriaWeb');
  const viewEmpleado = document.getElementById('interfaceEmpleadoCelular');

  setViewButtonState(targetInterface);

  if (targetInterface === 'PORTERIA') {
    viewPorteria.classList.remove('hidden');
    viewEmpleado.classList.add('hidden');
    cargarCatalogoPorteria();
  } else {
    viewEmpleado.classList.remove('hidden');
    viewPorteria.classList.add('hidden');
    cargarPaseEmpleado();
    cargarHistorialEmpleado();
  }
}

// Logout
function logout() {
  localStorage.removeItem('parkgo_token');
  currentToken = null;
  currentUser = null;
  document.getElementById('loginSection').classList.remove('hidden');
  const regSec = document.getElementById('registroSection');
  if (regSec) regSec.classList.add('hidden');
  document.getElementById('userInfoHeader').classList.add('hidden');
  document.getElementById('viewSelectorGroup').classList.add('hidden');
  document.getElementById('interfacePorteriaWeb').classList.add('hidden');
  document.getElementById('interfaceEmpleadoCelular').classList.add('hidden');
}

function mostrarLogin() {
  logout();
}

// ========================================================
// LÓGICA PORTERÍA WEB (DESKTOP / GUARDA)
// ========================================================

async function cargarCatalogoPorteria() {
  const container = document.getElementById('gridCatalogoPorteria');
  if (!container) return;

  container.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400 font-bold"><i class="fa-solid fa-spinner fa-spin text-2xl text-orange-500 mb-2"></i><p>Cargando catálogo en tiempo real...</p></div>';

  try {
    const res = await fetch(`${API_URL}/web/accesos/catalogo`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();

    if (res.ok && data.catalogo) {
      catalogoCache = data.catalogo;
      actualizarEstadisticasPorteria(catalogoCache);
      renderizarGridCatalogo(catalogoCache);
    } else {
      container.innerHTML = `<p class="col-span-full text-center py-6 text-red-500 font-bold">Error: ${data.message || 'No se pudo cargar el catálogo'}</p>`;
    }
  } catch (err) {
    container.innerHTML = '<p class="col-span-full text-center py-6 text-red-500 font-bold">Error de red al consultar el catálogo.</p>';
  }
}

function actualizarEstadisticasPorteria(catalogo) {
  const total = catalogo.length;
  const ocupados = catalogo.filter(c => c.estado_cupo === 'OCUPADO').length;
  const reservados = catalogo.filter(c => c.estado_cupo === 'RESERVADO').length;
  const disponibles = catalogo.filter(c => c.estado_cupo === 'DISPONIBLE').length;

  document.getElementById('statTotalCupos').innerText = total;
  document.getElementById('statOcupados').innerText = ocupados;
  document.getElementById('statReservados').innerText = reservados;
  document.getElementById('statDisponibles').innerText = disponibles;
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

  renderizarGridCatalogo(catalogoCache);
}

function renderizarGridCatalogo(catalogo) {
  const container = document.getElementById('gridCatalogoPorteria');
  if (!container) return;

  let filtrados = catalogo;
  if (filtroActual !== 'TODOS') {
    filtrados = catalogo.filter(c => c.estado_cupo === filtroActual);
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
      <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition relative flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/60">${item.codigo_espacio} (${item.piso || 'Piso 1'})</span>
            ${badge}
          </div>

          <h4 class="text-lg font-black text-slate-800 tracking-tight mt-2">${item.placa || 'Sin Vehículo'}</h4>
          <p class="text-xs font-semibold text-slate-500">${item.vehiculo_info || 'Espacio libre'}</p>
          
          ${item.nombre_usuario ? `<p class="text-xs text-slate-600 mt-2 flex items-center gap-1 font-medium"><i class="fa-solid fa-user text-slate-400"></i> ${item.nombre_usuario}</p>` : ''}
          ${item.codigo_pase ? `<p class="text-[11px] font-mono text-orange-600 font-bold mt-1">Código: ${item.codigo_pase}</p>` : ''}
        </div>

        ${btnAccion}
      </div>
    `;
  }).join('');
}

// Búsqueda y Validación de Pase
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
      } else if (data.estado === 'EN_SITIO') {
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
            <span class="text-xs font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded font-mono">${data.codigo}</span>
            <span class="text-xs font-bold uppercase text-orange-700">Cupo: ${data.cupo}</span>
          </div>
          <h4 class="text-base font-extrabold text-slate-800 mt-1">${data.vehiculo?.marca || 'Vehículo'} (${data.vehiculo?.placa})</h4>
          <p class="text-xs text-slate-600">Conductor: ${data.usuario?.nombre} (${data.usuario?.correo})</p>
        </div>
        <div>
          ${btnAccionHtml}
        </div>
      `;
    } else {
      resultCard.className = 'mt-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold';
      resultCard.innerHTML = `<i class="fa-solid fa-circle-xmark text-base"></i> ${data.message || 'Código inválido o no encontrado.'}`;
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
      cargarCatalogoPorteria();
      document.getElementById('validationResultCard').classList.add('hidden');
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
      cargarCatalogoPorteria();
      document.getElementById('validationResultCard').classList.add('hidden');
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
      container.innerHTML = `
        <div class="bg-white rounded-[1.6rem] border border-orange-200 shadow-orange p-4 text-center relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-2 bg-orange-brand"></div>

          <div class="inline-block mb-3">
            <span class="badge-reservado text-[10px] font-extrabold px-3 py-1 rounded-full uppercase flex items-center gap-1">
              <i class="fa-solid fa-qrcode text-orange-500"></i> ${pase.estado === 'EN_SITIO' ? 'Dentro de la sede' : 'Reserva activa'}
            </span>
          </div>

          <div class="w-40 h-40 mx-auto bg-slate-900 rounded-[1.4rem] p-3 flex items-center justify-center relative shadow-inner my-2 border border-slate-700">
            <div class="scan-line"></div>
            <svg class="w-full h-full text-white fill-current" viewBox="0 0 24 24">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm2 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2z"/>
            </svg>
          </div>

          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] mt-2">Código de pase</p>
          <h3 class="text-2xl font-black text-orange-600 font-mono tracking-[0.22em]">${pase.codigo}</h3>

          <div class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase">Cupo</p>
              <p class="text-sm font-black text-slate-800">${pase.cupo}</p>
            </div>
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase">Vehículo</p>
              <p class="text-sm font-black text-slate-800">${pase.vehiculo?.placa || 'KTM-300'}</p>
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
      container.innerHTML = data.historial.map(item => `
        <div class="history-item">
          <div>
            <strong>${item.codigo}</strong>
            <small>Cupo: ${item.cupo} • ${item.vehiculo}</small>
          </div>
          <span class="status-chip ${item.estado === 'EN_SITIO' ? 'orange' : 'slate'}">${item.estado}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-[11px] text-slate-400 text-center py-2">Sin historial reciente.</p>';
    }
  } catch (err) {
    container.innerHTML = '<p class="text-[11px] text-red-400 text-center">No se pudo cargar historial.</p>';
  }
}

// Modal de Nueva Reserva
function abrirModalNuevaReserva() {
  document.getElementById('modalNuevaReserva').classList.remove('hidden');
}

function cerrarModalNuevaReserva() {
  document.getElementById('modalNuevaReserva').classList.add('hidden');
}

document.getElementById('reservaForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipoVehiculo = document.getElementById('reservaTipoVehiculo').value;
  const placa = document.getElementById('reservaPlaca').value.trim();
  const fecha = document.getElementById('reservaFecha').value;
  const horaEntrada = document.getElementById('reservaHora').value;

  try {
    const res = await fetch(`${API_URL}/mobile/empleado/reserva`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tipoVehiculo, placa, fecha, horaEntrada })
    });
    const data = await res.json();

    if (res.ok) {
      alert(`🎉 ${data.message || 'Pase generado exitosamente'}\nCódigo: ${data.codigo}\nCupo Asignado: ${data.cupo}`);
      cerrarModalNuevaReserva();
      cargarPaseEmpleado();
      cargarHistorialEmpleado();
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch (err) {
    alert('Error al generar la reserva.');
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