/* ========================================================================
   MON PARKING - Employees Module
   Team members management, roles, permissions, and performance stats
   ======================================================================== */

const Employees = {
  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const employees = await DB.getEmployeesByParking(parkingId);
    const topEmployees = await DB.getTopEmployees(parkingId, 20);

    const totalStaff = employees.length;
    const activeStaff = employees.filter(e => e.isActive !== false).length;
    const totalTeamRevenue = topEmployees.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-users-cog"></i></div>
            <div class="stat-card-value">${totalStaff}</div>
            <div class="stat-card-label">Équipe au complet</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-user-check"></i></div>
            <div class="stat-card-value">${activeStaff}</div>
            <div class="stat-card-label">Collaborateurs actifs</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-trophy"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(totalTeamRevenue)}</div>
            <div class="stat-card-label">Performance globale équipe</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-chart-line"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(activeStaff > 0 ? totalTeamRevenue / activeStaff : 0)}</div>
            <div class="stat-card-label">CA moyen par collaborateur</div>
          </div>
        </div>

        <div class="table-toolbar">
          <h3><i class="fas fa-user-tie" style="color:var(--primary-light)"></i> Gestion des Collaborateurs & Accès</h3>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Employees.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            ${Utils.isAdmin() ? `
              <button class="btn btn-primary" onclick="Employees.showModal()">
                <i class="fas fa-user-plus"></i> Nouveau collaborateur
              </button>
            ` : ''}
          </div>
        </div>

        <div class="table-container animate-fade-up">
          <table class="data-table">
            <thead>
              <tr>
                <th>Collaborateur</th>
                <th>Rôle</th>
                <th>Contact</th>
                <th>Ventes</th>
                <th>Locations</th>
                <th>CA Généré</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => {
                let roleBadge = 'badge-info';
                let roleLabel = 'Commercial / Agent';
                if (emp.role === 'admin') { roleBadge = 'badge-primary'; roleLabel = 'Super Administrateur'; }
                else if (emp.role === 'manager') { roleBadge = 'badge-purple'; roleLabel = 'Chef de Parc / Manager'; }
                else if (emp.role === 'cashier') { roleBadge = 'badge-cyan'; roleLabel = 'Caissier / Opérateur Barrière'; }
                else if (emp.role === 'security') { roleBadge = 'badge-danger'; roleLabel = 'Agent de Sécurité'; }
                const isActive = emp.isActive !== false;

                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:0.75rem">
                        <div class="user-avatar" style="width:38px;height:38px;font-size:0.95rem;background:linear-gradient(135deg, var(--primary), var(--accent-purple));color:#fff">
                          ${Utils.escapeHTML(emp.firstName ? emp.firstName[0] : '')}${Utils.escapeHTML(emp.lastName ? emp.lastName[0] : '')}
                        </div>
                        <div>
                          <div style="font-weight:700;color:var(--text-main)">${Utils.escapeHTML(emp.firstName)} ${Utils.escapeHTML(emp.lastName)}</div>
                          <small style="color:var(--text-muted)">Inscrit le ${Utils.formatDate(emp.createdAt)}</small>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge ${roleBadge}">${roleLabel}</span></td>
                    <td>
                      <div><i class="fas fa-envelope" style="font-size:0.75rem;color:var(--primary-light);margin-right:4px"></i> ${Utils.escapeHTML(emp.email)}</div>
                      ${emp.phone ? `<small style="color:var(--text-muted)"><i class="fas fa-phone" style="font-size:0.75rem;margin-right:4px"></i> ${Utils.escapeHTML(emp.phone)}</small>` : ''}
                    </td>
                    <td><span class="badge badge-secondary">${stats.salesCount}</span></td>
                    <td><span class="badge badge-secondary">${stats.rentalsCount}</span></td>
                    <td style="font-weight:700;color:var(--accent-green)">${Utils.formatCurrency(stats.totalRevenue)}</td>
                    <td>
                      <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}" 
                            style="cursor:${Utils.isAdmin() ? 'pointer' : 'default'}" 
                            onclick="${Utils.isAdmin() ? `Employees.toggleActive(${emp.id})` : ''}"
                            title="${Utils.isAdmin() ? 'Cliquer pour changer de statut' : ''}">
                        ${isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group">
                        ${Utils.isAdmin() ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Employees.showModal(${emp.id})" data-tooltip="Modifier">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Employees.resetPasswordModal(${emp.id})" data-tooltip="Changer mot de passe">
                            <i class="fas fa-key"></i>
                          </button>
                          ${emp.id !== Auth.user.id ? `
                            <button class="btn btn-ghost btn-sm btn-icon" onclick="Employees.deleteEmployee(${emp.id})" data-tooltip="Supprimer">
                              <i class="fas fa-trash" style="color:var(--accent-red)"></i>
                            </button>
                          ` : ''}
                        ` : `
                          <span style="font-size:0.8rem;color:var(--text-muted)">Lecture seule</span>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async showModal(empId = null) {
    if (!Utils.isAdmin() && !(typeof Auth !== 'undefined' && Auth.hasPermission('manage_users'))) {
      Utils.notify('Action réservée à la direction administrateur', 'error');
      return;
    }

    const isEdit = !!empId;
    let emp = null;
    if (isEdit) {
      emp = await DB.get('users', empId);
    }

    const currentUserIsAdmin = Utils.isAdmin();

    const formHtml = `
      <form id="emp-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group">
          <label><i class="fas fa-user"></i> Prénom *</label>
          <input type="text" id="emp-firstname" class="form-input" value="${emp?.firstName || ''}" required>
        </div>
        <div class="form-group">
          <label><i class="fas fa-user"></i> Nom *</label>
          <input type="text" id="emp-lastname" class="form-input" value="${emp?.lastName || ''}" required>
        </div>

        <div class="form-group">
          <label><i class="fas fa-envelope"></i> Adresse Email *</label>
          <input type="email" id="emp-email" class="form-input" value="${emp?.email || ''}" required ${isEdit ? 'disabled' : ''}>
        </div>
        <div class="form-group">
          <label><i class="fas fa-phone"></i> Téléphone</label>
          <input type="tel" id="emp-phone" class="form-input" value="${emp?.phone || ''}" placeholder="+216 ...">
        </div>

        ${!isEdit ? `
          <div class="form-group span-2">
            <label><i class="fas fa-lock"></i> Mot de passe initial *</label>
            <input type="password" id="emp-password" class="form-input" placeholder="Au moins 6 caractères" required minlength="6">
          </div>
        ` : ''}

        <div class="form-group">
          <label><i class="fas fa-user-shield"></i> Rôle & Droits d'accès</label>
          <select id="emp-role" class="form-input">
            <option value="cashier" ${emp?.role === 'cashier' ? 'selected' : ''}>Caissier / Opérateur Barrière</option>
            <option value="security" ${emp?.role === 'security' ? 'selected' : ''}>Agent de Sécurité</option>
            <option value="manager" ${emp?.role === 'manager' ? 'selected' : ''}>Chef de Parc / Manager</option>
            ${currentUserIsAdmin ? `<option value="admin" ${emp?.role === 'admin' ? 'selected' : ''}>Super Administrateur</option>` : ''}
            <option value="employee" ${emp?.role === 'employee' ? 'selected' : ''}>Commercial / Agent</option>
          </select>
        </div>
        <div class="form-group">
          <label><i class="fas fa-toggle-on"></i> Statut du compte</label>
          <select id="emp-status" class="form-input">
            <option value="true" ${emp?.isActive !== false ? 'selected' : ''}>Compte Actif</option>
            <option value="false" ${emp?.isActive === false ? 'selected' : ''}>Compte Suspendu</option>
          </select>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal(isEdit ? 'Modifier le collaborateur' : 'Ajouter un collaborateur', formHtml, {
      confirmText: isEdit ? 'Sauvegarder' : 'Créer l\'accès',
      size: 'modal-md'
    });

    if (confirmed) {
      const firstName = document.getElementById('emp-firstname').value.trim();
      const lastName = document.getElementById('emp-lastname').value.trim();
      const phone = document.getElementById('emp-phone').value.trim();
      const role = document.getElementById('emp-role').value;
      const isActive = document.getElementById('emp-status').value === 'true';

      if (!firstName || !lastName) {
        Utils.notify('Veuillez remplir le nom et le prénom', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();

      if (isEdit) {
        emp.firstName = firstName;
        emp.lastName = lastName;
        emp.phone = phone;
        emp.role = role;
        emp.isActive = isActive;
        await DB.update('users', emp);
        Utils.notify('Collaborateur mis à jour avec succès', 'success');
      } else {
        const email = document.getElementById('emp-email').value.trim().toLowerCase();
        const password = document.getElementById('emp-password').value;

        if (!email || !password || password.length < 6) {
          Utils.notify('Email valide et mot de passe (min 6 car.) requis', 'error');
          return;
        }

        // Check if email already used
        const existing = await DB.getOneByIndex('users', 'email', email);
        if (existing) {
          Utils.notify('Un compte existe déjà avec cette adresse email', 'error');
          return;
        }

        const hashedPassword = await Utils.hashPassword(password);
        await DB.add('users', {
          parkingId,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          isActive,
          createdAt: new Date().toISOString()
        });

        Utils.notify(`Collaborateur ${firstName} ${lastName} créé !`, 'success');
      }

      this.render();
    }
  },

  async resetPasswordModal(empId) {
    const emp = await DB.get('users', empId);
    if (!emp) return;

    const formHtml = `
      <div style="padding:0.5rem 0">
        <p>Réinitialiser l'accès pour : <strong>${emp.firstName} ${emp.lastName}</strong> (${emp.email})</p>
        <div class="form-group" style="margin-top:1rem">
          <label>Nouveau mot de passe :</label>
          <input type="password" id="reset-new-password" class="form-input" placeholder="Min. 6 caractères" required minlength="6">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Modifier le mot de passe', formHtml, { confirmText: 'Changer le mot de passe' });
    if (confirmed) {
      const newPass = document.getElementById('reset-new-password').value;
      if (!newPass || newPass.length < 6) {
        Utils.notify('Le mot de passe doit comporter au moins 6 caractères', 'error');
        return;
      }

      emp.password = await Utils.hashPassword(newPass);
      await DB.update('users', emp);
      Utils.notify('Mot de passe mis à jour avec succès', 'success');
    }
  },

  async toggleActive(empId) {
    const emp = await DB.get('users', empId);
    if (!emp) return;
    if (emp.id === Auth.user.id) {
      Utils.notify('Vous ne pouvez pas désactiver votre propre compte', 'warning');
      return;
    }

    emp.isActive = emp.isActive === false ? true : false;
    await DB.update('users', emp);
    Utils.notify(`Statut de ${emp.firstName} : ${emp.isActive ? 'Actif' : 'Suspendu'}`, 'info');
    this.render();
  },

  async deleteEmployee(empId) {
    const ok = await Utils.confirm('Supprimer définitivement ce collaborateur ? Cette action est irréversible.');
    if (!ok) return;

    await DB.delete('users', empId);
    Utils.notify('Collaborateur supprimé', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const employees = await DB.getEmployeesByParking(parkingId);
    const data = employees.map(e => ({
      Prenom: e.firstName,
      Nom: e.lastName,
      Email: e.email,
      Telephone: e.phone || '',
      Role: e.role,
      Statut: e.isActive !== false ? 'Actif' : 'Suspendu',
      DateCreation: e.createdAt
    }));
    Utils.exportToCSV(data, 'equipe_mon_parking');
  }
};
