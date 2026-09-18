const API_URL = '/api/v1';
let token = localStorage.getItem('parkgo_token');

// Verificar sesión activa al cargar
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    mostrarDashboard();
  } else {
    mostrarLogin();
  }
});

// Evento de Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const correo_corporativo = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo_corporativo, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('parkgo_token', token);
      mostrarDashboard();
    } else {
      alert(data.message || data.mensaje || 'Credenciales incorrectas');
    }
  } catch (error) {
    alert('Error al conectar con el servidor.');
  }
});

// Control de Vistas
function mostrarDashboard() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('userInfo').classList.remove('hidden');
  cargarCatalogo();
}

function mostrarLogin() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('dashboardSection').classList.add('hidden');
  document.getElementById('userInfo').classList.add('hidden');
}

function logout() {
  localStorage.removeItem('parkgo_token');
  token = null;
  mostrarLogin();
}

// Cargar estado actual de la reserva
async function cargarCatalogo() {
  const grid = document.getElementById('gridCatalogo');
  if (!grid) return;
  
  grid.innerHTML = '<p class="text-slate-500 col-span-full text-center py-4">Cargando catálogo...</p>';

  try {
    const res = await fetch(`${API_URL}/web/accesos/validar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo: 'PARK-8892' })
    });

    const data = await res.json();

    if (res.ok) {
      const codigoPase = data.codigo || 'PARK-8892';
      const estado = data.estado || 'ACTIVA';

      let botonAccion = '';
      let badgeEstado = '';

      if (estado === 'ACTIVA') {
        badgeEstado = `<span class="absolute top-3 right-3 text-xs bg-amber-200 text-amber-800 font-bold px-2 py-1 rounded">RESERVADO</span>`;
        botonAccion = `
          <button onclick="confirmarCheckIn('${codigoPase}')" class="mt-4 w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-emerald-700 transition">
            Registrar Check-In (Entrada)
          </button>`;
      } else if (estado === 'EN_SITIO') {
        badgeEstado = `<span class="absolute top-3 right-3 text-xs bg-blue-200 text-blue-800 font-bold px-2 py-1 rounded">EN SITIO</span>`;
        botonAccion = `
          <button onclick="confirmarCheckOut('${codigoPase}')" class="mt-4 w-full bg-red-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-red-700 transition">
            Registrar Check-Out (Salida)
          </button>`;
      } else {
        badgeEstado = `<span class="absolute top-3 right-3 text-xs bg-gray-200 text-gray-800 font-bold px-2 py-1 rounded">FINALIZADA</span>`;
        botonAccion = `
          <p class="mt-4 text-center text-xs text-slate-500 font-bold">Estancia completada</p>`;
      }

      grid.innerHTML = `
        <div class="border rounded-xl p-4 bg-white shadow-sm relative">
          ${badgeEstado}
          <p class="text-xs text-slate-500 font-bold uppercase">Cupo: ${data.cupo || 'A-101'}</p>
          <h3 class="text-xl font-black text-slate-800 mt-1">${data.vehiculo?.placa || 'KTM-300'}</h3>
          <p class="text-sm text-slate-600 mt-1">${data.usuario?.nombre || 'Luis Vargas'}</p>
          ${botonAccion}
        </div>
      `;
    } else {
      grid.innerHTML = '<p class="text-red-500 col-span-full text-center py-4">Error al cargar datos del catálogo.</p>';
    }
  } catch (err) {
    grid.innerHTML = '<p class="text-red-500 col-span-full text-center py-4">Error de conexión.</p>';
  }
}

// Búsqueda Manual
document.getElementById('searchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigoPase').value.trim();
  if (codigo) {
    confirmarCheckIn(codigo);
  }
});

// Acción Check-In
async function confirmarCheckIn(codigo) {
  if (!confirm(`¿Confirmar ENTRADA para el pase ${codigo}?`)) return;

  try {
    const res = await fetch(`${API_URL}/web/accesos/check-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ ¡Entrada registrada con éxito!\nHora: ${data.hora_entrada || new Date().toLocaleTimeString()}`);
      cargarCatalogo();
    } else {
      alert(`❌ Error: ${data.message || 'No se pudo registrar la entrada'}`);
    }
  } catch (error) {
    alert('Error al conectar con el servidor.');
  }
}

// Acción Check-Out
async function confirmarCheckOut(codigo) {
  if (!confirm(`¿Confirmar SALIDA para el pase ${codigo}?`)) return;

  try {
    const res = await fetch(`${API_URL}/web/accesos/check-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ ¡Salida registrada con éxito!\nCupo ${data.cupo} liberado.\nHora: ${data.hora_salida || new Date().toLocaleTimeString()}`);
      cargarCatalogo();
    } else {
      alert(`❌ Error: ${data.message || 'No se pudo registrar la salida'}`);
    }
  } catch (error) {
    alert('Error al conectar con el servidor.');
  }
}