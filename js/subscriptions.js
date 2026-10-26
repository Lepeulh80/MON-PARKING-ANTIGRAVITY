/* ========================================================================
   MON PARKING - Subscriptions & Parking Passes Module (Abonnements)
   Long-term park passes, resident/corporate subscriptions, RFID badges & cards
   ======================================================================== */

const Subscriptions = {
  currentFilter: 'active',
  searchQuery: '',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    let subs = await DB.getSubscriptionsByParking(parkingId);
    subs.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    const now = new Date();
    // Auto-update expired status
    for (const s of subs) {
      if (s.status === 'active' && new Date(s.endDate) < now) {
        s.status = 'expired';
        await DB.update('subscriptions', s);
      }
    }

    const totalSubs = subs.length;
    const activeSubs = subs.filter(s => s.status === 'active').length;
    const expiredSubs = subs.filter(s => s.status === 'expired').length;
    const monthlyRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.price || 0), 0);

    const in7Days = new Date(now.getTime() + 7 * 86400000);
    const expiringSoon = subs.filter(s => s.status === 'active' && new Date(s.endDate) <= in7Days).length;

    const filtered = subs.filter(s => {
      if (this.currentFilter !== 'all' && s.status !== this.currentFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return (s.subscriberName && s.subscriberName.toLowerCase().includes(q)) ||
               (s.licensePlate && s.licensePlate.toLowerCase().includes(q)) ||
               (s.badgeNumber && s.badgeNumber.toLowerCase().includes(q)) ||
               (s.subscriberPhone && s.subscriberPhone.includes(q));
      }
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <div class="stats-grid stagger-children">
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-id-card"></i></div>
            <div class="stat-card-value">${activeSubs}</div>
            <div class="stat-card-label">Abonnements Actifs</div>
          </div>
          <div class="stat-card ${expiringSoon > 0 ? 'orange animate-pulse' : 'purple'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="stat-card-value">${expiringSoon}</div>
            <div class="stat-card-label">Expirations proches (7 j)</div>
          </div>
          <div class="stat-card red hover-lift">
            <div class="stat-card-icon"><i class="fas fa-calendar-times"></i></div>
            <div class="stat-card-value">${expiredSubs}</div>
            <div class="stat-card-label">Abonnements Échus</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(monthlyRevenue)}</div>
            <div class="stat-card-label">Revenus Abonnements</div>
          </div>
        </div>

        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'active' ? 'active' : ''}" onclick="Subscriptions.setFilter('active')">
              Actifs (${activeSubs})
            </button>
            <button class="filter-tab ${this.currentFilter === 'expired' ? 'active' : ''}" onclick="Subscriptions.setFilter('expired')">
              Échus (${expiredSubs})
            </button>
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="Subscriptions.setFilter('all')">
              Tous (${totalSubs})
            </button>
          </div>

          <div class="search-input-wrapper" style="flex:1;max-width:300px">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="form-input search-input" placeholder="Chercher abonné, plaque, badge..."
                   value="${this.searchQuery}" oninput="Subscriptions.onSearch(this.value)">
          </div>

          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Subscriptions.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            <button class="btn btn-primary" onclick="Subscriptions.showAddModal()">
              <i class="fas fa-plus"></i> Nouvel abonnement
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-id-card-alt"></i></div>
            <h3>Aucun abonnement trouvé</h3>
            <p>Créez des pass mensuels ou annuels pour vos résidents et clients professionnels.</p>
            <button class="btn btn-primary" onclick="Subscriptions.showAddModal()">
              <i class="fas fa-plus"></i> Créer un abonnement
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Abonné</th>
                  <th>Plaque liée</th>
                  <th>Badge RFID / Pass</th>
                  <th>Formule</th>
                  <th>Validité</th>
                  <th>Tarif</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(sub => {
                  const isActive = sub.status === 'active';
                  const typeLabel = sub.type === 'monthly' ? 'Mensuel' : (sub.type === 'annual' ? 'Annuel' : (sub.type === 'quarterly' ? 'Trimestriel' : 'Pass VIP'));

                  return `
                    <tr>
                      <td>
                        <div style="font-weight:700;color:var(--text-main)">${Utils.escapeHTML(sub.subscriberName)}</div>
                        <small style="color:var(--text-muted)"><i class="fas fa-phone"></i> ${Utils.escapeHTML(sub.subscriberPhone || '-')}</small>
                      </td>
                      <td>
                        <span style="font-family:'Outfit', monospace;font-weight:900;background:#1e272e;color:#fff;padding:3px 8px;border-radius:4px;letter-spacing:1px">
                          ${Utils.escapeHTML(sub.licensePlate)}
                        </span>
                      </td>
                      <td><code>${Utils.escapeHTML(sub.badgeNumber || 'PASS-' + sub.id)}</code></td>
                      <td><span class="badge badge-secondary">${typeLabel}</span></td>
                      <td>
                        <div>${Utils.formatDate(sub.startDate)}</div>
                        <small style="color:${isActive ? 'var(--accent-green)' : 'var(--accent-red)'}">au ${Utils.formatDate(sub.endDate)}</small>
                      </td>
                      <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(sub.price)}</td>
                      <td>
                        <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
                          ${isActive ? 'Actif' : 'Expiré'}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Subscriptions.printPassCard(${sub.id})" data-tooltip="Badge & Carte abonné">
                            <i class="fas fa-id-badge" style="color:var(--accent-cyan)"></i>
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Subscriptions.renewModal(${sub.id})" data-tooltip="Renouveler">
                            <i class="fas fa-redo" style="color:var(--accent-green)"></i>
                          </button>
                          ${Utils.isAdmin() ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Subscriptions.deleteSub(${sub.id})" data-tooltip="Supprimer">
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

  onSearch(query) {
    this.searchQuery = query;
    this.render();
  },

  async showAddModal() {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const formHtml = `
      <form id="add-sub-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label><i class="fas fa-user"></i> Nom de l'abonné ou Société *</label>
          <input type="text" id="sub-name" class="form-input" placeholder="Ex: Cabinet Médical ou Amine Ben Salem" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-phone"></i> Téléphone</label>
          <input type="tel" id="sub-phone" class="form-input" placeholder="+216 ...">
        </div>
        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Email</label>
          <input type="email" id="sub-email" class="form-input" placeholder="abonne@email.com">
        </div>

        <div class="form-group">
          <label><i class="fas fa-car"></i> Plaque d'immatriculation *</label>
          <input type="text" id="sub-plate" class="form-input" placeholder="Ex: 215 TN 9081" required style="text-transform:uppercase;font-weight:700">
        </div>
        <div class="form-group">
          <label><i class="fas fa-barcode"></i> N° Badge / RFID / QR</label>
          <input type="text" id="sub-badge" class="form-input" value="RFID-PASS-${Math.floor(Math.random() * 9000 + 1000)}">
        </div>

        <div class="form-group">
          <label><i class="fas fa-calendar-alt"></i> Date début *</label>
          <input type="date" id="sub-start" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-calendar-check"></i> Date fin *</label>
          <input type="date" id="sub-end" class="form-input" value="${nextMonth}" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-tag"></i> Formule d'abonnement</label>
          <select id="sub-type" class="form-input" onchange="Subscriptions.onTypeChange(this.value)">
            <option value="monthly" selected>Mensuel (1 Mois)</option>
            <option value="quarterly">Trimestriel (3 Mois)</option>
            <option value="annual">Annuel (1 An)</option>
            <option value="vip">Pass VIP Permanent</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-money-bill-wave"></i> Montant Facturé (TND) *</label>
          <input type="number" id="sub-price" class="form-input" value="120" min="0" required>
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-sticky-note"></i> Place réservée / Remarques</label>
          <input type="text" id="sub-notes" class="form-input" placeholder="Ex: Place A10 VIP, badge remis en main propre">
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Créer un Nouvel Abonnement', formHtml, {
      confirmText: 'Enregistrer l\'abonnement',
      size: 'modal-lg'
    });

    if (confirmed) {
      const name = document.getElementById('sub-name').value.trim();
      const phone = document.getElementById('sub-phone').value.trim();
      const email = document.getElementById('sub-email').value.trim();
      const plate = document.getElementById('sub-plate').value.trim().toUpperCase();
      const badge = document.getElementById('sub-badge').value.trim();
      const start = document.getElementById('sub-start').value;
      const end = document.getElementById('sub-end').value;
      const type = document.getElementById('sub-type').value;
      const price = Math.max(0, parseFloat(document.getElementById('sub-price').value) || 0);
      const notes = document.getElementById('sub-notes').value.trim();

      if (!name || !plate || !start || !end) {
        Utils.notify('Veuillez renseigner le nom, la plaque et la période de validité.', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.add('subscriptions', {
        parkingId,
        subscriberName: name,
        subscriberPhone: phone,
        subscriberEmail: email,
        licensePlate: plate,
        badgeNumber: badge,
        startDate: start,
        endDate: end,
        type,
        price,
        status: 'active',
        autoRenew: true,
        notes
      });

      // Add plate to Whitelist for automated VIP barrier opening
      const existingWhitelist = await DB.checkPlateSecurity(parkingId, plate);
      if (!existingWhitelist) {
        await DB.add('plateLists', {
          parkingId,
          licensePlate: plate,
          type: 'whitelist_vip',
          ownerName: name,
          reason: `Abonné Pass ${type}`,
          createdAt: new Date().toISOString()
        });
      }

      await DB.logActivity(parkingId, Auth.user.id, 'Nouvel abonnement', `Abonnement ${name} pour plaque ${plate} (${price} TND)`);
      Utils.notify(`Abonnement créé pour ${name} (${plate}) !`, 'success');
      this.render();
    }
  },

  onTypeChange(val) {
    const startInput = document.getElementById('sub-start');
    const endInput = document.getElementById('sub-end');
    const priceInput = document.getElementById('sub-price');
    if (!startInput || !endInput || !priceInput) return;

    const start = new Date(startInput.value || Date.now());
    let days = 30;
    let price = 120;

    if (val === 'quarterly') {
      days = 90;
      price = 320;
    } else if (val === 'annual') {
      days = 365;
      price = 1100;
    } else if (val === 'vip') {
      days = 365;
      price = 1500;
    }

    const end = new Date(start.getTime() + days * 86400000);
    endInput.value = end.toISOString().split('T')[0];
    priceInput.value = price;
  },

  async renewModal(subId) {
    const sub = await DB.get('subscriptions', subId);
    if (!sub) return;

    const currentEnd = new Date(sub.endDate);
    const newEnd = new Date(Math.max(Date.now(), currentEnd.getTime()) + 30 * 86400000).toISOString().split('T')[0];

    const formHtml = `
      <div style="padding:0.5rem 0">
        <p>Abonné : <strong>${Utils.escapeHTML(sub.subscriberName)}</strong> (${Utils.escapeHTML(sub.licensePlate)})</p>
        <p>Date d'échéance actuelle : <strong>${Utils.formatDate(sub.endDate)}</strong></p>
        <div class="form-group" style="margin-top:1rem">
          <label>Nouvelle date de fin :</label>
          <input type="date" id="renew-end-date" class="form-input" value="${newEnd}">
        </div>
        <div class="form-group" style="margin-top:0.75rem">
          <label>Montant du renouvellement (TND) :</label>
          <input type="number" id="renew-price" class="form-input" min="0" value="${sub.price || 120}">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Renouveler l\'abonnement', formHtml, { confirmText: 'Renouveler' });
    if (confirmed) {
      sub.endDate = document.getElementById('renew-end-date').value;
      sub.price = Math.max(0, parseFloat(document.getElementById('renew-price').value) || sub.price);
      sub.status = 'active';

      await DB.update('subscriptions', sub);
      Utils.notify(`Abonnement prolongé jusqu'au ${Utils.formatDate(sub.endDate)}`, 'success');
      this.render();
    }
  },

  async printPassCard(subId) {
    const sub = await DB.get('subscriptions', subId);
    if (!sub) return;
    const parking = await DB.get('parkings', sub.parkingId);

    const cardHtml = `
      <div style="width:360px;margin:20px auto;border-radius:16px;background:linear-gradient(135deg, #111827, #1f293d);color:#fff;padding:24px;box-shadow:0 12px 32px rgba(0,0,0,0.4);border:2px solid #6c5ce7;font-family:system-ui, sans-serif;position:relative">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
          <div>
            <div style="font-size:16px;font-weight:900;color:#a29bfe;letter-spacing:-0.5px">MON PARKING</div>
            <div style="font-size:11px;color:#8b8fa3">${Utils.escapeHTML(parking?.name || 'Direction Parking')}</div>
          </div>
          <span style="background:#6c5ce7;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:12px;text-transform:uppercase">
            CARTE ABONNÉ
          </span>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:10px;text-transform:uppercase;color:#8b8fa3">TITULAIRE</div>
          <div style="font-size:16px;font-weight:700">${Utils.escapeHTML(sub.subscriberName)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:18px">
          <div>
            <div style="font-size:10px;text-transform:uppercase;color:#8b8fa3">IMMATRICULATION</div>
            <div style="font-family:monospace;font-size:15px;font-weight:900;color:#00cec9;background:rgba(0,0,0,0.5);padding:3px 8px;border-radius:4px">
              ${Utils.escapeHTML(sub.licensePlate)}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;text-transform:uppercase;color:#8b8fa3">VALABLE JUSQU'AU</div>
            <div style="font-size:13px;font-weight:700;color:#55efc4">${Utils.formatDate(sub.endDate)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed rgba(255,255,255,0.2);padding-top:12px">
          <div style="font-family:monospace;font-size:11px;color:#a29bfe">
            ${Utils.escapeHTML(sub.badgeNumber || 'PASS-' + sub.id)}
          </div>
          <div style="font-size:9px;color:#8b8fa3">Accès barrière automatique 24/7</div>
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal(`Badge Abonné : ${Utils.escapeHTML(sub.subscriberName)}`, cardHtml, {
      size: 'modal-md',
      confirmText: 'Imprimer Badge',
      hideCancel: false
    });

    if (confirmed) {
      window.print();
    }
  },

  async deleteSub(subId) {
    const ok = await Utils.confirm('Supprimer cet abonnement ?');
    if (!ok) return;

    await DB.delete('subscriptions', subId);
    Utils.notify('Abonnement supprimé', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const subs = await DB.getSubscriptionsByParking(parkingId);
    const data = subs.map(s => ({
      Abonne: s.subscriberName,
      Telephone: s.subscriberPhone || '',
      Plaque: s.licensePlate,
      Badge: s.badgeNumber || '',
      Formule: s.type,
      DateDebut: s.startDate,
      DateFin: s.endDate,
      Tarif: s.price,
      Statut: s.status
    }));
    Utils.exportToCSV(data, 'abonnements_mon_parking');
  }
};
