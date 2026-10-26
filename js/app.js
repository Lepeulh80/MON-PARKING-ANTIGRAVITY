/* ========================================================================
   MON PARKING - Main Application Controller
   App initialization, PWA lifecycle, event bindings, and topbar controls
   ======================================================================== */

const App = {
  deferredInstallPrompt: null,

  async init() {
    console.log('🚀 Initializing MON PARKING Progressive Web App...');

    try {
      // 1. Initialize DB
      await DB.ready;
      console.log('✅ IndexedDB connected');

      // 2. Initialize Auth
      await Auth.init();
      console.log('✅ Auth system ready');

      // Initialize Plate Scanner OCR in background
      if (typeof PlateScanner !== 'undefined' && PlateScanner.initOCR) {
        PlateScanner.initOCR();
      }

      // If user is authenticated, setup app shell
      if (Auth.user) {
        this.setupAppShell();
        
        // Initialize Auto-Lock Inactivity Timer & PIN security
        Auth.initInactivityTimer();

        // Initialize Multi-Device & Cloud Sync Bus
        if (typeof Sync !== 'undefined' && Sync.init) {
          Sync.init();
        }

        // Listen to URL hash changes for routing
        window.addEventListener('hashchange', () => {
          const route = Router.getRouteFromHash();
          Router.navigate(route);
          this.updateActiveNav(route);
        });

        // Navigate to initial route
        const initialRoute = Router.getRouteFromHash();
        Router.navigate(initialRoute);
        this.updateActiveNav(initialRoute);
      } else {
        // Show login/register screen
        Auth.renderLogin();
      }

      // 3. Register PWA Service Worker
      this.registerServiceWorker();

      // 4. Setup PWA Install Prompt
      this.setupInstallPrompt();

    } catch (err) {
      console.error('App init error:', err);
      Utils.notify('Erreur lors du chargement de l\'application : ' + err.message, 'error');
    }
  },

  setupAppShell() {
    const user = Auth.user;
    const parking = Auth.currentParking;
    const appEl = document.getElementById('app');

    // If shell not rendered yet, inject it
    if (!document.getElementById('app-container')) {
      appEl.innerHTML = `
        <div id="app-container">
          <!-- Mobile Sidebar Overlay -->
          <div class="sidebar-overlay"></div>

          <!-- Sidebar -->
          <aside class="sidebar">
            <div class="sidebar-header">
              <div class="sidebar-logo">
                <i class="fas fa-car-side"></i>
              </div>
              <div class="sidebar-brand">
                <h2 class="brand-name parking-name-display">${parking?.name || 'MON PARKING'}</h2>
                <p>Gestion Automobile 3D</p>
              </div>
            </div>

            <nav class="sidebar-nav">
              <div class="nav-section">
                <div class="nav-section-title">PRINCIPAL</div>
                <div class="nav-item active" data-route="dashboard" onclick="Router.navigate('dashboard')">
                  <i class="fas fa-chart-line"></i>
                  <span>Tableau de bord</span>
                </div>
                <div class="nav-item" data-route="tickets" onclick="Router.navigate('tickets')">
                  <i class="fas fa-barcode"></i>
                  <span>Tickets & Barrière</span>
                </div>
                <div class="nav-item" data-route="slots" onclick="Router.navigate('slots')">
                  <i class="fas fa-th"></i>
                  <span>Plan des Places (2D)</span>
                </div>
                <div class="nav-item" data-route="vehicles" onclick="Router.navigate('vehicles')">
                  <i class="fas fa-car"></i>
                  <span>Parc Véhicules</span>
                </div>
                <div class="nav-item" data-route="sales" onclick="Router.navigate('sales')">
                  <i class="fas fa-cash-register"></i>
                  <span>Ventes</span>
                </div>
                <div class="nav-item" data-route="rentals" onclick="Router.navigate('rentals')">
                  <i class="fas fa-key"></i>
                  <span>Locations</span>
                </div>
              </div>

              <div class="nav-section">
                <div class="nav-section-title">GESTION & FINANCE</div>
                <div class="nav-item" data-route="subscriptions" onclick="Router.navigate('subscriptions')">
                  <i class="fas fa-id-card"></i>
                  <span>Abonnements & Pass</span>
                </div>
                <div class="nav-item" data-route="cashRegister" onclick="Router.navigate('cashRegister')">
                  <i class="fas fa-calculator"></i>
                  <span>Caisse & Clôture (Z)</span>
                </div>
                <div class="nav-item" data-route="rates" onclick="Router.navigate('rates')">
                  <i class="fas fa-tags"></i>
                  <span>Grille Tarifaire</span>
                </div>
                <div class="nav-item" data-route="reports" onclick="Router.navigate('reports')">
                  <i class="fas fa-chart-area"></i>
                  <span>Rapports & Fréquentation</span>
                </div>
                <div class="nav-item" data-route="invoices" onclick="Router.navigate('invoices')">
                  <i class="fas fa-file-invoice-dollar"></i>
                  <span>Factures & Reçus</span>
                </div>
                <div class="nav-item" data-route="stock" onclick="Router.navigate('stock')">
                  <i class="fas fa-warehouse"></i>
                  <span>État du Stock</span>
                </div>
                <div class="nav-item" data-route="maintenance" onclick="Router.navigate('maintenance')">
                  <i class="fas fa-wrench" style="color:var(--accent-orange)"></i>
                  <span>Carnet d'Entretien</span>
                </div>
                <div class="nav-item" data-route="clients" onclick="Router.navigate('clients')">
                  <i class="fas fa-users"></i>
                  <span>Clients (CRM)</span>
                </div>
                <div class="nav-item" data-route="accounting" onclick="Router.navigate('accounting')">
                  <i class="fas fa-chart-pie"></i>
                  <span>Comptabilité & Bilan</span>
                </div>
                <div class="nav-item" onclick="Banking.openBankModal()">
                  <i class="fas fa-university"></i>
                  <span>Multi-Comptes Bancaires</span>
                </div>
                <div class="nav-item" onclick="Banking.openBudgetModal(Utils.getCurrentParkingId())">
                  <i class="fas fa-wallet"></i>
                  <span>Budgets & Alertes</span>
                </div>
                <div class="nav-item" onclick="PlateScanner.showLearningStatsModal()">
                  <i class="fas fa-brain"></i>
                  <span>IA & Statistiques LPR</span>
                </div>
              </div>

              <div class="nav-section">
                <div class="nav-section-title">RH & SÉCURITÉ</div>
                <div class="nav-item" data-route="attendance" onclick="Router.navigate('attendance')">
                  <i class="fas fa-user-clock"></i>
                  <span>Pointage RH & Shifts</span>
                </div>
                <div class="nav-item" data-route="audit" onclick="Router.navigate('audit')">
                  <i class="fas fa-user-shield"></i>
                  <span>Journal d'Audit Immuable</span>
                </div>
                <div class="nav-item" data-route="securityPlates" onclick="Router.navigate('securityPlates')">
                  <i class="fas fa-shield-alt"></i>
                  <span>Sécurité Plaques & VIP</span>
                </div>
                <div class="nav-item" data-route="employees" onclick="Router.navigate('employees')">
                  <i class="fas fa-user-tie"></i>
                  <span>Collaborateurs</span>
                </div>
                <div class="nav-item" data-route="settings" onclick="Router.navigate('settings')">
                  <i class="fas fa-cog"></i>
                  <span>Paramètres</span>
                </div>
                <div class="nav-item" onclick="Showroom3D.openShowroomModal(null)" style="color:var(--accent-cyan)">
                  <i class="fas fa-cube"></i>
                  <span>Showroom 3D Studio</span>
                </div>
              </div>
            </nav>

            <div class="sidebar-footer">
              <div class="sidebar-user" onclick="Router.navigate('settings')">
                <div class="sidebar-user-avatar user-avatar-display" style="background:linear-gradient(135deg, var(--primary), var(--accent-cyan))">
                  ${user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : 'MP'}
                </div>
                <div class="sidebar-user-info" style="flex:1">
                  <div class="sidebar-user-name user-name-display">${user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}</div>
                  <div class="sidebar-user-role user-role-display">${user?.role === 'admin' ? 'Administrateur' : 'Collaborateur'}</div>
                </div>
                <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation(); Auth.lockScreen()" title="Verrouiller la session (PIN)" style="color:var(--accent-cyan)">
                  <i class="fas fa-lock"></i>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation(); Auth.logout()" title="Déconnexion" style="color:var(--text-muted)">
                  <i class="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </div>
          </aside>

          <!-- Main Layout -->
          <div class="main-content-wrapper" style="flex:1;display:flex;flex-direction:column;min-width:0">
            <!-- Topbar Header -->
            <header class="main-header">
              <div class="header-left">
                <button class="menu-toggle" id="mobile-menu-btn" aria-label="Menu">
                  <i class="fas fa-bars"></i>
                </button>
                <div class="header-title">
                  <h1>Tableau de bord</h1>
                  <p>Vue d'ensemble de votre activité</p>
                </div>
              </div>

              <div class="header-right">
                <div class="header-search">
                  <i class="fas fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:0.85rem"></i>
                  <input type="text" id="global-search-input" placeholder="Recherche rapide (Entrée)...">
                </div>

                <!-- Currency Quick Switcher (F CFA, €, $, DT) -->
                <button class="topbar-pill-btn hover-lift" id="topbar-currency-badge" onclick="I18n.openCurrencyModal()" title="Changer la Devise (F CFA, €, $)">
                  <span style="font-size:1rem;margin-right:4px">${(typeof I18n !== 'undefined' ? I18n.getCurrencyMeta().flag : '🌍')}</span>
                  <strong>${(typeof I18n !== 'undefined' ? I18n.getCurrencyMeta().symbol : 'F CFA')}</strong>
                </button>

                <!-- Language Quick Switcher (FR, EN, AR) -->
                <button class="topbar-pill-btn hover-lift" id="topbar-language-badge" onclick="I18n.openLanguageModal()" title="Changer la Langue (Français, English, العربية)">
                  <span style="font-size:1rem;margin-right:4px">${(typeof I18n !== 'undefined' ? I18n.languages[I18n.getLanguage()].flag : '🇫🇷')}</span>
                  <strong>${(typeof I18n !== 'undefined' ? I18n.languages[I18n.getLanguage()].name : 'Français')}</strong>
                </button>

                <!-- Universal Accessibility Button -->
                <button class="btn btn-ghost btn-sm btn-icon" onclick="A11y.openModal()" title="Options d'accessibilité (Malvoyants, Voix, Grossissement)" style="color:var(--accent-yellow)">
                  <i class="fas fa-universal-access"></i>
                </button>

                <!-- Dark / Light Theme Quick Toggle -->
                <button class="btn btn-ghost btn-sm btn-icon" onclick="A11y.setTheme(A11y.currentTheme === 'dark' ? 'light' : 'dark')" title="Basculer Mode Sombre / Clair">
                  <i class="fas fa-moon"></i>
                </button>

                <!-- Screen Lock Button -->
                <button class="btn btn-ghost btn-sm btn-icon" onclick="Auth.lockScreen()" title="Verrouiller l'écran (PIN)" style="color:var(--accent-cyan)">
                  <i class="fas fa-lock"></i>
                </button>

                <!-- Camera Plate Scanner Button -->
                <button class="btn btn-primary btn-sm" onclick="PlateScanner.openScannerModal()" style="border-radius:20px;padding:6px 14px;background:linear-gradient(135deg, #00cec9, #0984e3);box-shadow:0 0 15px rgba(0,206,201,0.4)">
                  <i class="fas fa-camera"></i> <span>Scan Plaque</span>
                </button>

                <!-- 3D Studio Quick Launch Button -->
                <button class="btn btn-ghost btn-sm" id="topbar-3d-showroom-btn" style="border:1px solid rgba(108,92,231,0.3);color:var(--accent-cyan)">
                  <i class="fas fa-cube"></i> <span>Studio 3D</span>
                </button>

                <!-- Notifications Bell -->
                <button class="btn btn-ghost btn-sm btn-icon" onclick="Utils.notify('Système opérationnel et synchronisé en local.', 'info')" title="Notifications">
                  <i class="fas fa-bell"></i>
                </button>

                <!-- User Avatar Quick Access -->
                <div class="user-avatar-display" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--primary), var(--accent-purple));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.85rem;cursor:pointer" onclick="Router.navigate('settings')">
                  ${user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : 'AD'}
                </div>
              </div>
            </header>

            <!-- Dynamic View Container -->
            <main class="main-content" id="main-content"></main>
          </div>
        </div>

        <!-- Mobile Bottom Navigation Bar -->
        <nav class="bottom-nav" style="position:fixed;bottom:0;left:0;right:0;height:62px;background:rgba(10,14,26,0.95);backdrop-filter:blur(20px);border-top:1px solid var(--border-color);display:none;justify-content:space-around;align-items:center;z-index:90">
          <div class="bottom-nav-item active" data-route="dashboard" onclick="Router.navigate('dashboard')" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-secondary);font-size:0.75rem;cursor:pointer">
            <i class="fas fa-chart-line" style="font-size:1.1rem"></i>
            <span>Accueil</span>
          </div>
          <div class="bottom-nav-item" data-route="tickets" onclick="Router.navigate('tickets')" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-secondary);font-size:0.75rem;cursor:pointer">
            <i class="fas fa-barcode" style="font-size:1.1rem"></i>
            <span>Tickets</span>
          </div>
          <div class="bottom-nav-item" onclick="PlateScanner.openScannerModal()" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--accent-cyan);font-size:0.75rem;cursor:pointer">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00cec9,#0984e3);display:flex;align-items:center;justify-content:center;color:#fff;margin-top:-14px;box-shadow:0 0 12px rgba(0,206,201,0.5)">
              <i class="fas fa-camera" style="font-size:0.95rem"></i>
            </div>
            <span>Scan</span>
          </div>
          <div class="bottom-nav-item" data-route="accounting" onclick="Router.navigate('accounting')" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-secondary);font-size:0.75rem;cursor:pointer">
            <i class="fas fa-chart-pie" style="font-size:1.1rem"></i>
            <span>Finance</span>
          </div>
          <div class="bottom-nav-item" data-route="vehicles" onclick="Router.navigate('vehicles')" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-secondary);font-size:0.75rem;cursor:pointer">
            <i class="fas fa-car" style="font-size:1.1rem"></i>
            <span>Parc</span>
          </div>
          <div class="bottom-nav-item" data-route="settings" onclick="Router.navigate('settings')" style="display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-secondary);font-size:0.75rem;cursor:pointer">
            <i class="fas fa-cog" style="font-size:1.1rem"></i>
            <span>Réglages</span>
          </div>
        </nav>
      `;
    }

    // Update user info in sidebar & topbar
    const userNameEls = document.querySelectorAll('.user-name-display');
    const userRoleEls = document.querySelectorAll('.user-role-display');
    const parkingNameEls = document.querySelectorAll('.parking-name-display');
    const userAvatarEls = document.querySelectorAll('.user-avatar-display');

    userNameEls.forEach(el => el.textContent = `${user.firstName} ${user.lastName}`);
    userRoleEls.forEach(el => el.textContent = user.role === 'admin' ? 'Administrateur' : (user.role === 'manager' ? 'Responsable' : 'Commercial'));
    parkingNameEls.forEach(el => el.textContent = parking?.name || 'MON PARKING');
    userAvatarEls.forEach(el => {
      el.textContent = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    });

    // Mobile sidebar toggle button
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (menuBtn && sidebar && overlay) {
      menuBtn.onclick = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      };
      overlay.onclick = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      };
    }

    // Topbar global search
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
      globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = globalSearch.value.trim();
          if (q) {
            Router.navigate('vehicles');
            setTimeout(() => {
              const searchBox = document.querySelector('.search-input');
              if (searchBox) {
                searchBox.value = q;
                Vehicles.onSearch(q);
              }
            }, 200);
          }
        }
      });
    }

    // Setup 3D Showroom launch button in topbar
    const showroomBtn = document.getElementById('topbar-3d-showroom-btn');
    if (showroomBtn) {
      showroomBtn.onclick = () => {
        Showroom3D.openShowroomModal(null);
      };
    }

    // Update navigation and topbar labels according to current language & currency
    if (typeof I18n !== 'undefined') {
      I18n.updateNavigationLabels();
      I18n.updateTopbarLabels();
    }
  },

  updateActiveNav(route) {
    // Desktop sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Mobile bottom navigation bar
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            console.log('✅ ServiceWorker registered, scope:', reg.scope);
          })
          .catch(err => {
            console.warn('ServiceWorker registration skipped or failed:', err);
          });
      });
    }
  },

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;

      // Show install banner if not dismissed
      const installBanner = document.getElementById('pwa-install-banner');
      if (installBanner && !localStorage.getItem('pwa_install_dismissed')) {
        installBanner.style.display = 'flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      console.log('🎉 MON PARKING successfully installed as PWA');
      this.deferredInstallPrompt = null;
      const installBanner = document.getElementById('pwa-install-banner');
      if (installBanner) installBanner.style.display = 'none';
      Utils.notify('Application MON PARKING installée avec succès !', 'success');
    });
  },

  async installPWA() {
    if (!this.deferredInstallPrompt) {
      Utils.notify('Pour installer l\'application sur iOS, utilisez le bouton "Partager" puis "Sur l\'écran d\'accueil"', 'info', 6000);
      return;
    }

    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    this.deferredInstallPrompt = null;

    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  },

  dismissInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('pwa_install_dismissed', 'true');
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
