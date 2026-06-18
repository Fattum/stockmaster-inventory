// Gestion de l'authentification
// Contexte WAR = "inventory" (cf. <finalName> dans pom.xml), JAX-RS mappé sur /api (ApplicationConfig)
const API_BASE_URL = window.location.origin + '/inventory/api';
let currentUser = null;

function checkAuth() {
  const user = localStorage.getItem('currentUser');
  const token = localStorage.getItem('authToken');

  if (!user || !token) {
    window.location.href = 'login.html';
    return false;
  }

  currentUser = JSON.parse(user);

  const userFullNameEl = document.getElementById('userFullName');
  if (userFullNameEl) {
    userFullNameEl.textContent = currentUser.fullName;
  }

  const roleBadgeEl = document.getElementById('roleBadge');
  if (roleBadgeEl) {
    roleBadgeEl.textContent = currentUser.role === 'ADMIN' ? 'Administrateur' : 'Employé';
  }

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.role === 'ADMIN' ? 'flex' : 'none';
  });

  return true;
}

if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token);
        window.location.href = 'index.html';
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError('Erreur de connexion au serveur');
    }
  });
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  setTimeout(() => {
    errorDiv.classList.add('hidden');
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      window.location.href = 'login.html';
    });
  }
});

async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = token;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
    throw new Error('Non autorisé');
  }

  return response;
}
