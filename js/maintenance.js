/* ========================================================================
   MON PARKING - Vehicle Maintenance & Inspection Module
   Service logbook, scheduled revisions, technical inspections, and damage checks
   ======================================================================== */

const Maintenance = {
  currentFilter: 'all',
  currentStatusFilter: 'all',
  searchQuery: '',

  TYPES: [
    { id: 'oil_change', label: 'Vidange & Filtres', icon: 'fa-oil-can', color: 'var(--accent-yellow)', defaultIntervalKm: 10000 },
    { id: 'brakes', label: 'Freins & Plaquettes', icon: 'fa-compact-disc', color: 'var(--accent-red)', defaultIntervalKm: 30000 },
    { id: 'tires', label: 'Pneumatiques & Géométrie', icon: 'fa-ring', color: 'var(--accent-cyan)', defaultIntervalKm: 40000 },
    { id: 'inspection', label: 'Contrôle Technique', icon: 'fa-clipboard-check', color: 'var(--accent-green)', defaultIntervalDays: 365 },
    { id: 'revision', label: 'Révision Générale', icon: 'fa-tools', color: 'var(--primary-light)', defaultIntervalKm: 20000 },
    { id: 'timing_belt', label: 'Courroie Distribution', icon: 'fa-cogs', color: 'var(--accent-pink)', defaultIntervalKm: 80000 },
    { id: 'bodywork', label: 'Carrosserie & Peinture', icon: 'fa-spray-can', color: 'var(--accent-orange)' },
    { id: 'other', label: 'Autre réparation', icon: 'fa-wrench', color: 'var(--text-muted)' }
  ],

  _type(id) {
    return this.TYPES.find(t => t.id === id) || this.TYPES[7];
  },

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    if (!content) return;

    const maintenanceList = await DB.getMaintenanceByParking(parkingId);
    const vehicles = await DB.getVehiclesByParking(parkingId);
    const vehicleMap = {};
    vehicles.forEach(v => { vehicleMap[v.id] = v; });

    const totalInterventions = maintenanceList.length;
    const completedList = maintenanceList.filter(m => m.status === 'completed');
    const pendingList = maintenanceList.filter(m => m.status === 'planned' || m.status === 'in_progress');
    const totalCost = maintenanceList.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);

    // Urgent inspections (< 30 days) or overdue mileage
    const now = new Date();
    const urgentList = [];

    maintenanceList.forEach(m => {
      if (m.status !== 'completed' && m.dueDate) {
        const due = new Date(m.dueDate);
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          urgentList.push({ ...m, diffDays });
        }
      }
    });

    // Filter list
    const filtered = maintenanceList.filter(m => {
      if (this.currentFilter !== 'all' && m.type !== this.currentFilter) return false;
      if (this.currentStatusFilter !== 'all' && m.status !== this.currentStatusFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const v = vehicleMap[m.vehicleId] || {};
        const vText = `${v.brand || ''} ${v.model || ''} ${v.licensePlate || ''}`.toLowerCase();
        const desc = (m.description || '').toLowerCase();
        const prov = (m.garage || '').toLowerCase();
        return vText.includes(q) || desc.includes(q) || prov.includes(q);
      }
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Maintenance KPIs -->
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-wrench"></i></div>
            <div class="stat-card-value">${totalInterventions}</div>
            <div class="stat-card-label">Interventions au carnet</div>
          </div>
          <div class="stat-card ${urgentList.length > 0 ? 'red' : 'green'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-card-value">${urgentList.length}</div>
            <div class="stat-card-label">Échéances urgentes (&lt; 30 jours)</div>
          </div>
          <div class="stat-card yellow hover-lift">
            <div class="stat-card-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-card-value">${pendingList.length}</div>
            <div class="stat-card-label">Entretiens en attente / prévus</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalCost)}</div>
            <div class="stat-card-label">Budget entretien engagé</div>
          </div>
        </div>

        <!-- Toolbar & Filter Actions -->
        <div class="table-toolbar">
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">
            <div class="header-search" style="margin:0;width:auto">
              <input type="text" class="form-input" style="padding:0.45rem 1rem" placeholder="Recherche véhicule, garage..." 
                oninput="Maintenance.handleSearch(this.value)" value="${Utils.escapeHTML(this.searchQuery)}">
            </div>

            <select class="form-input" style="width:auto;padding:0.5rem 1rem" onchange="Maintenance.setFilter(this.value)">
              <option value="all">Tous types d'intervention</option>
              ${this.TYPES.map(t => `<option value="${t.id}" ${this.currentFilter === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>

            <select class="form-input" style="width:auto;padding:0.5rem 1rem" onchange="Maintenance.setStatusFilter(this.value)">
              <option value="all">Tous statuts</option>
              <option value="completed" ${this.currentStatusFilter === 'completed' ? 'selected' : ''}>Terminé</option>
              <option value="in_progress" ${this.currentStatusFilter === 'in_progress' ? 'selected' : ''}>En cours</option>
              <option value="planned" ${this.currentStatusFilter === 'planned' ? 'selected' : ''}>Planifié</option>
            </select>
          </div>

          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Maintenance.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter
            </button>
            <button class="btn btn-primary btn-sm" onclick="Maintenance.openAddModal()">
              <i class="fas fa-plus"></i> Nouvelle intervention
            </button>
          </div>
        </div>

        <!-- Urgent Alerts Banner if any -->
        ${urgentList.length > 0 ? `
          <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(235,77,75,0.15), rgba(253,203,110,0.1));border:1px solid rgba(235,77,75,0.3);padding:1rem 1.25rem;margin-bottom:1.5rem">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.5rem">
              <i class="fas fa-bell" style="color:var(--accent-red);font-size:1.2rem"></i>
              <strong style="color:var(--text-main);font-size:0.95rem">Alertes d'échéances d'entretien prioritaires</strong>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${urgentList.slice(0, 4).map(u => {
                const v = vehicleMap[u.vehicleId] || {};
                const t = this._type(u.type);
                const isOverdue = u.diffDays < 0;
                return `
                  <div style="background:var(--bg-glass);padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;font-size:0.8rem">
                    <span style="color:${t.color}"><i class="fas ${t.icon}"></i> ${t.label}</span>
                    <strong style="color:var(--text-main)">${Utils.escapeHTML(v.brand || '')} ${Utils.escapeHTML(v.model || '')}</strong>
                    <span class="badge ${isOverdue ? 'badge-danger' : 'badge-warning'}">
                      ${isOverdue ? `En retard de ${Math.abs(u.diffDays)}j` : `Dans ${u.diffDays} jours`}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Maintenance Operations Table -->
        <div class="table-container animate-fade-up">
          <table class="data-table">
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Type d'intervention</th>
                <th>Date</th>
                <th>Kilométrage</th>
                <th>Échéance</th>
                <th>Garage / Prestataire</th>
                <th>Coût</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center;padding:3rem;color:var(--text-muted)">
                    <i class="fas fa-clipboard-check" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block"></i>
                    Aucune intervention enregistrée dans cette sélection.
                  </td>
                </tr>
              ` : filtered.map(m => {
                const v = vehicleMap[m.vehicleId] || { brand: 'Inconnu', model: '', licensePlate: '-' };
                const t = this._type(m.type);
                const statusBadge = m.status === 'completed' ? { label: 'Terminé', class: 'badge-success' } :
                                    m.status === 'in_progress' ? { label: 'En cours', class: 'badge-warning' } :
                                    { label: 'Planifié', class: 'badge-secondary' };

                return `
                  <tr>
                    <td>
                      <div style="font-weight:700;color:var(--text-main)">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</div>
                      <code style="font-size:0.75rem;background:var(--bg-glass);padding:2px 6px;border-radius:4px">${Utils.escapeHTML(v.licensePlate || '-')}</code>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <i class="fas ${t.icon}" style="color:${t.color};width:16px;text-align:center"></i>
                        <span style="font-weight:600">${t.label}</span>
                      </div>
                      ${m.description ? `<small style="color:var(--text-muted);display:block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.escapeHTML(m.description)}</small>` : ''}
                    </td>
                    <td>${Utils.formatDate(m.date || m.createdAt)}</td>
                    <td><strong style="color:var(--text-main)">${m.mileage ? Utils.formatNumber(m.mileage) + ' km' : '-'}</strong></td>
                    <td>
                      ${m.dueMileage ? `<div>${Utils.formatNumber(m.dueMileage)} km</div>` : ''}
                      ${m.dueDate ? `<small style="color:var(--text-muted)">${Utils.formatDate(m.dueDate)}</small>` : '-'}
                    </td>
                    <td>${Utils.escapeHTML(m.garage || 'Interne')}</td>
                    <td><strong style="color:var(--accent-cyan)">${Utils.formatCurrency(m.cost)}</strong></td>
                    <td><span class="badge ${statusBadge.class}">${statusBadge.label}</span></td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Maintenance.openDetailModal(${m.id})" title="Détails de l'intervention">
                          <i class="fas fa-eye"></i>
                        </button>
                        ${m.status !== 'completed' ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Maintenance.markCompleted(${m.id})" title="Marquer comme terminé" style="color:var(--accent-green)">
                            <i class="fas fa-check"></i>
                          </button>
                        ` : ''}
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Maintenance.deleteEntry(${m.id})" title="Supprimer" style="color:var(--accent-red)">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleSearch(val) {
    this.searchQuery = val;
    this.render();
  },

  setFilter(val) {
    this.currentFilter = val;
    this.render();
  },

  setStatusFilter(val) {
    this.currentStatusFilter = val;
    this.render();
  },

  async openAddModal(preselectedVehicleId = null) {
    const parkingId = Utils.getCurrentParkingId();
    const vehicles = await DB.getVehiclesByParking(parkingId);

    const formHtml = `
      <form id="maint-add-form" class="modal-form-grid" style="padding-top:0.5rem" onsubmit="return false;">
        <div class="form-group span-2">
          <label>Véhicule concerné *</label>
          <select id="maint-vehicle-id" class="form-input" required>
            <option value="">Sélectionner un véhicule...</option>
            ${vehicles.map(v => `
              <option value="${v.id}" ${preselectedVehicleId && preselectedVehicleId === v.id ? 'selected' : ''}>
                ${v.brand} ${v.model} (${v.year || '-'}) — ${v.licensePlate || 'Sans immat'} [${v.mileage || 0} km]
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Type d'intervention *</label>
          <select id="maint-type" class="form-input" required>
            ${this.TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Date de l'intervention *</label>
          <input type="date" id="maint-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
        </div>

        <div class="form-group">
          <label>Kilométrage actuel (km)</label>
          <input type="number" id="maint-mileage" class="form-input" placeholder="ex: 85000" min="0">
        </div>

        <div class="form-group">
          <label>Coût total de l'intervention (TND)</label>
          <input type="number" step="0.01" id="maint-cost" class="form-input" placeholder="ex: 180.00" min="0">
        </div>

        <div class="form-group">
          <label>Prochaine échéance kilométrique (km)</label>
          <input type="number" id="maint-due-mileage" class="form-input" placeholder="ex: 95000">
        </div>

        <div class="form-group">
          <label>Prochaine échéance date</label>
          <input type="date" id="maint-due-date" class="form-input">
        </div>

        <div class="form-group">
          <label>Garage / Prestataire / Mécanicien</label>
          <input type="text" id="maint-garage" class="form-input" placeholder="ex: Garage Central, Bosch Service...">
        </div>

        <div class="form-group">
          <label>Statut de l'opération</label>
          <select id="maint-status" class="form-input">
            <option value="completed">Terminé</option>
            <option value="in_progress">En cours</option>
            <option value="planned">Planifié</option>
          </select>
        </div>

        <div class="form-group span-2">
          <label>Détails & Pièces remplacées</label>
          <textarea id="maint-desc" class="form-input" rows="2" placeholder="Huile 5W30 synthétique, filtre à huile, filtre habitacle, contrôle plaquettes..."></textarea>
        </div>
      </form>
    `;

    const ok = await Utils.showModal('Nouvelle Intervention Entretien', formHtml, { confirmText: 'Enregistrer au carnet', size: 'modal-lg' });
    if (!ok) return;

    const vehicleId = parseInt(document.getElementById('maint-vehicle-id').value);
    const type = document.getElementById('maint-type').value;
    const date = document.getElementById('maint-date').value;
    const mileage = parseInt(document.getElementById('maint-mileage').value) || 0;
    const cost = parseFloat(document.getElementById('maint-cost').value) || 0;
    const dueMileage = parseInt(document.getElementById('maint-due-mileage').value) || null;
    const dueDate = document.getElementById('maint-due-date').value || null;
    const garage = document.getElementById('maint-garage').value.trim() || 'Interne';
    const status = document.getElementById('maint-status').value;
    const description = document.getElementById('maint-desc').value.trim();

    if (!vehicleId) {
      Utils.notify('Veuillez sélectionner un véhicule.', 'warning');
      return;
    }

    if (cost < 0 || mileage < 0 || (dueMileage !== null && dueMileage < 0)) {
      Utils.notify('Le coût et les kilométrages doivent être des valeurs positives ou nulles.', 'error');
      return;
    }

    const entry = {
      parkingId,
      vehicleId,
      type,
      date,
      mileage,
      cost,
      dueMileage,
      dueDate,
      garage,
      status,
      description,
      createdAt: new Date().toISOString()
    };

    await DB.add('vehicleMaintenance', entry);

    // Update vehicle mileage if higher
    if (mileage > 0) {
      const v = await DB.get('vehicles', vehicleId);
      if (v && (!v.mileage || mileage > v.mileage)) {
        v.mileage = mileage;
        await DB.update('vehicles', v);
      }
    }

    await DB.logAudit(parkingId, 'MAINTENANCE_LOG', `Intervention ${this._type(type).label} enregistrée pour véhicule #${vehicleId} (${Utils.formatCurrency(cost)})`);
    Utils.notify('Intervention ajoutée au carnet avec succès !', 'success');
    this.render();
  },

  async markCompleted(id) {
    const item = await DB.get('vehicleMaintenance', id);
    if (!item) return;
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    await DB.update('vehicleMaintenance', item);
    Utils.notify('Intervention marquée comme terminée !', 'success');
    this.render();
  },

  async deleteEntry(id) {
    const ok = await Utils.confirm('Supprimer cette entrée du carnet d\'entretien ?');
    if (!ok) return;
    await DB.delete('vehicleMaintenance', id);
    Utils.notify('Entrée supprimée.', 'info');
    this.render();
  },

  async openDetailModal(id) {
    const item = await DB.get('vehicleMaintenance', id);
    if (!item) return;
    const v = await DB.get('vehicles', item.vehicleId) || {};
    const t = this._type(item.type);

    const html = `
      <div style="padding:0.5rem 0">
        <div style="display:flex;align-items:center;gap:12px;padding:1rem;background:var(--bg-glass);border-radius:12px;margin-bottom:1rem">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:${t.color}">
            <i class="fas ${t.icon}"></i>
          </div>
          <div>
            <h4 style="margin:0;font-size:1.1rem;color:var(--text-main)">${t.label}</h4>
            <div style="color:var(--text-muted);font-size:0.82rem">${v.brand || ''} ${v.model || ''} · ${v.licensePlate || 'Sans immat'}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;font-size:0.85rem">
          <div><span style="color:var(--text-muted)">Date :</span> <strong>${Utils.formatDate(item.date)}</strong></div>
          <div><span style="color:var(--text-muted)">Coût :</span> <strong style="color:var(--accent-cyan)">${Utils.formatCurrency(item.cost)}</strong></div>
          <div><span style="color:var(--text-muted)">Kilométrage :</span> <strong>${item.mileage ? Utils.formatNumber(item.mileage) + ' km' : '-'}</strong></div>
          <div><span style="color:var(--text-muted)">Garage :</span> <strong>${Utils.escapeHTML(item.garage || 'Interne')}</strong></div>
          <div><span style="color:var(--text-muted)">Statut :</span> <strong style="text-transform:capitalize">${item.status}</strong></div>
          <div><span style="color:var(--text-muted)">Prochaine révision :</span> <strong>${item.dueMileage ? Utils.formatNumber(item.dueMileage) + ' km' : (item.dueDate ? Utils.formatDate(item.dueDate) : '-')}</strong></div>
        </div>

        ${item.description ? `
          <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-color)">
            <label style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Notes d'intervention :</label>
            <p style="margin:0;background:var(--bg-glass);padding:0.75rem;border-radius:8px;font-size:0.85rem">${Utils.escapeHTML(item.description)}</p>
          </div>
        ` : ''}
      </div>
    `;

    Utils.showModal('Fiche d\'Intervention', html, { hideFooter: true });
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const list = await DB.getMaintenanceByParking(parkingId);
    const vehicles = await DB.getVehiclesByParking(parkingId);
    const vMap = {};
    vehicles.forEach(v => { vMap[v.id] = v; });

    const data = list.map(m => {
      const v = vMap[m.vehicleId] || {};
      return {
        Vehicule: `${v.brand || ''} ${v.model || ''}`,
        Immatriculation: v.licensePlate || '',
        Type: this._type(m.type).label,
        Date: m.date || '',
        Kilometrage: m.mileage || '',
        Garage: m.garage || '',
        Cout_TND: m.cost || 0,
        Statut: m.status || '',
        ProchainKm: m.dueMileage || '',
        ProchaineDate: m.dueDate || '',
        Description: m.description || ''
      };
    });

    Utils.exportToCSV(data, 'carnet_entretien_mon_parking');
  }
};

window.Maintenance = Maintenance;
