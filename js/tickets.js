/* ========================================================================
   MON PARKING - Tickets & Barrier Operations Module
   Live occupancy, multi-gate simultaneous traffic, lost tickets, overstay alerts,
   and synchronized plate corrections
   ======================================================================== */

const Tickets = {
  currentFilter: 'parked',
  searchQuery: '',
  activeGate: localStorage.getItem('active_gate_id') || 'GATE_ENTRY_1',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const parking = await DB.get('parkings', parkingId);
    const rates = await DB.getRates(parkingId);
    let tickets = await DB.getTicketsByParking(parkingId);
    tickets.sort((a, b) => new Date(b.entryTime || b.createdAt) - new Date(a.entryTime || a.createdAt));

    const now = new Date();
    const totalTickets = tickets.length;
    const parkedTickets = tickets.filter(t => t.status === 'parked');
    const completedTickets = tickets.filter(t => t.status === 'completed');
    const totalCollected = completedTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const capacity = parking?.capacity || 100;
    const occupancyPct = Math.min(100, Math.round((parkedTickets.length / capacity) * 100));

    // Overstay detection (> threshold hours, default 24h)
    const overstayThresholdMs = (rates.overstayThresholdHours || 24) * 60 * 60 * 1000;
    const overstayTickets = parkedTickets.filter(t => (now - new Date(t.entryTime)) > overstayThresholdMs);

    const filtered = tickets.filter(t => {
      if (this.currentFilter === 'parked' && t.status !== 'parked') return false;
      if (this.currentFilter === 'completed' && t.status !== 'completed') return false;
      if (this.currentFilter === 'overstay') {
        if (t.status !== 'parked') return false;
        return (now - new Date(t.entryTime)) > overstayThresholdMs;
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
        const plateClean = (t.licensePlate || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const client = (t.clientName || '').toLowerCase();
        const num = (t.ticketNumber || '').toLowerCase();
        return plateClean.includes(q) || client.includes(q) || num.includes(q);
      }
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Live Parking Capacity & Barrier KPIs -->
        <div class="stats-grid stagger-children">
          <div class="stat-card ${occupancyPct >= 90 ? 'red' : 'cyan'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-parking"></i></div>
            <div class="stat-card-value">${parkedTickets.length} / ${capacity}</div>
            <div class="stat-card-label">Places occupées (${occupancyPct}%) ${occupancyPct >= 90 ? '⚠️ QUASI PLEIN' : ''}</div>
          </div>
          <div class="stat-card ${overstayTickets.length > 0 ? 'red' : 'purple'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-card-value">${overstayTickets.length}</div>
            <div class="stat-card-label">Véhicules Prolongés (> ${rates.overstayThresholdHours || 24}h)</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-sign-in-alt"></i></div>
            <div class="stat-card-value">${totalTickets}</div>
            <div class="stat-card-label">Total flux enregistrés</div>
          </div>
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalCollected)}</div>
            <div class="stat-card-label">Recettes tickets parking</div>
          </div>
        </div>

        <!-- Banner with Multi-Gate Selection & Actions -->
        <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(108, 92, 231, 0.25), rgba(0, 206, 201, 0.2));border:1px solid var(--accent-cyan);padding:1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1.5rem;margin-bottom:1.5rem">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
              <span class="badge badge-primary" style="font-size:0.75rem;padding:3px 8px">LPR · BARRIÈRES SIMULTANÉES</span>
              <span class="badge ${parkedTickets.length >= capacity ? 'badge-danger' : 'badge-success'}" style="font-size:0.75rem;padding:3px 8px">
                ${parkedTickets.length >= capacity ? '🔴 COMPLET' : '🟢 ACCÈS LIBRE (' + (capacity - parkedTickets.length) + ' places)'}
              </span>
            </div>
            <h2 style="font-size:1.35rem;font-weight:800;color:var(--text-main);margin:0">Contrôle d'Accès, Scan Caméra & Régularisations</h2>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin:4px 0 0">
              Gérez les flux simultanés sur les différentes bornes, traitez les tickets perdus et régularisez les sorties.
            </p>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
            <!-- Active Gate Selector -->
            <div style="background:rgba(0,0,0,0.3);padding:4px 8px;border-radius:10px;border:1px solid var(--border-color);display:flex;align-items:center;gap:6px">
              <span style="font-size:0.75rem;color:var(--text-muted)"><i class="fas fa-torii-gate"></i> Borne :</span>
              <select class="form-input" style="width:auto;padding:2px 8px;font-size:0.8rem;border:none;background:transparent;color:var(--accent-cyan);font-weight:700" onchange="Tickets.setGate(this.value)">
                <option value="GATE_ENTRY_1" ${this.activeGate === 'GATE_ENTRY_1' ? 'selected' : ''}>Entrée 1 (Nord)</option>
                <option value="GATE_ENTRY_2" ${this.activeGate === 'GATE_ENTRY_2' ? 'selected' : ''}>Entrée 2 (Sud)</option>
                <option value="GATE_EXIT_1" ${this.activeGate === 'GATE_EXIT_1' ? 'selected' : ''}>Sortie 1 (Centrale)</option>
                <option value="GATE_EXIT_2" ${this.activeGate === 'GATE_EXIT_2' ? 'selected' : ''}>Sortie 2 (VIP)</option>
              </select>
            </div>

            <button class="btn btn-primary" onclick="PlateScanner.openScannerModal()" style="box-shadow:0 0 15px rgba(0,206,201,0.4);border-radius:20px">
              <i class="fas fa-camera"></i> SCAN PLAQUE
            </button>
            <button class="btn btn-ghost" onclick="Tickets.openLostTicketModal()" style="color:#ff7675;border-color:rgba(235,77,75,0.4)">
              <i class="fas fa-question-circle"></i> TICKET PERDU
            </button>
          </div>
        </div>

        <!-- Table Toolbar -->
        <div class="table-toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${this.currentFilter === 'parked' ? 'active' : ''}" onclick="Tickets.setFilter('parked')">
              Stationnés (${parkedTickets.length})
            </button>
            <button class="filter-tab ${this.currentFilter === 'overstay' ? 'active' : ''}" onclick="Tickets.setFilter('overstay')" style="${overstayTickets.length > 0 ? 'color:#ff7675;font-weight:700' : ''}">
              ⚠️ Prolongés >${rates.overstayThresholdHours || 24}h (${overstayTickets.length})
            </button>
            <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" onclick="Tickets.setFilter('completed')">
              Sorties (${completedTickets.length})
            </button>
            <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" onclick="Tickets.setFilter('all')">
              Tous (${totalTickets})
            </button>
          </div>

          <div class="search-input-wrapper" style="flex:1;max-width:280px">
            <i class="fas fa-search search-icon"></i>
            <input type="text" class="form-input search-input" placeholder="Chercher plaque, nom, N°..." 
                   value="${this.searchQuery}" oninput="Tickets.onSearch(this.value)">
          </div>

          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Tickets.exportCSV()">
              <i class="fas fa-file-csv"></i> Export CSV
            </button>
          </div>
        </div>

        <!-- Tickets Table -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-barcode"></i></div>
            <h3>Aucun ticket trouvé</h3>
            <p>Utilisez le scanner de plaque ou émettez un nouveau ticket d'entrée.</p>
            <button class="btn btn-primary" onclick="PlateScanner.openScannerModal()">
              <i class="fas fa-camera"></i> Scanner une plaque
            </button>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Ticket</th>
                  <th>Plaque Immatriculation</th>
                  <th>Conducteur</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Durée</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(t => {
                  const isParked = t.status === 'parked';
                  const entryDate = new Date(t.entryTime);
                  const exitDate = t.exitTime ? new Date(t.exitTime) : now;
                  const diffMinutes = Math.max(1, Math.round((exitDate - entryDate) / (1000 * 60)));
                  const hours = Math.floor(diffMinutes / 60);
                  const mins = diffMinutes % 60;
                  const days = Math.floor(hours / 24);
                  const isOverstay = isParked && diffMinutes > ((rates.overstayThresholdHours || 24) * 60);
                  const durStr = `${days > 0 ? days + 'j ' : ''}${hours % 24 > 0 ? (hours % 24) + 'h ' : ''}${mins}min`;

                  return `
                    <tr style="${isOverstay ? 'background:rgba(235,77,75,0.06)' : ''}">
                      <td>
                        <strong style="color:var(--primary-light)">${Utils.escapeHTML(t.ticketNumber)}</strong>
                        ${t.isLostTicket ? `<span class="badge badge-danger" style="display:block;font-size:0.65rem;margin-top:2px">Perte Déclarée</span>` : ''}
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:6px">
                          <span style="font-family:'Outfit', monospace;font-weight:900;background:#1e272e;color:#fff;padding:3px 8px;border-radius:6px;letter-spacing:1px;border:1px solid rgba(255,255,255,0.2)">
                            ${Utils.escapeHTML(t.licensePlate)}
                          </span>
                          ${t.plateCorrected ? `
                            <span class="badge badge-warning" style="font-size:0.65rem;padding:2px 5px" title="Plaque modifiée: ${Utils.escapeHTML(t.plateCorrectionReason || '')}">
                              Corrigée
                            </span>
                          ` : ''}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight:600">${Utils.escapeHTML(t.clientName || 'Visiteur')}</div>
                        <small style="color:var(--text-muted)">${Utils.escapeHTML(t.clientPhone || '-')}</small>
                      </td>
                      <td>${Utils.formatDateTime(t.entryTime)}</td>
                      <td>${t.exitTime ? Utils.formatDateTime(t.exitTime) : '<span style="color:var(--accent-cyan);font-weight:600">En cours...</span>'}</td>
                      <td>
                        <span class="badge ${isOverstay ? 'badge-danger animate-pulse' : (isParked ? 'badge-warning' : 'badge-secondary')}">
                          ${isOverstay ? '⚠️ ' : ''}${durStr}
                        </span>
                      </td>
                      <td style="font-weight:700;color:${isParked ? 'var(--text-muted)' : 'var(--accent-green)'}">
                        ${t.totalAmount !== null ? Utils.formatCurrency(t.totalAmount) : '-'}
                      </td>
                      <td>
                        <span class="badge ${isParked ? (isOverstay ? 'badge-danger' : 'badge-success') : 'badge-info'}">
                          ${isParked ? (isOverstay ? 'Prolongé' : 'Stationné') : 'Sorti'}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group">
                          ${isParked ? `
                            <button class="btn btn-primary btn-sm" onclick="PlateScanner.openExitTicketModal(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="Encaisser la sortie">
                              <i class="fas fa-sign-out-alt"></i> Sortie
                            </button>
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Tickets.openPlateCorrectionModal(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="Corriger la plaque OCR">
                              <i class="fas fa-edit" style="color:var(--accent-cyan)"></i>
                            </button>
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.printEntryTicket(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="Réimprimer ticket">
                              <i class="fas fa-print"></i>
                            </button>
                          ` : `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.printExitReceipt(${JSON.stringify(t).replace(/"/g, '&quot;')})" title="Imprimer reçu">
                              <i class="fas fa-receipt"></i>
                            </button>
                          `}
                          ${Utils.isAdmin() ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Tickets.deleteTicket(${t.id})" title="Supprimer">
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

  setGate(gateId) {
    this.activeGate = gateId;
    localStorage.setItem('active_gate_id', gateId);
    Utils.notify(`Borne active sélectionnée : ${gateId}`, 'info', 2000);
  },

  async openLostTicketModal() {
    const parkingId = Utils.getCurrentParkingId();
    const rates = await DB.getRates(parkingId);
    const lostFee = rates.lostTicketFee || 30.0;

    const modalHtml = `
      <form id="lost-ticket-form" class="modal-form-grid" onsubmit="return false;">
        <div class="span-2" style="background:rgba(235,77,75,0.15);border:1px solid var(--accent-red);padding:1rem;border-radius:10px;text-align:center">
          <div style="font-size:2rem;color:var(--accent-red);margin-bottom:4px"><i class="fas fa-question-circle"></i></div>
          <h4 style="margin:0;color:var(--accent-red)">Déclaration Officielle de Ticket Perdu</h4>
          <p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-secondary)">
            En l'absence de ticket d'entrée physique, le forfait de perte réglementaire est appliqué après identification du conducteur.
          </p>
        </div>

        <div class="form-group span-2">
          <label>Plaque d'immatriculation constatée sur le véhicule *</label>
          <input type="text" id="lost-plate" class="form-input" placeholder="Ex: 185 TN 4001" required style="font-family:'Outfit', monospace;font-weight:900;font-size:1.2rem;letter-spacing:2px">
        </div>

        <div class="form-group">
          <label>Nom complet du conducteur / déclarant *</label>
          <input type="text" id="lost-client-name" class="form-input" placeholder="Nom et prénom" required>
        </div>

        <div class="form-group">
          <label>N° Téléphone ou CIN / Pièce d'identité *</label>
          <input type="text" id="lost-client-id" class="form-input" placeholder="+216 ... ou N° CIN" required>
        </div>

        <div class="form-group">
          <label>Date et heure approximative d'entrée</label>
          <input type="datetime-local" id="lost-entry-time" class="form-input" value="${new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 16)}">
        </div>

        <div class="form-group">
          <label>Mode d'encaissement</label>
          <select id="lost-payment-method" class="form-input">
            <option value="Espèces" selected>Espèces</option>
            <option value="Carte bancaire">Carte bancaire</option>
            <option value="Chèque">Chèque</option>
          </select>
        </div>

        <div class="span-2" style="background:rgba(0,0,0,0.25);border:1px solid var(--border-color);padding:1rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Forfait Réglementaire Perte de Ticket :</div>
            <strong style="color:var(--accent-cyan)">Tarif officiel approuvé</strong>
          </div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-red)">
            ${Utils.formatCurrency(lostFee)}
          </div>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Procédure Ticket Perdu', modalHtml, {
      confirmText: 'Encaisser Forfait & Libérer Barrière',
      size: 'modal-md'
    });

    if (confirmed) {
      const plate = document.getElementById('lost-plate')?.value.trim().toUpperCase();
      const clientName = document.getElementById('lost-client-name')?.value.trim();
      const clientId = document.getElementById('lost-client-id')?.value.trim();
      const entryTime = document.getElementById('lost-entry-time')?.value || new Date().toISOString();
      const paymentMethod = document.getElementById('lost-payment-method')?.value || 'Espèces';

      if (!plate || !clientName) {
        Utils.notify('La plaque et le nom du déclarant sont obligatoires !', 'error');
        return;
      }

      const ticketNumber = await DB.generateTicketNumber(parkingId);
      const now = new Date();

      const ticket = {
        parkingId,
        ticketNumber,
        licensePlate: plate,
        clientName: `${clientName} (CIN: ${clientId || '-'})`,
        clientPhone: clientId,
        entryTime: new Date(entryTime).toISOString(),
        exitTime: now.toISOString(),
        durationMinutes: 0,
        totalAmount: lostFee,
        paymentMethod,
        status: 'completed',
        isLostTicket: true,
        createdAt: now.toISOString()
      };

      const ticketId = await DB.add('parkingTickets', ticket);
      ticket.id = ticketId;

      await DB.logAudit(parkingId, 'LOST_TICKET_SETTLED', `Ticket perdu régularisé pour ${plate} (${clientName}) · ${lostFee} DT encaissés`, { ticketId, plate, clientName, lostFee, paymentMethod });

      Sync.broadcast('TICKET_EXITED', { licensePlate: plate, amount: lostFee });
      Utils.notify(`Ticket perdu régularisé avec succès pour ${plate} !`, 'success');

      PlateScanner.printExitReceipt(ticket);
      this.render();
    }
  },

  async openPlateCorrectionModal(ticket) {
    const modalHtml = `
      <form id="plate-correction-form" class="modal-form-grid" onsubmit="return false;">
        <div class="span-2" style="background:rgba(0,206,201,0.1);border:1px solid var(--accent-cyan);padding:0.75rem;border-radius:8px">
          <div style="font-size:0.8rem;color:var(--text-muted)">Ticket N° <strong>${ticket.ticketNumber}</strong></div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Plaque actuellement enregistrée par la caméra OCR :</div>
          <div style="font-family:'Outfit', monospace;font-size:1.6rem;font-weight:900;color:var(--accent-cyan)">
            ${ticket.licensePlate}
          </div>
        </div>

        <div class="form-group span-2">
          <label>Nouvelle plaque d'immatriculation exacte *</label>
          <input type="text" id="correction-new-plate" class="form-input" value="${ticket.licensePlate}" required style="font-family:'Outfit', monospace;font-weight:900;font-size:1.3rem;letter-spacing:2px">
        </div>

        <div class="form-group span-2">
          <label>Motif de la rectification (Audit obligatoire) *</label>
          <select id="correction-reason-select" class="form-input" onchange="document.getElementById('correction-reason-text').value = this.value">
            <option value="Erreur de lecture OCR caméra (Caractères confus)">Erreur de lecture OCR caméra (Caractères confus)</option>
            <option value="Plaque sale ou abîmée">Plaque sale ou abîmée</option>
            <option value="Plaque étrangère mal reconnue">Plaque étrangère mal reconnue</option>
            <option value="Autre motif">Autre motif...</option>
          </select>
          <input type="text" id="correction-reason-text" class="form-input" style="margin-top:6px" value="Erreur de lecture OCR caméra (Caractères confus)" placeholder="Précisez le motif exact" required>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Rectifier la Plaque d\'Immatriculation', modalHtml, {
      confirmText: 'Valider & Synchroniser la Correction',
      size: 'modal-md'
    });

    if (confirmed) {
      const newPlate = document.getElementById('correction-new-plate')?.value.trim().toUpperCase();
      const reason = document.getElementById('correction-reason-text')?.value.trim() || 'Correction OCR';

      if (!newPlate || newPlate === ticket.licensePlate) {
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.correctPlate(parkingId, ticket.id, ticket.licensePlate, newPlate, reason);

      Sync.broadcast('PLATE_CORRECTED', { ticketId: ticket.id, oldPlate: ticket.licensePlate, newPlate });
      Utils.notify(`Plaque rectifiée avec succès : "${ticket.licensePlate}" ➔ "${newPlate}"`, 'success');
      this.render();
    }
  },

  async deleteTicket(ticketId) {
    const ok = await Utils.confirm('Supprimer cet enregistrement de ticket ?');
    if (!ok) return;

    const parkingId = Utils.getCurrentParkingId();
    await DB.logAudit(parkingId, 'TICKET_DELETE', `Suppression manuelle du ticket #${ticketId}`, { ticketId });
    await DB.delete('parkingTickets', ticketId);
    Utils.notify('Ticket supprimé', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const tickets = await DB.getTicketsByParking(parkingId);
    const data = tickets.map(t => ({
      NumeroTicket: t.ticketNumber,
      Plaque: t.licensePlate,
      Conducteur: t.clientName,
      Telephone: t.clientPhone,
      Entree: t.entryTime,
      Sortie: t.exitTime || '',
      DureeMinutes: t.durationMinutes || '',
      Montant: t.totalAmount || '',
      Statut: t.status,
      Paiement: t.paymentMethod || '',
      TicketPerdu: t.isLostTicket ? 'OUI' : 'NON'
    }));
    Utils.exportToCSV(data, 'tickets_stationnement');
  }
};

window.Tickets = Tickets;
