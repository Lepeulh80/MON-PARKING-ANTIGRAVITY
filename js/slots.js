/* ========================================================================
   MON PARKING - Interactive Parking Slot Map (Plan 2D Interactif)
   Visual management of physical parking bays, occupancy, and spot assignment
   ======================================================================== */

const Slots = {
  currentLevel: 'all',
  currentZone: 'all',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const parking = await DB.get('parkings', parkingId);
    let slots = await DB.getSlotsByParking(parkingId);
    const tickets = await DB.getTicketsByParking(parkingId);

    // If no slots exist yet, auto-seed default parking slots
    if (slots.length === 0) {
      await this.generateDefaultSlots(parkingId);
      slots = await DB.getSlotsByParking(parkingId);
    }

    const totalSlots = slots.length;
    const freeSlots = slots.filter(s => s.status === 'free').length;
    const occupiedSlots = slots.filter(s => s.status === 'occupied').length;
    const reservedSlots = slots.filter(s => s.status === 'reserved').length;
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    const filtered = slots.filter(s => {
      if (this.currentLevel !== 'all' && s.level !== this.currentLevel) return false;
      if (this.currentZone !== 'all' && s.zone !== this.currentZone) return false;
      return true;
    });

    const levels = [...new Set(slots.map(s => s.level))];
    const zones = [...new Set(slots.map(s => s.zone))];

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Parking Capacity KPIs -->
        <div class="stats-grid stagger-children">
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-check-circle"></i></div>
            <div class="stat-card-value">${freeSlots}</div>
            <div class="stat-card-label">Places Libres</div>
          </div>
          <div class="stat-card red hover-lift">
            <div class="stat-card-icon"><i class="fas fa-car-side"></i></div>
            <div class="stat-card-value">${occupiedSlots}</div>
            <div class="stat-card-label">Places Occupées (${occupancyRate}%)</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-bookmark"></i></div>
            <div class="stat-card-value">${reservedSlots}</div>
            <div class="stat-card-label">Places Réservées / VIP</div>
          </div>
          <div class="stat-card cyan hover-lift">
            <div class="stat-card-icon"><i class="fas fa-th"></i></div>
            <div class="stat-card-value">${totalSlots}</div>
            <div class="stat-card-label">Capacité Totale Répertoriée</div>
          </div>
        </div>

        <!-- Toolbar & Legend -->
        <div class="table-toolbar" style="margin-bottom:1rem">
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center">
            <div class="filter-tabs">
              <button class="filter-tab ${this.currentLevel === 'all' ? 'active' : ''}" onclick="Slots.setLevel('all')">
                Tous Niveaux
              </button>
              ${levels.map(lvl => `
                <button class="filter-tab ${this.currentLevel === lvl ? 'active' : ''}" onclick="Slots.setLevel('${lvl}')">
                  ${lvl}
                </button>
              `).join('')}
            </div>

            <div class="filter-tabs">
              <button class="filter-tab ${this.currentZone === 'all' ? 'active' : ''}" onclick="Slots.setZone('all')">
                Toutes Zones
              </button>
              ${zones.map(z => `
                <button class="filter-tab ${this.currentZone === z ? 'active' : ''}" onclick="Slots.setZone('${z}')">
                  Zone ${z}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary btn-sm" onclick="Slots.showAddModal()">
              <i class="fas fa-plus"></i> Ajouter une place
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Slots.showPublicTotemDisplay()" style="color:var(--accent-cyan);border-color:rgba(0,206,201,0.4)">
              <i class="fas fa-desktop"></i> Écran Borne Entrée
            </button>
            <button class="btn btn-ghost btn-sm" onclick="PlateScanner.openScannerModal()">
              <i class="fas fa-camera"></i> Scan Entrée/Sortie
            </button>
          </div>
        </div>

        <!-- Legend Bar -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1.5rem;padding:0.75rem 1.25rem;background:var(--bg-glass);border-radius:var(--radius-md);margin-bottom:1.5rem;border:1px solid var(--border-color);font-size:0.85rem">
          <span style="color:var(--text-muted);font-weight:700">LÉGENDE DU PLAN :</span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:14px;height:14px;border-radius:3px;background:var(--accent-green)"></span> Libre
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:14px;height:14px;border-radius:3px;background:var(--accent-red)"></span> Occupée
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:14px;height:14px;border-radius:3px;background:var(--primary)"></span> Réservée / Abonné
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <i class="fas fa-charging-station" style="color:var(--accent-cyan)"></i> Borne Électrique
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <i class="fas fa-wheelchair" style="color:#0984e3"></i> PMR / Handicap
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <i class="fas fa-crown" style="color:#fdcb6e"></i> VIP
          </span>
        </div>

        <!-- Interactive 2D Parking Slots Grid Layout -->
        <div class="dashboard-card animate-fade-up" style="background:linear-gradient(180deg, #0e1424, #0a0e1a);padding:1.5rem;border:1px solid rgba(255,255,255,0.1)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem">
            <h3 style="margin:0;font-size:1.1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
              <i class="fas fa-map-marked-alt" style="color:var(--accent-cyan)"></i>
              Plan Visuel des Allées & Emplacements
            </h3>
            <span style="font-size:0.8rem;color:var(--text-muted)">Cliquez sur une place pour interagir ou changer son statut</span>
          </div>

          <!-- Slots Bays Grid -->
          <div class="parking-bays-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(135px, 1fr));gap:14px">
            ${filtered.map(slot => {
              const isOccupied = slot.status === 'occupied';
              const isReserved = slot.status === 'reserved';
              const isFree = slot.status === 'free';

              let borderColor = 'var(--accent-green)';
              let bgColor = 'rgba(0, 184, 148, 0.12)';
              if (isOccupied) {
                borderColor = 'var(--accent-red)';
                bgColor = 'rgba(214, 48, 49, 0.15)';
              } else if (isReserved) {
                borderColor = 'var(--primary)';
                bgColor = 'rgba(108, 92, 231, 0.15)';
              }

              let typeIcon = '';
              if (slot.type === 'electric') typeIcon = '<i class="fas fa-bolt" style="color:var(--accent-cyan)" title="Borne Électrique"></i>';
              else if (slot.type === 'handicap') typeIcon = '<i class="fas fa-wheelchair" style="color:#0984e3" title="PMR"></i>';
              else if (slot.type === 'vip') typeIcon = '<i class="fas fa-crown" style="color:#fdcb6e" title="VIP"></i>';
              else if (slot.type === 'moto') typeIcon = '<i class="fas fa-motorcycle" style="color:var(--accent-pink)" title="Deux-roues"></i>';

              return `
                <div class="slot-bay-card hover-lift" onclick="Slots.openSlotDetails(${slot.id})"
                     style="position:relative;background:${bgColor};border:2px solid ${borderColor};border-radius:10px;padding:12px 10px;min-height:105px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:all 0.2s">
                  <!-- Road striping lines at top of slot -->
                  <div style="position:absolute;top:0;left:8px;right:8px;height:3px;background:rgba(255,255,255,0.25);border-radius:2px"></div>

                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px">
                    <span style="font-family:'Outfit', monospace;font-weight:900;font-size:1.15rem;color:#fff">${slot.slotNumber}</span>
                    <span style="font-size:0.85rem">${typeIcon}</span>
                  </div>

                  <!-- Slot center status / vehicle display -->
                  <div style="text-align:center;margin:6px 0">
                    ${isOccupied ? `
                      <div style="font-size:0.7rem;text-transform:uppercase;color:var(--accent-red);font-weight:700">OCCUPÉE</div>
                      <div style="font-family:monospace;font-size:0.8rem;font-weight:800;color:#fff;background:rgba(0,0,0,0.5);padding:2px 4px;border-radius:4px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${slot.currentPlate || 'En cours'}
                      </div>
                    ` : (isReserved ? `
                      <div style="font-size:0.75rem;color:var(--primary-light);font-weight:700">RÉSERVÉE</div>
                      <small style="font-size:0.65rem;color:var(--text-muted)">Abonné</small>
                    ` : `
                      <div style="font-size:0.75rem;color:var(--accent-green);font-weight:700"><i class="fas fa-check"></i> DISPO</div>
                    `)}
                  </div>

                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.68rem;color:var(--text-muted)">
                    <span>${slot.level ? slot.level.slice(0, 7) : 'RDC'}</span>
                    <span>Zone ${slot.zone || 'A'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  setLevel(level) {
    this.currentLevel = level;
    this.render();
  },

  setZone(zone) {
    this.currentZone = zone;
    this.render();
  },

  async openSlotDetails(slotId) {
    const slot = await DB.get('parkingSlots', slotId);
    if (!slot) return;

    const modalHtml = `
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-color)">
          <div>
            <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">EMPLACEMENT PHYSIQUE</div>
            <h2 style="font-size:1.8rem;font-weight:900;color:var(--accent-cyan);margin:0;font-family:'Outfit', monospace">
              PLACE ${slot.slotNumber}
            </h2>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:2px">
              ${slot.level} · Zone ${slot.zone || 'A'}
            </div>
          </div>
          <div>
            <span class="badge ${slot.status === 'free' ? 'badge-success' : (slot.status === 'occupied' ? 'badge-danger' : 'badge-primary')}" style="font-size:0.9rem;padding:6px 14px">
              ${slot.status === 'free' ? 'DISPONIBLE' : (slot.status === 'occupied' ? 'OCCUPÉE' : 'RÉSERVÉE')}
            </span>
          </div>
        </div>

        ${slot.status === 'occupied' ? `
          <div style="background:rgba(214,48,49,0.1);border:1px solid rgba(214,48,49,0.3);padding:1rem;border-radius:var(--radius-md)">
            <div style="font-size:0.8rem;color:var(--accent-red);font-weight:700">VÉHICULE EN STATIONNEMENT</div>
            <div style="font-family:'Outfit', monospace;font-size:1.4rem;font-weight:900;color:#fff;margin:4px 0">
              ${slot.currentPlate || 'Plaque non renseignée'}
            </div>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn btn-primary btn-sm" onclick="Slots.checkoutSlot(${slot.id})">
                <i class="fas fa-sign-out-alt"></i> Encaisser & Libérer la place
              </button>
            </div>
          </div>
        ` : `
          <div style="background:rgba(0,184,148,0.1);border:1px solid rgba(0,184,148,0.3);padding:1rem;border-radius:var(--radius-md)">
            <div style="font-size:0.8rem;color:var(--accent-green);font-weight:700">ATTRIBUER CETTE PLACE</div>
            <p style="margin:4px 0 10px;font-size:0.85rem;color:var(--text-muted)">
              Vous pouvez affecter cette place à une nouvelle entrée ou la réserver pour un client abonné.
            </p>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="Slots.assignNewVehicle(${slot.id})">
                <i class="fas fa-arrow-circle-right"></i> Affecter un véhicule
              </button>
              <button class="btn btn-ghost btn-sm" onclick="Slots.toggleReservation(${slot.id})">
                <i class="fas fa-bookmark"></i> ${slot.status === 'reserved' ? 'Lever réservation' : 'Réserver (Pass/VIP)'}
              </button>
            </div>
          </div>
        `}

        <div class="form-group" style="margin-top:0.5rem">
          <label>Type d'équipement de l'emplacement :</label>
          <select id="slot-type-edit" class="form-input" onchange="Slots.updateSlotType(${slot.id}, this.value)">
            <option value="standard" ${slot.type === 'standard' ? 'selected' : ''}>Standard (Tous véhicules)</option>
            <option value="electric" ${slot.type === 'electric' ? 'selected' : ''}>⚡ Borne de recharge électrique</option>
            <option value="handicap" ${slot.type === 'handicap' ? 'selected' : ''}>♿ Réservée PMR / Handicap</option>
            <option value="vip" ${slot.type === 'vip' ? 'selected' : ''}>👑 Place VIP / Direction</option>
            <option value="moto" ${slot.type === 'moto' ? 'selected' : ''}>🏍️ Emplacement Deux-roues / Moto</option>
          </select>
        </div>
      </div>
    `;

    Utils.showModal(`Détails de la place ${slot.slotNumber}`, modalHtml, {
      size: 'modal-md',
      hideFooter: true
    });
  },

  async updateSlotType(slotId, newType) {
    const slot = await DB.get('parkingSlots', slotId);
    if (!slot) return;
    slot.type = newType;
    await DB.update('parkingSlots', slot);
    Utils.notify(`Type de la place ${slot.slotNumber} mis à jour.`, 'info');
    this.render();
  },

  async toggleReservation(slotId) {
    const slot = await DB.get('parkingSlots', slotId);
    if (!slot) return;
    slot.status = slot.status === 'reserved' ? 'free' : 'reserved';
    await DB.update('parkingSlots', slot);
    Utils.notify(`Place ${slot.slotNumber} : ${slot.status === 'reserved' ? 'Réservée' : 'Libérée'}`, 'success');
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();
    this.render();
  },

  async checkoutSlot(slotId) {
    const slot = await DB.get('parkingSlots', slotId);
    if (!slot) return;

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();

    // Check if an active ticket exists for this plate
    const parkingId = Utils.getCurrentParkingId();
    const ticket = await DB.getActiveTicketByPlate(parkingId, slot.currentPlate);

    if (ticket) {
      PlateScanner.openExitTicketModal(ticket);
    } else {
      // Free slot directly
      slot.status = 'free';
      slot.currentPlate = null;
      await DB.update('parkingSlots', slot);
      Utils.notify(`Place ${slot.slotNumber} libérée avec succès.`, 'success');
      this.render();
    }
  },

  async assignNewVehicle(slotId) {
    const slot = await DB.get('parkingSlots', slotId);
    if (!slot) return;

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();

    const formHtml = `
      <div style="padding:0.5rem 0">
        <label style="display:block;margin-bottom:6px;font-weight:600">Plaque d'immatriculation du véhicule à garer sur la place ${slot.slotNumber} :</label>
        <input type="text" id="slot-assign-plate" class="form-input" placeholder="Ex: 240 TN 1892" style="text-transform:uppercase;font-size:1.1rem;font-weight:700">
      </div>
    `;

    const confirmed = await Utils.showModal(`Affecter la place ${slot.slotNumber}`, formHtml, { confirmText: 'Affecter la place' });
    if (confirmed) {
      const plate = document.getElementById('slot-assign-plate')?.value.trim();
      if (!plate) return;

      slot.status = 'occupied';
      slot.currentPlate = plate;
      await DB.update('parkingSlots', slot);

      Utils.notify(`Véhicule ${plate} affecté à la place ${slot.slotNumber}`, 'success');
      this.render();
    }
  },

  async showAddModal() {
    const formHtml = `
      <form id="add-slot-form" class="modal-form-grid" onsubmit="return false;">
        <div class="form-group">
          <label>Identifiant de place (Ex: A11, B05) *</label>
          <input type="text" id="slot-add-number" class="form-input" placeholder="Ex: D01" required style="text-transform:uppercase">
        </div>
        <div class="form-group">
          <label>Zone / Allée</label>
          <input type="text" id="slot-add-zone" class="form-input" placeholder="D" value="D" required>
        </div>
        <div class="form-group">
          <label>Niveau</label>
          <select id="slot-add-level" class="form-input">
            <option value="RDC / Niveau 0" selected>RDC / Niveau 0</option>
            <option value="Sous-Sol -1">Sous-Sol -1</option>
            <option value="Étage +1">Étage +1</option>
          </select>
        </div>
        <div class="form-group">
          <label>Équipement</label>
          <select id="slot-add-type" class="form-input">
            <option value="standard" selected>Standard</option>
            <option value="electric">⚡ Borne Électrique</option>
            <option value="handicap">♿ PMR / Handicap</option>
            <option value="vip">👑 VIP</option>
            <option value="moto">🏍️ Moto</option>
          </select>
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Ajouter une place de parking', formHtml, { confirmText: 'Créer la place' });
    if (confirmed) {
      const slotNumber = document.getElementById('slot-add-number').value.trim().toUpperCase();
      const zone = document.getElementById('slot-add-zone').value.trim().toUpperCase() || 'A';
      const level = document.getElementById('slot-add-level').value;
      const type = document.getElementById('slot-add-type').value;

      if (!slotNumber) {
        Utils.notify('Veuillez spécifier un identifiant de place', 'error');
        return;
      }

      const parkingId = Utils.getCurrentParkingId();
      await DB.add('parkingSlots', {
        parkingId,
        slotNumber,
        zone,
        level,
        type,
        status: 'free',
        currentPlate: null,
        notes: ''
      });

      Utils.notify(`Place ${slotNumber} ajoutée au plan.`, 'success');
      this.render();
    }
  },

  async generateDefaultSlots(parkingId) {
    const zones = ['A', 'B', 'C'];
    for (const z of zones) {
      for (let i = 1; i <= 10; i++) {
        await DB.add('parkingSlots', {
          parkingId,
          slotNumber: `${z}${String(i).padStart(2, '0')}`,
          zone: z,
          level: z === 'C' ? 'Sous-Sol -1' : 'RDC / Niveau 0',
          type: i === 1 ? 'handicap' : (i === 2 ? 'electric' : (i === 10 ? 'vip' : 'standard')),
          status: 'free',
          currentPlate: null,
          notes: ''
        });
      }
    }
  },

  async showPublicTotemDisplay() {
    const parkingId = Utils.getCurrentParkingId();
    const parking = await DB.get('parkings', parkingId);
    const slots = await DB.getSlotsByParking(parkingId);
    const capacity = parking?.capacity || slots.length || 100;
    const freeSlots = slots.filter(s => s.status === 'free').length;
    const isFull = freeSlots <= 0;

    const rdcFree = slots.filter(s => s.status === 'free' && s.level.includes('RDC')).length;
    const s1Free = slots.filter(s => s.status === 'free' && s.level.includes('Sous-Sol')).length;
    const pmsFree = slots.filter(s => s.status === 'free' && s.type === 'handicap').length;
    const elecFree = slots.filter(s => s.status === 'free' && s.type === 'electric').length;

    const modalHtml = `
      <div style="background:#0a0e1a;border:3px solid ${isFull ? '#e84118' : '#00cec9'};border-radius:16px;padding:2rem;text-align:center;box-shadow:0 0 40px ${isFull ? 'rgba(232,65,24,0.4)' : 'rgba(0,206,201,0.35)'}">
        <div style="font-size:0.9rem;letter-spacing:4px;color:#8b8fa3;text-transform:uppercase;font-weight:700">
          ${parking?.name || 'MON PARKING'} · BORNE D'AFFICHAGE ENTRÉE
        </div>

        <div style="margin:1.5rem 0">
          <div style="font-size:1.1rem;font-weight:700;color:${isFull ? '#ff7675' : '#55efc4'};letter-spacing:2px;margin-bottom:6px">
            ${isFull ? '🔴 PARKING COMPLET' : '🟢 ACCÈS LIBRE · PLACES DISPONIBLES'}
          </div>
          <div style="font-size:5rem;font-weight:900;font-family:'Outfit',monospace;line-height:1;color:${isFull ? '#ff7675' : '#00cec9'};text-shadow:0 0 30px ${isFull ? 'rgba(255,118,117,0.6)' : 'rgba(0,206,201,0.6)'}">
            ${freeSlots}
          </div>
          <div style="font-size:0.95rem;color:#dfe6e9;margin-top:6px">
            Places libres sur ${capacity} emplacements répertoriés
          </div>
        </div>

        <!-- Levels Breakdown Matrix -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:1rem;margin-top:2rem;background:rgba(255,255,255,0.04);padding:1.25rem;border-radius:12px;border:1px solid rgba(255,255,255,0.1)">
          <div>
            <div style="font-size:0.75rem;color:#8b8fa3;text-transform:uppercase">Niveau RDC</div>
            <div style="font-size:1.8rem;font-weight:800;color:#00cec9">${rdcFree}</div>
            <div style="font-size:0.75rem;color:#55efc4">Libres</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#8b8fa3;text-transform:uppercase">Sous-Sol -1</div>
            <div style="font-size:1.8rem;font-weight:800;color:#00cec9">${s1Free}</div>
            <div style="font-size:0.75rem;color:#55efc4">Libres</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#8b8fa3;text-transform:uppercase">PMR Handicap</div>
            <div style="font-size:1.8rem;font-weight:800;color:#a29bfe">${pmsFree}</div>
            <div style="font-size:0.75rem;color:#a29bfe">Disponibles</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#8b8fa3;text-transform:uppercase">Recharge Élec.</div>
            <div style="font-size:1.8rem;font-weight:800;color:#fdcb6e">${elecFree}</div>
            <div style="font-size:0.75rem;color:#fdcb6e">Bornes Libres</div>
          </div>
        </div>

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:#8b8fa3;border-top:1px solid rgba(255,255,255,0.08);padding-top:1rem">
          <div><i class="fas fa-video" style="color:#00cec9"></i> Reconnaissance Plaque LPR Active</div>
          <div><i class="fas fa-check-circle" style="color:#55efc4"></i> Barrière Entrée 1 : Opérationnelle</div>
        </div>
      </div>
    `;

    Utils.showModal('Affichage Public · Totem Borne d\'Entrée', modalHtml, {
      size: 'modal-lg',
      hideCancel: true,
      confirmText: 'Fermer l\'affichage'
    });
  }
};
