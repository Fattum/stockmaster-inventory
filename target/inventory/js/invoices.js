// Gestion des factures
let invoicesState = { page: 1, pageSize: PAGE_SIZE, sortKey: 'invoiceDate', sortDir: 'desc', all: [] };

async function loadInvoicesModule() {
  const contentArea = document.getElementById('contentArea');

  contentArea.innerHTML = `
    <div class="flex justify-between items-end mb-xl">
      <div>
        <h2 class="font-headline-md text-headline-md text-on-surface">Factures</h2>
        <p class="font-body-md text-body-md text-secondary">Gérer la facturation et le suivi des paiements</p>
      </div>
      <button onclick="showCreateInvoiceForm()" class="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md text-label-md shadow-sm hover:brightness-110 active:scale-95 transition-all">
        <span class="material-symbols-outlined text-[20px]">add</span>
        Nouvelle facture
      </button>
    </div>
    <div id="invoiceStats" class="grid grid-cols-1 md:grid-cols-4 gap-lg mb-xl"></div>
    <div id="invoicesList"></div>
  `;

  await loadInvoices();
}

async function loadInvoices() {
  try {
    const invoices = await authenticatedFetch(`${API_BASE_URL}/invoices`).then(r => r.json());
    invoicesState.page = 1;
    displayInvoices(invoices);
  } catch (error) {
    showAlert('Erreur lors du chargement des factures', 'error');
  }
}

function displayInvoices(invoices) {
  invoicesState.all = invoices;

  const statsEl = document.getElementById('invoiceStats');
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const avgAmount = invoices.length > 0 ? totalRevenue / invoices.length : 0;
  const now = new Date();
  const thisMonth = invoices.filter(inv => {
    const d = new Date(inv.invoiceDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  statsEl.innerHTML = `
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-2">Chiffre d'affaires total</p>
      <p class="font-display-lg text-display-lg text-primary">${totalRevenue.toFixed(2)} MRU</p>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-2">Nombre de factures</p>
      <p class="font-display-lg text-display-lg text-on-surface">${invoices.length}</p>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-2">Montant moyen</p>
      <p class="font-display-lg text-display-lg text-on-surface">${avgAmount.toFixed(2)} MRU</p>
    </div>
    <div class="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
      <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-2">Ce mois-ci</p>
      <p class="font-display-lg text-display-lg text-on-surface">${thisMonth}</p>
    </div>
  `;

  const invoicesList = document.getElementById('invoicesList');

  if (invoices.length === 0) {
    invoicesList.innerHTML = '<p class="text-secondary p-lg">Aucune facture trouvée</p>';
    return;
  }

  const sorted = sortItems(invoices, invoicesState.sortKey, invoicesState.sortDir);
  const start = (invoicesState.page - 1) * invoicesState.pageSize;
  const pageItems = sorted.slice(start, start + invoicesState.pageSize);

  let rows = '';
  pageItems.forEach(invoice => {
    rows += `
      <tr class="hover:bg-background transition-colors group">
        <td class="px-lg py-4 font-body-md text-body-md font-semibold text-primary">${escapeHtml(invoice.invoiceNumber)}</td>
        <td class="px-lg py-4 font-body-md text-body-md text-on-surface">${escapeHtml(invoice.customerName)}</td>
        <td class="px-lg py-4 font-body-md text-body-md text-secondary">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
        <td class="px-lg py-4 font-body-md text-body-md text-right font-bold text-on-surface">${invoice.totalAmount.toFixed(2)} MRU</td>
        <td class="px-lg py-4 text-right">
          <button onclick="viewInvoice(${invoice.id})" class="p-2 text-outline hover:text-primary transition-colors"><span class="material-symbols-outlined">visibility</span></button>
        </td>
      </tr>
    `;
  });

  invoicesList.innerHTML = `
    <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-surface-container-low/50">
            <tr>
              ${sortableHeader('N° Facture', 'invoiceNumber', invoicesState, 'sortInvoices')}
              ${sortableHeader('Client', 'customerName', invoicesState, 'sortInvoices')}
              ${sortableHeader('Date', 'invoiceDate', invoicesState, 'sortInvoices')}
              ${sortableHeader('Montant total', 'totalAmount', invoicesState, 'sortInvoices')}
              <th class="px-lg py-3 font-label-sm text-label-sm text-secondary text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/30">
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationControls(invoicesState, invoices.length, 'changeInvoicesPage')}
    </div>
  `;
}

function sortInvoices(key) {
  if (invoicesState.sortKey === key) {
    invoicesState.sortDir = invoicesState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    invoicesState.sortKey = key;
    invoicesState.sortDir = 'asc';
  }
  displayInvoices(invoicesState.all);
}

function changeInvoicesPage(page) {
  invoicesState.page = page;
  displayInvoices(invoicesState.all);
}

async function viewInvoice(id) {
  const invoice = await authenticatedFetch(`${API_BASE_URL}/invoices/${id}`).then(r => r.json());

  let itemsRows = '';
  invoice.items.forEach(item => {
    itemsRows += `
      <tr class="border-b border-outline-variant/30">
        <td class="px-md py-3 text-body-md text-on-surface">${escapeHtml(item.productName)}</td>
        <td class="px-md py-3 text-body-md text-on-surface-variant text-center">${item.quantity}</td>
        <td class="px-md py-3 text-body-md text-on-surface-variant text-right">${item.unitPrice.toFixed(2)} MRU</td>
        <td class="px-md py-3 text-body-md font-bold text-on-surface text-right">${item.subtotal.toFixed(2)} MRU</td>
      </tr>
    `;
  });

  const html = `
    <div class="grid grid-cols-2 gap-md mb-lg">
      <div><p class="text-label-sm text-secondary uppercase">N° Facture</p><p class="font-label-md text-on-surface">${escapeHtml(invoice.invoiceNumber)}</p></div>
      <div><p class="text-label-sm text-secondary uppercase">Client</p><p class="font-label-md text-on-surface">${escapeHtml(invoice.customerName)}</p></div>
      <div><p class="text-label-sm text-secondary uppercase">Date</p><p class="font-label-md text-on-surface">${new Date(invoice.invoiceDate).toLocaleString()}</p></div>
      <div><p class="text-label-sm text-secondary uppercase">Total</p><p class="font-label-md text-primary font-bold">${invoice.totalAmount.toFixed(2)} MRU</p></div>
    </div>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-surface-container-low">
          <th class="px-md py-2 font-label-sm text-label-sm text-secondary uppercase">Produit</th>
          <th class="px-md py-2 font-label-sm text-label-sm text-secondary uppercase text-center">Quantité</th>
          <th class="px-md py-2 font-label-sm text-label-sm text-secondary uppercase text-right">Prix unitaire</th>
          <th class="px-md py-2 font-label-sm text-label-sm text-secondary uppercase text-right">Sous-total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="flex justify-between items-center pt-md mt-md border-t border-outline-variant">
      <button onclick='downloadInvoicePdf(${JSON.stringify(invoice).replace(/&/g, "&amp;").replace(/'/g, "&#39;")})' class="flex items-center gap-2 px-lg py-2 rounded-lg font-label-md text-label-md border border-outline text-secondary hover:bg-surface-container transition-all active:scale-95">
        <span class="material-symbols-outlined text-[18px]">download</span> Télécharger PDF
      </button>
      <div class="font-headline-sm text-headline-sm font-bold text-primary">Total : ${invoice.totalAmount.toFixed(2)} MRU</div>
    </div>
  `;

  showModal(`Facture ${invoice.invoiceNumber}`, html);
}

function downloadInvoicePdf(invoice) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('StockMaster', 14, 20);
  doc.setFontSize(11);
  doc.text('Facture', 14, 28);

  doc.setFontSize(10);
  doc.text(`N° Facture : ${invoice.invoiceNumber}`, 14, 40);
  doc.text(`Client : ${invoice.customerName}`, 14, 47);
  doc.text(`Date : ${new Date(invoice.invoiceDate).toLocaleString()}`, 14, 54);

  let y = 68;
  doc.setFont(undefined, 'bold');
  doc.text('Produit', 14, y);
  doc.text('Qté', 110, y);
  doc.text('Prix unitaire', 135, y);
  doc.text('Sous-total', 175, y);
  doc.setFont(undefined, 'normal');
  doc.line(14, y + 2, 196, y + 2);

  invoice.items.forEach(item => {
    y += 8;
    doc.text(String(item.productName), 14, y);
    doc.text(String(item.quantity), 110, y);
    doc.text(item.unitPrice.toFixed(2) + ' MRU', 135, y);
    doc.text(item.subtotal.toFixed(2) + ' MRU', 175, y);
  });

  y += 6;
  doc.line(14, y, 196, y);
  y += 10;
  doc.setFont(undefined, 'bold');
  doc.text(`Total : ${invoice.totalAmount.toFixed(2)} MRU`, 135, y);

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

async function showCreateInvoiceForm() {
  const [customers, products] = await Promise.all([
    authenticatedFetch(`${API_BASE_URL}/customers`).then(r => r.json()),
    authenticatedFetch(`${API_BASE_URL}/products`).then(r => r.json())
  ]);

  if (customers.length === 0) {
    showAlert('Créez un client avant de facturer', 'error');
    return;
  }
  if (products.length === 0) {
    showAlert('Créez un produit avant de facturer', 'error');
    return;
  }

  // Cache simple pour que addInvoiceLine()/updateInvoiceTotalPreview() accèdent aux prix sans refaire d'appel réseau.
  window.__invoiceProducts = products;

  const customerOptions = customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const formHtml = `
    <form id="invoiceForm" class="space-y-lg">
      <div>
        ${fieldLabel('Client *')}
        <select class="${inputClass}" name="customerId" required>
          <option value="">Sélectionner un client</option>
          ${customerOptions}
        </select>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h4 class="font-label-md text-label-md font-bold uppercase text-secondary">Lignes de facture</h4>
          <button type="button" onclick="addInvoiceLine()" class="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
            <span class="material-symbols-outlined text-[18px]">add_circle</span> Ajouter une ligne
          </button>
        </div>
        <div class="grid grid-cols-12 gap-3 px-2 font-label-sm text-label-sm text-outline">
          <div class="col-span-6">Produit</div>
          <div class="col-span-2">Quantité</div>
          <div class="col-span-3">Sous-total</div>
          <div class="col-span-1"></div>
        </div>
        <div id="invoiceLines" class="space-y-3"></div>
      </div>
      <div class="flex justify-end pt-md border-t border-outline-variant">
        <div class="font-headline-sm text-headline-sm font-bold text-primary">Total estimé : <span id="invoiceTotalPreview">0.00</span> MRU</div>
      </div>
      <div class="flex justify-end gap-md">
        <button type="button" onclick="closeModal()" class="px-lg py-sm rounded-lg font-label-md text-secondary border border-outline hover:bg-surface-container transition-all active:scale-95">Annuler</button>
        <button type="submit" class="px-lg py-sm rounded-lg font-label-md bg-primary text-on-primary hover:opacity-90 transition-all active:scale-95 shadow-sm">Créer la facture</button>
      </div>
    </form>
  `;

  showModal('Nouvelle facture', formHtml);
  addInvoiceLine();

  document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerId = parseInt(e.target.customerId.value, 10);
    const items = Array.from(document.querySelectorAll('.invoice-line'))
      .map(line => ({
        productId: parseInt(line.querySelector('.line-product').value, 10),
        quantity: parseInt(line.querySelector('.line-quantity').value, 10)
      }))
      .filter(item => item.productId && item.quantity > 0);

    if (!customerId || items.length === 0) {
      showAlert('Sélectionnez un client et au moins une ligne valide', 'error');
      return;
    }

    try {
      await authenticatedFetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        body: JSON.stringify({ customerId, items })
      });

      closeModal();
      await loadInvoices();
      refreshNotifications();
      showAlert('Facture créée avec succès');
    } catch (error) {
      showAlert('Erreur lors de la création de la facture (stock insuffisant ?)', 'error');
    }
  });
}

function addInvoiceLine() {
  const products = window.__invoiceProducts || [];
  const productOptions = products
    .map(p => `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} (stock: ${p.quantity})</option>`)
    .join('');

  const line = document.createElement('div');
  line.className = 'invoice-line grid grid-cols-12 gap-3 items-center';
  line.innerHTML = `
    <div class="col-span-6">
      <select class="line-product ${inputClass}" onchange="updateInvoiceTotalPreview()">
        ${productOptions}
      </select>
    </div>
    <div class="col-span-2">
      <input type="number" class="line-quantity ${inputClass}" min="1" value="1" oninput="updateInvoiceTotalPreview()">
    </div>
    <div class="col-span-3">
      <input type="text" readonly class="line-subtotal ${inputClass} bg-surface-container-low text-secondary" value="0.00 MRU">
    </div>
    <div class="col-span-1 flex justify-end">
      <button type="button" onclick="this.closest('.invoice-line').remove(); updateInvoiceTotalPreview();" class="p-1.5 text-outline hover:text-error transition-colors">
        <span class="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  `;

  document.getElementById('invoiceLines').appendChild(line);
  updateInvoiceTotalPreview();
}

function updateInvoiceTotalPreview() {
  let total = 0;

  document.querySelectorAll('.invoice-line').forEach(line => {
    const select = line.querySelector('.line-product');
    const quantity = parseInt(line.querySelector('.line-quantity').value, 10) || 0;
    const option = select.options[select.selectedIndex];
    const price = option ? parseFloat(option.dataset.price) : 0;
    const subtotal = price * quantity;
    line.querySelector('.line-subtotal').value = subtotal.toFixed(2) + ' MRU';
    total += subtotal;
  });

  const totalEl = document.getElementById('invoiceTotalPreview');
  if (totalEl) {
    totalEl.textContent = total.toFixed(2);
  }
}
