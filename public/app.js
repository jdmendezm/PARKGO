const API_URL = '/api/v1'; // Usa rutas relativas para producción y local
let token = localStorage.getItem('parkgo_token');

// Al cargar la página, verificar si hay sesión activa
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
      alert(data.mensaje || 'Credenciales incorrectas');
    }
  } catch (error) {
    alert('Error al conectar con el servidor.');
  }
});

// Funciones para cambiar vistas
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

// Cargar Catálogo desde la API
async function cargarCatalogo() {
  const grid = document.getElementById('gridCatalogo');
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
      const codigoPase = 'PARK-8892';
      grid.innerHTML = `
        <div class="border rounded-xl p-4 bg-amber-50 border-amber-300 shadow-sm relative">
          <span class="absolute top-3 right-3 text-xs bg-amber-200 text-amber-800 font-bold px-2 py-1 rounded">RESERVADO</span>
          <p class="text-xs text-slate-500 font-bold uppercase">Cupo: ${data.cupo || 'A-101'}</p>
          <h3 class="text-xl font-black text-slate-800 mt-1">${data.vehiculo?.placa || 'KTM-300'}</h3>
          <p class="text-sm text-slate-600 mt-1">${data.usuario?.nombre || 'Luis Vargas'}</p>
          <button onclick="confirmarCheckIn('${codigoPase}')" class="mt-4 w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-emerald-700 transition">
            Registrar Check-In
          </button>
        </div>
      `;
    } else {
      grid.innerHTML = '<p class="text-red-500 col-span-full text-center py-4">Error al cargar datos del catálogo.</p>';
    }
  } catch (err) {
    grid.innerHTML = '<p class="text-red-500 col-span-full text-center py-4">Error de conexión.</p>';
  }
}

// Evento Buscador Directo
document.getElementById('searchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigoPase').value.trim();
  if (codigo) {
    confirmarCheckIn(codigo);
  }
});

// Función de Registro de Check-In Real
async function confirmarCheckIn(codigo) {
  if (!confirm(`¿Confirmar ingreso para el pase ${codigo}?`)) return;

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
      alert(`✅ ¡Entrada registrada con éxito!\nHora de ingreso: ${new Date().toLocaleTimeString()}`);
      cargarCatalogo(); // Recargar el catálogo
    } else {
      alert(`❌ Error: ${data.mensaje || 'No se pudo realizar el check-in'}`);
    }
  } catch (error) {
    alert('Error al procesar el check-in con el servidor.');
  }
}