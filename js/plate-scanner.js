/* ========================================================================
   MON PARKING - Plate Scanner & License Plate Recognition (LPR / ANPR)
   Camera streaming, OCR extraction, plate pattern parsing,
   and automatic exit ticket re-opening with zero retyping.
   ======================================================================== */

const PlateScanner = {
  stream: null,
  videoEl: null,
  canvasEl: null,
  isScanning: false,
  scanIntervalId: null,
  ocrWorker: null,
  currentFacingMode: 'environment',

  // Initialize OCR worker in background
  async initOCR() {
    if (typeof Tesseract !== 'undefined' && !this.ocrWorker) {
      try {
        console.log('🤖 Initializing Tesseract OCR for License Plate Recognition...');
        // Pre-warm Tesseract if available
      } catch (e) {
        console.warn('Tesseract init deferred:', e);
      }
    }
  },

  // Open Fullscreen or Modal Camera Scanner
  async openScannerModal(onDetectedCallback = null) {
    const modalHtml = `
      <div class="scanner-modal-wrapper" style="position:relative;background:#000;border-radius:var(--radius-lg);overflow:hidden;min-height:480px;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <!-- Live Video Element -->
        <video id="plate-scanner-video" autoplay playsinline muted style="width:100%;height:100%;max-height:420px;object-fit:cover"></video>
        
        <!-- Hidden Canvas for frame processing -->
        <canvas id="plate-scanner-canvas" style="display:none"></canvas>

        <!-- Viewfinder Overlay with Scanning Frame -->
        <div class="scanner-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <!-- Darkened border vignette -->
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45)"></div>
          
          <!-- Cutout Bounding Box for Plate -->
          <div class="scanner-target-frame" style="position:relative;width:82%;max-width:380px;height:120px;border-radius:12px;box-shadow:0 0 0 9999px rgba(0, 0, 0, 0.4);border:2px dashed var(--accent-cyan);z-index:2;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <!-- Animated Laser Scan Line -->
            <div class="scanner-laser" style="position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg, transparent, #00cec9, #6c5ce7, transparent);box-shadow:0 0 12px #00cec9;animation:scannerBeam 2s infinite ease-in-out"></div>
            
            <!-- Target Corners -->
            <div style="position:absolute;top:6px;left:6px;width:18px;height:18px;border-top:3px solid #00cec9;border-left:3px solid #00cec9;border-radius:4px 0 0 0"></div>
            <div style="position:absolute;top:6px;right:6px;width:18px;height:18px;border-top:3px solid #00cec9;border-right:3px solid #00cec9;border-radius:0 4px 0 0"></div>
            <div style="position:absolute;bottom:6px;left:6px;width:18px;height:18px;border-bottom:3px solid #00cec9;border-left:3px solid #00cec9;border-radius:0 0 0 4px"></div>
            <div style="position:absolute;bottom:6px;right:6px;width:18px;height:18px;border-bottom:3px solid #00cec9;border-right:3px solid #00cec9;border-radius:0 0 4px 0"></div>

            <div style="font-size:0.8rem;color:rgba(255,255,255,0.7);text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.8)">
              Placez la plaque ici
            </div>
          </div>

          <div style="position:absolute;top:20px;text-align:center;color:#fff;z-index:3">
            <span class="badge badge-primary" style="font-size:0.85rem;padding:6px 14px;box-shadow:0 4px 12px rgba(0,0,0,0.5)">
              <i class="fas fa-camera fa-spin" style="margin-right:6px"></i> SCANNER DE PLAQUE ACTIF
            </span>
          </div>

          <div id="scanner-status-text" style="position:absolute;bottom:75px;font-size:0.85rem;color:#00cec9;font-weight:600;z-index:3;text-shadow:0 2px 4px #000;background:rgba(10,14,26,0.8);padding:4px 14px;border-radius:20px">
            Analyse vidéo en direct...
          </div>
        </div>

        <!-- Scanner Controls Toolbar -->
        <div style="position:absolute;bottom:14px;display:flex;align-items:center;gap:8px;z-index:10;background:rgba(10,14,26,0.9);backdrop-filter:blur(10px);padding:6px 14px;border-radius:30px;border:1px solid rgba(255,255,255,0.15);flex-wrap:wrap;justify-content:center">
          <!-- Switch Camera Button -->
          <button class="btn btn-ghost btn-sm btn-icon" onclick="PlateScanner.switchCamera()" title="Basculer caméra">
            <i class="fas fa-sync-alt"></i>
          </button>

          <!-- Capture / Force Scan Button -->
          <button class="btn btn-primary btn-sm" onclick="PlateScanner.captureAndScanFrame()" style="padding:6px 14px">
            <i class="fas fa-crosshairs"></i> Capturer
          </button>

          <!-- Demo Simulation Button for Instant Testing -->
          <button class="btn btn-ghost btn-sm" onclick="PlateScanner.simulateDemoScan()" style="color:var(--accent-cyan);border:1px solid rgba(0,206,201,0.3)" title="Tester la reconnaissance avec un véhicule en stationnement">
            <i class="fas fa-magic"></i> Démo LPR
          </button>

          <!-- AI Learning & Geo Stats Modal -->
          <button class="btn btn-ghost btn-sm" onclick="PlateScanner.showLearningStatsModal()" style="color:var(--accent-yellow);border:1px solid rgba(253,203,110,0.3)" title="Voir l'apprentissage des confusions et statistiques géographiques">
            <i class="fas fa-brain"></i> IA & Stats
          </button>

          <!-- File Upload Option -->
          <label class="btn btn-ghost btn-sm btn-icon" style="cursor:pointer;margin:0" title="Importer une image de plaque">
            <i class="fas fa-image"></i>
            <input type="file" id="scanner-file-input" accept="image/*" style="display:none" onchange="PlateScanner.handleImageUpload(event)">
          </label>

          <!-- Manual Plate input fallback -->
          <button class="btn btn-ghost btn-sm" onclick="PlateScanner.promptManualPlate()" title="Saisie manuelle">
            <i class="fas fa-keyboard"></i> Clavier
          </button>
        </div>
      </div>
      
      <style>
        @keyframes scannerBeam {
          0% { top: 0%; opacity: 0.2; }
          50% { top: 95%; opacity: 1; }
          100% { top: 0%; opacity: 0.2; }
        }
      </style>
    `;

    Utils.showModal('Scanner de Plaque d\'Immatriculation', modalHtml, {
      size: 'modal-lg',
      hideFooter: true
    }).then(() => {
      this.stopCamera();
    });

    // Start Camera Stream after modal renders
    setTimeout(() => {
      this.startCamera(onDetectedCallback);
    }, 150);
  },

  async startCamera(onDetectedCallback = null) {
    this.videoEl = document.getElementById('plate-scanner-video');
    this.canvasEl = document.getElementById('plate-scanner-canvas');
    if (!this.videoEl) return;

    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isScanning = true;

      // Start periodic OCR scanning every 1.8 seconds
      this.scanIntervalId = setInterval(() => {
        if (this.isScanning) {
          this.captureAndScanFrame(onDetectedCallback);
        }
      }, 1800);

    } catch (err) {
      console.warn('Camera access error:', err);
      const statusText = document.getElementById('scanner-status-text');
      if (statusText) {
        statusText.innerHTML = '<span style="color:#ff7675"><i class="fas fa-exclamation-triangle"></i> Caméra indisponible. Utilisez l\'importation d\'image ou le clavier.</span>';
      }
      Utils.notify('Accès à la caméra refusé ou non supporté. Vous pouvez importer une photo.', 'warning');
    }
  },

  switchCamera() {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  },

  stopCamera() {
    this.isScanning = false;
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  // Capture current frame from video and process image
  async captureAndScanFrame(onDetectedCallback = null) {
    if (!this.videoEl || !this.videoEl.videoWidth) return;

    const canvas = this.canvasEl || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = this.videoEl.videoWidth;
    canvas.height = this.videoEl.videoHeight;

    // Draw full frame
    ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);

    // Crop center target area where plate is expected (width: 60%, height: 30%)
    const cropX = canvas.width * 0.15;
    const cropY = canvas.height * 0.35;
    const cropW = canvas.width * 0.70;
    const cropH = canvas.height * 0.30;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Apply high-contrast binarization filter for better OCR accuracy
    this.preprocessImageForOCR(cropCtx, cropW, cropH);

    const statusEl = document.getElementById('scanner-status-text');
    if (statusEl) statusEl.textContent = 'Lecture des caractères...';

    const recognizedPlate = await this.performOCR(cropCanvas);

    if (recognizedPlate) {
      this.onPlateRecognized(recognizedPlate, onDetectedCallback);
    } else {
      if (statusEl) statusEl.textContent = 'Recherche de plaque...';
    }
  },

  // Image preprocessor: grayscale + contrast thresholding
  preprocessImageForOCR(ctx, width, height) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Luminance formula
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // High contrast threshold
        const v = gray > 125 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      // Ignore security errors with tainted canvas
    }
  },

  // OCR Recognition with Tesseract or internal pattern parser
  async performOCR(canvas) {
    try {
      if (typeof Tesseract !== 'undefined') {
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ',
          tessedit_pageseg_mode: '7' // Single text line
        });
        const clean = this.parseLicensePlate(text);
        if (clean) return clean;
      }
    } catch (err) {
      console.warn('Tesseract recognition issue:', err);
    }

    // Secondary match: simulate/detect from database known plates for realistic demo recognition
    const parkingId = Utils.getCurrentParkingId();
    const tickets = await DB.getTicketsByParking(parkingId);
    const vehicles = await DB.getVehiclesByParking(parkingId);
    const allKnown = [
      ...tickets.filter(t => t.status === 'parked').map(t => t.licensePlate),
      ...vehicles.map(v => v.licensePlate)
    ].filter(Boolean);

    // If scanning in demo mode, randomly pick one active ticket plate to demonstrate instant recognition!
    return null;
  },

  // Parse raw text string into formatted clean license plate
  parseLicensePlate(rawText) {
    if (!rawText) return null;
    let str = rawText.toUpperCase().trim().replace(/[\n\r]/g, ' ');

    // 1. Tunisian Plate regex: 240 TN 1892 or 240TUNIS1892 or 240TU1892
    const tnMatch = str.match(/(\d{2,3})\s*(?:TN|TUNIS|TU)?\s*(\d{2,5})/);
    if (tnMatch) {
      return `${tnMatch[1]} TN ${tnMatch[2]}`;
    }

    // 2. French / European format: AA-123-AA or AA 123 AA
    const frMatch = str.match(/([A-Z]{2})[- ]?(\d{3})[- ]?([A-Z]{2})/);
    if (frMatch) {
      return `${frMatch[1]}-${frMatch[2]}-${frMatch[3]}`;
    }

    // 3. Generic alphanumeric plate (e.g. 1234-AB-56 or ABC-1234)
    const genMatch = str.match(/([A-Z0-9]{2,4}[- ]?[A-Z0-9]{2,5})/);
    if (genMatch && genMatch[0].length >= 5) {
      return genMatch[0].trim();
    }

    return null;
  },

  // Upload an image file for scanning
  async handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const statusEl = document.getElementById('scanner-status-text');
      if (statusEl) statusEl.textContent = 'Analyse de la photo...';

      const plate = await this.performOCR(canvas);
      if (plate) {
        this.onPlateRecognized(plate);
      } else {
        // Fallback: prompt user with detected or manual
        Utils.notify('Plaque non identifiée sur l\'image. Veuillez saisir le numéro.', 'info');
        this.promptManualPlate();
      }
    } catch (err) {
      console.warn('Error loading image for OCR:', err);
      Utils.notify('Impossible de lire l\'image sélectionnée.', 'error');
    } finally {
      URL.revokeObjectURL(objectUrl);
      if (e.target) e.target.value = '';
    }
  },

  // Manual plate entry prompt
  async promptManualPlate() {
    const formHtml = `
      <div style="padding:1rem 0">
        <label style="display:block;margin-bottom:8px;font-weight:600">Numéro de plaque d'immatriculation :</label>
        <input type="text" id="manual-plate-input" class="form-input" placeholder="Ex: 240 TN 1892 ou AA-123-AA" style="text-transform:uppercase;font-size:1.2rem;letter-spacing:1px;font-weight:700">
        <small style="color:var(--text-muted);display:block;margin-top:6px">Format Tunisie (ex: 240 TN 1892) ou Europe (ex: AA-123-AA)</small>
      </div>
    `;

    const confirmed = await Utils.showModal('Saisie manuelle de la plaque', formHtml, { confirmText: 'Rechercher' });
    if (confirmed) {
      const val = document.getElementById('manual-plate-input')?.value.trim();
      if (val) {
        this.openValidationAndCorrectionModal(val);
      }
    }
  },

  // Interactive Validation & Manual Correction Interface with Operator Confusion Learning
  async openValidationAndCorrectionModal(rawText, callback = null) {
    const suggestions = typeof PlateLearning !== 'undefined' ? PlateLearning.generateSuggestions(rawText) : [];
    const directCandidate = suggestions[0]?.plate || rawText;

    const modalHtml = `
      <div style="display:flex;flex-direction:column;gap:1.25rem;padding:0.5rem 0">
        <div style="background:linear-gradient(135deg, rgba(0,206,201,0.15), rgba(108,92,231,0.15));border:1px solid var(--accent-cyan);padding:1rem;border-radius:var(--radius-md);display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--accent-cyan);color:#0a0e1a;display:flex;align-items:center;justify-content:center;font-size:1.3rem">
            <i class="fas fa-camera"></i>
          </div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;font-weight:700;color:var(--accent-cyan)">LECTURE OCR EFFECTUÉE</div>
            <div style="font-family:monospace;font-size:1.1rem;font-weight:700;color:#fff">${rawText}</div>
          </div>
        </div>

        <!-- AI Suggested Interpretations (based on learned confusions) -->
        <div>
          <label style="font-size:0.85rem;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <i class="fas fa-brain" style="color:var(--accent-yellow)"></i>
            Plaques Suggérées par l'IA (Confusions Apprises) :
          </label>
          <div style="display:flex;flex-wrap:wrap;gap:8px" id="plate-suggestions-container">
            ${suggestions.map((s, idx) => `
              <button type="button" class="btn btn-ghost btn-sm" onclick="PlateScanner.selectSuggestion('${s.plate}')" style="border:1px solid var(--border-color);background:rgba(255,255,255,0.05);display:flex;align-items:center;gap:6px;padding:6px 12px">
                <span style="font-family:'Outfit', monospace;font-weight:800;color:var(--accent-cyan);font-size:1rem">${s.plate}</span>
                <span class="badge ${s.badgeClass}" style="font-size:0.7rem">${s.confidence}% · ${s.source}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Editable Input for Manual Validation / Correction -->
        <div>
          <label style="font-size:0.85rem;font-weight:700;color:var(--text-main);margin-bottom:6px;display:block">
            Plaque Retenue par l'Opérateur (modifiable) :
          </label>
          <input type="text" id="operator-corrected-plate" class="form-input" value="${directCandidate}" style="text-transform:uppercase;font-size:1.4rem;font-weight:900;letter-spacing:2px;font-family:'Outfit', monospace;text-align:center;color:var(--accent-green);background:rgba(0,0,0,0.4)">
        </div>

        <div style="background:var(--bg-glass);padding:0.75rem 1rem;border-radius:8px;border:1px solid var(--border-color);display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="learn-operator-choice-chk" checked style="width:18px;height:18px;accent-color:var(--accent-cyan);cursor:pointer">
          <label for="learn-operator-choice-chk" style="font-size:0.82rem;color:var(--text-secondary);cursor:pointer">
            Mémoriser ce choix pour perfectionner l'apprentissage local des confusions de ce parking (O/0, B/8, etc.)
          </label>
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal('Validation & Correction de la Plaque', modalHtml, {
      confirmText: 'Valider cette Plaque & Poursuivre',
      cancelText: 'Annuler',
      size: 'modal-md'
    });

    if (confirmed) {
      const finalPlate = document.getElementById('operator-corrected-plate')?.value.trim();
      const shouldLearn = document.getElementById('learn-operator-choice-chk')?.checked;

      if (finalPlate) {
        if (shouldLearn && typeof PlateLearning !== 'undefined') {
          PlateLearning.recordOperatorChoice(rawText, finalPlate, Auth.user?.firstName || 'Opérateur');
        }
        this.onPlateRecognized(finalPlate, callback);
      }
    }
  },

  selectSuggestion(plate) {
    const input = document.getElementById('operator-corrected-plate');
    if (input) {
      input.value = plate;
      input.classList.add('animate-pulse');
      setTimeout(() => input.classList.remove('animate-pulse'), 400);
    }
  },

  // Instant Demo Simulation: Pick an active ticket or sample plate and test recognition flow
  async simulateDemoScan() {
    const parkingId = Utils.getCurrentParkingId();
    const tickets = await DB.getTicketsByParking(parkingId);
    const parked = tickets.filter(t => t.status === 'parked');

    let demoPlate = '240 TN 1892';
    if (parked.length > 0) {
      demoPlate = parked[Math.floor(Math.random() * parked.length)].licensePlate;
    }

    // Stop current camera if active
    this.stopCamera();
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();

    Utils.notify(`Scan LPR simulé pour le véhicule test : ${demoPlate}`, 'info', 2500);

    // Simulate OCR raw text with realistic ambiguity
    const rawWithAmbiguity = demoPlate.replace('N', 'M').replace('0', 'O');
    this.openValidationAndCorrectionModal(rawWithAmbiguity);
  },

  // Show Learning & Geographic Zone Statistics Modal
  showLearningStatsModal() {
    const stats = typeof PlateLearning !== 'undefined' ? PlateLearning.getGeoStats() : {};
    const confusions = typeof PlateLearning !== 'undefined' ? PlateLearning.getConfusions() : {};

    const html = `
      <div style="display:flex;flex-direction:column;gap:1.5rem;padding:0.5rem 0">
        <!-- Geo Zone Cards -->
        <div>
          <h4 style="margin:0 0 10px;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
            <i class="fas fa-globe-africa" style="color:var(--accent-cyan)"></i>
            Taux de Réussite LPR par Zone Géographique
          </h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:1rem">
            ${Object.values(stats).map(z => {
              const successRate = z.total > 0 ? ((z.directSuccess / z.total) * 100).toFixed(1) : '100.0';
              return `
                <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:1rem">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <span style="font-size:1.6rem">${z.flag}</span>
                    <div>
                      <div style="font-weight:700;font-size:0.9rem;color:var(--text-main)">${z.name}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${z.total} lectures analysées</div>
                    </div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px">
                    <span style="font-size:1.4rem;font-weight:900;color:var(--accent-green)">${successRate}%</span>
                    <span style="font-size:0.78rem;color:var(--text-secondary)">${z.directSuccess} directes · ${z.corrected} corrigées</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Learned Confusion Matrix -->
        <div>
          <h4 style="margin:0 0 10px;font-size:1rem;color:var(--text-main);display:flex;align-items:center;gap:8px">
            <i class="fas fa-project-diagram" style="color:var(--accent-yellow)"></i>
            Matrice des Confusions Apprises Localement (Parc Local)
          </h4>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 10px">
            Ces pondérations s'adaptent dynamiquement à chaque choix ou correction de vos opérateurs pour corriger les erreurs de lecture propres à vos caméras et plaques.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${Object.entries(confusions).flatMap(([src, targets]) => 
              Object.entries(targets).map(([dst, count]) => `
                <div style="background:rgba(255,255,255,0.06);border:1px solid var(--border-color);padding:6px 12px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;font-size:0.85rem">
                  <span style="font-weight:700;color:var(--accent-cyan);font-family:monospace">${src}</span>
                  <i class="fas fa-arrow-right" style="font-size:0.65rem;color:var(--text-muted)"></i>
                  <span style="font-weight:700;color:var(--accent-green);font-family:monospace">${dst}</span>
                  <span class="badge badge-info" style="font-size:0.7rem;padding:2px 6px">${count}x</span>
                </div>
              `)
            ).slice(0, 16).join('')}
          </div>
        </div>
      </div>
    `;

    Utils.showModal('Statistiques LPR & Apprentissage des Confusions', html, {
      confirmText: 'Fermer',
      hideCancel: true,
      size: 'modal-lg'
    });
  },

  // Main Event: Plate is successfully detected!
  async onPlateRecognized(licensePlate, callback = null) {
    // Sound & Haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    this.playBeepSound();

    this.stopCamera();

    // Close scanner modal if open
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();

    if (callback) {
      callback(licensePlate);
      return;
    }

    const parkingId = Utils.getCurrentParkingId();

    // Check for anomalies via PlateLearning
    if (typeof PlateLearning !== 'undefined' && PlateLearning.detectAnomalies) {
      const anomalies = await PlateLearning.detectAnomalies(parkingId, licensePlate);
      if (anomalies && anomalies.length > 0) {
        anomalies.forEach(ano => {
          Utils.notify(`${ano.title} : ${ano.message}`, ano.severity === 'danger' ? 'error' : 'warning', 6000);
          if (typeof A11y !== 'undefined' && A11y.speak) {
            A11y.speak(`Alerte anomalie détectée : ${ano.title}`);
          }
        });
      }
    }

    // 0. Security check: Blacklist or Whitelist
    const secItem = await DB.checkPlateSecurity(parkingId, licensePlate);
    if (secItem && secItem.type === 'blacklist_alert') {
      this.playAlarmSound();
      Utils.showModal('🚨 ALERTE SÉCURITÉ : VÉHICULE SIGNALÉ', `
        <div style="text-align:center;padding:1rem 0">
          <div style="font-size:3rem;color:var(--accent-red);margin-bottom:8px" class="animate-bounce">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div style="font-family:'Outfit', monospace;font-size:2rem;font-weight:900;color:#fff;background:#d63031;padding:6px 14px;border-radius:8px;display:inline-block;letter-spacing:2px">
            ${licensePlate}
          </div>
          <h3 style="color:var(--accent-red);margin:12px 0 4px">VÉHICULE EN LISTE NOIRE</h3>
          <p style="color:var(--text-main);font-weight:600;margin:0 0 12px">${secItem.reason}</p>
          <div style="background:rgba(214,48,49,0.15);border:1px solid var(--accent-red);padding:10px;border-radius:8px;font-size:0.85rem;color:#ff7675">
            <strong>CONSIGNE DE SÉCURITÉ :</strong> Barrière bloquée. Refuser l'accès et avertir immédiatement le chef de poste ou les services de sécurité.
          </div>
        </div>
      `, { hideCancel: true, confirmText: 'Compris / Alerte acquittée' });

      await DB.logActivity(parkingId, Auth.user.id, 'ALERTE BLACKLIST', `Plaque signalée détectée à la barrière : ${licensePlate} (${secItem.reason})`);
      return;
    }

    // 1. Subscription Check (Pass Abonné actif)
    const activeSub = await DB.getActiveSubscriptionByPlate(parkingId, licensePlate);
    if (activeSub) {
      Utils.notify(`✅ Validation réussie : Abonné VIP ${activeSub.subscriberName} (${licensePlate}) — Accès Autorisé !`, 'success', 5000);
      if (typeof A11y !== 'undefined' && A11y.speak) {
        A11y.speak(`Validation réussie. Bienvenue à l'abonné ${activeSub.subscriberName}. Barrière ouverte.`);
      }
      await DB.logActivity(parkingId, Auth.user.id, 'Passage Abonné', `Accès abonné accordé à ${activeSub.subscriberName} (${licensePlate})`);
      
      const confirmPass = await Utils.showModal('Accès Abonné Autorisé', `
        <div style="text-align:center;padding:1rem 0">
          <div style="font-size:2.8rem;color:var(--accent-green);margin-bottom:8px"><i class="fas fa-crown"></i></div>
          <div style="font-family:'Outfit', monospace;font-size:1.8rem;font-weight:900;color:var(--accent-cyan)">${licensePlate}</div>
          <h3 style="margin:8px 0 2px;color:var(--text-main)">${activeSub.subscriberName}</h3>
          <div style="font-size:0.85rem;color:var(--text-muted)">Pass ${activeSub.type} · Valide jusqu'au ${Utils.formatDate(activeSub.endDate)}</div>
          <div style="margin-top:14px;font-weight:700;color:var(--accent-green);font-size:1.1rem">Accès libre gratuit · Barrière ouverte</div>
        </div>
      `, { confirmText: 'Ouvrir la barrière', hideCancel: true });
      return;
    }

    // 2. Search for an ACTIVE parked ticket for this plate
    const activeTicket = await DB.getActiveTicketByPlate(parkingId, licensePlate);
    // 3. Search for vehicle in fleet inventory
    const registeredVehicle = await DB.getVehicleByPlate(parkingId, licensePlate);

    if (activeTicket) {
      // Case A: Vehicle currently parked -> Instantly open Exit Ticket modal!
      Utils.notify(`✅ Confirmation automatique : Validation réussie du stationnement pour le véhicule ${licensePlate}`, 'success', 4500);
      if (typeof A11y !== 'undefined' && A11y.speak) {
        A11y.speak(`Validation réussie du stationnement pour le véhicule ${licensePlate}. Ouverture du ticket de sortie sans ressaisie.`);
      }
      this.openExitTicketModal(activeTicket);
    } else if (registeredVehicle) {
      // Case B: Vehicle exists in dealership/fleet inventory
      this.handleInventoryVehicleDetected(registeredVehicle);
    } else {
      // Case C: New vehicle arriving at parking entrance
      this.openNewEntryTicketModal(licensePlate);
    }
  },

  playAlarmSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
  },

  // Sound chime synthesizer via Web Audio API (No external sound file required)
  playBeepSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pleasant A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  },

  // AUTOMATIC EXIT TICKET MODAL (ZERO RESSAISIE)
  async openExitTicketModal(ticket) {
    const parkingId = Utils.getCurrentParkingId();
    const rates = await DB.getRates(parkingId);
    const entryTime = new Date(ticket.entryTime);
    const now = new Date();
    const diffMs = Math.max(0, now - entryTime);
    const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const durationLabel = `${hours > 0 ? hours + 'h ' : ''}${mins}min`;

    // Dynamic professional fee calculation
    const feeResult = DB.calculateParkingFee(ticket.entryTime, now.toISOString(), rates, { isLostTicket: !!ticket.isLostTicket });
    const totalAmount = feeResult.totalAmount;

    const modalHtml = `
      <div class="exit-ticket-modal animate-scale-in" style="display:flex;flex-direction:column;gap:1.25rem">
        <!-- Success Recognition Header -->
        <div style="background:linear-gradient(135deg, rgba(0, 206, 201, 0.15), rgba(108, 92, 231, 0.15));border:1px solid var(--accent-cyan);padding:1rem 1.25rem;border-radius:var(--radius-md);display:flex;align-items:center;gap:1rem">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">
            <i class="fas fa-check-circle"></i>
          </div>
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;color:var(--accent-cyan);font-weight:700;letter-spacing:1px">TICKET DE SORTIE AUTOMATIQUE</div>
            <h3 style="margin:2px 0 0;font-size:1.2rem;color:var(--text-main)">Véhicule en stationnement reconnu</h3>
            <div style="font-size:0.85rem;color:var(--text-muted)">Aucune ressaisie nécessaire. Vérifiez et encaissez la sortie.</div>
          </div>
        </div>

        ${feeResult.isOverstay ? `
          <div style="background:rgba(235,77,75,0.15);border:1px solid var(--accent-red);padding:0.75rem 1rem;border-radius:8px;display:flex;align-items:center;gap:10px">
            <i class="fas fa-exclamation-triangle" style="color:var(--accent-red);font-size:1.3rem"></i>
            <div>
              <strong style="color:var(--accent-red)">STATIONNEMENT PROLONGÉ DÉTECTÉ (> ${rates.overstayThresholdHours || 24}h)</strong>
              <div style="font-size:0.85rem;color:#ff7675">Ce véhicule est stationné depuis ${feeResult.days} jour(s). Surtaxe journalière appliquée.</div>
            </div>
          </div>
        ` : ''}

        <!-- License Plate Banner -->
        <div style="text-align:center;padding:1rem;background:#1e272e;border:3px solid #f5f6fa;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.4)">
          <div style="font-size:0.75rem;color:#8b8fa3;letter-spacing:1px;margin-bottom:2px">PLAQUE D'IMMATRICULATION</div>
          <div style="font-family:'Outfit', monospace;font-size:2.2rem;font-weight:900;letter-spacing:4px;color:#fff">
            ${ticket.licensePlate}
          </div>
        </div>

        <!-- Ticket Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);font-size:0.9rem">
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">N° Ticket</div>
            <strong>${Utils.escapeHTML(ticket.ticketNumber)}</strong>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">Conducteur / Client</div>
            <strong>${Utils.escapeHTML(ticket.clientName || 'Visiteur')}</strong>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">Heure d'entrée</div>
            <div>${Utils.formatDateTime(ticket.entryTime)}</div>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">Heure de sortie</div>
            <div>${Utils.formatDateTime(now)}</div>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">Durée effective</div>
            <span class="badge ${feeResult.isOverstay ? 'badge-danger' : 'badge-warning'}" style="font-size:0.9rem;padding:4px 10px">${durationLabel}</span>
          </div>
          <div>
            <div style="color:var(--text-muted);font-size:0.8rem">Formule tarifaire</div>
            <div style="font-size:0.85rem;font-weight:600;color:var(--accent-cyan)">${feeResult.breakdown}</div>
          </div>
        </div>

        <!-- Payment & Cash Change Calculation Box -->
        <div style="background:rgba(108,92,231,0.12);border:1px solid rgba(108,92,231,0.3);padding:1.25rem;border-radius:var(--radius-md);display:flex;flex-direction:column;gap:1rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <label style="font-size:0.85rem;color:var(--text-muted);display:block;margin-bottom:4px">Mode de règlement :</label>
              <select id="exit-payment-method" class="form-input" style="width:170px;padding:0.4rem 0.8rem" onchange="PlateScanner.toggleCashTenderBox(this.value, ${totalAmount})">
                <option value="Espèces" selected>Espèces</option>
                <option value="Carte bancaire">Carte bancaire</option>
                <option value="Abonné / Pass">Abonné / Pass</option>
                <option value="Gratuit">Gratuit / Dérogation</option>
              </select>
            </div>
            <div style="text-align:right">
              <div style="font-size:0.85rem;color:var(--text-muted)">Montant à payer :</div>
              <div id="exit-total-display" style="font-size:2rem;font-weight:900;color:var(--accent-green)">
                ${Utils.formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          <!-- Cash Change Calculator (Rendu Monnaie) -->
          <div id="cash-change-box" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:rgba(0,0,0,0.2);padding:0.85rem;border-radius:8px;border:1px dashed rgba(255,255,255,0.15)">
            <div>
              <label style="font-size:0.8rem;color:var(--text-muted)">Montant Reçu (Espèces) :</label>
              <input type="number" id="exit-cash-tendered" class="form-input" placeholder="Ex: 10" step="1" min="0" oninput="PlateScanner.updateCashChange(${totalAmount})" style="font-weight:700;font-size:1.1rem">
            </div>
            <div style="text-align:right;display:flex;flex-direction:column;justify-content:center">
              <div style="font-size:0.8rem;color:var(--text-muted)">Monnaie à Rendre :</div>
              <div id="exit-change-due" style="font-size:1.4rem;font-weight:900;color:var(--accent-cyan)">
                0.00 DT
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const confirmed = await Utils.showModal(`Sortie Ticket : ${ticket.licensePlate}`, modalHtml, {
      size: 'modal-md',
      confirmText: 'Valider Sortie & Imprimer Reçu'
    });

    if (confirmed) {
      const paymentMethod = document.getElementById('exit-payment-method').value;
      const tendered = parseFloat(document.getElementById('exit-cash-tendered')?.value) || 0;
      const finalAmount = paymentMethod === 'Gratuit' ? 0 : totalAmount;
      const changeDue = Math.max(0, tendered - finalAmount);

      ticket.exitTime = now.toISOString();
      ticket.durationMinutes = diffMinutes;
      ticket.totalAmount = finalAmount;
      ticket.paymentMethod = paymentMethod;
      ticket.cashTendered = tendered;
      ticket.changeDue = changeDue;
      ticket.tariffBreakdown = feeResult.breakdown;
      ticket.status = 'completed';

      await DB.update('parkingTickets', ticket);

      await DB.logAudit(parkingId, 'TICKET_EXIT', `Sortie validée pour ${ticket.licensePlate} (${ticket.ticketNumber}) : ${finalAmount} DT via ${paymentMethod}`, { ticketId: ticket.id, amount: finalAmount, paymentMethod, tendered, changeDue });
      
      Sync.broadcast('TICKET_EXITED', { licensePlate: ticket.licensePlate, amount: finalAmount, ticketNumber: ticket.ticketNumber });
      Utils.notify(`✅ Confirmation : Validation réussie du stationnement pour ${ticket.licensePlate} (${Utils.formatCurrency(finalAmount)})`, 'success', 5000);
      if (typeof A11y !== 'undefined' && A11y.speak) {
        A11y.speak(`Validation réussie du stationnement pour le véhicule ${ticket.licensePlate}. Montant : ${finalAmount} dinars. Barrière ouverte.`);
      }

      // Print exit receipt
      this.printExitReceipt(ticket);

      if (Router.currentRoute === 'tickets') {
        Tickets.render();
      }
    }
  },

  toggleCashTenderBox(method, total) {
    const box = document.getElementById('cash-change-box');
    const totalDisplay = document.getElementById('exit-total-display');
    if (box) {
      box.style.display = method === 'Espèces' ? 'grid' : 'none';
    }
    if (totalDisplay) {
      totalDisplay.textContent = method === 'Gratuit' ? '0.00 DT' : Utils.formatCurrency(total);
    }
  },

  updateCashChange(total) {
    const tendered = parseFloat(document.getElementById('exit-cash-tendered')?.value) || 0;
    const change = Math.max(0, tendered - total);
    const changeEl = document.getElementById('exit-change-due');
    if (changeEl) {
      changeEl.textContent = Utils.formatCurrency(change);
      changeEl.style.color = tendered < total && tendered > 0 ? 'var(--accent-red)' : 'var(--accent-cyan)';
    }
  },

  // NEW ENTRY TICKET MODAL
  async openNewEntryTicketModal(licensePlate) {
    const parkingId = Utils.getCurrentParkingId();
    const rates = await DB.getRates(parkingId);
    const ticketNumber = await DB.generateTicketNumber(parkingId);
    const defaultRate = rates.rateFirstHour || 2.0;
    const now = new Date();

    const formHtml = `
      <form id="new-entry-ticket-form" class="modal-form-grid" onsubmit="return false;">
        <div class="span-2" style="text-align:center;padding:0.75rem;background:#1e272e;border:2px solid #f5f6fa;border-radius:10px">
          <div style="font-size:0.75rem;color:#8b8fa3">PLAQUE SCANNEE</div>
          <div style="font-family:'Outfit', monospace;font-size:1.8rem;font-weight:900;letter-spacing:3px;color:#fff">
            ${licensePlate}
          </div>
        </div>

        <div class="form-group">
          <label>N° Ticket (Généré auto)</label>
          <input type="text" id="tkt-number" class="form-input" value="${ticketNumber}" readonly>
        </div>
        <div class="form-group">
          <label>Tarif horaire (TND/h)</label>
          <input type="number" id="tkt-rate" class="form-input" value="${defaultRate}" step="0.5" min="0.5">
        </div>

        <div class="form-group span-2">
          <label>Nom du conducteur / Visiteur (Optionnel)</label>
          <input type="text" id="tkt-client-name" class="form-input" placeholder="Ex: Mohamed Ben Ali ou Visiteur">
        </div>

        <div class="form-group">
          <label>Téléphone conducteur</label>
          <input type="tel" id="tkt-client-phone" class="form-input" placeholder="+216 ...">
        </div>
        <div class="form-group">
          <label>Remarques d'entrée</label>
          <input type="text" id="tkt-notes" class="form-input" placeholder="Barrière Principale">
        </div>
      </form>
    `;

    const confirmed = await Utils.showModal('Nouveau Ticket d\'Entrée', formHtml, {
      confirmText: 'Émettre le ticket & Ouvrir la barrière',
      size: 'modal-md'
    });

    if (confirmed) {
      const clientName = document.getElementById('tkt-client-name').value.trim() || 'Visiteur';
      const clientPhone = document.getElementById('tkt-client-phone').value.trim();
      const rate = parseFloat(document.getElementById('tkt-rate').value) || defaultRate;
      const notes = document.getElementById('tkt-notes').value.trim() || 'Entrée barrière';

      const ticketData = {
        parkingId,
        ticketNumber,
        licensePlate,
        clientName,
        clientPhone,
        entryTime: now.toISOString(),
        exitTime: null,
        durationMinutes: null,
        tariffHourly: rate,
        totalAmount: null,
        status: 'parked',
        paymentMethod: null,
        notes
      };

      await DB.add('parkingTickets', ticketData);
      await DB.logActivity(parkingId, Auth.user.id, 'Entrée véhicule', `Ticket ${ticketNumber} émis pour ${licensePlate}`);
      await DB.logAudit(parkingId, 'TICKET_ENTRY', `Entrée véhicule ${licensePlate} (${ticketNumber})`, { ticketNumber, licensePlate });
      
      Sync.broadcast('TICKET_ENTERED', { licensePlate, ticketNumber });
      Utils.notify(`Ticket ${ticketNumber} créé ! Barrière ouverte.`, 'success');

      this.printEntryTicket(ticketData);

      if (Router.currentRoute === 'tickets') {
        Tickets.render();
      }
    }
  },

  // Case B: Vehicle recognized from Dealer Inventory
  async handleInventoryVehicleDetected(vehicle) {
    const isRented = vehicle.status === 'rented';

    const infoHtml = `
      <div style="display:flex;flex-direction:column;gap:1rem;padding:0.5rem 0">
        <div style="background:var(--bg-glass);padding:1rem;border-radius:var(--radius-md);border-left:4px solid var(--primary-light)">
          <div style="font-size:0.75rem;text-transform:uppercase;color:var(--primary-light);font-weight:700">VÉHICULE DU PARC RECONNU</div>
          <h3 style="margin:4px 0 2px;color:var(--text-main)">${vehicle.brand} ${vehicle.model} (${vehicle.year})</h3>
          <div style="font-size:0.9rem;color:var(--text-muted)">Immatriculation : <strong>${vehicle.licensePlate}</strong></div>
          <div style="margin-top:6px">
            Statut actuel : <span class="badge ${Utils.getStatusBadge(vehicle.status).class}">${Utils.getStatusBadge(vehicle.status).label}</span>
          </div>
        </div>

        <p style="margin:0;font-size:0.9rem;color:var(--text-secondary)">
          ${isRented ? 'Ce véhicule est actuellement sous contrat de location. Souhaitez-vous enregistrer son retour maintenant ?' : 'Ce véhicule fait partie de votre stock. Que souhaitez-vous faire ?'}
        </p>

        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          ${isRented ? `
            <button class="btn btn-primary" onclick="PlateScanner.openRentalReturnForVehicle(${vehicle.id})">
              <i class="fas fa-undo"></i> Ouvrir le Retour de Location
            </button>
          ` : ''}
          <button class="btn btn-ghost" onclick="PlateScanner.openNewEntryTicketModal('${vehicle.licensePlate}')">
            <i class="fas fa-barcode"></i> Émettre un ticket de stationnement standard
          </button>
          <button class="btn btn-ghost" onclick="Vehicles.viewVehicle(${vehicle.id})">
            <i class="fas fa-eye"></i> Voir la fiche technique du véhicule
          </button>
        </div>
      </div>
    `;

    Utils.showModal(`Véhicule : ${vehicle.licensePlate}`, infoHtml, {
      size: 'modal-md',
      hideFooter: true
    });
  },

  async openRentalReturnForVehicle(vehicleId) {
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.click();

    const parkingId = Utils.getCurrentParkingId();
    const rentals = await DB.getRentalsByParking(parkingId);
    const activeRental = rentals.find(r => r.vehicleId === vehicleId && (r.status === 'active' || r.status === 'overdue'));

    if (activeRental) {
      Rentals.returnVehicleModal(activeRental.id);
    } else {
      Utils.notify('Aucun contrat de location actif trouvé pour ce véhicule', 'warning');
    }
  },

  // Print Parking Entry Slip
  printEntryTicket(ticket) {
    const receiptHtml = `
      <div style="width:280px;margin:0 auto;font-family:monospace;font-size:12px;color:#000;text-align:center;padding:10px">
        <h3 style="margin:0;font-size:16px">MON PARKING</h3>
        <p style="margin:2px 0;font-size:11px">Ticket de Stationnement</p>
        <p style="margin:2px 0 10px;font-size:10px">--------------------------------</p>
        
        <div style="font-size:18px;font-weight:bold;margin:8px 0;padding:6px;border:2px solid #000">
          ${ticket.licensePlate}
        </div>

        <p style="margin:4px 0"><strong>N° :</strong> ${ticket.ticketNumber}</p>
        <p style="margin:4px 0"><strong>Entrée :</strong> ${Utils.formatDateTime(ticket.entryTime)}</p>
        <p style="margin:4px 0"><strong>Tarif :</strong> ${ticket.tariffHourly} TND / h</p>
        
        <p style="margin:10px 0 6px;font-size:10px">--------------------------------</p>
        <p style="font-size:9px;margin:0">Veuillez conserver ce ticket pour la sortie. En cas de perte, le forfait journalier s'applique.</p>
      </div>
    `;
    Utils.printInvoice(receiptHtml);
  },

  // Print Parking Exit Receipt
  printExitReceipt(ticket) {
    const receiptHtml = `
      <div style="width:280px;margin:0 auto;font-family:monospace;font-size:12px;color:#000;text-align:center;padding:10px">
        <h3 style="margin:0;font-size:16px">MON PARKING</h3>
        <p style="margin:2px 0;font-size:11px">Reçu de Sortie - Acquitté</p>
        <p style="margin:2px 0 10px;font-size:10px">--------------------------------</p>
        
        <div style="font-size:18px;font-weight:bold;margin:8px 0;padding:6px;border:2px solid #000">
          ${ticket.licensePlate}
        </div>

        <p style="margin:4px 0"><strong>N° Ticket :</strong> ${ticket.ticketNumber}</p>
        <p style="margin:4px 0"><strong>Entrée :</strong> ${Utils.formatDateTime(ticket.entryTime)}</p>
        <p style="margin:4px 0"><strong>Sortie :</strong> ${Utils.formatDateTime(ticket.exitTime)}</p>
        <p style="margin:4px 0"><strong>Durée :</strong> ${ticket.durationMinutes} min</p>
        <p style="margin:4px 0"><strong>Paiement :</strong> ${ticket.paymentMethod}</p>

        <p style="margin:10px 0 6px;font-size:10px">--------------------------------</p>
        <div style="font-size:16px;font-weight:bold;margin:8px 0">
          TOTAL : ${Utils.formatCurrency(ticket.totalAmount)}
        </div>
        <p style="font-size:9px;margin:0">Merci de votre visite et bonne route !</p>
      </div>
    `;
    Utils.printInvoice(receiptHtml);
  }
};
