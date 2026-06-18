// Gestion des clients
const AVATAR_STYLES = [
  'bg-primary-fixed text-on-primary-fixed-variant',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'bg-primary-fixed-dim text-on-primary-fixed-variant',
  'bg-secondary-fixed text-on-secondary-fixed-variant',
  'bg-surface-variant text-on-surface'
];

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

function avatarStyleFor(id) {
  return AVATAR_STYLES[id % AVATAR_STYLES.length];
}

let customersState = { page: 1, pageSize: PAGE_SIZE, sortKey: 'name', sortDir: 'asc', all: [] };

async function loadCustomersModule() {
  const contentArea = document.getElementById('contentArea');

  contentArea.innerHTML = `
    <div class="flex justify-between items-end mb-xl">
      <div>
        <h2 class="font-headline-md text-headline-md text-on-surface">Clients</h2>
        <p class="font-body-md text-body-md text-secondary">Gérer la relation client et les informations de facturation</p>
      </div>
      <button onclick="showAddCustomerForm()" class="flex items-center gap-2 bg-primary text-on-primary px-lg py-2.5 rounded-lg font-label-md text-label-md shadow-sm hover:opacity-90 active:scale-95 transition-all">
        <span class="material-symbols-outlined text-[20px]">add</span>
        Ajouter un client
      </button>
    </div>
    <div class="flex gap-3 mb-lg">
      <div class="relative flex-1 max-w-md">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input id="searchInput" type="text" class="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Rechercher par nom...">
      </div>
      <button onclick="searchCustomers()" class="px-6 py-2.5 bg-surface-container-lowest border border-outline-variant text-secondary font-label-md rounded-lg hover:bg-surface-container transition-all active:scale-95">Rechercher</button>
    </div>
    <div id="customerStats" class="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl"></div>
    <div id="customersList"></div>
  `;

  await loadCustomers();
}

async function loadCustomers() {
  try {
    const customers = await authenticatedFetch(`${API_BASE_URL}/customers`).then(r => r.json());
    customersState.page = 1;
    displayCustomers(customers);
  } catch (error) {
    showAlert('Erreur lors du chargement des clients', 'error');
  }
}

function displayCustomers(customers) {
  customersState.all = customers;

  const statsEl = document.getElementById('customerStats');
  const today = new Date().toDateString();
  const newToday = customers.filter(c => new Date(c.createdAt).toDateString() === today).length;
  const withEmail = customers.filter(c => c.email).length;

  statsEl.innerHTML = `
    <div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
      <p class="text-label-sm font-label-sm text-secondary uppercase tracking-wider mb-1">Total clients</p>
      <p class="text-display-lg font-display-lg text-on-surface">${customers.length}</p>
    </div>
    <div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
      <p class="text-label-sm font-label-sm text-secondary uppercase tracking-wider mb-1">Nouveaux aujourd'hui</p>
      <p class="text-display-lg font-display-lg text-on-surface">${newToday}</p>
    </div>
    <div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
      <p class="text-label-sm font-label-sm text-secondary uppercase tracking-wider mb-1">Avec email renseigné</p>
      <p class="text-display-lg font-display-lg text-on-surface">${withEmail}</p>
    </div>
  `;

  const customersList = document.getElementById('customersList');

  if (customers.length === 0) {
    customersList.innerHTML = '<p class="text-secondary p-lg">Aucun client trouvé</p>';
    return;
  }

  const sorted = sortItems(customers, customersState.sortKey, customersState.sortDir);
  const start = (customersState.page - 1) * customersState.pageSize;
  const pageItems = sorted.slice(start, start + customersState.pageSize);

  let rows = '';
  pageItems.forEach(customer => {
    rows += `
      <tr class="group hover:bg-surface-container-low transition-colors">
        <td class="px-lg py-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${avatarStyleFor(customer.id)}">${escapeHtml(initialsOf(customer.name))}</div>
            <p class="font-label-md text-label-md text-on-surface">${escapeHtml(customer.name)}</p>
          </div>
        </td>
        <td class="px-lg py-4 text-body-md text-on-surface-variant">${escapeHtml(customer.email) || 'N/A'}</td>
        <td class="px-lg py-4 text-body-md text-on-surface-variant">${escapeHtml(customer.phone) || 'N/A'}</td>
        <td class="px-lg py-4 text-body-md text-on-surface-variant">${escapeHtml(customer.address) || 'N/A'}</td>
        <td class="px-lg py-4 text-body-md text-on-surface-variant">${new Date(customer.createdAt).toLocaleDateString()}</td>
        <td class="px-lg py-4 text-right">
          <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="editCustomer(${customer.id})" class="p-2 hover:bg-surface-container rounded-lg text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">edit</span></button>
            <button onclick="deleteCustomer(${customer.id})" class="p-2 hover:bg-error-container/50 rounded-lg text-error transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
          </div>
        </td>
      </tr>
    `;
  });

  customersList.innerHTML = `
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low border-b border-outline-variant">
              ${sortableHeader('Nom', 'name', customersState, 'sortCustomers')}
              ${sortableHeader('Email', 'email', customersState, 'sortCustomers')}
              <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider">Téléphone</th>
              <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider">Adresse</th>
              ${sortableHeader("Date d'inscription", 'createdAt', customersState, 'sortCustomers')}
              <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container">
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationControls(customersState, customers.length, 'changeCustomersPage')}
    </div>
  `;
}

function sortCustomers(key) {
  if (customersState.sortKey === key) {
    customersState.sortDir = customersState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    customersState.sortKey = key;
    customersState.sortDir = 'asc';
  }
  displayCustomers(customersState.all);
}

function changeCustomersPage(page) {
  customersState.page = page;
  displayCustomers(customersState.all);
}

async function searchCustomers() {
  const keyword = document.getElementById('searchInput').value;

  if (!keyword) {
    await loadCustomers();
    return;
  }

  try {
    const customers = await authenticatedFetch(`${API_BASE_URL}/customers/search?name=${encodeURIComponent(keyword)}`)
      .then(r => r.json());
    customersState.page = 1;
    displayCustomers(customers);
  } catch (error) {
    showAlert('Erreur lors de la recherche', 'error');
  }
}

function showAddCustomerForm() {
  const formHtml = `
    <form id="customerForm" class="space-y-md">
      <div>
        ${fieldLabel('Nom complet *')}
        <input class="${inputClass}" type="text" name="name" required>
      </div>
      <div>
        ${fieldLabel('Email')}
        <input class="${inputClass}" type="email" name="email">
      </div>
      <div>
        ${fieldLabel('Téléphone')}
        <input class="${inputClass}" type="tel" name="phone" pattern="[0-9]{10}" placeholder="0612345678">
      </div>
      <div>
        ${fieldLabel('Adresse')}
        <textarea class="${inputClass} resize-none" name="address" rows="3"></textarea>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Créer</button>
      </div>
    </form>
  `;

  showModal('Ajouter un client', formHtml);

  document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const customer = {
      name: formData.get('name'),
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      address: formData.get('address') || null
    };

    try {
      await authenticatedFetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        body: JSON.stringify(customer)
      });

      closeModal();
      await loadCustomers();
      showAlert('Client créé avec succès');
    } catch (error) {
      showAlert('Erreur lors de la création', 'error');
    }
  });
}

async function editCustomer(id) {
  const customer = await authenticatedFetch(`${API_BASE_URL}/customers/${id}`).then(r => r.json());

  const formHtml = `
    <form id="customerForm" class="space-y-md">
      <input type="hidden" name="id" value="${customer.id}">
      <div>
        ${fieldLabel('Nom complet *')}
        <input class="${inputClass}" type="text" name="name" value="${escapeHtml(customer.name)}" required>
      </div>
      <div>
        ${fieldLabel('Email')}
        <input class="${inputClass}" type="email" name="email" value="${escapeHtml(customer.email || '')}">
      </div>
      <div>
        ${fieldLabel('Téléphone')}
        <input class="${inputClass}" type="tel" name="phone" value="${escapeHtml(customer.phone || '')}">
      </div>
      <div>
        ${fieldLabel('Adresse')}
        <textarea class="${inputClass} resize-none" name="address" rows="3">${escapeHtml(customer.address || '')}</textarea>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Mettre à jour</button>
      </div>
    </form>
  `;

  showModal('Modifier le client', formHtml);

  document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const customer = {
      id: parseInt(formData.get('id'), 10),
      name: formData.get('name'),
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      address: formData.get('address') || null
    };

    try {
      await authenticatedFetch(`${API_BASE_URL}/customers/${customer.id}`, {
        method: 'PUT',
        body: JSON.stringify(customer)
      });

      closeModal();
      await loadCustomers();
      showAlert('Client mis à jour avec succès');
    } catch (error) {
      showAlert('Erreur lors de la mise à jour', 'error');
    }
  });
}

async function deleteCustomer(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
    return;
  }

  try {
    await authenticatedFetch(`${API_BASE_URL}/customers/${id}`, { method: 'DELETE' });
    await loadCustomers();
    showAlert('Client supprimé avec succès');
  } catch (error) {
    showAlert('Erreur lors de la suppression', 'error');
  }
}
