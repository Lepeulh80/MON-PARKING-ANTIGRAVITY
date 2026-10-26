/* ========================================================================
   MON PARKING - Stock & Inventory Module
   Detailed vehicle stock valuation, inventory rotation, status and categories
   ======================================================================== */

const Stock = {
  currentCategoryFilter: 'all',
  currentStatusFilter: 'all',
  currentPhotoFilter: 'all',

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    const vehicles = await DB.getVehiclesByParking(parkingId);

    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available');
    const vehiclesWithPhotos = vehicles.filter(v => v.images && v.images.length > 0);
    const withPhotosCount = vehiclesWithPhotos.length;
    const withoutPhotosCount = totalVehicles - withPhotosCount;
    const photoCoveragePct = totalVehicles > 0 ? Math.round((withPhotosCount / totalVehicles) * 100) : 0;

    const totalPurchaseValue = vehicles.reduce((sum, v) => sum + (v.purchasePrice || 0), 0);
    const totalSaleValue = vehicles.reduce((sum, v) => sum + (v.salePrice || v.price || 0), 0);
    const availableValuation = availableVehicles.reduce((sum, v) => sum + (v.salePrice || v.price || 0), 0);
    const potentialProfit = totalSaleValue - totalPurchaseValue;

    // Categories stats
    const categoriesMap = {};
    vehicles.forEach(v => {
      const cat = v.category || 'Autre';
      categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });

    // Fuel breakdown
    const fuelMap = {};
    vehicles.forEach(v => {
      const f = v.fuel || 'Essence';
      fuelMap[f] = (fuelMap[f] || 0) + 1;
    });

    // Aging analysis (days in stock)
    const now = new Date();
    const aging = {
      under30: 0,
      between30and60: 0,
      over60: 0
    };

    availableVehicles.forEach(v => {
      const entryDate = new Date(v.createdAt || v.entryDate || now);
      const days = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
      if (days <= 30) aging.under30++;
      else if (days <= 60) aging.between30and60++;
      else aging.over60++;
    });

    const filtered = vehicles.filter(v => {
      if (this.currentCategoryFilter !== 'all' && v.category !== this.currentCategoryFilter) return false;
      if (this.currentStatusFilter !== 'all' && v.status !== this.currentStatusFilter) return false;
      if (this.currentPhotoFilter === 'with' && (!v.images || v.images.length === 0)) return false;
      if (this.currentPhotoFilter === 'without' && (v.images && v.images.length > 0)) return false;
      return true;
    });

    content.innerHTML = `
      <div class="page-content animate-fade-in">
        <!-- Stock KPI cards -->
        <div class="stats-grid stagger-children">
          <div class="stat-card blue hover-lift">
            <div class="stat-card-icon"><i class="fas fa-warehouse"></i></div>
            <div class="stat-card-value">${totalVehicles}</div>
            <div class="stat-card-label">Total véhicules en parc</div>
          </div>
          <div class="stat-card green hover-lift">
            <div class="stat-card-icon"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(availableValuation)}</div>
            <div class="stat-card-label">Valeur du stock disponible</div>
          </div>
          <div class="stat-card purple hover-lift">
            <div class="stat-card-icon"><i class="fas fa-chart-pie"></i></div>
            <div class="stat-card-value">${Utils.formatCurrency(potentialProfit)}</div>
            <div class="stat-card-label">Marge brute estimée</div>
          </div>
          <div class="stat-card ${aging.over60 > 0 ? 'orange' : 'cyan'} hover-lift">
            <div class="stat-card-icon"><i class="fas fa-history"></i></div>
            <div class="stat-card-value">${aging.over60}</div>
            <div class="stat-card-label">Stock dormant (+60 jours)</div>
          </div>
        </div>

        <!-- Inventory overview cards: Categories & Aging -->
        <div class="grid-2-col" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:1.5rem;margin-bottom:1.5rem">
          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-layer-group" style="color:var(--primary-light)"></i> Répartition par catégorie</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.75rem;padding-top:0.5rem">
              ${Object.entries(categoriesMap).map(([cat, count]) => {
                const pct = Math.round((count / totalVehicles) * 100);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">
                      <span><strong>${cat}</strong></span>
                      <span>${count} véhicule${count > 1 ? 's' : ''} (${pct}%)</span>
                    </div>
                    <div class="progress-bar-container" style="height:8px;background:var(--border-color);border-radius:4px;overflow:hidden">
                      <div class="progress-fill" style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--accent-cyan));border-radius:4px"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="dashboard-card animate-fade-up">
            <div class="card-header">
              <h3><i class="fas fa-stopwatch" style="color:var(--accent-orange)"></i> Rotation du stock (disponibles)</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:1rem;padding-top:0.5rem">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--bg-glass);border-radius:var(--radius-md);border-left:4px solid var(--accent-green)">
                <div>
                  <div style="font-weight:600">Stock récent (0 - 30 jours)</div>
                  <small style="color:var(--text-muted)">Entrée récente en stock</small>
                </div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--accent-green)">${aging.under30}</div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--bg-glass);border-radius:var(--radius-md);border-left:4px solid var(--accent-orange)">
                <div>
                  <div style="font-weight:600">Stock moyen (30 - 60 jours)</div>
                  <small style="color:var(--text-muted)">Nécessite mise en avant</small>
                </div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--accent-orange)">${aging.between30and60}</div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--bg-glass);border-radius:var(--radius-md);border-left:4px solid var(--accent-red)">
                <div>
                  <div style="font-weight:600">Stock dormant (+60 jours)</div>
                  <small style="color:var(--text-muted)">Envisager promotion ou révision de prix</small>
                </div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--accent-red)">${aging.over60}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory List Toolbar -->
        <div class="table-toolbar">
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">
            <select class="form-input" style="width:auto;padding:0.5rem 1rem" onchange="Stock.setCategoryFilter(this.value)">
              <option value="all">Toutes catégories</option>
              ${Object.keys(categoriesMap).map(c => `<option value="${c}" ${this.currentCategoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <select class="form-input" style="width:auto;padding:0.5rem 1rem" onchange="Stock.setStatusFilter(this.value)">
              <option value="all">Tous statuts</option>
              <option value="available" ${this.currentStatusFilter === 'available' ? 'selected' : ''}>Disponible</option>
              <option value="rented" ${this.currentStatusFilter === 'rented' ? 'selected' : ''}>En location</option>
              <option value="sold" ${this.currentStatusFilter === 'sold' ? 'selected' : ''}>Vendu</option>
              <option value="reserved" ${this.currentStatusFilter === 'reserved' ? 'selected' : ''}>Réservé</option>
            </select>
            <select class="form-input" style="width:auto;padding:0.5rem 1rem" onchange="Stock.setPhotoFilter(this.value)">
              <option value="all">Toutes les photos (${totalVehicles})</option>
              <option value="with" ${this.currentPhotoFilter === 'with' ? 'selected' : ''}>📸 Avec photos (${withPhotosCount})</option>
              <option value="without" ${this.currentPhotoFilter === 'without' ? 'selected' : ''}>⚠️ Sans photo (${withoutPhotosCount})</option>
            </select>
          </div>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="Stock.exportCSV()">
              <i class="fas fa-file-csv"></i> Exporter inventaire
            </button>
            <button class="btn btn-primary btn-sm" onclick="Router.navigate('vehicles')">
              <i class="fas fa-plus"></i> Ajouter un véhicule
            </button>
          </div>
        </div>

        <!-- Vehicles Inventory Table -->
        <div class="table-container animate-fade-up">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:80px">Photo / 360°</th>
                <th>Véhicule</th>
                <th>Catégorie</th>
                <th>Immatriculation</th>
                <th>Carburant & Boîte</th>
                <th>Prix Achat</th>
                <th>Prix Vente</th>
                <th>Marge</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(v => {
                const badge = Utils.getStatusBadge(v.status);
                const salePrice = v.salePrice ?? v.price ?? 0;
                const margin = salePrice - (v.purchasePrice || 0);
                const marginPct = v.purchasePrice ? Math.round((margin / v.purchasePrice) * 100) : 0;
                const imgs = v.images || [];
                const hasPhoto = imgs.length > 0;

                return `
                  <tr>
                    <td style="padding:8px">
                      <div style="width:68px;height:48px;border-radius:8px;overflow:hidden;background:var(--bg-glass);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;border:1px solid ${hasPhoto ? 'rgba(0,206,201,0.3)' : 'rgba(255,255,255,0.08)'}" 
                        onclick="${hasPhoto ? `Vehicles.open360Viewer(${v.id})` : `Vehicles.showPhotoManager(${v.id})`}" 
                        title="${hasPhoto ? 'Ouvrir en 360° (' + imgs.length + ' photos)' : 'Cliquez pour ajouter des photos'}">
                        ${hasPhoto
                          ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover" alt="${Utils.escapeHTML(v.brand)}">
                             <div style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.7);color:#00cec9;font-size:0.6rem;padding:1px 5px;border-radius:6px;font-weight:700">
                               <i class="fas fa-rotate"></i> ${imgs.length}
                             </div>`
                          : '<div style="text-align:center;color:var(--text-muted);font-size:0.65rem"><i class="fas fa-camera" style="font-size:1.1rem;opacity:0.4;display:block;margin-bottom:2px"></i>+ Photo</div>'
                        }
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:700;color:var(--text-main)">${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)}</div>
                      <small style="color:var(--text-muted)">Année ${Utils.escapeHTML(v.year || '-')} · ${v.mileage ? Utils.formatNumber(v.mileage) + ' km' : '-'}</small>
                    </td>
                    <td><span class="badge badge-secondary">${Utils.escapeHTML(v.category || 'Berline')}</span></td>
                    <td><code style="background:var(--bg-glass);padding:2px 6px;border-radius:4px">${Utils.escapeHTML(v.licensePlate || 'Sans immat')}</code></td>
                    <td>${Utils.escapeHTML(v.fuel || 'Essence')} · ${Utils.escapeHTML(v.transmission || 'Manuelle')}</td>
                    <td style="color:var(--text-muted)">${Utils.formatCurrency(v.purchasePrice)}</td>
                    <td style="font-weight:700;color:var(--primary-light)">${Utils.formatCurrency(salePrice)}</td>
                    <td>
                      <span style="font-weight:600;color:${margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                        ${Utils.formatCurrency(margin)} (${marginPct}%)
                      </span>
                    </td>
                    <td><span class="badge ${badge.class}">${badge.label}</span></td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.showDetail(${v.id})" data-tooltip="Fiche complète">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.open360Viewer(${v.id})" data-tooltip="Viewer 360°" style="color:var(--accent-cyan)">
                          <i class="fas fa-rotate"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Vehicles.showPhotoManager(${v.id})" data-tooltip="Gérer les photos" style="color:var(--accent-yellow)">
                          <i class="fas fa-camera"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Router.navigate('maintenance');setTimeout(()=>Maintenance.openAddModal(${v.id}),300)" data-tooltip="Carnet d'entretien" style="color:var(--accent-orange)">
                          <i class="fas fa-wrench"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="Stock.quickPriceEdit(${v.id})" data-tooltip="Modifier le prix">
                          <i class="fas fa-tags"></i>
                        </button>
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

  setCategoryFilter(val) {
    this.currentCategoryFilter = val;
    this.render();
  },

  setStatusFilter(val) {
    this.currentStatusFilter = val;
    this.render();
  },

  setPhotoFilter(val) {
    this.currentPhotoFilter = val;
    this.render();
  },

  async quickPriceEdit(vehicleId) {
    const v = await DB.get('vehicles', vehicleId);
    if (!v) return;

    const formHtml = `
      <div style="padding:0.5rem 0">
        <p>Véhicule : <strong>${Utils.escapeHTML(v.brand)} ${Utils.escapeHTML(v.model)} (${Utils.escapeHTML(v.year || '')})</strong></p>
        <p>Prix d'achat initial : <strong>${Utils.formatCurrency(v.purchasePrice)}</strong></p>
        <div class="form-group" style="margin-top:1rem">
          <label>Nouveau prix de vente (TND) :</label>
          <input type="number" id="quick-sale-price" class="form-input" value="${v.salePrice || v.price || 0}" min="0">
        </div>
        <div class="form-group" style="margin-top:0.75rem">
          <label>Tarif location journalier (TND) :</label>
          <input type="number" id="quick-rent-price" class="form-input" value="${v.rentalPricePerDay || v.rentalPrice || 80}" min="0">
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Mise à jour tarifaire', formHtml, { confirmText: 'Enregistrer' });
    if (confirmed) {
      const newPrice = parseFloat(document.getElementById('quick-sale-price').value);
      const newRent = parseFloat(document.getElementById('quick-rent-price').value);

      if (isNaN(newPrice) || newPrice < 0 || isNaN(newRent) || newRent < 0) {
        Utils.notify('Les montants doivent être des valeurs positives ou nulles.', 'error');
        return;
      }

      v.price = newPrice;
      v.salePrice = newPrice;
      v.rentalPrice = newRent;
      v.rentalPricePerDay = newRent;
      await DB.update('vehicles', v);
      Utils.notify(`Tarifs mis à jour pour ${v.brand} ${v.model}`, 'success');
      this.render();
    }
  },

  async exportCSV() {
    const parkingId = Utils.getCurrentParkingId();
    const vehicles = await DB.getVehiclesByParking(parkingId);
    const data = vehicles.map(v => ({
      Marque: v.brand,
      Modele: v.model,
      Annee: v.year,
      Immatriculation: v.licensePlate,
      Categorie: v.category,
      Kilometrage: v.mileage,
      Carburant: v.fuel,
      Boite: v.transmission,
      PrixAchat: v.purchasePrice,
      PrixVente: v.price,
      TarifLocationJour: v.rentalPrice,
      Statut: v.status
    }));
    Utils.exportToCSV(data, 'inventaire_stock_mon_parking');
  }
};
