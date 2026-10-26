/* ========================================================================
   MON PARKING - Cash Register & Shift Reconciliation (Caisse & Z de Caisse)
   Cash sessions, shift opening/closing, discrepancy tracking, fiscal Z-report
   ======================================================================== */

const CashRegister = {
  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const user = Auth.user;
    const currentSession = await DB.getCurrentCashSession(parkingId, user.id);
    const sessions = (await DB.getCashSessionsByParking(parkingId)).sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    const employees = await DB.getEmployeesByParking(parkingId);

    // Calculate live transactions during this session if open
    let liveTickets = 0;
    let liveRentals = 0;
    let liveSales = 0;

    if (currentSession) {
      const tickets = await DB.getTicketsByParking(parkingId);
      const rentals = await DB.getRentalsByParking(parkingId);
      const sales = await DB.getSalesByParking(parkingId);

      const openTime = new Date(currentSession.openedAt);

      liveTickets = tickets.filter(t => t.status === 'completed' && new Date(t.exitTime) >= openTime)
                           .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

      liveRentals = rentals.filter(r => r.paymentMethod === 'Espèces' && new Date(r.date || r.createdAt) >= openTime)
                           .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

      liveSales = sales.filter(s => s.paymentMethod === 'Espèces' && new Date(s.date || s.createdAt) >= openTime)
                       .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    }

    const startingCash = currentSession ? (currentSession.startingCash || 0) : 0;
    const totalCollectedLive = liveTickets + liveRentals + liveSales;
    const expectedDrawerCash = startingCash + totalCollectedLive;

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Live Cashier Status Header -->
        <div class="dashboard-card animate-fade-up" style="background:${currentSession ? 'linear-gradient(135deg, rgba(0, 206, 201, 0.2), rgba(108, 92, 231, 0.15))' : 'var(--bg-card)'};border:1px solid ${currentSession ? 'var(--accent-cyan)' : 'var(--border-color)'};padding:1.5rem;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1.5rem">
          <div>
            <span class="badge ${currentSession ? 'badge-success animate-pulse' : 'badge-secondary'}" style="font-size:0.8rem;padding:4px 10px;margin-bottom:6px">
              ${currentSession ? 'CAISSE OUVERTE · EN COURS' : 'AUCUNE CAISSE OUVERTE'}
            </span>
            <h2 style="font-size:1.4rem;font-weight:800;color:var(--text-main);margin:0">
              Session de Caisse : ${user.firstName} ${user.lastName}
            </h2>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin:4px 0 0">
              ${currentSession ? `Ouverte depuis le ${Utils.formatDateTime(currentSession.openedAt)}. Tous les encaissements sont rattachés à votre session.` : 'Ouvrez votre caisse avec votre fond de caisse initial pour commencer à encaisser.'}
            </p>
          </div>

          <div style="display:flex;gap:10px;align-items:center">
            ${currentSession ? `
              <button class="btn hover-lift" style="background:var(--accent-red);color:#fff;border-radius:24px;padding:8px 20px;font-weight:700" onclick="CashRegister.showCloseSessionModal(${currentSession.id}, ${expectedDrawerCash})">
                <i class="fas fa-lock"></i> CLÔTURER LA CAISSE (Z)
              </button>
            ` : `
              <button class="btn btn-primary hover-lift" style="border-radius:24px;padding:8px 20px;font-weight:700" onclick="CashRegister.showOpenSessionModal()">
                <i class="fas fa-cash-register"></i> OUVRIR MA CAISSE
              </button>
            `}
          </div>
        </div>

        ${currentSession ? `
          <!-- Active Register Balance Metrics -->
          <div class="stats-grid stagger-children" style="margin-bottom:1.5rem">
            <div class="stat-card blue hover-lift">
              <div class="stat-card-icon"><i class="fas fa-wallet"></i></div>
              <div class="stat-card-value">${Utils.formatCurrency(startingCash)}</div>
              <div class="stat-card-label">Fond de Caisse Initial</div>
            </div>
            <div class="stat-card cyan hover-lift">
              <div class="stat-card-icon"><i class="fas fa-barcode"></i></div>
              <div class="stat-card-value">${Utils.formatCurrency(liveTickets)}</div>
              <div class="stat-card-label">Encaissements Tickets Parking</div>
            </div>
            <div class="stat-card purple hover-lift">
              <div class="stat-card-icon"><i class="fas fa-key"></i></div>
              <div class="stat-card-value">${Utils.formatCurrency(liveRentals + liveSales)}</div>
              <div class="stat-card-label">Ventes & Locations Espèces</div>
            </div>
            <div class="stat-card green hover-lift">
              <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
              <div class="stat-card-value">${Utils.formatCurrency(expectedDrawerCash)}</div>
              <div class="stat-card-label">Total Théorique en Tiroir</div>
            </div>
          </div>
        ` : ''}

        <!-- Past Sessions / Z-Reports History -->
        <div class="table-toolbar">
          <h3><i class="fas fa-history" style="color:var(--primary-light)"></i> Historique des Clôtures & Z de Caisse</h3>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="CashRegister.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
          </div>
        </div>

        ${sessions.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-cash-register"></i></div>
            <h3>Aucune clôture de caisse enregistrée</h3>
            <p>Ouvrez votre première session de caisse pour sécuriser vos encaissements.</p>
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Session</th>
                  <th>Caissier / Opérateur</th>
                  <th>Ouverture</th>
                  <th>Fermeture</th>
                  <th>Fond initial</th>
                  <th>Total Encaissé</th>
                  <th>Montant Réel</th>
                  <th>Écart de Caisse</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.map(s => {
                  const emp = employees.find(e => e.id === s.userId);
                  const isClosed = s.status === 'closed';
                  const disc = s.discrepancy || 0;

                  return `
                    <tr>
                      <td><strong style="color:var(--primary-light)">SESSION-${s.id}</strong></td>
                      <td>
                        <div style="font-weight:700">${emp ? `${Utils.escapeHTML(emp.firstName)} ${Utils.escapeHTML(emp.lastName)}` : 'Caissier #' + s.userId}</div>
                        <small style="color:var(--text-muted)">${Utils.escapeHTML(emp?.role || 'Opérateur')}</small>
                      </td>
                      <td>${Utils.formatDateTime(s.openedAt)}</td>
                      <td>${s.closedAt ? Utils.formatDateTime(s.closedAt) : '<span class="badge badge-warning">En cours</span>'}</td>
                      <td>${Utils.formatCurrency(s.startingCash)}</td>
                      <td style="font-weight:700;color:var(--accent-green)">
                        ${Utils.formatCurrency((s.cashTicketsTotal || 0) + (s.cashRentalsTotal || 0) + (s.cashSalesTotal || 0))}
                      </td>
                      <td><strong>${s.actualCash !== null ? Utils.formatCurrency(s.actualCash) : '-'}</strong></td>
                      <td>
                        ${isClosed ? `
                          <span style="font-weight:800;color:${disc === 0 ? 'var(--accent-green)' : (disc > 0 ? 'var(--accent-cyan)' : 'var(--accent-red)')}">
                            ${disc === 0 ? '0 (Juste)' : (disc > 0 ? '+' + Utils.formatCurrency(disc) : Utils.formatCurrency(disc))}
                          </span>
                        ` : '-'}
                      </td>
                      <td>
                        <span class="badge ${isClosed ? 'badge-info' : 'badge-success animate-pulse'}">
                          ${isClosed ? 'Clôturée' : 'Ouverte'}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group">
                          ${isClosed ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="CashRegister.printZReport(${s.id})" data-tooltip="Imprimer Ticket Z">
                              <i class="fas fa-receipt" style="color:var(--accent-cyan)"></i>
                            </button>
                          ` : `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="CashRegister.showCloseSessionModal(${s.id}, ${expectedDrawerCash})" data-tooltip="Clôturer">
                              <i class="fas fa-lock" style="color:var(--accent-red)"></i>
                            </button>
                          `}
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

  async showOpenSessionModal() {
    const formHtml = `
      <div style="padding:0.5rem 0">
        <div class="form-group">
          <label><i class="fas fa-coins"></i> Fond de caisse initial (Tiroir) * :</label>
          <input type="number" id="open-starting-cash" class="form-input" value="200" min="0" step="10" style="font-size:1.3rem;font-weight:800;color:var(--accent-green)">
          <small style="color:var(--text-muted);display:block;margin-top:4px">Montant de la monnaie disponible dans le tiroir au démarrage du shift.</small>
        </div>
        <div class="form-group" style="margin-top:1rem">
          <label>Notes / Poste :</label>
          <input type="text" id="open-notes" class="form-input" value="Caisse Barrière Principale">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Ouverture de Caisse', formHtml, { confirmText: 'Ouvrir la session' });
    if (confirmed) {
      const startingCash = parseFloat(document.getElementById('open-starting-cash').value) || 0;
      const notes = document.getElementById('open-notes').value.trim();

      const parkingId = Utils.getCurrentParkingId();
      await DB.add('cashSessions', {
        parkingId,
        userId: Auth.user.id,
        openedAt: new Date().toISOString(),
        closedAt: null,
        startingCash,
        cashSalesTotal: 0,
        cashRentalsTotal: 0,
        cashTicketsTotal: 0,
        expectedCash: startingCash,
        actualCash: null,
        discrepancy: null,
        status: 'open',
        notes
      });

      await DB.logActivity(parkingId, Auth.user.id, 'Ouverture caisse', `Session ouverte avec fond initial de ${startingCash} TND`);
      Utils.notify('Session de caisse ouverte !', 'success');
      this.render();
    }
  },

  async showCloseSessionModal(sessionId, expectedTotal) {
    const formHtml = `
      <div style="padding:0.5rem 0">
        <div style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);margin-bottom:1rem;border:1px solid var(--border-color)">
          <div style="font-size:0.8rem;color:var(--text-muted)">MONTANT THÉORIQUE ATTENDU EN TIROIR :</div>
          <div style="font-size:1.8rem;font-weight:900;color:var(--accent-green)">${Utils.formatCurrency(expectedTotal)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">(Fond de caisse initial + Recettes encaissées)</div>
        </div>

        <div class="form-group">
          <label><i class="fas fa-hand-holding-usd"></i> Montant réel compté dans le tiroir (TND) * :</label>
          <input type="number" id="close-actual-cash" class="form-input" value="${expectedTotal}" step="1" min="0" style="font-size:1.3rem;font-weight:800;color:#fff" oninput="CashRegister.calcDiscrepancy(${expectedTotal})">
        </div>

        <div id="discrepancy-display" style="padding:0.75rem;border-radius:8px;background:rgba(0,184,148,0.15);color:var(--accent-green);font-weight:700;margin-top:10px;text-align:center">
          Écart de caisse : 0.00 TND (Conforme)
        </div>

        <div class="form-group" style="margin-top:1rem">
          <label>Justification si écart :</label>
          <input type="text" id="close-notes" class="form-input" placeholder="Comptage validé, aucun écart">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Clôture de Caisse & Z Fiscal', formHtml, { confirmText: 'Valider & Imprimer le Z de Caisse' });
    if (confirmed) {
      const actualCash = parseFloat(document.getElementById('close-actual-cash').value) || 0;
      const discrepancy = actualCash - expectedTotal;
      const notes = document.getElementById('close-notes').value.trim();

      const session = await DB.get('cashSessions', sessionId);
      if (!session) return;

      session.closedAt = new Date().toISOString();
      session.expectedCash = expectedTotal;
      session.actualCash = actualCash;
      session.discrepancy = discrepancy;
      session.status = 'closed';
      session.notes = notes;

      await DB.update('cashSessions', session);

      const parkingId = Utils.getCurrentParkingId();
      await DB.logActivity(parkingId, Auth.user.id, 'Clôture caisse', `Session fermée. Écart: ${discrepancy} TND`);
      Utils.notify('Session de caisse clôturée avec succès !', 'success');

      this.printZReport(sessionId);
      this.render();
    }
  },

  calcDiscrepancy(expected) {
    const actual = parseFloat(document.getElementById('close-actual-cash')?.value) || 0;
    const diff = actual - expected;
    const el = document.getElementById('discrepancy-display');
    if (!el) return;

    if (diff === 0) {
      el.style.background = 'rgba(0,184,148,0.15)';
      el.style.color = 'var(--accent-green)';
      el.textContent = 'Écart de caisse : 0.00 TND (Conforme)';
    } else if (diff > 0) {
      el.style.background = 'rgba(0,206,201,0.15)';
      el.style.color = 'var(--accent-cyan)';
      el.textContent = `Surplus de caisse : +${Utils.formatCurrency(diff)}`;
    } else {
      el.style.background = 'rgba(214,48,49,0.15)';
      el.style.color = 'var(--accent-red)';
      el.textContent = `Manquant de caisse : ${Utils.formatCurrency(diff)}`;
    }
  },

  async printZReport(sessionId) {
    const session = await DB.get('cashSessions', sessionId);
    if (!session) return;
    const parking = await DB.get('parkings', session.parkingId);
    const emp = await DB.get('users', session.userId);

    const reportHtml = `
      <div style="width:280px;margin:10px auto;font-family:monospace;font-size:12px;color:#000;text-align:left;padding:12px">
        <div style="text-align:center">
          <h2 style="margin:0;font-size:18px">MON PARKING</h2>
          <p style="margin:2px 0;font-size:11px">${parking?.name || 'Gestion Automobile'}</p>
          <div style="font-weight:bold;margin:6px 0;padding:4px;border-top:1px solid #000;border-bottom:1px solid #000">
            RAPPORT Z DE CAISSE (SESSION #${session.id})
          </div>
        </div>

        <p style="margin:4px 0"><strong>Caissier :</strong> ${emp ? `${emp.firstName} ${emp.lastName}` : '#' + session.userId}</p>
        <p style="margin:4px 0"><strong>Ouverture :</strong> ${Utils.formatDateTime(session.openedAt)}</p>
        <p style="margin:4px 0"><strong>Fermeture :</strong> ${Utils.formatDateTime(session.closedAt)}</p>
        
        <p style="margin:8px 0 4px;border-top:1px dashed #000">--------------------------------</p>
        <div style="display:flex;justify-content:space-between;margin:3px 0">
          <span>Fond Initial :</span>
          <strong>${Utils.formatCurrency(session.startingCash)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:3px 0">
          <span>Recettes Tickets :</span>
          <strong>${Utils.formatCurrency(session.cashTicketsTotal || 0)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:3px 0">
          <span>Recettes Locations :</span>
          <strong>${Utils.formatCurrency(session.cashRentalsTotal || 0)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:3px 0">
          <span>Recettes Ventes :</span>
          <strong>${Utils.formatCurrency(session.cashSalesTotal || 0)}</strong>
        </div>

        <p style="margin:8px 0 4px;border-top:1px solid #000">--------------------------------</p>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin:4px 0">
          <span>TOTAL THÉORIQUE :</span>
          <span>${Utils.formatCurrency(session.expectedCash)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin:4px 0">
          <span>COMPTÉ RÉEL :</span>
          <span>${Utils.formatCurrency(session.actualCash)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin:4px 0;color:${session.discrepancy === 0 ? '#16a34a' : '#dc2626'}">
          <span>ÉCART DE CAISSE :</span>
          <span>${session.discrepancy >= 0 ? '+' : ''}${Utils.formatCurrency(session.discrepancy || 0)}</span>
        </div>

        <p style="margin:12px 0 6px;border-top:1px dashed #000">--------------------------------</p>
        <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:10px">
          <div>Signature Caissier</div>
          <div>Visa Responsable</div>
        </div>
      </div>
    `;

    Utils.printInvoice(reportHtml);
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const sessions = await DB.getCashSessionsByParking(parkingId);
    const data = sessions.map(s => ({
      SessionID: s.id,
      Caissier: s.userId,
      Ouverture: s.openedAt,
      Fermeture: s.closedAt || '',
      FondInitial: s.startingCash,
      Theorique: s.expectedCash,
      Reel: s.actualCash || '',
      Ecart: s.discrepancy || 0,
      Statut: s.status
    }));
    Utils.exportToCSV(data, 'clotures_caisse_z');
  }
};
