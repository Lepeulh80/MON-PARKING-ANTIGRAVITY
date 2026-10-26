/* ========================================================================
   MON PARKING - Reports & Attendance Analytics Module
   Hourly occupancy heatmaps, cashier reconciliation, printable daily report (RJE)
   ======================================================================== */

const Reports = {
  currentPeriod: 'today', // 'today' | 'week' | 'month'

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const parking = await DB.get('parkings', parkingId);
    const tickets = await DB.getTicketsByParking(parkingId);
    const cashSessions = await DB.getCashSessionsByParking(parkingId);
    const subscriptions = await DB.getSubscriptionsByParking(parkingId);
    const employees = await DB.getEmployeesByParking(parkingId);

    // Filter tickets by selected period
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let periodStart = startOfToday;
    if (this.currentPeriod === 'week') periodStart = startOfWeek;
    if (this.currentPeriod === 'month') periodStart = startOfMonth;

    const periodTickets = tickets.filter(t => new Date(t.entryTime || t.createdAt) >= periodStart);
    const completedTickets = periodTickets.filter(t => t.status === 'completed');
    const parkedTickets = periodTickets.filter(t => t.status === 'parked');

    // Revenue calculations
    const ticketsRevenue = completedTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const subsRevenue = activeSubs.reduce((sum, s) => sum + (s.price || 0), 0);

    // Payment methods breakdown
    const paymentMethods = { 'Espèces': 0, 'Carte bancaire': 0, 'Abonné / Pass': 0, 'Gratuit': 0 };
    completedTickets.forEach(t => {
      const pm = t.paymentMethod || 'Espèces';
      paymentMethods[pm] = (paymentMethods[pm] || 0) + (t.totalAmount || 0);
    });

    // Durations distribution
    const durationBuckets = { '<15min (Gratuit)': 0, '15m-1h': 0, '1h-4h': 0, '4h-24h': 0, '>24h (Prolongé)': 0 };
    completedTickets.forEach(t => {
      const mins = t.durationMinutes || 0;
      if (mins <= 15) durationBuckets['<15min (Gratuit)']++;
      else if (mins <= 60) durationBuckets['15m-1h']++;
      else if (mins <= 240) durationBuckets['1h-4h']++;
      else if (mins <= 1440) durationBuckets['4h-24h']++;
      else durationBuckets['>24h (Prolongé)']++;
    });

    // Hourly traffic distribution (0h to 23h)
    const hourlyTraffic = Array(24).fill(0);
    periodTickets.forEach(t => {
      const h = new Date(t.entryTime || t.createdAt).getHours();
      hourlyTraffic[h]++;
    });
    const maxHourTraffic = Math.max(...hourlyTraffic, 1);

    // Turnover calculation (rotation des places)
    const capacity = parking?.capacity || 100;
    const turnoverRate = ((periodTickets.length / capacity)).toFixed(2);
    const avgDurationMins = completedTickets.length > 0 
      ? Math.round(completedTickets.reduce((sum, t) => sum + (t.durationMinutes || 0), 0) / completedTickets.length)
      : 0;
    const avgDurationHours = Math.floor(avgDurationMins / 60);
    const avgDurationRemMins = avgDurationMins % 60;
    const avgDurationStr = `${avgDurationHours > 0 ? avgDurationHours + 'h ' : ''}${avgDurationRemMins}min`;

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Header & Period Filter -->
        <div class="table-toolbar" style="margin-bottom:1.5rem">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;color:var(--text-main);margin:0">
              <i class="fas fa-chart-line" style="color:var(--accent-cyan);margin-right:8px"></i> Rapports d'Exploitation & Fréquentation
            </h2>
            <p style="color:var(--text-muted);margin:4px 0 0">
              Analyse des flux horaires, rapprochement de caisse et indicateurs de performance
            </p>
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div class="filter-tabs">
              <button class="filter-tab ${this.currentPeriod === 'today' ? 'active' : ''}" onclick="Reports.setPeriod('today')">Aujourd'hui</button>
              <button class="filter-tab ${this.currentPeriod === 'week' ? 'active' : ''}" onclick="Reports.setPeriod('week')">7 derniers jours</button>
              <button class="filter-tab ${this.currentPeriod === 'month' ? 'active' : ''}" onclick="Reports.setPeriod('month')">Ce mois-ci</button>
            </div>
            <button class="btn btn-primary hover-lift" onclick="Reports.printDailyReport()">
              <i class="fas fa-print"></i> Imprimer Rapport Journalier (RJE)
            </button>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="stats-grid stagger-children">
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-car-side"></i></div>
            <div class="stat-card-value">${periodTickets.length}</div>
            <div class="stat-card-label">Véhicules accueillis</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-coins"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(ticketsRevenue)}</div>
            <div class="stat-card-label">Recettes tickets période</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-sync-alt"></i></div>
            <div class="stat-card-value">${turnoverRate}x</div>
            <div class="stat-card-label">Taux de rotation (${capacity} places)</div>
          </div>
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-stopwatch"></i></div>
            <div class="stat-card-value">${avgDurationStr}</div>
            <div class="stat-card-label">Durée moyenne stationnement</div>
          </div>
        </div>

        <!-- Hourly Traffic Bar Chart (Heures de pointe) -->
        <div class="dashboard-card animate-fade-up" style="margin-bottom:1.5rem">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <h3><i class="fas fa-chart-bar" style="color:var(--accent-cyan)"></i> Fréquentation par Tranche Horaire (Heures de pointe)</h3>
            <span style="font-size:0.8rem;color:var(--text-muted)">Entrées par heure (00h - 23h)</span>
          </div>

          <div style="padding:1.5rem 0 0.5rem">
            <div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding:0 10px;border-bottom:1px solid var(--border-color)">
              ${hourlyTraffic.map((count, hour) => {
                const heightPct = Math.max(6, Math.round((count / maxHourTraffic) * 100));
                const isPeak = (hour >= 8 && hour <= 9) || (hour >= 17 && hour <= 19);
                const bgGradient = isPeak 
                  ? 'linear-gradient(180deg, #ff7675, #d63031)' 
                  : 'linear-gradient(180deg, #00cec9, #0984e3)';
                return `
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end" title="${hour}h : ${count} entrée(s)">
                    <div style="font-size:0.7rem;font-weight:700;color:${count > 0 ? 'var(--text-main)' : 'transparent'};margin-bottom:4px">
                      ${count}
                    </div>
                    <div style="width:100%;min-width:8px;height:${heightPct}%;background:${bgGradient};border-radius:4px 4px 0 0;transition:all 0.4s ease"></div>
                    <div style="font-size:0.65rem;color:var(--text-muted);margin-top:6px">
                      ${hour}h
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);padding:8px 10px 0">
              <span style="display:inline-flex;align-items:center;gap:6px">
                <span style="width:10px;height:10px;border-radius:2px;background:#00cec9;display:inline-block"></span> Flux Standard
              </span>
              <span style="display:inline-flex;align-items:center;gap:6px">
                <span style="width:10px;height:10px;border-radius:2px;background:#ff7675;display:inline-block"></span> Heures de Pointe (Matin 8h-9h & Soir 17h-19h)
              </span>
            </div>
          </div>
        </div>

        <!-- 2 Columns: Duration Distribution & Cash Reconciliation -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <!-- Durations Distribution -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-hourglass-half" style="color:var(--accent-purple)"></i> Ventilation par Durée de Stationnement</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;padding-top:1rem">
              ${Object.entries(durationBuckets).map(([label, count]) => {
                const total = completedTickets.length || 1;
                const pct = Math.round((count / total) * 100);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
                      <span style="font-weight:600">${label}</span>
                      <span style="color:var(--text-muted)">${count} véhicules (${pct}%)</span>
                    </div>
                    <div style="width:100%;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
                      <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--accent-cyan),var(--primary));border-radius:4px"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Cash Reconciliation & Shift Overview -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-calculator" style="color:var(--accent-green)"></i> Rapprochement Financier des Encaissements</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;padding-top:1rem">
              <div style="background:var(--bg-glass);padding:1rem;border-radius:10px;border:1px solid var(--border-color)">
                <div style="font-size:0.8rem;color:var(--text-muted)">Répartition par Moyen de Paiement</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:8px">
                  <div>
                    <small style="color:var(--text-muted)">Espèces</small>
                    <div style="font-weight:700;font-size:1.1rem;color:var(--accent-green)">${Utils.formatCurrency(paymentMethods['Espèces'])}</div>
                  </div>
                  <div>
                    <small style="color:var(--text-muted)">Carte Bancaire</small>
                    <div style="font-weight:700;font-size:1.1rem;color:var(--accent-cyan)">${Utils.formatCurrency(paymentMethods['Carte bancaire'])}</div>
                  </div>
                  <div>
                    <small style="color:var(--text-muted)">Pass Abonnés VIP</small>
                    <div style="font-weight:700;font-size:1.1rem;color:var(--accent-purple)">${Utils.formatCurrency(paymentMethods['Abonné / Pass'])}</div>
                  </div>
                  <div>
                    <small style="color:var(--text-muted)">Gratuités / Dérogations</small>
                    <div style="font-weight:700;font-size:1.1rem;color:var(--text-muted)">${Utils.formatCurrency(paymentMethods['Gratuit'])}</div>
                  </div>
                </div>
              </div>

              <!-- Sessions de Caisse Rapprochement -->
              <div>
                <h4 style="margin:0 0 8px;font-size:0.9rem;color:var(--text-main)">Dernières Clôtures de Caisse (Z)</h4>
                ${cashSessions.slice(0, 3).map(s => `
                  <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;border:1px solid var(--border-color)">
                    <div>
                      <strong>${s.notes || 'Session Caisse'}</strong>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${Utils.formatDateTime(s.openedAt)}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(s.expectedCash || s.startingCash)}</div>
                      <span class="badge ${s.status === 'open' ? 'badge-warning' : 'badge-success'}" style="font-size:0.7rem">
                        ${s.status === 'open' ? 'En cours' : 'Clôturée'}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setPeriod(period) {
    this.currentPeriod = period;
    this.render();
  },

  async printDailyReport() {
    const parkingId = Utils.getCurrentParkingId();
    const parking = await DB.get('parkings', parkingId);
    const tickets = await DB.getTicketsByParking(parkingId);
    const completed = tickets.filter(t => t.status === 'completed');
    const totalCollected = completed.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const now = new Date();

    const printWin = window.open('', '_blank', 'width=780,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Journalier d'Exploitation (RJE)</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #222; font-size: 13px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
          .title { font-size: 16px; font-weight: 700; margin: 8px 0 4px; text-transform: uppercase; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .meta-table td { padding: 6px; border-bottom: 1px solid #ddd; }
          .kpi-grid { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
          .kpi-box { flex: 1; border: 1px solid #222; padding: 10px; text-align: center; border-radius: 4px; }
          .kpi-val { font-size: 18px; font-weight: 800; margin-top: 4px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          .data-table th { background: #f1f2f6; font-weight: 700; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .sig-box { width: 220px; border-top: 1px dashed #222; text-align: center; padding-top: 6px; font-size: 11px; }
          @media print { body { margin: 15mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">${parking?.name || 'MON PARKING'}</div>
          <div class="title">RAPPORT JOURNALIER D'EXPLOITATION (RJE)</div>
          <div style="font-size:12px;color:#555">Édité le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')} · N° RJE-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}</div>
        </div>

        <table class="meta-table">
          <tr>
            <td><strong>Établissement :</strong> ${parking?.name || 'MON PARKING'}</td>
            <td><strong>Matricule Fiscal :</strong> ${parking?.taxId || '1234567/A/M/000'}</td>
          </tr>
          <tr>
            <td><strong>Adresse :</strong> ${parking?.address || 'Tunis'}</td>
            <td><strong>Capacité Totale :</strong> ${parking?.capacity || 100} emplacements</td>
          </tr>
        </table>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div style="font-size:11px;color:#666">ENTRÉES DU JOUR</div>
            <div class="kpi-val">${tickets.length}</div>
          </div>
          <div class="kpi-box">
            <div style="font-size:11px;color:#666">SORTIES CLÔTURÉES</div>
            <div class="kpi-val">${completed.length}</div>
          </div>
          <div class="kpi-box">
            <div style="font-size:11px;color:#666">RECETTES GLOBALES</div>
            <div class="kpi-val">${Utils.formatCurrency(totalCollected)}</div>
          </div>
        </div>

        <h4 style="margin:0 0 8px;text-transform:uppercase">Extrait des Dernières Sorties Encaissées</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>N° Ticket</th>
              <th>Plaque</th>
              <th>Entrée</th>
              <th>Sortie</th>
              <th>Durée</th>
              <th>Montant</th>
              <th>Paiement</th>
            </tr>
          </thead>
          <tbody>
            ${completed.slice(0, 15).map(t => `
              <tr>
                <td><strong>${t.ticketNumber}</strong></td>
                <td>${t.licensePlate}</td>
                <td>${Utils.formatDateTime(t.entryTime)}</td>
                <td>${Utils.formatDateTime(t.exitTime)}</td>
                <td>${t.durationMinutes || 0} min</td>
                <td style="font-weight:700">${Utils.formatCurrency(t.totalAmount)}</td>
                <td>${t.paymentMethod || 'Espèces'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <strong>Le Chef de Poste / Caissier</strong><br>
            Visa & Émargement
          </div>
          <div class="sig-box">
            <strong>La Direction du Parking</strong><br>
            Cachet Officiel & Approbation
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }
};

window.Reports = Reports;
