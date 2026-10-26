/* ========================================================================
   MON PARKING - Utility Functions
   ======================================================================== */

const Utils = {
  /* ---- Formatters ---- */
  formatCurrency(amount, customCurrency) {
    if (typeof I18n !== 'undefined' && I18n.formatCurrency) {
      return I18n.formatCurrency(amount, customCurrency);
    }
    return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' F CFA';
  },

  getCurrency() {
    return (typeof I18n !== 'undefined') ? I18n.getCurrency() : 'XOF';
  },

  t(key, fallback) {
    return (typeof I18n !== 'undefined') ? I18n.t(key, fallback) : (fallback || key);
  },

  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateStr));
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  },

  formatDateInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  },

  timeAgo(dateStr) {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    const intervals = [
      { label: 'an', seconds: 31536000 },
      { label: 'mois', seconds: 2592000 },
      { label: 'jour', seconds: 86400 },
      { label: 'heure', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'seconde', seconds: 1 }
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `il y a ${count} ${interval.label}${count > 1 && interval.label !== 'mois' ? 's' : ''}`;
      }
    }
    return 'à l\'instant';
  },

  /* ---- ID Generation ---- */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /* ---- Hashing (simple for demo, use bcrypt in production) ---- */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'mon_parking_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /* ---- Status badges ---- */
  getStatusBadge(status) {
    const badges = {
      'available': { label: 'Disponible', class: 'badge-success' },
      'sold': { label: 'Vendu', class: 'badge-info' },
      'rented': { label: 'En location', class: 'badge-warning' },
      'reserved': { label: 'Réservé', class: 'badge-purple' },
      'maintenance': { label: 'En maintenance', class: 'badge-danger' },
      'active': { label: 'Active', class: 'badge-success' },
      'completed': { label: 'Terminée', class: 'badge-info' },
      'cancelled': { label: 'Annulée', class: 'badge-danger' },
      'overdue': { label: 'En retard', class: 'badge-danger' },
      'paid': { label: 'Payée', class: 'badge-success' },
      'pending': { label: 'En attente', class: 'badge-warning' },
      'unpaid': { label: 'Impayée', class: 'badge-danger' },
      'draft': { label: 'Brouillon', class: 'badge-secondary' }
    };
    return badges[status] || { label: status, class: 'badge-secondary' };
  },

  /* ---- Notification system ---- */
  notify(message, type = 'success', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-message">${message}</div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    setTimeout(() => {
      notification.classList.remove('notification-show');
      notification.classList.add('notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  /* ---- Modal system ---- */
  showModal(title, content, options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal ${options.size || ''}" style="${options.width ? 'max-width:' + options.width : ''}">
          <div class="modal-header">
            <h3>${this.escapeHTML(title)}</h3>
            <button class="modal-close" id="modal-close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">${content}</div>
          ${options.hideFooter ? '' : `
          <div class="modal-footer">
            ${options.hideCancel ? '' : '<button class="btn btn-ghost" id="modal-cancel-btn">Annuler</button>'}
            <button class="btn btn-primary" id="modal-confirm-btn">${this.escapeHTML(options.confirmText || 'Confirmer')}</button>
          </div>`}
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
        resolve(result);
      };

      overlay.querySelector('#modal-close-btn').onclick = () => close(false);
      const cancelBtn = overlay.querySelector('#modal-cancel-btn');
      if (cancelBtn) cancelBtn.onclick = () => close(false);
      const confirmBtn = overlay.querySelector('#modal-confirm-btn');
      if (confirmBtn) confirmBtn.onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  },

  /* ---- Close any active modal ---- */
  closeModal() {
    const overlay = document.querySelector('.modal-overlay.active');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  },

  async confirm(message, title = 'Confirmation') {
    return this.showModal(title, `<p style="text-align:center;font-size:1.1rem;padding:1rem 0">${message}</p>`, {
      confirmText: 'Oui, confirmer'
    });
  },

  /* ---- Export to CSV ---- */
  exportToCSV(data, filename) {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /* ---- Print Invoice ---- */
  printInvoice(html) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture - MON PARKING</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          .invoice-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; }
          .invoice-logo h1 { font-size: 24px; color: #6c5ce7; }
          .invoice-info { text-align: right; }
          .invoice-info h2 { font-size: 28px; color: #6c5ce7; margin-bottom: 10px; }
          .invoice-parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .invoice-party { width: 45%; }
          .invoice-party h4 { color: #6c5ce7; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
          .invoice-party p { font-size: 13px; line-height: 1.6; color: #444; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .invoice-table th { background: #6c5ce7; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .invoice-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .invoice-totals { text-align: right; margin-bottom: 40px; }
          .invoice-totals .total-row { display: flex; justify-content: flex-end; padding: 8px 0; }
          .invoice-totals .total-label { width: 150px; text-align: right; padding-right: 20px; color: #666; }
          .invoice-totals .total-value { width: 120px; text-align: right; font-weight: 600; }
          .invoice-totals .grand-total { font-size: 18px; color: #6c5ce7; border-top: 2px solid #6c5ce7; padding-top: 12px; margin-top: 8px; }
          .invoice-footer { text-align: center; padding-top: 30px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  },

  /* ---- Debounce ---- */
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /* ---- Get current session ---- */
  getCurrentUser() {
    const data = localStorage.getItem('monparking_session');
    return data ? JSON.parse(data) : null;
  },

  getCurrentParkingId() {
    const session = this.getCurrentUser();
    return session ? session.parkingId : null;
  },

  isAdmin() {
    const session = this.getCurrentUser();
    return session && session.role === 'admin';
  },

  /* ---- Avatar generation ---- */
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  },

  getAvatarColor(name) {
    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#e17055', '#00b894', '#0984e3', '#fdcb6e', '#d63031', '#a29bfe', '#55efc4'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  /* ---- Animate counters ---- */
  animateCounter(element, target, duration = 1500) {
    if (!element) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        element.textContent = this.formatNumber(target);
        clearInterval(timer);
      } else {
        element.textContent = this.formatNumber(Math.floor(start));
      }
    }, 16);
  }
};
