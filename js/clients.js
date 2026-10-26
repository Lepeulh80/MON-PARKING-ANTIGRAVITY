/* ========================================================================
   MON PARKING - Clients Module (CRM)
   Client management, purchase & rental history, contact actions
   ======================================================================== */

const Clients = {
  searchQuery: '',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const clients = await DB.getClientsByParking(parkingId);
    const sales = await DB.getSalesByParking(parkingId);
    const rentals = await DB.getRentalsByParking(parkingId);

    // Calculate real stats for each client
    clients.forEach(c => {
      const clientNameLower = (c.name || '').toLowerCase();
      const clientSales = sales.filter(s => (s.clientId && s.clientId === c.id) || (s.clientName && s.clientName.toLowerCase() === clientNameLower));
      const clientRentals = rentals.filter(r => (r.clientId && r.clientId === c.id) || (r.clientName && r.clientName.toLowerCase() === clientNameLower));
      
      const salesTotal = clientSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const rentalsTotal = clientRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      
      c.salesCount = clientSales.length;
      c.rentalsCount = clientRentals.length;
      c.totalSpent = salesTotal + rentalsTotal;
    });

    clients.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

    const totalClients = clients.length;
    const totalSpentAll = clients.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const activeRenters = clients.filter(c => c.rentalsCount > 0).length;
    const buyers = clients.filter(c => c.salesCount > 0).length;

    const filtered = clients.filter(c => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (c.name && c.name.toLowerCase().includes(q)) ||
             (c.phone && c.phone.includes(q)) ||
             (c.email && c.email.toLowerCase().includes(q)) ||
             (c.cin && c.cin.toLowerCase().includes(q));
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-users"></i></div>
            <div class="stat-card-value">${totalClients}</div>
            <div class="stat-card-label">Clients enregistrés</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-shopping-bag"></i></div>
            <div class="stat-card-value">${buyers}</div>
            <div class="stat-card-label">Clients acheteurs</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-key"></i></div>
            <div class="stat-card-value">${activeRenters}</div>
            <div class="stat-card-label">Clients locataires</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-gem"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalSpentAll)}</div>
            <div class="stat-card-label">Valeur cumulée clients</div>
          </div>
        </div>

        <div class="table-toolbar">
          <div class="search-input-wrapper" style="flex:1;max-width:360px">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="form-input search-input" placeholder="Rechercher nom, tél, CIN, email..." 
                   value="${this.searchQuery}" oninput="Clients.onSearch(this.value)">
          </div>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Clients.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button class="btn btn-primary" onclick="Clients.showModal()">
              <i class="fas fa-user-plus"></i> Nouveau client
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-user-friends"></i></div>
            <h3>Aucun client trouvé</h3>
            <p>Ajoutez des clients pour suivre leur historique d'achats et de locations.</p>
            <button class="btn btn-primary" onclick="Clients.showModal()">
              <i class="fas fa-plus"></i> Ajouter un client
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>CIN / Permis</th>
                  <th>Achats</th>
                  <th>Locations</th>
                  <th>Total Dépensé</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(c => `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <div class="user-avatar" style="width:38px;height:38px;font-size:0.95rem;background:linear-gradient(135deg, var(--primary), var(--accent-cyan));color:#fff">
                          ${Utils.getInitials(c.name)}
                        </div>
                        <div>
                          <div style="font-weight:700;color:var(--text-main)">${Utils.escapeHTML(c.name)}</div>
                          <small style="color:var(--text-muted)">${Utils.escapeHTML(c.city || 'Tunis')}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div><i class="fas fa-phone" style="font-size:0.8rem;color:var(--primary-light);margin-right:4px"></i> ${Utils.escapeHTML(c.phone || '-')}</div>
                      ${c.email ? `<small style="color:var(--text-muted)"><i class="fas fa-envelope" style="font-size:0.75rem;margin-right:4px"></i> ${Utils.escapeHTML(c.email)}</small>` : ''}
                    </td>
                    <td><span class="badge badge-secondary">${Utils.escapeHTML(c.cin || '-')}</span></td>
                    <td><span class="badge badge-info">${c.salesCount || 0}</span></td>
                    <td><span class="badge badge-purple">${c.rentalsCount || 0}</span></td>
                    <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(c.totalSpent || 0)}</td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Clients.viewDetails(${c.id})" data-tooltip="Fiche client">
                          <i class="fas fa-eye"></i>
                        </button>
                        ${c.phone ? `
                          <a href="tel:${c.phone}" class="btn btn-ghost btn-sm btn-icon" style="color:var(--accent-green)" data-tooltip="Appeler">
                            <i class="fas fa-phone"></i>
                          </a>
                        ` : ''}
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Clients.showModal(${c.id})" data-tooltip="Modifier">
                          <i class="fas fa-edit"></i>
                        </button>
                        ${Utils.isAdmin() ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Clients.deleteClient(${c.id})" data-tooltip="Supprimer">
                            <i class="fas fa-trash" style="color:var(--accent-red)"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  onSearch(val) {
    this.searchQuery = val;
    this.render();
  },

  async showModal(clientId = null) {
    const isEdit = !!clientId;
    let client = null;
    if (isEdit) {
      client = await DB.get('clients', clientId);
    }

    const formHtml = `
      <form id="client-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label><i class="fas fa-user"></i> Nom et prénom *</label>
          <input type="text" id="cli-name" class="form-input" value="${client?.name || ''}" placeholder="Ex: Mohamed Ben Ali" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-phone"></i> Numéro de téléphone *</label>
          <input type="tel" id="cli-phone" class="form-input" value="${client?.phone || ''}" placeholder="+216 20 123 456" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Email</label>
          <input type="email" id="cli-email" class="form-input" value="${client?.email || ''}" placeholder="mohamed@email.com">
        </div>

        <div class="form-group">
          <label><i class="fas fa-id-card"></i> Numéro CIN ou Permis</label>
          <input type="text" id="cli-cin" class="form-input" value="${client?.cin || ''}" placeholder="08765432">
        </div>
        <div class="form-group">
          <label><i class="fas fa-map-marker-alt"></i> Ville / Gouvernorat</label>
          <input type="text" id="cli-city" class="form-input" value="${client?.city || 'Tunis'}" placeholder="Tunis, Sousse, Sfax...">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-map-pin"></i> Adresse complète</label>
          <input type="text" id="cli-address" class="form-input" value="${client?.address || ''}" placeholder="Rue, quartier, code postal">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-sticky-note"></i> Remarques / Préférences client</label>
          <textarea id="cli-notes" class="form-input" rows="2" placeholder="Préférence pour boîtes automatiques, budget, etc.">${client?.notes || ''}</textarea>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal(isEdit ? 'Modifier le client' : 'Nouveau Client', formHtml, {
      confirmText: isEdit ? 'Sauvegarder' : 'Ajouter',
      size: 'modal-md'
    });

    if (confirmed) {
      const name = document.getElementById('cli-name').value.trim();
      const phone = document.getElementById('cli-phone').value.trim();
      const email = document.getElementById('cli-email').value.trim();
      const cin = document.getElementById('cli-cin').value.trim();
      const city = document.getElementById('cli-city').value.trim();
      const address = document.getElementById('cli-address').value.trim();
      const notes = document.getElementById('cli-notes').value.trim();

      if (!name || !phone) {
        Utils.notify('Le nom et le numéro de téléphone sont obligatoires', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();

      if (isEdit) {
        client.name = name;
        client.phone = phone;
        client.email = email;
        client.cin = cin;
        client.city = city;
        client.address = address;
        client.notes = notes;
        await DB.update('clients', client);
        Utils.notify('Informations client mises à jour', 'success');
      } else {
        await DB.add('clients', {
          parkingId,
          name,
          phone,
          email,
          cin,
          city,
          address,
          notes,
          totalSpent: 0
        });
        Utils.notify('Client ajouté avec succès', 'success');
      }

      this.render();
    }
  },

  async viewDetails(clientId) {
    const client = await DB.get('clients', clientId);
    if (!client) return;

    const parkingId = Utils.getCurrentParkingId();
    const sales = (await DB.getSalesByParking(parkingId)).filter(s => (s.clientId && s.clientId === client.id) || (s.clientName && s.clientName.toLowerCase() === client.name.toLowerCase()));
    const rentals = (await DB.getRentalsByParking(parkingId)).filter(r => (r.clientId && r.clientId === client.id) || (r.clientName && r.clientName.toLowerCase() === client.name.toLowerCase()));

    const contentHtml = `
      <div style="display:flex;flex-direction:column;gap:1.5rem">
        <!-- Client Header Card -->
        <div style="display:flex;align-items:center;gap:1.25rem;padding:1rem;background:var(--bg-glass);border-radius:var(--radius-md);border:1px solid var(--border-color)">
          <div class="user-avatar" style="width:54px;height:54px;font-size:1.3rem;background:linear-gradient(135deg, var(--primary), var(--accent-cyan));color:#fff">
            ${client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style="flex:1">
            <h3 style="margin:0;font-size:1.25rem;color:var(--text-main)">${Utils.escapeHTML(client.name)}</h3>
            <div style="color:var(--text-muted);font-size:0.9rem;margin-top:2px">
              ${Utils.escapeHTML(client.city || 'Tunis')} · CIN: ${Utils.escapeHTML(client.cin || 'Non renseigné')}
            </div>
            <div style="margin-top:6px;display:flex;gap:1rem;font-size:0.85rem">
              <span><i class="fas fa-phone" style="color:var(--primary-light)"></i> ${Utils.escapeHTML(client.phone || '-')}</span>
              ${client.email ? `<span><i class="fas fa-envelope" style="color:var(--accent-cyan)"></i> ${Utils.escapeHTML(client.email)}</span>` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.85rem;color:var(--text-muted)">Total cumulé</div>
            <div style="font-size:1.3rem;font-weight:800;color:var(--accent-green)">${Utils.formatCurrency(client.totalSpent || 0)}</div>
          </div>
        </div>

        <!-- Sales History -->
        <div>
          <h4 style="margin:0 0 0.5rem;color:var(--text-main);font-size:1rem"><i class="fas fa-shopping-cart" style="color:var(--accent-green)"></i> Achats de véhicules (${sales.length})</h4>
          ${sales.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem">Aucun achat de véhicule enregistré.</p>' : `
            <table class="data-table" style="font-size:0.85rem">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Paiement</th>
                </tr>
              </thead>
              <tbody>
                ${sales.map(s => `
                  <tr>
                    <td>${Utils.escapeHTML(s.invoiceNumber || 'FAC-' + s.id)}</td>
                    <td>${Utils.formatDate(s.date)}</td>
                    <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(s.totalAmount)}</td>
                    <td><span class="badge badge-info">${Utils.escapeHTML(s.paymentMethod || '')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Rentals History -->
        <div>
          <h4 style="margin:0 0 0.5rem;color:var(--text-main);font-size:1rem"><i class="fas fa-key" style="color:var(--accent-purple)"></i> Locations de véhicules (${rentals.length})</h4>
          ${rentals.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem">Aucune location enregistrée.</p>' : `
            <table class="data-table" style="font-size:0.85rem">
              <thead>
                <tr>
                  <th>Contrat</th>
                  <th>Période</th>
                  <th>Durée</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${rentals.map(r => {
                  const badge = Utils.getStatusBadge(r.status);
                  return `
                    <tr>
                      <td>${Utils.escapeHTML(r.contractNumber || 'LOC-' + r.id)}</td>
                      <td>${Utils.formatDate(r.startDate)} - ${Utils.formatDate(r.endDate)}</td>
                      <td>${r.days || 1} j</td>
                      <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(r.totalAmount)}</td>
                      <td><span class="badge ${badge.class}">${badge.label}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        ${client.notes ? `
          <div style="background:var(--bg-glass);padding:0.75rem 1rem;border-radius:var(--radius-md);font-size:0.85rem">
            <strong>Notes :</strong> ${Utils.escapeHTML(client.notes)}
          </div>
        ` : ''}
      </div>
    `;

    Utils.showModal(`Fiche Client : ${Utils.escapeHTML(client.name)}`, contentHtml, {
      size: 'modal-lg',
      hideFooter: true
    });
  },

  async deleteClient(clientId) {
    const ok = await Utils.confirm('Supprimer ce client ?');
    if (!ok) return;

    await DB.delete('clients', clientId);
    Utils.notify('Client supprimé', 'info');
    this.render();
  },

  async showQuickAdd(callback = null) {
    const formHtml = `
      <form id="quick-client-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label>Nom complet du client *</label>
          <input type="text" id="qc-name" class="form-input" placeholder="Ex: Karim Ben Salem" required>
        </div>
        <div class="form-group">
          <label>Numéro de Téléphone *</label>
          <input type="tel" id="qc-phone" class="form-input" placeholder="+216 ..." required>
        </div>
        <div class="form-group">
          <label>N° CIN ou Passeport</label>
          <input type="text" id="qc-cin" class="form-input" placeholder="09876543">
        </div>
        <div class="form-group span-2">
          <label>Adresse Email</label>
          <input type="email" id="qc-email" class="form-input" placeholder="client@email.com">
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Ajout Rapide de Client', formHtml, {
      confirmText: 'Créer le client',
      size: 'modal-md'
    });

    if (confirmed) {
      const name = document.getElementById('qc-name')?.value.trim();
      const phone = document.getElementById('qc-phone')?.value.trim();
      const cin = document.getElementById('qc-cin')?.value.trim();
      const email = document.getElementById('qc-email')?.value.trim();

      if (!name || !phone) {
        Utils.notify('Le nom et le téléphone sont obligatoires', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      const newClient = {
        parkingId,
        name,
        phone,
        cin,
        email,
        createdAt: new Date().toISOString()
      };

      const clientId = await DB.add('clients', newClient);
      newClient.id = clientId;
      Utils.notify(`Client ${name} créé avec succès !`, 'success');

      if (typeof callback === 'function') {
        callback(newClient);
      }
    }
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const clients = await DB.getClientsByParking(parkingId);
    const data = clients.map(c => ({
      Nom: c.name,
      Telephone: c.phone,
      Email: c.email || '',
      CIN: c.cin || '',
      Ville: c.city || '',
      Adresse: c.address || '',
      TotalDepense: c.totalSpent || 0,
      Notes: c.notes || ''
    }));
    Utils.exportToCSV(data, 'clients_mon_parking');
  }
};
