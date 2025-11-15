class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.currentStyleIndex = 0;
        this.mapStyles = [
            'mapbox://styles/mapbox/streets-v12',
            'mapbox://styles/mapbox/outdoors-v12',
            'mapbox://styles/mapbox/light-v11',
            'mapbox://styles/mapbox/dark-v11'
        ];
    }

    async init(containerId) {
        // Token Mapbox - Remplacez par votre token
        mapboxgl.accessToken = 'pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21oem5tbDE4MGczeDJscXowbDY0bjJoaiJ9.jfJUv9lYDFWLwqm3eZq6Nw';

        this.map = new mapboxgl.Map({
            container: containerId,
            style: this.mapStyles[this.currentStyleIndex],
            center: [11.5021, 3.8480], // Centre du Cameroun
            zoom: 6,
            pitch: 0,
            bearing: 0
        });

        await this.waitForMapLoad();
        this.setupMapControls();
    }

    waitForMapLoad() {
        return new Promise((resolve) => {
            this.map.on('load', resolve);
        });
    }

    setupMapControls() {
        this.map.addControl(new mapboxgl.NavigationControl());
        this.map.addControl(new mapboxgl.ScaleControl());
    }

    updateDistributeurs(distributeurs) {
        this.clearMarkers();
        
        distributeurs.forEach(distributeur => {
            this.addDistributeurMarker(distributeur);
        });
    }

    addDistributeurMarker(distributeur) {
        const el = document.createElement('div');
        el.className = 'distributeur-marker';
        el.innerHTML = this.getMarkerHTML(distributeur);
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onMarkerClickCallback) {
                this.onMarkerClickCallback(distributeur);
            }
        });

        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([distributeur.longitude, distributeur.latitude])
        .addTo(this.map);

        this.markers.push({
            marker,
            distributeur
        });
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
            <div class="marker-content">
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
        if (this.userMarker) {
            this.userMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = `
            <div class="user-marker-content">
                <i class="fas fa-user"></i>
                <div class="pulse-ring"></div>
            </div>
        `;

        this.userMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);

        // Animation de pulsation
        this.startPulseAnimation(el);
    }

    startPulseAnimation(element) {
        const ring = element.querySelector('.pulse-ring');
        ring.style.animation = 'pulse 2s infinite';
    }

    clearMarkers() {
        this.markers.forEach(({ marker }) => marker.remove());
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        this.map.flyTo({
            center: [lng, lat],
            zoom: zoom,
            duration: 2000
        });
    }

    onMarkerClick(callback) {
        this.onMarkerClickCallback = callback;
    }

    cycleStyle() {
        this.currentStyleIndex = (this.currentStyleIndex + 1) % this.mapStyles.length;
        this.map.setStyle(this.mapStyles[this.currentStyleIndex]);
    }
}

class API {
    constructor() {
        this.baseURL = window.location.origin;
    }

    async request(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
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
}

class CTLLoketApp {
    constructor() {
        this.mapManager = new MapManager();
        this.api = new API();
        this.currentDistributeurs = [];
        this.userPosition = null;
        
        this.init();
    }

    async init() {
        await this.initMap();
        this.bindEvents();
        this.loadDistributeurs();
        this.setupTheme();
    }

    async initMap() {
        await this.mapManager.init('map');
        this.mapManager.onMarkerClick(this.handleMarkerClick.bind(this));
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.currentTarget.dataset.view));
        });

        // Recherche
        document.getElementById('searchInput').addEventListener('input', 
            this.debounce(this.handleSearch.bind(this), 300)
        );

        // Filtres
        document.getElementById('typeFilter').addEventListener('change', 
            this.handleFilter.bind(this)
        );
        document.getElementById('villeFilter').addEventListener('change', 
            this.handleFilter.bind(this)
        );

        // Localisation
        document.getElementById('locateBtn').addEventListener('click', 
            this.locateUser.bind(this)
        );

        // Thème
        document.getElementById('themeToggle').addEventListener('click', 
            this.toggleTheme.bind(this)
        );

        // Admin
        document.getElementById('adminAccess').addEventListener('click', 
            this.showAdminLogin.bind(this)
        );

        // Modal
        document.querySelector('.close-btn').addEventListener('click', 
            this.hideModal.bind(this)
        );
        document.getElementById('closeNav').addEventListener('click', 
            this.hideNavigation.bind(this)
        );

        // Navigation
        document.getElementById('navigateBtn').addEventListener('click', 
            this.startNavigation.bind(this)
        );

        // Admin Login
        document.getElementById('adminLoginForm').addEventListener('submit', 
            this.handleAdminLogin.bind(this)
        );

        // Map Controls
        document.getElementById('mapStyleBtn').addEventListener('click', 
            this.cycleMapStyle.bind(this)
        );
        document.getElementById('fullscreenBtn').addEventListener('click', 
            this.toggleFullscreen.bind(this)
        );

        // Fermer modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
                this.hideAdminLogin();
            }
        });
    }

    async loadDistributeurs(filters = {}) {
        try {
            const response = await this.api.getDistributeurs(filters);
            
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.mapManager.updateDistributeurs(this.currentDistributeurs);
                this.updateResultsList(this.currentDistributeurs);
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showError('Erreur lors du chargement des distributeurs');
        }
    }

    updateResultsList(distributeurs) {
        const container = document.getElementById('resultsList');
        container.innerHTML = '';

        if (distributeurs.length === 0) {
            container.innerHTML = '<div class="no-results">Aucun distributeur trouvé</div>';
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

    async handleMarkerClick(distributeur) {
        this.showDistributeurDetails(distributeur);
    }

    showDistributeurDetails(distributeur) {
        document.getElementById('distributeurName').textContent = distributeur.nom;
        document.getElementById('distributeurType').textContent = this.getTypeLabel(distributeur.type);
        document.getElementById('distributeurAddress').textContent = distributeur.adresse;
        document.getElementById('distributeurVille').textContent = distributeur.ville;
        document.getElementById('distributeurDescription').textContent = 
            distributeur.description || 'Aucune description disponible';

        this.showModal('distributeurModal');
    }

    async locateUser() {
        try {
            const btn = document.getElementById('locateBtn');
            btn.classList.add('loading');
            
            const position = await this.getCurrentPosition();
            this.userPosition = position;
            
            this.mapManager.flyTo(position.coords.latitude, position.coords.longitude);
            this.mapManager.addUserMarker(position.coords.latitude, position.coords.longitude);
            
            await this.loadDistributeurs({
                lat: position.coords.latitude, 
                lng: position.coords.longitude
            });
            
            btn.classList.remove('loading');
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showError('Impossible d\'accéder à votre position');
            document.getElementById('locateBtn').classList.remove('loading');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error('Géolocalisation non supportée'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    async startNavigation() {
        if (!this.userPosition) {
            this.showError('Localisez-vous d\'abord pour démarrer la navigation');
            return;
        }

        this.showNavigationPanel();
        this.showSuccess('Navigation démarrée vers le distributeur');
    }

    // Gestion des vues
    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
    }

    // Recherche et filtres
    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const filtered = this.currentDistributeurs.filter(d => 
            d.nom.toLowerCase().includes(query) ||
            d.adresse.toLowerCase().includes(query)
        );
        this.updateResultsList(filtered);
    }

    handleFilter() {
        const type = document.getElementById('typeFilter').value;
        const ville = document.getElementById('villeFilter').value;
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        
        this.loadDistributeurs(filters);
    }

    // Gestion du thème
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
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Admin
    showAdminLogin() {
        this.showModal('adminLoginModal');
    }

    hideAdminLogin() {
        this.hideModal('adminLoginModal');
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        this.showSuccess('Redirection vers l\'interface admin...');
        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1000);
    }

    // Utilitaires
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId = null) {
        if (modalId) {
            document.getElementById(modalId).classList.remove('active');
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    }

    showNavigationPanel() {
        document.getElementById('navigationPanel').classList.add('active');
    }

    hideNavigation() {
        document.getElementById('navigationPanel').classList.remove('active');
    }

    showError(message) {
        alert(`❌ ${message}`);
    }

    showSuccess(message) {
        alert(`✅ ${message}`);
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
        this.mapManager.cycleStyle();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new CTLLoketApp();
});

