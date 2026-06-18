// Gestion des utilisateurs (admin uniquement)
let usersState = { page: 1, pageSize: PAGE_SIZE, sortKey: 'username', sortDir: 'asc', all: [] };

async function loadUsersModule() {
  const contentArea = document.getElementById('contentArea');

  contentArea.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
      <div>
        <h2 class="font-headline-md text-headline-md text-on-surface">Gestion des utilisateurs</h2>
        <p class="font-body-md text-body-md text-secondary">Contrôler les accès et les rôles administratifs</p>
      </div>
      <button onclick="showAddUserForm()" class="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all active:scale-95 shadow-md">
        <span class="material-symbols-outlined text-lg">person_add</span>
        Ajouter un utilisateur
      </button>
    </div>
    <div class="flex gap-3 mb-lg">
      <div class="relative flex-1 max-w-md">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input id="searchInput" type="text" class="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Rechercher par nom d'utilisateur, email ou nom complet...">
      </div>
      <button onclick="searchUsers()" class="px-6 py-2.5 bg-surface-container-lowest border border-outline-variant text-secondary font-label-md rounded-lg hover:bg-surface-container transition-all active:scale-95">Rechercher</button>
    </div>
    <div id="userStats" class="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-xl"></div>
    <div id="usersList" class="mb-xl"></div>
    <div>
      <h3 class="font-headline-sm text-headline-sm text-on-surface mb-md">Activité récente</h3>
      <div id="auditLogList" class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden"></div>
    </div>
  `;

  await Promise.all([loadUsers(), loadAuditLog()]);
}

const AUDIT_ACTION_LABELS = {
  LOGIN_SUCCESS: { label: 'Connexion réussie', icon: 'login', color: 'text-emerald-600' },
  LOGIN_FAILED: { label: 'Connexion échouée', icon: 'block', color: 'text-error' },
  USER_CREATED: { label: 'Utilisateur créé', icon: 'person_add', color: 'text-primary' },
  USER_UPDATED: { label: 'Utilisateur modifié', icon: 'edit', color: 'text-primary' },
  USER_TOGGLED: { label: 'Statut modifié', icon: 'toggle_on', color: 'text-amber-600' },
  USER_DEACTIVATED: { label: 'Utilisateur désactivé', icon: 'person_off', color: 'text-error' }
};

async function loadAuditLog() {
  const auditLogList = document.getElementById('auditLogList');

  try {
    const logs = await authenticatedFetch(`${API_BASE_URL}/audit-logs?limit=15`).then(r => r.json());

    if (logs.length === 0) {
      auditLogList.innerHTML = '<p class="text-secondary p-lg">Aucune activité enregistrée</p>';
      return;
    }

    auditLogList.innerHTML = logs.map(entry => {
      const meta = AUDIT_ACTION_LABELS[entry.action] || { label: entry.action, icon: 'info', color: 'text-secondary' };
      return `
        <div class="px-lg py-3 border-b border-outline-variant/30 last:border-b-0 flex items-center gap-3">
          <span class="material-symbols-outlined ${meta.color}">${meta.icon}</span>
          <div class="flex-1">
            <p class="font-label-md text-label-md text-on-surface">${meta.label}${entry.username ? ' — ' + escapeHtml(entry.username) : ''}</p>
            ${entry.details ? `<p class="text-body-sm text-secondary">${escapeHtml(entry.details)}</p>` : ''}
          </div>
          <span class="text-body-sm text-secondary whitespace-nowrap">${new Date(entry.createdAt).toLocaleString()}</span>
        </div>
      `;
    }).join('');
  } catch (error) {
    auditLogList.innerHTML = '<p class="text-secondary p-lg">Erreur lors du chargement de l\'activité</p>';
  }
}

async function loadUsers() {
  try {
    const users = await authenticatedFetch(`${API_BASE_URL}/users`).then(r => r.json());
    usersState.page = 1;
    displayUsers(users);
  } catch (error) {
    showAlert('Erreur lors du chargement des utilisateurs', 'error');
  }
}

function displayUsers(users) {
  usersState.all = users;

  const statsEl = document.getElementById('userStats');
  const admins = users.filter(u => u.role === 'ADMIN').length;
  const active = users.filter(u => u.active).length;

  statsEl.innerHTML = `
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Total utilisateurs</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${users.length}</h3>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Actifs</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${active}</h3>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Administrateurs</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${admins}</h3>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-1">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Employés</p>
      <h3 class="font-display-lg text-display-lg text-on-surface">${users.length - admins}</h3>
    </div>
  `;

  const usersList = document.getElementById('usersList');

  if (users.length === 0) {
    usersList.innerHTML = '<p class="text-secondary p-lg">Aucun utilisateur trouvé</p>';
    return;
  }

  const sorted = sortItems(users, usersState.sortKey, usersState.sortDir);
  const start = (usersState.page - 1) * usersState.pageSize;
  const pageItems = sorted.slice(start, start + usersState.pageSize);

  let rows = '';
  pageItems.forEach(user => {
    const roleBadgeClass = user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-secondary-container text-on-secondary-container';
    const roleLabel = user.role === 'ADMIN' ? 'Admin' : 'Employé';
    const isSelf = currentUser && currentUser.id === user.id;
    const lastLoginLabel = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais connecté';

    rows += `
      <tr class="hover:bg-surface-container transition-colors group">
        <td class="px-lg py-4">
          <p class="font-label-md text-label-md text-on-surface">${escapeHtml(user.username)}</p>
          <p class="text-body-sm text-secondary">${escapeHtml(user.fullName)} • ${escapeHtml(user.email)}</p>
        </td>
        <td class="px-lg py-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${roleBadgeClass} uppercase">${roleLabel}</span>
        </td>
        <td class="px-lg py-4">
          <label class="relative inline-flex items-center cursor-pointer ${isSelf ? 'opacity-50 pointer-events-none' : ''}">
            <input type="checkbox" class="sr-only peer" ${user.active ? 'checked' : ''} onchange="toggleUserStatus(${user.id})" ${isSelf ? 'disabled' : ''}>
            <div class="w-10 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            <span class="ms-3 text-body-sm font-medium text-on-surface">${user.active ? 'Actif' : 'Inactif'}</span>
          </label>
        </td>
        <td class="px-lg py-4 text-body-sm text-secondary">${lastLoginLabel}</td>
        <td class="px-lg py-4 text-right">
          <div class="flex justify-end gap-1">
            <button onclick="editUser(${user.id})" class="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded transition-all"><span class="material-symbols-outlined text-lg">edit</span></button>
          </div>
        </td>
      </tr>
    `;
  });

  usersList.innerHTML = `
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low border-b border-outline-variant">
              ${sortableHeader('Utilisateur', 'username', usersState, 'sortUsers')}
              ${sortableHeader('Rôle', 'role', usersState, 'sortUsers')}
              <th class="px-lg py-3 font-label-sm text-label-sm text-outline uppercase tracking-wider">Statut</th>
              ${sortableHeader('Dernière connexion', 'lastLogin', usersState, 'sortUsers')}
              <th class="px-lg py-3 font-label-sm text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationControls(usersState, users.length, 'changeUsersPage')}
    </div>
  `;
}

function sortUsers(key) {
  if (usersState.sortKey === key) {
    usersState.sortDir = usersState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    usersState.sortKey = key;
    usersState.sortDir = 'asc';
  }
  displayUsers(usersState.all);
}

function changeUsersPage(page) {
  usersState.page = page;
  displayUsers(usersState.all);
}

async function searchUsers() {
  const keyword = document.getElementById('searchInput').value;

  if (!keyword) {
    await loadUsers();
    return;
  }

  try {
    const users = await authenticatedFetch(`${API_BASE_URL}/users/search?keyword=${encodeURIComponent(keyword)}`)
      .then(r => r.json());
    usersState.page = 1;
    displayUsers(users);
  } catch (error) {
    showAlert('Erreur lors de la recherche', 'error');
  }
}

function showAddUserForm() {
  const formHtml = `
    <form id="userForm" class="space-y-md">
      <div>
        ${fieldLabel("Nom d'utilisateur *")}
        <input class="${inputClass}" type="text" name="username" minlength="3" maxlength="50" required>
      </div>
      <div>
        ${fieldLabel('Nom complet *')}
        <input class="${inputClass}" type="text" name="fullName" required>
      </div>
      <div>
        ${fieldLabel('Email *')}
        <input class="${inputClass}" type="email" name="email" required>
      </div>
      <div>
        ${fieldLabel('Mot de passe *')}
        <input class="${inputClass}" type="password" name="password" minlength="6" required>
      </div>
      <div>
        ${fieldLabel('Rôle *')}
        <select class="${inputClass}" name="role" required>
          <option value="EMPLOYEE">Employé</option>
          <option value="ADMIN">Administrateur</option>
        </select>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Créer</button>
      </div>
    </form>
  `;

  showModal('Ajouter un utilisateur', formHtml);

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const user = {
      username: formData.get('username'),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role')
    };

    try {
      await authenticatedFetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(user)
      });

      closeModal();
      await loadUsers();
      await loadAuditLog();
      showAlert('Utilisateur créé avec succès');
    } catch (error) {
      showAlert('Erreur lors de la création', 'error');
    }
  });
}

async function editUser(id) {
  const user = await authenticatedFetch(`${API_BASE_URL}/users/${id}`).then(r => r.json());

  const formHtml = `
    <form id="userForm" class="space-y-md">
      <input type="hidden" name="id" value="${user.id}">
      <div>
        ${fieldLabel("Nom d'utilisateur *")}
        <input class="${inputClass}" type="text" name="username" value="${escapeHtml(user.username)}" minlength="3" maxlength="50" required>
      </div>
      <div>
        ${fieldLabel('Nom complet *')}
        <input class="${inputClass}" type="text" name="fullName" value="${escapeHtml(user.fullName)}" required>
      </div>
      <div>
        ${fieldLabel('Email *')}
        <input class="${inputClass}" type="email" name="email" value="${escapeHtml(user.email)}" required>
      </div>
      <div>
        ${fieldLabel('Nouveau mot de passe')}
        <input class="${inputClass}" type="password" name="password" minlength="6" placeholder="Laisser vide pour ne pas changer">
      </div>
      <div>
        ${fieldLabel('Rôle *')}
        <select class="${inputClass}" name="role" required>
          <option value="EMPLOYEE" ${user.role === 'EMPLOYEE' ? 'selected' : ''}>Employé</option>
          <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Administrateur</option>
        </select>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Mettre à jour</button>
      </div>
    </form>
  `;

  showModal("Modifier l'utilisateur", formHtml);

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const updated = {
      id: parseInt(formData.get('id'), 10),
      username: formData.get('username'),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      password: formData.get('password') || null,
      role: formData.get('role')
    };

    try {
      await authenticatedFetch(`${API_BASE_URL}/users/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });

      closeModal();
      await loadUsers();
      await loadAuditLog();
      showAlert('Utilisateur mis à jour avec succès');
    } catch (error) {
      showAlert('Erreur lors de la mise à jour', 'error');
    }
  });
}

async function toggleUserStatus(id) {
  try {
    await authenticatedFetch(`${API_BASE_URL}/users/${id}/toggle`, { method: 'PATCH' });
    await loadUsers();
    await loadAuditLog();
    showAlert('Statut mis à jour avec succès');
  } catch (error) {
    showAlert('Erreur lors du changement de statut (dernier administrateur ?)', 'error');
    await loadUsers();
  }
}
