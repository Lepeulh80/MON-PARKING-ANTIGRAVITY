/* ========================================================================
   MON PARKING - Security Plate Lists (Whitelist VIP & Blacklist Alertes)
   Automated barrier gate authorization & instant alarm on flagged vehicles
   ======================================================================== */

const SecurityPlates = {
  currentFilter: 'all',
  searchQuery: '',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    let lists = await DB.getPlateListsByParking(parkingId);
    lists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = lists.length;
    const whitelist = lists.filter(l => l.type === 'whitelist_vip');
    const blacklist = lists.filter(l => l.type === 'blacklist_alert');

    const filtered = lists.filter(l => {
      if (this.currentFilter !== 'all' && l.type !== this.currentFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return (l.licensePlate && l.licensePlate.toLowerCase().includes(q)) ||
               (l.ownerName && l.ownerName.toLowerCase().includes(q)) ||
               (l.reason && l.reason.toLowerCase().includes(q));
      }
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Security KPIs -->
        <div class="stats-grid stagger-children">
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-crown"></i></div>
            <div class="stat-card-value">${whitelist.length}</div>
            <div class="stat-card-label">Plaques Whitelist VIP (Accès libre)</div>
          </div>
          <div class="stat-card red hover-lift">
            <div class="stat-card-icon"><i class="fas fa-shield-alt"></i></div>
            <div class="stat-card-value">${blacklist.length}</div>
            <div class="stat-card-label">Plaques Blacklist (Alertes Sécurité)</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-list-alt"></i></div>
            <div class="stat-card-value">${total}</div>
            <div class="stat-card-label">Total Plaques Surveillées</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-video"></i></div>
            <div class="stat-card-value">100%</div>
            <div class="stat-card-label">Détection Caméra Temps Réel</div>
          </div>
        </div>

        <!-- Security Banner -->
        <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(214,48,49,0.15), rgba(108,92,231,0.15));border:1px solid rgba(214,48,49,0.3);padding:1.25rem;margin-bottom:1.5rem">
          <h3 style="margin:0;font-size:1.15rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
            <i class="fas fa-shield-virus" style="color:var(--accent-red)"></i>
            Système Automatique de Contrôle d'Accès par Plaque
          </h3>
          <p style="margin:6px 0 0;font-size:0.85rem;color:var(--text-secondary)">
            Lorsqu'une plaque surveillée est détectée par la caméra LPR à l'entrée :
            <strong>Whitelist</strong> ouvre immédiatement la barrière pour les VIP et abonnés.
            <strong>Blacklist</strong> déclenche une sirène d'alerte rouge clignotante et bloque la barrière.
          </p>
        </div>

        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="SecurityPlates.setFilter('all')">
              Toutes (${total})
            </button>
            <button class="filter-tab ${this.currentFilter === 'whitelist_vip' ? 'active' : ''}" onclick="SecurityPlates.setFilter('whitelist_vip')">
              Whitelist VIP (${whitelist.length})
            </button>
            <button class="filter-tab ${this.currentFilter === 'blacklist_alert' ? 'active' : ''}" onclick="SecurityPlates.setFilter('blacklist_alert')">
              Blacklist Alertes (${blacklist.length})
            </button>
          </div>

          <div class="search-input-wrapper" style="flex:1;max-width:300px">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="form-input search-input" placeholder="Chercher plaque, nom, motif..."
                   value="${this.searchQuery}" oninput="SecurityPlates.onSearch(this.value)">
          </div>

          <div class="btn-group">
            <button class="btn btn-primary" onclick="SecurityPlates.showAddModal()">
              <i class="fas fa-plus"></i> Ajouter une plaque
            </button>
          </div>
        </div>

        <div class="table-container animate-fade-up">
          <table class="data-table">
            <thead>
              <tr>
                <th>Plaque d'immatriculation</th>
                <th>Classification</th>
                <th>Titulaire / Contact</th>
                <th>Motif & Instructions</th>
                <th>Date d'ajout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(item => {
                const isVip = item.type === 'whitelist_vip';
                return `
                  <tr>
                    <td>
                      <span style="font-family:'Outfit', monospace;font-weight:900;background:#1e272e;color:#fff;padding:4px 10px;border-radius:6px;letter-spacing:1px;border:1.5px solid ${isVip ? 'var(--accent-green)' : 'var(--accent-red)'}">
                        ${Utils.escapeHTML(item.licensePlate)}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${isVip ? 'badge-success' : 'badge-danger'}">
                        ${isVip ? '<i class="fas fa-crown"></i> Whitelist VIP' : '<i class="fas fa-exclamation-triangle"></i> Blacklist Alerte'}
                      </span>
                    </td>
                    <td><strong>${Utils.escapeHTML(item.ownerName || 'Non renseigné')}</strong></td>
                    <td style="color:var(--text-secondary)">${Utils.escapeHTML(item.reason || '-')}</td>
                    <td>${Utils.formatDate(item.createdAt)}</td>
                    <td>
                      <div class="btn-group">
                        ${Utils.isAdmin() ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="SecurityPlates.deletePlate(${item.id})" data-tooltip="Supprimer">
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
      </div>
    `;
  },

  setFilter(f) {
    this.currentFilter = f;
    this.render();
  },

  onSearch(q) {
    this.searchQuery = q;
    this.render();
  },

  async showAddModal() {
    const formHtml = `
      <form id="sec-plate-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label>Type de liste *</label>
          <select id="sec-type" class="form-input">
            <option value="whitelist_vip">🟢 Whitelist VIP (Accès libre & prioritaire)</option>
            <option value="blacklist_alert">🔴 Blacklist Alerte (Signalement & blocage barrière)</option>
          </select>
        </div>

        <div class="form-group span-2">
          <label>Plaque d'immatriculation *</label>
          <input type="text" id="sec-plate" class="form-input" placeholder="Ex: 215 TN 9081 ou 999 TN 9999" required style="text-transform:uppercase;font-weight:700;font-size:1.1rem">
        </div>

        <div class="form-group span-2">
          <label>Nom du titulaire ou Société</label>
          <input type="text" id="sec-owner" class="form-input" placeholder="Ex: M. le Directeur ou Récidiviste impayé">
        </div>

        <div class="form-group span-2">
          <label>Motif & Instructions pour les agents *</label>
          <textarea id="sec-reason" class="form-input" rows="2" placeholder="Ex: Véhicule de fonction direction ou Refus de payer ticket précédent" required></textarea>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Ajouter une plaque surveillée', formHtml, { confirmText: 'Ajouter à la liste' });
    if (confirmed) {
      const type = document.getElementById('sec-type').value;
      const plate = document.getElementById('sec-plate').value.trim().toUpperCase();
      const owner = document.getElementById('sec-owner').value.trim();
      const reason = document.getElementById('sec-reason').value.trim();

      if (!plate || !reason) {
        Utils.notify('Veuillez renseigner la plaque et le motif.', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.add('plateLists', {
        parkingId,
        licensePlate: plate,
        type,
        ownerName: owner,
        reason,
        createdAt: new Date().toISOString()
      });

      Utils.notify(`Plaque ${plate} ajoutée avec succès.`, 'success');
      this.render();
    }
  },

  async deletePlate(id) {
    const ok = await Utils.confirm('Supprimer cette plaque de la liste de sécurité ?');
    if (!ok) return;

    await DB.delete('plateLists', id);
    Utils.notify('Plaque retirée de la surveillance.', 'info');
    this.render();
  }
};
