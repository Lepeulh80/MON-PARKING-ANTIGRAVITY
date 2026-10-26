/* ========================================================================
   MON PARKING - Staff Attendance & Time Clock Module (Pointage RH)
   Clock in/out, shift hours calculation, attendance logs, and payroll prep
   ======================================================================== */

const Attendance = {
  selectedDate: new Date().toISOString().split('T')[0],

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const employees = await DB.getEmployeesByParking(parkingId);
    let logs = await DB.getAttendanceByParking(parkingId);
    logs.sort((a, b) => new Date(b.checkIn || b.date) - new Date(a.checkIn || a.date));

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.date === todayStr);

    const currentUserLogToday = logs.find(l => l.userId === Auth.user.id && l.date === todayStr && !l.checkOut);

    const totalStaff = employees.filter(e => e.isActive !== false).length;
    const presentToday = todayLogs.filter(l => l.status === 'present').length;
    const onShiftNow = todayLogs.filter(l => !l.checkOut).length;

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Staff Presence KPIs -->
        <div class="stats-grid stagger-children">
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-user-check"></i></div>
            <div class="stat-card-value">${presentToday} / ${totalStaff}</div>
            <div class="stat-card-label">Collaborateurs Présents Aujourd'hui</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-user-clock"></i></div>
            <div class="stat-card-value">${onShiftNow}</div>
            <div class="stat-card-label">En Poste Actuellement (Shift actif)</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-history"></i></div>
            <div class="stat-card-value">${logs.length}</div>
            <div class="stat-card-label">Total Pointages Enregistrés</div>
          </div>
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-card-value">${totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 100}%</div>
            <div class="stat-card-label">Taux de Présence Journalier</div>
          </div>
        </div>

        <!-- My Personal Clock In/Out Quick Action Card -->
        <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(0, 206, 201, 0.15));border:1px solid rgba(108, 92, 231, 0.3);padding:1.5rem;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1.5rem">
          <div>
            <span class="badge badge-primary" style="font-size:0.8rem;margin-bottom:6px">BADGEUSE VIRTUELLE HORODATÉE</span>
            <h2 style="font-size:1.35rem;font-weight:800;color:var(--text-main);margin:0">
              Session de Travail : ${Auth.user.firstName} ${Auth.user.lastName}
            </h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin:4px 0 0">
              ${currentUserLogToday ? `Poste pris à ${Utils.formatDateTime(currentUserLogToday.checkIn)}. Shift en cours.` : 'Vous n\'avez pas encore badgé votre prise de poste aujourd\'hui.'}
            </p>
          </div>

          <div>
            ${currentUserLogToday ? `
              <button class="btn btn-sm hover-lift" style="background:var(--accent-red);color:#fff;border-radius:24px;padding:10px 22px;font-weight:700" onclick="Attendance.clockOut(${currentUserLogToday.id})">
                <i class="fas fa-sign-out-alt"></i> BADGER LA FIN DE SHIFT
              </button>
            ` : `
              <button class="btn btn-primary hover-lift" style="border-radius:24px;padding:10px 22px;font-weight:700" onclick="Attendance.clockIn()">
                <i class="fas fa-sign-in-alt"></i> BADGER MA PRISE DE POSTE
              </button>
            `}
          </div>
        </div>

        <!-- Attendance Logs Toolbar -->
        <div class="table-toolbar">
          <div style="display:flex;align-items:center;gap:1rem">
            <h3 style="margin:0;font-size:1.1rem"><i class="fas fa-calendar-day" style="color:var(--primary-light)"></i> Registre des Pointages</h3>
          </div>

          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Attendance.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter CSV
            </button>
            ${Utils.isAdmin() ? `
              <button class="btn btn-primary btn-sm" onclick="Attendance.showManualModal()">
                <i class="fas fa-plus"></i> Pointage manuel
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Attendance Logs Table -->
        <div class="table-container animate-fade-up">
          <table class="data-table">
            <thead>
              <tr>
                <th>Collaborateur</th>
                <th>Date</th>
                <th>Heure d'arrivée</th>
                <th>Heure de départ</th>
                <th>Durée effective</th>
                <th>Statut</th>
                <th>Remarques</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => {
                const emp = employees.find(e => e.id === log.userId);
                const hasClockOut = !!log.checkOut;
                let durText = 'En cours...';
                if (hasClockOut) {
                  const mins = log.durationMinutes || Math.round((new Date(log.checkOut) - new Date(log.checkIn)) / 60000);
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  durText = `${h}h ${m}m`;
                }

                return `
                  <tr>
                    <td>
                      <div style="font-weight:700;color:var(--text-main)">
                        ${emp ? `${emp.firstName} ${emp.lastName}` : 'Collaborateur #' + log.userId}
                      </div>
                      <small style="color:var(--text-muted)">${emp?.role || 'Personnel'}</small>
                    </td>
                    <td>${Utils.formatDate(log.date)}</td>
                    <td><strong style="color:var(--accent-green)">${Utils.formatDateTime(log.checkIn)}</strong></td>
                    <td>${hasClockOut ? Utils.formatDateTime(log.checkOut) : '<span class="badge badge-warning">En poste</span>'}</td>
                    <td><strong style="color:var(--primary-light)">${durText}</strong></td>
                    <td>
                      <span class="badge ${hasClockOut ? 'badge-success' : 'badge-info animate-pulse'}">
                        ${hasClockOut ? 'Terminé' : 'En service'}
                      </span>
                    </td>
                    <td style="color:var(--text-muted);font-size:0.85rem">${log.notes || '-'}</td>
                    <td>
                      <div class="btn-group">
                        ${!hasClockOut && (log.userId === Auth.user.id || Utils.isAdmin()) ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Attendance.clockOut(${log.id})" data-tooltip="Clôturer le shift">
                            <i class="fas fa-sign-out-alt" style="color:var(--accent-red)"></i>
                          </button>
                        ` : ''}
                        ${Utils.isAdmin() ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Attendance.deleteLog(${log.id})" data-tooltip="Supprimer">
                            <i class="fas fa-trash" style="color:var(--accent-red)"></i>
                          </button>
                        ` : ''}
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

  async clockIn() {
    const parkingId = Utils.getCurrentParkingId();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    await DB.add('attendance', {
      parkingId,
      userId: Auth.user.id,
      date: today,
      checkIn: now.toISOString(),
      checkOut: null,
      durationMinutes: null,
      status: 'present',
      notes: 'Pointage automatique badgeuse web'
    });

    await DB.logActivity(parkingId, Auth.user.id, 'Prise de poste', `${Auth.user.firstName} ${Auth.user.lastName} a badgé son arrivée à ${Utils.formatDateTime(now)}`);
    Utils.notify('Prise de poste enregistrée ! Bon shift.', 'success');
    this.render();
  },

  async clockOut(logId) {
    const log = await DB.get('attendance', logId);
    if (!log) return;

    const now = new Date();
    const diffMins = Math.max(1, Math.round((now - new Date(log.checkIn)) / (1000 * 60)));

    log.checkOut = now.toISOString();
    log.durationMinutes = diffMins;

    await DB.update('attendance', log);

    const parkingId = Utils.getCurrentParkingId();
    await DB.logActivity(parkingId, log.userId, 'Fin de poste', `Shift terminé après ${Math.floor(diffMins/60)}h ${diffMins%60}m de travail`);
    Utils.notify('Fin de poste enregistrée avec succès.', 'success');
    this.render();
  },

  async showManualModal() {
    const parkingId = Utils.getCurrentParkingId();
    const employees = await DB.getEmployeesByParking(parkingId);
    const today = new Date().toISOString().split('T')[0];

    const formHtml = `
      <form id="att-manual-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group span-2">
          <label>Collaborateur *</label>
          <select id="man-att-user" class="form-input">
            ${employees.map(e => `<option value="${e.id}">${e.firstName} ${e.lastName} (${e.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date du shift *</label>
          <input type="date" id="man-att-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label>Heures effectuées (h)</label>
          <input type="number" id="man-att-hours" class="form-input" value="8" min="1" max="16">
        </div>
        <div class="form-group span-2">
          <label>Commentaire</label>
          <input type="text" id="man-att-notes" class="form-input" placeholder="Ex: Remplacement, garde de nuit, etc.">
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Ajouter un pointage manuel', formHtml, { confirmText: 'Enregistrer' });
    if (confirmed) {
      const userId = parseInt(document.getElementById('man-att-user').value);
      const date = document.getElementById('man-att-date').value;
      const hours = parseFloat(document.getElementById('man-att-hours').value) || 8;
      const notes = document.getElementById('man-att-notes').value.trim();

      const checkIn = new Date(`${date}T08:00:00Z`).toISOString();
      const checkOut = new Date(`${date}T${String(8 + Math.floor(hours)).padStart(2, '0')}:00:00Z`).toISOString();

      await DB.add('attendance', {
        parkingId,
        userId,
        date,
        checkIn,
        checkOut,
        durationMinutes: Math.round(hours * 60),
        status: 'present',
        notes: notes || 'Pointage manuel administrateur'
      });

      Utils.notify('Pointage enregistré.', 'success');
      this.render();
    }
  },

  async deleteLog(logId) {
    const ok = await Utils.confirm('Supprimer cet enregistrement de présence ?');
    if (!ok) return;

    await DB.delete('attendance', logId);
    Utils.notify('Enregistrement supprimé', 'info');
    this.render();
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const logs = await DB.getAttendanceByParking(parkingId);
    const employees = await DB.getEmployeesByParking(parkingId);

    const data = logs.map(l => {
      const emp = employees.find(e => e.id === l.userId);
      return {
        Employe: emp ? `${emp.firstName} ${emp.lastName}` : l.userId,
        Date: l.date,
        Arrivee: l.checkIn,
        Depart: l.checkOut || '',
        DureeMinutes: l.durationMinutes || '',
        Statut: l.status,
        Remarques: l.notes || ''
      };
    });

    Utils.exportToCSV(data, 'pointage_personnel_parking');
  }
};
