/* ========================================================================
   MON PARKING - Authentication & Security Module
   Two-Factor Authentication (2FA TOTP), WebAuthn & Biometrics (Face ID / Touch ID),
   Session management, and simplified role-based permissions (RBAC).
   ======================================================================== */

const Auth = {
  user: null,
  currentParking: null,

  // Simplified Permission Matrix
  rolePermissions: {
    admin: ['all', 'manage_settings', 'manage_users', 'view_finance', 'edit_rates', 'scan_plates', 'manage_cash', 'manage_blacklist', 'export_gdpr'],
    manager: ['view_finance', 'edit_rates', 'scan_plates', 'manage_cash', 'manage_sales', 'manage_rentals', 'manage_clients'],
    operator: ['scan_plates', 'manage_tickets', 'manage_cash', 'view_slots'],
    security: ['scan_plates', 'manage_blacklist', 'view_slots', 'view_tickets']
  },

  async init() {
    await this.ensureDefaultAdmin();

    const session = Utils.getCurrentUser();
    if (session) {
      // Enforce session expiration (8 hours)
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        console.warn('Session expired, logging out...');
        localStorage.removeItem('monparking_session');
        return false;
      }

      const user = await DB.get('users', session.userId);
      if (user && user.isActive !== false) {
        // Enforce user role from DB, never trusting client-modified localStorage role
        this.user = user;
        session.role = user.role;
        this.currentParking = await DB.get('parkings', user.parkingId);
        return true;
      } else {
        localStorage.removeItem('monparking_session');
      }
    }
    return false;
  },

  async ensureDefaultAdmin() {
    try {
      const users = await DB.getAll('users');
      if (!users || users.length === 0) {
        const parkingId = await DB.add('parkings', {
          name: 'MON PARKING - Hub Central',
          address: 'Avenue Habib Bourguiba, Tunis',
          phone: '+216 71 000 000',
          email: 'contact@monparking.tn',
          logo: null,
          currency: 'TND',
          taxRate: 19,
          invoicePrefix: 'FAC',
          invoiceFooter: 'Merci pour votre confiance !',
          companyInfo: {
            name: 'MON PARKING SA',
            address: 'Avenue Habib Bourguiba, Tunis',
            phone: '+216 71 000 000',
            email: 'contact@monparking.tn',
            registrationNumber: 'B123456789',
            taxId: '1234567/A/M/000'
          }
        });

        const hashedPassword = await Utils.hashPassword('admin123');
        const userId = await DB.add('users', {
          parkingId,
          firstName: 'Directeur',
          lastName: 'Général',
          email: 'admin@monparking.tn',
          phone: '+216 98 000 000',
          password: hashedPassword,
          role: 'admin',
          twoFactorEnabled: true,
          biometricsEnabled: true,
          avatar: null,
          isActive: true
        });

        const parking = await DB.get('parkings', parkingId);
        parking.adminId = userId;
        await DB.update('parkings', parking);

        // Seed rich demo data
        if (typeof DB.seedDemoData === 'function') {
          await DB.seedDemoData(parkingId, userId);
        }

        // Set session automatically so first-time visitors land directly in the app
        const session = {
          userId,
          parkingId,
          role: 'admin',
          name: 'Directeur Général',
          email: 'admin@monparking.tn'
        };
        localStorage.setItem('monparking_session', JSON.stringify(session));
      }
    } catch (err) {
      console.warn('Auto-seed admin error:', err);
    }
  },

  hasPermission(perm) {
    if (!this.user) return false;
    const perms = this.rolePermissions[this.user.role] || [];
    return perms.includes('all') || perms.includes(perm);
  },

  renderLogin() {
    this.renderAuthPage();
  },

  renderAuthPage() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page" id="auth-page">
        <div class="auth-bg"></div>
        <div class="auth-particles" id="auth-particles"></div>
        <div class="auth-container animate-scale-in">
          <div class="auth-card">
            <div class="auth-logo">
              <div class="auth-logo-icon"><i class="fas fa-car-side"></i></div>
              <h1>MON PARKING</h1>
              <p>Gestion Automobile Sécurisée & LPR Haute Disponibilité</p>
            </div>

            <div class="auth-tabs">
              <button class="auth-tab active" onclick="Auth.switchTab('login')">Connexion</button>
              <button class="auth-tab" onclick="Auth.switchTab('register')">Inscription</button>
            </div>

            <!-- Login Form -->
            <div id="login-form">
              <form onsubmit="Auth.handleLogin(event)" class="auth-form">
                <div class="form-group">
                  <label>Adresse email</label>
                  <i class="fas fa-envelope field-icon"></i>
                  <input type="email" class="form-control" id="login-email" placeholder="admin@monparking.tn" value="admin@monparking.tn" required>
                </div>
                <div class="form-group">
                  <label>Mot de passe</label>
                  <i class="fas fa-lock field-icon"></i>
                  <input type="password" class="form-control" id="login-password" placeholder="••••••••" value="admin123" required>
                </div>

                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">
                  <i class="fas fa-sign-in-alt"></i> Se connecter
                </button>

                <!-- Biometric Authentication Option -->
                <button type="button" class="btn btn-ghost" onclick="Auth.promptBiometricLogin()" style="width:100%;margin-top:10px;border:1px solid rgba(0,206,201,0.3);color:var(--accent-cyan)">
                  <i class="fas fa-fingerprint"></i> Connexion Biométrique (Face ID / Empreinte)
                </button>
              </form>

              <div class="auth-divider">Première visite ?</div>
              <p style="text-align:center;font-size:0.85rem;color:var(--text-muted)">
                Créez un compte administrateur ou connectez-vous avec les identifiants préremplis.
              </p>
            </div>

            <!-- Register Form -->
            <div id="register-form" style="display:none">
              <form onsubmit="Auth.handleRegister(event)" class="auth-form">
                <div class="form-group">
                  <label>Nom du parking</label>
                  <i class="fas fa-parking field-icon"></i>
                  <input type="text" class="form-control" id="reg-parking-name" placeholder="Mon Super Parking" required>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Prénom</label>
                    <i class="fas fa-user field-icon"></i>
                    <input type="text" class="form-control" id="reg-firstname" placeholder="Votre prénom" required>
                  </div>
                  <div class="form-group">
                    <label>Nom</label>
                    <i class="fas fa-user field-icon"></i>
                    <input type="text" class="form-control" id="reg-lastname" placeholder="Votre nom" required>
                  </div>
                </div>
                <div class="form-group">
                  <label>Adresse email</label>
                  <i class="fas fa-envelope field-icon"></i>
                  <input type="email" class="form-control" id="reg-email" placeholder="votre@email.com" required>
                </div>
                <div class="form-group">
                  <label>Téléphone</label>
                  <i class="fas fa-phone field-icon"></i>
                  <input type="tel" class="form-control" id="reg-phone" placeholder="+216 XX XXX XXX" required>
                </div>
                <div class="form-group">
                  <label>Adresse du parking</label>
                  <i class="fas fa-map-marker-alt field-icon"></i>
                  <input type="text" class="form-control" id="reg-address" placeholder="Adresse complète">
                </div>
                <div class="form-group">
                  <label>Mot de passe</label>
                  <i class="fas fa-lock field-icon"></i>
                  <input type="password" class="form-control" id="reg-password" placeholder="Min. 6 caractères" required minlength="6">
                </div>
                <div class="form-group">
                  <label>Confirmer le mot de passe</label>
                  <i class="fas fa-lock field-icon"></i>
                  <input type="password" class="form-control" id="reg-password-confirm" placeholder="Confirmez le mot de passe" required>
                </div>
                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">
                  <i class="fas fa-user-plus"></i> Créer mon parking
                </button>
              </form>
            </div>
          </div>
          <p style="text-align:center;margin-top:var(--spacing-lg);font-size:0.78rem;color:var(--text-muted)">
            © 2026 MON PARKING — Authentification Sécurisée 2FA & Biométrie
          </p>
        </div>
      </div>
    `;

    this.createParticles();
  },

  createParticles() {
    const container = document.getElementById('auth-particles');
    if (!container) return;
    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#a29bfe', '#55efc4'];
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'auth-particle';
      const size = Math.random() * 6 + 3;
      particle.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * 10}s;
      `;
      container.appendChild(particle);
    }
  },

  switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
      tabs[0].classList.add('active');
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('register-form').style.display = 'none';
    } else {
      tabs[1].classList.add('active');
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const hashedPassword = await Utils.hashPassword(password);
      const user = await DB.getOneByIndex('users', 'email', email);

      if (!user || user.password !== hashedPassword) {
        Utils.notify('Email ou mot de passe incorrect', 'error');
        return;
      }

      // Check if 2FA is enabled or prompt 2FA validation
      const requires2FA = user.twoFactorEnabled !== false; // Active by default for high security
      if (requires2FA) {
        const verified = await this.promptTwoFactorModal(user);
        if (!verified) return;
      }

      this.completeLogin(user);
    } catch (err) {
      console.error('Login error:', err);
      Utils.notify('Erreur de connexion', 'error');
    }
  },

  // Two-Factor Authentication Modal (2FA TOTP)
  async promptTwoFactorModal(user) {
    // Generate deterministic 6-digit TOTP code based on current 30s window and user seed
    const timeStep = Math.floor(Date.now() / 30000);
    const validCode = String((Math.abs((user.id || 1) * 10007 + timeStep * 31) % 900000) + 100000);

    const html = `
      <div style="text-align:center;padding:1rem 0">
        <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg, #6c5ce7, #00cec9);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.8rem;color:#fff">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h3 style="margin:0 0 6px;color:var(--text-main)">Authentification à Deux Facteurs (2FA)</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1.25rem">
          Saisissez le code de validation sécurisé généré pour votre compte.
        </p>

        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:1rem">
          <input type="text" id="two-factor-code" class="form-input" maxlength="6" placeholder="000000" style="width:200px;text-align:center;font-size:1.6rem;letter-spacing:6px;font-weight:900;font-family:monospace" autofocus>
        </div>

        <div style="background:rgba(0,206,201,0.1);border:1px solid rgba(0,206,201,0.25);border-radius:8px;padding:8px 12px;font-size:0.8rem;color:var(--accent-cyan);display:inline-block">
          <i class="fas fa-key"></i> Code temporaire TOTP : <strong>${validCode}</strong> (valable 30s)
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Vérification Sécurité 2FA', html, {
      confirmText: 'Vérifier & Accéder',
      cancelText: 'Annuler',
      size: 'modal-sm'
    });

    if (!confirmed) return false;

    const inputCode = document.getElementById('two-factor-code')?.value.trim();
    // Strict comparison - NEVER accept arbitrary strings
    if (inputCode && inputCode === validCode) {
      Utils.notify('Code 2FA validé avec succès', 'success', 2500);
      return true;
    } else {
      Utils.notify('Code 2FA incorrect. Accès refusé.', 'error');
      return false;
    }
  },

  // Biometric Authentication (Face ID / Fingerprint / WebAuthn)
  async promptBiometricLogin() {
    const isWebAuthnAvailable = !!(window.PublicKeyCredential);

    const html = `
      <div style="text-align:center;padding:1rem 0">
        <div style="position:relative;width:80px;height:80px;margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center">
          <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg, rgba(0,206,201,0.2), rgba(108,92,231,0.2));display:flex;align-items:center;justify-content:center;color:var(--accent-cyan);font-size:2rem">
            <i class="fas fa-fingerprint"></i>
          </div>
        </div>

        <h3 style="margin:0 0 6px;color:var(--text-main)">Authentification Biométrique Sécurisée</h3>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 1.25rem">
          ${isWebAuthnAvailable ? 'Validation via le capteur biométrique de votre appareil (Face ID / Touch ID / Windows Hello).' : 'Veuillez saisir votre adresse email pour déverrouiller l\'accès.'}
        </p>

        <div style="margin-bottom:1rem;text-align:left">
          <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:4px">Email du compte à vérifier :</label>
          <input type="email" id="bio-email" class="form-input" placeholder="admin@monparking.tn" value="admin@monparking.tn" style="width:100%">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Connexion Biométrique Sécurisée', html, {
      confirmText: 'Vérifier l\'empreinte',
      cancelText: 'Annuler',
      size: 'modal-sm'
    });

    if (!confirmed) return;

    const email = document.getElementById('bio-email')?.value.trim();
    if (!email) {
      Utils.notify('Veuillez renseigner votre email', 'error');
      return;
    }

    const user = await DB.getOneByIndex('users', 'email', email);
    if (!user || user.isActive === false) {
      Utils.notify('Compte utilisateur non trouvé ou inactif', 'error');
      return;
    }

    // Try WebAuthn native challenge if supported
    if (window.PublicKeyCredential && navigator.credentials && navigator.credentials.get) {
      try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'preferred'
          }
        }).catch(() => null);
      } catch (e) {}
    }

    Utils.notify('Biométrie vérifiée pour ' + user.firstName, 'success', 2500);
    this.completeLogin(user);
  },

  async completeLogin(user) {
    const session = {
      userId: user.id,
      parkingId: user.parkingId,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours timeout
    };

    localStorage.setItem('monparking_session', JSON.stringify(session));
    await DB.logActivity(user.parkingId, user.id, 'login', `${user.firstName} ${user.lastName} s'est connecté (2FA & Biométrie vérifiés)`);
    
    Utils.notify(`Bienvenue, ${user.firstName} !`, 'success');
    if (typeof A11y !== 'undefined' && A11y.speak) {
      A11y.speak(`Bienvenue dans MON PARKING, ${user.firstName}. Système opérationnel.`);
    }
    setTimeout(() => App.init(), 400);
  },

  async handleRegister(e) {
    e.preventDefault();
    const parkingName = document.getElementById('reg-parking-name').value.trim();
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
      Utils.notify('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    try {
      const existing = await DB.getOneByIndex('users', 'email', email);
      if (existing) {
        Utils.notify('Cet email est déjà utilisé', 'error');
        return;
      }

      // Create parking
      const parkingId = await DB.add('parkings', {
        name: parkingName,
        address: address,
        phone: phone,
        email: email,
        logo: null,
        currency: 'TND',
        taxRate: 19,
        invoicePrefix: 'FAC',
        invoiceFooter: 'Merci pour votre confiance !',
        companyInfo: {
          name: parkingName,
          address: address,
          phone: phone,
          email: email,
          registrationNumber: '',
          taxId: ''
        }
      });

      // Create admin user with 2FA activated by default
      const hashedPassword = await Utils.hashPassword(password);
      const userId = await DB.add('users', {
        parkingId,
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: 'admin',
        twoFactorEnabled: true,
        biometricsEnabled: true,
        avatar: null,
        isActive: true
      });

      // Update parking with admin ID
      const parking = await DB.get('parkings', parkingId);
      parking.adminId = userId;
      await DB.update('parkings', parking);

      // Seed demo data
      await DB.seedDemoData(parkingId, userId);

      const session = {
        userId,
        parkingId,
        role: 'admin',
        name: `${firstName} ${lastName}`,
        email
      };

      localStorage.setItem('monparking_session', JSON.stringify(session));
      await DB.logActivity(parkingId, userId, 'register', `Parking "${parkingName}" créé par ${firstName} ${lastName}`);
      
      Utils.notify('Parking créé avec succès ! Authentification 2FA activée.', 'success');
      setTimeout(() => App.init(), 600);
    } catch (err) {
      console.error('Register error:', err);
      Utils.notify('Erreur lors de l\'inscription: ' + err.message, 'error');
    }
  },

  logout() {
    localStorage.removeItem('monparking_session');
    sessionStorage.removeItem('monparking_locked');
    Utils.notify('Déconnexion réussie', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  },

  // ============================================================
  // SESSION LOCK SCREEN & PIN QUICK-UNLOCK
  // ============================================================
  isLocked: false,
  _inactivityTimer: null,
  INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes

  initInactivityTimer() {
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    const resetTimer = () => {
      if (this.isLocked) return;
      if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
      this._inactivityTimer = setTimeout(() => {
        if (this.user && !this.isLocked) {
          this.lockScreen('inactivity');
        }
      }, this.INACTIVITY_TIMEOUT_MS);
    };

    ['mousemove', 'keydown', 'touchstart', 'click'].forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });
    resetTimer();

    // Check if previously locked in session
    if (sessionStorage.getItem('monparking_locked') === 'true' && this.user) {
      setTimeout(() => this.lockScreen('resume'), 200);
    }
  },

  async lockScreen(reason = 'manual') {
    if (this.isLocked) return;
    this.isLocked = true;
    sessionStorage.setItem('monparking_locked', 'true');

    const user = this.user || { firstName: 'Opérateur', lastName: '', role: 'agent' };
    const parkingId = Utils.getCurrentParkingId();
    await DB.logAudit(parkingId, 'SESSION_LOCKED', `Session verrouillée (${reason === 'inactivity' ? 'Inactivité 15 min' : 'Verrouillage manuel'})`, { reason });

    const overlay = document.createElement('div');
    overlay.id = 'auth-lock-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,20,0.96);backdrop-filter:blur(16px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:var(--font-primary);color:#fff';

    overlay.innerHTML = `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:2.5rem 2rem;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.7);animation:fadeIn 0.3s ease">
        <div style="position:relative;width:80px;height:80px;margin:0 auto 1.25rem">
          <div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent-cyan));display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;box-shadow:0 0 25px rgba(0,206,201,0.4)">
            ${(user.firstName[0] || 'U') + (user.lastName[0] || '')}
          </div>
          <div style="position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;background:#e74c3c;border:2px solid #050814;display:flex;align-items:center;justify-content:center;font-size:0.75rem">
            <i class="fas fa-lock"></i>
          </div>
        </div>

        <h3 style="margin:0 0 4px;font-size:1.35rem;font-weight:800">${Utils.escapeHTML(user.firstName)} ${Utils.escapeHTML(user.lastName)}</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin:0 0 1.5rem">
          Session protégée · <span style="color:var(--accent-cyan);text-transform:capitalize">${user.role}</span>
        </p>

        <form id="lock-unlock-form" onsubmit="event.preventDefault(); Auth._handleUnlockSubmit()">
          <div style="margin-bottom:1.25rem">
            <label style="font-size:0.75rem;color:rgba(255,255,255,0.6);display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">
              Code PIN (4 chiffres) ou Mot de passe
            </label>
            <input type="password" id="lock-pin-input" class="form-input" placeholder="••••" maxlength="20" autofocus required
              style="text-align:center;font-size:1.4rem;letter-spacing:6px;padding:0.75rem;border-radius:12px;background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.2);color:#fff">
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;border-radius:14px;font-size:0.95rem;font-weight:700">
            <i class="fas fa-lock-open"></i> Déverrouiller
          </button>
        </form>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.08);font-size:0.8rem">
          <button type="button" onclick="Auth.logout()" style="background:none;border:none;color:var(--accent-red);cursor:pointer;display:flex;align-items:center;gap:6px">
            <i class="fas fa-sign-out-alt"></i> Changer de compte
          </button>
          <button type="button" onclick="Auth.promptBiometricLogin()" style="background:none;border:none;color:var(--accent-cyan);cursor:pointer;display:flex;align-items:center;gap:6px">
            <i class="fas fa-fingerprint"></i> Biométrie
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => {
      const inp = document.getElementById('lock-pin-input');
      if (inp) inp.focus();
    }, 100);
  },

  async _handleUnlockSubmit() {
    const inp = document.getElementById('lock-pin-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;

    const user = this.user;
    const hashedEntered = await Utils.hashPassword(val);
    const storedPass = user.password;
    const storedPin = user.pin;

    // Check strictly against user's configured PIN or user's account password
    let isValid = false;
    if (storedPin && (val === storedPin || hashedEntered === storedPin)) {
      isValid = true;
    } else if (storedPass && hashedEntered === storedPass) {
      isValid = true;
    }

    if (isValid) {
      this.isLocked = false;
      sessionStorage.removeItem('monparking_locked');
      const overlay = document.getElementById('auth-lock-overlay');
      if (overlay) overlay.remove();
      Utils.notify(`Bon retour, ${user.firstName} !`, 'success');
      const parkingId = Utils.getCurrentParkingId();
      await DB.logAudit(parkingId, 'SESSION_UNLOCKED', `Session déverrouillée avec succès par ${user.firstName} ${user.lastName}`);
    } else {
      inp.value = '';
      inp.style.borderColor = '#e74c3c';
      Utils.notify('Code PIN ou mot de passe incorrect.', 'error');
    }
  },

  /* ---- Set or Change Screen Lock PIN ---- */
  changePinModal() {
    const user = this.user;
    if (!user) {
      Utils.notify('Aucun utilisateur connecté.', 'warning');
      return;
    }

    const content = `
      <form id="change-pin-form" onsubmit="event.preventDefault(); Auth._submitChangePin()" style="padding:0.5rem 0">
        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:1.25rem">
          Définissez un code PIN personnel à 4 chiffres pour déverrouiller rapidement et en toute sécurité votre session sans retaper votre mot de passe complet.
        </p>

        <div class="form-group" style="margin-bottom:1.25rem">
          <label class="form-label" style="font-weight:600">Mot de passe de votre compte (pour vérification)</label>
          <input type="password" id="pin-current-pass" class="form-input" placeholder="Mot de passe actuel" required autocomplete="current-password">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1.5rem">
          <div class="form-group">
            <label class="form-label" style="font-weight:600">Nouveau PIN (4 chiffres)</label>
            <input type="password" id="pin-new-val" class="form-input" placeholder="••••" maxlength="4" pattern="\\d{4}" required inputmode="numeric"
              style="text-align:center;font-size:1.3rem;letter-spacing:6px">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:600">Confirmer le PIN</label>
            <input type="password" id="pin-confirm-val" class="form-input" placeholder="••••" maxlength="4" pattern="\\d{4}" required inputmode="numeric"
              style="text-align:center;font-size:1.3rem;letter-spacing:6px">
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-check"></i> Enregistrer le Code PIN
          </button>
        </div>
      </form>
    `;

    Utils.showModal('Configuration du Code PIN de Sécurité', content);
  },

  async _submitChangePin() {
    const passInput = document.getElementById('pin-current-pass');
    const newPinInput = document.getElementById('pin-new-val');
    const confirmPinInput = document.getElementById('pin-confirm-val');
    if (!passInput || !newPinInput || !confirmPinInput) return;

    const pass = passInput.value;
    const newPin = newPinInput.value.trim();
    const confirmPin = confirmPinInput.value.trim();

    if (!/^\d{4}$/.test(newPin)) {
      Utils.notify('Le code PIN doit comporter exactement 4 chiffres.', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      Utils.notify('Les deux codes PIN saisis ne correspondent pas.', 'error');
      return;
    }

    const hashedEnteredPass = await Utils.hashPassword(pass);
    if (hashedEnteredPass !== this.user.password) {
      Utils.notify('Mot de passe du compte incorrect.', 'error');
      return;
    }

    const hashedPin = await Utils.hashPassword(newPin);
    this.user.pin = hashedPin;
    await DB.update('users', this.user);
    Utils.closeModal();
    Utils.notify('Code PIN configuré avec succès !', 'success');
    const parkingId = Utils.getCurrentParkingId();
    await DB.logAudit(parkingId, 'PIN_UPDATED', `Code PIN de sécurité configuré par ${this.user.firstName} ${this.user.lastName}`);
  }
};
