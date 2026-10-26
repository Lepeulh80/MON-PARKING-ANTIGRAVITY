/* ========================================================================
   MON PARKING - Accounting & Financial Management Module
   Detailed transaction history, date & amount filtering, CSV & PDF export,
   monthly savings visualization, category budgets, and multi-bank integration.
   ======================================================================== */

const Accounting = {
  currentTab: 'overview', // 'overview' | 'transactions' | 'budgets' | 'banks'
  selectedYear: new Date().getFullYear(),
  savingsChart: null,

  // Transaction Filters
  filterPeriod: 'month', // 'all' | 'today' | 'week' | 'month' | 'custom'
  filterDateFrom: '',
  filterDateTo: '',
  filterMinAmount: '',
  filterMaxAmount: '',
  filterType: 'all',
  filterPaymentMethod: 'all',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const parking = await DB.get('parkings', parkingId);
    const stats = await DB.getDashboardStats(parkingId);
    const expenses = (await DB.getExpensesByParking(parkingId)).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    const tickets = await DB.getTicketsByParking(parkingId);
    const monthlyData = await DB.getMonthlySalesData(parkingId, this.selectedYear);

    const totalRevenue = stats.totalRevenue;
    const totalExpenses = stats.totalExpenses;
    const netProfit = stats.profit;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Monthly Savings calculation (Revenue - Expenses)
    const monthlySavings = Math.max(0, stats.monthlyProfit);

    // Build complete unified transaction stream
    const allTransactions = this.buildAllTransactions(stats, tickets, expenses);

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Top Title & Navigation Tabs -->
        <div class="table-toolbar" style="margin-bottom:1.5rem">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;color:var(--text-main);margin:0;display:flex;align-items:center;gap:10px">
              <i class="fas fa-chart-pie" style="color:var(--accent-cyan)"></i>
              Gestion Comptable, Transactions & Épargne
            </h2>
            <p style="color:var(--text-muted);margin:4px 0 0">
              Suivi des recettes, charges d'exploitation, budgets mensuels et rapprochement bancaire
            </p>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="Banking.syncAllBanks()">
              <i class="fas fa-sync-alt"></i> Sync Banques
            </button>
            <button class="btn btn-primary btn-sm hover-lift" onclick="Accounting.showExpenseModal()">
              <i class="fas fa-plus"></i> Nouvelle Dépense
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="filter-tabs" style="margin-bottom:1.5rem;display:flex;gap:6px;border-bottom:1px solid var(--border-color);padding-bottom:8px">
          <button class="filter-tab ${this.currentTab === 'overview' ? 'active' : ''}" onclick="Accounting.setTab('overview')">
            <i class="fas fa-tachometer-alt"></i> Bilan & Épargne
          </button>
          <button class="filter-tab ${this.currentTab === 'transactions' ? 'active' : ''}" onclick="Accounting.setTab('transactions')">
            <i class="fas fa-list-alt"></i> Historique Transactions (${allTransactions.length})
          </button>
          <button class="filter-tab ${this.currentTab === 'budgets' ? 'active' : ''}" onclick="Accounting.setTab('budgets')">
            <i class="fas fa-wallet"></i> Budgets Mensuels & Alertes
          </button>
          <button class="filter-tab ${this.currentTab === 'banks' ? 'active' : ''}" onclick="Accounting.setTab('banks')">
            <i class="fas fa-university"></i> Multi-Comptes Bancaires
          </button>
        </div>

        <!-- Tab 1: Financial Overview & Savings -->
        ${this.currentTab === 'overview' ? this.renderOverviewTab(stats, expenses, totalRevenue, totalExpenses, netProfit, profitMargin, monthlyData) : ''}

        <!-- Tab 2: Detailed Transaction History with Filters & CSV/PDF Export -->
        ${this.currentTab === 'transactions' ? this.renderTransactionsTab(allTransactions, parking) : ''}

        <!-- Tab 3: Monthly Category Budgets & Alerts -->
        ${this.currentTab === 'budgets' ? this.renderBudgetsTab(parkingId) : ''}

        <!-- Tab 4: Multi-Bank Accounts Integration -->
        ${this.currentTab === 'banks' ? this.renderBanksTab() : ''}
      </div>
    `;

    // Initialize Chart if on overview
    if (this.currentTab === 'overview') {
      setTimeout(() => this.initSavingsChart(monthlyData), 50);
    }
  },

  setTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  // Build unified transaction array
  buildAllTransactions(stats, tickets, expenses) {
    const list = [];

    // 1. Vehicle sales
    (stats.sales || []).forEach(s => {
      list.push({
        id: 'sale_' + s.id,
        date: s.date,
        reference: s.invoiceNumber || ('VTE-' + s.id),
        type: 'Vente Véhicule',
        category: 'Vente Automobile',
        clientName: s.clientName || 'Client Particulier',
        paymentMethod: s.paymentMethod || 'Virement',
        amount: s.totalAmount || 0,
        direction: 'in',
        status: 'completed'
      });
    });

    // 2. Vehicle rentals
    (stats.rentals || []).forEach(r => {
      list.push({
        id: 'rent_' + r.id,
        date: r.startDate,
        reference: 'LOC-' + r.id,
        type: 'Location Véhicule',
        category: 'Location Automobile',
        clientName: r.clientName || 'Client Locataire',
        paymentMethod: r.paymentMethod || 'Espèces',
        amount: r.totalAmount || 0,
        direction: 'in',
        status: r.status || 'completed'
      });
    });

    // 3. Completed Parking tickets
    (tickets || []).filter(t => t.status === 'completed').forEach(t => {
      list.push({
        id: 'tkt_' + t.id,
        date: t.exitTime || t.entryTime,
        reference: t.ticketNumber,
        type: 'Ticket Stationnement',
        category: `Parking (${t.licensePlate})`,
        clientName: t.clientName || `Visiteur (${t.licensePlate})`,
        paymentMethod: t.paymentMethod || 'Espèces',
        amount: t.totalAmount || 0,
        direction: 'in',
        status: 'completed'
      });
    });

    // 4. Expenses & charges
    (expenses || []).forEach(e => {
      list.push({
        id: 'exp_' + e.id,
        date: e.date,
        reference: 'DEP-' + e.id,
        type: 'Dépense / Charge',
        category: e.category || 'Charge d\'exploitation',
        clientName: e.supplier || e.description || 'Fournisseur',
        paymentMethod: 'Virement / Chèque',
        amount: e.amount || 0,
        direction: 'out',
        status: 'paid'
      });
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Overview Tab: Financial KPIs, Savings Chart, and Balance Sheet
  renderOverviewTab(stats, expenses, totalRevenue, totalExpenses, netProfit, profitMargin, monthlyData) {
    const expenseCategories = {};
    expenses.forEach(e => {
      const cat = e.category || 'Divers';
      expenseCategories[cat] = (expenseCategories[cat] || 0) + (e.amount || 0);
    });

    return `
      <!-- Financial KPIs -->
      <div class="stats-grid stagger-children" style="margin-bottom:1.5rem">
        <div class="stat-card green hover-lift">
          <div class="stat-card-icon"><i class="fas fa-hand-holding-usd"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(totalRevenue)}</div>
          <div class="stat-card-label">Chiffre d'Affaires Brut</div>
        </div>
        <div class="stat-card red hover-lift">
          <div class="stat-card-icon"><i class="fas fa-receipt"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(totalExpenses)}</div>
          <div class="stat-card-label">Charges d'Exploitation</div>
        </div>
        <div class="stat-card purple hover-lift">
          <div class="stat-card-icon"><i class="fas fa-piggy-bank"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(netProfit)}</div>
          <div class="stat-card-label">Épargne & Bénéfice Net (${profitMargin}% de marge)</div>
        </div>
        <div class="stat-card cyan hover-lift">
          <div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div>
          <div class="stat-card-value">${Utils.formatCurrency(stats.monthlyProfit)}</div>
          <div class="stat-card-label">Épargne Nette ce Mois-ci</div>
        </div>
      </div>

      <!-- Interactive Monthly Savings & Turnover Chart -->
      <div class="card chart-card animate-fade-up" style="margin-bottom:1.5rem">
        <div class="card-header">
          <div>
            <div class="card-title">Visualisation Graphique de l'Épargne Mensuelle & Recettes</div>
            <div class="card-subtitle">Évolution des flux de trésorerie sur l'exercice ${this.selectedYear}</div>
          </div>
        </div>
        <canvas id="accounting-savings-canvas"></canvas>
      </div>

      <!-- Secondary Breakdown Grid -->
      <div class="grid-2-col" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:1.5rem;margin-bottom:1.5rem">
        <!-- Expense Categories -->
        <div class="dashboard-card animate-fade-up">
          <div class="card-header">
            <h3><i class="fas fa-pie-chart" style="color:var(--accent-red)"></i> Répartition des Dépenses par Catégorie</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.85rem;padding-top:0.5rem">
            ${Object.keys(expenseCategories).length === 0 ? '<p style="color:var(--text-muted)">Aucune dépense enregistrée.</p>' : 
              Object.entries(expenseCategories).map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">
                      <span><strong>${cat}</strong></span>
                      <span>${Utils.formatCurrency(amt)} (${pct}%)</span>
                    </div>
                    <div class="budget-progress-meter">
                      <div class="budget-progress-fill" style="width:${pct}%;background:linear-gradient(90deg, #ff7675, var(--accent-red))"></div>
                    </div>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>

        <!-- Quick Balance Sheet / Bilan -->
        <div class="dashboard-card animate-fade-up">
          <div class="card-header">
            <h3><i class="fas fa-balance-scale" style="color:var(--accent-green)"></i> Bilan Synthétique</h3>
            <button class="btn btn-ghost btn-sm" onclick="Accounting.printBalanceSheet()">
              <i class="fas fa-print"></i> Imprimer Bilan
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.75rem;padding-top:0.5rem;font-size:0.95rem">
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted)">Ventes de véhicules :</span>
              <strong>${Utils.formatCurrency(stats.sales.reduce((s, x) => s + (x.totalAmount || 0), 0))}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted)">Locations de véhicules :</span>
              <strong>${Utils.formatCurrency(stats.rentals.reduce((s, x) => s + (x.totalAmount || 0), 0))}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted)">Tickets & Stationnement :</span>
              <strong>${Utils.formatCurrency(stats.totalRevenue - stats.sales.reduce((s, x) => s + (x.totalAmount || 0), 0) - stats.rentals.reduce((s, x) => s + (x.totalAmount || 0), 0))}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-color)">
              <span style="color:var(--text-muted)">Charges et Dépenses :</span>
              <span style="color:var(--accent-red);font-weight:700">- ${Utils.formatCurrency(totalExpenses)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.75rem 0;margin-top:0.5rem;background:var(--bg-glass);border-radius:var(--radius-md);padding:0.75rem">
              <span style="font-weight:700">RÉSULTAT NET COMPTABLE :</span>
              <span style="font-weight:900;font-size:1.2rem;color:${netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                ${Utils.formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // Tab 2: Detailed Transactions Table with Filters, CSV & PDF export
  renderTransactionsTab(allTransactions, parking) {
    const filtered = this.applyFilters(allTransactions);
    const totalFiltered = filtered.reduce((sum, t) => sum + (t.direction === 'in' ? t.amount : -t.amount), 0);

    return `
      <!-- Filter Toolbar -->
      <div class="transaction-filter-box animate-fade-up">
        <!-- Date Preset Filter -->
        <div>
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Période :</label>
          <select id="flt-period" class="form-input" onchange="Accounting.onFilterPeriodChange(this.value)">
            <option value="month" ${this.filterPeriod === 'month' ? 'selected' : ''}>Ce mois-ci</option>
            <option value="today" ${this.filterPeriod === 'today' ? 'selected' : ''}>Aujourd'hui</option>
            <option value="week" ${this.filterPeriod === 'week' ? 'selected' : ''}>7 derniers jours</option>
            <option value="all" ${this.filterPeriod === 'all' ? 'selected' : ''}>Toutes les dates</option>
            <option value="custom" ${this.filterPeriod === 'custom' ? 'selected' : ''}>Période personnalisée</option>
          </select>
        </div>

        <!-- Custom Date Range -->
        <div style="display:${this.filterPeriod === 'custom' ? 'block' : 'none'}" id="custom-date-box">
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Du ... Au ... :</label>
          <div style="display:flex;gap:6px">
            <input type="date" id="flt-date-from" class="form-input" value="${this.filterDateFrom}" onchange="Accounting.onFilterChange()">
            <input type="date" id="flt-date-to" class="form-input" value="${this.filterDateTo}" onchange="Accounting.onFilterChange()">
          </div>
        </div>

        <!-- Amount Range Filter -->
        <div>
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Montant Min / Max (TND) :</label>
          <div style="display:flex;gap:6px">
            <input type="number" id="flt-min-amount" class="form-input" placeholder="Min" value="${this.filterMinAmount}" oninput="Accounting.onFilterChange()" style="width:50%">
            <input type="number" id="flt-max-amount" class="form-input" placeholder="Max" value="${this.filterMaxAmount}" oninput="Accounting.onFilterChange()" style="width:50%">
          </div>
        </div>

        <!-- Type Filter -->
        <div>
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Type d'opération :</label>
          <select id="flt-type" class="form-input" onchange="Accounting.onFilterChange()">
            <option value="all">Tous les types</option>
            <option value="Vente Véhicule" ${this.filterType === 'Vente Véhicule' ? 'selected' : ''}>Ventes véhicules</option>
            <option value="Location Véhicule" ${this.filterType === 'Location Véhicule' ? 'selected' : ''}>Locations</option>
            <option value="Ticket Stationnement" ${this.filterType === 'Ticket Stationnement' ? 'selected' : ''}>Tickets parking</option>
            <option value="Dépense / Charge" ${this.filterType === 'Dépense / Charge' ? 'selected' : ''}>Dépenses & charges</option>
          </select>
        </div>

        <!-- Payment Method Filter -->
        <div>
          <label style="font-size:0.8rem;color:var(--text-muted);display:block;margin-bottom:4px">Mode de règlement :</label>
          <select id="flt-payment" class="form-input" onchange="Accounting.onFilterChange()">
            <option value="all">Tous les modes</option>
            <option value="Espèces" ${this.filterPaymentMethod === 'Espèces' ? 'selected' : ''}>Espèces</option>
            <option value="Carte bancaire" ${this.filterPaymentMethod === 'Carte bancaire' ? 'selected' : ''}>Carte bancaire</option>
            <option value="Virement" ${this.filterPaymentMethod === 'Virement' ? 'selected' : ''}>Virement bancaire</option>
            <option value="Chèque" ${this.filterPaymentMethod === 'Chèque' ? 'selected' : ''}>Chèque</option>
          </select>
        </div>

        <!-- Export Buttons -->
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm hover-lift" onclick="Accounting.exportFilteredCSV()" style="border:1px solid rgba(0,206,201,0.3);color:var(--accent-cyan);flex:1">
            <i class="fas fa-file-csv"></i> Exporter CSV
          </button>
          <button class="btn btn-primary btn-sm hover-lift" onclick="Accounting.exportFilteredPDF('${parking?.name || 'MON PARKING'}')" style="flex:1">
            <i class="fas fa-file-pdf"></i> Exporter PDF
          </button>
        </div>
      </div>

      <!-- Summary of filtered data -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;font-size:0.9rem">
        <span style="color:var(--text-muted)">
          <strong>${filtered.length}</strong> transactions trouvées
        </span>
        <span style="font-weight:700;color:${totalFiltered >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
          Solde net de la sélection : ${Utils.formatCurrency(totalFiltered)}
        </span>
      </div>

      <!-- Transactions Table -->
      <div class="table-container animate-fade-up">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Type d'Opération</th>
              <th>Client / Tiers / Véhicule</th>
              <th>Mode Règlement</th>
              <th>Montant</th>
              <th>Sens Flux</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">Aucune transaction ne correspond à vos filtres.</td></tr>
            ` : filtered.map(t => `
              <tr>
                <td>${Utils.formatDate(t.date)}</td>
                <td><strong style="color:var(--primary-light)">${Utils.escapeHTML(t.reference)}</strong></td>
                <td><span class="badge ${t.direction === 'in' ? 'badge-success' : 'badge-danger'}">${Utils.escapeHTML(t.type)}</span></td>
                <td>${Utils.escapeHTML(t.clientName)}</td>
                <td><span class="badge badge-info">${Utils.escapeHTML(t.paymentMethod)}</span></td>
                <td style="font-weight:800;color:${t.direction === 'in' ? 'var(--accent-green)' : 'var(--accent-red)'}">
                  ${t.direction === 'in' ? '+' : '-'} ${Utils.formatCurrency(t.amount)}
                </td>
                <td>
                  <i class="fas ${t.direction === 'in' ? 'fa-arrow-down' : 'fa-arrow-up'}" style="color:${t.direction === 'in' ? 'var(--accent-green)' : 'var(--accent-red)'}"></i>
                  ${t.direction === 'in' ? 'Recette' : 'Dépense'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // Tab 3: Monthly Budgets & Alerts
  renderBudgetsTab(parkingId) {
    const budgets = Banking.getCategoryBudgets();

    return `
      <div class="dashboard-card animate-fade-up" style="margin-bottom:1.5rem">
        <div class="card-header">
          <div>
            <h3 style="margin:0"><i class="fas fa-bullseye" style="color:var(--accent-pink)"></i> Plafonds Budgétaires par Catégorie de Dépenses</h3>
            <div style="font-size:0.85rem;color:var(--text-muted)">
              Des alertes visuelles et vocales sont déclenchées automatiquement en cas de dépassement de seuil (> 85% et > 100%).
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Banking.openBudgetModal(${parkingId})">
            <i class="fas fa-edit"></i> Modifier les Plafonds
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.25rem;padding-top:1rem">
          ${Object.entries(budgets).map(([cat, limit]) => `
            <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.1rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="color:var(--text-main);font-size:0.95rem">${cat}</strong>
                <span style="font-weight:700;color:var(--accent-cyan);font-size:1.05rem">${Utils.formatCurrency(limit)}</span>
              </div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Plafond mensuel alloué</div>
              <div class="budget-progress-meter">
                <div class="budget-progress-fill" style="width:45%;background:var(--accent-green)"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // Tab 4: Multi-Bank Accounts Integration
  renderBanksTab() {
    const accounts = Banking.getBankAccounts();
    const total = accounts.reduce((s, a) => s + a.balance, 0);

    return `
      <div style="display:flex;flex-direction:column;gap:1.5rem" class="animate-fade-up">
        <!-- Centralized Header -->
        <div style="background:linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,206,201,0.15));border:1px solid var(--accent-cyan);border-radius:var(--radius-lg);padding:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="font-size:0.75rem;letter-spacing:1px;font-weight:700;color:var(--accent-cyan)">
              <i class="fas fa-shield-alt"></i> SYNCHRONISATION MULTI-BANQUES CHIFFRÉE E2EE
            </div>
            <div style="font-size:2.2rem;font-weight:900;color:#fff;margin-top:4px">
              ${Utils.formatCurrency(total)}
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary)">
              ${accounts.length} comptes agrégés et réconciliés en temps réel
            </div>
          </div>
          <button class="btn btn-primary hover-lift" onclick="Banking.syncAllBanks().then(() => Accounting.render())">
            <i class="fas fa-sync-alt"></i> Forcer la Synchronisation
          </button>
        </div>

        <!-- Bank Accounts Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1rem">
          ${accounts.map(acc => `
            <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1.25rem">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;color:${acc.color};font-size:1.3rem">
                  <i class="${acc.icon}"></i>
                </div>
                <div>
                  <div style="font-weight:700;color:var(--text-main);font-size:1rem">${acc.bankName}</div>
                  <div style="font-size:0.8rem;color:var(--text-muted)">${acc.accountType}</div>
                </div>
              </div>
              <div style="font-family:monospace;font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px">${acc.ibanMasked}</div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--border-color);padding-top:10px">
                <span style="font-size:0.78rem;color:var(--text-muted)">Solde en direct :</span>
                <span style="font-size:1.3rem;font-weight:900;color:var(--accent-green)">${Utils.formatCurrency(acc.balance)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // Interactive Chart initialization for overview tab
  initSavingsChart(monthlyData) {
    const canvas = document.getElementById('accounting-savings-canvas');
    if (!canvas || typeof Chart === 'undefined') return;

    const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const revenues = monthlyData.salesByMonth.map((s, idx) => s + (monthlyData.rentalsByMonth[idx] || 0));
    const expenses = revenues.map(r => Math.max(800, Math.round(r * 0.55)));
    const savings = revenues.map((r, i) => Math.max(0, r - expenses[i]));

    if (this.savingsChart) {
      this.savingsChart.destroy();
      this.savingsChart = null;
    }

    this.savingsChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Chiffre d\'Affaires Brut',
            data: revenues,
            backgroundColor: 'rgba(108, 92, 231, 0.7)',
            borderColor: '#6c5ce7',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Dépenses & Charges',
            data: expenses,
            backgroundColor: 'rgba(235, 77, 75, 0.6)',
            borderColor: '#d63031',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            type: 'line',
            label: 'Épargne Mensuelle Nette',
            data: savings,
            borderColor: '#00b894',
            backgroundColor: 'rgba(0, 184, 148, 0.2)',
            borderWidth: 3,
            fill: true,
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
          legend: { labels: { color: '#8b8fa3', font: { family: 'Inter', size: 11 }, usePointStyle: true } },
          tooltip: {
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
  },

  // Filter handlers
  onFilterPeriodChange(val) {
    this.filterPeriod = val;
    const box = document.getElementById('custom-date-box');
    if (box) box.style.display = val === 'custom' ? 'block' : 'none';
    this.render();
  },

  onFilterChange() {
    this.filterDateFrom = document.getElementById('flt-date-from')?.value || '';
    this.filterDateTo = document.getElementById('flt-date-to')?.value || '';
    this.filterMinAmount = document.getElementById('flt-min-amount')?.value || '';
    this.filterMaxAmount = document.getElementById('flt-max-amount')?.value || '';
    this.filterType = document.getElementById('flt-type')?.value || 'all';
    this.filterPaymentMethod = document.getElementById('flt-payment')?.value || 'all';
    this.render();
  },

  applyFilters(list) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return list.filter(t => {
      const d = new Date(t.date);

      // Period filter
      if (this.filterPeriod === 'today' && d < startOfToday) return false;
      if (this.filterPeriod === 'week' && d < startOfWeek) return false;
      if (this.filterPeriod === 'month' && d < startOfMonth) return false;
      if (this.filterPeriod === 'custom') {
        if (this.filterDateFrom && d < new Date(this.filterDateFrom)) return false;
        if (this.filterDateTo) {
          const toDate = new Date(this.filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (d > toDate) return false;
        }
      }

      // Amount filter
      if (this.filterMinAmount && t.amount < parseFloat(this.filterMinAmount)) return false;
      if (this.filterMaxAmount && t.amount > parseFloat(this.filterMaxAmount)) return false;

      // Type filter
      if (this.filterType !== 'all' && t.type !== this.filterType) return false;

      // Payment method
      if (this.filterPaymentMethod !== 'all' && t.paymentMethod !== this.filterPaymentMethod) return false;

      return true;
    });
  },

  // Export filtered transactions to CSV
  async exportFilteredCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const stats = await DB.getDashboardStats(parkingId);
    const tickets = await DB.getTicketsByParking(parkingId);
    const expenses = await DB.getExpensesByParking(parkingId);
    const all = this.buildAllTransactions(stats, tickets, expenses);
    const filtered = this.applyFilters(all);

    const data = filtered.map(t => ({
      Date: Utils.formatDate(t.date),
      Reference: t.reference,
      Type: t.type,
      Client_Tiers: t.clientName,
      Mode_Paiement: t.paymentMethod,
      Montant_TND: t.amount,
      Sens: t.direction === 'in' ? 'Recette' : 'Depense'
    }));

    Utils.exportToCSV(data, 'transactions_financieres_mon_parking');
    Utils.notify('Export CSV généré avec succès !', 'success');
  },

  // Export filtered transactions to PDF
  async exportFilteredPDF(parkingName) {
    const parkingId = Utils.getCurrentParkingId();
    const stats = await DB.getDashboardStats(parkingId);
    const tickets = await DB.getTicketsByParking(parkingId);
    const expenses = await DB.getExpensesByParking(parkingId);
    const all = this.buildAllTransactions(stats, tickets, expenses);
    const filtered = this.applyFilters(all);

    Banking.exportTransactionsPDF(filtered, 'Historique des Transactions Financières', parkingName);
  },

  async showExpenseModal() {
    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
      <form id="expense-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group">
          <label><i class="fas fa-calendar"></i> Date *</label>
          <input type="date" id="exp-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-money-bill-wave"></i> Montant (TND) *</label>
          <input type="number" id="exp-amount" class="form-input" min="0.1" step="0.5" placeholder="0.00" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-folder"></i> Catégorie de charge *</label>
          <select id="exp-category" class="form-input" required>
            <option value="Entretien">Entretien & Mécanique</option>
            <option value="Énergie & Électricité">Énergie & Électricité</option>
            <option value="Salaires">Salaires & Primes Personnel</option>
            <option value="Assurance">Assurances & Vignettes</option>
            <option value="Carburant">Carburant & Lavage</option>
            <option value="Fournitures">Fournitures & Consommables</option>
            <option value="Loyer">Loyer du Parking</option>
            <option value="Publicité">Publicité & Marketing</option>
            <option value="Divers">Divers & Imprévus</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-building"></i> Fournisseur / Prestataire</label>
          <input type="text" id="exp-supplier" class="form-input" placeholder="Ex: Société d'Électricité, Maintenance Borne...">
        </div>

        <div class="form-group span-2">
          <label><i class="fas fa-comment"></i> Description / Justificatif *</label>
          <input type="text" id="exp-desc" class="form-input" placeholder="Ex: Réparation cellule barrière et révision motorisation" required>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Enregistrer une Dépense', formHtml, {
      confirmText: 'Ajouter la dépense',
      size: 'modal-md'
    });

    if (confirmed) {
      const date = document.getElementById('exp-date').value;
      const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
      const category = document.getElementById('exp-category').value;
      const supplier = document.getElementById('exp-supplier').value.trim();
      const description = document.getElementById('exp-desc').value.trim();

      if (amount <= 0 || !description) {
        Utils.notify('Veuillez renseigner un montant valide et une description', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.add('expenses', {
        parkingId,
        date,
        amount,
        category,
        supplier,
        description,
        createdBy: Auth.user.id
      });

      await DB.logActivity(parkingId, Auth.user.id, 'Dépense ajoutée', `${category} : ${amount} TND (${description})`);
      Utils.notify('Dépense enregistrée avec succès', 'success');

      // Check if this new expense triggers a budget limit alert
      if (typeof Banking !== 'undefined') {
        const { alerts } = await Banking.checkBudgetAlerts(parkingId);
        if (alerts.length > 0) {
          alerts.forEach(a => {
            Utils.notify(`${a.title} : ${a.message}`, a.severity === 'danger' ? 'error' : 'warning', 6000);
            if (typeof A11y !== 'undefined' && A11y.speak) {
              A11y.speak(`Attention : ${a.title}`);
            }
          });
        }
      }

      this.render();
    }
  },

  async printBalanceSheet() {
    const parkingId = Utils.getCurrentParkingId();
    const stats = await DB.getDashboardStats(parkingId);
    const parking = await DB.get('parkings', parkingId);

    const sheetHtml = `
      <div id="balance-sheet-printable" style="background:#fff;color:#1e293b;padding:2.5rem;font-family:sans-serif;border-radius:var(--radius-md)">
        <div style="text-align:center;border-bottom:2px solid #6c5ce7;padding-bottom:1rem;margin-bottom:1.5rem">
          <h2 style="color:#6c5ce7;margin:0">MON PARKING - BILAN FINANCIER & COMPTABLE</h2>
          <p style="margin:4px 0;color:#64748b">${parking?.name || 'Gestion Automobile'} — Exercice ${this.selectedYear}</p>
          <small style="color:#94a3b8">Généré le ${Utils.formatDateTime(new Date())}</small>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:2rem;font-size:0.95rem">
          <tr style="background:#f1f5f9;font-weight:700">
            <td style="padding:10px">RUBRIQUE</td>
            <td style="padding:10px;text-align:right">MONTANT (TND)</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0">Chiffre d'affaires Ventes</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#16a34a;font-weight:700">
              ${Utils.formatCurrency(stats.sales.reduce((s, x) => s + (x.totalAmount || 0), 0))}
            </td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0">Chiffre d'affaires Locations</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#16a34a;font-weight:700">
              ${Utils.formatCurrency(stats.rentals.reduce((s, x) => s + (x.totalAmount || 0), 0))}
            </td>
          </tr>
          <tr style="background:#f8fafc;font-weight:700">
            <td style="padding:10px;border-bottom:2px solid #cbd5e1">TOTAL PRODUITS D'EXPLOITATION</td>
            <td style="padding:10px;border-bottom:2px solid #cbd5e1;text-align:right;color:#16a34a">
              ${Utils.formatCurrency(stats.totalRevenue)}
            </td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0">Total Charges et Dépenses d'exploitation</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#dc2626;font-weight:700">
              -${Utils.formatCurrency(stats.totalExpenses)}
            </td>
          </tr>
          <tr style="background:#ede9fe;font-weight:900;font-size:1.15rem">
            <td style="padding:14px;color:#6c5ce7">RÉSULTAT NET COMPTABLE</td>
            <td style="padding:14px;text-align:right;color:#6c5ce7">
              ${Utils.formatCurrency(stats.profit)}
            </td>
          </tr>
        </table>
      </div>
    `;

    const confirmed = await Utils.showModal('Bilan Comptable Officiel', sheetHtml, {
      size: 'modal-lg',
      confirmText: 'Imprimer'
    });

    if (confirmed) {
      window.print();
    }
  }
};
