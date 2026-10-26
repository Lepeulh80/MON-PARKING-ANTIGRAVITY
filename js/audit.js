/* ========================================================================
   MON PARKING - Audit Log & Staff Security Traceability Module
   Immutable audit trail, permission matrix, manual gate override audit
   ======================================================================== */

const Audit = {
  currentFilter: 'all',
  searchQuery: '',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const logs = await DB.getAuditLogs(parkingId);

    const filtered = logs.filter(l => {
      if (this.currentFilter !== 'all' && l.actionType !== this.currentFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return (l.userName && l.userName.toLowerCase().includes(q)) ||
               (l.details && l.details.toLowerCase().includes(q)) ||
               (l.actionType && l.actionType.toLowerCase().includes(q));
      }
      return true;
    });

    const manualOpens = logs.filter(l => l.actionType === 'BARRIER_MANUAL_OPEN').length;
    const lostTickets = logs.filter(l => l.actionType === 'LOST_TICKET_SETTLED').length;
    const corrections = logs.filter(l => l.actionType === 'PLATE_CORRECTION').length;
    const rateChanges = logs.filter(l => l.actionType === 'RATE_UPDATE').length;

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Audit KPIs Overview -->
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-history"></i></div>
            <div class="stat-card-value">${logs.length}</div>
            <div class="stat-card-label">Événements d'audit enregistrés</div>
          </div>
          <div class="stat-card red hover-lift">
            <div class="stat-card-icon"><i class="fas fa-door-open"></i></div>
            <div class="stat-card-value">${manualOpens}</div>
            <div class="stat-card-label">Ouvertures manuelles forcées</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-edit"></i></div>
            <div class="stat-card-value">${corrections}</div>
            <div class="stat-card-label">Corrections de plaques OCR</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-file-invoice"></i></div>
            <div class="stat-card-value">${lostTickets}</div>
            <div class="stat-card-label">Tickets perdus régularisés</div>
          </div>
        </div>

        <!-- Security Action Banner -->
        <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(235,77,75,0.15), rgba(108,92,231,0.15));border:1px solid rgba(235,77,75,0.3);padding:1.25rem 1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.5rem">
          <div>
            <span class="badge badge-danger" style="font-size:0.75rem;padding:3px 8px;margin-bottom:4px">
              CONTRÔLE INTERNE & SÉCURITÉ
            </span>
            <h3 style="font-size:1.2rem;font-weight:800;color:var(--text-main);margin:0">
              Journal d'Audit Immuable & Traçabilité des Opérations
            </h3>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin:3px 0 0">
              Chaque ouverture manuelle, annulation, correction de plaque ou remise est tracée avec identifiant opérateur et horodatage certifié.
            </p>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-primary btn-sm hover-lift" style="background:var(--accent-red);border:none" onclick="Audit.openManualGateOverrideModal()">
              <i class="fas fa-exclamation-circle"></i> Forcer Ouverture Barrière (Audit)
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Audit.showRolesMatrixModal()">
              <i class="fas fa-user-shield"></i> Matrice des Rôles
            </button>
          </div>
        </div>

        <!-- Toolbar & Filter Tabs -->
        <div class="table-toolbar">
          <div class="filter-tabs" style="overflow-x:auto;padding-bottom:4px">
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="Audit.setFilter('all')">
              Tous (${logs.length})
            </button>
            <button class="filter-tab ${this.currentFilter === 'BARRIER_MANUAL_OPEN' ? 'active' : ''}" onclick="Audit.setFilter('BARRIER_MANUAL_OPEN')">
              Ouvertures Forcées (${manualOpens})
            </button>
            <button class="filter-tab ${this.currentFilter === 'PLATE_CORRECTION' ? 'active' : ''}" onclick="Audit.setFilter('PLATE_CORRECTION')">
              Corrections Plaques (${corrections})
            </button>
            <button class="filter-tab ${this.currentFilter === 'LOST_TICKET_SETTLED' ? 'active' : ''}" onclick="Audit.setFilter('LOST_TICKET_SETTLED')">
              Tickets Perdus (${lostTickets})
            </button>
            <button class="filter-tab ${this.currentFilter === 'RATE_UPDATE' ? 'active' : ''}" onclick="Audit.setFilter('RATE_UPDATE')">
              Tarifs (${rateChanges})
            </button>
          </div>

          <div class="search-input-wrapper" style="flex:1;max-width:280px">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="form-input search-input" placeholder="Opérateur, action, détail..." 
                   value="${this.searchQuery}" oninput="Audit.onSearch(this.value)">
          </div>

          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Audit.exportCSV()">
              <i class="fas fa-file-csv"></i> Export CSV
            </button>
          </div>
        </div>

        <!-- Audit Records Table -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div>
            <h3>Aucun enregistrement d'audit trouvé</h3>
            <p>Toutes les actions sensibles exécutées sur le parking apparaîtront ici.</p>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Opérateur</th>
                  <th>Rôle</th>
                  <th>Action</th>
                  <th>Détails de l'opération</th>
                  <th>Niveau</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(l => {
                  let badgeClass = 'badge-secondary';
                  let icon = 'fas fa-info-circle';
                  let actionLabel = l.actionType;

                  switch (l.actionType) {
                    case 'BARRIER_MANUAL_OPEN':
                      badgeClass = 'badge-danger';
                      icon = 'fas fa-door-open';
                      actionLabel = 'Ouverture Forcée';
                      break;
                    case 'PLATE_CORRECTION':
                      badgeClass = 'badge-warning';
                      icon = 'fas fa-edit';
                      actionLabel = 'Correction Plaque';
                      break;
                    case 'LOST_TICKET_SETTLED':
                      badgeClass = 'badge-primary';
                      icon = 'fas fa-file-invoice-dollar';
                      actionLabel = 'Ticket Perdu';
                      break;
                    case 'RATE_UPDATE':
                      badgeClass = 'badge-info';
                      icon = 'fas fa-tags';
                      actionLabel = 'Tarifs Modifiés';
                      break;
                    case 'CASH_CLOSURE':
                      badgeClass = 'badge-success';
                      icon = 'fas fa-calculator';
                      actionLabel = 'Clôture Caisse Z';
                      break;
                    case 'SYSTEM_INIT':
                      badgeClass = 'badge-secondary';
                      icon = 'fas fa-cog';
                      actionLabel = 'Système';
                      break;
                  }

                  return `
                    <tr>
                      <td style="white-space:nowrap;font-size:0.85rem">
                        <i class="far fa-clock" style="color:var(--text-muted);margin-right:4px"></i>
                        ${Utils.formatDateTime(l.timestamp)}
                      </td>
                      <td>
                        <strong style="color:var(--text-main)">${Utils.escapeHTML(l.userName || 'Système')}</strong>
                      </td>
                      <td>
                        <span class="badge ${l.userRole === 'admin' ? 'badge-primary' : 'badge-secondary'}" style="text-transform:uppercase;font-size:0.75rem">
                          ${Utils.escapeHTML(l.userRole || 'opérateur')}
                        </span>
                      </td>
                      <td>
                        <span class="badge ${badgeClass}" style="display:inline-flex;align-items:center;gap:5px">
                          <i class="${icon}"></i> ${actionLabel}
                        </span>
                      </td>
                      <td style="font-size:0.9rem;color:var(--text-main)">
                        ${Utils.escapeHTML(l.details)}
                      </td>
                      <td>
                        <span style="font-size:0.8rem;color:var(--text-muted);font-family:monospace">
                          #AUD-${l.id}
                        </span>
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

  onSearch(query) {
    this.searchQuery = query;
    this.render();
  },

  async openManualGateOverrideModal() {
    const modalHtml = `
      <form id="gate-override-form" class="modal-form-grid" onsubmit="return false;">
        <div class="span-2" style="background:rgba(235,77,75,0.15);border:1px solid var(--accent-red);padding:1rem;border-radius:10px;text-align:center">
          <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--accent-red);margin-bottom:6px"></i>
          <h4 style="margin:0;color:var(--accent-red)">Ouverture Manuelle Forcée de la Barrière</h4>
          <p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-secondary)">
            Cette opération contourne le système automatique de billetterie et sera obligatoirement consignée dans le registre d'audit fiscal.
          </p>
        </div>

        <div class="form-group span-2">
          <label>Borne / Barrière concernée *</label>
          <select id="override-gate-id" class="form-input">
            <option value="Borne Entrée 1 (Principale)">Borne Entrée 1 (Principale)</option>
            <option value="Borne Entrée 2 (Secondaire)">Borne Entrée 2 (Secondaire)</option>
            <option value="Borne Sortie 1 (Principale)">Borne Sortie 1 (Principale)</option>
            <option value="Borne Sortie 2 (VIP/Réservés)">Borne Sortie 2 (VIP/Réservés)</option>
          </select>
        </div>

        <div class="form-group span-2">
          <label>Motif Impératif de l'Ouverture Manuelle *</label>
          <textarea id="override-reason" class="form-input" rows="3" placeholder="Ex: Urgence médicale, passage convoi technique, dysfonctionnement matériel badge client..." required></textarea>
        </div>

        <div class="form-group span-2">
          <label>Plaque d'immatriculation du véhicule franchissant (optionnel)</label>
          <input type="text" id="override-plate" class="form-input" placeholder="Ex: 215 TN 1234">
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Dérogation : Ouverture Forcée', modalHtml, {
      confirmText: 'Ouvrir Barrière & Consigner l\'Audit',
      size: 'modal-md'
    });

    if (confirmed) {
      const gate = document.getElementById('override-gate-id')?.value;
      const reason = document.getElementById('override-reason')?.value.trim();
      const plate = document.getElementById('override-plate')?.value.trim().toUpperCase() || 'Non renseignée';

      if (!reason) {
        Utils.notify('Le motif de l\'ouverture forcée est obligatoire pour le registre d\'audit !', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.logAudit(parkingId, 'BARRIER_MANUAL_OPEN', `Ouverture manuelle forcée sur ${gate} · Motif : ${reason} · Plaque : ${plate}`, { gate, reason, plate });
      
      Sync.broadcast('BARRIER_OPENED', { gate, reason });
      Utils.notify(`Barrière ${gate} ouverte avec succès et consignée dans l'audit`, 'success');
      this.render();
    }
  },

  showRolesMatrixModal() {
    const modalHtml = `
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <p style="font-size:0.9rem;color:var(--text-secondary);margin:0">
          Chaque collaborateur du parking dispose d'un rôle granulaire avec des privilèges délimités pour garantir l'étanchéité des encaissements et la sécurité.
        </p>

        <div style="overflow-x:auto">
          <table class="data-table" style="font-size:0.85rem">
            <thead>
              <tr>
                <th>Fonctionnalité / Droit</th>
                <th>Super Admin</th>
                <th>Chef de Parc</th>
                <th>Caissier Barrière</th>
                <th>Agent Sécurité</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Scan de Plaque LPR & Entrée</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
              </tr>
              <tr>
                <td>Encaissement & Reçus Sortie</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Régularisation Ticket Perdu</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Correction Plaque Immatriculation</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Ouverture Forcée Barrière (Audit)</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Clôture de Caisse (Rapport Z)</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Gestion des Abonnements VIP</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Modification Grille Tarifaire</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
              <tr>
                <td>Consultation Journal d'Audit</td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-check text-success"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
                <td><i class="fas fa-times text-danger"></i></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    Utils.showModal('Matrice des Droits & Rôles du Personnel', modalHtml, {
      size: 'modal-lg',
      hideCancel: true,
      confirmText: 'Compris'
    });
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const logs = await DB.getAuditLogs(parkingId);
    const data = logs.map(l => ({
      ID: l.id,
      DateHeure: l.timestamp,
      Operateur: l.userName,
      Role: l.userRole,
      TypeAction: l.actionType,
      Details: l.details
    }));
    Utils.exportToCSV(data, 'journal_audit_parking');
  }
};

window.Audit = Audit;
