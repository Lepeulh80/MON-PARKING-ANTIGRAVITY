/* ========================================================================
   MON PARKING - Accessibility & Voice Synthesis Module (A11y)
   High contrast, large fonts, dyslexia support, voice assistance (TTS),
   and dark/light/OLED theme toggling for low-vision & motor-impaired users.
   ======================================================================== */

const A11y = {
  highContrast: localStorage.getItem('a11y_high_contrast') === 'true',
  textSize: localStorage.getItem('a11y_text_size') || 'normal', // 'normal' | 'large' | 'xl'
  dyslexicFont: localStorage.getItem('a11y_dyslexic') === 'true',
  voiceEnabled: localStorage.getItem('a11y_voice_enabled') === 'true',
  currentTheme: localStorage.getItem('theme_preference') || 'dark', // 'dark' | 'oled' | 'light'

  init() {
    this.applyPreferences();
    console.log('♿ Accessibility & Voice Assistant system initialized');
  },

  applyPreferences() {
    const body = document.body;
    if (!body) return;

    // High Contrast
    body.classList.toggle('high-contrast', this.highContrast);

    // Text Size
    body.classList.remove('a11y-large-text', 'a11y-xl-text');
    if (this.textSize === 'large') body.classList.add('a11y-large-text');
    if (this.textSize === 'xl') body.classList.add('a11y-xl-text');

    // Dyslexic font
    body.classList.toggle('a11y-dyslexic', this.dyslexicFont);

    // Theme (Dark by default)
    body.classList.remove('theme-light', 'theme-oled');
    if (this.currentTheme === 'light') body.classList.add('theme-light');
    if (this.currentTheme === 'oled') body.classList.add('theme-oled');
  },

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    localStorage.setItem('a11y_high_contrast', this.highContrast);
    this.applyPreferences();
    const msg = this.highContrast ? 'Mode contraste élevé activé' : 'Mode standard rétabli';
    Utils.notify(msg, 'info', 2500);
    this.speak(msg);
  },

  setTextSize(size) {
    this.textSize = size;
    localStorage.setItem('a11y_text_size', size);
    this.applyPreferences();
    const label = size === 'xl' ? 'Très grand (+50%)' : (size === 'large' ? 'Grand (+25%)' : 'Standard');
    Utils.notify(`Taille du texte : ${label}`, 'info', 2000);
    this.speak(`Taille du texte ajustée à ${label}`);
  },

  toggleDyslexicFont() {
    this.dyslexicFont = !this.dyslexicFont;
    localStorage.setItem('a11y_dyslexic', this.dyslexicFont);
    this.applyPreferences();
    const msg = this.dyslexicFont ? 'Police haute lisibilité activée' : 'Police standard réactivée';
    Utils.notify(msg, 'info', 2500);
    this.speak(msg);
  },

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('theme_preference', theme);
    this.applyPreferences();
    const names = { dark: 'Mode Sombre Moderne', oled: 'Mode Sombre OLED Pur', light: 'Mode Clair Lumineux' };
    Utils.notify(`Thème : ${names[theme] || theme}`, 'info', 2000);
  },

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    localStorage.setItem('a11y_voice_enabled', this.voiceEnabled);
    if (this.voiceEnabled) {
      Utils.notify('Synthèse vocale activée pour les alertes et validations', 'success', 3000);
      this.speak('Synthèse vocale activée. MON PARKING vous guidera vocalement.');
    } else {
      Utils.notify('Synthèse vocale désactivée', 'info', 2000);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  },

  // Vocal read-out through Web Speech API
  speak(text, priority = false) {
    if (!this.voiceEnabled && !priority) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  },

  getModalContentHtml() {
    const isDark = this.currentTheme === 'dark';
    const isOled = this.currentTheme === 'oled';
    const isLight = this.currentTheme === 'light';

    return `
      <div id="a11y-modal-container" style="display:flex;flex-direction:column;gap:1.25rem;padding:0.5rem 0">
        <!-- Voice Assistant -->
        <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
              <i class="fas fa-volume-up" style="color:var(--accent-cyan)"></i>
              Synthèse Vocale & Alertes Sonores
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">
              Lecture audio automatique des validations de plaques, tickets de sortie et alertes de sécurité
            </div>
          </div>
          <button class="btn ${this.voiceEnabled ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.toggleVoice(); A11y.refreshModal()" style="min-width:110px">
            <i class="fas ${this.voiceEnabled ? 'fa-check' : 'fa-power-off'}"></i>
            ${this.voiceEnabled ? 'Activée' : 'Désactivée'}
          </button>
        </div>

        <!-- High Contrast Mode -->
        <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
              <i class="fas fa-adjust" style="color:var(--accent-yellow)"></i>
              Mode Contraste Élevé (Malvoyants)
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">
              Renforce les contours, maximise la lisibilité du texte sur fond noir absolu
            </div>
          </div>
          <button class="btn ${this.highContrast ? 'btn-warning' : 'btn-ghost'}" onclick="A11y.toggleHighContrast(); A11y.refreshModal()" style="min-width:110px">
            <i class="fas ${this.highContrast ? 'fa-check' : 'fa-circle'}"></i>
            ${this.highContrast ? 'Actif' : 'Standard'}
          </button>
        </div>

        <!-- Font Size Magnification -->
        <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color)">
          <div style="font-weight:700;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <i class="fas fa-text-height" style="color:var(--primary-light)"></i>
            Échelle Typographique & Grossissement
          </div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">
            Agrandissez la taille de police globale de l'interface pour un confort optimal
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px">
            <button class="btn ${this.textSize === 'normal' ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTextSize('normal'); A11y.refreshModal()">
              Standard (100%)
            </button>
            <button class="btn ${this.textSize === 'large' ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTextSize('large'); A11y.refreshModal()">
              Grand (+25%)
            </button>
            <button class="btn ${this.textSize === 'xl' ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTextSize('xl'); A11y.refreshModal()">
              Très Grand (+50%)
            </button>
          </div>
        </div>

        <!-- Dyslexia Font Support -->
        <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
              <i class="fas fa-font" style="color:var(--accent-pink)"></i>
              Police Adaptée Dyslexie
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">
              Espacement accru des caractères et empattements distinctifs facilitant la lecture
            </div>
          </div>
          <button class="btn ${this.dyslexicFont ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.toggleDyslexicFont(); A11y.refreshModal()" style="min-width:110px">
            <i class="fas ${this.dyslexicFont ? 'fa-check' : 'fa-circle'}"></i>
            ${this.dyslexicFont ? 'Active' : 'Standard'}
          </button>
        </div>

        <!-- Theme Selection (Dark by default) -->
        <div style="background:var(--bg-glass);padding:1.1rem;border-radius:var(--radius-md);border:1px solid var(--border-color)">
          <div style="font-weight:700;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <i class="fas fa-palette" style="color:var(--accent-green)"></i>
            Palette & Thème Visuel
          </div>
          <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">
            Mode sombre par défaut pour préserver la vision nocturne et l'autonomie sur mobile
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px">
            <button class="btn ${isDark ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTheme('dark'); A11y.refreshModal()">
              <i class="fas fa-moon"></i> Sombre (Défaut)
            </button>
            <button class="btn ${isOled ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTheme('oled'); A11y.refreshModal()">
              <i class="fas fa-adjust"></i> OLED Noir Pur
            </button>
            <button class="btn ${isLight ? 'btn-primary' : 'btn-ghost'}" onclick="A11y.setTheme('light'); A11y.refreshModal()">
              <i class="fas fa-sun"></i> Mode Clair
            </button>
          </div>
        </div>
      </div>
    `;
  },

  refreshModal() {
    const container = document.getElementById('a11y-modal-container');
    if (container) {
      container.outerHTML = this.getModalContentHtml();
    } else {
      this.openModal();
    }
  },

  // Open Accessibility Preferences Modal
  openModal() {
    const existing = document.getElementById('a11y-modal-container');
    if (existing) {
      this.refreshModal();
      return;
    }

    Utils.showModal('Accessibilité & Confort Visuel', this.getModalContentHtml(), {
      confirmText: 'Fermer',
      hideCancel: true,
      size: 'modal-md'
    });
  }
};

// Auto-init on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => A11y.init());
} else {
  A11y.init();
}
