// Application principale
let currentModule = 'dashboard';

// Seuils d'alerte stock (purement client-side, pas de colonne "seuil" en base) :
// utilisés par le dashboard et la page Produits pour les badges/indicateurs visuels.
const LOW_STOCK_THRESHOLD = 20;
const CRITICAL_STOCK_THRESHOLD = 5;
const PAGE_SIZE = 10;

// Tri/pagination des tables : tout se fait côté client car les volumes de données
// de cette application restent modestes (pas de pagination serveur implémentée).
function sortItems(items, key, dir) {
  return [...items].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (va === null || va === undefined) va = '';
    if (vb === null || vb === undefined) vb = '';
    if (typeof va === 'string') {
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return dir === 'asc' ? va - vb : vb - va;
  });
}

function sortableHeader(label, key, state, onSortFn) {
  const active = state.sortKey === key;
  const icon = active ? (state.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
  return `<th class="px-lg py-3 font-label-sm text-label-sm text-secondary uppercase tracking-wider cursor-pointer select-none hover:text-primary transition-colors" onclick="${onSortFn}('${key}')">
    <span class="inline-flex items-center gap-1">${label}<span class="material-symbols-outlined text-[14px] ${active ? 'text-primary' : 'text-outline'}">${icon}</span></span>
  </th>`;
}

function paginationControls(state, totalItems, onChangeFn) {
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const startItem = totalItems === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const endItem = Math.min(state.page * state.pageSize, totalItems);

  return `
    <div class="flex items-center justify-between px-lg py-3 border-t border-outline-variant bg-surface-container-low/30">
      <span class="text-body-sm text-secondary">${startItem}-${endItem} sur ${totalItems}</span>
      <div class="flex items-center gap-2">
        <button onclick="${onChangeFn}(${state.page - 1})" ${state.page <= 1 ? 'disabled' : ''} class="p-1.5 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
        <span class="text-body-sm text-on-surface px-2">Page ${state.page} / ${totalPages}</span>
        <button onclick="${onChangeFn}(${state.page + 1})" ${state.page >= totalPages ? 'disabled' : ''} class="p-1.5 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  initNavigation();

  // Permet de partager/recharger un lien direct vers un onglet (?module=products).
  const requestedModule = new URLSearchParams(window.location.search).get('module') || 'dashboard';
  const navItem = document.querySelector(`.nav-item[data-module="${requestedModule}"]`);
  if (navItem) {
    setActiveNav(navItem);
  }
  loadModule(navItem ? requestedModule : 'dashboard');
  refreshNotifications();

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadModule(currentModule);
    refreshNotifications();
  });

  const notificationsBtn = document.getElementById('notificationsBtn');
  const notificationsDropdown = document.getElementById('notificationsDropdown');
  notificationsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!notificationsDropdown.contains(e.target) && e.target !== notificationsBtn) {
      notificationsDropdown.classList.add('hidden');
    }
  });
});

async function refreshNotifications() {
  try {
    const products = await authenticatedFetch(`${API_BASE_URL}/products`).then(r => r.json());
    const alerts = products
      .filter(p => p.quantity <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.quantity - b.quantity);

    const badge = document.getElementById('notificationsBadge');
    const list = document.getElementById('notificationsList');

    if (alerts.length === 0) {
      badge.classList.add('hidden');
      list.innerHTML = '<p class="text-body-sm text-secondary p-lg text-center">Aucune alerte de stock</p>';
      return;
    }

    badge.textContent = alerts.length > 99 ? '99+' : alerts.length;
    badge.classList.remove('hidden');

    list.innerHTML = alerts.map(p => {
      const critical = p.quantity === 0;
      return `
        <div class="px-lg py-3 border-b border-outline-variant/30 flex items-center gap-3 hover:bg-surface-container-low/40">
          <span class="material-symbols-outlined ${critical ? 'text-error' : 'text-amber-600'}">${critical ? 'block' : 'warning'}</span>
          <div class="flex-1">
            <p class="font-label-md text-label-md text-on-surface">${escapeHtml(p.name)}</p>
            <p class="text-body-sm ${critical ? 'text-error' : 'text-amber-600'}">${critical ? 'Rupture de stock' : p.quantity + ' unité(s) restante(s)'}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    // Silencieux : l'absence d'alertes ne doit jamais bloquer la navigation.
  }
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(item);
      loadModule(item.dataset.module);
    });
  });
}

function setActiveNav(activeItem) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('text-primary', 'bg-secondary-container', 'border-l-2', 'border-primary');
    item.classList.add('text-secondary');
  });
  activeItem.classList.add('text-primary', 'bg-secondary-container', 'border-l-2', 'border-primary');
  activeItem.classList.remove('text-secondary');
}

async function loadModule(module) {
  currentModule = module;
  const moduleTitle = document.getElementById('moduleTitle');

  switch (module) {
    case 'dashboard':
      moduleTitle.textContent = 'Dashboard';
      await loadDashboard();
      break;
    case 'products':
      moduleTitle.textContent = 'Produits';
      await loadProductsModule();
      break;
    case 'customers':
      moduleTitle.textContent = 'Clients';
      await loadCustomersModule();
      break;
    case 'invoices':
      moduleTitle.textContent = 'Factures';
      await loadInvoicesModule();
      break;
    case 'users':
      if (currentUser.role === 'ADMIN') {
        moduleTitle.textContent = 'Utilisateurs';
        await loadUsersModule();
      }
      break;
  }
}

function statCard(icon, label, value, hint, hintClass) {
  return `
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm hover:border-primary/30 transition-colors group">
      <div class="flex justify-between items-start mb-sm">
        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider">${escapeHtml(label)}</span>
        <span class="material-symbols-outlined text-primary p-2 bg-primary-fixed rounded-lg group-hover:scale-110 transition-transform">${icon}</span>
      </div>
      <h3 class="font-display-lg text-display-lg text-on-surface">${value}</h3>
      ${hint ? `<div class="flex items-center gap-1 mt-2 ${hintClass || 'text-secondary'}"><span class="text-label-sm">${escapeHtml(hint)}</span></div>` : ''}
    </div>
  `;
}

async function loadDashboard() {
  const contentArea = document.getElementById('contentArea');

  try {
    const products = await authenticatedFetch(`${API_BASE_URL}/products`).then(r => r.json());
    const customers = await authenticatedFetch(`${API_BASE_URL}/customers`).then(r => r.json());
    const invoices = await authenticatedFetch(`${API_BASE_URL}/invoices`).then(r => r.json());

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const recentInvoices = invoices.slice(0, 5);

    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    const healthyCount = products.length - lowStockCount - outOfStockCount;
    const stockHealthPct = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100;

    const today = new Date().toDateString();
    const newToday = customers.filter(c => new Date(c.createdAt).toDateString() === today).length;

    let invoicesRows = '';
    for (const invoice of recentInvoices) {
      invoicesRows += `
        <tr class="hover:bg-surface-container-low/40 transition-colors">
          <td class="px-lg py-4 font-body-md text-body-md text-primary font-semibold">${escapeHtml(invoice.invoiceNumber)}</td>
          <td class="px-lg py-4 font-body-md text-body-md text-on-surface">${escapeHtml(invoice.customerName)}</td>
          <td class="px-lg py-4 font-body-md text-body-md text-secondary">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
          <td class="px-lg py-4 font-body-md text-body-md font-medium text-on-surface text-right">${invoice.totalAmount.toFixed(2)} MRU</td>
        </tr>
      `;
    }

    contentArea.innerHTML = `
      <div class="mb-xl">
        <h2 class="font-display-lg text-display-lg text-on-surface">Vue d'ensemble</h2>
        <p class="font-body-md text-body-md text-secondary">Gérez votre stock et suivez vos dernières transactions.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-2xl">
        ${statCard('inventory', 'Produits', products.length)}
        ${statCard('groups', 'Clients', customers.length, newToday > 0 ? `${newToday} nouveau(x) aujourd'hui` : null, 'text-emerald-600')}
        ${statCard('receipt_long', 'Factures', invoices.length)}
        ${statCard('payments', "Chiffre d'affaires", totalRevenue.toFixed(2) + ' MRU')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        <div class="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div class="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
            <h3 class="font-headline-sm text-headline-sm text-on-surface">Dernières factures</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low/50">
                  <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider">N° Facture</th>
                  <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider">Client</th>
                  <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider">Date</th>
                  <th class="px-lg py-4 font-label-sm text-label-sm text-secondary uppercase tracking-wider text-right">Montant</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/30">
                ${invoicesRows || '<tr><td colspan="4" class="px-lg py-6 text-center text-secondary">Aucune facture pour le moment</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="space-y-lg">
          <div class="bg-primary text-white p-lg rounded-xl shadow-lg relative overflow-hidden">
            <div class="relative z-10">
              <h3 class="font-headline-sm text-headline-sm mb-2">Nouvelle entrée</h3>
              <p class="font-body-sm text-body-sm opacity-80 mb-lg">Créez un produit ou une facture instantanément.</p>
              <div class="grid grid-cols-2 gap-md">
                <button onclick="document.querySelector('[data-module=products]').click(); showAddProductForm();" class="bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-3 flex flex-col items-center gap-2">
                  <span class="material-symbols-outlined">add_shopping_cart</span>
                  <span class="font-label-sm text-label-sm">Produit</span>
                </button>
                <button onclick="document.querySelector('[data-module=invoices]').click(); setTimeout(showCreateInvoiceForm, 50);" class="bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-3 flex flex-col items-center gap-2">
                  <span class="material-symbols-outlined">post_add</span>
                  <span class="font-label-sm text-label-sm">Facture</span>
                </button>
              </div>
            </div>
            <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <h3 class="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-md">Santé du stock</h3>
            <div class="space-y-md">
              <div>
                <div class="flex justify-between mb-1">
                  <span class="font-body-sm text-body-sm text-on-surface">Niveau de stock sain</span>
                  <span class="font-label-sm text-label-sm text-primary">${stockHealthPct}%</span>
                </div>
                <div class="w-full bg-surface-container rounded-full h-1.5">
                  <div class="bg-primary h-1.5 rounded-full" style="width: ${stockHealthPct}%"></div>
                </div>
              </div>
              ${(lowStockCount + outOfStockCount) > 0 ? `
              <div class="pt-2">
                <div class="flex items-center gap-3 p-3 bg-error-container/20 rounded-lg border border-error/10">
                  <span class="material-symbols-outlined text-error">warning</span>
                  <span class="font-body-sm text-body-sm text-on-error-container">${lowStockCount} produit(s) en stock bas, ${outOfStockCount} en rupture</span>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    contentArea.innerHTML = '<div class="bg-error-container text-on-error-container rounded-lg p-md">Erreur lors du chargement du dashboard</div>';
  }
}

function showModal(title, body) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modal.classList.remove('hidden');

  modal.querySelector('.close').onclick = () => {
    modal.classList.add('hidden');
  };

  modal.onclick = (event) => {
    if (event.target === modal) {
      modal.classList.add('hidden');
    }
  };
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  const isError = type === 'error';
  alertDiv.className = `mb-lg rounded-lg p-3 text-body-sm ${isError ? 'bg-error-container text-on-error-container' : 'bg-emerald-100 text-emerald-700'}`;
  alertDiv.textContent = message;

  const contentArea = document.getElementById('contentArea');
  contentArea.insertBefore(alertDiv, contentArea.firstChild);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Les données affichées (noms de produits/clients/utilisateurs...) viennent de saisies utilisateur :
// on échappe systématiquement avant de les injecter via innerHTML pour éviter le XSS stocké.
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
