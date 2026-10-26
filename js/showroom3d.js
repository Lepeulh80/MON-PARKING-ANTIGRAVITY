/* ========================================================================
   MON PARKING - 3D Showroom & Interactive Car Visualizer
   Powered by Three.js procedural car modeling, lighting & real-time paint
   ======================================================================== */

const Showroom3D = {
  scene: null,
  camera: null,
  renderer: null,
  carGroup: null,
  wheels: [],
  headlights: [],
  headlightsOn: true,
  autoRotate: true,
  currentVehicle: null,
  animationFrameId: null,
  carColor: 0x6c5ce7,
  isMouseDown: false,
  previousMousePosition: { x: 0, y: 0 },

  init(containerId, vehicle = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (typeof THREE === 'undefined') {
      console.warn('Three.js is not loaded yet');
      return;
    }

    this.currentVehicle = vehicle;
    this.cleanUp();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.03);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(4.5, 2.2, 5.5);
    this.camera.lookAt(0, 0.6, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Lighting setup (Studio setup)
    this.setupLighting();

    // Floor / Studio Grid setup
    this.setupStudioFloor();

    // Build 3D Car Model
    this.buildCarModel(vehicle);

    // Event listeners for Orbit Control
    this.setupControls(container);

    // Start render loop
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (this.autoRotate && this.carGroup && !this.isMouseDown) {
        this.carGroup.rotation.y += 0.007;
      }

      this.renderer.render(this.scene, this.camera);
    };
    // Remove previous resize listener if any
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = () => this.onResize(container);
    window.addEventListener('resize', this.resizeHandler);
  },

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Key Light (Main spot light from top-front)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Rim light / Fill light (Neon purple/cyan glow for futuristic look)
    const rimLight = new THREE.DirectionalLight(0x6c5ce7, 1.2);
    rimLight.position.set(-6, 4, -5);
    this.scene.add(rimLight);

    const bottomGlow = new THREE.PointLight(0x00cec9, 0.8, 10);
    bottomGlow.position.set(0, 0.1, 0);
    this.scene.add(bottomGlow);
  },

  setupStudioFloor() {
    // Reflective floor plane
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.25,
      metalness: 0.6
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Radial showroom ring
    const ringGeo = new THREE.RingGeometry(2.8, 3.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6c5ce7, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // Outer subtle ring
    const ring2Geo = new THREE.RingGeometry(4.2, 4.25, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x00cec9, side: THREE.DoubleSide, opacity: 0.4, transparent: true });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    this.scene.add(ring2);
  },

  buildCarModel(vehicle) {
    this.carGroup = new THREE.Group();
    this.wheels = [];
    this.headlights = [];

    // Parse car color if vehicle has one
    let carColorHex = 0x6c5ce7;
    if (vehicle && vehicle.color) {
      const c = vehicle.color.toLowerCase();
      if (c.includes('rouge')) carColorHex = 0xd63031;
      else if (c.includes('noir')) carColorHex = 0x1e272e;
      else if (c.includes('blanc')) carColorHex = 0xf5f6fa;
      else if (c.includes('bleu')) carColorHex = 0x0984e3;
      else if (c.includes('gris') || c.includes('argent')) carColorHex = 0x718093;
      else if (c.includes('vert')) carColorHex = 0x00b894;
      else if (c.includes('or')) carColorHex = 0xf39c12;
    }
    this.carColor = carColorHex;

    // Body Material: Metallic car paint
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.carColor,
      roughness: 0.18,
      metalness: 0.85
    });

    // Glass Material
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.75
    });

    // Dark trim Material
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.5,
      metalness: 0.2
    });

    // Chrome Material
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.95
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(3.6, 0.45, 1.7);
    const chassis = new THREE.Mesh(chassisGeo, this.bodyMaterial);
    chassis.position.y = 0.45;
    chassis.castShadow = true;
    this.carGroup.add(chassis);

    // 2. Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.5, 1.45);
    const cabin = new THREE.Mesh(cabinGeo, this.bodyMaterial);
    cabin.position.set(-0.2, 0.88, 0);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // 3. Windshield Front
    const windshieldGeo = new THREE.BoxGeometry(0.7, 0.45, 1.4);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0.75, 0.78, 0);
    windshield.rotation.z = -Math.PI / 6.5;
    this.carGroup.add(windshield);

    // 4. Rear Window
    const rearGlassGeo = new THREE.BoxGeometry(0.6, 0.45, 1.4);
    const rearGlass = new THREE.Mesh(rearGlassGeo, glassMaterial);
    rearGlass.position.set(-1.15, 0.78, 0);
    rearGlass.rotation.z = Math.PI / 6.5;
    this.carGroup.add(rearGlass);

    // 5. Hood & Front Grille
    const hoodGeo = new THREE.BoxGeometry(1.1, 0.15, 1.6);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(1.25, 0.62, 0);
    hood.rotation.z = -0.06;
    this.carGroup.add(hood);

    const grilleGeo = new THREE.BoxGeometry(0.1, 0.25, 1.2);
    const grille = new THREE.Mesh(grilleGeo, trimMaterial);
    grille.position.set(1.81, 0.4, 0);
    this.carGroup.add(grille);

    // 6. Spoiler (Aerodynamic sport wing)
    const wingGeo = new THREE.BoxGeometry(0.35, 0.05, 1.6);
    const wing = new THREE.Mesh(wingGeo, trimMaterial);
    wing.position.set(-1.75, 0.95, 0);
    this.carGroup.add(wing);

    const stand1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), trimMaterial);
    stand1.position.set(-1.75, 0.82, 0.5);
    const stand2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), trimMaterial);
    stand2.position.set(-1.75, 0.82, -0.5);
    this.carGroup.add(stand1, stand2);

    // 7. Wheels & Rims
    const wheelPositions = [
      { x: 1.15, z: 0.88 },
      { x: 1.15, z: -0.88 },
      { x: -1.15, z: 0.88 },
      { x: -1.15, z: -0.88 }
    ];

    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16);

    wheelPositions.forEach(pos => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, 0.36, pos.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      wheelHub.add(tire);

      const rim = new THREE.Mesh(rimGeo, chromeMaterial);
      rim.rotation.x = Math.PI / 2;
      wheelHub.add(rim);

      this.wheels.push(wheelHub);
      this.carGroup.add(wheelHub);
    });

    // 8. Headlights (LED projectors)
    const headlightGeo = new THREE.BoxGeometry(0.12, 0.12, 0.3);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0x81ecec });

    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    leftHeadlight.position.set(1.8, 0.55, 0.6);
    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    rightHeadlight.position.set(1.8, 0.55, -0.6);
    this.carGroup.add(leftHeadlight, rightHeadlight);

    // Headlight Spotlights
    const spotL = new THREE.SpotLight(0xa8ffea, 2, 8, Math.PI / 5, 0.4);
    spotL.position.set(1.9, 0.55, 0.6);
    spotL.target.position.set(6, 0, 0.6);
    const spotR = new THREE.SpotLight(0xa8ffea, 2, 8, Math.PI / 5, 0.4);
    spotR.position.set(1.9, 0.55, -0.6);
    spotR.target.position.set(6, 0, -0.6);
    this.scene.add(spotL, spotL.target, spotR, spotR.target);
    this.headlights = [spotL, spotR];

    // 9. Taillights (Neon red)
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });
    const leftTaillight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), taillightMat);
    leftTaillight.position.set(-1.81, 0.6, 0.6);
    const rightTaillight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), taillightMat);
    rightTaillight.position.set(-1.81, 0.6, -0.6);
    this.carGroup.add(leftTaillight, rightTaillight);

    this.scene.add(this.carGroup);
  },

  setupControls(container) {
    container.onmousedown = (e) => {
      this.isMouseDown = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    window.onmouseup = () => {
      this.isMouseDown = false;
    };

    container.onmousemove = (e) => {
      if (!this.isMouseDown || !this.carGroup) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.carGroup.rotation.y += deltaX * 0.01;

      // Vertical camera subtle elevation
      this.camera.position.y = Math.max(1.0, Math.min(4.5, this.camera.position.y - deltaY * 0.01));
      this.camera.lookAt(0, 0.6, 0);

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    // Touch controls for mobile / tablets
    container.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        this.isMouseDown = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.ontouchend = () => {
      this.isMouseDown = false;
    };

    container.ontouchmove = (e) => {
      if (!this.isMouseDown || !this.carGroup || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      this.carGroup.rotation.y += deltaX * 0.015;

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    // Zoom on wheel
    container.onwheel = (e) => {
      e.preventDefault();
      const zoom = e.deltaY * 0.005;
      const newZ = this.camera.position.z + zoom;
      if (newZ > 3.0 && newZ < 9.0) {
        this.camera.position.z = newZ;
      }
    };
  },

  changeColor(hexColor) {
    this.carColor = hexColor;
    if (this.bodyMaterial) {
      this.bodyMaterial.color.setHex(hexColor);
    }
  },

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    this.headlights.forEach(hl => {
      hl.intensity = this.headlightsOn ? 2.0 : 0;
    });
    return this.headlightsOn;
  },

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  },

  onResize(container) {
    if (!this.renderer || !this.camera || !container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  cleanUp() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      if (typeof this.scene.clear === 'function') {
        this.scene.clear();
      }
      this.scene = null;
    }

    if (this.renderer) {
      if (this.renderer.domElement) {
        this.renderer.domElement.remove();
      }
      if (typeof this.renderer.dispose === 'function') {
        this.renderer.dispose();
      }
      this.renderer = null;
    }

    this.carGroup = null;
    this.wheels = [];
    this.headlights = [];
    this.camera = null;
  },

  openShowroomModal(vehicle) {
    const modalHtml = `
      <div style="position:relative;width:100%;height:520px;border-radius:var(--radius-lg);overflow:hidden;background:#0a0e1a">
        <div id="three-showroom-canvas" style="width:100%;height:100%;cursor:grab"></div>

        <!-- Floating HUD Overlays -->
        <div style="position:absolute;top:16px;left:16px;background:rgba(10,14,26,0.85);backdrop-filter:blur(10px);padding:1rem 1.25rem;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.1);max-width:320px;pointer-events:none">
          <div style="font-size:0.75rem;text-transform:uppercase;color:var(--primary-light);font-weight:700;letter-spacing:1px">3D STUDIO INSPECTOR</div>
          <h3 style="margin:4px 0 0;font-size:1.3rem;color:#fff">${vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Supercar GT'}</h3>
          <p style="margin:2px 0 8px;font-size:0.85rem;color:var(--text-muted)">${vehicle ? `${vehicle.year} · ${vehicle.category || 'Berline'}` : 'Concept 2026'}</p>
          
          <div style="display:flex;gap:1.5rem;margin-top:6px;font-size:0.85rem">
            <div>
              <div style="color:var(--text-muted);font-size:0.75rem">Prix Vente</div>
              <strong style="color:var(--accent-green);font-size:1rem">${vehicle ? Utils.formatCurrency(vehicle.price) : '95 000 TND'}</strong>
            </div>
            <div>
              <div style="color:var(--text-muted);font-size:0.75rem">Location/j</div>
              <strong style="color:var(--accent-cyan);font-size:1rem">${vehicle ? Utils.formatCurrency(vehicle.rentalPrice || 80) : '120 TND'}</strong>
            </div>
          </div>
        </div>

        <!-- Showroom Interactive Toolbar -->
        <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(10,14,26,0.9);backdrop-filter:blur(12px);padding:0.6rem 1.2rem;border-radius:30px;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;gap:1rem;z-index:10">
          <!-- Paint Color Palette -->
          <div style="display:flex;gap:6px;align-items:center;border-right:1px solid rgba(255,255,255,0.2);padding-right:12px">
            <span style="font-size:0.75rem;color:var(--text-muted);margin-right:2px">Teinte:</span>
            <button onclick="Showroom3D.changeColor(0x6c5ce7)" style="width:20px;height:20px;border-radius:50%;background:#6c5ce7;border:2px solid #fff;cursor:pointer" title="Violet Cyber"></button>
            <button onclick="Showroom3D.changeColor(0xd63031)" style="width:20px;height:20px;border-radius:50%;background:#d63031;border:2px solid transparent;cursor:pointer" title="Rouge Sport"></button>
            <button onclick="Showroom3D.changeColor(0x0984e3)" style="width:20px;height:20px;border-radius:50%;background:#0984e3;border:2px solid transparent;cursor:pointer" title="Bleu Électrique"></button>
            <button onclick="Showroom3D.changeColor(0x2d3436)" style="width:20px;height:20px;border-radius:50%;background:#2d3436;border:2px solid transparent;cursor:pointer" title="Noir Carbone"></button>
            <button onclick="Showroom3D.changeColor(0xf5f6fa)" style="width:20px;height:20px;border-radius:50%;background:#f5f6fa;border:2px solid transparent;cursor:pointer" title="Blanc Nacre"></button>
            <button onclick="Showroom3D.changeColor(0x00b894)" style="width:20px;height:20px;border-radius:50%;background:#00b894;border:2px solid transparent;cursor:pointer" title="Vert Émeraude"></button>
          </div>

          <!-- Controls -->
          <button id="btn-toggle-lights" class="btn btn-ghost btn-sm" onclick="const on = Showroom3D.toggleHeadlights(); this.innerHTML = on ? '<i class=\\'fas fa-lightbulb\\'></i> Feux ON' : '<i class=\\'far fa-lightbulb\\'></i> Feux OFF'">
            <i class="fas fa-lightbulb"></i> Feux ON
          </button>

          <button id="btn-toggle-rotate" class="btn btn-ghost btn-sm" onclick="const r = Showroom3D.toggleAutoRotate(); this.innerHTML = r ? '<i class=\\'fas fa-sync fa-spin\\'></i> Rotation' : '<i class=\\'fas fa-pause\\'></i> Arrêt'">
            <i class="fas fa-sync fa-spin"></i> Rotation
          </button>
        </div>
      </div>
    `;

    Utils.showModal(`Visualiseur 3D Showroom`, modalHtml, {
      size: 'modal-lg',
      confirmText: 'Fermer',
      hideCancel: true
    }).then(() => {
      this.cleanUp();
    });

    // Initialize 3D Canvas after modal attaches to DOM
    setTimeout(() => {
      this.init('three-showroom-canvas', vehicle);
    }, 150);
  }
};
