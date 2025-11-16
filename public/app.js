// Configuration avec votre token Mapbox
const CONFIG = {
    MAPBOX_TOKEN: "pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21pMHpzanhzMTBnNDJpcHl5amp3Y3UxMSJ9.vBVUzayPx57ti_dbj0LuCw",
    DEFAULT_CENTER: [11.5021, 3.8480], // [lng, lat] - Centre du Cameroun
    DEFAULT_ZOOM: 6,
    MAP_STYLES: [
        'mapbox://styles/mapbox/streets-v12',
        'mapbox://styles/mapbox/outdoors-v12',
        'mapbox://styles/mapbox/light-v11',
        'mapbox://styles/mapbox/dark-v11',
        'mapbox://styles/mapbox/satellite-streets-v12'
    ]
};

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.currentStyleIndex = 0;
        this.isMapLoaded = false;
    }

    init(containerId) {
        return new Promise((resolve, reject) => {
            // Vérifier que Mapbox GL JS est chargé
            if (typeof mapboxgl === 'undefined') {
                reject(new Error('Mapbox GL JS non chargé'));
                return;
            }

            // Vérifier le token
            if (!CONFIG.MAPBOX_TOKEN || CONFIG.MAPBOX_TOKEN === 'votre_token_ici') {
                this.showTokenError(containerId);
                reject(new Error('Token Mapbox non configuré'));
                return;
            }

            mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

            try {
                this.map = new mapboxgl.Map({
                    container: containerId,
                    style: CONFIG.MAP_STYLES[this.currentStyleIndex],
                    center: CONFIG.DEFAULT_CENTER,
                    zoom: CONFIG.DEFAULT_ZOOM,
                    attributionControl: true
                });

                // Contrôles de navigation
                this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

                // Gestionnaire d'événements de chargement
                this.map.on('load', () => {
                    console.log('✅ Carte Mapbox chargée avec succès');
                    this.isMapLoaded = true;
                    
                    // Rendre la carte visible
                    const mapElement = document.getElementById(containerId);
                    mapElement.style.opacity = '1';
                    mapElement.style.visibility = 'visible';
                    
                    resolve(this.map);
                });

                // Gestionnaire d'erreurs
                this.map.on('error', (e) => {
                    console.error('❌ Erreur Mapbox:', e);
                    this.showMapError(containerId, e.error);
                    reject(e.error);
                });

                // Gestionnaire des ressources chargées
                this.map.on('load', () => {
                    console.log('🗺️ Toutes les ressources de la carte sont chargées');
                });

            } catch (error) {
                console.error('❌ Erreur lors de la création de la carte:', error);
                this.showMapError(containerId, error.message);
                reject(error);
            }
        });
    }

    showTokenError(containerId) {
        const mapElement = document.getElementById(containerId);
        mapElement.innerHTML = `
            <div class="map-error">
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Token Mapbox Manquant</h3>
                    <p>Le token Mapbox n'est pas configuré. Veuillez contacter l'administrateur.</p>
                    <button onclick="location.reload()" class="btn-retry">
                        <i class="fas fa-redo"></i> Réessayer
                    </button>
                </div>
            </div>
        `;
    }

    showMapError(containerId, errorMessage) {
        const mapElement = document.getElementById(containerId);
        mapElement.innerHTML = `
            <div class="map-error">
                <div class="error-content">
                    <i class="fas fa-map-marked-alt"></i>
                    <h3>Carte Non Disponible</h3>
                    <p>Impossible de charger la carte. Erreur: ${errorMessage || 'Inconnue'}</p>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn-retry">
                            <i class="fas fa-redo"></i> Réessayer
                        </button>
                        <button onclick="window.app?.loadDistributeurs()" class="btn-continue">
                            <i class="fas fa-play"></i> Continuer sans carte
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateDistributeurs(distributeurs) {
        if (!this.isMapLoaded) {
            console.warn('Carte non chargée, impossible de mettre à jour les marqueurs');
            return;
        }

        this.clearMarkers();
        
        distributeurs.forEach(distributeur => {
            this.addDistributeurMarker(distributeur);
        });

        console.log(`📍 ${distributeurs.length} distributeurs affichés sur la carte`);
    }

    addDistributeurMarker(distributeur) {
        try {
            const el = document.createElement('div');
            el.className = 'distributeur-marker';
            el.innerHTML = this.getMarkerHTML(distributeur);
            
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.app && typeof window.app.showDistributeurDetails === 'function') {
                    window.app.showDistributeurDetails(distributeur);
                }
            });

            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom'
            })
            .setLngLat([distributeur.longitude, distributeur.latitude])
            .addTo(this.map);

            this.markers.push(marker);

        } catch (error) {
            console.error('Erreur création marqueur:', error);
        }
    }

    getMarkerHTML(distributeur) {
        const typeIcons = {
            'nourriture': 'fa-utensils',
            'boissons': 'fa-wine-bottle',
            'billets': 'fa-ticket-alt',
            'divers': 'fa-shopping-cart'
        };

        const typeColors = {
            'nourriture': '#e74c3c',
            'boissons': '#3498db',
            'billets': '#9b59b6',
            'divers': '#f39c12'
        };

        const icon = typeIcons[distributeur.type] || 'fa-map-marker-alt';
        const color = typeColors[distributeur.type] || '#2c3e50';
        
        return `
            <div class="marker-content" style="border-color: ${color}">
                <div class="marker-icon" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                ${distributeur.distance ? 
                    `<div class="marker-distance">${distributeur.distance.toFixed(1)}km</div>` : 
                    ''
                }
            </div>
        `;
    }

    addUserMarker(lat, lng) {
        if (!this.isMapLoaded) return;

        this.clearUserMarker();

        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = '<i class="fas fa-user"></i>';

        this.userMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);
    }

    clearUserMarker() {
        if (this.userMarker) {
            this.userMarker.remove();
            this.userMarker = null;
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            try {
                marker.remove();
            } catch (error) {
                console.warn('Erreur suppression marqueur:', error);
            }
        });
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        if (!this.isMapLoaded) return;

        this.map.flyTo({
            center: [lng, lat],
            zoom: zoom,
            duration: 2000,
            essential: true
        });
    }

    setStyle(styleIndex) {
        if (!this.isMapLoaded) return;

        this.currentStyleIndex = styleIndex % CONFIG.MAP_STYLES.length;
        this.map.setStyle(CONFIG.MAP_STYLES[this.currentStyleIndex]);
        
        // Réappliquer les marqueurs après changement de style
        this.map.once('styledata', () => {
            setTimeout(() => {
                if (window.app && window.app.currentDistributeurs) {
                    this.updateDistributeurs(window.app.currentDistributeurs);
                }
            }, 500);
        });
    }

    getCurrentStyleIndex() {
        return this.currentStyleIndex;
    }

    getMapStyles() {
        return CONFIG.MAP_STYLES;
    }
}

class API {
    constructor() {
        this.baseURL = window.location.origin;
    }

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async getDistributeurs(filters = {}) {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value);
            }
        });

        const endpoint = `/api/distributeurs${params.toString() ? `?${params}` : ''}`;
        return await this.request(endpoint);
    }

    async getDistributeur(id) {
        return await this.request(`/api/distributeurs/${id}`);
    }

    async getConfig() {
        return await this.request('/api/config');
    }

    async healthCheck() {
        return await this.request('/api/health');
    }
}

class CTLLoketApp {
    constructor() {
        this.mapManager = new MapManager();
        this.api = new API();
        this.currentDistributeurs = [];
        this.userPosition = null;
        this.selectedDistributeur = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initialisation de CTL-LOKET...');
            
            // Vérifier la santé de l'API
            await this.api.healthCheck();
            console.log('✅ API santé vérifiée');

            // Initialiser les événements
            this.bindEvents();
            console.log('✅ Événements liés');

            // Initialiser la carte
            await this.mapManager.init('map');
            console.log('✅ Carte initialisée');

            // Charger les distributeurs
            await this.loadDistributeurs();
            console.log('✅ Distributeurs chargés');

            // Configurer le thème
            this.setupTheme();
            console.log('✅ Thème configuré');

            this.isInitialized = true;
            console.log('🎉 Application CTL-LOKET initialisée avec succès');

            // Afficher un message de bienvenue
            this.showNotification('CTL-LOKET est prêt !', 'success');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors du démarrage de l\'application');
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debounce(() => this.handleSearch(e.target.value), 300)();
            });
        }

        // Filtres
        const typeFilter = document.getElementById('typeFilter');
        const villeFilter = document.getElementById('villeFilter');
        
        if (typeFilter) typeFilter.addEventListener('change', () => this.handleFilter());
        if (villeFilter) villeFilter.addEventListener('change', () => this.handleFilter());

        // Localisation
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) locateBtn.addEventListener('click', () => this.locateUser());

        // Thème
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());

        // Admin
        const adminAccess = document.getElementById('adminAccess');
        if (adminAccess) adminAccess.addEventListener('click', () => this.showAdminLogin());

        // Modal distributeur
        const closeButtons = document.querySelectorAll('.close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        const closeNav = document.getElementById('closeNav');
        if (closeNav) closeNav.addEventListener('click', () => this.hideNavigation());

        // Navigation vers distributeur
        const navigateBtn = document.getElementById('navigateBtn');
        if (navigateBtn) navigateBtn.addEventListener('click', () => this.startNavigation());

        // Admin Login
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        // Map Controls
        const mapStyleBtn = document.getElementById('mapStyleBtn');
        if (mapStyleBtn) mapStyleBtn.addEventListener('click', () => this.cycleMapStyle());

        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Fermer modals en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });

        // Gestionnaire d'erreurs global
        window.addEventListener('error', (e) => {
            console.error('Erreur globale:', e.error);
        });

        console.log('✅ Tous les événements sont liés');
    }

    async loadDistributeurs(filters = {}) {
        try {
            this.showLoading('Chargement des distributeurs...');
            
            const response = await this.api.getDistributeurs(filters);

            if (response.success) {
                this.currentDistributeurs = response.data;
                this.mapManager.updateDistributeurs(this.currentDistributeurs);
                this.updateResultsList(this.currentDistributeurs);
                this.hideLoading();

                if (this.currentDistributeurs.length === 0) {
                    this.showNotification('Aucun distributeur trouvé', 'info');
                } else {
                    this.showNotification(`${this.currentDistributeurs.length} distributeurs chargés`, 'success');
                }
            } else {
                throw new Error(response.error || 'Erreur inconnue');
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showError('Erreur lors du chargement des distributeurs');
            this.hideLoading();
        }
    }

    updateResultsList(distributeurs) {
        const container = document.getElementById('resultsList');
        if (!container) return;

        container.innerHTML = '';

        if (distributeurs.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Aucun distributeur trouvé</p>
                    <button onclick="window.app.loadDistributeurs()" class="btn-retry">
                        Afficher tous les distributeurs
                    </button>
                </div>
            `;
            return;
        }

        distributeurs.forEach(distributeur => {
            const card = this.createDistributeurCard(distributeur);
            container.appendChild(card);
        });
    }

    createDistributeurCard(distributeur) {
        const card = document.createElement('div');
        card.className = 'distributeur-card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h4>${distributeur.nom}</h4>
                    <div class="card-info">
                        <span class="type">${this.getTypeLabel(distributeur.type)}</span>
                        <span class="address">${distributeur.adresse}</span>
                        <div class="card-services">
                            <small>${distributeur.services?.slice(0, 2).join(', ') || ''}</small>
                        </div>
                    </div>
                </div>
                ${distributeur.distance ? 
                    `<span class="distance-badge">${distributeur.distance.toFixed(1)}km</span>` : 
                    ''
                }
            </div>
        `;

        card.addEventListener('click', () => {
            this.showDistributeurDetails(distributeur);
        });

        return card;
    }

    showDistributeurDetails(distributeur) {
        this.selectedDistributeur = distributeur;
        
        // Mettre à jour les informations de base
        document.getElementById('distributeurName').textContent = distributeur.nom;
        document.getElementById('distributeurType').textContent = this.getTypeLabel(distributeur.type);
        document.getElementById('distributeurAddress').textContent = distributeur.adresse;
        document.getElementById('distributeurVille').textContent = distributeur.ville;
        document.getElementById('distributeurDescription').textContent = 
            distributeur.description || 'Aucune description disponible';

        // Informations supplémentaires
        const infoGrid = document.querySelector('.distributeur-info .info-grid');
        if (infoGrid) {
            infoGrid.innerHTML = `
                <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${this.getTypeLabel(distributeur.type)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${distributeur.adresse}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-city"></i>
                    <span>${distributeur.ville}</span>
                </div>
                ${distributeur.telephone ? `
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <span>${distributeur.telephone}</span>
                    </div>
                ` : ''}
                ${distributeur.horaires ? `
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${distributeur.horaires}</span>
                    </div>
                ` : ''}
                ${distributeur.prix_moyen ? `
                    <div class="info-item">
                        <i class="fas fa-tags"></i>
                        <span>${distributeur.prix_moyen}</span>
                    </div>
                ` : ''}
            `;
        }

        // Services
        if (distributeur.services && distributeur.services.length > 0) {
            const servicesSection = document.createElement('div');
            servicesSection.className = 'services-section';
            servicesSection.innerHTML = `
                <h4>Services proposés:</h4>
                <div class="services-list">
                    ${distributeur.services.map(service => `
                        <span class="service-tag">${service}</span>
                    `).join('')}
                </div>
            `;
            const modalBody = document.querySelector('.modal-body');
            const existingServices = modalBody.querySelector('.services-section');
            if (existingServices) existingServices.remove();
            modalBody.appendChild(servicesSection);
        }

        this.showModal('distributeurModal');
    }

    async locateUser() {
        try {
            const btn = document.getElementById('locateBtn');
            if (!btn) return;

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localisation...';
            btn.disabled = true;
            
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Géolocalisation non supportée'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                });
            });

            this.userPosition = position;
            const coords = position.coords;
            
            // Centrer la carte sur la position utilisateur
            this.mapManager.flyTo(coords.latitude, coords.longitude, 15);
            this.mapManager.addUserMarker(coords.latitude, coords.longitude);
            
            // Charger les distributeurs proches
            await this.loadDistributeurs({
                lat: coords.latitude,
                lng: coords.longitude,
                radius: 5
            });

            this.showSuccess('Position localisée avec succès');

            btn.innerHTML = originalText;
            btn.disabled = false;

        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            
            let errorMessage = 'Impossible d\'accéder à votre position';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Permission de géolocalisation refusée';
            } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Timeout de la géolocalisation';
            }
            
            this.showError(errorMessage);
            
            const btn = document.getElementById('locateBtn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-location-arrow"></i> Me localiser';
                btn.disabled = false;
            }
        }
    }

    startNavigation() {
        if (!this.userPosition) {
            this.showError('Veuillez d\'abord activer votre localisation');
            return;
        }

        if (!this.selectedDistributeur) {
            this.showError('Veuillez d\'abord sélectionner un distributeur');
            return;
        }

        this.showNavigationPanel();
        
        const start = {
            lat: this.userPosition.coords.latitude,
            lng: this.userPosition.coords.longitude
        };
        const end = {
            lat: this.selectedDistributeur.latitude,
            lng: this.selectedDistributeur.longitude
        };

        this.updateNavigationInfo(start, end);
        this.showSuccess(`Navigation vers ${this.selectedDistributeur.nom}`);
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '40 km/h';

        this.generateNavigationSteps(start, end, distance);
    }

    generateNavigationSteps(start, end, distance) {
        const stepsContainer = document.getElementById('navigationSteps');
        if (!stepsContainer) return;

        const steps = [
            { instruction: 'Départ de votre position actuelle', distance: '0 km', icon: 'fa-play' },
            { instruction: 'Continuer tout droit sur 200m', distance: '0.2 km', icon: 'fa-arrow-up' },
            { instruction: 'Tourner à droite au carrefour', distance: '0.8 km', icon: 'fa-arrow-right' },
            { instruction: 'Continuer sur 500m', distance: '1.3 km', icon: 'fa-arrow-up' },
            { instruction: `Destination: ${this.selectedDistributeur.nom}`, distance: `${distance.toFixed(1)} km`, icon: 'fa-flag-checkered' }
        ];

        stepsContainer.innerHTML = steps.map((step, index) => `
            <div class="step-item ${index === steps.length - 1 ? 'arrival' : ''}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-content">
                    <p>${step.instruction}</p>
                    <span class="step-distance">${step.distance}</span>
                </div>
            </div>
        `).join('');
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateTime(distance) {
        const vitesseMoyenne = 40;
        const minutes = Math.round((distance / vitesseMoyenne) * 60);
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const heures = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${heures}h${mins > 0 ? mins + 'min' : ''}`;
        }
    }

    switchView(view) {
        console.log('Changement de vue:', view);
        // Implémentation des différentes vues
        switch(view) {
            case 'map':
                // Vue carte par défaut
                break;
            case 'list':
                // Vue liste
                break;
            case 'radar':
                this.showNotification('Vue radar bientôt disponible', 'info');
                break;
        }
    }

    handleSearch(query) {
        if (!query || query.trim() === '') {
            this.loadDistributeurs();
            return;
        }

        this.loadDistributeurs({ search: query });
    }

    handleFilter() {
        const type = document.getElementById('typeFilter')?.value || 'all';
        const ville = document.getElementById('villeFilter')?.value || 'all';
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        
        this.loadDistributeurs(filters);
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('ctl-loket-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ctl-loket-theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        this.showNotification(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    showAdminLogin() {
        this.showModal('adminLoginModal');
    }

    hideAdminLogin() {
        this.hideModal('adminLoginModal');
    }

    async handleAdminLogin() {
        const username = document.getElementById('adminUsername')?.value;
        const password = document.getElementById('adminPassword')?.value;

        if (!username || !password) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        this.showLoading('Connexion en cours...');

        // Simulation de connexion
        setTimeout(() => {
            this.hideLoading();
            this.showSuccess('Connexion réussie ! Redirection...');
            setTimeout(() => {
                window.location.href = '/admin.html';
            }, 1000);
        }, 1500);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showNavigationPanel() {
        const panel = document.getElementById('navigationPanel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    hideNavigation() {
        const panel = document.getElementById('navigationPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    showLoading(message = 'Chargement...') {
        // Créer ou mettre à jour l'indicateur de chargement
        let loadingEl = document.getElementById('global-loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'global-loading';
            loadingEl.className = 'global-loading';
            document.body.appendChild(loadingEl);
        }
        
        loadingEl.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        loadingEl.style.display = 'flex';
    }

    hideLoading() {
        const loadingEl = document.getElementById('global-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="close-notification">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);

        // Fermeture
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });

        // Fermeture automatique
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    getTypeLabel(type) {
        const types = {
            'nourriture': '🍽️ Nourriture',
            'boissons': '🥤 Boissons',
            'billets': '🎫 Billets',
            'divers': '🛍️ Divers'
        };
        return types[type] || type;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    cycleMapStyle() {
        const currentIndex = this.mapManager.getCurrentStyleIndex();
        const styles = this.mapManager.getMapStyles();
        const nextIndex = (currentIndex + 1) % styles.length;
        
        this.mapManager.setStyle(nextIndex);
        
        const styleNames = ['Standard', 'Extérieur', 'Clair', 'Sombre', 'Satellite'];
        this.showNotification(`Style de carte: ${styleNames[nextIndex]}`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.showError('Impossible d\'activer le mode plein écran');
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Styles CSS supplémentaires
const additionalStyles = `
    .map-error {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
    }

    .error-content {
        text-align: center;
        padding: 2rem;
        max-width: 400px;
    }

    .error-content i {
        font-size: 3rem;
        color: var(--error-color);
        margin-bottom: 1rem;
    }

    .error-content h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
    }

    .error-content p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
    }

    .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .btn-retry, .btn-continue {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .btn-retry {
        background: var(--accent-color);
        color: white;
    }

    .btn-continue {
        background: var(--card-bg);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .no-results {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }

    .no-results i {
        font-size: 2rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .global-loading {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .loading-content {
        background: var(--secondary-bg);
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        min-width: 200px;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-color);
        border-top: 4px solid var(--accent-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    .services-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }

    .services-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .service-tag {
        background: var(--accent-color);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
    }

    .card-services {
        margin-top: 0.25rem;
    }

    .card-services small {
        color: var(--text-secondary);
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

// Ajouter les styles supplémentaires
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM chargé, initialisation de l\'application...');
    window.app = new CTLLoketApp();
});

// Gestionnaire d'erreurs global
window.addEventListener('error', (e) => {
    console.error('Erreur globale interceptée:', e.error);
});

console.log('🧩 Script app.js chargé');
