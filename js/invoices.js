/* ========================================================================
   MON PARKING - Invoices & Billing Module
   Comprehensive invoicing, PDF/Print generation, payment tracking
   ======================================================================== */

const Invoices = {
  currentFilter: 'all',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const invoices = (await DB.getInvoicesByParking(parkingId)).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const paidInvoices = invoices.filter(i => (i.status || 'paid') === 'paid');
    const paidAmount = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    const filtered = invoices.filter(i => {
      if (this.currentFilter === 'all') return true;
      if (this.currentFilter === 'sale') return i.type === 'sale';
      if (this.currentFilter === 'rental') return i.type === 'rental';
      if (this.currentFilter === 'pending') return i.status === 'pending';
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <div class="stats-grid stagger-children">
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="stat-card-value">${totalInvoices}</div>
            <div class="stat-card-label">Total des factures</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-check-double"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(paidAmount)}</div>
            <div class="stat-card-label">Montant encaissé (${paidInvoices.length})</div>
          </div>
          <div class="stat-card ${pendingInvoices.length > 0 ? 'orange animate-pulse' : 'blue'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-hourglass-half"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(pendingAmount)}</div>
            <div class="stat-card-label">En attente (${pendingInvoices.length})</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-wallet"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalAmount)}</div>
            <div class="stat-card-label">Volume total facturé</div>
          </div>
        </div>

        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="Invoices.setFilter('all')">
              Toutes (${totalInvoices})
            </button>
            <button class="filter-tab ${this.currentFilter === 'sale' ? 'active' : ''}" onclick="Invoices.setFilter('sale')">
              Ventes
            </button>
            <button class="filter-tab ${this.currentFilter === 'rental' ? 'active' : ''}" onclick="Invoices.setFilter('rental')">
              Locations
            </button>
            <button class="filter-tab ${this.currentFilter === 'pending' ? 'active' : ''}" onclick="Invoices.setFilter('pending')">
              En attente (${pendingInvoices.length})
            </button>
          </div>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Invoices.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button class="btn btn-primary" onclick="Invoices.showCreateModal()">
              <i class="fas fa-plus"></i> Créer une facture
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-receipt"></i></div>
            <h3>Aucune facture trouvée</h3>
            <p>Les factures générées lors des ventes et locations apparaîtront ici.</p>
            <button class="btn btn-primary" onclick="Invoices.showCreateModal()">
              <i class="fas fa-plus"></i> Nouvelle facture
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(inv => {
                  const badge = Utils.getStatusBadge(inv.status || 'paid');
                  const typeLabel = inv.type === 'sale' ? 'Vente véhicule' : (inv.type === 'rental' ? 'Location' : 'Prestation / Divers');
                  const typeIcon = inv.type === 'sale' ? 'fa-shopping-cart' : (inv.type === 'rental' ? 'fa-key' : 'fa-file-alt');

                  return `
                    <tr>
                      <td><span style="color:var(--primary-light);font-weight:700">${Utils.escapeHTML(inv.invoiceNumber || 'FAC-' + inv.id)}</span></td>
                      <td>
                        <span class="badge ${inv.type === 'sale' ? 'badge-primary' : (inv.type === 'rental' ? 'badge-info' : 'badge-secondary')}">
                          <i class="fas ${typeIcon}" style="margin-right:4px"></i> ${typeLabel}
                        </span>
                      </td>
                      <td>
                        <div style="font-weight:600">${Utils.escapeHTML(inv.clientName || 'Client anonyme')}</div>
                        <small style="color:var(--text-muted)">${Utils.escapeHTML(inv.clientPhone || '')}</small>
                      </td>
                      <td>${Utils.formatDate(inv.date)}</td>
                      <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(inv.amount || inv.totalAmount)}</td>
                      <td><span class="badge badge-info">${Utils.escapeHTML(inv.paymentMethod || 'Espèces')}</span></td>
                      <td>
                        <span class="badge ${badge.class}" style="cursor:pointer" onclick="Invoices.toggleStatus(${inv.id})" title="Cliquer pour changer de statut">
                          ${badge.label}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Invoices.viewInvoice(${inv.id})" data-tooltip="Visualiser">
                            <i class="fas fa-eye"></i>
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Invoices.printInvoice(${inv.id})" data-tooltip="Imprimer">
                            <i class="fas fa-print"></i>
                          </button>
                          ${Utils.isAdmin() ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Invoices.deleteInvoice(${inv.id})" data-tooltip="Supprimer">
                              <i class="fas fa-trash" style="color:var(--accent-red)"></i>
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  setFilter(filter) {
    this.currentFilter = filter;
    this.render();
  },

  async showCreateModal() {
    const parkingId = Utils.getCurrentParkingId();
    const clients = await DB.getClientsByParking(parkingId);
    const vehicles = await DB.getVehiclesByParking(parkingId);
    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
      <form id="custom-invoice-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Date d'émission *</label>
          <input type="date" id="inv-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar-check"></i> Date d'échéance</label>
          <input type="date" id="inv-due-date" class="form-input" value="${today}">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-user"></i> Nom du client *</label>
          <input type="text" id="inv-client-name" class="form-input" placeholder="Ex: Société Tunisienne ou Particulier" required list="inv-clients-list">
          <datalist id="inv-clients-list">
            ${clients.map(c => `<option value="${Utils.escapeHTML(c.name)}">${Utils.escapeHTML(c.phone || '')}</option>`).join('')}
          </datalist>
        </div>

        <div class="form-group">
          <label><i class="fas fa-phone"></i> Téléphone client</label>
          <input type="tel" id="inv-client-phone" class="form-input" placeholder="+216 ...">
        </div>
        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Email client</label>
          <input type="email" id="inv-client-email" class="form-input" placeholder="client@domaine.tn">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-tag"></i> Lier un véhicule (optionnel)</label>
          <select id="inv-vehicle-id" class="form-input">
            <option value="">Aucun / Prestation générale</option>
            ${vehicles.map(v => `<option value="${v.id}">${v.brand} ${v.model} - ${v.licensePlate || 'Sans immat'}</option>`).join('')}
          </select>
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-align-left"></i> Description de la prestation / vente *</label>
          <input type="text" id="inv-item-desc" class="form-input" placeholder="Ex: Entretien révision + Diagnostic complet ou Vente" value="Prestation de services automobile" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-sort-numeric-up"></i> Quantité</label>
          <input type="number" id="inv-item-qty" class="form-input" value="1" min="1" oninput="Invoices.calcCustomTotal()">
        </div>
        <div class="form-group">
          <label><i class="fas fa-money-bill"></i> Prix unitaire HT (TND) *</label>
          <input type="number" id="inv-item-price" class="form-input" value="150" min="0" required oninput="Invoices.calcCustomTotal()">
        </div>

        <div class="form-group">
          <label><i class="fas fa-percent"></i> Taux TVA (%)</label>
          <select id="inv-tax-rate" class="form-input" onchange="Invoices.calcCustomTotal()">
            <option value="0">0% (Exonéré)</option>
            <option value="7">7% (Taux réduit)</option>
            <option value="19" selected>19% (Taux normal)</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-credit-card"></i> Statut & Paiement</label>
          <select id="inv-status" class="form-input">
            <option value="paid">Payée (Espèces)</option>
            <option value="paid">Payée (Chèque)</option>
            <option value="paid">Payée (Virement bancaire)</option>
            <option value="pending">En attente de paiement</option>
          </select>
        </div>

        <div class="form-group span-2" style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Total HT : <span id="inv-calc-ht">150 TND</span></div>
            <div style="font-size:0.85rem;color:var(--text-muted)">TVA : <span id="inv-calc-tva">28.500 TND</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.85rem;color:var(--text-muted)">Total TTC à payer</div>
            <div id="inv-calc-ttc" style="font-size:1.6rem;font-weight:800;color:var(--accent-green)">178.500 TND</div>
          </div>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Créer une facture personnalisée', formHtml, {
      confirmText: 'Émettre la facture',
      size: 'modal-lg'
    });

    if (confirmed) {
      await this.saveCustomInvoice();
    }
  },

  calcCustomTotal() {
    const qty = parseFloat(document.getElementById('inv-item-qty')?.value) || 1;
    const price = parseFloat(document.getElementById('inv-item-price')?.value) || 0;
    const taxRate = parseFloat(document.getElementById('inv-tax-rate')?.value) || 0;

    const totalHT = qty * price;
    const tva = (totalHT * taxRate) / 100;
    const totalTTC = totalHT + tva;

    const htEl = document.getElementById('inv-calc-ht');
    const tvaEl = document.getElementById('inv-calc-tva');
    const ttcEl = document.getElementById('inv-calc-ttc');

    if (htEl) htEl.textContent = Utils.formatCurrency(totalHT);
    if (tvaEl) tvaEl.textContent = Utils.formatCurrency(tva);
    if (ttcEl) ttcEl.textContent = Utils.formatCurrency(totalTTC);
  },

  async saveCustomInvoice() {
    const parkingId = Utils.getCurrentParkingId();
    const date = document.getElementById('inv-date').value;
    const dueDate = document.getElementById('inv-due-date').value;
    const clientName = document.getElementById('inv-client-name').value.trim();
    const clientPhone = document.getElementById('inv-client-phone').value.trim();
    const clientEmail = document.getElementById('inv-client-email').value.trim();
    const vehicleId = parseInt(document.getElementById('inv-vehicle-id').value) || null;
    const description = document.getElementById('inv-item-desc').value.trim();
    const qty = parseFloat(document.getElementById('inv-item-qty').value) || 1;
    const unitPrice = parseFloat(document.getElementById('inv-item-price').value) || 0;
    const taxRate = parseFloat(document.getElementById('inv-tax-rate').value) || 0;
    const statusSelect = document.getElementById('inv-status').value;

    if (!clientName || !description || unitPrice <= 0) {
      Utils.notify('Veuillez renseigner le client, la description et le prix unitaire.', 'error');
      return;
    }

    const totalHT = qty * unitPrice;
    const tva = (totalHT * taxRate) / 100;
    const totalTTC = totalHT + tva;

    const invoiceNumber = await DB.generateInvoiceNumber(parkingId);

    const invoiceData = {
      parkingId,
      invoiceNumber,
      type: 'custom',
      date,
      dueDate,
      clientName,
      clientPhone,
      clientEmail,
      vehicleId,
      status: statusSelect,
      amount: totalTTC,
      totalAmount: totalTTC,
      subtotal: totalHT,
      taxRate,
      taxAmount: tva,
      paymentMethod: statusSelect === 'paid' ? 'Espèces' : 'En attente',
      items: [
        {
          description,
          quantity: qty,
          unitPrice,
          total: totalHT
        }
      ]
    };

    await DB.add('invoices', invoiceData);
    await DB.logActivity(parkingId, Auth.user.id, 'Facture émise', `Facture ${invoiceNumber} pour ${clientName} (${totalTTC} TND)`);
    Utils.notify(`Facture ${invoiceNumber} générée avec succès !`, 'success');
    this.render();
  },

  async toggleStatus(invoiceId) {
    const invoice = await DB.get('invoices', invoiceId);
    if (!invoice) return;

    invoice.status = invoice.status === 'paid' ? 'pending' : 'paid';
    await DB.update('invoices', invoice);
    Utils.notify(`Statut de la facture mis à jour : ${invoice.status === 'paid' ? 'Payée' : 'En attente'}`, 'info');
    this.render();
  },

  async viewInvoice(invoiceId) {
    const invoice = await DB.get('invoices', invoiceId);
    if (!invoice) return;
    const parking = await DB.get('parkings', invoice.parkingId);

    const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
      {
        description: invoice.type === 'sale' ? 'Vente de véhicule automobile' : 'Prestation de service',
        quantity: 1,
        unitPrice: invoice.amount || invoice.totalAmount,
        total: invoice.amount || invoice.totalAmount
      }
    ];

    const subtotal = invoice.subtotal || invoice.amount || invoice.totalAmount;
    const taxAmount = invoice.taxAmount || 0;
    const total = invoice.amount || invoice.totalAmount;

    const contentHtml = `
      <div class="invoice-sheet" id="invoice-printable-area" style="background:#ffffff;color:#1e293b;padding:2.5rem;border-radius:var(--radius-md);font-family:system-ui, -apple-system, sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6c5ce7;padding-bottom:1.5rem;margin-bottom:2rem">
          <div>
            <div style="font-size:2rem;font-weight:900;letter-spacing:-1px;color:#6c5ce7">MON PARKING</div>
            <div style="font-size:1.05rem;font-weight:600;color:#334155;margin-top:4px">${parking?.name || 'Direction Parking Automobile'}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-top:2px">${parking?.address || 'Tunisie'}</div>
            <div style="font-size:0.85rem;color:#64748b">Tél : ${parking?.phone || '+216 71 000 000'} | Email : contact@monparking.tn</div>
          </div>
          <div style="text-align:right">
            <span style="display:inline-block;background:#ede9fe;color:#6c5ce7;font-weight:800;padding:6px 16px;border-radius:20px;font-size:0.9rem;text-transform:uppercase">
              FACTURE OFFICIELLE
            </span>
            <div style="font-size:1.3rem;font-weight:800;color:#0f172a;margin-top:8px">${invoice.invoiceNumber || 'FAC-' + invoice.id}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-top:4px">Date d'émission : <strong>${Utils.formatDate(invoice.date)}</strong></div>
            ${invoice.dueDate ? `<div style="font-size:0.85rem;color:#64748b">Échéance : <strong>${Utils.formatDate(invoice.dueDate)}</strong></div>` : ''}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem">
          <div style="background:#f8fafc;padding:1.25rem;border-radius:10px;border-left:4px solid #6c5ce7">
            <div style="font-size:0.8rem;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:0.5rem">Facturé à :</div>
            <div style="font-size:1.1rem;font-weight:700;color:#0f172a">${Utils.escapeHTML(invoice.clientName || 'Client')}</div>
            ${invoice.clientPhone ? `<div style="font-size:0.9rem;color:#475569;margin-top:4px"><i class="fas fa-phone"></i> ${Utils.escapeHTML(invoice.clientPhone)}</div>` : ''}
            ${invoice.clientEmail ? `<div style="font-size:0.9rem;color:#475569;margin-top:2px"><i class="fas fa-envelope"></i> ${Utils.escapeHTML(invoice.clientEmail)}</div>` : ''}
          </div>
          <div style="background:#f8fafc;padding:1.25rem;border-radius:10px;border-left:4px solid #10b981">
            <div style="font-size:0.8rem;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:0.5rem">Modalités :</div>
            <div style="font-size:0.95rem;color:#334155">Mode de paiement : <strong>${Utils.escapeHTML(invoice.paymentMethod || 'Espèces')}</strong></div>
            <div style="font-size:0.95rem;color:#334155;margin-top:4px">
              Statut : <span style="font-weight:700;color:${invoice.status === 'paid' ? '#16a34a' : '#d97706'}">${(invoice.status || 'paid').toUpperCase()}</span>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;font-size:0.95rem">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;text-align:left">
              <th style="padding:12px 14px;color:#334155">Désignation</th>
              <th style="padding:12px 14px;text-align:center;color:#334155">Qté</th>
              <th style="padding:12px 14px;text-align:right;color:#334155">Prix unitaire</th>
              <th style="padding:12px 14px;text-align:right;color:#334155">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom:1px solid #e2e8f0">
                <td style="padding:12px 14px;font-weight:500">${item.description}</td>
                <td style="padding:12px 14px;text-align:center">${item.quantity || 1}</td>
                <td style="padding:12px 14px;text-align:right">${Utils.formatCurrency(item.unitPrice)}</td>
                <td style="padding:12px 14px;text-align:right;font-weight:600">${Utils.formatCurrency(item.total || ((item.quantity || 1) * item.unitPrice))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:3rem">
          <div style="width:280px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.95rem;color:#64748b">
              <span>Sous-total HT :</span>
              <strong style="color:#1e293b">${Utils.formatCurrency(subtotal)}</strong>
            </div>
            ${taxAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.95rem;color:#64748b">
                <span>TVA (${invoice.taxRate || 19}%) :</span>
                <strong style="color:#1e293b">${Utils.formatCurrency(taxAmount)}</strong>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:1.25rem;font-weight:800;border-top:2px solid #cbd5e1;color:#6c5ce7;margin-top:6px">
              <span>Total TTC :</span>
              <span>${Utils.formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;border-top:1px dashed #cbd5e1;padding-top:1.5rem;font-size:0.85rem">
          <div>
            <strong style="color:#475569">Mentions légales & Conditions :</strong>
            <p style="color:#64748b;margin:6px 0 0;font-size:0.8rem;line-height:1.4">
              Paiement exigible selon les termes convenus. Tout retard de paiement donnera lieu de plein droit au versement d'une pénalité de retard.
            </p>
          </div>
          <div style="text-align:right">
            <strong style="color:#475569">Signature & Cachet autorisés :</strong>
            <div style="height:70px;border-bottom:1px solid #cbd5e1;margin-top:10px;margin-left:auto;width:200px"></div>
          </div>
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal(`Facture ${invoice.invoiceNumber || invoice.id}`, contentHtml, {
      size: 'modal-lg',
      confirmText: 'Imprimer / Exporter PDF'
    });

    if (confirmed) {
      this.printInvoice(invoiceId);
    }
  },

  printInvoice(invoiceId) {
    this.viewInvoice(invoiceId).then(() => {
      window.print();
    });
  },

  async deleteInvoice(invoiceId) {
    const ok = await Utils.confirm('Voulez-vous supprimer définitivement cette facture ?');
    if (!ok) return;

    await DB.delete('invoices', invoiceId);
    Utils.notify('Facture supprimée', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const invoices = await DB.getInvoicesByParking(parkingId);
    const data = invoices.map(i => ({
      NumeroFacture: i.invoiceNumber,
      Type: i.type,
      Client: i.clientName,
      Telephone: i.clientPhone,
      Date: i.date,
      Echeance: i.dueDate || '',
      Montant: i.amount || i.totalAmount,
      Statut: i.status || 'paid',
      Paiement: i.paymentMethod
    }));
    Utils.exportToCSV(data, 'factures_mon_parking');
  }
};
