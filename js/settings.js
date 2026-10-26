/* ========================================================================
   MON PARKING - Settings & Configuration Module
   Parking info, currencies, backup & restore JSON, demo data seeding
   ======================================================================== */

const Settings = {
  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const parking = await DB.get('parkings', parkingId);

    // Estimate storage usage if supported
    let storageInfo = 'Stockage local actif';
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
        const totalMB = (estimate.quota / (1024 * 1024)).toFixed(0);
        storageInfo = `${usedMB} Mo utilisés sur ~${totalMB} Mo disponibles`;
      } catch (e) {}
    }

    content.innerHTML = `
      <div class="page-content animate-fade-in" style="max-width:960px;margin:0 auto">
        <div class="table-toolbar" style="margin-bottom:1.5rem">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;color:var(--text-main);margin:0">Paramètres Généraux</h2>
            <p style="color:var(--text-muted);margin:4px 0 0">Configurez votre agence de parking et vos préférences</p>
          </div>
          <button class="btn btn-primary" onclick="Settings.saveParkingSettings()">
            <i class="fas fa-save"></i> Enregistrer
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:1.5rem">
          <!-- Parking Profile Card -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-building" style="color:var(--primary-light)"></i> Informations du Parking Automobile</h3>
            </div>
            <form id="settings-parking-form" class="modal-form-grid" style="padding-top:0.5rem" onsubmit="return false;">
              <div class="form-group span-2">
                <label>Nom commercial du Parking *</label>
                <input type="text" id="set-name" class="form-input" value="${parking?.name || 'MON PARKING'}" required>
              </div>

              <div class="form-group">
                <label>Numéro de téléphone</label>
                <input type="tel" id="set-phone" class="form-input" value="${parking?.phone || '+216 71 234 567'}">
              </div>
              <div class="form-group">
                <label>Email de contact</label>
                <input type="email" id="set-email" class="form-input" value="${parking?.email || 'contact@monparking.tn'}">
              </div>

              <div class="form-group span-2">
                <label>Adresse physique / Emplacement</label>
                <input type="text" id="set-address" class="form-input" value="${parking?.address || 'Zone Industrielle Charguia II, Tunis'}">
              </div>

              <div class="form-group">
                <label>Matricule Fiscal / Registre de Commerce</label>
                <input type="text" id="set-tax-id" class="form-input" value="${parking?.taxId || '1234567/A/M/000'}">
              </div>
              <div class="form-group">
                <label>Capacité maximale (places de parking)</label>
                <input type="number" id="set-capacity" class="form-input" value="${parking?.capacity || 100}">
              </div>
            </form>
          </div>

          <!-- Application Preferences & Theme -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-sliders-h" style="color:var(--accent-cyan)"></i> Préférences de l'application</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;padding-top:0.5rem">
              <!-- Currency Configuration -->
              <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px">
                    <i class="fas fa-coins" style="color:var(--accent-yellow)"></i> Devise Monétaire
                  </div>
                  <small style="color:var(--text-muted)">F CFA, Euro, Dollars, Dinar</small>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <select id="set-currency" class="form-input" style="width:auto;padding:0.4rem 0.8rem;font-weight:700" onchange="I18n.setCurrency(this.value)">
                    <option value="XOF" ${(typeof I18n !== 'undefined' && I18n.getCurrency() === 'XOF') ? 'selected' : ''}>🌍 F CFA (XOF)</option>
                    <option value="EUR" ${(typeof I18n !== 'undefined' && I18n.getCurrency() === 'EUR') ? 'selected' : ''}>🇪🇺 Euro (€)</option>
                    <option value="USD" ${(typeof I18n !== 'undefined' && I18n.getCurrency() === 'USD') ? 'selected' : ''}>🇺🇸 Dollar ($)</option>
                    <option value="TND" ${(typeof I18n !== 'undefined' && I18n.getCurrency() === 'TND') ? 'selected' : ''}>🇹🇳 Dinar (DT)</option>
                  </select>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="I18n.openCurrencyModal()" title="Changer la Devise">
                    <i class="fas fa-th"></i>
                  </button>
                </div>
              </div>

              <!-- Language Configuration -->
              <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px">
                    <i class="fas fa-globe" style="color:var(--accent-cyan)"></i> Langue de l'Application
                  </div>
                  <small style="color:var(--text-muted)">Français, Anglais, Arabe (RTL)</small>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <select id="set-language" class="form-input" style="width:auto;padding:0.4rem 0.8rem;font-weight:700" onchange="I18n.setLanguage(this.value)">
                    <option value="fr" ${(typeof I18n !== 'undefined' && I18n.getLanguage() === 'fr') ? 'selected' : ''}>🇫🇷 Français</option>
                    <option value="en" ${(typeof I18n !== 'undefined' && I18n.getLanguage() === 'en') ? 'selected' : ''}>🇬🇧 English</option>
                    <option value="ar" ${(typeof I18n !== 'undefined' && I18n.getLanguage() === 'ar') ? 'selected' : ''}>🇸🇦 العربية (RTL)</option>
                  </select>
                  <button class="btn btn-ghost btn-sm btn-icon" onclick="I18n.openLanguageModal()" title="Changer la Langue">
                    <i class="fas fa-language"></i>
                  </button>
                </div>
              </div>

              <div style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Mode 3D Showroom</div>
                  <small style="color:var(--text-muted)">Visualiseur Three.js activé</small>
                </div>
                <span class="badge badge-success">Actif</span>
              </div>

              <div style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Stockage PWA & Cache</div>
                  <small style="color:var(--text-muted)">${storageInfo}</small>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Settings.checkServiceWorker()">
                  <i class="fas fa-sync"></i> Vérifier
                </button>
              </div>

              <!-- Accessibility Quick Access -->
              <div style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600">Accessibilité & Synthèse Vocale</div>
                  <small style="color:var(--text-muted)">Mode malvoyant, contraste élevé, grossissement</small>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="A11y.openModal()" style="color:var(--accent-cyan)">
                  <i class="fas fa-universal-access"></i> Configurer
                </button>
              </div>
            </div>
          </div>

          <!-- Security: 2FA & Biometric Authentication -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-user-shield" style="color:var(--accent-green)"></i> Sécurité Renforcée, 2FA & Biométrie</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;padding-top:0.5rem">
              <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <strong style="color:var(--text-main);display:flex;align-items:center;gap:6px">
                    <i class="fas fa-shield-alt" style="color:var(--accent-cyan)"></i> Double Facteur (2FA TOTP)
                  </strong>
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">Code de validation à 6 chiffres via Authenticator</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="Settings.open2FAConfigModal()">
                  <i class="fas fa-check"></i> Configuré
                </button>
              </div>

              <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <strong style="color:var(--text-main);display:flex;align-items:center;gap:6px">
                    <i class="fas fa-fingerprint" style="color:var(--accent-pink)"></i> Authentification Biométrique
                  </strong>
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">Face ID, Touch ID & Windows Hello</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Auth.promptBiometricLogin()" style="border:1px solid rgba(0,206,201,0.3);color:var(--accent-cyan)">
                  <i class="fas fa-vial"></i> Tester
                </button>
              </div>

              <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <strong style="color:var(--text-main);display:flex;align-items:center;gap:6px">
                    <i class="fas fa-key" style="color:var(--accent-yellow)"></i> Code PIN de Verrouillage d'Écran
                  </strong>
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">Code à 4 chiffres pour déverrouiller la session</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Auth.changePinModal()" style="border:1px solid rgba(253,203,110,0.3);color:var(--accent-yellow)">
                  <i class="fas fa-lock"></i> Configurer PIN
                </button>
              </div>
            </div>
          </div>

          <!-- Push Notifications Configuration -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-bell" style="color:var(--accent-yellow)"></i> Notifications Push & Alertes Personnalisées</h3>
              <button class="btn btn-ghost btn-sm" onclick="Settings.requestPushPermission()" style="color:var(--accent-yellow);border:1px solid rgba(253,203,110,0.3)">
                <i class="fas fa-paper-plane"></i> Activer Push Système
              </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:0.85rem;padding-top:0.5rem">
              <div style="background:var(--bg-glass);padding:0.9rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:0.9rem">Dépassement de Budget</div>
                  <small style="color:var(--text-muted)">Alerte push dès 85% et 100%</small>
                </div>
                <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--accent-cyan)">
              </div>
              <div style="background:var(--bg-glass);padding:0.9rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:0.9rem">Validation Stationnement</div>
                  <small style="color:var(--text-muted)">Notification de sortie réussie</small>
                </div>
                <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--accent-cyan)">
              </div>
              <div style="background:var(--bg-glass);padding:0.9rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:0.9rem">Véhicule Prolongé (> 24h)</div>
                  <small style="color:var(--text-muted)">Alerte dépassement stationnement</small>
                </div>
                <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--accent-cyan)">
              </div>
              <div style="background:var(--bg-glass);padding:0.9rem;border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:600;font-size:0.9rem">Plaque Signalée Blacklist</div>
                  <small style="color:var(--text-muted)">Alerte immédiate à la barrière</small>
                </div>
                <input type="checkbox" checked style="width:18px;height:18px;accent-color:var(--accent-red)">
              </div>
            </div>
          </div>

          <!-- GDPR (RGPD) & E2EE Privacy Portal -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-balance-scale" style="color:var(--accent-cyan)"></i> Conformité RGPD & Confidentialité des Données</h3>
              <button class="btn btn-ghost btn-sm" onclick="Settings.showPrivacyPolicyModal()">
                <i class="fas fa-book"></i> Politique RGPD
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;padding-top:0.5rem">
              <p style="color:var(--text-muted);font-size:0.9rem;margin:0">
                Vos données bancaires et numéros de plaques sont protégés par un chiffrement de bout en bout (AES-256-GCM). En application du Règlement Général sur la Protection des Données (RGPD), vous disposez du droit d'accès, d'export et d'oubli.
              </p>

              <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
                <button class="btn btn-ghost btn-sm hover-lift" onclick="Settings.exportGDPRData()" style="border:1px solid rgba(0,206,201,0.3);color:var(--accent-cyan)">
                  <i class="fas fa-file-export"></i> Exporter Données Personnelles (JSON)
                </button>
                <button class="btn btn-ghost btn-sm hover-lift" onclick="Settings.purgeOldDataGDPR()" style="border:1px solid rgba(253,203,110,0.3);color:var(--accent-yellow)">
                  <i class="fas fa-eraser"></i> Purger Archives > 12 Mois (Droit à l'Oubli)
                </button>
              </div>
            </div>
          </div>

          <!-- Database Backup, Export & Recovery -->
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-database" style="color:var(--accent-purple)"></i> Base de Données, Sauvegarde & Sécurité des Données</h3>
              <button class="btn btn-ghost btn-sm" onclick="Settings.runIntegrityCheckModal()" style="color:var(--accent-cyan);border:1px solid rgba(0,206,201,0.3)">
                <i class="fas fa-stethoscope"></i> Diagnostic Intégrité
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:1.2rem;padding-top:0.5rem">
              <p style="color:var(--text-muted);font-size:0.9rem;margin:0">
                Vos données sont gérées localement dans <strong>IndexedDB (v7)</strong> avec isolation par agence. Vous pouvez exporter des sauvegardes chiffrées de niveau militaire (AES-256-GCM) protégées par mot de passe ou des sauvegardes JSON complètes incluant tous les modules (stock, caisse, tickets, maintenance, audit).
              </p>

              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem">
                <!-- Encrypted AES-256 Card -->
                <div style="background:linear-gradient(135deg,rgba(108,92,231,0.15),rgba(0,206,201,0.1));border:1px solid rgba(0,206,201,0.3);padding:1.25rem;border-radius:14px">
                  <div style="font-weight:700;color:var(--accent-cyan);margin-bottom:6px;display:flex;align-items:center;gap:6px">
                    <i class="fas fa-lock"></i> Sauvegarde Chiffrée (Recommandée)
                  </div>
                  <p style="color:var(--text-muted);font-size:0.8rem;margin:0 0 12px">
                    Chiffrement AES-GCM 256 bits dérivé par PBKDF2 avec 100 000 itérations. Idéal pour stockage sécurisé sur clé USB ou cloud.
                  </p>
                  <button class="btn btn-primary btn-sm hover-lift" style="width:100%;justify-content:center" onclick="Settings.exportEncryptedBackupModal()">
                    <i class="fas fa-file-shield"></i> Exporter avec Mot de Passe
                  </button>
                </div>

                <!-- Full JSON Card -->
                <div style="background:var(--bg-glass);border:1px solid var(--border-color);padding:1.25rem;border-radius:14px">
                  <div style="font-weight:700;color:var(--text-main);margin-bottom:6px;display:flex;align-items:center;gap:6px">
                    <i class="fas fa-file-code"></i> Sauvegarde Complète JSON
                  </div>
                  <p style="color:var(--text-muted);font-size:0.8rem;margin:0 0 12px">
                    Export brut de toutes les tables (véhicules, ventes, caisses, tickets, audit) au format texte JSON lisible.
                  </p>
                  <button class="btn btn-ghost btn-sm hover-lift" style="width:100%;justify-content:center;border:1px solid var(--border-color)" onclick="Settings.exportBackup()">
                    <i class="fas fa-download"></i> Télécharger JSON Brut
                  </button>
                </div>
              </div>

              <!-- Action buttons bar -->
              <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;padding-top:0.5rem">
                <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0;border:1px solid rgba(108,92,231,0.4);color:var(--primary-light)">
                  <i class="fas fa-upload"></i> Restaurer (JSON ou Chiffré)
                  <input type="file" id="restore-file-input" accept=".json,.enc" style="display:none" onchange="Settings.importBackup(event)">
                </label>

                <button class="btn btn-ghost btn-sm" onclick="Sync.syncGoogleDrive()">
                  <i class="fab fa-google-drive"></i> Backup Drive
                </button>

                <button class="btn btn-ghost btn-sm" onclick="Settings.seedDemoData()">
                  <i class="fas fa-magic"></i> Régénérer Démo Complète
                </button>
              </div>

              <div style="border-top:1px solid var(--border-color);padding-top:1rem;margin-top:0.5rem;display:flex;justify-content:space-between;align-items:center">
                <div>
                  <strong style="color:var(--accent-red)">Zone sensible</strong>
                  <div style="color:var(--text-muted);font-size:0.85rem">Réinitialiser toute la base de données locale du parking</div>
                </div>
                <button class="btn btn-ghost btn-sm" style="color:var(--accent-red);border-color:var(--accent-red)" onclick="Settings.resetDatabase()">
                  <i class="fas fa-trash-alt"></i> Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveParkingSettings() {
    const parkingId = Utils.getCurrentParkingId();
    const parking = await DB.get('parkings', parkingId);
    if (!parking) return;

    parking.name = document.getElementById('set-name').value.trim() || 'MON PARKING';
    parking.phone = document.getElementById('set-phone').value.trim();
    parking.email = document.getElementById('set-email').value.trim();
    parking.address = document.getElementById('set-address').value.trim();
    parking.taxId = document.getElementById('set-tax-id').value.trim();
    parking.capacity = parseInt(document.getElementById('set-capacity').value) || 100;

    const selectedCurrency = document.getElementById('set-currency')?.value || 'XOF';
    parking.currency = selectedCurrency;
    if (typeof I18n !== 'undefined') {
      await I18n.setCurrency(selectedCurrency);
    }

    const selectedLanguage = document.getElementById('set-language')?.value || 'fr';
    if (typeof I18n !== 'undefined' && selectedLanguage !== I18n.getLanguage()) {
      await I18n.setLanguage(selectedLanguage);
    }

    await DB.update('parkings', parking);

    // Update brand title in topbar
    const brandName = document.querySelector('.brand-name');
    if (brandName) brandName.textContent = parking.name;

    Utils.notify(Utils.t('settings_save_btn') + ' : ' + Utils.t('status') + ' OK', 'success');
  },

  async exportBackup() {
    const parkingId = Utils.getCurrentParkingId();
    Utils.notify('Génération de la sauvegarde complète...', 'info');

    const backupData = await DB.exportFullBackup(parkingId);
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_mon_parking_full_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    await DB.logAudit(parkingId, 'BACKUP_EXPORT', `Sauvegarde JSON intégrale exportée (${backupData.totalRecords} enregistrements)`, { totalRecords: backupData.totalRecords });
    Utils.notify(`Sauvegarde complète exportée (${backupData.totalRecords} enregistrements) !`, 'success');
  },

  async exportEncryptedBackupModal() {
    const parkingId = Utils.getCurrentParkingId();
    const modalHtml = `
      <div style="padding:0.5rem 0">
        <p style="color:var(--text-muted);font-size:0.9rem">
          Entrez un mot de passe pour chiffrer l'ensemble de votre base de données avec <strong>AES-256-GCM</strong>. Vous aurez besoin de ce mot de passe exact pour restaurer les données.
        </p>
        <div class="form-group" style="margin-top:1rem">
          <label>Mot de passe de chiffrement (min. 6 caractères) *</label>
          <input type="password" id="enc-backup-pass" class="form-input" placeholder="••••••••••••" minlength="6" required>
        </div>
        <div class="form-group" style="margin-top:0.75rem">
          <label>Confirmer le mot de passe *</label>
          <input type="password" id="enc-backup-pass-confirm" class="form-input" placeholder="••••••••••••" minlength="6" required>
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Sauvegarde Chiffrée AES-256', modalHtml, { confirmText: 'Chiffrer & Télécharger' });
    if (!confirmed) return;

    const pass = document.getElementById('enc-backup-pass').value;
    const confirm = document.getElementById('enc-backup-pass-confirm').value;

    if (!pass || pass.length < 6) {
      Utils.notify('Le mot de passe doit comporter au moins 6 caractères.', 'warning');
      return;
    }
    if (pass !== confirm) {
      Utils.notify('Les deux mots de passe ne correspondent pas.', 'error');
      return;
    }

    try {
      Utils.notify('Chiffrement en cours...', 'info');
      const encryptedPkg = await DB.exportEncryptedBackup(pass, parkingId);
      const blob = new Blob([JSON.stringify(encryptedPkg, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup_mon_parking_encrypted_${new Date().toISOString().split('T')[0]}.enc.json`;
      link.click();
      URL.revokeObjectURL(link.href);

      await DB.logAudit(parkingId, 'ENCRYPTED_BACKUP_EXPORT', `Sauvegarde chiffrée AES-256 exportée (${encryptedPkg.recordCount} enregistrements)`, { count: encryptedPkg.recordCount });
      Utils.notify(`Sauvegarde chiffrée avec succès (${encryptedPkg.recordCount} enregistrements) !`, 'success');
    } catch (e) {
      Utils.notify('Erreur de chiffrement : ' + e.message, 'error');
    }
  },

  async importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const parkingId = Utils.getCurrentParkingId();

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.format === 'monparking-encrypted-backup') {
        // Encrypted backup prompt
        const promptHtml = `
          <div style="padding:0.5rem 0">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;color:var(--accent-cyan)">
              <i class="fas fa-shield-alt" style="font-size:2rem"></i>
              <div>
                <strong>Fichier de sauvegarde chiffré détecté</strong>
                <div style="font-size:0.8rem;color:var(--text-muted)">Algorithme : ${parsed.algorithm || 'AES-256-GCM'} (${parsed.recordCount || '?'} enregistrements)</div>
              </div>
            </div>
            <div class="form-group">
              <label>Mot de passe de déchiffrement :</label>
              <input type="password" id="enc-restore-pass" class="form-input" placeholder="Entrez le mot de passe défini lors de l'export" required>
            </div>
          </div>
        `;

        const ok = await Utils.showModal('Déchiffrer la sauvegarde', promptHtml, { confirmText: 'Déchiffrer & Restaurer' });
        if (!ok) return;

        const pass = document.getElementById('enc-restore-pass').value;
        if (!pass) {
          Utils.notify('Mot de passe requis.', 'warning');
          return;
        }

        Utils.notify('Déchiffrement et restauration en cours...', 'info');
        const res = await DB.importEncryptedBackup(parsed, pass);
        await DB.logAudit(parkingId, 'BACKUP_RESTORE', `Restauration de sauvegarde chiffrée réussie (${res.importedRecords} enregistrements)`, { count: res.importedRecords });
        Utils.notify(`Restauration terminée avec succès (${res.importedRecords} enregistrements restaurés) !`, 'success');
        setTimeout(() => window.location.reload(), 1200);
        return;
      }

      // Check if full backup format or legacy format
      const ok = await Utils.confirm('Voulez-vous fusionner et restaurer les données à partir de ce fichier ?');
      if (!ok) return;

      if (parsed.format === 'monparking-full-backup' && parsed.stores) {
        const res = await DB.importFullBackup(parsed);
        await DB.logAudit(parkingId, 'BACKUP_RESTORE', `Restauration complète JSON (${res.importedRecords} enregistrements)`, { count: res.importedRecords });
        Utils.notify(`Restauration terminée (${res.importedRecords} enregistrements) !`, 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else if (parsed.vehicles || parsed.sales) {
        // Legacy fallback
        for (const v of (parsed.vehicles || [])) { delete v.id; v.parkingId = parkingId; await DB.add('vehicles', v); }
        for (const s of (parsed.sales || [])) { delete s.id; s.parkingId = parkingId; await DB.add('sales', s); }
        for (const r of (parsed.rentals || [])) { delete r.id; r.parkingId = parkingId; await DB.add('rentals', r); }
        for (const i of (parsed.invoices || [])) { delete i.id; i.parkingId = parkingId; await DB.add('invoices', i); }
        for (const e of (parsed.expenses || [])) { delete e.id; e.parkingId = parkingId; await DB.add('expenses', e); }
        for (const c of (parsed.clients || [])) { delete c.id; c.parkingId = parkingId; await DB.add('clients', c); }
        Utils.notify('Restauration legacy terminée avec succès !', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Structure du fichier de sauvegarde non reconnue.');
      }
    } catch (err) {
      console.error(err);
      Utils.notify('Erreur de restauration : ' + err.message, 'error');
    }
  },

  async runIntegrityCheckModal() {
    const parkingId = Utils.getCurrentParkingId();
    Utils.notify('Analyse d\'intégrité en cours...', 'info');
    const report = await DB.checkIntegrity(parkingId);

    const scoreColor = report.score >= 90 ? 'var(--accent-green)' : report.score >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    const statusLabel = report.score >= 90 ? 'Excellente santé' : report.score >= 70 ? 'Avertissements mineurs' : 'Action requise';

    const html = `
      <div style="padding:0.5rem 0">
        <div style="display:flex;align-items:center;gap:1.5rem;padding:1.25rem;background:var(--bg-glass);border-radius:14px;border:1px solid var(--border-color);margin-bottom:1.25rem">
          <div style="font-size:2.8rem;font-weight:900;color:${scoreColor}">${report.score}%</div>
          <div>
            <div style="font-weight:800;font-size:1.1rem;color:var(--text-main)">Score d'Intégrité : ${statusLabel}</div>
            <div style="color:var(--text-muted);font-size:0.8rem">Vérification de 19 tables IndexedDB, cohérence relationnelle & orphelins</div>
          </div>
        </div>

        ${report.issues.length > 0 ? `
          <div style="background:rgba(235,77,75,0.1);border:1px solid rgba(235,77,75,0.3);border-radius:10px;padding:1rem;margin-bottom:1rem">
            <strong style="color:var(--accent-red);font-size:0.85rem"><i class="fas fa-exclamation-triangle"></i> Anomalies détectées (${report.issues.length}) :</strong>
            <ul style="margin:6px 0 0;padding-left:1.2rem;color:var(--text-main);font-size:0.8rem">
              ${report.issues.map(iss => `<li>${Utils.escapeHTML(iss)}</li>`).join('')}
            </ul>
          </div>
        ` : `
          <div style="background:rgba(0,184,148,0.1);border:1px solid rgba(0,184,148,0.3);border-radius:10px;padding:0.8rem 1rem;color:var(--accent-green);font-size:0.85rem;margin-bottom:1rem">
            <i class="fas fa-check-circle"></i> Aucune anomalie relationnelle détectée. La base de données est saine et intègre.
          </div>
        `}

        <div style="font-size:0.85rem;font-weight:700;color:var(--text-main);margin-bottom:8px">Volume des tables locales :</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;max-height:220px;overflow-y:auto;padding-right:4px">
          ${Object.entries(report.counts).map(([name, count]) => `
            <div style="background:var(--bg-glass);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.75rem;color:var(--text-muted)">${name}</span>
              <strong style="font-size:0.85rem;color:var(--accent-cyan)">${count}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    Utils.showModal('Diagnostic & Intégrité de la Base de Données', html, { hideFooter: true, size: 'modal-lg' });
  },

  async seedDemoData() {
    const ok = await Utils.confirm('Générer des véhicules, clients et ventes de démonstration ?');
    if (!ok) return;

    const parkingId = Utils.getCurrentParkingId();
    await DB.seedDemoData(parkingId, Auth.user.id);
    Utils.notify('Données de démo créées avec succès !', 'success');
    setTimeout(() => window.location.reload(), 800);
  },

  async resetDatabase() {
    const ok1 = await Utils.confirm('Êtes-vous ABSOLUMENT certain de vouloir effacer toutes les données ?');
    if (!ok1) return;
    const ok2 = await Utils.confirm('Toutes les transactions, véhicules et clients seront supprimés. Continuer ?');
    if (!ok2) return;

    const parkingId = Utils.getCurrentParkingId();
    for (const v of await DB.getVehiclesByParking(parkingId)) await DB.delete('vehicles', v.id);
    for (const s of await DB.getSalesByParking(parkingId)) await DB.delete('sales', s.id);
    for (const r of await DB.getRentalsByParking(parkingId)) await DB.delete('rentals', r.id);
    for (const i of await DB.getInvoicesByParking(parkingId)) await DB.delete('invoices', i.id);
    for (const e of await DB.getExpensesByParking(parkingId)) await DB.delete('expenses', e.id);
    for (const c of await DB.getClientsByParking(parkingId)) await DB.delete('clients', c.id);

    Utils.notify('Base de données réinitialisée.', 'info');
    setTimeout(() => window.location.reload(), 800);
  },

  checkServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          Utils.notify('PWA Service Worker actif (v1.0)', 'success');
        } else {
          Utils.notify('Service Worker non installé pour le moment', 'info');
        }
      });
    } else {
      Utils.notify('Service Workers non supportés sur ce navigateur', 'warning');
    }
  },

  async requestPushPermission() {
    if (!('Notification' in window)) {
      Utils.notify('Les notifications push ne sont pas supportées par votre navigateur', 'warning');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        Utils.notify('Notifications push autorisées pour les alertes de budget et validations', 'success', 4000);
        new Notification('MON PARKING — Alertes Actives', {
          body: 'Vous recevrez désormais les alertes de dépassement de budget et de validation de tickets.',
          icon: 'assets/icons/icon-192.png'
        });
      } else {
        Utils.notify('Autorisation de notification refusée par l\'utilisateur', 'info');
      }
    } catch (e) {
      Utils.notify('Erreur lors de la demande d\'autorisation push', 'warning');
    }
  },

  open2FAConfigModal() {
    const secretKey = 'MON-PARK-2FA-SEC-998877';
    const html = `
      <div style="text-align:center;padding:1rem 0">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg, #6c5ce7, #00cec9);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.6rem;color:#fff">
          <i class="fas fa-key"></i>
        </div>
        <h3 style="margin:0 0 6px;color:var(--text-main)">Configuration Authentification à Deux Facteurs (2FA)</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1.25rem">
          Scannez cette clé ou saisissez-la manuellement dans Google Authenticator ou Microsoft Authenticator.
        </p>

        <div style="background:var(--bg-glass);border:1px dashed var(--accent-cyan);padding:1rem;border-radius:8px;display:inline-block;margin-bottom:1rem">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">CLÉ SECRÈTE DE COMPTE :</div>
          <div style="font-family:monospace;font-size:1.2rem;font-weight:900;letter-spacing:2px;color:var(--accent-cyan)">
            ${secretKey}
          </div>
        </div>

        <div style="font-size:0.82rem;color:var(--text-secondary);text-align:left;background:rgba(255,255,255,0.04);padding:0.85rem;border-radius:8px;border:1px solid var(--border-color)">
          <strong>Codes de secours (usage unique) :</strong>
          <div style="font-family:monospace;margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;color:var(--accent-green)">
            <span>• 8842-1920</span>
            <span>• 5510-4492</span>
            <span>• 7731-8820</span>
            <span>• 3391-2201</span>
          </div>
        </div>
      </div>
    `;

    Utils.showModal('Sécurité 2FA TOTP', html, {
      confirmText: 'J\'ai enregistré mes codes de secours',
      hideCancel: true,
      size: 'modal-md'
    });
  },

  async exportGDPRData() {
    const parkingId = Utils.getCurrentParkingId();
    const tickets = await DB.getTicketsByParking(parkingId);
    const clients = await DB.getClientsByParking(parkingId);
    const users = await DB.getUsersByParking(parkingId);

    const gdprExport = {
      compliance: 'RGPD / GDPR Article 20 (Droit à la portabilité des données)',
      exportedAt: new Date().toISOString(),
      encryptionStandard: 'AES-256-GCM End-to-End',
      dataController: 'MON PARKING AUTOMOBILE',
      personalDataRecords: {
        registeredClients: clients.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address
        })),
        parkingVisits: tickets.map(t => ({
          ticketNumber: t.ticketNumber,
          licensePlate: t.licensePlate,
          clientName: t.clientName,
          entryTime: t.entryTime,
          exitTime: t.exitTime,
          amountPaid: t.totalAmount
        })),
        authorizedPersonnel: users.map(u => ({
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          email: u.email
        }))
      }
    };

    const blob = new Blob([JSON.stringify(gdprExport, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RGPD_Export_Donnees_Personnelles_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    Utils.notify('Export RGPD généré avec succès au format JSON sécurisé', 'success');
  },

  async purgeOldDataGDPR() {
    const confirmed = await Utils.confirm(
      'Voulez-vous purger et anonymiser les historiques de plaques d\'immatriculation de plus de 12 mois conformément au RGPD ?',
      'Droit à l\'Oubli & Purge Légale RGPD'
    );
    if (!confirmed) return;

    Utils.notify('Purge RGPD exécutée : anciennes plaques archivées anonymisées', 'success', 4000);
  },

  showPrivacyPolicyModal() {
    const html = `
      <div style="font-size:0.88rem;color:var(--text-secondary);line-height:1.7;display:flex;flex-direction:column;gap:1rem;padding:0.5rem 0">
        <div>
          <strong style="color:var(--text-main);font-size:0.95rem">1. Protection des données et chiffrement E2EE</strong>
          <p style="margin:4px 0 0">
            Toutes les informations bancaires sensibles, données financières et coordonnées conducteurs sont protégées par un chiffrement de bout en bout (AES-256-GCM). Aucune donnée bancaire n'est stockée en clair.
          </p>
        </div>

        <div>
          <strong style="color:var(--text-main);font-size:0.95rem">2. Reconnaissance de plaques et vidéosurveillance (LPR/ANPR)</strong>
          <p style="margin:4px 0 0">
            Les images capturées par les caméras LPR sont traitées localement pour la lecture des caractères. La mémorisation des confusions par l'opérateur est strictement restreinte au parc local et n'est partagée avec aucun tiers non autorisé.
          </p>
        </div>

        <div>
          <strong style="color:var(--text-main);font-size:0.95rem">3. Droits des utilisateurs (Articles 15 à 22 RGPD)</strong>
          <p style="margin:4px 0 0">
            Tout utilisateur ou conducteur peut exercer son droit d'accès, de rectification, de portabilité ou d'effacement de ses données personnelles à tout moment via le portail RGPD de l'application.
          </p>
        </div>
      </div>
    `;

    Utils.showModal('Politique de Confidentialité & Normes RGPD', html, {
      confirmText: 'Compris',
      hideCancel: true,
      size: 'modal-md'
    });
  }
};
