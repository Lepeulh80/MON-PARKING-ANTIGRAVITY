/* ========================================================================
   MON PARKING - Vehicles Module
   Complete vehicle management: CRUD, grid/table view, photo gallery, 360° viewer
   ======================================================================== */

const Vehicles = {
  viewMode: 'grid',
  filterStatus: 'all',
  searchQuery: '',
  _pendingPhotos: [],
  _photoManagerVehicle: null,
  _photoManagerRender: null,

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');

    let vehicles = await DB.getVehiclesByParking(parkingId);

    if (this.filterStatus !== 'all') {
      vehicles = vehicles.filter(v => v.status === this.filterStatus);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      vehicles = vehicles.filter(v =>
        (v.brand + ' ' + v.model).toLowerCase().includes(q) ||
        (v.licensePlate || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q)
      );
    }

    const allVehicles = await DB.getVehiclesByParking(parkingId);
    const statusCounts = {
      all: allVehicles.length,
      available: allVehicles.filter(v => v.status === 'available').length,
      sold: allVehicles.filter(v => v.status === 'sold').length,
      rented: allVehicles.filter(v => v.status === 'rented').length,
      reserved: allVehicles.filter(v => v.status === 'reserved').length
    };

    content.innerHTML = `
      <div class="page-content">
        <div class="table-toolbar">
          <div class="table-filters">
            <div class="filter-chip ${this.filterStatus === 'all' ? 'active' : ''}" onclick="Vehicles.setFilter('all')">Tous (${statusCounts.all})</div>
            <div class="filter-chip ${this.filterStatus === 'available' ? 'active' : ''}" onclick="Vehicles.setFilter('available')"><i class="fas fa-check-circle" style="color:var(--accent-green)"></i> Disponibles (${statusCounts.available})</div>
            <div class="filter-chip ${this.filterStatus === 'sold' ? 'active' : ''}" onclick="Vehicles.setFilter('sold')"><i class="fas fa-tag" style="color:var(--accent-blue)"></i> Vendus (${statusCounts.sold})</div>
            <div class="filter-chip ${this.filterStatus === 'rented' ? 'active' : ''}" onclick="Vehicles.setFilter('rented')"><i class="fas fa-key" style="color:var(--accent-yellow)"></i> En location (${statusCounts.rented})</div>
            <div class="filter-chip ${this.filterStatus === 'reserved' ? 'active' : ''}" onclick="Vehicles.setFilter('reserved')"><i class="fas fa-bookmark" style="color:var(--primary-light)"></i> Réservés (${statusCounts.reserved})</div>
          </div>
          <div class="btn-group">
            <div class="header-search" style="position:relative">
              <i class="fas fa-search"></i>
              <input type="text" placeholder="Rechercher un véhicule..." value="${this.searchQuery}" oninput="Vehicles.handleSearch(this.value)" style="width:220px">
            </div>
            <div class="view-toggle">
              <button class="view-toggle-btn ${this.viewMode === 'grid' ? 'active' : ''}" onclick="Vehicles.setView('grid')" title="Vue grille photos"><i class="fas fa-th-large"></i></button>
              <button class="view-toggle-btn ${this.viewMode === 'table' ? 'active' : ''}" onclick="Vehicles.setView('table')" title="Vue tableau"><i class="fas fa-list"></i></button>
            </div>
            <button class="btn btn-ghost" onclick="PlateScanner.openScannerModal()" style="color:var(--accent-cyan);border:1px solid rgba(0,206,201,0.3)"><i class="fas fa-camera"></i> Scan Plaque</button>
            ${Utils.isAdmin() ? '<button class="btn btn-primary" onclick="Vehicles.showAddModal()"><i class="fas fa-plus"></i> Ajouter</button>' : ''}
          </div>
        </div>

        ${vehicles.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-car"></i></div>
            <h3>Aucun véhicule trouvé</h3>
            <p>Ajoutez votre premier véhicule avec photos pour commencer</p>
            ${Utils.isAdmin() ? '<button class="btn btn-primary" onclick="Vehicles.showAddModal()"><i class="fas fa-plus"></i> Ajouter un véhicule</button>' : ''}
          </div>
        ` : this.viewMode === 'grid' ? `
          <div class="vehicle-grid stagger-children">
            ${vehicles.map(v => this.renderVehicleCard(v)).join('')}
          </div>
        ` : `
          <div class="table-container animate-fade-up">
            <table class="data-table">
              <thead><tr>
                <th>Photo</th><th>Véhicule</th><th>Immatriculation</th>
                <th>Année</th><th>Catégorie</th><th>Statut</th>
                <th>Prix vente</th><th>Prix/jour</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${vehicles.map(v => {
                  const imgs = v.images || [];
                  return `<tr>
                    <td>
                      <div style="width:56px;height:42px;border-radius:8px;overflow:hidden;background:var(--bg-glass);display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="Vehicles.open360Viewer(${v.id})">
                        ${imgs.length > 0 ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover" alt="${Utils.escapeHTML(v.brand)}">` : '<i class="fas fa-camera" style="color:var(--text-muted);font-size:1.1rem"></i>'}
                      </div>
                    </td>
                    <td>
                      <strong style="color:var(--text-primary)">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</strong>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${Utils.escapeHTML(v.color || '')} · ${Utils.escapeHTML(v.fuel || '')}</div>
                    </td>
                    <td style="font-family:monospace;font-weight:600">${Utils.escapeHTML(v.licensePlate || '-')}</td>
                    <td>${Utils.escapeHTML(String(v.year || '-'))}</td>
                    <td>${Utils.escapeHTML(v.category || '-')}</td>
                    <td><span class="badge ${Utils.getStatusBadge(v.status).class}">${Utils.getStatusBadge(v.status).label}</span></td>
                    <td style="font-weight:700;color:var(--primary-light)">${Utils.formatCurrency(v.salePrice)}</td>
                    <td>${Utils.formatCurrency(v.rentalPricePerDay)}/j</td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.showDetail(${v.id})" title="Voir"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.open360Viewer(${v.id})" title="Viewer 360" style="color:var(--accent-cyan)"><i class="fas fa-rotate"></i></button>
                        ${Utils.isAdmin() ? `
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.showEditModal(${v.id})"><i class="fas fa-edit"></i></button>
                          <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.deleteVehicle(${v.id})"><i class="fas fa-trash" style="color:var(--accent-red)"></i></button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
        <div style="margin-top:var(--spacing-lg);text-align:center">
          <p style="font-size:0.82rem;color:var(--text-muted)">${vehicles.length} véhicule${vehicles.length > 1 ? 's' : ''} affiché${vehicles.length > 1 ? 's' : ''}</p>
        </div>
      </div>
    `;
  },

  renderVehicleCard(v) {
    const badge = Utils.getStatusBadge(v.status);
    const imgs = v.images || [];
    const mainPhoto = imgs.length > 0 ? imgs[0] : null;

    return `
      <div class="vehicle-card hover-lift" onclick="Vehicles.showDetail(${v.id})">
        <div class="vehicle-card-image" style="position:relative;overflow:hidden;background:${mainPhoto ? 'transparent' : 'var(--bg-glass)'}">
          ${mainPhoto
            ? `<img src="${mainPhoto}" alt="${Utils.escapeHTML(v.brand)}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s ease" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">`
            : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--text-muted)">
                <i class="fas fa-car-side" style="font-size:2.5rem;opacity:0.4"></i>
                <small style="font-size:0.7rem;opacity:0.6">Pas de photo</small>
              </div>`
          }
          <div class="vehicle-card-status"><span class="badge ${badge.class}">${badge.label}</span></div>
          ${imgs.length > 1 ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:0.7rem;padding:3px 8px;border-radius:20px;backdrop-filter:blur(4px)"><i class="fas fa-images"></i> ${imgs.length} photos</div>` : ''}
          ${imgs.length > 0 ? `
            <button onclick="event.stopPropagation();Vehicles.open360Viewer(${v.id})"
              style="position:absolute;top:8px;right:8px;background:rgba(0,206,201,0.85);border:none;border-radius:50%;width:32px;height:32px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s"
              title="Vue 360°" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              <i class="fas fa-rotate" style="font-size:0.9rem"></i>
            </button>
          ` : ''}
        </div>
        <div class="vehicle-card-body">
          <div class="vehicle-card-title">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</div>
          <div class="vehicle-card-subtitle">${Utils.escapeHTML(String(v.year || ''))} · ${Utils.escapeHTML(v.color || '')} · ${Utils.escapeHTML(v.transmission || '')}</div>
          <div class="vehicle-card-details">
            <div class="vehicle-detail"><i class="fas fa-gas-pump"></i> ${Utils.escapeHTML(v.fuel || '')}</div>
            <div class="vehicle-detail"><i class="fas fa-tachometer-alt"></i> ${Utils.formatNumber(v.mileage)} km</div>
            <div class="vehicle-detail"><i class="fas fa-tag"></i> ${Utils.escapeHTML(v.category || '')}</div>
            <div class="vehicle-detail"><i class="fas fa-id-card"></i> ${Utils.escapeHTML(v.licensePlate || '-')}</div>
          </div>
        </div>
        <div class="vehicle-card-footer">
          <div class="vehicle-price">${Utils.formatCurrency(v.salePrice)} <span>/ ${Utils.formatCurrency(v.rentalPricePerDay)}/j</span></div>
          <div class="btn-group">
            ${Utils.isAdmin() ? `
              <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();Vehicles.showPhotoManager(${v.id})" title="Gérer photos" style="color:var(--accent-cyan)"><i class="fas fa-camera"></i></button>
              <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();Vehicles.showEditModal(${v.id})"><i class="fas fa-edit"></i></button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  setFilter(status) { this.filterStatus = status; this.render(); },
  setView(mode) { this.viewMode = mode; this.render(); },
  handleSearch: Utils.debounce(function(value) { Vehicles.searchQuery = value; Vehicles.render(); }, 300),

  // ============================================================
  // PHOTO MANAGER
  // ============================================================
  async showPhotoManager(vehicleId) {
    // Delegate to enhanced photo manager if available
    if (typeof PhotoEnhanced !== 'undefined') {
      return PhotoEnhanced.openManager(vehicleId);
    }
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    v.images = v.images || [];

    const renderGallery = () => {
      const grid = document.getElementById('photo-gallery-grid');
      if (!grid) return;
      if (v.images.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)"><i class="fas fa-images" style="font-size:2rem;opacity:0.4"></i><p>Aucune photo. Téléchargez ci-dessous.</p></div>';
        return;
      }
      grid.innerHTML = v.images.map((src, idx) => `
        <div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:4/3;background:var(--bg-glass)">
          <img src="${src}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;transition:transform 0.3s"
            onclick="Vehicles._viewFullPhoto('${src}')"
            onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
          ${idx === 0 ? '<div style="position:absolute;top:6px;left:6px;background:rgba(0,206,201,0.9);color:#fff;font-size:0.65rem;padding:2px 7px;border-radius:10px;font-weight:700">PRINCIPALE</div>' : ''}
          <div style="position:absolute;top:4px;right:4px;display:flex;gap:4px">
            ${idx > 0 ? `<button onclick="Vehicles._setMainPhoto(${vehicleId}, ${idx})" style="background:rgba(0,0,0,0.65);border:none;border-radius:50%;width:28px;height:28px;color:#fff;cursor:pointer;font-size:0.75rem" title="Photo principale"><i class="fas fa-star"></i></button>` : ''}
            <button onclick="Vehicles._deletePhoto(${vehicleId}, ${idx})" style="background:rgba(220,53,69,0.85);border:none;border-radius:50%;width:28px;height:28px;color:#fff;cursor:pointer;font-size:0.75rem" title="Supprimer"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    };

    const html = `
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div style="display:flex;align-items:center;gap:12px;padding:1rem;background:linear-gradient(135deg,rgba(108,92,231,0.12),rgba(0,206,201,0.12));border-radius:12px;border:1px solid var(--border-color)">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent-cyan));display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.3rem"><i class="fas fa-camera"></i></div>
          <div>
            <div style="font-weight:700;font-size:1rem;color:var(--text-main)">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)} — Galerie Photos</div>
            <div style="color:var(--text-muted);font-size:0.8rem" id="photo-gallery-count">${v.images.length} photo${v.images.length !== 1 ? 's' : ''} · JPG, PNG, WebP (max 5 Mo / photo, compressé auto)</div>
          </div>
        </div>
        <div id="photo-gallery-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;min-height:80px"></div>
        <div id="photo-drop-zone" style="border:2px dashed var(--border-color);border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.25s;background:var(--bg-glass)"
          onclick="document.getElementById('photo-upload-input').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--accent-cyan)';this.style.background='rgba(0,206,201,0.08)'"
          ondragleave="this.style.borderColor='var(--border-color)';this.style.background='var(--bg-glass)'"
          ondrop="Vehicles._handlePhotoDrop(event, ${vehicleId})">
          <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--accent-cyan);margin-bottom:8px"></i>
          <div style="font-weight:600;color:var(--text-main)">Glisser-déposer des photos ici</div>
          <div style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">ou cliquer pour sélectionner</div>
          <input type="file" id="photo-upload-input" multiple accept="image/*" style="display:none" onchange="Vehicles._handlePhotoUpload(event, ${vehicleId})">
        </div>
        <div id="photo-upload-progress" style="display:none">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px"><span id="photo-upload-label">Compression...</span><span id="photo-upload-pct">0%</span></div>
          <div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden"><div id="photo-upload-bar" style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent-cyan));width:0%;transition:width 0.3s;border-radius:3px"></div></div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          ${v.images.length > 0 ? '<button class="btn btn-ghost btn-sm" onclick="Vehicles.open360Viewer(' + vehicleId + ')" style="color:var(--accent-cyan)"><i class="fas fa-rotate"></i> Voir en 360°</button>' : ''}
          <button class="btn btn-primary btn-sm" onclick="document.getElementById(\'photo-upload-input\').click()"><i class="fas fa-plus"></i> Ajouter des photos</button>
        </div>
      </div>
    `;

    Utils.showModal('Galerie Photos — ' + v.brand + ' ' + v.model, html, { hideFooter: true, size: 'modal-lg' });
    setTimeout(() => renderGallery(), 50);
    this._photoManagerVehicle = v;
    this._photoManagerRender = renderGallery;
  },

  async _handlePhotoDrop(event, vehicleId) {
    event.preventDefault();
    const zone = document.getElementById('photo-drop-zone');
    if (zone) { zone.style.borderColor = 'var(--border-color)'; zone.style.background = 'var(--bg-glass)'; }
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) await this._processPhotoFiles(files, vehicleId);
  },

  async _handlePhotoUpload(event, vehicleId) {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    event.target.value = '';
    if (files.length > 0) await this._processPhotoFiles(files, vehicleId);
  },

  async _processPhotoFiles(files, vehicleId) {
    const progressBar = document.getElementById('photo-upload-progress');
    const bar = document.getElementById('photo-upload-bar');
    const label = document.getElementById('photo-upload-label');
    const pct = document.getElementById('photo-upload-pct');
    if (progressBar) progressBar.style.display = 'block';

    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    v.images = v.images || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / files.length) * 100);
      if (label) label.textContent = 'Compression : ' + file.name;
      if (bar) bar.style.width = progress + '%';
      if (pct) pct.textContent = progress + '%';
      try {
        const compressed = await this._compressImage(file, 1200, 0.82);
        v.images.push(compressed);
      } catch (err) {
        console.error('Photo compress error:', err);
        Utils.notify('Erreur sur ' + file.name, 'warning');
      }
      await new Promise(r => setTimeout(r, 20));
    }

    await DB.update('vehicles', v);
    if (progressBar) progressBar.style.display = 'none';
    Utils.notify(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' ajoutée' + (files.length > 1 ? 's' : '') + ' !', 'success');
    if (this._photoManagerVehicle && this._photoManagerRender) {
      this._photoManagerVehicle.images = v.images;
      this._photoManagerRender();
    }
    this.render();
  },

  _compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async _deletePhoto(vehicleId, index) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v || !v.images) return;
    v.images.splice(index, 1);
    await DB.update('vehicles', v);
    Utils.notify('Photo supprimée', 'success');
    if (this._photoManagerVehicle && this._photoManagerRender) {
      this._photoManagerVehicle.images = v.images;
      this._photoManagerRender();
    }
    this.render();
  },

  async _setMainPhoto(vehicleId, index) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v || !v.images || index <= 0) return;
    const [photo] = v.images.splice(index, 1);
    v.images.unshift(photo);
    await DB.update('vehicles', v);
    Utils.notify('Photo principale mise à jour !', 'success');
    if (this._photoManagerVehicle && this._photoManagerRender) {
      this._photoManagerVehicle.images = v.images;
      this._photoManagerRender();
    }
    this.render();
  },

  _viewFullPhoto(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(8px)';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `
      <img src="${src}" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 0 60px rgba(0,0,0,0.8)">
      <button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.12);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(overlay);
  },

  // ============================================================
  // 360° ROTATION VIEWER
  // ============================================================
  async open360Viewer(vehicleId) {
    // Delegate to enhanced 360° viewer if available
    if (typeof PhotoEnhanced !== 'undefined') {
      return PhotoEnhanced.open360(vehicleId);
    }
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    const images = v.images || [];

    const overlay = document.createElement('div');
    overlay.id = 'viewer360-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,20,0.97);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(12px)';

    if (images.length === 0) {
      overlay.innerHTML = `
        <div style="text-align:center;color:#fff">
          <i class="fas fa-camera" style="font-size:4rem;opacity:0.3;margin-bottom:1.5rem;display:block"></i>
          <h3 style="font-size:1.5rem;margin-bottom:0.5rem">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</h3>
          <p style="color:rgba(255,255,255,0.5)">Aucune photo disponible pour ce véhicule.</p>
          <p style="color:rgba(255,255,255,0.3);font-size:0.85rem">Ajoutez des photos depuis la fiche véhicule pour activer le viewer 360°.</p>
          <button onclick="document.getElementById('viewer360-overlay').remove()" style="margin-top:1.5rem;background:rgba(108,92,231,0.8);border:none;color:#fff;padding:10px 24px;border-radius:20px;cursor:pointer;font-weight:600"><i class="fas fa-times"></i> Fermer</button>
        </div>
      `;
      document.body.appendChild(overlay);
      return;
    }

    let currentIdx = 0;
    let isAutoRotating = false;
    let autoRotateTimer = null;
    let isDragging = false;
    let dragStartX = 0;
    const totalImages = images.length;

    overlay.innerHTML = `
      <style>
        #v360-img{width:100%;height:100%;object-fit:cover;border-radius:16px;box-shadow:0 0 60px rgba(108,92,231,0.3);user-select:none;display:block;transition:opacity 0.18s ease,transform 0.18s ease}
        .v360-thumb{width:60px;height:45px;border-radius:6px;object-fit:cover;border:2px solid transparent;cursor:pointer;transition:all 0.2s;opacity:0.6}
        .v360-thumb:hover{opacity:1;transform:scale(1.08)}
        .v360-thumb.active{border-color:#00cec9;opacity:1;transform:scale(1.1)}
        .v360-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:44px;height:44px;color:#fff;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;backdrop-filter:blur(4px)}
        .v360-btn:hover{background:rgba(108,92,231,0.5);border-color:#00cec9;transform:scale(1.1)}
      </style>
      <button onclick="document.getElementById('viewer360-overlay').remove()" class="v360-btn" style="position:absolute;top:20px;right:20px"><i class="fas fa-times"></i></button>
      <div style="text-align:center;margin-bottom:1.25rem;color:#fff">
        <h3 style="font-size:1.4rem;font-weight:800;margin:0">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</h3>
        <p style="color:rgba(255,255,255,0.45);font-size:0.8rem;margin:4px 0 0">${Utils.escapeHTML(String(v.year || ''))} · ${Utils.escapeHTML(v.color || '')} · <span id="v360-counter">1 / ${totalImages}</span></p>
      </div>
      <div id="v360-container" style="perspective:1400px;width:min(80vw,640px);height:min(55vh,420px)">
        <div id="v360-scene" style="width:100%;height:100%;transform-style:preserve-3d;transition:transform 0.4s cubic-bezier(.25,.46,.45,.94)">
          <img id="v360-img" src="${images[0]}" alt="${Utils.escapeHTML(v.brand)}" draggable="false">
        </div>
      </div>
      <div style="color:rgba(255,255,255,0.35);font-size:0.78rem;margin-top:10px;display:flex;align-items:center;gap:6px" id="v360-hint">
        <i class="fas fa-arrows-alt-h"></i> Glisser pour naviguer · <i class="fas fa-keyboard"></i> Flèches clavier
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:1.1rem">
        <button class="v360-btn" id="v360-prev"><i class="fas fa-chevron-left"></i></button>
        <button class="v360-btn" id="v360-autorotate" style="width:48px;height:48px"><i class="fas fa-play" id="v360-play-icon"></i></button>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <input type="range" id="v360-tilt" min="-30" max="30" value="0" style="width:120px;accent-color:#00cec9" oninput="document.getElementById('v360-scene').style.transform='rotateX('+this.value+'deg)'">
          <small style="color:rgba(255,255,255,0.4);font-size:0.68rem">Inclinaison</small>
        </div>
        <button class="v360-btn" id="v360-next"><i class="fas fa-chevron-right"></i></button>
        <button class="v360-btn" id="v360-fs"><i class="fas fa-expand"></i></button>
      </div>
      ${totalImages > 1 ? `
        <div id="v360-thumbs" style="display:flex;gap:8px;margin-top:1rem;max-width:min(90vw,700px);overflow-x:auto;padding:6px;scrollbar-width:thin">
          ${images.map((src, i) => `<img class="v360-thumb ${i === 0 ? 'active' : ''}" src="${src}" data-idx="${i}" onclick="Vehicles._360GoTo(${i})" alt="Vue ${i+1}" draggable="false">`).join('')}
        </div>
      ` : ''}
      <div style="margin-top:1.1rem;display:flex;gap:1.5rem;text-align:center;padding:0.75rem 1.5rem;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
        <div><div style="color:rgba(255,255,255,0.45);font-size:0.7rem;text-transform:uppercase">Vente</div><div style="font-weight:800;font-size:1.15rem;color:#00cec9">${Utils.formatCurrency(v.salePrice)}</div></div>
        <div style="border-left:1px solid rgba(255,255,255,0.1)"></div>
        <div><div style="color:rgba(255,255,255,0.45);font-size:0.7rem;text-transform:uppercase">Location/jour</div><div style="font-weight:700;font-size:1.1rem;color:#a29bfe">${Utils.formatCurrency(v.rentalPricePerDay)}</div></div>
        <div style="border-left:1px solid rgba(255,255,255,0.1)"></div>
        <div><div style="color:rgba(255,255,255,0.45);font-size:0.7rem;text-transform:uppercase">Kilométrage</div><div style="font-weight:700;font-size:1.1rem;color:#fff">${Utils.formatNumber(v.mileage)} km</div></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const goTo = (idx, dir) => {
      currentIdx = ((idx % totalImages) + totalImages) % totalImages;
      const img = document.getElementById('v360-img');
      const counter = document.getElementById('v360-counter');
      if (img) {
        img.style.opacity = '0';
        img.style.transform = 'translateX(' + (dir > 0 ? 40 : -40) + 'px)';
        setTimeout(() => {
          img.src = images[currentIdx];
          img.style.transform = 'translateX(' + (dir > 0 ? -30 : 30) + 'px)';
          requestAnimationFrame(() => { img.style.opacity = '1'; img.style.transform = 'translateX(0)'; });
        }, 170);
      }
      if (counter) counter.textContent = (currentIdx + 1) + ' / ' + totalImages;
      overlay.querySelectorAll('.v360-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === currentIdx);
        if (i === currentIdx) t.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      });
    };

    Vehicles._360GoTo = (idx) => goTo(idx, idx >= currentIdx ? 1 : -1);
    document.getElementById('v360-prev').onclick = () => goTo(currentIdx - 1, -1);
    document.getElementById('v360-next').onclick = () => goTo(currentIdx + 1, 1);

    const keyHandler = (e) => {
      if (!document.getElementById('viewer360-overlay')) { document.removeEventListener('keydown', keyHandler); return; }
      if (e.key === 'ArrowLeft') goTo(currentIdx - 1, -1);
      if (e.key === 'ArrowRight') goTo(currentIdx + 1, 1);
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);

    const container = document.getElementById('v360-container');
    if (container) {
      container.addEventListener('mousedown', (e) => { isDragging = true; dragStartX = e.clientX; e.preventDefault(); });
      container.addEventListener('touchstart', (e) => { isDragging = true; dragStartX = e.touches[0].clientX; }, { passive: true });
      const onMove = (clientX) => {
        if (!isDragging) return;
        const delta = clientX - dragStartX;
        if (Math.abs(delta) > 50) { goTo(currentIdx + (delta > 0 ? -1 : 1), delta > 0 ? -1 : 1); dragStartX = clientX; }
      };
      document.addEventListener('mousemove', (e) => onMove(e.clientX));
      document.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
      const stopDrag = () => { isDragging = false; };
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchend', stopDrag);
    }

    document.getElementById('v360-autorotate').onclick = () => {
      isAutoRotating = !isAutoRotating;
      const icon = document.getElementById('v360-play-icon');
      const btn = document.getElementById('v360-autorotate');
      if (icon) icon.className = isAutoRotating ? 'fas fa-pause' : 'fas fa-play';
      if (btn) btn.style.background = isAutoRotating ? 'rgba(0,206,201,0.35)' : 'rgba(255,255,255,0.1)';
      if (isAutoRotating) {
        autoRotateTimer = setInterval(() => {
          if (!document.getElementById('viewer360-overlay')) { clearInterval(autoRotateTimer); return; }
          goTo(currentIdx + 1, 1);
        }, 1200);
      } else {
        clearInterval(autoRotateTimer);
      }
    };

    document.getElementById('v360-fs').onclick = () => {
      const el = document.getElementById('v360-container');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el && el.requestFullscreen) el.requestFullscreen();
    };
  },

  // ============================================================
  // ADD / EDIT MODAL
  // ============================================================
  async showAddModal() {
    this._pendingPhotos = [];
    const formHtml = this.getVehicleForm();
    const confirmed = await Utils.showModal('Ajouter un véhicule', formHtml, { confirmText: 'Ajouter', size: 'modal-lg' });
    if (confirmed) await this.saveVehicle();
  },

  async showEditModal(id) {
    this._pendingPhotos = [];
    const vehicle = await DB.get('vehicles', id);
    if (!vehicle) return;
    const formHtml = this.getVehicleForm(vehicle);
    const confirmed = await Utils.showModal('Modifier le véhicule', formHtml, { confirmText: 'Enregistrer', size: 'modal-lg' });
    if (confirmed) await this.saveVehicle(id);
  },

  getVehicleForm(v = {}) {
    const previewId = 'v-photo-preview-' + Date.now();
    const existingImgs = v.images || [];
    return `
      <form id="vehicle-form">
        <!-- Photo Upload Zone -->
        <div style="margin-bottom:1.25rem;border:2px dashed var(--border-color);border-radius:12px;padding:1rem;text-align:center;cursor:pointer;background:var(--bg-glass);transition:all 0.2s"
          onclick="document.getElementById('v-quick-photo').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--accent-cyan)'"
          ondragleave="this.style.borderColor='var(--border-color)'"
          ondrop="event.preventDefault();Vehicles._handleQuickPhotoDrop(event,'${previewId}')">
          <div id="${previewId}" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;${existingImgs.length > 0 ? 'margin-bottom:8px' : ''}">
            ${existingImgs.map(src => '<img src="' + src + '" style="height:60px;width:80px;object-fit:cover;border-radius:6px">').join('')}
          </div>
          <i class="fas fa-camera" style="font-size:1.4rem;color:var(--accent-cyan);margin-bottom:4px"></i>
          <div style="font-size:0.85rem;color:var(--text-muted)">${existingImgs.length > 0 ? existingImgs.length + ' photo(s) existante(s) · Cliquer pour en ajouter' : 'Ajouter des photos (optionnel, multi-sélection)'}</div>
          <input type="file" id="v-quick-photo" multiple accept="image/*" style="display:none" onchange="Vehicles._handleQuickPhotoUpload(event,'${previewId}')">
        </div>
        <div class="form-row">
          <div class="form-group"><label>Marque *</label><input type="text" class="form-control" id="v-brand" value="${Utils.escapeHTML(v.brand || '')}" required list="brand-list" placeholder="Ex: Toyota, BMW...">
            <datalist id="brand-list"><option value="Toyota"><option value="Mercedes-Benz"><option value="BMW"><option value="Peugeot"><option value="Renault"><option value="Audi"><option value="Volkswagen"><option value="Hyundai"><option value="Kia"><option value="Ford"><option value="Nissan"><option value="Honda"><option value="Citroën"><option value="Fiat"><option value="Chevrolet"></datalist>
          </div>
          <div class="form-group"><label>Modèle *</label><input type="text" class="form-control" id="v-model" value="${Utils.escapeHTML(v.model || '')}" required placeholder="Ex: Corolla, Série 3..."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Année *</label><input type="number" class="form-control" id="v-year" value="${v.year || new Date().getFullYear()}" min="1990" max="2030" required></div>
          <div class="form-group"><label>Couleur</label><input type="text" class="form-control" id="v-color" value="${Utils.escapeHTML(v.color || '')}" placeholder="Ex: Noir, Blanc..."></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><label style="margin:0">Immatriculation</label><button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:0.75rem;color:var(--accent-cyan)" onclick="PlateScanner.openScannerModal(plate => { const el = document.getElementById('v-plate'); if (el) el.value = plate; })"><i class="fas fa-camera"></i> Scanner</button></div>
            <input type="text" class="form-control" id="v-plate" value="${Utils.escapeHTML(v.licensePlate || '')}" placeholder="Ex: 240 TN 1892" style="text-transform:uppercase">
          </div>
          <div class="form-group"><label>N° Châssis (VIN)</label><input type="text" class="form-control" id="v-vin" value="${Utils.escapeHTML(v.vin || '')}" placeholder="Optionnel"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Carburant</label><select class="form-control" id="v-fuel">
            <option value="Essence" ${v.fuel === 'Essence' ? 'selected' : ''}>Essence</option>
            <option value="Diesel" ${v.fuel === 'Diesel' ? 'selected' : ''}>Diesel</option>
            <option value="Hybride" ${v.fuel === 'Hybride' ? 'selected' : ''}>Hybride</option>
            <option value="Électrique" ${v.fuel === 'Électrique' ? 'selected' : ''}>Électrique</option>
            <option value="GPL" ${v.fuel === 'GPL' ? 'selected' : ''}>GPL</option>
          </select></div>
          <div class="form-group"><label>Transmission</label><select class="form-control" id="v-transmission">
            <option value="Automatique" ${v.transmission === 'Automatique' ? 'selected' : ''}>Automatique</option>
            <option value="Manuelle" ${v.transmission === 'Manuelle' ? 'selected' : ''}>Manuelle</option>
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Catégorie</label><select class="form-control" id="v-category">
            <option value="Berline" ${v.category === 'Berline' ? 'selected' : ''}>Berline</option>
            <option value="SUV" ${v.category === 'SUV' ? 'selected' : ''}>SUV</option>
            <option value="Citadine" ${v.category === 'Citadine' ? 'selected' : ''}>Citadine</option>
            <option value="Break" ${v.category === 'Break' ? 'selected' : ''}>Break</option>
            <option value="Coupé" ${v.category === 'Coupé' ? 'selected' : ''}>Coupé</option>
            <option value="Pick-up" ${v.category === 'Pick-up' ? 'selected' : ''}>Pick-up</option>
            <option value="4x4" ${v.category === '4x4' ? 'selected' : ''}>4x4</option>
            <option value="Utilitaire" ${v.category === 'Utilitaire' ? 'selected' : ''}>Utilitaire</option>
            <option value="Minivan" ${v.category === 'Minivan' ? 'selected' : ''}>Minivan</option>
          </select></div>
          <div class="form-group"><label>Kilométrage</label><input type="number" class="form-control" id="v-mileage" value="${v.mileage || 0}" min="0" placeholder="En km"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Prix d'achat (TND)</label><input type="number" class="form-control" id="v-purchase-price" value="${v.purchasePrice || ''}" min="0" placeholder="Prix d'achat"></div>
          <div class="form-group"><label>Prix de vente (TND) *</label><input type="number" class="form-control" id="v-sale-price" value="${v.salePrice || ''}" min="0" required placeholder="Prix de vente"></div>
          <div class="form-group"><label>Prix location/jour (TND)</label><input type="number" class="form-control" id="v-rental-price" value="${v.rentalPricePerDay || ''}" min="0" placeholder="Prix par jour"></div>
        </div>
        <div class="form-group"><label>Statut</label><select class="form-control" id="v-status">
          <option value="available" ${v.status === 'available' ? 'selected' : ''}>Disponible</option>
          <option value="sold" ${v.status === 'sold' ? 'selected' : ''}>Vendu</option>
          <option value="rented" ${v.status === 'rented' ? 'selected' : ''}>En location</option>
          <option value="reserved" ${v.status === 'reserved' ? 'selected' : ''}>Réservé</option>
          <option value="maintenance" ${v.status === 'maintenance' ? 'selected' : ''}>En maintenance</option>
        </select></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" id="v-description" rows="3" placeholder="Description, équipements, état...">${Utils.escapeHTML(v.description || '')}</textarea></div>
      </form>
    `;
  },

  async _handleQuickPhotoUpload(event, previewId) {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    event.target.value = '';
    const preview = document.getElementById(previewId);
    for (const file of files) {
      try {
        const compressed = await this._compressImage(file, 1200, 0.82);
        this._pendingPhotos.push(compressed);
        if (preview) {
          const img = document.createElement('img');
          img.src = compressed;
          img.style.cssText = 'height:60px;width:80px;object-fit:cover;border-radius:6px';
          preview.appendChild(img);
        }
      } catch (err) { console.error(err); }
    }
    if (files.length > 0) Utils.notify(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' prête' + (files.length > 1 ? 's' : '') + ' !', 'success');
  },

  async _handleQuickPhotoDrop(event, previewId) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      const preview = document.getElementById(previewId);
      for (const file of files) {
        try {
          const compressed = await this._compressImage(file, 1200, 0.82);
          this._pendingPhotos.push(compressed);
          if (preview) {
            const img = document.createElement('img');
            img.src = compressed;
            img.style.cssText = 'height:60px;width:80px;object-fit:cover;border-radius:6px';
            preview.appendChild(img);
          }
        } catch (err) { console.error(err); }
      }
      Utils.notify(files.length + ' photo(s) prête(s) !', 'success');
    }
  },

  async saveVehicle(id = null) {
    const parkingId = Utils.getCurrentParkingId();
    const session = Utils.getCurrentUser();
    const data = {
      parkingId,
      brand: document.getElementById('v-brand').value.trim(),
      model: document.getElementById('v-model').value.trim(),
      year: parseInt(document.getElementById('v-year').value),
      color: document.getElementById('v-color').value.trim(),
      licensePlate: document.getElementById('v-plate').value.trim(),
      vin: document.getElementById('v-vin').value.trim(),
      fuel: document.getElementById('v-fuel').value,
      transmission: document.getElementById('v-transmission').value,
      category: document.getElementById('v-category').value,
      mileage: parseInt(document.getElementById('v-mileage').value) || 0,
      purchasePrice: parseFloat(document.getElementById('v-purchase-price').value) || 0,
      salePrice: parseFloat(document.getElementById('v-sale-price').value) || 0,
      rentalPricePerDay: parseFloat(document.getElementById('v-rental-price').value) || 0,
      status: document.getElementById('v-status').value,
      description: document.getElementById('v-description').value.trim(),
      addedBy: session.userId
    };
    if (!data.brand || !data.model) { Utils.notify('Veuillez remplir la marque et le modèle', 'error'); return; }
    try {
      if (id) {
        const existing = await DB.get('vehicles', id);
        data.id = id;
        data.createdAt = existing.createdAt;
        data.images = [...(existing.images || []), ...this._pendingPhotos];
        data.features = existing.features || [];
        await DB.update('vehicles', data);
        Utils.notify('Véhicule modifié avec succès', 'success');
        await DB.logActivity(parkingId, session.userId, 'vehicle_update', data.brand + ' ' + data.model + ' modifié');
      } else {
        data.images = [...this._pendingPhotos];
        data.features = [];
        data.createdAt = new Date().toISOString();
        await DB.add('vehicles', data);
        Utils.notify('Véhicule ajouté avec succès', 'success');
        await DB.logActivity(parkingId, session.userId, 'vehicle_add', data.brand + ' ' + data.model + ' ajouté au parc');
      }
      this._pendingPhotos = [];
      this.render();
    } catch (err) {
      console.error('Save vehicle error:', err);
      Utils.notify('Erreur: ' + err.message, 'error');
    }
  },

  async deleteVehicle(id) {
    const confirmed = await Utils.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?');
    if (!confirmed) return;
    try {
      const vehicle = await DB.get('vehicles', id);
      await DB.delete('vehicles', id);
      Utils.notify('Véhicule supprimé', 'success');
      const parkingId = Utils.getCurrentParkingId();
      const session = Utils.getCurrentUser();
      await DB.logActivity(parkingId, session.userId, 'vehicle_delete', vehicle.brand + ' ' + vehicle.model + ' supprimé');
      this.render();
    } catch (err) { Utils.notify('Erreur: ' + err.message, 'error'); }
  },

  // ============================================================
  // VEHICLE DETAIL WITH PHOTO HERO & THUMBNAILS
  // ============================================================
  async showDetail(id) {
    const v = await DB.get('vehicles', id);
    if (!v) return;
    const badge = Utils.getStatusBadge(v.status);
    const images = v.images || [];
    const hasPhotos = images.length > 0;

    const html = `
      <div style="position:relative;border-radius:14px;overflow:hidden;background:var(--bg-glass);margin-bottom:1.25rem;${hasPhotos ? 'height:220px' : 'height:80px;display:flex;align-items:center;justify-content:center'}">
        ${hasPhotos ? `
          <img id="detail-hero-img" src="${images[0]}" style="width:100%;height:100%;object-fit:cover" alt="${Utils.escapeHTML(v.brand)}">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 60%)"></div>
          <div style="position:absolute;bottom:12px;left:16px;color:#fff">
            <h2 style="margin:0;font-size:1.5rem;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,0.5)">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</h2>
            <p style="margin:2px 0 0;opacity:0.8;font-size:0.85rem">${Utils.escapeHTML(String(v.year || ''))} · ${Utils.escapeHTML(v.color || '')} · ${Utils.escapeHTML(v.transmission || '')}</p>
          </div>
          <span class="badge ${badge.class}" style="position:absolute;top:12px;right:12px">${badge.label}</span>
          <button onclick="Vehicles.open360Viewer(${v.id})" style="position:absolute;top:12px;left:12px;background:rgba(0,206,201,0.85);border:none;border-radius:20px;color:#fff;padding:6px 14px;font-size:0.8rem;cursor:pointer;font-weight:600;backdrop-filter:blur(4px)">
            <i class="fas fa-rotate"></i> Vue 360°
          </button>
        ` : `<div style="color:var(--text-muted);text-align:center"><i class="fas fa-car-side" style="font-size:2rem;opacity:0.4;display:block;margin-bottom:6px"></i><span style="font-size:0.8rem">Pas de photo</span></div>`}
      </div>

      ${images.length > 1 ? `
        <div style="display:flex;gap:6px;overflow-x:auto;padding:4px;margin-bottom:1rem;scrollbar-width:thin">
          ${images.map((src, i) => `<img src="${src}" style="height:52px;min-width:70px;max-width:70px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i === 0 ? 'var(--accent-cyan)' : 'transparent'};transition:all 0.2s" onclick="document.getElementById('detail-hero-img').src='${src}';document.querySelectorAll('[onclick*=detail-hero]');">`).join('')}
        </div>
      ` : ''}

      ${!hasPhotos ? `<h2 style="text-align:center;margin-bottom:1rem">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)} <span class="badge ${badge.class}">${badge.label}</span></h2>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-md);margin-bottom:1rem">
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Immatriculation</div><div style="font-weight:700;font-family:monospace;font-size:1.1rem">${Utils.escapeHTML(v.licensePlate || '-')}</div></div>
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Kilométrage</div><div style="font-weight:700">${Utils.formatNumber(v.mileage)} km</div></div>
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Carburant</div><div style="font-weight:700">${Utils.escapeHTML(v.fuel || '-')}</div></div>
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Catégorie</div><div style="font-weight:700">${Utils.escapeHTML(v.category || '-')}</div></div>
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Prix de vente</div><div style="font-weight:800;color:var(--primary-light);font-size:1.2rem">${Utils.formatCurrency(v.salePrice)}</div></div>
        <div class="card" style="padding:var(--spacing-md)"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Location/jour</div><div style="font-weight:800;color:var(--accent-cyan);font-size:1.2rem">${Utils.formatCurrency(v.rentalPricePerDay)}</div></div>
      </div>

      ${v.description ? `<div style="padding:var(--spacing-md);background:var(--bg-glass);border-radius:var(--radius-md);margin-bottom:1rem"><div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Description</div><p style="color:var(--text-secondary);margin:0;font-size:0.9rem">${Utils.escapeHTML(v.description)}</p></div>` : ''}

      <div style="display:flex;gap:var(--spacing-sm);justify-content:center;flex-wrap:wrap">
        ${v.status === 'available' ? `
          <button class="btn btn-primary" onclick="document.querySelector('.modal-overlay').remove();Router.navigate('sales');setTimeout(()=>Sales.showAddModal(${v.id}),300)"><i class="fas fa-hand-holding-usd"></i> Vendre</button>
          <button class="btn btn-success" onclick="document.querySelector('.modal-overlay').remove();Router.navigate('rentals');setTimeout(()=>Rentals.showAddModal(${v.id}),300)"><i class="fas fa-key"></i> Louer</button>
        ` : ''}
        ${Utils.isAdmin() ? `
          <button class="btn btn-ghost" onclick="document.querySelector('.modal-overlay').remove();Vehicles.showPhotoManager(${v.id})" style="color:var(--accent-cyan)"><i class="fas fa-camera"></i> Gérer les photos</button>
        ` : ''}
        <button class="btn btn-ghost" onclick="document.querySelector('.modal-overlay').remove();Router.navigate('maintenance');setTimeout(()=>Maintenance.openAddModal(${v.id}),300)" style="color:var(--accent-orange)"><i class="fas fa-wrench"></i> Entretien & Révision</button>
        <button class="btn btn-ghost" onclick="Vehicles.open360Viewer(${v.id})" style="color:#a29bfe"><i class="fas fa-rotate"></i> 360° Viewer</button>
      </div>
    `;

    await Utils.showModal(v.brand + ' ' + v.model, html, { hideFooter: true, size: 'modal-lg' });
  },

  async viewVehicle(id) { return this.showDetail(id); }
};
