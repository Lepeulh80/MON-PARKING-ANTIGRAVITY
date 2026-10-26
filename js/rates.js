/* ========================================================================
   MON PARKING - Rates & Tariffs Configuration Module
   Hourly, daily cap, flat rates, lost ticket, and overstay surcharges
   ======================================================================== */

const Rates = {
  currentRates: null,

  async render() {
    const parkingId = Utils.getCurrentParkingId();
    const content = document.getElementById('main-content');
    this.currentRates = await DB.getRates(parkingId);
    const r = this.currentRates;
    const currSymbol = (typeof I18n !== 'undefined') ? I18n.getCurrencyMeta().symbol : (r.currency || 'F CFA');

    content.innerHTML = `
      <div class="page-content animate-fade-in" style="max-width:1080px;margin:0 auto">
        <!-- Page Title & Header Actions -->
        <div class="table-toolbar" style="margin-bottom:1.5rem">
          <div>
            <h2 style="font-size:1.5rem;font-weight:800;color:var(--text-main);margin:0">
              <i class="fas fa-tags" style="color:var(--accent-cyan);margin-right:8px"></i> Grille Tarifaire & Forfaits Spéciaux
            </h2>
            <p style="color:var(--text-muted);margin:4px 0 0">
              Barème horaire, franchise gratuite, plafond 24h, forfaits ticket perdu et surtaxes prolongées
            </p>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary hover-lift" onclick="Rates.saveRates()">
              <i class="fas fa-save"></i> Enregistrer les tarifs
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
          <!-- Left Column: Standard Hourly & Daily Tariffs -->
          <div style="display:flex;flex-direction:column;gap:1.5rem">
            <!-- Basic Tariffs Card -->
            <div class="dashboard-card animate-fade-up">
              <div class="card-header">
                <h3><i class="fas fa-clock" style="color:var(--primary-light)"></i> Tarification Horaire & Franchise</h3>
              </div>
              <div class="modal-form-grid" style="padding-top:0.5rem">
                <div class="form-group">
                  <label>Franchise Gratuite (Minutes)</label>
                  <input type="number" id="rate-grace-minutes" class="form-input" min="0" value="${r.freeGraceMinutes || 15}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Sortie gratuite si durée inférieure (ex: dépose-minute 15 min)</small>
                </div>
                <div class="form-group">
                  <label>Tarif 1ère Heure (${currSymbol})</label>
                  <input type="number" id="rate-first-hour" class="form-input" step="0.5" min="0" value="${r.rateFirstHour || 2.0}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Montant forfaitaire pour la première tranche</small>
                </div>
                <div class="form-group">
                  <label>Heures Suivantes (${currSymbol}/heure)</label>
                  <input type="number" id="rate-add-hour" class="form-input" step="0.5" min="0" value="${r.rateAdditionalHour || 1.5}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Prix unitaire de chaque heure supplémentaire entamée</small>
                </div>
                <div class="form-group">
                  <label>Plafond Journalier / 24h (${currSymbol})</label>
                  <input type="number" id="rate-daily-cap" class="form-input" step="1" min="0" value="${r.dailyCap || 15.0}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Montant maximum facturé par tranche de 24 heures</small>
                </div>
              </div>
            </div>

            <!-- Flat Rates (Night & Weekend) -->
            <div class="dashboard-card animate-fade-up">
              <div class="card-header">
                <h3><i class="fas fa-moon" style="color:var(--accent-purple)"></i> Forfaits Nuit & Week-End</h3>
              </div>
              <div class="modal-form-grid" style="padding-top:0.5rem">
                <div class="form-group">
                  <label>Forfait Nuit 20h - 08h (${currSymbol})</label>
                  <input type="number" id="rate-night-flat" class="form-input" step="1" min="0" value="${r.nightFlatRate || 8.0}">
                  <small style="color:var(--text-muted)">Forfait fixe pour stationnement nocturne</small>
                </div>
                <div class="form-group">
                  <label>Forfait Week-end 48h (${currSymbol})</label>
                  <input type="number" id="rate-weekend-flat" class="form-input" step="1" min="0" value="${r.weekendFlatRate || 25.0}">
                  <small style="color:var(--text-muted)">Du Vendredi 18h au Lundi 08h</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Special Situations & Simulator -->
          <div style="display:flex;flex-direction:column;gap:1.5rem">
            <!-- Special Penalties & Surcharges Card -->
            <div class="dashboard-card animate-fade-up">
              <div class="card-header">
                <h3><i class="fas fa-exclamation-triangle" style="color:var(--accent-red)"></i> Tickets Perdus & Stationnement Prolongé</h3>
              </div>
              <div class="modal-form-grid" style="padding-top:0.5rem">
                <div class="form-group">
                  <label>Forfait "Ticket Perdu" (${currSymbol}) *</label>
                  <input type="number" id="rate-lost-ticket" class="form-input" step="1" min="0" value="${r.lostTicketFee || 30.0}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Montant appliqué lors de la perte physique du ticket</small>
                </div>
                <div class="form-group">
                  <label>Délai de Grâce de Sortie (Minutes)</label>
                  <input type="number" id="rate-exit-grace" class="form-input" min="0" value="${r.exitGraceMinutes || 15}">
                  <small style="color:var(--text-muted)">Temps alloué après paiement pour franchir la barrière</small>
                </div>
                <div class="form-group">
                  <label>Seuil Stationnement Prolongé (Heures)</label>
                  <input type="number" id="rate-overstay-threshold" class="form-input" min="1" value="${r.overstayThresholdHours || 24}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Déclenchement du statut "Véhicule Prolongé / Ventouse"</small>
                </div>
                <div class="form-group">
                  <label>Surtaxe Prolongé (${currSymbol}/jour sup)</label>
                  <input type="number" id="rate-overstay-surcharge" class="form-input" step="1" min="0" value="${r.overstayDailySurcharge || 10.0}" oninput="Rates.runSimulator()">
                  <small style="color:var(--text-muted)">Majorée sur chaque jour au-delà du seuil</small>
                </div>
              </div>
            </div>

            <!-- Live Tariff Calculation Simulator -->
            <div class="dashboard-card animate-fade-up" style="background:linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.15));border:1px solid var(--accent-cyan)">
              <div class="card-header">
                <h3><i class="fas fa-calculator" style="color:var(--accent-cyan)"></i> Simulateur de Calcul en Direct</h3>
              </div>
              <div style="display:flex;flex-direction:column;gap:1rem;padding-top:0.5rem">
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(10)">10 min (Franchise)</button>
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(45)">45 min</button>
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(150)">2h30</button>
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(480)">8h (Journée)</button>
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(1680)">28h (Prolongé)</button>
                  <button class="btn btn-ghost btn-sm" onclick="Rates.setSimMinutes(4320)">3 jours</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                  <div class="form-group">
                    <label>Durée simulée (Minutes)</label>
                    <input type="number" id="sim-duration-minutes" class="form-input" value="150" oninput="Rates.runSimulator()">
                  </div>
                  <div class="form-group" style="display:flex;align-items:center;padding-top:1.8rem">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none">
                      <input type="checkbox" id="sim-lost-ticket" onchange="Rates.runSimulator()">
                      <span style="font-weight:600;color:var(--accent-red)">Situation Ticket Perdu</span>
                    </label>
                  </div>
                </div>

                <!-- Simulation Output Box -->
                <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:10px;padding:1rem;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;font-weight:700">Détail du calcul appliqué :</div>
                    <div id="sim-breakdown" style="font-size:0.9rem;color:var(--text-main);font-weight:600;margin-top:2px">
                      Calcul en cours...
                    </div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:0.8rem;color:var(--text-muted)">Montant calculé :</div>
                    <div id="sim-result-amount" style="font-size:2rem;font-weight:900;color:var(--accent-green)">
                      0.00 DT
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.runSimulator();
  },

  setSimMinutes(mins) {
    const input = document.getElementById('sim-duration-minutes');
    if (input) {
      input.value = mins;
      this.runSimulator();
    }
  },

  getFormRates() {
    const parkingId = Utils.getCurrentParkingId();
    return {
      id: this.currentRates?.id,
      parkingId,
      currency: (typeof I18n !== 'undefined' ? I18n.getCurrency() : 'XOF'),
      freeGraceMinutes: Math.max(0, parseInt(document.getElementById('rate-grace-minutes')?.value) || 0),
      rateFirstHour: Math.max(0, parseFloat(document.getElementById('rate-first-hour')?.value) || 0),
      rateAdditionalHour: Math.max(0, parseFloat(document.getElementById('rate-add-hour')?.value) || 0),
      dailyCap: Math.max(0, parseFloat(document.getElementById('rate-daily-cap')?.value) || 0),
      nightFlatRate: Math.max(0, parseFloat(document.getElementById('rate-night-flat')?.value) || 0),
      weekendFlatRate: Math.max(0, parseFloat(document.getElementById('rate-weekend-flat')?.value) || 0),
      lostTicketFee: Math.max(0, parseFloat(document.getElementById('rate-lost-ticket')?.value) || 0),
      exitGraceMinutes: Math.max(0, parseInt(document.getElementById('rate-exit-grace')?.value) || 0),
      overstayThresholdHours: Math.max(1, parseInt(document.getElementById('rate-overstay-threshold')?.value) || 24),
      overstayDailySurcharge: Math.max(0, parseFloat(document.getElementById('rate-overstay-surcharge')?.value) || 0),
      updatedAt: new Date().toISOString()
    };
  },

  runSimulator() {
    const rates = this.getFormRates();
    const mins = parseInt(document.getElementById('sim-duration-minutes')?.value) || 0;
    const isLost = document.getElementById('sim-lost-ticket')?.checked || false;

    const now = new Date();
    const entry = new Date(now.getTime() - mins * 60 * 1000);

    const res = DB.calculateParkingFee(entry.toISOString(), now.toISOString(), rates, { isLostTicket: isLost });

    const amountEl = document.getElementById('sim-result-amount');
    const breakdownEl = document.getElementById('sim-breakdown');

    if (amountEl) amountEl.textContent = Utils.formatCurrency(res.totalAmount);
    if (breakdownEl) breakdownEl.textContent = res.breakdown;
  },

  async saveRates() {
    const rates = this.getFormRates();
    await DB.saveRates(rates);
    this.currentRates = rates;
    Sync.broadcast('RATES_UPDATED', { rates });
    Utils.notify('Grille tarifaire enregistrée et diffusée avec succès !', 'success');
  }
};

window.Rates = Rates;
