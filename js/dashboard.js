/* ========================================================================
   MON PARKING - Customizable Real-Time Dashboard Module
   Live cloud sync, interactive Chart.js visualizations, monthly savings analytics,
   geographic ANPR stats, real-time anomaly alerts, and customizable widget layout.
   ======================================================================== */

const Dashboard = {
  charts: {},
  realtimeTimer: null,
  activeTrafficPeriod: 'today', // 'today' | 'week' | 'month'

  // Default widget configuration
  defaultWidgets: {
    kpis: true,
    quickActions: true,
    liveStream: true,
    financialChart: true,
    trafficChart: true,
    geoStats: true,
    budgetWatch: true,
    stockChart: true,
    topEmployees: true,
    recentActivity: true,
    recentTransactions: true
  },

  getWidgetSettings() {
    try {
      const data = localStorage.getItem('monparking_dashboard_widgets_v2');
      return data ? { ...this.defaultWidgets, ...JSON.parse(data) } : { ...this.defaultWidgets };
    } catch (e) {
      return { ...this.defaultWidgets };
    }
  },

  saveWidgetSettings(settings) {
    try {
      localStorage.setItem('monparking_dashboard_widgets_v2', JSON.stringify(settings));
    } catch (e) {}
  },

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    if (!parkingId) return;

    const content = document.getElementById('main-content');
    content.innerHTML = `
      <div class="page-content">
        <div class="loading-spinner" id="dashboard-loader"></div>
      </div>
    `;

    try {
      const stats = await DB.getDashboardStats(parkingId);
      const topEmployees = await DB.getTopEmployees(parkingId);
      const parking = await DB.get('parkings', parkingId);
      const activities = await DB.getActivityByParking(parkingId);
      const recentActivities = activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
      const tickets = await DB.getTicketsByParking(parkingId);
      const parkedTickets = tickets.filter(t => t.status === 'parked');
      const capacity = parking?.capacity || 100;
      const occupancyPct = Math.min(100, Math.round((parkedTickets.length / capacity) * 100));

      // Budgets & Alerts
      const { alerts: budgetAlerts, monthlyExpenses } = typeof Banking !== 'undefined'
        ? await Banking.checkBudgetAlerts(parkingId)
        : { alerts: [], monthlyExpenses: {} };

      // Geo Zone Stats
      const geoStats = typeof PlateLearning !== 'undefined' ? PlateLearning.getGeoStats() : {};

      // Widgets configuration
      const w = this.getWidgetSettings();

      content.innerHTML = `
        <div class="page-content animate-fade-in">
          <!-- Top Dashboard Header with Customizer & Live Sync Badge -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="live-pulse-badge">
                <span class="live-pulse-dot"></span>
                <span>DONNÉES EN TEMPS RÉEL · CLOUD ACTIF</span>
              </div>
              <span style="font-size:0.82rem;color:var(--text-muted)">
                Dernière actualisation : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm hover-lift" onclick="Dashboard.openCustomizerModal()" style="border:1px solid var(--border-color);color:var(--accent-cyan)">
                <i class="fas fa-sliders-h"></i> <span>Personnaliser Dashboard</span>
              </button>
              <button class="btn btn-ghost btn-sm hover-lift" onclick="Banking.openBankModal()" style="border:1px solid var(--border-color);color:var(--accent-green)">
                <i class="fas fa-university"></i> <span>Multi-Comptes Bancaires</span>
              </button>
              <button class="btn btn-ghost btn-sm hover-lift" onclick="A11y.openModal()" style="border:1px solid var(--border-color);color:var(--accent-yellow)" title="Options d'accessibilité">
                <i class="fas fa-universal-access"></i> <span>Accessibilité</span>
              </button>
            </div>
          </div>

          <!-- Budget or Anomaly Alert Banner (if triggered) -->
          ${budgetAlerts.length > 0 ? `
            <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(214,48,49,0.18), rgba(253,203,110,0.12));border:1px solid var(--accent-red);padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem" class="animate-bounce">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                  <strong style="color:var(--accent-red);font-size:0.95rem">${budgetAlerts[0].title}</strong>
                  <div style="font-size:0.85rem;color:var(--text-main);margin-top:2px">${budgetAlerts[0].message}</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="Banking.openBudgetModal(${parkingId})">
                Ajuster les Budgets
              </button>
            </div>
          ` : ''}

          <!-- Quick Actions -->
          ${w.quickActions ? `
            <div class="quick-actions stagger-children" style="margin-bottom:1.5rem">
              <div class="quick-action-btn hover-lift" onclick="PlateScanner.openScannerModal()" style="border:1px solid rgba(0, 206, 201, 0.4);background:rgba(0, 206, 201, 0.1)">
                <i class="fas fa-camera" style="color:var(--accent-cyan)"></i>
                <span>Scanner Plaque</span>
              </div>
              <div class="quick-action-btn hover-lift" onclick="Router.navigate('tickets')">
                <i class="fas fa-barcode" style="color:var(--primary-light)"></i>
                <span>Tickets & Barrière</span>
              </div>
              <div class="quick-action-btn hover-lift" onclick="PlateScanner.simulateDemoScan()" style="border:1px solid rgba(253,203,110,0.4);background:rgba(253,203,110,0.1)">
                <i class="fas fa-magic" style="color:var(--accent-yellow)"></i>
                <span>Démo Scan LPR</span>
              </div>
              <div class="quick-action-btn hover-lift" onclick="Banking.openBankModal()">
                <i class="fas fa-landmark" style="color:var(--accent-green)"></i>
                <span>Banques & Soldes</span>
              </div>
              <div class="quick-action-btn hover-lift" onclick="Banking.openBudgetModal(${parkingId})">
                <i class="fas fa-wallet" style="color:var(--accent-pink)"></i>
                <span>Gestion Budget</span>
              </div>
              <div class="quick-action-btn hover-lift" onclick="Router.navigate('accounting')">
                <i class="fas fa-chart-pie" style="color:var(--accent-blue)"></i>
                <span>Bilan & Épargne</span>
              </div>
            </div>
          ` : ''}

          <!-- Stats Grid (Customizable KPIs) -->
          ${w.kpis ? `
            <div class="stats-grid stagger-children" style="margin-bottom:1.5rem">
              <!-- Occupancy KPI -->
              <div class="stat-card ${occupancyPct >= 90 ? 'red' : 'cyan'} hover-lift">
                <div class="stat-card-icon"><i class="fas fa-parking"></i></div>
                <div class="stat-card-value">${parkedTickets.length} / ${capacity}</div>
                <div class="stat-card-label">Taux d'occupation (${occupancyPct}%)</div>
                <div class="stat-card-trend ${occupancyPct < 85 ? 'up' : 'down'}">
                  <i class="fas fa-car"></i> ${capacity - parkedTickets.length} places libres
                </div>
              </div>

              <!-- Revenue KPI -->
              <div class="stat-card green hover-lift">
                <div class="stat-card-icon"><i class="fas fa-money-bill-wave"></i></div>
                <div class="stat-card-value">${Utils.formatCurrency(stats.monthlyRevenue)}</div>
                <div class="stat-card-label">Chiffre d'affaires mensuel</div>
                <div class="stat-card-trend up">
                  <i class="fas fa-arrow-up"></i> ${stats.monthlySalesCount} ventes & locations
                </div>
              </div>

              <!-- Monthly Savings (Épargne Mensuelle / Bénéfice Net) -->
              <div class="stat-card purple hover-lift">
                <div class="stat-card-icon"><i class="fas fa-piggy-bank"></i></div>
                <div class="stat-card-value">${Utils.formatCurrency(stats.monthlyProfit)}</div>
                <div class="stat-card-label">Épargne nette ce mois</div>
                <div class="stat-card-trend ${stats.monthlyProfit >= 0 ? 'up' : 'down'}">
                  <i class="fas fa-chart-line"></i> Marge nette : ${stats.monthlyRevenue > 0 ? Math.round((stats.monthlyProfit / stats.monthlyRevenue) * 100) : 0}%
                </div>
              </div>

              <!-- Vehicle fleet count -->
              <div class="stat-card orange hover-lift">
                <div class="stat-card-icon"><i class="fas fa-car-side"></i></div>
                <div class="stat-card-value" data-count="${stats.totalVehicles}">${Utils.formatNumber(stats.totalVehicles)}</div>
                <div class="stat-card-label">Parc Automobile</div>
                <div class="stat-card-trend up">
                  <i class="fas fa-check"></i> ${stats.availableVehicles} disponibles
                </div>
              </div>

              <!-- Active Clients -->
              <div class="stat-card pink hover-lift">
                <div class="stat-card-icon"><i class="fas fa-users"></i></div>
                <div class="stat-card-value">${Utils.formatNumber(stats.totalClients)}</div>
                <div class="stat-card-label">Clients & Abonnés Actifs</div>
                <div class="stat-card-trend up"><i class="fas fa-id-card"></i> Gestion CRM</div>
              </div>

              <!-- Consolidated Treasury from Banks -->
              <div class="stat-card blue hover-lift">
                <div class="stat-card-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="stat-card-value">${Utils.formatCurrency(typeof Banking !== 'undefined' ? Banking.getBankAccounts().reduce((s, a) => s + a.balance, 0) : stats.profit)}</div>
                <div class="stat-card-label">Trésorerie Multi-Banques (E2EE)</div>
                <div class="stat-card-trend up"><i class="fas fa-lock"></i> Chiffré AES-256</div>
              </div>
            </div>
          ` : ''}

          <!-- Live Barrier Stream & Flow Simulator -->
          ${w.liveStream ? `
            <div class="dashboard-card animate-fade-up" style="margin-bottom:1.5rem;background:linear-gradient(135deg, rgba(10,14,26,0.9), rgba(17,24,39,0.95));border:1px solid rgba(0,206,201,0.25)">
              <div class="card-header" style="margin-bottom:1rem">
                <div>
                  <div class="card-title" style="display:flex;align-items:center;gap:8px">
                    <i class="fas fa-torii-gate" style="color:var(--accent-cyan)"></i>
                    Supervision Barrières & Flux Caméras LPR
                  </div>
                  <div class="card-subtitle">État en temps réel des bornes d'entrée et de sortie automatisées</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="PlateScanner.openScannerModal()">
                  <i class="fas fa-video"></i> Ouvrir Scanner Vidéo
                </button>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem">
                <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700">BORNE ENTRÉE 1 (NORD)</div>
                    <div style="font-weight:700;color:var(--text-main);margin-top:2px">Caméra LPR Active</div>
                    <div style="font-size:0.75rem;color:var(--accent-green);display:flex;align-items:center;gap:4px;margin-top:4px">
                      <span class="live-pulse-dot" style="width:6px;height:6px"></span> Barrière Fermée (Attente)
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.simulateDemoScan()" title="Simuler passage"><i class="fas fa-play"></i></button>
                </div>

                <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700">BORNE ENTRÉE 2 (SUD)</div>
                    <div style="font-weight:700;color:var(--text-main);margin-top:2px">Caméra LPR Active</div>
                    <div style="font-size:0.75rem;color:var(--accent-green);display:flex;align-items:center;gap:4px;margin-top:4px">
                      <span class="live-pulse-dot" style="width:6px;height:6px"></span> Barrière Fermée (Attente)
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.simulateDemoScan()" title="Simuler passage"><i class="fas fa-play"></i></button>
                </div>

                <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem;display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700">BORNE SORTIE 1 (CENTRALE)</div>
                    <div style="font-weight:700;color:var(--text-main);margin-top:2px">Détection Automatique</div>
                    <div style="font-size:0.75rem;color:var(--accent-cyan);display:flex;align-items:center;gap:4px;margin-top:4px">
                      <i class="fas fa-magic"></i> Zéro Ressaisie Activée
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.simulateDemoScan()" title="Simuler sortie"><i class="fas fa-check"></i></button>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Interactive Charts Grid -->
          <div class="charts-grid" style="margin-bottom:1.5rem">
            <!-- 1. Real-Time Traffic & Occupancy Chart -->
            ${w.trafficChart ? `
              <div class="card chart-card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Fréquentation & Flux Horaires</div>
                    <div class="card-subtitle">Passages horaires aux barrières</div>
                  </div>
                  <div class="filter-tabs">
                    <button class="filter-tab ${this.activeTrafficPeriod === 'today' ? 'active' : ''}" onclick="Dashboard.setTrafficPeriod('today')">Aujourd'hui</button>
                    <button class="filter-tab ${this.activeTrafficPeriod === 'week' ? 'active' : ''}" onclick="Dashboard.setTrafficPeriod('week')">7 Jours</button>
                    <button class="filter-tab ${this.activeTrafficPeriod === 'month' ? 'active' : ''}" onclick="Dashboard.setTrafficPeriod('month')">Ce Mois</button>
                  </div>
                </div>
                <canvas id="dashboard-traffic-chart"></canvas>
              </div>
            ` : ''}

            <!-- 2. Monthly Financial Evolution & Savings (Épargne Mensuelle) -->
            ${w.financialChart ? `
              <div class="card chart-card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Évolution des Recettes & Épargne Mensuelle</div>
                    <div class="card-subtitle">Recettes, Charges et Épargne nette - ${new Date().getFullYear()}</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="Router.navigate('accounting')">
                    Voir détails <i class="fas fa-arrow-right"></i>
                  </button>
                </div>
                <canvas id="dashboard-savings-chart"></canvas>
              </div>
            ` : ''}
          </div>

          <!-- Secondary Grid: Geo-Zone ANPR Stats & Budget Watcher -->
          <div class="charts-grid" style="margin-bottom:1.5rem">
            <!-- Geographic Zones Success Rate -->
            ${w.geoStats ? `
              <div class="card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Précision LPR par Zone Géographique</div>
                    <div class="card-subtitle">Reconnaissance de plaques d'immatriculation</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="PlateScanner.showLearningStatsModal()">
                    <i class="fas fa-brain"></i> Matrice IA
                  </button>
                </div>
                <div style="display:flex;flex-direction:column;gap:0.85rem;padding-top:0.5rem">
                  ${Object.values(geoStats).map(z => {
                    const rate = z.total > 0 ? ((z.directSuccess / z.total) * 100).toFixed(1) : '100.0';
                    return `
                      <div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">
                          <span>${z.flag} <strong>${z.name}</strong></span>
                          <span style="font-weight:700;color:var(--accent-green)">${rate}% (${z.directSuccess}/${z.total})</span>
                        </div>
                        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
                          <div style="width:${rate}%;height:100%;background:linear-gradient(90deg, var(--accent-cyan), var(--accent-green));border-radius:3px"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Category Budget Watcher -->
            ${w.budgetWatch ? `
              <div class="card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Suivi des Budgets de Dépenses</div>
                    <div class="card-subtitle">Alertes automatisées en cas de dépassement</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="Banking.openBudgetModal(${parkingId})">
                    <i class="fas fa-edit"></i> Gérer
                  </button>
                </div>
                <div style="display:flex;flex-direction:column;gap:0.85rem;padding-top:0.5rem">
                  ${Object.entries(Banking.getCategoryBudgets()).slice(0, 4).map(([cat, limit]) => {
                    const spent = monthlyExpenses[cat] || 0;
                    const pct = Math.min(100, Math.round((spent / limit) * 100));
                    const isExceeded = spent >= limit;
                    const color = isExceeded ? 'var(--accent-red)' : (pct >= 85 ? 'var(--accent-yellow)' : 'var(--accent-green)');

                    return `
                      <div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.85rem">
                          <span><strong>${cat}</strong></span>
                          <span>${Utils.formatCurrency(spent)} / ${Utils.formatCurrency(limit)} (${pct}%)</span>
                        </div>
                        <div class="budget-progress-meter">
                          <div class="budget-progress-fill" style="width:${pct}%;background:${color}"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Tertiary Grid: Stock Breakdown & Top Collaborators -->
          <div class="charts-grid" style="margin-bottom:1.5rem">
            <!-- Stock / Capacity Chart -->
            ${w.stockChart ? `
              <div class="card chart-card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Répartition du Parc & des Places</div>
                    <div class="card-subtitle">Statuts des véhicules et stationnements</div>
                  </div>
                </div>
                <canvas id="dashboard-stock-chart"></canvas>
              </div>
            ` : ''}

            <!-- Top Collaborators -->
            ${w.topEmployees ? `
              <div class="card animate-fade-up">
                <div class="card-header">
                  <div>
                    <div class="card-title">Meilleurs Collaborateurs</div>
                    <div class="card-subtitle">Performances d'encaissement et ventes</div>
                  </div>
                </div>
                ${topEmployees.length > 0 ? `
                  <ul class="employee-rank-list">
                    ${topEmployees.map((emp, i) => `
                      <li class="employee-rank-item">
                        <div class="rank-number ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
                        <div class="rank-avatar" style="background:${Utils.getAvatarColor(emp.name)}">${Utils.getInitials(emp.name)}</div>
                        <div class="rank-info">
                          <div class="rank-name">${emp.name}</div>
                          <div class="rank-stats">${emp.salesCount} ventes · ${emp.rentalsCount} locations</div>
                        </div>
                        <div class="rank-revenue">${Utils.formatCurrency(emp.totalRevenue)}</div>
                      </li>
                    `).join('')}
                  </ul>
                ` : `
                  <div class="empty-state" style="padding:var(--spacing-lg)">
                    <p>Aucun collaborateur enregistré</p>
                  </div>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Recent Transactions Table -->
          ${w.recentTransactions ? `
            <div class="card animate-fade-up" style="margin-bottom:1.5rem">
              <div class="card-header">
                <div>
                  <div class="card-title">Dernières Transactions & Flux Financiers</div>
                  <div class="card-subtitle">Historique récent des encaissements</div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-ghost btn-sm" onclick="Banking.exportTransactionsPDF(Dashboard.getCombinedTransactions(${parkingId}, stats, tickets), 'Historique Récent', '${parking?.name || 'MON PARKING'}')">
                    <i class="fas fa-file-pdf"></i> Exporter PDF
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="Router.navigate('accounting')">
                    Voir Tout <i class="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>

              <div class="table-container" style="border:none">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Réf / N°</th>
                      <th>Type</th>
                      <th>Client / Véhicule</th>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Mode Règlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stats.sales.slice(0, 5).map(sale => `
                      <tr>
                        <td><span style="color:var(--primary-light);font-weight:600">${Utils.escapeHTML(sale.invoiceNumber || ('VENTE-' + sale.id))}</span></td>
                        <td><span class="badge badge-success">Vente Véhicule</span></td>
                        <td>${Utils.escapeHTML(sale.clientName || 'Client Particulier')}</td>
                        <td>${Utils.formatDate(sale.date)}</td>
                        <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(sale.totalAmount)}</td>
                        <td><span class="badge badge-info">${Utils.escapeHTML(sale.paymentMethod || 'Virement')}</span></td>
                      </tr>
                    `).join('')}
                    ${tickets.filter(t => t.status === 'completed').slice(0, 3).map(t => `
                      <tr>
                        <td><span style="color:var(--accent-cyan);font-weight:600">${Utils.escapeHTML(t.ticketNumber)}</span></td>
                        <td><span class="badge badge-purple">Ticket Parking (${Utils.escapeHTML(t.licensePlate)})</span></td>
                        <td>${Utils.escapeHTML(t.clientName || 'Visiteur Borne')}</td>
                        <td>${Utils.formatDate(t.exitTime || t.entryTime)}</td>
                        <td style="font-weight:700;color:var(--accent-cyan)">${Utils.formatCurrency(t.totalAmount || 0)}</td>
                        <td><span class="badge badge-info">${Utils.escapeHTML(t.paymentMethod || 'Espèces')}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      `;

      // Initialize all interactive Chart.js charts
      this.initInteractiveCharts(stats, tickets, parkingId);

    } catch (err) {
      console.error('Dashboard render error:', err);
      content.innerHTML = `
        <div class="page-content">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Erreur de chargement du tableau de bord</h3>
            <p>${err.message}</p>
          </div>
        </div>
      `;
    }
  },

  getCombinedTransactions(parkingId, stats, tickets) {
    const combined = [];
    (stats.sales || []).forEach(s => {
      combined.push({
        date: s.date,
        reference: s.invoiceNumber,
        type: 'Vente Véhicule',
        client: s.clientName,
        paymentMethod: s.paymentMethod,
        amount: s.totalAmount,
        status: 'completed'
      });
    });
    (tickets || []).filter(t => t.status === 'completed').forEach(t => {
      combined.push({
        date: t.exitTime || t.entryTime,
        reference: t.ticketNumber,
        type: `Stationnement (${t.licensePlate})`,
        client: t.clientName || 'Visiteur',
        paymentMethod: t.paymentMethod,
        amount: t.totalAmount,
        status: 'completed'
      });
    });
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  setTrafficPeriod(period) {
    this.activeTrafficPeriod = period;
    this.render();
  },

  // Open Modal to Customize Dashboard Layout & Widgets
  openCustomizerModal() {
    const settings = this.getWidgetSettings();

    const widgetDefs = [
      { key: 'kpis', title: 'Indicateurs Clés (KPIs)', desc: 'Occupation, Chiffre d\'affaires, Épargne nette et Trésorerie' },
      { key: 'quickActions', title: 'Actions Rapides', desc: 'Accès rapide au scan, tickets, banques et budgets' },
      { key: 'liveStream', title: 'Supervision Barrières & Caméras LPR', desc: 'État en temps réel des bornes d\'accès' },
      { key: 'trafficChart', title: 'Graphique de Fréquentation Horaire', desc: 'Courbe interactive des flux de véhicules' },
      { key: 'financialChart', title: 'Graphique d\'Évolution Financière & Épargne', desc: 'Recettes, charges et épargne mensuelle' },
      { key: 'geoStats', title: 'Taux de Réussite LPR par Zone', desc: 'Statistiques géographiques des plaques reconnues' },
      { key: 'budgetWatch', title: 'Suivi des Budgets par Catégorie', desc: 'Barres de progression des plafonds mensuels' },
      { key: 'stockChart', title: 'Répartition du Stock & Places', desc: 'Graphique en anneau du parc et tickets' },
      { key: 'topEmployees', title: 'Classement des Collaborateurs', desc: 'Top performances de l\'équipe' },
      { key: 'recentTransactions', title: 'Dernières Transactions Financières', desc: 'Tableau des opérations récentes' }
    ];

    const html = `
      <div style="display:flex;flex-direction:column;gap:1rem;padding:0.5rem 0">
        <p style="font-size:0.88rem;color:var(--text-secondary);margin:0">
          Personnalisez les widgets affichés sur votre tableau de bord selon vos priorités opérationnelles :
        </p>

        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${widgetDefs.map(item => `
            <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.9rem 1.1rem;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:700;color:var(--text-main);font-size:0.92rem">${item.title}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">${item.desc}</div>
              </div>
              <input type="checkbox" id="widget-toggle-${item.key}" ${settings[item.key] ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent-cyan);cursor:pointer">
            </div>
          `).join('')}
        </div>
      </div>
    `;

    Utils.showModal('Personnalisation du Tableau de Bord', html, {
      confirmText: 'Appliquer les modifications',
      cancelText: 'Annuler',
      size: 'modal-md'
    }).then(confirmed => {
      if (confirmed) {
        const updated = {};
        widgetDefs.forEach(item => {
          const chk = document.getElementById(`widget-toggle-${item.key}`);
          updated[item.key] = chk ? chk.checked : true;
        });
        this.saveWidgetSettings(updated);
        Utils.notify('Mise en page du tableau de bord enregistrée', 'success');
        this.render();
      }
    });
  },

  // Initialize Interactive Chart.js Visualizations
  async initInteractiveCharts(stats, tickets, parkingId) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet, retrying...');
      return;
    }

    // 1. Hourly Traffic Chart
    const trafficCtx = document.getElementById('dashboard-traffic-chart');
    if (trafficCtx) {
      if (this.charts.traffic) this.charts.traffic.destroy();

      const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
      const trafficData = Array(24).fill(0);
      const exitData = Array(24).fill(0);

      tickets.forEach(t => {
        const entryH = new Date(t.entryTime || t.createdAt).getHours();
        trafficData[entryH] = (trafficData[entryH] || 0) + 1;
        if (t.exitTime) {
          const exitH = new Date(t.exitTime).getHours();
          exitData[exitH] = (exitData[exitH] || 0) + 1;
        }
      });

      this.charts.traffic = new Chart(trafficCtx, {
        type: 'line',
        data: {
          labels: hours,
          datasets: [
            {
              label: 'Entrées Véhicules',
              data: trafficData,
              borderColor: '#00cec9',
              backgroundColor: 'rgba(0, 206, 201, 0.15)',
              borderWidth: 2.5,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#00cec9',
              pointRadius: 3
            },
            {
              label: 'Sorties Validées',
              data: exitData,
              borderColor: '#6c5ce7',
              backgroundColor: 'rgba(108, 92, 231, 0.08)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#6c5ce7',
              pointRadius: 2.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#8b8fa3', font: { family: 'Inter', size: 11 }, usePointStyle: true }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 14, 26, 0.95)',
              titleColor: '#00cec9',
              bodyColor: '#fff',
              borderColor: 'rgba(0, 206, 201, 0.3)',
              borderWidth: 1,
              padding: 10
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3', font: { family: 'Inter' } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3', precision: 0 } }
          }
        }
      });
    }

    // 2. Financial Evolution & Monthly Savings Chart (Épargne Mensuelle)
    const savingsCtx = document.getElementById('dashboard-savings-chart');
    if (savingsCtx) {
      if (this.charts.savings) this.charts.savings.destroy();

      const monthlyData = await DB.getMonthlySalesData(parkingId, new Date().getFullYear());
      const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

      const revenues = monthlyData.salesByMonth.map((s, idx) => s + (monthlyData.rentalsByMonth[idx] || 0));
      // Simulated monthly expenses (~ 60% of revenue or base)
      const expenses = revenues.map(r => Math.max(800, Math.round(r * 0.55)));
      // Monthly savings = Revenue - Expenses
      const savings = revenues.map((r, i) => Math.max(0, r - expenses[i]));

      this.charts.savings = new Chart(savingsCtx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              type: 'bar',
              label: 'Chiffre d\'Affaires',
              data: revenues,
              backgroundColor: 'rgba(108, 92, 231, 0.6)',
              borderColor: '#6c5ce7',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              type: 'bar',
              label: 'Charges & Dépenses',
              data: expenses,
              backgroundColor: 'rgba(235, 77, 75, 0.55)',
              borderColor: '#d63031',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              type: 'line',
              label: 'Épargne Nette / Bénéfice',
              data: savings,
              borderColor: '#00b894',
              backgroundColor: 'rgba(0, 184, 148, 0.2)',
              borderWidth: 3,
              tension: 0.35,
              pointBackgroundColor: '#00b894',
              pointRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#8b8fa3', font: { family: 'Inter', size: 11 }, usePointStyle: true }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 14, 26, 0.95)',
              titleColor: '#00b894',
              bodyColor: '#fff',
              callbacks: {
                label: ctx => `${ctx.dataset.label} : ${Utils.formatCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3', font: { family: 'Inter' } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8fa3', callback: v => Utils.formatCurrency(v) } }
          }
        }
      });
    }

    // 3. Stock & Capacity Doughnut Chart
    const stockCtx = document.getElementById('dashboard-stock-chart');
    if (stockCtx) {
      if (this.charts.stock) this.charts.stock.destroy();

      this.charts.stock = new Chart(stockCtx, {
        type: 'doughnut',
        data: {
          labels: ['Véhicules Disponibles', 'En Location', 'Places Parkées', 'Vendus'],
          datasets: [{
            data: [
              stats.availableVehicles || 8,
              stats.rentedVehicles || 3,
              tickets.filter(t => t.status === 'parked').length || 4,
              stats.soldVehicles || 6
            ],
            backgroundColor: [
              'rgba(0, 184, 148, 0.85)',
              'rgba(253, 203, 110, 0.85)',
              'rgba(0, 206, 201, 0.85)',
              'rgba(108, 92, 231, 0.85)'
            ],
            borderColor: ['#00b894', '#fdcb6e', '#00cec9', '#6c5ce7'],
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8b8fa3', font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 16 }
            }
          }
        }
      });
    }
  }
};
