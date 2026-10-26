/* ========================================================================
   MON PARKING - Sales Module
   Record vehicle sales, generate invoices
   ======================================================================== */

const Sales = {
  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const sales = (await DB.getSalesByParking(parkingId)).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    content.innerHTML = `
      <div class="page-content">
        <div class="stats-grid stagger-children">
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-cash-register"></i></div>
            <div class="stat-card-value">${sales.length}</div>
            <div class="stat-card-label">Total des ventes</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
            <div class="stat-card-label">Chiffre d'affaires</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-chart-line"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(sales.length > 0 ? totalRevenue / sales.length : 0)}</div>
            <div class="stat-card-label">Vente moyenne</div>
          </div>
        </div>

        <div class="table-toolbar">
          <h3><i class="fas fa-list" style="color:var(--primary-light)"></i> Historique des ventes</h3>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Sales.exportSales()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button class="btn btn-primary" onclick="Sales.showAddModal()">
              <i class="fas fa-plus"></i> Nouvelle vente
            </button>
          </div>
        </div>

        ${sales.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-cash-register"></i></div>
            <h3>Aucune vente enregistrée</h3>
            <p>Enregistrez votre première vente pour commencer</p>
            <button class="btn btn-primary" onclick="Sales.showAddModal()">
              <i class="fas fa-plus"></i> Enregistrer une vente
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Véhicule</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${await Promise.all(sales.map(async (sale) => {
                  const vehicle = sale.vehicleId ? await DB.get('vehicles', sale.vehicleId) : null;
                  return `
                    <tr>
                      <td><span style="color:var(--primary-light);font-weight:600">${Utils.escapeHTML(sale.invoiceNumber || '-')}</span></td>
                      <td>${vehicle ? `${Utils.escapeHTML(vehicle.brand)} ${Utils.escapeHTML(vehicle.model)}` : '-'}</td>
                      <td>${Utils.escapeHTML(sale.clientName || '-')}</td>
                      <td>${Utils.formatDate(sale.date)}</td>
                      <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(sale.totalAmount)}</td>
                      <td><span class="badge badge-info">${Utils.escapeHTML(sale.paymentMethod || '-')}</span></td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Sales.viewInvoice(${sale.id})" data-tooltip="Facture">
                            <i class="fas fa-file-invoice"></i>
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Sales.printInvoice(${sale.id})" data-tooltip="Imprimer">
                            <i class="fas fa-print"></i>
                          </button>
                          ${Utils.isAdmin() ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Sales.deleteSale(${sale.id})" data-tooltip="Supprimer">
                              <i class="fas fa-trash" style="color:var(--accent-red)"></i>
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                })).then(rows => rows.join(''))}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  async showAddModal(preselectedVehicleId = null) {
    const parkingId = Utils.getCurrentParkingId();
    const vehicles = (await DB.getVehiclesByParking(parkingId)).filter(v => v.status === 'available');
    const clients = await DB.getClientsByParking(parkingId);

    const html = `
      <form id="sale-form">
        <div class="form-group">
          <label>Véhicule *</label>
          <select class="form-control" id="sale-vehicle" required onchange="Sales.onVehicleSelect()">
            <option value="">Sélectionner un véhicule</option>
            ${vehicles.map(v => `
              <option value="${v.id}" data-price="${v.salePrice}" ${preselectedVehicleId === v.id ? 'selected' : ''}>
                ${v.brand} ${v.model} ${v.year} - ${v.licensePlate} (${Utils.formatCurrency(v.salePrice)})
              </option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Client *</label>
          <select class="form-control" id="sale-client" required>
            <option value="">Sélectionner un client</option>
            ${clients.map(c => `<option value="${c.id}">${Utils.escapeHTML(c.name)} - ${Utils.escapeHTML(c.phone || '')}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="Clients.showQuickAdd(function(){Sales.showAddModal(${preselectedVehicleId})})">
            <i class="fas fa-plus"></i> Nouveau client
          </button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date de vente *</label>
            <input type="date" class="form-control" id="sale-date" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label>Montant (TND) *</label>
            <input type="number" class="form-control" id="sale-amount" min="0" required placeholder="Montant de la vente">
          </div>
        </div>
        <div class="form-group">
          <label>Mode de paiement</label>
          <select class="form-control" id="sale-payment">
            <option value="Espèces">Espèces</option>
            <option value="Virement">Virement bancaire</option>
            <option value="Chèque">Chèque</option>
            <option value="Carte">Carte bancaire</option>
            <option value="Crédit">Crédit</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea class="form-control" id="sale-notes" rows="2" placeholder="Notes supplémentaires..."></textarea>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Enregistrer une vente', html, { confirmText: 'Valider la vente' });
    if (confirmed) {
      await this.saveSale();
    }
  },

  onVehicleSelect() {
    const select = document.getElementById('sale-vehicle');
    const option = select.options[select.selectedIndex];
    const price = option.getAttribute('data-price');
    if (price) {
      document.getElementById('sale-amount').value = price;
    }
  },

  async saveSale() {
    const parkingId = Utils.getCurrentParkingId();
    const session = Utils.getCurrentUser();
    const vehicleId = parseInt(document.getElementById('sale-vehicle').value);
    const clientId = parseInt(document.getElementById('sale-client').value);
    const amount = parseFloat(document.getElementById('sale-amount').value);
    const date = document.getElementById('sale-date').value;
    const paymentMethod = document.getElementById('sale-payment').value;
    const notes = document.getElementById('sale-notes').value;

    if (!vehicleId || !clientId || !amount || isNaN(amount) || amount <= 0) {
      Utils.notify('Veuillez remplir tous les champs obligatoires avec un montant strictement positif (> 0).', 'error');
      return;
    }

    try {
      const client = await DB.get('clients', clientId);
      const vehicle = await DB.get('vehicles', vehicleId);
      const invoiceNumber = await DB.generateInvoiceNumber(parkingId);

      // Create sale
      await DB.add('sales', {
        parkingId,
        vehicleId,
        clientId,
        clientName: client.name,
        employeeId: session.userId,
        date: new Date(date).toISOString(),
        totalAmount: amount,
        paymentMethod,
        invoiceNumber,
        notes
      });

      // Update vehicle status
      vehicle.status = 'sold';
      await DB.update('vehicles', vehicle);

      // Create invoice
      const parking = await DB.get('parkings', parkingId);
      const taxRate = parking.taxRate || 19;
      const tax = Math.floor(amount * taxRate / 100);

      await DB.add('invoices', {
        parkingId,
        invoiceNumber,
        type: 'sale',
        clientId,
        clientName: client.name,
        vehicleId,
        vehicleInfo: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
        amount,
        tax,
        totalAmount: amount + tax,
        date: new Date(date).toISOString(),
        status: 'paid',
        paymentMethod
      });

      await DB.logActivity(parkingId, session.userId, 'sale', `Vente: ${vehicle.brand} ${vehicle.model} à ${client.name} - ${Utils.formatCurrency(amount)}`);

      Utils.notify('Vente enregistrée avec succès ! Facture générée.', 'success');
      this.render();
    } catch (err) {
      console.error('Save sale error:', err);
      Utils.notify('Erreur: ' + err.message, 'error');
    }
  },

  async viewInvoice(saleId) {
    const sale = await DB.get('sales', saleId);
    if (!sale) return;

    const vehicle = sale.vehicleId ? await DB.get('vehicles', sale.vehicleId) : null;
    const client = sale.clientId ? await DB.get('clients', sale.clientId) : null;
    const parking = await DB.get('parkings', sale.parkingId);
    const taxRate = parking.taxRate || 19;
    const tax = Math.floor(sale.totalAmount * taxRate / 100);

    const html = this.generateInvoiceHTML(parking, sale, vehicle, client, tax, taxRate);
    await Utils.showModal('Facture de vente', `<div class="invoice-preview">${html}</div>`, {
      confirmText: 'Imprimer',
      size: 'modal-lg'
    }).then(confirmed => {
      if (confirmed) {
        Utils.printInvoice(html);
      }
    });
  },

  async printInvoice(saleId) {
    const sale = await DB.get('sales', saleId);
    if (!sale) return;

    const vehicle = sale.vehicleId ? await DB.get('vehicles', sale.vehicleId) : null;
    const client = sale.clientId ? await DB.get('clients', sale.clientId) : null;
    const parking = await DB.get('parkings', sale.parkingId);
    const taxRate = parking.taxRate || 19;
    const tax = Math.floor(sale.totalAmount * taxRate / 100);

    const html = this.generateInvoiceHTML(parking, sale, vehicle, client, tax, taxRate);
    Utils.printInvoice(html);
  },

  generateInvoiceHTML(parking, sale, vehicle, client, tax, taxRate) {
    const companyInfo = parking.companyInfo || {};
    return `
      <div class="invoice-header">
        <div class="invoice-logo">
          <h1>${Utils.escapeHTML(parking.name || 'MON PARKING')}</h1>
          <p style="font-size:12px;color:#666;margin-top:4px">${Utils.escapeHTML(companyInfo.address || '')}</p>
          <p style="font-size:12px;color:#666">${Utils.escapeHTML(companyInfo.phone || '')} | ${Utils.escapeHTML(companyInfo.email || '')}</p>
          ${companyInfo.taxId ? `<p style="font-size:11px;color:#999">MF: ${Utils.escapeHTML(companyInfo.taxId)}</p>` : ''}
        </div>
        <div class="invoice-info">
          <h2>FACTURE</h2>
          <p><strong>N°:</strong> ${Utils.escapeHTML(sale.invoiceNumber || '-')}</p>
          <p><strong>Date:</strong> ${Utils.formatDate(sale.date)}</p>
          <p><strong>Paiement:</strong> ${Utils.escapeHTML(sale.paymentMethod || '')}</p>
        </div>
      </div>

      <div class="invoice-parties">
        <div class="invoice-party">
          <h4>Émetteur</h4>
          <p><strong>${Utils.escapeHTML(parking.name || '')}</strong></p>
          <p>${Utils.escapeHTML(companyInfo.address || '-')}</p>
          <p>${Utils.escapeHTML(companyInfo.phone || '-')}</p>
          <p>${Utils.escapeHTML(companyInfo.email || '-')}</p>
        </div>
        <div class="invoice-party">
          <h4>Client</h4>
          <p><strong>${Utils.escapeHTML(client ? client.name : (sale.clientName || ''))}</strong></p>
          <p>${Utils.escapeHTML(client ? client.phone || '' : '')}</p>
          <p>${Utils.escapeHTML(client ? client.email || '' : '')}</p>
          <p>${Utils.escapeHTML(client ? client.address || '' : '')}</p>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Détails</th>
            <th style="text-align:right">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Vente de véhicule</strong><br>
              ${vehicle ? `${Utils.escapeHTML(vehicle.brand)} ${Utils.escapeHTML(vehicle.model)} ${vehicle.year || ''}` : '-'}
            </td>
            <td>
              ${vehicle ? `
                Immatriculation: ${Utils.escapeHTML(vehicle.licensePlate || '-')}<br>
                Couleur: ${Utils.escapeHTML(vehicle.color || '-')}<br>
                Km: ${Utils.formatNumber(vehicle.mileage)}<br>
                VIN: ${Utils.escapeHTML(vehicle.vin || '-')}
              ` : '-'}
            </td>
            <td style="text-align:right;font-weight:600">${Utils.formatCurrency(sale.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="invoice-totals">
        <div class="total-row">
          <span class="total-label">Sous-total HT:</span>
          <span class="total-value">${Utils.formatCurrency(sale.totalAmount)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">TVA (${taxRate}%):</span>
          <span class="total-value">${Utils.formatCurrency(tax)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">Total TTC:</span>
          <span class="total-value">${Utils.formatCurrency(sale.totalAmount + tax)}</span>
        </div>
      </div>

      <div class="invoice-footer">
        <p>${parking.invoiceFooter || 'Merci pour votre confiance !'}</p>
        <p style="margin-top:8px">Document généré par MON PARKING</p>
      </div>
    `;
  },

  async deleteSale(id) {
    const confirmed = await Utils.confirm('Supprimer cette vente ?');
    if (!confirmed) return;

    try {
      const sale = await DB.get('sales', id);
      // Restore vehicle status
      if (sale.vehicleId) {
        const vehicle = await DB.get('vehicles', sale.vehicleId);
        if (vehicle) {
          vehicle.status = 'available';
          await DB.update('vehicles', vehicle);
        }
      }
      await DB.delete('sales', id);
      Utils.notify('Vente supprimée', 'success');
      this.render();
    } catch (err) {
      Utils.notify('Erreur: ' + err.message, 'error');
    }
  },

  async exportSales() {
    const parkingId = Utils.getCurrentParkingId();
    const sales = await DB.getSalesByParking(parkingId);
    const data = sales.map(s => ({
      'N° Facture': s.invoiceNumber,
      'Client': s.clientName,
      'Date': Utils.formatDate(s.date),
      'Montant': s.totalAmount,
      'Paiement': s.paymentMethod
    }));
    Utils.exportToCSV(data, 'ventes_parking');
    Utils.notify('Export CSV téléchargé', 'success');
  }
};
