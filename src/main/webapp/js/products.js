// Gestion des produits
let productsState = { page: 1, pageSize: PAGE_SIZE, sortKey: 'name', sortDir: 'asc', all: [] };

async function loadProductsModule() {
  const contentArea = document.getElementById('contentArea');

  contentArea.innerHTML = `
    <div class="flex justify-between items-end mb-xl">
      <div>
        <h2 class="font-headline-md text-headline-md text-on-surface">Inventaire produits</h2>
        <p class="font-body-md text-body-md text-secondary">Gérer le catalogue et les niveaux de stock</p>
      </div>
      <div class="flex gap-3">
        <button onclick="showAddProductForm()" class="px-6 py-2.5 bg-primary text-on-primary font-label-md rounded-lg flex items-center gap-2 hover:bg-on-primary-fixed-variant shadow-md shadow-primary/20 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[20px]">add</span>
          Ajouter un produit
        </button>
      </div>
    </div>
    <div class="search-bar flex gap-3 mb-lg">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input id="searchInput" type="text" class="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Rechercher par nom, catégorie ou code-barres...">
      </div>
      <button onclick="searchProducts()" class="px-6 py-2.5 bg-surface-container-lowest border border-outline-variant text-secondary font-label-md rounded-lg hover:bg-surface-container transition-all active:scale-95">Rechercher</button>
    </div>
    <div id="productStats" class="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xl"></div>
    <div id="productsList"></div>
  `;

  await loadProducts();
}

function statMini(label, value, valueClass, icon, iconClass, hint) {
  return `
    <div class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm">
      <div class="flex justify-between items-start mb-sm">
        <span class="text-label-sm text-secondary uppercase tracking-tighter">${escapeHtml(label)}</span>
        <span class="material-symbols-outlined ${iconClass || 'text-primary'}">${icon}</span>
      </div>
      <div class="font-display-lg text-display-lg ${valueClass || ''}">${value}</div>
      ${hint ? `<div class="text-label-sm text-on-surface-variant mt-1">${escapeHtml(hint)}</div>` : ''}
    </div>
  `;
}

async function loadProducts() {
  try {
    const products = await authenticatedFetch(`${API_BASE_URL}/products`).then(r => r.json());
    productsState.page = 1;
    displayProducts(products);
  } catch (error) {
    showAlert('Erreur lors du chargement des produits', 'error');
  }
}

function displayProducts(products) {
  productsState.all = products;

  const statsEl = document.getElementById('productStats');
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  statsEl.innerHTML = [
    statMini('Total SKU', products.length, '', 'inventory'),
    statMini('Alertes stock bas', lowStock, lowStock > 0 ? 'text-error' : '', 'warning', lowStock > 0 ? 'text-error' : 'text-secondary', lowStock > 0 ? 'Nécessite votre attention' : 'Tout va bien'),
    statMini('Rupture de stock', outOfStock, outOfStock > 0 ? 'text-error' : '', 'block', outOfStock > 0 ? 'text-error' : 'text-secondary'),
    statMini('Valeur du stock', inventoryValue.toFixed(2) + ' MRU', '', 'payments', 'text-tertiary', 'Au prix catalogue')
  ].join('');

  const productsList = document.getElementById('productsList');

  if (products.length === 0) {
    productsList.innerHTML = '<p class="text-secondary p-lg">Aucun produit trouvé</p>';
    return;
  }

  const sorted = sortItems(products, productsState.sortKey, productsState.sortDir);
  const start = (productsState.page - 1) * productsState.pageSize;
  const pageItems = sorted.slice(start, start + productsState.pageSize);

  let rows = '';
  pageItems.forEach(product => {
    const critical = product.quantity <= CRITICAL_STOCK_THRESHOLD;
    const low = product.quantity > CRITICAL_STOCK_THRESHOLD && product.quantity <= LOW_STOCK_THRESHOLD;
    const rowClass = critical ? 'bg-error-container/20 hover:bg-error-container/30' : 'hover:bg-surface-container';
    const stockBadge = critical
      ? `<span class="font-bold text-error">${product.quantity}</span><span class="material-symbols-outlined text-error text-[16px]">warning</span>`
      : low
        ? `<span class="font-bold text-amber-600">${product.quantity}</span><span class="material-symbols-outlined text-amber-600 text-[16px]">trending_down</span>`
        : `<span class="text-on-surface">${product.quantity}</span>`;

    rows += `
      <tr class="${rowClass} transition-colors group">
        <td class="px-lg py-4">
          <div class="font-label-md text-on-surface">${escapeHtml(product.name)}</div>
          <div class="text-body-sm text-secondary">${escapeHtml(product.description || '')}</div>
        </td>
        <td class="px-lg py-4"><span class="px-2 py-1 bg-surface-container text-secondary text-label-sm rounded">${escapeHtml(product.categoryName) || 'Non catégorisé'}</span></td>
        <td class="px-lg py-4 font-body-md text-on-surface">${product.price.toFixed(2)} MRU</td>
        <td class="px-lg py-4"><div class="flex items-center gap-2">${stockBadge}</div></td>
        <td class="px-lg py-4 font-mono text-body-sm text-on-surface-variant">${escapeHtml(product.barcode) || 'N/A'}</td>
        <td class="px-lg py-4 text-right">
          <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="editProduct(${product.id})" class="p-2 hover:bg-surface-container rounded-lg text-primary transition-colors"><span class="material-symbols-outlined">edit</span></button>
            <button onclick="deleteProduct(${product.id})" class="p-2 hover:bg-error-container/50 rounded-lg text-error transition-colors"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </td>
      </tr>
    `;
  });

  productsList.innerHTML = `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low border-b border-outline-variant">
              ${sortableHeader('Nom', 'name', productsState, 'sortProducts')}
              ${sortableHeader('Catégorie', 'categoryName', productsState, 'sortProducts')}
              ${sortableHeader('Prix', 'price', productsState, 'sortProducts')}
              ${sortableHeader('Stock', 'quantity', productsState, 'sortProducts')}
              <th class="px-lg py-4 font-label-sm text-secondary uppercase">Code-barres</th>
              <th class="px-lg py-4 font-label-sm text-secondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/30">
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationControls(productsState, products.length, 'changeProductsPage')}
    </div>
  `;
}

function sortProducts(key) {
  if (productsState.sortKey === key) {
    productsState.sortDir = productsState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    productsState.sortKey = key;
    productsState.sortDir = 'asc';
  }
  displayProducts(productsState.all);
}

function changeProductsPage(page) {
  productsState.page = page;
  displayProducts(productsState.all);
}

async function searchProducts() {
  const keyword = document.getElementById('searchInput').value;

  if (!keyword) {
    await loadProducts();
    return;
  }

  try {
    const products = await authenticatedFetch(`${API_BASE_URL}/products/search?name=${encodeURIComponent(keyword)}`)
      .then(r => r.json());
    productsState.page = 1;
    displayProducts(products);
  } catch (error) {
    showAlert('Erreur lors de la recherche', 'error');
  }
}

async function loadCategoryOptions(selectedId) {
  const categories = await authenticatedFetch(`${API_BASE_URL}/categories`).then(r => r.json());
  return categories.map(c =>
    `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');
}

function fieldLabel(text) {
  return `<label class="block font-label-md text-label-md text-on-surface mb-xs">${text}</label>`;
}

const inputClass = 'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all';

async function showAddProductForm() {
  const categoryOptions = await loadCategoryOptions(null);

  const formHtml = `
    <form id="productForm" class="space-y-md">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div class="md:col-span-2">
          ${fieldLabel('Nom du produit *')}
          <input class="${inputClass}" type="text" name="name" required>
        </div>
        <div class="md:col-span-2">
          ${fieldLabel('Description')}
          <textarea class="${inputClass} resize-none" name="description" rows="3"></textarea>
        </div>
        <div>
          ${fieldLabel('Prix (MRU) *')}
          <input class="${inputClass}" type="number" step="0.01" min="0.01" name="price" required>
        </div>
        <div>
          ${fieldLabel('Quantité *')}
          <input class="${inputClass}" type="number" min="0" name="quantity" required>
        </div>
        <div>
          ${fieldLabel('Catégorie existante')}
          <select class="${inputClass}" name="categoryId">
            <option value="">Aucune</option>
            ${categoryOptions}
          </select>
        </div>
        <div>
          ${fieldLabel('Ou nouvelle catégorie')}
          <input class="${inputClass}" type="text" name="newCategory" placeholder="Laisser vide si non applicable">
        </div>
        <div class="md:col-span-2">
          ${fieldLabel('Code-barres')}
          <input class="${inputClass}" type="text" name="barcode">
        </div>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Créer</button>
      </div>
    </form>
  `;

  showModal('Ajouter un produit', formHtml);

  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
      const categoryId = await resolveCategoryId(formData);

      const product = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        quantity: parseInt(formData.get('quantity'), 10),
        categoryId: categoryId,
        barcode: formData.get('barcode') || null
      };

      await authenticatedFetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        body: JSON.stringify(product)
      });

      closeModal();
      await loadProducts();
      refreshNotifications();
      showAlert('Produit créé avec succès');
    } catch (error) {
      showAlert('Erreur lors de la création', 'error');
    }
  });
}

async function resolveCategoryId(formData) {
  const newCategory = (formData.get('newCategory') || '').trim();

  if (newCategory) {
    const response = await authenticatedFetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: newCategory })
    });
    const created = await response.json();
    return created.id;
  }

  const categoryId = formData.get('categoryId');
  return categoryId ? parseInt(categoryId, 10) : null;
}

async function editProduct(id) {
  const product = await authenticatedFetch(`${API_BASE_URL}/products/${id}`).then(r => r.json());
  const categoryOptions = await loadCategoryOptions(product.categoryId);

  const formHtml = `
    <form id="productForm" class="space-y-md">
      <input type="hidden" name="id" value="${product.id}">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div class="md:col-span-2">
          ${fieldLabel('Nom du produit *')}
          <input class="${inputClass}" type="text" name="name" value="${escapeHtml(product.name)}" required>
        </div>
        <div class="md:col-span-2">
          ${fieldLabel('Description')}
          <textarea class="${inputClass} resize-none" name="description" rows="3">${escapeHtml(product.description || '')}</textarea>
        </div>
        <div>
          ${fieldLabel('Prix (MRU) *')}
          <input class="${inputClass}" type="number" step="0.01" min="0.01" name="price" value="${product.price}" required>
        </div>
        <div>
          ${fieldLabel('Quantité *')}
          <input class="${inputClass}" type="number" min="0" name="quantity" value="${product.quantity}" required>
        </div>
        <div>
          ${fieldLabel('Catégorie existante')}
          <select class="${inputClass}" name="categoryId">
            <option value="">Aucune</option>
            ${categoryOptions}
          </select>
        </div>
        <div>
          ${fieldLabel('Ou nouvelle catégorie')}
          <input class="${inputClass}" type="text" name="newCategory" placeholder="Laisser vide si non applicable">
        </div>
        <div class="md:col-span-2">
          ${fieldLabel('Code-barres')}
          <input class="${inputClass}" type="text" name="barcode" value="${escapeHtml(product.barcode || '')}">
        </div>
      </div>
      <div class="flex justify-end gap-md pt-md border-t border-outline-variant">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Mettre à jour</button>
      </div>
    </form>
  `;

  showModal('Modifier le produit', formHtml);

  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
      const categoryId = await resolveCategoryId(formData);

      const updated = {
        id: parseInt(formData.get('id'), 10),
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        quantity: parseInt(formData.get('quantity'), 10),
        categoryId: categoryId,
        barcode: formData.get('barcode') || null
      };

      await authenticatedFetch(`${API_BASE_URL}/products/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });

      closeModal();
      await loadProducts();
      refreshNotifications();
      showAlert('Produit mis à jour avec succès');
    } catch (error) {
      showAlert('Erreur lors de la mise à jour', 'error');
    }
  });
}

async function deleteProduct(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
    return;
  }

  try {
    await authenticatedFetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
    await loadProducts();
    refreshNotifications();
    showAlert('Produit supprimé avec succès');
  } catch (error) {
    showAlert('Erreur lors de la suppression', 'error');
  }
}
