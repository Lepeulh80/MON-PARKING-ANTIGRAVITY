/* ========================================================================
   MON PARKING - Router (SPA Navigation)
   ======================================================================== */

const Router = {
  currentRoute: 'dashboard',
  
  routes: {
    dashboard: { title: 'Tableau de bord', icon: 'fas fa-chart-line', subtitle: 'Vue d\'ensemble de votre activité', perm: null },
    tickets: { title: 'Tickets & Barrière', icon: 'fas fa-barcode', subtitle: 'Gestion des entrées, sorties et reconnaissance automatique LPR', perm: 'scan_plates' },
    slots: { title: 'Plan des Places (2D)', icon: 'fas fa-map-marked-alt', subtitle: 'Plan visuel en temps réel des allées et emplacements', perm: 'view_slots' },
    subscriptions: { title: 'Abonnements & Pass', icon: 'fas fa-id-card', subtitle: 'Gestion des forfaits résidents, VIP et badges RFID', perm: 'manage_tickets' },
    cashRegister: { title: 'Caisse & Shifts', icon: 'fas fa-cash-register', subtitle: 'Sessions de caisse, tiroir-caisse et Z fiscal', perm: 'manage_cash' },
    attendance: { title: 'Pointage Personnel', icon: 'fas fa-user-clock', subtitle: 'Badgeuse RH, shifts et heures travaillées', perm: null },
    vehicles: { title: 'Véhicules', icon: 'fas fa-car', subtitle: 'Gestion du parc automobile', perm: 'manage_sales' },
    sales: { title: 'Ventes', icon: 'fas fa-hand-holding-usd', subtitle: 'Historique des ventes', perm: 'manage_sales' },
    rentals: { title: 'Locations', icon: 'fas fa-key', subtitle: 'Gestion des locations', perm: 'manage_rentals' },
    invoices: { title: 'Factures', icon: 'fas fa-file-invoice-dollar', subtitle: 'Factures et reçus', perm: 'view_finance' },
    stock: { title: 'État du stock', icon: 'fas fa-warehouse', subtitle: 'Inventaire des véhicules', perm: 'view_finance' },
    maintenance: { title: 'Carnet d\'Entretien', icon: 'fas fa-wrench', subtitle: 'Suivi des révisions, vidanges, contrôle technique et réparations', perm: 'manage_sales' },
    clients: { title: 'Clients', icon: 'fas fa-users', subtitle: 'Base de données clients', perm: 'manage_clients' },
    employees: { title: 'Employés & Rôles', icon: 'fas fa-user-tie', subtitle: 'Gestion de l\'équipe et permissions', perm: 'manage_users' },
    securityPlates: { title: 'Sécurité & Alertes', icon: 'fas fa-shield-alt', subtitle: 'Whitelist VIP et Blacklist alertes barrière', perm: 'manage_blacklist' },
    accounting: { title: 'Comptabilité', icon: 'fas fa-calculator', subtitle: 'Bilan financier et statistiques', perm: 'view_finance' },
    rates: { title: 'Tarifs & Forfaits', icon: 'fas fa-tags', subtitle: 'Barème horaire, franchise, tickets perdus et surtaxes', perm: 'edit_rates' },
    audit: { title: 'Journal d\'Audit', icon: 'fas fa-user-shield', subtitle: 'Registre immuable des opérations sensibles et traçabilité', perm: 'all' },
    reports: { title: 'Rapports & Fréquentation', icon: 'fas fa-chart-area', subtitle: 'Heures de pointe, rapprochement de caisse et rapport journalier', perm: 'view_finance' },
    settings: { title: 'Paramètres', icon: 'fas fa-cog', subtitle: 'Configuration du parking', perm: 'manage_settings' }
  },

  navigate(route) {
    if (!this.routes[route]) return;

    // Strict RBAC Permission Enforcement
    const routeInfo = this.routes[route];
    if (routeInfo.perm && typeof Auth !== 'undefined' && Auth.user) {
      if (!Auth.hasPermission(routeInfo.perm)) {
        Utils.notify(`Accès refusé : votre rôle (${Auth.user.role}) ne dispose pas des privilèges requis.`, 'error', 3500);
        if (typeof A11y !== 'undefined' && A11y.speak) {
          A11y.speak('Accès refusé');
        }
        if (this.currentRoute !== 'dashboard') {
          this.navigate('dashboard');
        }
        return;
      }
    }

    this.currentRoute = route;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Update header
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) {
      headerTitle.innerHTML = `<h1>${routeInfo.title}</h1><p>${routeInfo.subtitle}</p>`;
    }

    // Close mobile sidebar
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');

    // Render page with transition
    const content = document.getElementById('main-content');
    if (content) {
      content.classList.add('page-transition-enter');
      content.classList.remove('page-transition-active');
      
      setTimeout(() => {
        this.renderPage(route);
        requestAnimationFrame(() => {
          content.classList.remove('page-transition-enter');
          content.classList.add('page-transition-active');
        });
      }, 150);
    }

    // Update URL hash
    window.location.hash = route;
  },

  renderPage(route) {
    const content = document.getElementById('main-content');
    if (!content) return;

    switch (route) {
      case 'dashboard': Dashboard.render(); break;
      case 'tickets': Tickets.render(); break;
      case 'slots': Slots.render(); break;
      case 'subscriptions': Subscriptions.render(); break;
      case 'cashRegister': CashRegister.render(); break;
      case 'attendance': Attendance.render(); break;
      case 'vehicles': Vehicles.render(); break;
      case 'sales': Sales.render(); break;
      case 'rentals': Rentals.render(); break;
      case 'invoices': Invoices.render(); break;
      case 'stock': Stock.render(); break;
      case 'maintenance': Maintenance.render(); break;
      case 'clients': Clients.render(); break;
      case 'employees': Employees.render(); break;
      case 'securityPlates': SecurityPlates.render(); break;
      case 'accounting': Accounting.render(); break;
      case 'rates': Rates.render(); break;
      case 'audit': Audit.render(); break;
      case 'reports': Reports.render(); break;
      case 'settings': Settings.render(); break;
      default: Dashboard.render();
    }
  },

  getRouteFromHash() {
    const hash = window.location.hash.replace('#', '');
    return this.routes[hash] ? hash : 'dashboard';
  }
};

window.Router = Router;
