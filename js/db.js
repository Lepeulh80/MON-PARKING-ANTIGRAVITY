/* ========================================================================
   MON PARKING - Database Layer (IndexedDB)
   Complete local database with all stores for parking management
   ======================================================================== */

const DB_NAME = 'MonParkingDB';
const DB_VERSION = 7;

class ParkingDatabase {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Parkings store
        if (!db.objectStoreNames.contains('parkings')) {
          const parkingStore = db.createObjectStore('parkings', { keyPath: 'id', autoIncrement: true });
          parkingStore.createIndex('name', 'name', { unique: false });
          parkingStore.createIndex('adminId', 'adminId', { unique: false });
        }

        // Users store (admins + employees)
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('parkingId', 'parkingId', { unique: false });
          userStore.createIndex('role', 'role', { unique: false });
        }

        // Vehicles store
        if (!db.objectStoreNames.contains('vehicles')) {
          const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
          vehicleStore.createIndex('parkingId', 'parkingId', { unique: false });
          vehicleStore.createIndex('status', 'status', { unique: false });
          vehicleStore.createIndex('brand', 'brand', { unique: false });
          vehicleStore.createIndex('licensePlate', 'licensePlate', { unique: false });
          vehicleStore.createIndex('category', 'category', { unique: false });
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          saleStore.createIndex('parkingId', 'parkingId', { unique: false });
          saleStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          saleStore.createIndex('employeeId', 'employeeId', { unique: false });
          saleStore.createIndex('date', 'date', { unique: false });
          saleStore.createIndex('clientName', 'clientName', { unique: false });
        }

        // Rentals store
        if (!db.objectStoreNames.contains('rentals')) {
          const rentalStore = db.createObjectStore('rentals', { keyPath: 'id', autoIncrement: true });
          rentalStore.createIndex('parkingId', 'parkingId', { unique: false });
          rentalStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          rentalStore.createIndex('employeeId', 'employeeId', { unique: false });
          rentalStore.createIndex('status', 'status', { unique: false });
          rentalStore.createIndex('startDate', 'startDate', { unique: false });
          rentalStore.createIndex('endDate', 'endDate', { unique: false });
        }

        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
          invoiceStore.createIndex('parkingId', 'parkingId', { unique: false });
          invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
          invoiceStore.createIndex('type', 'type', { unique: false });
          invoiceStore.createIndex('date', 'date', { unique: false });
          invoiceStore.createIndex('clientName', 'clientName', { unique: false });
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          expenseStore.createIndex('parkingId', 'parkingId', { unique: false });
          expenseStore.createIndex('category', 'category', { unique: false });
          expenseStore.createIndex('date', 'date', { unique: false });
        }

        // Clients store
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
          clientStore.createIndex('parkingId', 'parkingId', { unique: false });
          clientStore.createIndex('name', 'name', { unique: false });
          clientStore.createIndex('phone', 'phone', { unique: false });
          clientStore.createIndex('email', 'email', { unique: false });
        }

        // Activity log store
        if (!db.objectStoreNames.contains('activityLog')) {
          const logStore = db.createObjectStore('activityLog', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('parkingId', 'parkingId', { unique: false });
          logStore.createIndex('userId', 'userId', { unique: false });
          logStore.createIndex('action', 'action', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Parking entry/exit tickets store
        if (!db.objectStoreNames.contains('parkingTickets')) {
          const ticketStore = db.createObjectStore('parkingTickets', { keyPath: 'id', autoIncrement: true });
          ticketStore.createIndex('parkingId', 'parkingId', { unique: false });
          ticketStore.createIndex('licensePlate', 'licensePlate', { unique: false });
          ticketStore.createIndex('status', 'status', { unique: false });
          ticketStore.createIndex('entryTime', 'entryTime', { unique: false });
          ticketStore.createIndex('ticketNumber', 'ticketNumber', { unique: true });
        }

        // Parking Slots store (Map 2D/3D & physical spaces)
        if (!db.objectStoreNames.contains('parkingSlots')) {
          const slotStore = db.createObjectStore('parkingSlots', { keyPath: 'id', autoIncrement: true });
          slotStore.createIndex('parkingId', 'parkingId', { unique: false });
          slotStore.createIndex('slotNumber', 'slotNumber', { unique: false });
          slotStore.createIndex('status', 'status', { unique: false });
          slotStore.createIndex('level', 'level', { unique: false });
          slotStore.createIndex('type', 'type', { unique: false });
        }

        // Subscriptions store (Abonnements & Passes)
        if (!db.objectStoreNames.contains('subscriptions')) {
          const subStore = db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
          subStore.createIndex('parkingId', 'parkingId', { unique: false });
          subStore.createIndex('licensePlate', 'licensePlate', { unique: false });
          subStore.createIndex('status', 'status', { unique: false });
          subStore.createIndex('endDate', 'endDate', { unique: false });
        }

        // Attendance / Pointage du personnel
        if (!db.objectStoreNames.contains('attendance')) {
          const attStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
          attStore.createIndex('parkingId', 'parkingId', { unique: false });
          attStore.createIndex('userId', 'userId', { unique: false });
          attStore.createIndex('date', 'date', { unique: false });
        }

        // Cash Register Sessions / Clôtures de caisse
        if (!db.objectStoreNames.contains('cashSessions')) {
          const cashStore = db.createObjectStore('cashSessions', { keyPath: 'id', autoIncrement: true });
          cashStore.createIndex('parkingId', 'parkingId', { unique: false });
          cashStore.createIndex('userId', 'userId', { unique: false });
          cashStore.createIndex('status', 'status', { unique: false });
        }

        // Security Plate Lists (Whitelist & Blacklist)
        if (!db.objectStoreNames.contains('plateLists')) {
          const listStore = db.createObjectStore('plateLists', { keyPath: 'id', autoIncrement: true });
          listStore.createIndex('parkingId', 'parkingId', { unique: false });
          listStore.createIndex('licensePlate', 'licensePlate', { unique: false });
          listStore.createIndex('type', 'type', { unique: false });
        }

        // Immutable Audit Logs store
        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
          auditStore.createIndex('parkingId', 'parkingId', { unique: false });
          auditStore.createIndex('userId', 'userId', { unique: false });
          auditStore.createIndex('actionType', 'actionType', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Configurable Parking Rates & Tariffs store
        if (!db.objectStoreNames.contains('parkingRates')) {
          const ratesStore = db.createObjectStore('parkingRates', { keyPath: 'id', autoIncrement: true });
          ratesStore.createIndex('parkingId', 'parkingId', { unique: false });
        }

        // Plate Corrections & Sync Audit store
        if (!db.objectStoreNames.contains('plateCorrections')) {
          const corrStore = db.createObjectStore('plateCorrections', { keyPath: 'id', autoIncrement: true });
          corrStore.createIndex('parkingId', 'parkingId', { unique: false });
          corrStore.createIndex('ticketId', 'ticketId', { unique: false });
          corrStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Vehicle Maintenance & Service log store
        if (!db.objectStoreNames.contains('vehicleMaintenance')) {
          const maintStore = db.createObjectStore('vehicleMaintenance', { keyPath: 'id', autoIncrement: true });
          maintStore.createIndex('parkingId', 'parkingId', { unique: false });
          maintStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          maintStore.createIndex('type', 'type', { unique: false });
          maintStore.createIndex('status', 'status', { unique: false });
          maintStore.createIndex('date', 'date', { unique: false });
        }

        // Rental Check-in / Check-out Inspections store
        if (!db.objectStoreNames.contains('rentalInspections')) {
          const inspStore = db.createObjectStore('rentalInspections', { keyPath: 'id', autoIncrement: true });
          inspStore.createIndex('parkingId', 'parkingId', { unique: false });
          inspStore.createIndex('rentalId', 'rentalId', { unique: false });
          inspStore.createIndex('vehicleId', 'vehicleId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('DB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /* ---- Generic CRUD Operations ---- */

  async add(storeName, data) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, data) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      data.updatedAt = new Date().toISOString();
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getOneByIndex(storeName, indexName, value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /* ---- Parking-scoped queries ---- */

  async getVehiclesByParking(parkingId) {
    return this.getByIndex('vehicles', 'parkingId', parkingId);
  }

  async getSalesByParking(parkingId) {
    return this.getByIndex('sales', 'parkingId', parkingId);
  }

  async getRentalsByParking(parkingId) {
    return this.getByIndex('rentals', 'parkingId', parkingId);
  }

  async getInvoicesByParking(parkingId) {
    return this.getByIndex('invoices', 'parkingId', parkingId);
  }

  async getExpensesByParking(parkingId) {
    return this.getByIndex('expenses', 'parkingId', parkingId);
  }

  async getEmployeesByParking(parkingId) {
    return this.getByIndex('users', 'parkingId', parkingId);
  }

  async getUsersByParking(parkingId) {
    return this.getEmployeesByParking(parkingId);
  }

  async getClientsByParking(parkingId) {
    return this.getByIndex('clients', 'parkingId', parkingId);
  }

  async getActivityByParking(parkingId) {
    return this.getByIndex('activityLog', 'parkingId', parkingId);
  }

  /* ---- Parking Tickets queries & helpers ---- */
  async getTicketsByParking(parkingId) {
    return this.getByIndex('parkingTickets', 'parkingId', parkingId);
  }

  async getActiveTicketByPlate(parkingId, rawPlate) {
    if (!rawPlate) return null;
    const cleanPlate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const tickets = await this.getTicketsByParking(parkingId);
    return tickets.find(t => t.status === 'parked' && t.licensePlate && t.licensePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate) || null;
  }

  async getVehicleByPlate(parkingId, rawPlate) {
    if (!rawPlate) return null;
    const cleanPlate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const vehicles = await this.getVehiclesByParking(parkingId);
    return vehicles.find(v => v.licensePlate && v.licensePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate) || null;
  }

  async generateTicketNumber(parkingId) {
    const tickets = await this.getTicketsByParking(parkingId);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    let maxSeq = 0;
    const existing = new Set();
    tickets.forEach(t => {
      if (t.ticketNumber) {
        existing.add(t.ticketNumber);
        const match = t.ticketNumber.match(/TKT-\d+-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    let seq = Math.max(maxSeq + 1, tickets.length + 1);
    let candidate = `TKT-${dateStr}-${String(seq).padStart(4, '0')}`;
    while (existing.has(candidate)) {
      seq++;
      candidate = `TKT-${dateStr}-${String(seq).padStart(4, '0')}`;
    }
    return candidate;
  }

  /* ---- Parking Slots queries & helpers ---- */
  async getSlotsByParking(parkingId) {
    return this.getByIndex('parkingSlots', 'parkingId', parkingId);
  }

  /* ---- Subscriptions queries & helpers ---- */
  async getSubscriptionsByParking(parkingId) {
    return this.getByIndex('subscriptions', 'parkingId', parkingId);
  }

  async getActiveSubscriptionByPlate(parkingId, rawPlate) {
    if (!rawPlate) return null;
    const cleanPlate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const subs = await this.getSubscriptionsByParking(parkingId);
    const now = new Date();
    return subs.find(s => s.status === 'active' && new Date(s.endDate) >= now && s.licensePlate && s.licensePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate) || null;
  }

  /* ---- Attendance queries & helpers ---- */
  async getAttendanceByParking(parkingId) {
    return this.getByIndex('attendance', 'parkingId', parkingId);
  }

  /* ---- Cash register queries & helpers ---- */
  async getCashSessionsByParking(parkingId) {
    return this.getByIndex('cashSessions', 'parkingId', parkingId);
  }

  async getCurrentCashSession(parkingId, userId) {
    const sessions = await this.getCashSessionsByParking(parkingId);
    return sessions.find(s => s.userId === userId && s.status === 'open') || null;
  }

  /* ---- Plate Lists (Whitelist / Blacklist) ---- */
  async getPlateListsByParking(parkingId) {
    return this.getByIndex('plateLists', 'parkingId', parkingId);
  }

  async checkPlateSecurity(parkingId, rawPlate) {
    if (!rawPlate) return null;
    const cleanPlate = rawPlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const lists = await this.getPlateListsByParking(parkingId);
    return lists.find(item => item.licensePlate && item.licensePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate) || null;
  }

  /* ---- Configurable Parking Rates & Tariffs ---- */
  async getRates(parkingId) {
    const list = await this.getByIndex('parkingRates', 'parkingId', parkingId);
    if (list && list.length > 0) return list[0];

    const defaultRates = {
      parkingId,
      currency: 'TND',
      freeGraceMinutes: 15,          // 15 min de franchise gratuite
      rateFirstHour: 2.0,            // 2.0 DT 1ère heure
      rateAdditionalHour: 1.5,       // 1.5 DT heure suivante
      dailyCap: 15.0,                // Plafond 24h
      nightFlatRate: 8.0,            // Forfait nuit 20h - 08h
      weekendFlatRate: 25.0,         // Forfait week-end 48h
      lostTicketFee: 30.0,           // Forfait ticket perdu
      overstayThresholdHours: 24,    // Seuil stationnement prolongé (24h)
      overstayDailySurcharge: 10.0,  // Surtaxe par jour sup au-delà de 24h
      exitGraceMinutes: 15,          // 15 min de grâce après paiement pour sortir
      updatedAt: new Date().toISOString()
    };
    const id = await this.add('parkingRates', defaultRates);
    defaultRates.id = id;
    return defaultRates;
  }

  async saveRates(rates) {
    if (rates.id) {
      await this.update('parkingRates', rates);
    } else {
      const id = await this.add('parkingRates', rates);
      rates.id = id;
    }
    await this.logAudit(rates.parkingId, 'RATE_UPDATE', 'Mise à jour de la grille tarifaire du parking', { rates });
    return rates;
  }

  calculateParkingFee(entryTimeStr, exitTimeStr, rates, options = {}) {
    const entry = new Date(entryTimeStr);
    const exit = exitTimeStr ? new Date(exitTimeStr) : new Date();
    const diffMs = Math.max(0, exit - entry);
    const totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const totalHours = Math.ceil(totalMinutes / 60);

    // 1. Case: Lost Ticket Flat Fee
    if (options.isLostTicket) {
      return {
        totalAmount: rates.lostTicketFee || 30.0,
        isLostTicket: true,
        isFreeGrace: false,
        isOverstay: false,
        durationMinutes: totalMinutes,
        billedHours: totalHours,
        breakdown: `Forfait Ticket Perdu appliqué (${rates.lostTicketFee || 30} DT)`
      };
    }

    // 2. Case: Free Grace Period (ex: <= 15 min)
    if (totalMinutes <= (rates.freeGraceMinutes || 15)) {
      return {
        totalAmount: 0.0,
        isLostTicket: false,
        isFreeGrace: true,
        isOverstay: false,
        durationMinutes: totalMinutes,
        billedHours: 0,
        breakdown: `Franchise gratuite (${totalMinutes} min <= ${rates.freeGraceMinutes || 15} min)`
      };
    }

    // 3. Case: Day and multi-day / Overstay calculation
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes % (24 * 60);
    const isOverstay = totalMinutes > ((rates.overstayThresholdHours || 24) * 60);

    let amount = 0;
    let breakdownParts = [];

    if (days > 0) {
      amount += days * (rates.dailyCap || 15.0);
      breakdownParts.push(`${days}j × ${rates.dailyCap} DT (plafond 24h)`);

      // Surcharge if multi-day overstay
      if (days >= 2 && (rates.overstayDailySurcharge || 0) > 0) {
        const extraDays = days - 1;
        const surcharge = extraDays * rates.overstayDailySurcharge;
        amount += surcharge;
        breakdownParts.push(`Surtaxe prolongé : ${extraDays}j × ${rates.overstayDailySurcharge} DT`);
      }
    }

    // Remaining hours within the current day
    if (remainingMinutes > 0) {
      const remainingHours = Math.ceil(remainingMinutes / 60);
      let dayPortion = 0;
      if (remainingHours === 1) {
        dayPortion = rates.rateFirstHour || 2.0;
      } else {
        dayPortion = (rates.rateFirstHour || 2.0) + (remainingHours - 1) * (rates.rateAdditionalHour || 1.5);
      }
      // Cap remaining hours cost to dailyCap
      if (dayPortion > (rates.dailyCap || 15.0)) {
        dayPortion = rates.dailyCap || 15.0;
      }
      amount += dayPortion;
      breakdownParts.push(`${remainingHours}h : ${dayPortion.toFixed(2)} DT`);
    }

    return {
      totalAmount: Math.round(amount * 100) / 100,
      isLostTicket: false,
      isFreeGrace: false,
      isOverstay,
      days,
      durationMinutes: totalMinutes,
      billedHours: totalHours,
      breakdown: breakdownParts.join(' + ')
    };
  }

  /* ---- Audit Logging & Traceability ---- */
  async logAudit(parkingId, actionType, details, metadata = {}) {
    try {
      const user = (typeof Auth !== 'undefined' && Auth.user) ? Auth.user : { id: 1, firstName: 'Système', lastName: 'Automatique', role: 'admin' };
      const logEntry = {
        parkingId,
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Opérateur',
        userRole: user.role || 'admin',
        actionType,
        details,
        metadata,
        timestamp: new Date().toISOString()
      };
      return await this.add('auditLogs', logEntry);
    } catch (e) {
      console.warn('Audit log error:', e);
    }
  }

  async getAuditLogs(parkingId) {
    const logs = await this.getByIndex('auditLogs', 'parkingId', parkingId);
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /* ---- Plate Corrections with Audit Trail ---- */
  async correctPlate(parkingId, ticketId, oldPlate, newPlate, reason) {
    const ticket = await this.get('parkingTickets', ticketId);
    if (!ticket) throw new Error('Ticket introuvable');

    const cleanNewPlate = newPlate.trim().toUpperCase();
    ticket.licensePlate = cleanNewPlate;
    ticket.plateCorrected = true;
    ticket.plateCorrectionReason = reason;
    ticket.plateCorrectionAt = new Date().toISOString();

    await this.update('parkingTickets', ticket);

    const correctionEntry = {
      parkingId,
      ticketId,
      oldPlate,
      newPlate: cleanNewPlate,
      reason,
      timestamp: new Date().toISOString()
    };
    await this.add('plateCorrections', correctionEntry);

    await this.logAudit(parkingId, 'PLATE_CORRECTION', `Correction plaque ticket N°${ticket.ticketNumber} : "${oldPlate}" ➔ "${cleanNewPlate}" (Motif: ${reason})`, { ticketId, oldPlate, newPlate: cleanNewPlate });

    return ticket;
  }

  async getPlateCorrections(parkingId) {
    return this.getByIndex('plateCorrections', 'parkingId', parkingId);
  }

  /* ---- Statistics helpers ---- */

  async getDashboardStats(parkingId) {
    const vehicles = await this.getVehiclesByParking(parkingId);
    const sales = await this.getSalesByParking(parkingId);
    const rentals = await this.getRentalsByParking(parkingId);
    const tickets = await this.getTicketsByParking(parkingId);
    const subscriptions = await this.getSubscriptionsByParking(parkingId);
    const expenses = await this.getExpensesByParking(parkingId);
    const clients = await this.getClientsByParking(parkingId);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const completedTickets = tickets.filter(t => t.status === 'completed');
    const totalTicketRevenue = completedTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const monthlyTicketRevenue = completedTickets.filter(t => {
      const d = new Date(t.exitTime || t.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const totalSubRevenue = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0);
    const monthlySubRevenue = subscriptions.filter(s => {
      const d = new Date(s.startDate || s.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, s) => sum + (s.price || 0), 0);

    const monthlySales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const monthlyRentals = rentals.filter(r => {
      const d = new Date(r.startDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                       + rentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
                       + totalTicketRevenue
                       + totalSubRevenue;
    
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                         + monthlyRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
                         + monthlyTicketRevenue
                         + monthlySubRevenue;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthlyExp = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter(v => v.status === 'available').length,
      soldVehicles: vehicles.filter(v => v.status === 'sold').length,
      rentedVehicles: vehicles.filter(v => v.status === 'rented').length,
      reservedVehicles: vehicles.filter(v => v.status === 'reserved').length,
      totalSales: sales.length,
      totalRentals: rentals.length,
      activeRentals: rentals.filter(r => r.status === 'active').length,
      totalTicketRevenue,
      monthlyTicketRevenue,
      totalSubRevenue,
      totalRevenue,
      monthlyRevenue,
      totalExpenses,
      monthlyExpenses: monthlyExp,
      profit: totalRevenue - totalExpenses,
      monthlyProfit: monthlyRevenue - monthlyExp,
      totalClients: clients.length,
      monthlySalesCount: monthlySales.length,
      monthlyRentalsCount: monthlyRentals.length,
      vehicles,
      sales,
      rentals,
      tickets,
      subscriptions,
      expenses,
      clients
    };
  }

  async getMonthlySalesData(parkingId, year) {
    const sales = await this.getSalesByParking(parkingId);
    const rentals = await this.getRentalsByParking(parkingId);
    const months = Array(12).fill(0);
    const rentalMonths = Array(12).fill(0);

    sales.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === year) {
        months[d.getMonth()] += s.totalAmount || 0;
      }
    });

    rentals.forEach(r => {
      const d = new Date(r.startDate);
      if (d.getFullYear() === year) {
        rentalMonths[d.getMonth()] += r.totalAmount || 0;
      }
    });

    return { salesByMonth: months, rentalsByMonth: rentalMonths };
  }

  async getTopEmployees(parkingId, limit = 5) {
    const sales = await this.getSalesByParking(parkingId);
    const rentals = await this.getRentalsByParking(parkingId);
    const employees = await this.getEmployeesByParking(parkingId);

    const employeeStats = {};
    
    employees.forEach(emp => {
      employeeStats[emp.id] = {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        avatar: emp.avatar,
        salesCount: 0,
        rentalsCount: 0,
        totalRevenue: 0
      };
    });

    sales.forEach(s => {
      if (employeeStats[s.employeeId]) {
        employeeStats[s.employeeId].salesCount++;
        employeeStats[s.employeeId].totalRevenue += s.totalAmount || 0;
      }
    });

    rentals.forEach(r => {
      if (employeeStats[r.employeeId]) {
        employeeStats[r.employeeId].rentalsCount++;
        employeeStats[r.employeeId].totalRevenue += r.totalAmount || 0;
      }
    });

    return Object.values(employeeStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  async getVehiclesByCategory(parkingId) {
    const vehicles = await this.getVehiclesByParking(parkingId);
    const categories = {};
    vehicles.forEach(v => {
      const cat = v.category || 'Autre';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
  }

  /* ---- Log activity ---- */
  async logActivity(parkingId, userId, action, details = '') {
    return this.add('activityLog', {
      parkingId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /* ---- Generate invoice number ---- */
  async generateInvoiceNumber(parkingId) {
    const invoices = await this.getInvoicesByParking(parkingId);
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const existing = new Set();
    invoices.forEach(i => {
      if (i.invoiceNumber) {
        existing.add(i.invoiceNumber);
        const match = i.invoiceNumber.match(/FAC-\d+-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    let seq = Math.max(maxSeq + 1, invoices.length + 1);
    let candidate = `FAC-${year}-${String(seq).padStart(5, '0')}`;
    while (existing.has(candidate)) {
      seq++;
      candidate = `FAC-${year}-${String(seq).padStart(5, '0')}`;
    }
    return candidate;
  }

  /* ---- Generate receipt number ---- */
  async generateReceiptNumber(parkingId) {
    const invoices = await this.getInvoicesByParking(parkingId);
    const receipts = invoices.filter(i => i.type === 'receipt');
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const existing = new Set();
    receipts.forEach(r => {
      if (r.invoiceNumber) {
        existing.add(r.invoiceNumber);
        const match = r.invoiceNumber.match(/REC-\d+-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    let seq = Math.max(maxSeq + 1, receipts.length + 1);
    let candidate = `REC-${year}-${String(seq).padStart(5, '0')}`;
    while (existing.has(candidate)) {
      seq++;
      candidate = `REC-${year}-${String(seq).padStart(5, '0')}`;
    }
    return candidate;
  }

  /* ---- Seed demo data ---- */
  async seedDemoData(parkingId, adminId) {
    // Check if data exists
    const vehicles = await this.getVehiclesByParking(parkingId);
    if (vehicles.length > 0) return;

    const brands = ['Toyota', 'Mercedes-Benz', 'BMW', 'Peugeot', 'Renault', 'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Ford', 'Nissan', 'Honda'];
    const models = {
      'Toyota': ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Land Cruiser'],
      'Mercedes-Benz': ['Classe C', 'Classe E', 'GLC', 'GLE', 'Classe A'],
      'BMW': ['Série 3', 'Série 5', 'X3', 'X5', 'Série 1'],
      'Peugeot': ['208', '308', '3008', '508', '2008'],
      'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Arkana'],
      'Audi': ['A3', 'A4', 'Q3', 'Q5', 'A6'],
      'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'T-Roc'],
      'Hyundai': ['Tucson', 'i30', 'Santa Fe', 'Kona', 'i20'],
      'Kia': ['Sportage', 'Ceed', 'Sorento', 'Niro', 'Picanto'],
      'Ford': ['Focus', 'Fiesta', 'Puma', 'Kuga', 'Mustang'],
      'Nissan': ['Qashqai', 'Juke', 'X-Trail', 'Leaf', 'Micra'],
      'Honda': ['Civic', 'CR-V', 'HR-V', 'Jazz', 'Accord']
    };
    const colors = ['Noir', 'Blanc', 'Gris', 'Rouge', 'Bleu', 'Vert', 'Argent', 'Or'];
    const fuels = ['Essence', 'Diesel', 'Hybride', 'Électrique'];
    const categories = ['Berline', 'SUV', 'Citadine', 'Break', 'Coupé', 'Pick-up', '4x4'];
    const statuses = ['available', 'available', 'available', 'available', 'sold', 'rented', 'reserved'];

    // Generate 30 demo vehicles
    for (let i = 0; i < 30; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const modelList = models[brand];
      const model = modelList[Math.floor(Math.random() * modelList.length)];
      const year = 2018 + Math.floor(Math.random() * 8);
      const price = Math.floor(Math.random() * 40000 + 8000);
      const rentalPrice = Math.floor(price / 100 + Math.random() * 50);

      await this.add('vehicles', {
        parkingId,
        brand,
        model,
        year,
        color: colors[Math.floor(Math.random() * colors.length)],
        fuel: fuels[Math.floor(Math.random() * fuels.length)],
        transmission: Math.random() > 0.4 ? 'Automatique' : 'Manuelle',
        mileage: Math.floor(Math.random() * 150000),
        licensePlate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${String(Math.floor(Math.random() * 9000) + 1000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        vin: `WBA${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        purchasePrice: Math.floor(price * 0.7),
        salePrice: price,
        rentalPricePerDay: rentalPrice,
        description: `${brand} ${model} ${year} en excellent état`,
        features: ['Climatisation', 'GPS', 'Bluetooth', 'Caméra de recul'].slice(0, Math.floor(Math.random() * 4) + 1),
        images: [],
        addedBy: adminId
      });
    }

    // Generate demo clients
    const clientNames = [
      { firstName: 'Ahmed', lastName: 'Ben Ali', phone: '+216 55 123 456', email: 'ahmed@email.com' },
      { firstName: 'Fatima', lastName: 'Trabelsi', phone: '+216 55 234 567', email: 'fatima@email.com' },
      { firstName: 'Mohamed', lastName: 'Khelifi', phone: '+216 55 345 678', email: 'mohamed@email.com' },
      { firstName: 'Amira', lastName: 'Sassi', phone: '+216 55 456 789', email: 'amira@email.com' },
      { firstName: 'Youssef', lastName: 'Mrad', phone: '+216 55 567 890', email: 'youssef@email.com' },
      { firstName: 'Leila', lastName: 'Bouazizi', phone: '+216 55 678 901', email: 'leila@email.com' },
      { firstName: 'Omar', lastName: 'Hammami', phone: '+216 55 789 012', email: 'omar@email.com' },
      { firstName: 'Sara', lastName: 'Dridi', phone: '+216 55 890 123', email: 'sara@email.com' }
    ];

    for (const client of clientNames) {
      await this.add('clients', {
        parkingId,
        name: `${client.firstName} ${client.lastName}`,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        address: 'Tunis, Tunisie',
        type: Math.random() > 0.5 ? 'individual' : 'company'
      });
    }

    // Generate demo sales
    const allVehicles = await this.getVehiclesByParking(parkingId);
    const soldVehicles = allVehicles.filter(v => v.status === 'sold');
    const allClients = await this.getClientsByParking(parkingId);

    for (let i = 0; i < Math.min(soldVehicles.length, 5); i++) {
      const vehicle = soldVehicles[i];
      const client = allClients[Math.floor(Math.random() * allClients.length)];
      const saleDate = new Date(2026, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1);
      
      const invoiceNum = await this.generateInvoiceNumber(parkingId);
      
      await this.add('sales', {
        parkingId,
        vehicleId: vehicle.id,
        clientId: client.id,
        clientName: client.name,
        employeeId: adminId,
        date: saleDate.toISOString(),
        totalAmount: vehicle.salePrice,
        paymentMethod: ['Espèces', 'Virement', 'Chèque', 'Carte'][Math.floor(Math.random() * 4)],
        invoiceNumber: invoiceNum,
        notes: ''
      });

      await this.add('invoices', {
        parkingId,
        invoiceNumber: invoiceNum,
        type: 'sale',
        clientId: client.id,
        clientName: client.name,
        vehicleId: vehicle.id,
        vehicleInfo: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
        amount: vehicle.salePrice,
        tax: Math.floor(vehicle.salePrice * 0.19),
        totalAmount: Math.floor(vehicle.salePrice * 1.19),
        date: saleDate.toISOString(),
        status: 'paid',
        paymentMethod: 'Virement'
      });
    }

    // Generate demo rentals
    const rentedVehicles = allVehicles.filter(v => v.status === 'rented');
    for (let i = 0; i < Math.min(rentedVehicles.length, 3); i++) {
      const vehicle = rentedVehicles[i];
      const client = allClients[Math.floor(Math.random() * allClients.length)];
      const startDate = new Date(2026, 9, Math.floor(Math.random() * 15) + 1);
      const days = Math.floor(Math.random() * 14) + 3;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      const total = vehicle.rentalPricePerDay * days;

      await this.add('rentals', {
        parkingId,
        vehicleId: vehicle.id,
        clientId: client.id,
        clientName: client.name,
        employeeId: adminId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
        pricePerDay: vehicle.rentalPricePerDay,
        totalAmount: total,
        deposit: Math.floor(total * 0.3),
        status: 'active',
        paymentMethod: 'Espèces',
        notes: ''
      });
    }

    // Generate demo expenses
    const expenseCategories = ['Entretien', 'Carburant', 'Assurance', 'Loyer', 'Salaires', 'Publicité', 'Fournitures'];
    for (let i = 0; i < 15; i++) {
      const date = new Date(2026, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1);
      await this.add('expenses', {
        parkingId,
        category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
        amount: Math.floor(Math.random() * 3000 + 100),
        description: 'Dépense opérationnelle',
        date: date.toISOString(),
        addedBy: adminId
      });
    }

    // Generate demo parking entry tickets (some currently parked, some completed)
    const samplePlates = ['240 TN 1892', '198 TN 7741', '145 TN 3209', '215 TN 9081', '75-ABC-12'];
    const now = new Date();
    
    // 3 currently parked vehicles
    for (let i = 0; i < 3; i++) {
      const entryDate = new Date(now.getTime() - (Math.floor(Math.random() * 180) + 30) * 60 * 1000); // 30 mins to 3.5 hours ago
      await this.add('parkingTickets', {
        parkingId,
        ticketNumber: `TKT-${now.toISOString().slice(2, 10).replace(/-/g, '')}-000${i + 1}`,
        licensePlate: samplePlates[i],
        clientName: `Conducteur ${i + 1}`,
        clientPhone: '+216 98 ' + (100000 + i * 11111),
        entryTime: entryDate.toISOString(),
        exitTime: null,
        durationMinutes: null,
        tariffHourly: 2.0, // 2 TND per hour
        totalAmount: null,
        status: 'parked',
        paymentMethod: null,
        notes: 'Entrée automatique barrière principale'
      });
    }

    // 2 completed parking tickets
    for (let i = 3; i < 5; i++) {
      const entryDate = new Date(now.getTime() - 240 * 60 * 1000);
      const exitDate = new Date(now.getTime() - 60 * 60 * 1000);
      await this.add('parkingTickets', {
        parkingId,
        ticketNumber: `TKT-${now.toISOString().slice(2, 10).replace(/-/g, '')}-000${i + 1}`,
        licensePlate: samplePlates[i],
        clientName: `Client Visiteur`,
        clientPhone: '+216 25 333 444',
        entryTime: entryDate.toISOString(),
        exitTime: exitDate.toISOString(),
        durationMinutes: 180,
        tariffHourly: 2.0,
        totalAmount: 6.0,
        status: 'completed',
        paymentMethod: 'Espèces',
        notes: 'Sortie validée avec succès'
      });
    }

    // Generate demo parking physical slots (Plan interactif 2D)
    const zones = ['A', 'B', 'C'];
    let slotIdx = 1;
    for (const z of zones) {
      for (let num = 1; num <= 10; num++) {
        const slotCode = `${z}${String(num).padStart(2, '0')}`;
        let type = 'standard';
        if (num === 1) type = 'handicap';
        else if (num === 2) type = 'electric';
        else if (num === 10) type = 'vip';

        let status = 'free';
        let currentPlate = null;
        if (slotIdx <= 3) {
          status = 'occupied';
          currentPlate = samplePlates[slotIdx - 1];
        } else if (slotIdx === 4 || slotIdx === 5) {
          status = 'reserved';
        }

        await this.add('parkingSlots', {
          parkingId,
          slotNumber: slotCode,
          level: z === 'C' ? 'Sous-Sol -1' : 'RDC / Niveau 0',
          zone: z,
          type,
          status,
          currentPlate,
          notes: ''
        });
        slotIdx++;
      }
    }

    // Generate demo subscriptions (Abonnements)
    await this.add('subscriptions', {
      parkingId,
      subscriberName: 'Sami Mansour',
      subscriberPhone: '+216 20 888 999',
      subscriberEmail: 'sami.mansour@gmail.com',
      licensePlate: '215 TN 9081',
      badgeNumber: 'RFID-VIP-0084',
      type: 'monthly',
      price: 120,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      status: 'active',
      autoRenew: true,
      notes: 'Place réservée A10 VIP'
    });

    await this.add('subscriptions', {
      parkingId,
      subscriberName: 'Société Carrefour Médical',
      subscriberPhone: '+216 71 456 789',
      subscriberEmail: 'contact@carrefourmed.tn',
      licensePlate: '175 TN 4410',
      badgeNumber: 'RFID-CORP-0112',
      type: 'annual',
      price: 1200,
      startDate: new Date(now.getFullYear(), 0, 1).toISOString(),
      endDate: new Date(now.getFullYear(), 11, 31).toISOString(),
      status: 'active',
      autoRenew: true,
      notes: 'Contrat Entreprise 2026'
    });

    // Generate demo Security plate lists
    await this.add('plateLists', {
      parkingId,
      licensePlate: '215 TN 9081',
      type: 'whitelist_vip',
      ownerName: 'Dr. Sami Mansour (VIP Abonné)',
      reason: 'Pass VIP permanent - Accès prioritaire',
      createdAt: now.toISOString()
    });

    await this.add('plateLists', {
      parkingId,
      licensePlate: '999 TN 9999',
      type: 'blacklist_alert',
      ownerName: 'Non identifié',
      reason: 'Véhicule signalé pour impayé récidiviste & comportement dangereux',
      createdAt: now.toISOString()
    });

    // Generate demo cash register session
    await this.add('cashSessions', {
      parkingId,
      userId: adminId,
      openedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      closedAt: null,
      startingCash: 200,
      cashSalesTotal: 0,
      cashRentalsTotal: 150,
      cashTicketsTotal: 74,
      expectedCash: 424,
      actualCash: null,
      discrepancy: null,
      status: 'open',
      notes: 'Shift matin - Caisse Barrière Principale'
    });

    // Generate demo staff attendance
    await this.add('attendance', {
      parkingId,
      userId: adminId,
      date: now.toISOString().split('T')[0],
      checkIn: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      checkOut: null,
      durationMinutes: 480,
      status: 'present',
      notes: 'Prise de poste 08:00'
    });

    // Generate demo Parking Rates
    await this.add('parkingRates', {
      parkingId,
      currency: 'TND',
      freeGraceMinutes: 15,
      rateFirstHour: 2.0,
      rateAdditionalHour: 1.5,
      dailyCap: 15.0,
      nightFlatRate: 8.0,
      weekendFlatRate: 25.0,
      lostTicketFee: 30.0,
      overstayThresholdHours: 24,
      overstayDailySurcharge: 10.0,
      exitGraceMinutes: 15,
      updatedAt: now.toISOString()
    });

    // Generate initial Audit Trail records
    await this.add('auditLogs', {
      parkingId,
      userId: adminId,
      userName: 'Mohamed Ben Salah',
      userRole: 'admin',
      actionType: 'SYSTEM_INIT',
      details: 'Initialisation de l\'infrastructure du parking et des bornes LPR',
      metadata: { version: '2.0-PRO' },
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    });

    await this.add('auditLogs', {
      parkingId,
      userId: adminId,
      userName: 'Mohamed Ben Salah',
      userRole: 'admin',
      actionType: 'RATE_UPDATE',
      details: 'Configuration de la grille tarifaire standard : Franchise 15min, 1ère heure 2 DT, Plafond 24h 15 DT',
      metadata: { dailyCap: 15, firstHour: 2 },
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    });

    await this.add('auditLogs', {
      parkingId,
      userId: adminId,
      userName: 'Mohamed Ben Salah',
      userRole: 'admin',
      actionType: 'BARRIER_MANUAL_OPEN',
      details: 'Ouverture manuelle barrière Borne 1 pour passage convoi travaux',
      metadata: { gateId: 'GATE_ENTRY_1' },
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    });

    // Generate demo vehicle maintenance log entries
    const sampleVehicles = (await this.getVehiclesByParking(parkingId)).slice(0, 6);
    const maintTypes = ['oil_change', 'revision', 'inspection', 'brakes', 'tires'];
    const garages = ['Bosch Service Charguia', 'Garage Express Tunis', 'Atelier Concessionnaire', 'Contrôle Technique Ariana'];

    for (let i = 0; i < sampleVehicles.length; i++) {
      const v = sampleVehicles[i];
      const mType = maintTypes[i % maintTypes.length];
      const daysAgo = Math.floor(Math.random() * 45) + 5;
      const mDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dueDays = i === 1 ? 12 : i === 2 ? -3 : 180; // Some upcoming and overdue
      const dueDate = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await this.add('vehicleMaintenance', {
        parkingId,
        vehicleId: v.id,
        type: mType,
        date: mDate,
        mileage: Math.max(1000, (v.mileage || 50000) - 2500),
        cost: Math.floor(Math.random() * 350 + 120),
        dueMileage: (v.mileage || 50000) + 10000,
        dueDate: dueDate,
        garage: garages[Math.floor(Math.random() * garages.length)],
        status: i === 1 ? 'in_progress' : i === 2 ? 'planned' : 'completed',
        description: `Contrôle périodique et entretien certifié pour ${v.brand} ${v.model}`,
        createdAt: mDate
      });
    }

    await this.logActivity(parkingId, adminId, 'seed_data', 'Données de démonstration complètes générées (Slots, Abonnements, Caisse, Tarifs, Audit, Maintenance)');
  }

  // ============================================================
  // DATABASE HEALTH & INTEGRITY CHECK
  // ============================================================
  async checkIntegrity(parkingId = null) {
    await this.ready;
    const report = {
      isHealthy: true,
      score: 100,
      timestamp: new Date().toISOString(),
      counts: {},
      issues: []
    };

    const stores = [
      'parkings', 'users', 'vehicles', 'sales', 'rentals', 'invoices',
      'expenses', 'clients', 'parkingTickets', 'parkingSlots',
      'subscriptions', 'attendance', 'cashSessions', 'plateLists',
      'auditLogs', 'parkingRates', 'plateCorrections', 'vehicleMaintenance', 'rentalInspections'
    ];

    for (const s of stores) {
      try {
        const all = await this.getAll(s);
        report.counts[s] = all.length;
      } catch (e) {
        report.counts[s] = 0;
        report.issues.push(`Erreur de lecture du store "${s}": ${e.message}`);
        report.score -= 10;
      }
    }

    // Check broken references for vehicles
    const vehicles = await this.getAll('vehicles');
    const vehicleIds = new Set(vehicles.map(v => v.id));

    const sales = await this.getAll('sales');
    const orphanedSales = sales.filter(s => s.vehicleId && !vehicleIds.has(s.vehicleId));
    if (orphanedSales.length > 0) {
      report.issues.push(`${orphanedSales.length} vente(s) font référence à un véhicule inexistant`);
      report.score -= 5;
    }

    const rentals = await this.getAll('rentals');
    const orphanedRentals = rentals.filter(r => r.vehicleId && !vehicleIds.has(r.vehicleId));
    if (orphanedRentals.length > 0) {
      report.issues.push(`${orphanedRentals.length} location(s) font référence à un véhicule inexistant`);
      report.score -= 5;
    }

    const tickets = await this.getAll('parkingTickets');
    const ticketsWithoutPlate = tickets.filter(t => !t.licensePlate);
    if (ticketsWithoutPlate.length > 0) {
      report.issues.push(`${ticketsWithoutPlate.length} ticket(s) de parking sans immatriculation`);
      report.score -= 2;
    }

    report.score = Math.max(0, Math.min(100, report.score));
    report.isHealthy = report.issues.length === 0;
    return report;
  }

  // ============================================================
  // FULL DATABASE BACKUP & RESTORE (ALL STORES)
  // ============================================================
  async exportFullBackup(parkingId = null) {
    await this.ready;
    const stores = [
      'parkings', 'users', 'vehicles', 'sales', 'rentals', 'invoices',
      'expenses', 'clients', 'parkingTickets', 'parkingSlots',
      'subscriptions', 'attendance', 'cashSessions', 'plateLists',
      'auditLogs', 'parkingRates', 'plateCorrections', 'vehicleMaintenance',
      'rentalInspections', 'settings'
    ];

    const backupData = {
      format: 'monparking-full-backup',
      version: '2.1',
      exportedAt: new Date().toISOString(),
      parkingId: parkingId || null,
      totalRecords: 0,
      stores: {}
    };

    for (const s of stores) {
      try {
        let items = await this.getAll(s);
        if (parkingId && s !== 'parkings' && s !== 'settings') {
          items = items.filter(i => !i.parkingId || i.parkingId === parkingId);
        }
        backupData.stores[s] = items;
        backupData.totalRecords += items.length;
      } catch (e) {
        backupData.stores[s] = [];
      }
    }

    return backupData;
  }

  async importFullBackup(backupObj) {
    await this.ready;
    if (!backupObj || !backupObj.stores) {
      throw new Error('Fichier de sauvegarde invalide (structure stores manquante)');
    }

    let importedCount = 0;
    const storeNames = Object.keys(backupObj.stores);

    for (const s of storeNames) {
      if (!this.db.objectStoreNames.contains(s)) continue;
      const items = backupObj.stores[s] || [];
      for (const item of items) {
        try {
          await this.update(s, item);
          importedCount++;
        } catch (e) {
          // Fallback to add if update fails
          try { await this.add(s, item); importedCount++; } catch (err) {}
        }
      }
    }

    return { success: true, importedRecords: importedCount };
  }

  // ============================================================
  // AES-256-GCM ENCRYPTED BACKUP & RESTORE (PBKDF2 + Web Crypto)
  // ============================================================
  async exportEncryptedBackup(password, parkingId = null) {
    if (!password || password.length < 4) {
      throw new Error('Le mot de passe de chiffrement doit comporter au moins 4 caractères.');
    }

    const rawBackup = await this.exportFullBackup(parkingId);
    const jsonStr = JSON.stringify(rawBackup);
    const enc = new TextEncoder();
    const dataBytes = enc.encode(jsonStr);

    // Generate random Salt (16 bytes) and IV (12 bytes for AES-GCM)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Encrypt payload
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBytes
    );

    // Hex encode helpers
    const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      format: 'monparking-encrypted-backup',
      version: '2.1',
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 100000,
      salt: toHex(salt),
      iv: toHex(iv),
      ciphertext: toHex(cipherBuffer),
      recordCount: rawBackup.totalRecords,
      createdAt: new Date().toISOString()
    };
  }

  async importEncryptedBackup(encryptedPackage, password) {
    if (!encryptedPackage || encryptedPackage.format !== 'monparking-encrypted-backup') {
      throw new Error('Format de sauvegarde chiffrée non reconnu.');
    }
    if (!password) {
      throw new Error('Mot de passe requis pour déchiffrer la sauvegarde.');
    }

    const fromHex = (hex) => {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    const salt = fromHex(encryptedPackage.salt);
    const iv = fromHex(encryptedPackage.iv);
    const ciphertext = fromHex(encryptedPackage.ciphertext);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: encryptedPackage.iterations || 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      const dec = new TextDecoder();
      const jsonStr = dec.decode(decrypted);
      const backupObj = JSON.parse(jsonStr);
      return await this.importFullBackup(backupObj);
    } catch (e) {
      throw new Error('Mot de passe incorrect ou sauvegarde corrompue.');
    }
  }

  // ============================================================
  // VEHICLE MAINTENANCE & INSPECTION HELPERS
  // ============================================================
  async getMaintenanceByVehicle(vehicleId) {
    const list = await this.getByIndex('vehicleMaintenance', 'vehicleId', vehicleId);
    return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }

  async getMaintenanceByParking(parkingId) {
    const list = await this.getByIndex('vehicleMaintenance', 'parkingId', parkingId);
    return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }

  async getInspectionsByRental(rentalId) {
    const list = await this.getByIndex('rentalInspections', 'rentalId', rentalId);
    return list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }
}

// Global database instance
window.DB = new ParkingDatabase();
var DB = window.DB;
