/* ========================================================================
   MON PARKING - Enhanced Photo Manager & 360° Viewer PRO
   Camera capture, photo categorization, watermark, minimap, zoom & share
   ======================================================================== */

const PhotoEnhanced = {

  // Photo position categories for organized 360° viewing
  CATEGORIES: [
    { id: 'front', label: 'Avant', icon: 'fa-car', angle: 0, group: 'ext' },
    { id: 'front-right', label: 'Avant-Droit', icon: 'fa-car', angle: 45, group: 'ext' },
    { id: 'right', label: 'Côté Droit', icon: 'fa-car-side', angle: 90, group: 'ext' },
    { id: 'rear-right', label: 'Arrière-Droit', icon: 'fa-car', angle: 135, group: 'ext' },
    { id: 'rear', label: 'Arrière', icon: 'fa-car-rear', angle: 180, group: 'ext' },
    { id: 'rear-left', label: 'Arrière-Gauche', icon: 'fa-car', angle: 225, group: 'ext' },
    { id: 'left', label: 'Côté Gauche', icon: 'fa-car-side', angle: 270, group: 'ext' },
    { id: 'front-left', label: 'Avant-Gauche', icon: 'fa-car', angle: 315, group: 'ext' },
    { id: 'interior', label: 'Intérieur', icon: 'fa-couch', angle: -1, group: 'int' },
    { id: 'dashboard', label: 'Tableau de bord', icon: 'fa-gauge-high', angle: -1, group: 'int' },
    { id: 'engine', label: 'Moteur', icon: 'fa-gear', angle: -1, group: 'detail' },
    { id: 'trunk', label: 'Coffre', icon: 'fa-box-open', angle: -1, group: 'detail' },
    { id: 'other', label: 'Autre', icon: 'fa-image', angle: -1, group: 'other' }
  ],

  _selectedCategory: 'other',
  _watermarkOn: true,
  _cameraStream: null,
  _capturedDataUrl: null,
  _currentFacing: 'environment',
  _currentVehicle: null,
  _renderGrid: null,
  _filterCat: 'all',

  _cat(id) {
    return this.CATEGORIES.find(c => c.id === id) || this.CATEGORIES[12];
  },

  _ensureMeta(v) {
    v.images = v.images || [];
    v.imagesMeta = v.imagesMeta || [];
    while (v.imagesMeta.length < v.images.length) {
      v.imagesMeta.push({ category: 'other', addedAt: new Date().toISOString() });
    }
    if (v.imagesMeta.length > v.images.length) v.imagesMeta.length = v.images.length;
  },

  // ============================================================
  // ENHANCED PHOTO MANAGER
  // ============================================================
  async openManager(vehicleId) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);
    this._currentVehicle = v;
    this._filterCat = 'all';

    const catStats = { all: v.images.length };
    v.imagesMeta.forEach(m => {
      const c = (m || {}).category || 'other';
      catStats[c] = (catStats[c] || 0) + 1;
    });
    const activeCats = Object.keys(catStats).filter(k => k !== 'all' && catStats[k] > 0);

    const renderGrid = () => {
      const grid = document.getElementById('pe-photo-grid');
      const countEl = document.getElementById('pe-photo-count');
      if (!grid) return;

      let indices = v.images.map((_, i) => i);
      if (this._filterCat !== 'all') {
        indices = indices.filter(i => (v.imagesMeta[i] || {}).category === this._filterCat);
      }
      if (countEl) countEl.textContent = v.images.length + ' photo' + (v.images.length !== 1 ? 's' : '');

      if (indices.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">' +
          '<i class="fas fa-images" style="font-size:2.5rem;opacity:0.3;margin-bottom:1rem;display:block"></i>' +
          '<p style="font-size:0.95rem;margin:0">' + (v.images.length === 0 ? 'Aucune photo. Utilisez la caméra ou téléchargez des fichiers.' : 'Aucune photo dans cette catégorie.') + '</p></div>';
        return;
      }

      grid.innerHTML = indices.map(idx => {
        const src = v.images[idx];
        const meta = v.imagesMeta[idx] || { category: 'other' };
        const cat = this._cat(meta.category);
        const isMain = idx === 0;
        return '<div class="pe-photo-card" style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:var(--bg-glass);border:2px solid ' + (isMain ? 'var(--accent-cyan)' : 'transparent') + ';transition:all 0.3s">' +
          '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;cursor:pointer;transition:transform 0.3s" ' +
          'onclick="PhotoEnhanced._viewFullPhoto(' + idx + ')" ' +
          'onmouseover="this.style.transform=\'scale(1.06)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
          '<div style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.75);color:#fff;font-size:0.62rem;padding:3px 8px;border-radius:8px;backdrop-filter:blur(4px);display:flex;align-items:center;gap:4px">' +
          '<i class="fas ' + cat.icon + '" style="font-size:0.55rem"></i> ' + cat.label + '</div>' +
          (isMain ? '<div style="position:absolute;top:6px;left:6px;background:linear-gradient(135deg,rgba(0,206,201,0.95),rgba(108,92,231,0.95));color:#fff;font-size:0.58rem;padding:3px 10px;border-radius:10px;font-weight:700;letter-spacing:0.5px">★ PRINCIPALE</div>' : '') +
          '<div style="position:absolute;top:4px;right:4px;display:flex;gap:3px">' +
          (!isMain ? '<button onclick="event.stopPropagation();PhotoEnhanced._setMainPhoto(' + vehicleId + ',' + idx + ')" class="pe-photo-btn" title="Principale" style="background:rgba(0,206,201,0.85)"><i class="fas fa-star"></i></button>' : '') +
          '<button onclick="event.stopPropagation();PhotoEnhanced._showCatPicker(' + vehicleId + ',' + idx + ')" class="pe-photo-btn" title="Catégorie" style="background:rgba(108,92,231,0.85)"><i class="fas fa-tag"></i></button>' +
          '<button onclick="event.stopPropagation();PhotoEnhanced._deletePhoto(' + vehicleId + ',' + idx + ')" class="pe-photo-btn" title="Supprimer" style="background:rgba(220,53,69,0.85)"><i class="fas fa-trash"></i></button>' +
          '</div></div>';
      }).join('');
    };
    this._renderGrid = renderGrid;

    const html = '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
      // Header
      '<div style="display:flex;align-items:center;gap:12px;padding:1rem;background:linear-gradient(135deg,rgba(108,92,231,0.15),rgba(0,206,201,0.15));border-radius:14px;border:1px solid rgba(108,92,231,0.2)">' +
      '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent-cyan));display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;flex-shrink:0"><i class="fas fa-camera"></i></div>' +
      '<div style="flex:1"><div style="font-weight:700;font-size:1.05rem;color:var(--text-main)">' + Utils.escapeHTML(v.brand) + ' ' + Utils.escapeHTML(v.model) + ' — Galerie Photos</div>' +
      '<div style="color:var(--text-muted);font-size:0.8rem" id="pe-photo-count">' + v.images.length + ' photo' + (v.images.length !== 1 ? 's' : '') + '</div></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-muted);cursor:pointer;background:var(--bg-glass);padding:6px 10px;border-radius:8px;border:1px solid var(--border-color)">' +
      '<input type="checkbox" id="pe-watermark-toggle" checked onchange="PhotoEnhanced._watermarkOn=this.checked" style="accent-color:var(--primary)"> <i class="fas fa-stamp"></i> Watermark</label></div>' +
      // Category filters
      (v.images.length > 0 ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
        '<button class="pe-filter-chip active" onclick="PhotoEnhanced._setFilter(\'all\',' + vehicleId + ')"><i class="fas fa-th"></i> Toutes (' + v.images.length + ')</button>' +
        activeCats.map(cid => {
          const c = this._cat(cid);
          return '<button class="pe-filter-chip" onclick="PhotoEnhanced._setFilter(\'' + cid + '\',' + vehicleId + ')"><i class="fas ' + c.icon + '"></i> ' + c.label + ' (' + catStats[cid] + ')</button>';
        }).join('') + '</div>' : '') +
      // Photo grid
      '<div id="pe-photo-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px;min-height:80px"></div>' +
      // Category selector
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">' +
      '<div style="flex:1;min-width:180px"><label style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:0.5px">Catégorie (nouvelles photos)</label>' +
      '<select id="pe-upload-cat" class="form-input" style="width:100%;padding:0.45rem" onchange="PhotoEnhanced._selectedCategory=this.value">' +
      this.CATEGORIES.map(c => '<option value="' + c.id + '">' + c.label + '</option>').join('') + '</select></div></div>' +
      // Drop zone
      '<div id="pe-drop-zone" style="border:2px dashed var(--border-color);border-radius:14px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.25s;background:var(--bg-glass)" ' +
      'onclick="document.getElementById(\'pe-file-input\').click()" ' +
      'ondragover="event.preventDefault();this.style.borderColor=\'var(--accent-cyan)\';this.style.background=\'rgba(0,206,201,0.08)\'" ' +
      'ondragleave="this.style.borderColor=\'var(--border-color)\';this.style.background=\'var(--bg-glass)\'" ' +
      'ondrop="PhotoEnhanced._handleDrop(event,' + vehicleId + ')">' +
      '<i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:var(--accent-cyan);margin-bottom:8px"></i>' +
      '<div style="font-weight:600;color:var(--text-main);font-size:0.95rem">Glisser-déposer des photos ici</div>' +
      '<div style="color:var(--text-muted);font-size:0.78rem;margin-top:4px">JPG, PNG, WebP · Max 5 Mo/photo · Compression automatique</div>' +
      '<input type="file" id="pe-file-input" multiple accept="image/*" style="display:none" onchange="PhotoEnhanced._handleFileSelect(event,' + vehicleId + ')"></div>' +
      // Progress bar
      '<div id="pe-progress" style="display:none"><div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted);margin-bottom:6px"><span id="pe-progress-label">Traitement...</span><span id="pe-progress-pct">0%</span></div>' +
      '<div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden"><div id="pe-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent-cyan));width:0%;transition:width 0.3s;border-radius:3px"></div></div></div>' +
      // Action buttons
      '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" onclick="PhotoEnhanced.captureFromCamera(' + vehicleId + ')" style="color:var(--accent-green);border:1px solid rgba(0,184,148,0.3)"><i class="fas fa-camera"></i> Caméra</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'pe-file-input\').click()" style="color:var(--primary-light);border:1px solid rgba(108,92,231,0.3)"><i class="fas fa-folder-open"></i> Fichiers</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="PhotoEnhanced.generateDemo360(' + vehicleId + ')" style="color:var(--accent-orange);border:1px solid rgba(253,203,110,0.35)" title="Générer automatiquement un jeu complet 360°"><i class="fas fa-magic"></i> Démo 360°</button></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (v.images.length > 0 ? '<button class="btn btn-ghost btn-sm" onclick="PhotoEnhanced.open360(' + vehicleId + ')" style="color:var(--accent-cyan);border:1px solid rgba(0,206,201,0.3)"><i class="fas fa-rotate"></i> 360°</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="PhotoEnhanced._shareVehicle(' + vehicleId + ')" style="color:var(--accent-yellow)"><i class="fas fa-share-alt"></i> Partager</button>' : '') +
      '</div></div></div>';

    Utils.showModal('Galerie Photos — ' + v.brand + ' ' + v.model, html, { hideFooter: true, size: 'modal-lg' });
    setTimeout(() => renderGrid(), 50);
  },

  _setFilter(cat, vehicleId) {
    this._filterCat = cat;
    document.querySelectorAll('.pe-filter-chip').forEach(el => el.classList.remove('active'));
    event.target.closest('.pe-filter-chip').classList.add('active');
    if (this._renderGrid) this._renderGrid();
  },

  // ──── FILE HANDLING ────
  _handleDrop(event, vehicleId) {
    event.preventDefault();
    const zone = document.getElementById('pe-drop-zone');
    if (zone) { zone.style.borderColor = 'var(--border-color)'; zone.style.background = 'var(--bg-glass)'; }
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) this._processFiles(files, vehicleId);
  },

  _handleFileSelect(event, vehicleId) {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    event.target.value = '';
    if (files.length > 0) this._processFiles(files, vehicleId);
  },

  async _processFiles(files, vehicleId) {
    const progressEl = document.getElementById('pe-progress');
    const bar = document.getElementById('pe-progress-bar');
    const label = document.getElementById('pe-progress-label');
    const pct = document.getElementById('pe-progress-pct');
    if (progressEl) progressEl.style.display = 'block';

    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);

    const category = (document.getElementById('pe-upload-cat') || {}).value || this._selectedCategory || 'other';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / files.length) * 100);
      if (label) label.textContent = 'Compression : ' + file.name;
      if (bar) bar.style.width = progress + '%';
      if (pct) pct.textContent = progress + '%';
      try {
        let compressed = await Vehicles._compressImage(file, 1200, 0.82);
        if (this._watermarkOn) {
          compressed = await this._applyWatermark(compressed, 'MON PARKING');
        }
        v.images.push(compressed);
        v.imagesMeta.push({ category: category, addedAt: new Date().toISOString() });
      } catch (err) {
        console.error('Photo processing error:', err);
        Utils.notify('Erreur sur ' + file.name, 'warning');
      }
      await new Promise(r => setTimeout(r, 20));
    }

    await DB.update('vehicles', v);
    this._currentVehicle = v;
    if (progressEl) progressEl.style.display = 'none';
    Utils.notify(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' ajoutée' + (files.length > 1 ? 's' : '') + ' !', 'success');
    if (this._renderGrid) this._renderGrid();
    if (typeof Vehicles !== 'undefined') Vehicles.render();
  },

  // ──── WATERMARK ────
  _applyWatermark(dataUrl, text) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(14, Math.floor(img.width / 40));
        ctx.font = '700 ' + fontSize + 'px Inter, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // Shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Semi-transparent white text
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(text + ' · ' + new Date().toLocaleDateString('fr-FR'), img.width - 15, img.height - 12);

        // Small icon-like circle
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(108,92,231,0.35)';
        ctx.beginPath();
        ctx.arc(img.width - ctx.measureText(text).width - 30, img.height - 20, fontSize * 0.6, 0, Math.PI * 2);
        ctx.fill();

        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  // ──── CAMERA CAPTURE ────
  async captureFromCamera(vehicleId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Utils.notify('Caméra non supportée sur cet appareil', 'error');
      return;
    }

    const category = (document.getElementById('pe-upload-cat') || {}).value || this._selectedCategory || 'other';
    const catLabel = this._cat(category).label;

    const overlay = document.createElement('div');
    overlay.id = 'pe-camera-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,20,0.97);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(12px)';

    overlay.innerHTML =
      '<button onclick="PhotoEnhanced._closeCamera()" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:44px;height:44px;color:#fff;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;z-index:10"><i class="fas fa-times"></i></button>' +
      '<div style="text-align:center;margin-bottom:1rem;color:#fff">' +
      '<h3 style="font-size:1.3rem;font-weight:800;margin:0">📷 Capture Photo</h3>' +
      '<p style="color:rgba(255,255,255,0.45);font-size:0.8rem;margin:4px 0 0">Catégorie : <strong style="color:#00cec9">' + catLabel + '</strong></p></div>' +
      '<div style="position:relative;width:min(85vw,640px);border-radius:16px;overflow:hidden;background:#000;box-shadow:0 0 60px rgba(108,92,231,0.3)">' +
      '<video id="pe-cam-video" autoplay playsinline style="width:100%;display:block;max-height:60vh"></video>' +
      '<canvas id="pe-cam-canvas" style="display:none"></canvas>' +
      '<img id="pe-cam-preview" style="display:none;width:100%"></div>' +
      '<div style="display:flex;gap:16px;margin-top:1.2rem;align-items:center" id="pe-cam-controls">' +
      '<button onclick="PhotoEnhanced._switchCamera()" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center" title="Changer caméra"><i class="fas fa-sync-alt"></i></button>' +
      '<button onclick="PhotoEnhanced._captureFrame(' + vehicleId + ')" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#00cec9);border:4px solid rgba(255,255,255,0.3);color:#fff;font-size:1.5rem;cursor:pointer;transition:transform 0.15s;display:flex;align-items:center;justify-content:center" title="Capturer"><i class="fas fa-camera"></i></button>' +
      '<select id="pe-cam-cat" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 12px;border-radius:10px;font-size:0.8rem">' +
      this.CATEGORIES.map(c => '<option value="' + c.id + '"' + (c.id === category ? ' selected' : '') + ' style="background:#1a1f35;color:#fff">' + c.label + '</option>').join('') + '</select></div>' +
      '<div id="pe-cam-retake" style="display:none;margin-top:1rem;gap:12px;justify-content:center;align-items:center">' +
      '<button onclick="PhotoEnhanced._retakePhoto()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600"><i class="fas fa-redo"></i> Reprendre</button>' +
      '<button onclick="PhotoEnhanced._saveCaptured(' + vehicleId + ')" style="background:linear-gradient(135deg,#6c5ce7,#00cec9);border:none;color:#fff;padding:10px 24px;border-radius:10px;cursor:pointer;font-weight:700"><i class="fas fa-check"></i> Enregistrer</button></div>';

    document.body.appendChild(overlay);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._currentFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this._cameraStream = stream;
      const video = document.getElementById('pe-cam-video');
      if (video) video.srcObject = stream;
    } catch (err) {
      console.error('Camera error:', err);
      Utils.notify('Impossible d\'accéder à la caméra: ' + err.message, 'error');
      overlay.remove();
    }
  },

  async _switchCamera() {
    this._currentFacing = this._currentFacing === 'environment' ? 'user' : 'environment';
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._currentFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this._cameraStream = stream;
      const video = document.getElementById('pe-cam-video');
      if (video) video.srcObject = stream;
    } catch (err) {
      Utils.notify('Erreur changement caméra', 'warning');
    }
  },

  _captureFrame(vehicleId) {
    const video = document.getElementById('pe-cam-video');
    const canvas = document.getElementById('pe-cam-canvas');
    const preview = document.getElementById('pe-cam-preview');
    const controls = document.getElementById('pe-cam-controls');
    const retake = document.getElementById('pe-cam-retake');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    this._capturedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    if (preview) { preview.src = this._capturedDataUrl; preview.style.display = 'block'; }
    video.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (retake) retake.style.display = 'flex';
  },

  _retakePhoto() {
    const video = document.getElementById('pe-cam-video');
    const preview = document.getElementById('pe-cam-preview');
    const controls = document.getElementById('pe-cam-controls');
    const retake = document.getElementById('pe-cam-retake');
    if (video) video.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (controls) controls.style.display = 'flex';
    if (retake) retake.style.display = 'none';
    this._capturedDataUrl = null;
  },

  async _saveCaptured(vehicleId) {
    if (!this._capturedDataUrl) return;

    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);

    const catEl = document.getElementById('pe-cam-cat');
    const category = catEl ? catEl.value : 'other';

    let dataUrl = this._capturedDataUrl;
    // Compress
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    dataUrl = await Vehicles._compressImage(file, 1200, 0.82);

    if (this._watermarkOn) {
      dataUrl = await this._applyWatermark(dataUrl, 'MON PARKING');
    }

    v.images.push(dataUrl);
    v.imagesMeta.push({ category: category, addedAt: new Date().toISOString() });
    await DB.update('vehicles', v);
    this._currentVehicle = v;

    Utils.notify('Photo capturée et enregistrée !', 'success');
    this._closeCamera();
    if (this._renderGrid) this._renderGrid();
    if (typeof Vehicles !== 'undefined') Vehicles.render();
  },

  _closeCamera() {
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach(t => t.stop());
      this._cameraStream = null;
    }
    this._capturedDataUrl = null;
    const overlay = document.getElementById('pe-camera-overlay');
    if (overlay) overlay.remove();
  },

  // ──── PHOTO MANAGEMENT ────
  async _deletePhoto(vehicleId, idx) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v || !v.images) return;
    this._ensureMeta(v);
    v.images.splice(idx, 1);
    v.imagesMeta.splice(idx, 1);
    await DB.update('vehicles', v);
    this._currentVehicle = v;
    Utils.notify('Photo supprimée', 'success');
    if (this._renderGrid) this._renderGrid();
    if (typeof Vehicles !== 'undefined') Vehicles.render();
  },

  async _setMainPhoto(vehicleId, idx) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v || !v.images || idx <= 0) return;
    this._ensureMeta(v);
    const [photo] = v.images.splice(idx, 1);
    const [meta] = v.imagesMeta.splice(idx, 1);
    v.images.unshift(photo);
    v.imagesMeta.unshift(meta);
    await DB.update('vehicles', v);
    this._currentVehicle = v;
    Utils.notify('Photo principale mise à jour !', 'success');
    if (this._renderGrid) this._renderGrid();
    if (typeof Vehicles !== 'undefined') Vehicles.render();
  },

  _showCatPicker(vehicleId, idx) {
    const pickerHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:0.5rem 0">' +
      this.CATEGORIES.map(c =>
        '<button onclick="PhotoEnhanced._changeCat(' + vehicleId + ',' + idx + ',\'' + c.id + '\')" class="pe-cat-btn" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:var(--bg-glass);border:1px solid var(--border-color);color:var(--text-main);cursor:pointer;font-size:0.82rem;transition:all 0.2s;font-family:inherit" onmouseover="this.style.borderColor=\'var(--accent-cyan)\';this.style.background=\'rgba(0,206,201,0.1)\'" onmouseout="this.style.borderColor=\'var(--border-color)\';this.style.background=\'var(--bg-glass)\'">' +
        '<i class="fas ' + c.icon + '" style="color:var(--accent-cyan);width:16px;text-align:center"></i> ' + c.label + '</button>'
      ).join('') + '</div>';
    Utils.showModal('Choisir la catégorie', pickerHtml, { hideFooter: true });
  },

  async _changeCat(vehicleId, idx, newCat) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);
    if (v.imagesMeta[idx]) v.imagesMeta[idx].category = newCat;
    await DB.update('vehicles', v);
    this._currentVehicle = v;
    Utils.notify('Catégorie mise à jour : ' + this._cat(newCat).label, 'success');
    // Close category picker modal and re-render
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    this.openManager(vehicleId);
  },

  _viewFullPhoto(idx) {
    const v = this._currentVehicle;
    if (!v || !v.images || !v.images[idx]) return;
    const src = v.images[idx];
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.94);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;backdrop-filter:blur(10px)';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML =
      '<img src="' + src + '" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 0 60px rgba(0,0,0,0.8);transition:transform 0.3s" id="pe-zoom-img">' +
      '<button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.12);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer"><i class="fas fa-times"></i></button>' +
      '<div style="position:absolute;bottom:20px;display:flex;gap:8px">' +
      '<button onclick="event.stopPropagation();PhotoEnhanced._zoomImg(1.5)" style="background:rgba(255,255,255,0.12);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.85rem"><i class="fas fa-search-plus"></i> Zoom +</button>' +
      '<button onclick="event.stopPropagation();PhotoEnhanced._zoomImg(1)" style="background:rgba(255,255,255,0.12);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.85rem"><i class="fas fa-compress"></i> Reset</button></div>';
    document.body.appendChild(overlay);
  },

  _zoomImg(scale) {
    const img = document.getElementById('pe-zoom-img');
    if (img) img.style.transform = 'scale(' + scale + ')';
  },

  // ──── SHARE ────
  async _shareVehicle(vehicleId) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    const text = v.brand + ' ' + v.model + ' (' + (v.year || '') + ')\n' +
      'Prix: ' + Utils.formatCurrency(v.salePrice) + '\n' +
      'Location: ' + Utils.formatCurrency(v.rentalPricePerDay) + '/jour\n' +
      (v.mileage ? Utils.formatNumber(v.mileage) + ' km\n' : '') +
      (v.fuel || '') + ' · ' + (v.transmission || '') + '\n' +
      v.images.length + ' photo(s) disponible(s)';

    if (navigator.share) {
      try {
        await navigator.share({ title: v.brand + ' ' + v.model, text: text });
        Utils.notify('Partagé avec succès !', 'success');
      } catch (e) {
        if (e.name !== 'AbortError') this._copyToClipboard(text);
      }
    } else {
      this._copyToClipboard(text);
    }
  },

  _copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      Utils.notify('Informations copiées dans le presse-papiers !', 'success');
    }).catch(() => {
      Utils.notify('Impossible de copier', 'warning');
    });
  },

  // ============================================================
  // ENHANCED 360° VIEWER WITH MINIMAP
  // ============================================================
  async open360(vehicleId) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);
    this._currentVehicle = v;
    const images = v.images || [];

    const overlay = document.createElement('div');
    overlay.id = 'pe-360-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,20,0.97);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(12px)';

    if (images.length === 0) {
      overlay.innerHTML =
        '<div style="text-align:center;color:#fff;max-width:480px;padding:2rem">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:rgba(0,206,201,0.12);border:2px solid rgba(0,206,201,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;color:#00cec9;font-size:2rem"><i class="fas fa-camera"></i></div>' +
        '<h3 style="font-size:1.5rem;margin-bottom:0.5rem;font-weight:800">' + Utils.escapeHTML(v.brand) + ' ' + Utils.escapeHTML(v.model) + '</h3>' +
        '<p style="color:rgba(255,255,255,0.65);font-size:0.95rem;margin-bottom:0.5rem">Aucune photo enregistrée pour ce véhicule.</p>' +
        '<p style="color:rgba(255,255,255,0.4);font-size:0.82rem;line-height:1.5">Vous pouvez photographier le véhicule sous tous les angles avec votre caméra, importer des photos ou générer un jeu de test complet 360° en un clic.</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:2rem">' +
        '<button onclick="document.getElementById(\'pe-360-overlay\').remove();PhotoEnhanced.openManager(' + vehicleId + ')" style="background:linear-gradient(135deg,var(--primary),var(--accent-cyan));border:none;color:#fff;padding:12px 24px;border-radius:24px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;font-size:0.9rem;box-shadow:0 4px 15px rgba(0,206,201,0.4)"><i class="fas fa-camera"></i> Ajouter des photos / Ouvrir la galerie</button>' +
        '<button onclick="document.getElementById(\'pe-360-overlay\').remove();PhotoEnhanced.generateDemo360(' + vehicleId + ')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:11px 24px;border-radius:24px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;font-size:0.85rem"><i class="fas fa-magic" style="color:var(--accent-orange)"></i> Générer une série démo 360° complète</button>' +
        '<button onclick="document.getElementById(\'pe-360-overlay\').remove()" style="background:transparent;border:none;color:rgba(255,255,255,0.45);padding:8px;cursor:pointer;font-size:0.85rem"><i class="fas fa-times"></i> Fermer</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      return;
    }

    // Sort images by category order for logical 360° rotation
    const sortedIndices = this._getSortedIndices(v);
    let currentPos = 0;
    let isAutoRotating = false;
    let autoTimer = null;
    let isDragging = false;
    let dragStartX = 0;
    let zoomLevel = 1;
    const total = sortedIndices.length;

    // Build minimap SVG
    const minimapSVG = this._buildMinimap(v, sortedIndices, 0);

    overlay.innerHTML =
      '<style>' +
      '#pe-360-img{width:100%;height:100%;object-fit:contain;border-radius:16px;box-shadow:0 0 60px rgba(108,92,231,0.3);user-select:none;display:block;transition:opacity 0.18s ease,transform 0.25s ease}' +
      '.pe-360-thumb{width:58px;height:44px;border-radius:6px;object-fit:cover;border:2px solid transparent;cursor:pointer;transition:all 0.2s;opacity:0.55;flex-shrink:0}' +
      '.pe-360-thumb:hover{opacity:0.9;transform:scale(1.08)}' +
      '.pe-360-thumb.active{border-color:#00cec9;opacity:1;transform:scale(1.1)}' +
      '.pe-360-btn{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:50%;width:42px;height:42px;color:#fff;cursor:pointer;font-size:0.95rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;backdrop-filter:blur(4px)}' +
      '.pe-360-btn:hover{background:rgba(108,92,231,0.5);border-color:#00cec9;transform:scale(1.1)}' +
      '.pe-360-cat-label{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#00cec9;font-size:0.72rem;padding:4px 14px;border-radius:20px;backdrop-filter:blur(6px);font-weight:600;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;white-space:nowrap}' +
      '</style>' +
      // Close button
      '<button onclick="PhotoEnhanced._close360()" class="pe-360-btn" style="position:absolute;top:16px;right:16px;z-index:5"><i class="fas fa-times"></i></button>' +
      // Title
      '<div style="text-align:center;margin-bottom:0.8rem;color:#fff">' +
      '<h3 style="font-size:1.35rem;font-weight:800;margin:0">' + Utils.escapeHTML(v.brand) + ' ' + Utils.escapeHTML(v.model) + '</h3>' +
      '<p style="color:rgba(255,255,255,0.4);font-size:0.78rem;margin:2px 0 0">' + Utils.escapeHTML(String(v.year || '')) + ' · ' + Utils.escapeHTML(v.color || '') + ' · <span id="pe-360-counter">1 / ' + total + '</span></p></div>' +
      // Main viewer area with minimap
      '<div style="display:flex;gap:1.2rem;align-items:center;width:min(90vw,820px)">' +
      // Main image
      '<div id="pe-360-container" style="flex:1;height:min(55vh,420px);position:relative;cursor:grab">' +
      '<img id="pe-360-img" src="' + images[sortedIndices[0]] + '" alt="' + Utils.escapeHTML(v.brand) + '" draggable="false">' +
      '<div class="pe-360-cat-label" id="pe-360-cat-label"><i class="fas ' + this._cat((v.imagesMeta[sortedIndices[0]] || {}).category || 'other').icon + '"></i> ' + this._cat((v.imagesMeta[sortedIndices[0]] || {}).category || 'other').label + '</div>' +
      '</div>' +
      // Minimap
      '<div id="pe-360-minimap" style="width:90px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px">' +
      '<div style="color:rgba(255,255,255,0.35);font-size:0.65rem;text-transform:uppercase;letter-spacing:1px;font-weight:600">Position</div>' +
      minimapSVG +
      '<div id="pe-360-minimap-label" style="color:#00cec9;font-size:0.7rem;font-weight:600;text-align:center">' + this._cat((v.imagesMeta[sortedIndices[0]] || {}).category || 'other').label + '</div>' +
      '</div></div>' +
      // Hint
      '<div style="color:rgba(255,255,255,0.3);font-size:0.75rem;margin-top:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-arrows-alt-h"></i> Glisser pour tourner · <i class="fas fa-keyboard"></i> Flèches · <i class="fas fa-mouse"></i> Scroll pour zoomer</div>' +
      // Controls
      '<div style="display:flex;align-items:center;gap:10px;margin-top:1rem">' +
      '<button class="pe-360-btn" id="pe-360-prev"><i class="fas fa-chevron-left"></i></button>' +
      '<button class="pe-360-btn" id="pe-360-autorotate" style="width:46px;height:46px"><i class="fas fa-play" id="pe-360-play-icon"></i></button>' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:3px">' +
      '<input type="range" id="pe-360-zoom" min="50" max="200" value="100" style="width:100px;accent-color:#00cec9" oninput="PhotoEnhanced._setZoom(this.value)">' +
      '<small style="color:rgba(255,255,255,0.35);font-size:0.65rem">Zoom</small></div>' +
      '<button class="pe-360-btn" id="pe-360-next"><i class="fas fa-chevron-right"></i></button>' +
      '<button class="pe-360-btn" id="pe-360-fs"><i class="fas fa-expand"></i></button>' +
      '<button class="pe-360-btn" onclick="PhotoEnhanced._shareVehicle(' + vehicleId + ')" title="Partager"><i class="fas fa-share-alt"></i></button></div>' +
      // Thumbnails grouped by category
      '<div style="margin-top:1rem;max-width:min(92vw,780px);width:100%">' +
      this._buildGroupedThumbs(v, sortedIndices) + '</div>' +
      // Info panel
      '<div style="margin-top:0.8rem;display:flex;gap:1.5rem;text-align:center;padding:0.6rem 1.5rem;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.06)">' +
      '<div><div style="color:rgba(255,255,255,0.4);font-size:0.65rem;text-transform:uppercase">Vente</div><div style="font-weight:800;font-size:1.1rem;color:#00cec9">' + Utils.formatCurrency(v.salePrice) + '</div></div>' +
      '<div style="border-left:1px solid rgba(255,255,255,0.1)"></div>' +
      '<div><div style="color:rgba(255,255,255,0.4);font-size:0.65rem;text-transform:uppercase">Location/jour</div><div style="font-weight:700;font-size:1.05rem;color:#a29bfe">' + Utils.formatCurrency(v.rentalPricePerDay) + '</div></div>' +
      '<div style="border-left:1px solid rgba(255,255,255,0.1)"></div>' +
      '<div><div style="color:rgba(255,255,255,0.4);font-size:0.65rem;text-transform:uppercase">Km</div><div style="font-weight:700;font-size:1.05rem;color:#fff">' + Utils.formatNumber(v.mileage) + '</div></div></div>';

    document.body.appendChild(overlay);

    // Navigation logic
    const goTo = (pos, dir) => {
      currentPos = ((pos % total) + total) % total;
      const realIdx = sortedIndices[currentPos];
      const img = document.getElementById('pe-360-img');
      const counter = document.getElementById('pe-360-counter');
      const catLabel = document.getElementById('pe-360-cat-label');
      const mmLabel = document.getElementById('pe-360-minimap-label');
      const meta = v.imagesMeta[realIdx] || { category: 'other' };
      const cat = this._cat(meta.category);

      if (img) {
        img.style.opacity = '0';
        img.style.transform = 'scale(' + (zoomLevel / 100) + ') translateX(' + (dir > 0 ? 30 : -30) + 'px)';
        setTimeout(() => {
          img.src = images[realIdx];
          img.style.transform = 'scale(' + (zoomLevel / 100) + ') translateX(' + (dir > 0 ? -20 : 20) + 'px)';
          requestAnimationFrame(() => { img.style.opacity = '1'; img.style.transform = 'scale(' + (zoomLevel / 100) + ')'; });
        }, 160);
      }
      if (counter) counter.textContent = (currentPos + 1) + ' / ' + total;
      if (catLabel) catLabel.innerHTML = '<i class="fas ' + cat.icon + '"></i> ' + cat.label;
      if (mmLabel) mmLabel.textContent = cat.label;

      // Update minimap indicator
      this._updateMinimapDot(meta.category);

      // Update thumb active states
      overlay.querySelectorAll('.pe-360-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === currentPos);
        if (i === currentPos) t.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      });
    };

    // Event bindings
    document.getElementById('pe-360-prev').onclick = () => goTo(currentPos - 1, -1);
    document.getElementById('pe-360-next').onclick = () => goTo(currentPos + 1, 1);

    // Store goTo for external thumb clicks
    this._360GoTo = (pos) => goTo(pos, pos >= currentPos ? 1 : -1);

    // Keyboard
    const keyHandler = (e) => {
      if (!document.getElementById('pe-360-overlay')) { document.removeEventListener('keydown', keyHandler); return; }
      if (e.key === 'ArrowLeft') goTo(currentPos - 1, -1);
      if (e.key === 'ArrowRight') goTo(currentPos + 1, 1);
      if (e.key === '+' || e.key === '=') { zoomLevel = Math.min(200, zoomLevel + 15); this._setZoom(zoomLevel); }
      if (e.key === '-') { zoomLevel = Math.max(50, zoomLevel - 15); this._setZoom(zoomLevel); }
      if (e.key === 'Escape') { this._close360(); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);

    // Mouse drag
    const container = document.getElementById('pe-360-container');
    if (container) {
      container.addEventListener('mousedown', (e) => { isDragging = true; dragStartX = e.clientX; container.style.cursor = 'grabbing'; e.preventDefault(); });
      container.addEventListener('touchstart', (e) => { isDragging = true; dragStartX = e.touches[0].clientX; }, { passive: true });
      const onMove = (clientX) => {
        if (!isDragging) return;
        const delta = clientX - dragStartX;
        if (Math.abs(delta) > 45) { goTo(currentPos + (delta > 0 ? -1 : 1), delta > 0 ? -1 : 1); dragStartX = clientX; }
      };
      document.addEventListener('mousemove', (e) => onMove(e.clientX));
      document.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
      document.addEventListener('mouseup', () => { isDragging = false; if (container) container.style.cursor = 'grab'; });
      document.addEventListener('touchend', () => { isDragging = false; });

      // Scroll zoom
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel = Math.max(50, Math.min(200, zoomLevel + (e.deltaY > 0 ? -10 : 10)));
        this._setZoom(zoomLevel);
      }, { passive: false });
    }

    // Auto rotate
    document.getElementById('pe-360-autorotate').onclick = () => {
      isAutoRotating = !isAutoRotating;
      const icon = document.getElementById('pe-360-play-icon');
      const btn = document.getElementById('pe-360-autorotate');
      if (icon) icon.className = isAutoRotating ? 'fas fa-pause' : 'fas fa-play';
      if (btn) btn.style.background = isAutoRotating ? 'rgba(0,206,201,0.35)' : 'rgba(255,255,255,0.1)';
      if (isAutoRotating) {
        autoTimer = setInterval(() => {
          if (!document.getElementById('pe-360-overlay')) { clearInterval(autoTimer); return; }
          goTo(currentPos + 1, 1);
        }, 1400);
      } else {
        clearInterval(autoTimer);
      }
    };

    // Fullscreen
    document.getElementById('pe-360-fs').onclick = () => {
      const el = document.getElementById('pe-360-container');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el && el.requestFullscreen) el.requestFullscreen();
    };
  },

  _setZoom(val) {
    zoomLevel = parseInt(val);
    const img = document.getElementById('pe-360-img');
    const slider = document.getElementById('pe-360-zoom');
    if (img) img.style.transform = 'scale(' + (val / 100) + ')';
    if (slider) slider.value = val;
  },

  _close360() {
    const overlay = document.getElementById('pe-360-overlay');
    if (overlay) overlay.remove();
  },

  _getSortedIndices(v) {
    const order = this.CATEGORIES.map(c => c.id);
    const indices = v.images.map((_, i) => i);
    indices.sort((a, b) => {
      const catA = (v.imagesMeta[a] || {}).category || 'other';
      const catB = (v.imagesMeta[b] || {}).category || 'other';
      return order.indexOf(catA) - order.indexOf(catB);
    });
    return indices;
  },

  _buildGroupedThumbs(v, sortedIndices) {
    const groups = {};
    sortedIndices.forEach((realIdx, pos) => {
      const meta = v.imagesMeta[realIdx] || { category: 'other' };
      const cat = this._cat(meta.category);
      const groupLabel = cat.group === 'ext' ? 'Extérieur' : cat.group === 'int' ? 'Intérieur' : cat.group === 'detail' ? 'Détails' : 'Autre';
      if (!groups[groupLabel]) groups[groupLabel] = [];
      groups[groupLabel].push({ pos, realIdx, cat });
    });

    let html = '<div style="display:flex;gap:12px;overflow-x:auto;padding:4px;scrollbar-width:thin">';
    for (const [group, items] of Object.entries(groups)) {
      html += '<div style="flex-shrink:0"><div style="color:rgba(255,255,255,0.3);font-size:0.6rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;padding-left:2px">' + group + '</div>' +
        '<div style="display:flex;gap:5px">' +
        items.map((item, i) =>
          '<div style="position:relative"><img class="pe-360-thumb' + (item.pos === 0 ? ' active' : '') + '" src="' + v.images[item.realIdx] + '" data-pos="' + item.pos + '" onclick="PhotoEnhanced._360GoTo(' + item.pos + ')" alt="' + item.cat.label + '" draggable="false">' +
          '<div style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);font-size:0.5rem;color:rgba(255,255,255,0.5);white-space:nowrap;background:rgba(0,0,0,0.5);padding:0 4px;border-radius:3px">' + item.cat.label + '</div></div>'
        ).join('') + '</div></div>';
    }
    html += '</div>';
    return html;
  },

  _buildMinimap(v, sortedIndices, currentPos) {
    const currentMeta = v.imagesMeta[sortedIndices[currentPos]] || { category: 'other' };
    const currentCat = this._cat(currentMeta.category);
    const angle = currentCat.angle;

    // Car outline SVG viewed from above
    let dotX = 50, dotY = 80; // center by default
    if (angle >= 0) {
      const rad = (angle - 90) * Math.PI / 180;
      dotX = 50 + Math.cos(rad) * 38;
      dotY = 80 + Math.sin(rad) * 55;
    }

    // Show dots for all positions with photos
    let photoDots = '';
    const extCats = this.CATEGORIES.filter(c => c.angle >= 0);
    const usedCats = new Set(v.imagesMeta.map(m => (m || {}).category || 'other'));
    extCats.forEach(cat => {
      if (usedCats.has(cat.id)) {
        const rad = (cat.angle - 90) * Math.PI / 180;
        const px = 50 + Math.cos(rad) * 38;
        const py = 80 + Math.sin(rad) * 55;
        photoDots += '<circle cx="' + px + '" cy="' + py + '" r="3" fill="rgba(108,92,231,0.5)" />';
      }
    });

    return '<svg viewBox="0 0 100 160" width="80" id="pe-360-minimap-svg">' +
      '<defs><filter id="pe-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      // Car body outline (top view)
      '<path d="M35,20 Q50,12 65,20 L70,40 Q75,55 75,80 L75,120 Q75,142 65,150 Q50,156 35,150 Q25,142 25,120 L25,80 Q25,55 30,40 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>' +
      // Windshield
      '<path d="M37,40 L63,40 L67,55 L33,55 Z" fill="rgba(0,206,201,0.1)" stroke="rgba(0,206,201,0.2)" stroke-width="1"/>' +
      // Rear window
      '<path d="M37,125 L63,125 L67,140 L33,140 Z" fill="rgba(108,92,231,0.1)" stroke="rgba(108,92,231,0.2)" stroke-width="1"/>' +
      // Wheels
      '<rect x="18" y="45" width="8" height="16" rx="3" fill="rgba(255,255,255,0.12)"/>' +
      '<rect x="74" y="45" width="8" height="16" rx="3" fill="rgba(255,255,255,0.12)"/>' +
      '<rect x="18" y="110" width="8" height="16" rx="3" fill="rgba(255,255,255,0.12)"/>' +
      '<rect x="74" y="110" width="8" height="16" rx="3" fill="rgba(255,255,255,0.12)"/>' +
      // Photo position dots
      photoDots +
      // Active position dot
      '<circle id="pe-minimap-dot" cx="' + dotX + '" cy="' + dotY + '" r="6" fill="#00cec9" filter="url(#pe-glow)" style="transition:all 0.4s ease"/>' +
      // Direction arrow (front indicator)
      '<polygon points="50,6 45,14 55,14" fill="rgba(0,206,201,0.6)"/>' +
      '</svg>';
  },

  _updateMinimapDot(categoryId) {
    const cat = this._cat(categoryId);
    const dot = document.getElementById('pe-minimap-dot');
    if (!dot) return;

    let dotX = 50, dotY = 80;
    if (cat.angle >= 0) {
      const rad = (cat.angle - 90) * Math.PI / 180;
      dotX = 50 + Math.cos(rad) * 38;
      dotY = 80 + Math.sin(rad) * 55;
    }
    // For interior photos, show dot in center
    if (cat.group === 'int') {
      dotX = 50; dotY = 70;
      dot.setAttribute('fill', '#a29bfe');
    } else if (cat.group === 'detail') {
      dotX = 50; dotY = 90;
      dot.setAttribute('fill', '#fdcb6e');
    } else {
      dot.setAttribute('fill', '#00cec9');
    }
    dot.setAttribute('cx', dotX);
    dot.setAttribute('cy', dotY);
  },

  // ──── DEMO 360 PHOTO GENERATOR ────
  async generateDemo360(vehicleId) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;
    this._ensureMeta(v);

    Utils.notify('Génération de la série 360° en cours...', 'info');

    const demoAngles = [
      { id: 'front', label: 'Avant (0°)', angle: 0 },
      { id: 'front-right', label: 'Avant-Droit (45°)', angle: 45 },
      { id: 'right', label: 'Profil Droit (90°)', angle: 90 },
      { id: 'rear-right', label: 'Arrière-Droit (135°)', angle: 135 },
      { id: 'rear', label: 'Arrière (180°)', angle: 180 },
      { id: 'rear-left', label: 'Arrière-Gauche (225°)', angle: 225 },
      { id: 'left', label: 'Profil Gauche (270°)', angle: 270 },
      { id: 'front-left', label: 'Avant-Gauche (315°)', angle: 315 },
      { id: 'interior', label: 'Habitacle Intérieur', angle: -1 },
      { id: 'dashboard', label: 'Poste de conduite', angle: -1 }
    ];

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    // Base car theme color
    const brandColor = (v.color && v.color.toLowerCase().includes('noir')) ? '#2d3436' :
                       (v.color && v.color.toLowerCase().includes('blanc')) ? '#dfe6e9' :
                       (v.color && v.color.toLowerCase().includes('rouge')) ? '#d63031' :
                       (v.color && v.color.toLowerCase().includes('bleu')) ? '#0984e3' :
                       (v.color && v.color.toLowerCase().includes('gris')) ? '#636e72' : '#6c5ce7';

    for (let item of demoAngles) {
      ctx.clearRect(0, 0, 800, 540);

      // 1. Studio backdrop
      const bgGrad = ctx.createRadialGradient(400, 240, 50, 400, 270, 500);
      bgGrad.addColorStop(0, '#1c2237');
      bgGrad.addColorStop(0.65, '#0d111e');
      bgGrad.addColorStop(1, '#05070d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 540);

      // Studio light podium
      ctx.save();
      ctx.translate(400, 390);
      ctx.scale(1, 0.32);
      ctx.beginPath();
      ctx.arc(0, 0, 280, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 206, 201, 0.08)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.35)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(108, 92, 231, 0.25)';
      ctx.stroke();
      ctx.restore();

      // Shadow under car
      ctx.save();
      ctx.translate(400, 395);
      ctx.scale(1, 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, 210, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.filter = 'blur(12px)';
      ctx.fill();
      ctx.restore();

      // 2. Draw view according to category
      ctx.save();
      if (item.id === 'interior') {
        // Interior view
        ctx.fillStyle = '#1e2430';
        ctx.roundRect(140, 160, 520, 260, [30, 30, 10, 10]);
        ctx.fill();
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Steering wheel
        ctx.beginPath();
        ctx.arc(280, 270, 65, 0, Math.PI * 2);
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#2d3436';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(280, 270, 22, 0, Math.PI * 2);
        ctx.fillStyle = '#636e72';
        ctx.fill();

        // Center screen
        ctx.fillStyle = '#0984e3';
        ctx.roundRect(380, 210, 140, 85, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('GPS NAVIGATION', 395, 255);

        // Seats
        ctx.fillStyle = '#2f3542';
        ctx.roundRect(170, 310, 110, 90, 12);
        ctx.roundRect(510, 310, 110, 90, 12);
        ctx.fill();
      } else if (item.id === 'dashboard') {
        // Cockpit view
        ctx.fillStyle = '#111723';
        ctx.roundRect(100, 140, 600, 280, 16);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,206,201,0.4)';
        ctx.stroke();

        // Left digital gauge
        ctx.beginPath();
        ctx.arc(260, 270, 65, 0.7 * Math.PI, 2.3 * Math.PI);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#00cec9';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('95', 260, 270);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('KM/H', 260, 288);

        // Right digital gauge
        ctx.beginPath();
        ctx.arc(540, 270, 65, 0.7 * Math.PI, 2.3 * Math.PI);
        ctx.strokeStyle = '#6c5ce7';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText('2.8', 540, 270);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('x1000 RPM', 540, 288);

        // Center info
        ctx.fillStyle = '#a29bfe';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(v.brand.toUpperCase() + ' ' + v.model.toUpperCase(), 400, 230);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('AUTONOMIE: 640 KM', 400, 260);
        ctx.fillText('CONSOMMATION: 5.8 L/100', 400, 285);
      } else {
        // Exterior angle drawing
        ctx.save();
        ctx.translate(400, 310);

        // Car main body
        const carGrad = ctx.createLinearGradient(-180, -100, 180, 80);
        carGrad.addColorStop(0, brandColor);
        carGrad.addColorStop(0.5, '#ffffff');
        carGrad.addColorStop(0.52, brandColor);
        carGrad.addColorStop(1, '#1e272e');

        ctx.fillStyle = carGrad;
        ctx.beginPath();

        if (item.angle === 0) { // Front
          ctx.roundRect(-150, -60, 300, 120, [35, 35, 15, 15]);
          ctx.fill();
          // Windshield
          ctx.fillStyle = 'rgba(0, 206, 201, 0.25)';
          ctx.roundRect(-110, -50, 220, 50, [15, 15, 0, 0]);
          ctx.fill();
          // Grille
          ctx.fillStyle = '#111';
          ctx.roundRect(-80, 15, 160, 35, 8);
          ctx.fill();
          // Headlights
          ctx.fillStyle = '#00cec9';
          ctx.beginPath();
          ctx.ellipse(-115, 10, 22, 10, -0.2, 0, Math.PI * 2);
          ctx.ellipse(115, 10, 22, 10, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Front Plate
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-50, 32, 100, 18);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v.licensePlate || 'TN 2026', 0, 45);
        } else if (item.angle === 180) { // Rear
          ctx.roundRect(-150, -60, 300, 120, [30, 30, 20, 20]);
          ctx.fill();
          // Rear window
          ctx.fillStyle = 'rgba(108, 92, 231, 0.25)';
          ctx.roundRect(-110, -50, 220, 45, [10, 10, 0, 0]);
          ctx.fill();
          // Taillights
          ctx.fillStyle = '#ff7675';
          ctx.shadowColor = '#d63031';
          ctx.shadowBlur = 15;
          ctx.fillRect(-140, 5, 45, 16);
          ctx.fillRect(95, 5, 45, 16);
          ctx.shadowBlur = 0;
          // Rear Plate
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-50, 28, 100, 18);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v.licensePlate || 'TN 2026', 0, 41);
        } else if (item.angle === 90 || item.angle === 270) { // Side profile
          const flip = item.angle === 270 ? -1 : 1;
          ctx.scale(flip, 1);
          // Body silhouette
          ctx.beginPath();
          ctx.moveTo(-190, 30);
          ctx.lineTo(-170, 0);
          ctx.lineTo(-90, -10);
          ctx.lineTo(-40, -65);
          ctx.lineTo(70, -65);
          ctx.lineTo(130, -5);
          ctx.lineTo(190, 5);
          ctx.lineTo(190, 35);
          ctx.lineTo(-190, 35);
          ctx.closePath();
          ctx.fill();
          // Windows
          ctx.fillStyle = 'rgba(0, 206, 201, 0.25)';
          ctx.beginPath();
          ctx.moveTo(-35, -55);
          ctx.lineTo(60, -55);
          ctx.lineTo(110, -8);
          ctx.lineTo(-75, -8);
          ctx.closePath();
          ctx.fill();
          // Wheels
          [-110, 110].forEach(wx => {
            ctx.beginPath();
            ctx.arc(wx, 35, 34, 0, Math.PI * 2);
            ctx.fillStyle = '#1e272e';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(wx, 35, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#bdc3c7';
            ctx.fill();
          });
        } else { // 3/4 Perspective angles (45, 135, 225, 315)
          const flip = (item.angle === 225 || item.angle === 315) ? -1 : 1;
          const isRear = (item.angle === 135 || item.angle === 225);
          ctx.scale(flip, 1);
          ctx.beginPath();
          ctx.moveTo(-160, 25);
          ctx.lineTo(-140, -10);
          ctx.lineTo(-70, -55);
          ctx.lineTo(60, -55);
          ctx.lineTo(140, -5);
          ctx.lineTo(170, 30);
          ctx.lineTo(-160, 30);
          ctx.closePath();
          ctx.fill();
          // Window
          ctx.fillStyle = isRear ? 'rgba(108,92,231,0.25)' : 'rgba(0,206,201,0.25)';
          ctx.beginPath();
          ctx.moveTo(-55, -48);
          ctx.lineTo(50, -48);
          ctx.lineTo(115, -8);
          ctx.lineTo(-70, -8);
          ctx.closePath();
          ctx.fill();
          // Light
          ctx.fillStyle = isRear ? '#ff7675' : '#00cec9';
          ctx.fillRect(isRear ? 120 : -140, 0, 28, 14);
          // Wheels
          [-95, 105].forEach(wx => {
            ctx.beginPath();
            ctx.arc(wx, 32, 32, 0, Math.PI * 2);
            ctx.fillStyle = '#1e272e';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(wx, 32, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#bdc3c7';
            ctx.fill();
          });
        }
        ctx.restore();
      }
      ctx.restore();

      // 3. Header badge: vehicle brand, model and year
      ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
      ctx.roundRect(30, 25, 340, 50, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(108, 92, 231, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(v.brand + ' ' + v.model, 46, 48);
      ctx.fillStyle = 'rgba(0, 206, 201, 0.9)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText((v.year || '') + ' · ' + (v.fuel || 'Essence') + ' · ' + (v.licensePlate || 'Sans immat'), 46, 65);

      // 4. Angle view tag top right
      ctx.fillStyle = 'rgba(0, 206, 201, 0.15)';
      ctx.roundRect(550, 25, 220, 36, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.4)';
      ctx.stroke();

      ctx.fillStyle = '#00cec9';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 ' + item.label.toUpperCase(), 660, 48);

      // 5. Watermark bottom left
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ MON PARKING PRO · 360° STUDIO', 30, 515);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      v.images.push(dataUrl);
      v.imagesMeta.push({ category: item.id, addedAt: new Date().toISOString() });
    }

    await DB.update('vehicles', v);
    this._currentVehicle = v;
    Utils.notify('Série complète 360° générée (' + demoAngles.length + ' vues) !', 'success');

    if (this._renderGrid) this._renderGrid();
    if (typeof Vehicles !== 'undefined') Vehicles.render();
    if (typeof Stock !== 'undefined' && Stock.render) Stock.render();

    // Auto open 360 viewer
    setTimeout(() => {
      PhotoEnhanced.open360(vehicleId);
    }, 400);
  }
};

// Zoom level needs to be accessible
let zoomLevel = 100;

window.PhotoEnhanced = PhotoEnhanced;
