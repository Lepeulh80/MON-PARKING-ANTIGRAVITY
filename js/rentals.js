/* ========================================================================
   MON PARKING - Rentals Module
   Complete vehicle rental management, contracts, returns, and billing
   ======================================================================== */

const Rentals = {
  currentFilter: 'all',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    let rentals = await DB.getRentalsByParking(parkingId);
    rentals.sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));

    const now = new Date();
    // Auto-update overdue status if past end date and still active
    for (const r of rentals) {
      if (r.status === 'active' && new Date(r.endDate) < now) {
        r.status = 'overdue';
        await DB.update('rentals', r);
      }
    }

    const totalRentals = rentals.length;
    const activeRentals = rentals.filter(r => r.status === 'active').length;
    const overdueRentals = rentals.filter(r => r.status === 'overdue').length;
    const completedRentals = rentals.filter(r => r.status === 'completed').length;
    const totalRevenue = rentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    const filteredRentals = rentals.filter(r => {
      if (this.currentFilter === 'all') return true;
      return r.status === this.currentFilter;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-key"></i></div>
            <div class="stat-card-value">${totalRentals}</div>
            <div class="stat-card-label">Total des locations</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-car-side"></i></div>
            <div class="stat-card-value">${activeRentals}</div>
            <div class="stat-card-label">En cours</div>
          </div>
          <div class="stat-card ${overdueRentals > 0 ? 'red animate-pulse' : 'purple'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-card-value">${overdueRentals}</div>
            <div class="stat-card-label">En retard de retour</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
            <div class="stat-card-label">Chiffre d'affaires locations</div>
          </div>
        </div>

        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="Rentals.setFilter('all')">
              Tous (${totalRentals})
            </button>
            <button class="filter-tab ${this.currentFilter === 'active' ? 'active' : ''}" onclick="Rentals.setFilter('active')">
              En cours (${activeRentals})
            </button>
            <button class="filter-tab ${this.currentFilter === 'overdue' ? 'active' : ''}" onclick="Rentals.setFilter('overdue')">
              En retard (${overdueRentals})
            </button>
            <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" onclick="Rentals.setFilter('completed')">
              Terminées (${completedRentals})
            </button>
          </div>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="PlateScanner.openScannerModal()" style="color:var(--accent-cyan);border:1px solid rgba(0,206,201,0.3)">
              <i class="fas fa-camera"></i> Scan Plaque
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Rentals.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button class="btn btn-primary" onclick="Rentals.showAddModal()">
              <i class="fas fa-plus"></i> Nouvelle location
            </button>
          </div>
        </div>

        ${filteredRentals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-key"></i></div>
            <h3>Aucune location trouvée</h3>
            <p>Enregistrez un nouveau contrat de location dès maintenant.</p>
            <button class="btn btn-primary" onclick="Rentals.showAddModal()">
              <i class="fas fa-plus"></i> Créer une location
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Contrat</th>
                  <th>Véhicule</th>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Durée</th>
                  <th>Tarif / Jour</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${await Promise.all(filteredRentals.map(async (rental) => {
                  const vehicle = rental.vehicleId ? await DB.get('vehicles', rental.vehicleId) : null;
                  const start = new Date(rental.startDate);
                  const end = new Date(rental.endDate);
                  const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                  const badge = Utils.getStatusBadge(rental.status);

                  return `
                    <tr>
                      <td><span style="color:var(--primary-light);font-weight:700">${Utils.escapeHTML(rental.contractNumber || 'LOC-' + rental.id)}</span></td>
                      <td>
                        <div style="font-weight:600">${vehicle ? `${Utils.escapeHTML(vehicle.brand)} ${Utils.escapeHTML(vehicle.model)}` : 'Véhicule #' + rental.vehicleId}</div>
                        <small style="color:var(--text-muted)">${vehicle ? Utils.escapeHTML(vehicle.licensePlate) : '-'}</small>
                      </td>
                      <td>
                        <div style="font-weight:500">${Utils.escapeHTML(rental.clientName || '-')}</div>
                        <small style="color:var(--text-muted)">${Utils.escapeHTML(rental.clientPhone || '')}</small>
                      </td>
                      <td>
                        <div>${Utils.formatDate(rental.startDate)}</div>
                        <small style="color:var(--text-muted)">au ${Utils.formatDate(rental.endDate)}</small>
                      </td>
                      <td><span class="badge badge-info">${diffDays} jour${diffDays > 1 ? 's' : ''}</span></td>
                      <td>${Utils.formatCurrency(rental.dailyRate)}</td>
                      <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(rental.totalAmount)}</td>
                      <td><span class="badge ${badge.class}">${badge.label}</span></td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Rentals.viewContract(${rental.id})" data-tooltip="Contrat / Facture">
                            <i class="fas fa-file-contract"></i>
                          </button>
                          ${rental.status === 'active' || rental.status === 'overdue' ? `
                            <button class="btn btn-ghost btn-sm btn-icon" style="color:var(--accent-green)" onclick="Rentals.returnVehicleModal(${rental.id})" data-tooltip="Enregistrer le retour">
                              <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Rentals.extendModal(${rental.id})" data-tooltip="Prolonger">
                              <i class="fas fa-calendar-plus"></i>
                            </button>
                          ` : ''}
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Rentals.printContract(${rental.id})" data-tooltip="Imprimer">
                            <i class="fas fa-print"></i>
                          </button>
                          ${Utils.isAdmin() ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Rentals.deleteRental(${rental.id})" data-tooltip="Supprimer">
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

  setFilter(filter) {
    this.currentFilter = filter;
    this.render();
  },

  async showAddModal() {
    const parkingId = Utils.getCurrentParkingId();
    const allVehicles = await DB.getVehiclesByParking(parkingId);
    const availableVehicles = allVehicles.filter(v => v.status === 'available');
    const clients = await DB.getClientsByParking(parkingId);
    const employees = (await DB.getEmployeesByParking(parkingId)).filter(e => e.isActive !== false);

    if (availableVehicles.length === 0) {
      Utils.notify('Aucun véhicule disponible actuellement pour la location', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const formHtml = `
      <form id="rental-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label><i class="fas fa-car"></i> Véhicule disponible *</label>
          <select id="rent-vehicle-id" class="form-input" required onchange="Rentals.onVehicleSelected(this)">
            <option value="">Sélectionner un véhicule...</option>
            ${availableVehicles.map(v => `
              <option value="${v.id}" data-rate="${v.rentalPrice || 80}" data-mileage="${v.mileage || 0}">
                ${v.brand} ${v.model} (${v.licensePlate || 'Sans immat'}) - ${Utils.formatCurrency(v.rentalPrice || 80)}/j
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label><i class="fas fa-calendar-alt"></i> Date début *</label>
          <input type="date" id="rent-start-date" class="form-input" value="${today}" required onchange="Rentals.calcTotal()">
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar-check"></i> Date fin prévue *</label>
          <input type="date" id="rent-end-date" class="form-input" value="${tomorrow}" required onchange="Rentals.calcTotal()">
        </div>

        <div class="form-group">
          <label><i class="fas fa-tag"></i> Tarif journalier (TND) *</label>
          <input type="number" id="rent-daily-rate" class="form-input" min="1" value="80" required oninput="Rentals.calcTotal()">
        </div>
        <div class="form-group">
          <label><i class="fas fa-shield-alt"></i> Caution versée (TND)</label>
          <input type="number" id="rent-deposit" class="form-input" min="0" value="500">
        </div>

        <div class="form-group span-2">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
            <label><i class="fas fa-user"></i> Client *</label>
            <span style="font-size:0.8rem;color:var(--text-muted)">Client récurrent ou nouveau</span>
          </div>
          <div style="display:flex;gap:0.5rem">
            <input type="text" id="rent-client-name" class="form-input" placeholder="Nom et prénom du client" required style="flex:1" list="clients-datalist">
            <datalist id="clients-datalist">
              ${clients.map(c => `<option value="${Utils.escapeHTML(c.name)}">${Utils.escapeHTML(c.phone || '')}</option>`).join('')}
            </datalist>
          </div>
        </div>

        <div class="form-group">
          <label><i class="fas fa-phone"></i> Téléphone client *</label>
          <input type="tel" id="rent-client-phone" class="form-input" placeholder="+216 ..." required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-id-card"></i> N° CIN / Permis *</label>
          <input type="text" id="rent-client-cin" class="form-input" placeholder="09876543 / B123456" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-tachometer-alt"></i> Kilométrage de départ</label>
          <input type="number" id="rent-start-mileage" class="form-input" value="0">
        </div>
        <div class="form-group">
          <label><i class="fas fa-money-check"></i> Mode de paiement</label>
          <select id="rent-payment-method" class="form-input">
            <option value="Espèces">Espèces</option>
            <option value="Carte bancaire">Carte bancaire</option>
            <option value="Chèque">Chèque</option>
            <option value="Virement">Virement</option>
          </select>
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-user-tie"></i> Conseiller / Employé responsable</label>
          <select id="rent-employee-id" class="form-input">
            ${employees.map(e => `
              <option value="${e.id}" ${e.id === Auth.user.id ? 'selected' : ''}>
                ${e.firstName} ${e.lastName} (${e.role})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group span-2" style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Durée estimée : <strong id="rent-calc-days" style="color:var(--text-main)">1 jour</strong></div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Caution : <span id="rent-calc-deposit">500 TND</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.85rem;color:var(--text-muted)">Montant Total Location</div>
            <div id="rent-calc-total" style="font-size:1.5rem;font-weight:800;color:var(--accent-green)">80 TND</div>
          </div>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Nouvelle Location de Véhicule', formHtml, {
      confirmText: 'Créer le contrat',
      size: 'modal-lg'
    });

    if (confirmed) {
      await this.saveRental();
    }
  },

  onVehicleSelected(select) {
    const opt = select.selectedOptions[0];
    if (opt) {
      const rate = opt.dataset.rate || 80;
      const mileage = opt.dataset.mileage || 0;
      document.getElementById('rent-daily-rate').value = rate;
      document.getElementById('rent-start-mileage').value = mileage;
      this.calcTotal();
    }
  },

  calcTotal() {
    const startVal = document.getElementById('rent-start-date')?.value;
    const endVal = document.getElementById('rent-end-date')?.value;
    const rateVal = parseFloat(document.getElementById('rent-daily-rate')?.value) || 0;
    const depositVal = parseFloat(document.getElementById('rent-deposit')?.value) || 0;

    if (!startVal || !endVal) return;

    const start = new Date(startVal);
    const end = new Date(endVal);
    const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const total = diffDays * rateVal;

    const daysEl = document.getElementById('rent-calc-days');
    const depEl = document.getElementById('rent-calc-deposit');
    const totEl = document.getElementById('rent-calc-total');

    if (daysEl) daysEl.textContent = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (depEl) depEl.textContent = Utils.formatCurrency(depositVal);
    if (totEl) totEl.textContent = Utils.formatCurrency(total);
  },

  async saveRental() {
    const parkingId = Utils.getCurrentParkingId();
    const vehicleId = parseInt(document.getElementById('rent-vehicle-id').value);
    const startDate = document.getElementById('rent-start-date').value;
    const endDate = document.getElementById('rent-end-date').value;
    const dailyRate = parseFloat(document.getElementById('rent-daily-rate').value) || 0;
    const deposit = parseFloat(document.getElementById('rent-deposit').value) || 0;
    const clientName = document.getElementById('rent-client-name').value.trim();
    const clientPhone = document.getElementById('rent-client-phone').value.trim();
    const clientCin = document.getElementById('rent-client-cin').value.trim();
    const startMileage = parseInt(document.getElementById('rent-start-mileage').value) || 0;
    const paymentMethod = document.getElementById('rent-payment-method').value;
    const employeeId = parseInt(document.getElementById('rent-employee-id').value) || Auth.user.id;

    if (!vehicleId || !clientName || !startDate || !endDate) {
      Utils.notify('Veuillez remplir tous les champs obligatoires (*)', 'error');
      return;
    }

    if (dailyRate <= 0 || isNaN(dailyRate) || deposit < 0 || startMileage < 0) {
      Utils.notify('Le tarif journalier (> 0), la caution et le kilométrage doivent être positifs.', 'error');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      Utils.notify('La date de restitution doit être postérieure ou égale à la date de début.', 'error');
      return;
    }
    const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const totalAmount = diffDays * dailyRate;

    const year = new Date().getFullYear();
    const existingRentals = await DB.getRentalsByParking(parkingId);
    const contractNumber = `LOC-${year}-${String(existingRentals.length + 1).padStart(5, '0')}`;

    // Add or update client
    const clients = await DB.getClientsByParking(parkingId);
    let client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase() || (c.phone && c.phone === clientPhone));
    if (!client) {
      const clientId = await DB.add('clients', {
        parkingId,
        name: clientName,
        phone: clientPhone,
        cin: clientCin,
        notes: 'Client location',
        totalSpent: totalAmount
      });
      client = { id: clientId };
    } else {
      client.totalSpent = (client.totalSpent || 0) + totalAmount;
      if (clientPhone && !client.phone) client.phone = clientPhone;
      if (clientCin && !client.cin) client.cin = clientCin;
      await DB.update('clients', client);
    }

    // Create rental
    const rentalData = {
      parkingId,
      contractNumber,
      vehicleId,
      clientId: client.id,
      clientName,
      clientPhone,
      clientCin,
      startDate,
      endDate,
      days: diffDays,
      dailyRate,
      deposit,
      totalAmount,
      startMileage,
      paymentMethod,
      employeeId,
      status: 'active',
      date: startDate
    };

    const rentalId = await DB.add('rentals', rentalData);

    // Update vehicle status
    const vehicle = await DB.get('vehicles', vehicleId);
    if (vehicle) {
      vehicle.status = 'rented';
      await DB.update('vehicles', vehicle);
    }

    // Create invoice record
    const invoiceNumber = await DB.generateInvoiceNumber(parkingId);
    await DB.add('invoices', {
      parkingId,
      invoiceNumber,
      rentalId,
      type: 'rental',
      clientName,
      clientPhone,
      date: startDate,
      amount: totalAmount,
      deposit,
      paymentMethod,
      status: 'paid',
      items: [
        {
          description: `Location ${vehicle ? `${vehicle.brand} ${vehicle.model}` : ''} (${diffDays} j)`,
          quantity: diffDays,
          unitPrice: dailyRate,
          total: totalAmount
        }
      ]
    });

    await DB.logActivity(parkingId, Auth.user.id, 'Nouvelle location', `Contrat ${contractNumber} pour ${clientName}`);
    Utils.notify(`Location ${contractNumber} créée avec succès !`, 'success');

    this.render();
  },

  async returnVehicleModal(rentalId) {
    const rental = await DB.get('rentals', rentalId);
    if (!rental) return;
    const vehicle = await DB.get('vehicles', rental.vehicleId);

    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
      <form id="return-form" class="modal-form-grid" onsubmit="return false;">
        <div class="span-2" style="background:var(--bg-glass);padding:0.75rem 1rem;border-radius:var(--radius-md);margin-bottom:0.5rem">
          <strong>Contrat :</strong> ${Utils.escapeHTML(rental.contractNumber || 'LOC-' + rental.id)}<br>
          <strong>Véhicule :</strong> ${vehicle ? `${Utils.escapeHTML(vehicle.brand)} ${Utils.escapeHTML(vehicle.model)} (${Utils.escapeHTML(vehicle.licensePlate)})` : '-'}<br>
          <strong>Client :</strong> ${Utils.escapeHTML(rental.clientName)} (${Utils.escapeHTML(rental.clientPhone || '')})<br>
          <strong>Caution initiale :</strong> ${Utils.formatCurrency(rental.deposit || 0)}
        </div>

        <div class="form-group">
          <label><i class="fas fa-calendar-check"></i> Date effective de retour *</label>
          <input type="date" id="return-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tachometer-alt"></i> Kilométrage au retour *</label>
          <input type="number" id="return-mileage" class="form-input" value="${(rental.startMileage || 0) + 150}" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-gas-pump"></i> Niveau carburant retour</label>
          <select id="return-fuel" class="form-input">
            <option value="Plein">Plein (100%)</option>
            <option value="3/4">3/4</option>
            <option value="1/2">1/2</option>
            <option value="1/4">1/4</option>
            <option value="Réserve">Réserve</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-exclamation-triangle"></i> Frais de dommages / retard (TND)</label>
          <input type="number" id="return-penalty" class="form-input" value="0" min="0">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-clipboard-check"></i> État général et remarques</label>
          <textarea id="return-notes" class="form-input" rows="2" placeholder="Véhicule propre, aucun dommage constaté"></textarea>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Enregistrer le retour de véhicule', formHtml, {
      confirmText: 'Confirmer le retour',
      size: 'modal-md'
    });

    if (confirmed) {
      const returnDate = document.getElementById('return-date').value;
      const returnMileage = parseInt(document.getElementById('return-mileage').value) || (rental.startMileage || 0);
      const fuel = document.getElementById('return-fuel').value;
      const penalty = parseFloat(document.getElementById('return-penalty').value) || 0;
      const notes = document.getElementById('return-notes').value.trim();

      rental.status = 'completed';
      rental.returnDate = returnDate;
      rental.returnMileage = returnMileage;
      rental.returnFuel = fuel;
      rental.penalty = penalty;
      rental.returnNotes = notes;
      rental.depositRefunded = Math.max(0, (rental.deposit || 0) - penalty);

      await DB.update('rentals', rental);

      if (vehicle) {
        vehicle.status = 'available';
        vehicle.mileage = returnMileage;
        await DB.update('vehicles', vehicle);
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.logActivity(parkingId, Auth.user.id, 'Retour véhicule', `Location ${rental.contractNumber} clôturée. Caution rendue: ${rental.depositRefunded} TND`);
      Utils.notify(`Retour enregistré avec succès ! Le véhicule est à nouveau disponible.`, 'success');
      this.render();
    }
  },

  async extendModal(rentalId) {
    const rental = await DB.get('rentals', rentalId);
    if (!rental) return;

    const currentEnd = new Date(rental.endDate);
    const newEndProposed = new Date(currentEnd.getTime() + 86400000 * 2).toISOString().split('T')[0];

    const formHtml = `
      <div style="padding:0.5rem 0">
        <p>Contrat actuel : <strong>${Utils.escapeHTML(rental.contractNumber)}</strong> (${Utils.escapeHTML(rental.clientName)})</p>
        <p>Date de fin actuelle : <strong>${Utils.formatDate(rental.endDate)}</strong></p>
        <div class="form-group" style="margin-top:1rem">
          <label>Nouvelle date de fin :</label>
          <input type="date" id="extend-new-date" class="form-input" value="${newEndProposed}" min="${rental.endDate}">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Prolonger la location', formHtml, { confirmText: 'Prolonger' });
    if (confirmed) {
      const newDate = document.getElementById('extend-new-date').value;
      if (newDate && newDate > rental.endDate) {
        const extraDays = Math.ceil((new Date(newDate) - new Date(rental.endDate)) / (1000 * 60 * 60 * 24));
        const extraCost = extraDays * (rental.dailyRate || 0);

        rental.endDate = newDate;
        rental.days = (rental.days || 1) + extraDays;
        rental.totalAmount = (rental.totalAmount || 0) + extraCost;
        if (rental.status === 'overdue') rental.status = 'active';

        await DB.update('rentals', rental);
        Utils.notify(`Location prolongée de ${extraDays} jours (+${Utils.formatCurrency(extraCost)})`, 'success');
        this.render();
      }
    }
  },

  async viewContract(rentalId) {
    const rental = await DB.get('rentals', rentalId);
    if (!rental) return;
    const vehicle = rental.vehicleId ? await DB.get('vehicles', rental.vehicleId) : null;
    const parking = await DB.get('parkings', rental.parkingId);

    const contentHtml = `
      <div class="invoice-preview" id="rental-contract-sheet" style="background:#fff;color:#1e293b;padding:2rem;border-radius:var(--radius-md);font-family:sans-serif">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #6c5ce7;padding-bottom:1rem;margin-bottom:1.5rem">
          <div>
            <h2 style="color:#6c5ce7;margin:0;font-size:1.6rem">MON PARKING</h2>
            <p style="margin:4px 0 0;font-size:0.9rem;color:#64748b">${Utils.escapeHTML(parking ? parking.name : 'Gestion Automobile')}</p>
            <p style="margin:2px 0;font-size:0.85rem;color:#64748b">${Utils.escapeHTML(parking?.address || 'Tunisie')} | Tél: ${Utils.escapeHTML(parking?.phone || '+216 71 000 000')}</p>
          </div>
          <div style="text-align:right">
            <span style="display:inline-block;background:#ede9fe;color:#6c5ce7;font-weight:700;padding:4px 12px;border-radius:20px;font-size:0.85rem">CONTRAT DE LOCATION</span>
            <h3 style="margin:6px 0 2px;color:#0f172a">${Utils.escapeHTML(rental.contractNumber || 'LOC-' + rental.id)}</h3>
            <p style="margin:0;font-size:0.85rem;color:#64748b">Date : ${Utils.formatDate(rental.startDate)}</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
          <div style="background:#f8fafc;padding:1rem;border-radius:8px">
            <h4 style="margin:0 0 0.5rem;color:#334155;font-size:0.95rem">Locataire (Client)</h4>
            <div style="font-size:0.9rem;line-height:1.5">
              <strong>${Utils.escapeHTML(rental.clientName)}</strong><br>
              Tél : ${Utils.escapeHTML(rental.clientPhone || '-')}<br>
              CIN / Permis : ${Utils.escapeHTML(rental.clientCin || '-')}
            </div>
          </div>
          <div style="background:#f8fafc;padding:1rem;border-radius:8px">
            <h4 style="margin:0 0 0.5rem;color:#334155;font-size:0.95rem">Véhicule loué</h4>
            <div style="font-size:0.9rem;line-height:1.5">
              <strong>${vehicle ? `${Utils.escapeHTML(vehicle.brand)} ${Utils.escapeHTML(vehicle.model)}` : 'Véhicule'}</strong><br>
              Immatriculation : ${vehicle ? Utils.escapeHTML(vehicle.licensePlate) : '-'}<br>
              Kilométrage initial : ${rental.startMileage || 0} km
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.9rem">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;text-align:left">
              <th style="padding:8px 12px">Description</th>
              <th style="padding:8px 12px;text-align:center">Période</th>
              <th style="padding:8px 12px;text-align:center">Durée</th>
              <th style="padding:8px 12px;text-align:right">Tarif / J</th>
              <th style="padding:8px 12px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 12px">Location de véhicule automobile</td>
              <td style="padding:10px 12px;text-align:center">${Utils.formatDate(rental.startDate)} au ${Utils.formatDate(rental.endDate)}</td>
              <td style="padding:10px 12px;text-align:center">${rental.days || 1} jours</td>
              <td style="padding:10px 12px;text-align:right">${Utils.formatCurrency(rental.dailyRate)}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700">${Utils.formatCurrency(rental.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;margin-bottom:2rem">
          <div style="font-size:0.85rem;color:#64748b;max-width:60%">
            <p><strong>Caution consignée :</strong> ${Utils.formatCurrency(rental.deposit || 0)} (${rental.paymentMethod || 'Espèces'})</p>
            <p style="font-size:0.75rem;margin-top:4px">Le locataire reconnaît avoir reçu le véhicule en parfait état de fonctionnement et s'engage à le restituer avec les mêmes conditions et niveau de carburant.</p>
          </div>
          <div style="text-align:right;min-width:180px">
            <div style="font-size:0.9rem;color:#64748b">Net à payer :</div>
            <div style="font-size:1.4rem;font-weight:800;color:#6c5ce7">${Utils.formatCurrency(rental.totalAmount)}</div>
            <div style="font-size:0.8rem;color:#16a34a;margin-top:2px">Statut : ${rental.status.toUpperCase()}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem;padding-top:1rem;border-top:1px dashed #cbd5e1;font-size:0.85rem">
          <div>
            <strong>Signature du Locataire :</strong>
            <div style="height:60px;border-bottom:1px solid #cbd5e1;margin-top:10px"></div>
          </div>
          <div>
            <strong>Signature & Cachet Parking :</strong>
            <div style="height:60px;border-bottom:1px solid #cbd5e1;margin-top:10px"></div>
          </div>
        </div>
      </div>
    `;

    Utils.showModal(`Contrat ${rental.contractNumber}`, contentHtml, {
      size: 'modal-lg',
      confirmText: 'Imprimer',
      hideCancel: false
    }).then(confirmed => {
      if (confirmed) {
        this.printContract(rentalId);
      }
    });
  },

  printContract(rentalId) {
    this.viewContract(rentalId).then(() => {
      window.print();
    });
  },

  async deleteRental(rentalId) {
    const ok = await Utils.confirm('Voulez-vous vraiment supprimer cet enregistrement de location ?');
    if (!ok) return;

    const rental = await DB.get('rentals', rentalId);
    if (rental && rental.vehicleId && rental.status === 'active') {
      const v = await DB.get('vehicles', rental.vehicleId);
      if (v) {
        v.status = 'available';
        await DB.update('vehicles', v);
      }
    }

    await DB.delete('rentals', rentalId);
    Utils.notify('Location supprimée', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const rentals = await DB.getRentalsByParking(parkingId);
    const data = rentals.map(r => ({
      Contrat: r.contractNumber,
      Client: r.clientName,
      Telephone: r.clientPhone,
      CIN: r.clientCin,
      VehiculeID: r.vehicleId,
      DateDebut: r.startDate,
      DateFin: r.endDate,
      DureeJours: r.days,
      TarifJour: r.dailyRate,
      Total: r.totalAmount,
      Caution: r.deposit,
      Statut: r.status,
      Paiement: r.paymentMethod
    }));
    Utils.exportToCSV(data, 'locations_mon_parking');
  }
};
