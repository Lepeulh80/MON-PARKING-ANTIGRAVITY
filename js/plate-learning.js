/* ========================================================================
   MON PARKING - Local Machine Learning for License Plate Confusions
   Operator suggestion memory, adaptive confusion matrix,
   geographic zone statistics, and real-time anomaly detection.
   ======================================================================== */

const PlateLearning = {
  storageKeyConfusions: 'monparking_ocr_confusions_v1',
  storageKeyGeoStats: 'monparking_plate_geo_stats_v1',
  storageKeyHistory: 'monparking_operator_choice_history_v1',

  // Default common OCR ambiguities in automotive license plates
  defaultConfusions: {
    'O': { '0': 12, 'D': 3 },
    '0': { 'O': 14, 'D': 2 },
    'B': { '8': 9, '3': 2 },
    '8': { 'B': 11, '0': 2 },
    'I': { '1': 15, 'T': 2, 'L': 2 },
    '1': { 'I': 13, '7': 2 },
    'Z': { '2': 8, '7': 2 },
    '2': { 'Z': 7 },
    'S': { '5': 10 },
    '5': { 'S': 9 },
    'G': { '6': 6 },
    '6': { 'G': 5 },
    'TN': { 'TM': 4, 'TU': 5 }
  },

  getConfusions() {
    try {
      const data = localStorage.getItem(this.storageKeyConfusions);
      return data ? JSON.parse(data) : JSON.parse(JSON.stringify(this.defaultConfusions));
    } catch (e) {
      return JSON.parse(JSON.stringify(this.defaultConfusions));
    }
  },

  saveConfusions(matrix) {
    try {
      localStorage.setItem(this.storageKeyConfusions, JSON.stringify(matrix));
    } catch (e) {}
  },

  // Record an operator's choice when selecting or correcting a plate suggestion
  recordOperatorChoice(ocrRaw, chosenPlate, operatorName = 'Opérateur') {
    if (!ocrRaw || !chosenPlate) return;

    const raw = ocrRaw.toUpperCase().trim();
    const chosen = chosenPlate.toUpperCase().trim();
    const matrix = this.getConfusions();

    // Analyze character or token shifts
    if (raw !== chosen) {
      const minLen = Math.min(raw.length, chosen.length);
      for (let i = 0; i < minLen; i++) {
        const cRaw = raw[i];
        const cChosen = chosen[i];
        if (cRaw !== cChosen && cRaw.match(/[A-Z0-9]/) && cChosen.match(/[A-Z0-9]/)) {
          if (!matrix[cRaw]) matrix[cRaw] = {};
          matrix[cRaw][cChosen] = (matrix[cRaw][cChosen] || 0) + 1;
        }
      }
      this.saveConfusions(matrix);
    }

    // Update Geo Stats
    const zone = this.detectGeographicZone(chosen);
    this.updateGeoStats(zone, raw === chosen);

    // Save history log (kept to last 50 events)
    try {
      const historyStr = localStorage.getItem(this.storageKeyHistory);
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.unshift({
        ocrRaw: raw,
        chosenPlate: chosen,
        zone: zone.name,
        operator: operatorName,
        timestamp: new Date().toISOString(),
        learnedCorrection: raw !== chosen
      });
      localStorage.setItem(this.storageKeyHistory, JSON.stringify(history.slice(0, 50)));
    } catch (e) {}

    console.log(`🧠 PlateLearning: Recorded operator selection '${chosen}' (OCR: '${raw}'). Local weights updated.`);
  },

  // Generate ranked suggestions using OCR text and learned confusions
  generateSuggestions(rawOcrText) {
    if (!rawOcrText) return [];
    const text = rawOcrText.toUpperCase().trim();
    const suggestions = [];
    const matrix = this.getConfusions();

    // Candidate 1: Raw parsed plate directly
    const directCandidate = this.formatPlateCandidate(text);
    if (directCandidate) {
      suggestions.push({
        plate: directCandidate,
        confidence: 94,
        source: 'Lecture OCR Directe',
        badgeClass: 'badge-primary'
      });
    }

    // Candidate 2 & 3: Apply learned substitutions on most likely confused chars
    const chars = text.split('');
    const candidateVariants = new Set();

    // Try substituting top confused chars
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (matrix[char]) {
        const sortedSubstitutes = Object.entries(matrix[char]).sort((a, b) => b[1] - a[1]);
        if (sortedSubstitutes.length > 0) {
          const topSub = sortedSubstitutes[0][0];
          const variantChars = [...chars];
          variantChars[i] = topSub;
          const candidateStr = variantChars.join('');
          const formatted = this.formatPlateCandidate(candidateStr);
          if (formatted && formatted !== directCandidate) {
            candidateVariants.add(formatted);
          }
        }
      }
    }

    // Handle Tunisian specific TN token confusion if digits surround it
    if (text.includes('TM') || text.includes('TU')) {
      const tnFixed = text.replace(/TM|TU/g, 'TN');
      const formatted = this.formatPlateCandidate(tnFixed);
      if (formatted && formatted !== directCandidate) {
        candidateVariants.add(formatted);
      }
    }

    let rankScore = 88;
    candidateVariants.forEach(variant => {
      suggestions.push({
        plate: variant,
        confidence: rankScore,
        source: 'Correction IA Apprise',
        badgeClass: 'badge-info'
      });
      rankScore = Math.max(65, rankScore - 7);
    });

    return suggestions;
  },

  formatPlateCandidate(str) {
    if (!str) return null;
    let s = str.toUpperCase().replace(/[\n\r]/g, ' ').trim();

    // Tunisian format: 240 TN 1892
    const tnMatch = s.match(/(\d{2,3})\s*(?:TN|TUNIS|TU)?\s*(\d{2,5})/);
    if (tnMatch) {
      return `${tnMatch[1]} TN ${tnMatch[2]}`;
    }

    // French SIV format: AA-123-AA
    const frMatch = s.match(/([A-Z]{2})[- ]?(\d{3})[- ]?([A-Z]{2})/);
    if (frMatch) {
      return `${frMatch[1]}-${frMatch[2]}-${frMatch[3]}`;
    }

    // Generic
    const genMatch = s.match(/([A-Z0-9]{2,4}[- ]?[A-Z0-9]{2,5})/);
    if (genMatch && genMatch[0].length >= 5) {
      return genMatch[0].trim();
    }

    return s.length >= 4 ? s : null;
  },

  // Identify geographic format
  detectGeographicZone(plate) {
    if (!plate) return { code: 'INT', name: 'International', flag: '🌐' };
    const p = plate.toUpperCase();

    if (p.includes('TN') || p.includes('TUNIS') || /^\d{2,3}\s*TN/.test(p)) {
      return { code: 'TN', name: 'Tunisie (Format TN)', flag: '🇹🇳' };
    }
    if (/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(p) || /^[A-Z]{2}\s\d{3}\s[A-Z]{2}$/.test(p)) {
      return { code: 'FR', name: 'France (Format SIV)', flag: '🇫🇷' };
    }
    if (/^[A-Z0-9]{1,3}-[A-Z0-9]{1,4}/.test(p)) {
      return { code: 'EU', name: 'Europe Standard', flag: '🇪🇺' };
    }
    return { code: 'INT', name: 'International / Autre', flag: '🌍' };
  },

  // Geo Statistics Tracking
  getGeoStats() {
    try {
      const data = localStorage.getItem(this.storageKeyGeoStats);
      if (data) return JSON.parse(data);
    } catch (e) {}

    // Default seeded stats
    return {
      'TN': { name: 'Tunisie (Format TN)', flag: '🇹🇳', total: 142, directSuccess: 135, corrected: 7, avgConfidence: 96.2 },
      'FR': { name: 'France (Format SIV)', flag: '🇫🇷', total: 38, directSuccess: 36, corrected: 2, avgConfidence: 95.8 },
      'EU': { name: 'Europe Standard', flag: '🇪🇺', total: 19, directSuccess: 17, corrected: 2, avgConfidence: 92.4 },
      'INT': { name: 'International', flag: '🌍', total: 8, directSuccess: 7, corrected: 1, avgConfidence: 89.0 }
    };
  },

  updateGeoStats(zone, wasDirectSuccess) {
    const stats = this.getGeoStats();
    if (!stats[zone.code]) {
      stats[zone.code] = { name: zone.name, flag: zone.flag, total: 0, directSuccess: 0, corrected: 0, avgConfidence: 95.0 };
    }

    const item = stats[zone.code];
    item.total += 1;
    if (wasDirectSuccess) {
      item.directSuccess += 1;
    } else {
      item.corrected += 1;
    }
    try {
      localStorage.setItem(this.storageKeyGeoStats, JSON.stringify(stats));
    } catch (e) {}
  },

  // Real-Time Anomaly Detection Engine
  async detectAnomalies(parkingId, licensePlate) {
    const anomalies = [];
    if (!licensePlate) return anomalies;

    const plateClean = licensePlate.toUpperCase().trim();

    // Check 1: Security Blacklist
    try {
      const secItem = await DB.checkPlateSecurity(parkingId, plateClean);
      if (secItem && secItem.type === 'blacklist_alert') {
        anomalies.push({
          type: 'BLACKLIST_MATCH',
          severity: 'danger',
          title: '🚨 VÉHICULE EN LISTE NOIRE',
          message: `Le véhicule ${plateClean} est signalé : ${secItem.reason}`,
          blocking: true
        });
      }
    } catch (e) {}

    // Check 2: Active Tickets Check (Duplicate entrance or prolonged stay)
    try {
      const activeTickets = await DB.getTicketsByParking(parkingId);
      const parked = activeTickets.filter(t => t.status === 'parked' && t.licensePlate === plateClean);
      
      if (parked.length > 1) {
        anomalies.push({
          type: 'DUPLICATE_ENTRY',
          severity: 'warning',
          title: '⚠️ TICKET ACTIF MULTIPLE DÉTECTÉ',
          message: `La plaque ${plateClean} est déjà enregistrée sur ${parked.length} tickets en cours. Possible passage sans fermeture.`,
          blocking: false
        });
      }

      // Check 3: Prolonged Overstay (> 24 hours)
      const now = new Date();
      parked.forEach(t => {
        const hours = (now - new Date(t.entryTime)) / (1000 * 60 * 60);
        if (hours >= 24) {
          anomalies.push({
            type: 'OVERSTAY_ALERT',
            severity: 'warning',
            title: '⏱️ DÉPASSEMENT DURÉE DE STATIONNEMENT',
            message: `Le véhicule ${plateClean} est stationné depuis ${Math.floor(hours)} heures sans régularisation.`,
            blocking: false
          });
        }
      });
    } catch (e) {}

    return anomalies;
  }
};
