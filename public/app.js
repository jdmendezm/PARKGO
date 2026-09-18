const API_URL = 'https://parkgo-backend.onrender.com/api/v1'; // Cambiar a http://localhost:3000 si pruebas local
let token = localStorage.getItem('parkgo_token');

// Al cargar la página, verificar si hay sesión activa
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    mostrarDashboard();
  } else {
    mostrarLogin();
  }
});

// Evento Login
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

// Cambiar vistas
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
  grid.innerHTML = '<p class="text-slate-500">Cargando catálogo...</p>';

  try {
    // Petición a la API usando el Token Bearer
    const res = await fetch(`${API_URL}/web/accesos/validar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo: 'PARK-8892' }) // Prueba de datos dinámicos
    });

    const data = await res.json();

    if (res.ok) {
      // Mockup visual de tarjeta de catálogo con la respuesta del backend
      grid.innerHTML = `
        <div class="border rounded-xl p-4 bg-amber-50 border-amber-300 shadow-sm relative">
          <span class="absolute top-3 right-3 text-xs bg-amber-200 text-amber-800 font-bold px-2 py-1 rounded">RESERVADO</span>
          <p class="text-xs text-slate-500 font-bold uppercase">Cupo: ${data.cupo || 'A-101'}</p>
          <h3 class="text-xl font-black text-slate-800 mt-1">${data.vehiculo?.placa || 'KTM-300'}</h3>
          <p class="text-sm text-slate-600 mt-1">${data.usuario?.nombre || 'Luis Vargas'}</p>
          <button onclick="confirmarCheckIn('PARK-8892')" class="mt-4 w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-emerald-700 transition">
            Registrar Check-In
          </button>
        </div>
      `;
    } else {
      grid.innerHTML = '<p class="text-red-500">Error al cargar datos del catálogo.</p>';
    }
  } catch (err) {
    grid.innerHTML = '<p class="text-red-500">Error de conexión.</p>';
  }
}

// Evento Validar Buscador
document.getElementById('searchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = document.getElementById('codigoPase').value;
  confirmarCheckIn(codigo);
});

async function confirmarCheckIn(codigo) {
  alert(`Registrando entrada para el pase: ${codigo}`);
  // Aquí realiza el POST a /accesos/check-in
}