/* ========================================================================
   MON PARKING - Internationalization (i18n) & Multi-Currency Engine
   Languages: Français (FR), English (EN), العربية (AR - RTL)
   Currencies: F CFA (XOF), Euro (€), Dollar ($), Dinar (TND)
   ======================================================================== */

const I18n = {
  currentLang: 'fr',
  currentCurrency: 'XOF', // F CFA by default as requested

  currencies: {
    XOF: { code: 'XOF', symbol: 'F CFA', name: 'Franc CFA (XOF)', flag: '🌍', decimals: 0 },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', flag: '🇪🇺', decimals: 2 },
    USD: { code: 'USD', symbol: '$', name: 'Dollar US ($)', flag: '🇺🇸', decimals: 2 },
    TND: { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien (TND)', flag: '🇹🇳', decimals: 3 }
  },

  languages: {
    fr: { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    en: { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
    ar: { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' }
  },

  translations: {
    fr: {
      // General & Actions
      app_name: 'MON PARKING',
      app_subtitle: 'Gestion Automobile 3D',
      save: 'Enregistrer',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      close: 'Fermer',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      search: 'Recherche rapide (Entrée)...',
      export_csv: 'Exporter CSV',
      status: 'Statut',
      actions: 'Actions',
      date: 'Date',
      amount: 'Montant',
      price: 'Prix',
      client: 'Client',
      vehicle: 'Véhicule',
      plate: 'Plaque d\'immatriculation',
      phone: 'Téléphone',
      email: 'Email',
      all: 'Tous',
      active: 'Actif',
      expired: 'Expiré',
      parked: 'Stationné',
      completed: 'Terminé / Sorti',
      paid: 'Payé',
      pending: 'En attente',
      notifications: 'Notifications',
      system_operational: 'Système opérationnel et synchronisé.',
      currency: 'Devise',
      language: 'Langue',
      choose_currency: 'Choisir la Devise',
      choose_language: 'Choisir la Langue',
      currency_updated: 'Devise mise à jour : ',
      language_updated: 'Langue modifiée avec succès : ',

      // Navigation
      nav_section_main: 'PRINCIPAL',
      nav_section_mgmt: 'GESTION & FINANCE',
      nav_section_hr: 'RH & SÉCURITÉ',
      nav_dashboard: 'Tableau de bord',
      nav_tickets: 'Tickets & Barrière',
      nav_slots: 'Plan des Places (2D)',
      nav_vehicles: 'Parc Véhicules',
      nav_sales: 'Ventes',
      nav_rentals: 'Locations',
      nav_subscriptions: 'Abonnements & Pass',
      nav_cashRegister: 'Caisse & Clôture (Z)',
      nav_rates: 'Grille Tarifaire',
      nav_reports: 'Rapports & Fréquentation',
      nav_invoices: 'Factures & Reçus',
      nav_stock: 'État du Stock',
      nav_maintenance: 'Carnet d\'Entretien',
      nav_clients: 'Clients (CRM)',
      nav_accounting: 'Comptabilité & Bilan',
      nav_banking: 'Multi-Comptes Bancaires',
      nav_budget: 'Budgets & Alertes',
      nav_ai_stats: 'IA & Statistiques LPR',
      nav_attendance: 'Pointage RH & Shifts',
      nav_audit: 'Journal d\'Audit Immuable',
      nav_securityPlates: 'Sécurité Plaques & VIP',
      nav_employees: 'Collaborateurs',
      nav_settings: 'Paramètres',
      nav_showroom3d: 'Showroom 3D Studio',

      // Topbar buttons
      scan_plate: 'Scan Plaque',
      studio_3d: 'Studio 3D',
      lock_screen: 'Verrouiller l\'écran (PIN)',
      toggle_theme: 'Basculer Thème Sombre / Clair',
      a11y_options: 'Options d\'accessibilité',

      // Settings headers
      settings_title: 'Paramètres Généraux',
      settings_subtitle: 'Configurez votre agence de parking et vos préférences',
      settings_agency_info: 'Informations du Parking Automobile',
      settings_agency_name: 'Nom commercial du Parking *',
      settings_preferences: 'Préférences & Régionalisation',
      settings_currency_label: 'Devise Monétaire Principale',
      settings_currency_desc: 'Choisissez la devise affichée sur toutes les ventes, caisses et reçus',
      settings_lang_label: 'Langue de l\'Application',
      settings_lang_desc: 'Basculez entre Français, Anglais et Arabe avec support RTL complet',
      settings_security: 'Sécurité Renforcée & Authentification',
      settings_lock_pin: 'Code PIN de Verrouillage d\'Écran',
      settings_configure_pin: 'Configurer PIN',
      settings_save_btn: 'Enregistrer les Paramètres',

      // Quick switcher titles
      quick_currency_title: 'Changer la devise',
      quick_lang_title: 'Changer la langue'
    },

    en: {
      // General & Actions
      app_name: 'MY PARKING',
      app_subtitle: '3D Automotive Management',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Quick search (Press Enter)...',
      export_csv: 'Export CSV',
      status: 'Status',
      actions: 'Actions',
      date: 'Date',
      amount: 'Amount',
      price: 'Price',
      client: 'Customer',
      vehicle: 'Vehicle',
      plate: 'License Plate',
      phone: 'Phone',
      email: 'Email',
      all: 'All',
      active: 'Active',
      expired: 'Expired',
      parked: 'Parked',
      completed: 'Completed / Exited',
      paid: 'Paid',
      pending: 'Pending',
      notifications: 'Notifications',
      system_operational: 'System operational and synchronized.',
      currency: 'Currency',
      language: 'Language',
      choose_currency: 'Choose Currency',
      choose_language: 'Choose Language',
      currency_updated: 'Currency updated: ',
      language_updated: 'Language successfully changed: ',

      // Navigation
      nav_section_main: 'MAIN',
      nav_section_mgmt: 'MANAGEMENT & FINANCE',
      nav_section_hr: 'HR & SECURITY',
      nav_dashboard: 'Dashboard',
      nav_tickets: 'Tickets & Barrier',
      nav_slots: 'Parking Slots (2D)',
      nav_vehicles: 'Vehicle Fleet',
      nav_sales: 'Sales',
      nav_rentals: 'Rentals',
      nav_subscriptions: 'Subscriptions & Passes',
      nav_cashRegister: 'Cash Register & Z-Report',
      nav_rates: 'Tariff Rates',
      nav_reports: 'Reports & Analytics',
      nav_invoices: 'Invoices & Receipts',
      nav_stock: 'Stock Inventory',
      nav_maintenance: 'Maintenance Log',
      nav_clients: 'Clients (CRM)',
      nav_accounting: 'Accounting & Balance',
      nav_banking: 'Multi-Bank Accounts',
      nav_budget: 'Budgets & Alerts',
      nav_ai_stats: 'AI & LPR Statistics',
      nav_attendance: 'HR Attendance & Shifts',
      nav_audit: 'Immutable Audit Log',
      nav_securityPlates: 'Plate Security & VIP',
      nav_employees: 'Employees & Staff',
      nav_settings: 'Settings',
      nav_showroom3d: '3D Showroom Studio',

      // Topbar buttons
      scan_plate: 'Scan Plate',
      studio_3d: '3D Studio',
      lock_screen: 'Lock Screen (PIN)',
      toggle_theme: 'Toggle Dark / Light Theme',
      a11y_options: 'Accessibility Options',

      // Settings headers
      settings_title: 'General Settings',
      settings_subtitle: 'Configure your parking branch and regional preferences',
      settings_agency_info: 'Car Parking Information',
      settings_agency_name: 'Commercial Parking Name *',
      settings_preferences: 'Preferences & Regional Settings',
      settings_currency_label: 'Main Operational Currency',
      settings_currency_desc: 'Select the currency displayed across all sales, registers, and receipts',
      settings_lang_label: 'Application Language',
      settings_lang_desc: 'Switch between French, English, and Arabic with full RTL support',
      settings_security: 'Enhanced Security & Authentication',
      settings_lock_pin: 'Screen Lock PIN Code',
      settings_configure_pin: 'Configure PIN',
      settings_save_btn: 'Save Settings',

      // Quick switcher titles
      quick_currency_title: 'Change Currency',
      quick_lang_title: 'Change Language'
    },

    ar: {
      // General & Actions
      app_name: 'موقفي الذكي',
      app_subtitle: 'إدارة مواقف السيارات وثلاثية الأبعاد',
      save: 'حفظ',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      close: 'إغلاق',
      delete: 'حذف',
      edit: 'تعديل',
      add: 'إضافة',
      search: 'بحث سريع (اضغط Enter)...',
      export_csv: 'تصدير CSV',
      status: 'الحالة',
      actions: 'إجراءات',
      date: 'التاريخ',
      amount: 'المبلغ',
      price: 'السعر',
      client: 'العميل',
      vehicle: 'المركبة',
      plate: 'لوحة التسجيل',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      all: 'الكل',
      active: 'نشط',
      expired: 'منتهي الصلاحية',
      parked: 'متوقف في الموقف',
      completed: 'مكتمل / غادر',
      paid: 'مدفوع',
      pending: 'قيد الانتظار',
      notifications: 'الإشعارات',
      system_operational: 'النظام يعمل وجاهز ومُزامن محلياً.',
      currency: 'العملة',
      language: 'اللغة',
      choose_currency: 'اختر العملة',
      choose_language: 'اختر اللغة',
      currency_updated: 'تم تحديث العملة : ',
      language_updated: 'تم تغيير لغة التطبيق بنجاح : ',

      // Navigation
      nav_section_main: 'الرئيسية',
      nav_section_mgmt: 'الإدارة والمالية',
      nav_section_hr: 'الموارد البشرية والأمان',
      nav_dashboard: 'لوحة القيادة',
      nav_tickets: 'التذاكر والحاجز',
      nav_slots: 'مخطط الأماكن (2D)',
      nav_vehicles: 'أسطول المركبات',
      nav_sales: 'المبيعات',
      nav_rentals: 'الإيجارات',
      nav_subscriptions: 'الاشتراكات والبطاقات',
      nav_cashRegister: 'الصندوق والتقرير اليومي (Z)',
      nav_rates: 'جدول الأسعار والتعريفات',
      nav_reports: 'التقارير والإحصائيات',
      nav_invoices: 'الفواتير والإيصالات',
      nav_stock: 'حالة المخزون',
      nav_maintenance: 'سجل الصيانة',
      nav_clients: 'إدارة العملاء (CRM)',
      nav_accounting: 'المحاسبة والميزانية',
      nav_banking: 'الحسابات المصرفية المتعددة',
      nav_budget: 'الميزانيات والتنبيهات',
      nav_ai_stats: 'الذكاء الاصطناعي وإحصائيات LPR',
      nav_attendance: 'حضور الموظفين والمناوبات',
      nav_audit: 'سجل التدقيق الأمني المحمي',
      nav_securityPlates: 'أمان اللوحات وقائمة VIP',
      nav_employees: 'فريق العمل والموظفون',
      nav_settings: 'الإعدادات العامة',
      nav_showroom3d: 'استوديو العرض ثلاثي الأبعاد',

      // Topbar buttons
      scan_plate: 'مسح اللوحة',
      studio_3d: 'استوديو 3D',
      lock_screen: 'قفل الشاشة (PIN)',
      toggle_theme: 'تبديل المظهر داكن / فاتح',
      a11y_options: 'خيارات سهولة الوصول',

      // Settings headers
      settings_title: 'الإعدادات العامة',
      settings_subtitle: 'تهيئة فرع الموقف والتفضيلات الإقليمية والعملة',
      settings_agency_info: 'بيانات منشأة موقف السيارات',
      settings_agency_name: 'الاسم التجاري للموقف *',
      settings_preferences: 'التفضيلات والإعدادات الإقليمية',
      settings_currency_label: 'العملة النقدية الرئيسية',
      settings_currency_desc: 'حدد العملة المعروضة في جميع المبيعات والصناديق والإيصالات',
      settings_lang_label: 'لغة التطبيق',
      settings_lang_desc: 'التبديل بين العربية والفرنسية والإنجليزية مع دعم كامل لاتجاه اليمين إلى اليسار (RTL)',
      settings_security: 'الأمان المتقدم والتحقق الثنائي',
      settings_lock_pin: 'رمز PIN لقفل الشاشة',
      settings_configure_pin: 'تهيئة رمز PIN',
      settings_save_btn: 'حفظ جميع الإعدادات',

      // Quick switcher titles
      quick_currency_title: 'تغيير العملة',
      quick_lang_title: 'تغيير اللغة'
    }
  },

  init() {
    // 1. Read stored currency or default to XOF (F CFA)
    const savedCurr = localStorage.getItem('app_currency');
    if (savedCurr && this.currencies[savedCurr]) {
      this.currentCurrency = savedCurr;
    } else {
      this.currentCurrency = 'XOF';
      localStorage.setItem('app_currency', 'XOF');
    }

    // 2. Read stored language or default to 'fr'
    const savedLang = localStorage.getItem('app_language');
    if (savedLang && this.languages[savedLang]) {
      this.currentLang = savedLang;
    } else {
      this.currentLang = 'fr';
      localStorage.setItem('app_language', 'fr');
    }

    // Apply document direction and attributes
    this.applyDocumentDirection();
  },

  getLanguage() {
    return this.currentLang || 'fr';
  },

  getCurrency() {
    return this.currentCurrency || 'XOF';
  },

  getCurrencyMeta() {
    return this.currencies[this.getCurrency()] || this.currencies.XOF;
  },

  t(key, fallback = '') {
    const lang = this.getLanguage();
    const dict = this.translations[lang] || this.translations.fr;
    return dict[key] || this.translations.fr[key] || fallback || key;
  },

  applyDocumentDirection() {
    const lang = this.getLanguage();
    const isRTL = lang === 'ar';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    if (isRTL) {
      document.body.classList.add('rtl-mode');
    } else {
      document.body.classList.remove('rtl-mode');
    }
  },

  async setLanguage(lang) {
    if (!this.languages[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('app_language', lang);

    this.applyDocumentDirection();

    // Broadcast sync to other tabs/devices
    if (window.Sync && Sync.broadcast) {
      Sync.broadcast('LANGUAGE_CHANGED', { language: lang });
    }

    // Update static and dynamic elements in DOM
    this.updateNavigationLabels();
    this.updateTopbarLabels();

    // Re-render current page
    if (window.Router && Router.currentRoute) {
      Router.loadRoute(Router.currentRoute);
    }

    Utils.notify(this.t('language_updated') + this.languages[lang].name, 'success');
  },

  async setCurrency(curr) {
    if (!this.currencies[curr]) return;
    this.currentCurrency = curr;
    localStorage.setItem('app_currency', curr);

    // Save in current parking record if exists
    try {
      const parkingId = Utils.getCurrentParkingId();
      if (parkingId && window.DB) {
        const parking = await DB.get('parkings', parkingId);
        if (parking) {
          parking.currency = curr;
          await DB.update('parkings', parking);
        }
      }
    } catch (e) {
      console.warn('Could not update parking record currency', e);
    }

    // Broadcast sync
    if (window.Sync && Sync.broadcast) {
      Sync.broadcast('CURRENCY_CHANGED', { currency: curr });
    }

    // Update quick badges
    this.updateTopbarLabels();

    // Re-render current view to format all amounts with the new currency
    if (window.Router && Router.currentRoute) {
      Router.loadRoute(Router.currentRoute);
    }

    Utils.notify(this.t('currency_updated') + this.currencies[curr].name, 'success');
  },

  formatCurrency(amount, customCurrency) {
    const val = Number(amount) || 0;
    const curr = customCurrency || this.getCurrency();
    const lang = this.getLanguage();

    switch (curr) {
      case 'XOF':
      case 'FCFA': {
        const num = new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : (lang === 'en' ? 'en-US' : 'fr-FR'), {
          maximumFractionDigits: 0
        }).format(Math.round(val));
        const label = lang === 'ar' ? 'فرنك سيفا' : (lang === 'en' ? 'FCFA' : 'F CFA');
        return `${num} ${label}`;
      }

      case 'EUR': {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : (lang === 'en' ? 'en-IE' : 'fr-FR'), {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: (val % 1 !== 0) ? 2 : 0,
          maximumFractionDigits: 2
        }).format(val);
      }

      case 'USD': {
        return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : (lang === 'en' ? 'en-US' : 'fr-FR'), {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: (val % 1 !== 0) ? 2 : 0,
          maximumFractionDigits: 2
        }).format(val);
      }

      case 'TND':
      default: {
        const num = new Intl.NumberFormat(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3
        }).format(val);
        const label = lang === 'ar' ? 'د.ت' : (lang === 'en' ? 'TND' : 'DT');
        return `${num} ${label}`;
      }
    }
  },

  updateNavigationLabels() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-route]');
    navItems.forEach(item => {
      const route = item.getAttribute('data-route');
      const span = item.querySelector('span');
      const key = 'nav_' + route;
      if (span && this.translations[this.currentLang][key]) {
        span.textContent = this.t(key);
      }
    });

    // Update section titles
    const sections = document.querySelectorAll('.nav-section-title');
    if (sections[0]) sections[0].textContent = this.t('nav_section_main');
    if (sections[1]) sections[1].textContent = this.t('nav_section_mgmt');
    if (sections[2]) sections[2].textContent = this.t('nav_section_hr');
  },

  updateTopbarLabels() {
    // Update currency badge
    const currBadge = document.getElementById('topbar-currency-badge');
    if (currBadge) {
      const meta = this.getCurrencyMeta();
      currBadge.innerHTML = `<span style="font-size:1rem;margin-right:4px">${meta.flag}</span> <strong>${meta.symbol}</strong>`;
    }

    // Update language badge
    const langBadge = document.getElementById('topbar-language-badge');
    if (langBadge) {
      const meta = this.languages[this.getLanguage()];
      langBadge.innerHTML = `<span style="font-size:1rem;margin-right:4px">${meta.flag}</span> <strong>${meta.name}</strong>`;
    }

    // Update quick search placeholder
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.placeholder = this.t('search');
    }
  },

  openLanguageModal() {
    const cur = this.getLanguage();
    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 8px">
          ${this.t('settings_lang_desc')}
        </p>

        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          ${Object.values(this.languages).map(l => {
            const isSelected = l.code === cur;
            return `
              <div onclick="I18n.setLanguage('${l.code}'); Utils.closeModal();" 
                   style="cursor:pointer;padding:14px 18px;border-radius:12px;background:${isSelected ? 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(0,206,201,0.2))' : 'var(--bg-glass)'};border:2px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'};display:flex;align-items:center;justify-content:space-between;transition:all var(--transition-fast)" 
                   class="hover-lift">
                <div style="display:flex;align-items:center;gap:14px">
                  <span style="font-size:1.8rem">${l.flag}</span>
                  <div>
                    <div style="font-weight:800;font-size:1.05rem;color:var(--text-main)">${l.name}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">${l.dir.toUpperCase()} Mode · ${l.code.toUpperCase()}</div>
                  </div>
                </div>
                ${isSelected ? '<span class="badge badge-success"><i class="fas fa-check"></i> Actif</span>' : '<button class="btn btn-ghost btn-sm">Sélectionner</button>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    Utils.showModal(this.t('choose_language'), html, {
      hideFooter: true,
      size: 'modal-md'
    });
  },

  openCurrencyModal() {
    const cur = this.getCurrency();
    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 8px">
          ${this.t('settings_currency_desc')}
        </p>

        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          ${Object.values(this.currencies).map(c => {
            const isSelected = c.code === cur;
            const sample = this.formatCurrency(125000, c.code);
            return `
              <div onclick="I18n.setCurrency('${c.code}'); Utils.closeModal();" 
                   style="cursor:pointer;padding:14px 18px;border-radius:12px;background:${isSelected ? 'linear-gradient(135deg, rgba(108,92,231,0.25), rgba(0,206,201,0.2))' : 'var(--bg-glass)'};border:2px solid ${isSelected ? 'var(--accent-green)' : 'var(--border-color)'};display:flex;align-items:center;justify-content:space-between;transition:all var(--transition-fast)" 
                   class="hover-lift">
                <div style="display:flex;align-items:center;gap:14px">
                  <span style="font-size:1.8rem">${c.flag}</span>
                  <div>
                    <div style="font-weight:800;font-size:1.05rem;color:var(--text-main)">${c.name}</div>
                    <div style="font-size:0.85rem;color:var(--accent-cyan);font-weight:700">Exemple : ${sample}</div>
                  </div>
                </div>
                ${isSelected ? '<span class="badge badge-success"><i class="fas fa-check"></i> Actif</span>' : '<button class="btn btn-ghost btn-sm">Choisir</button>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    Utils.showModal(this.t('choose_currency'), html, {
      hideFooter: true,
      size: 'modal-md'
    });
  }
};

// Initialize i18n immediately upon script load
I18n.init();
window.I18n = I18n;
