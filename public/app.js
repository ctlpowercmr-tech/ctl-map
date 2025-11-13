import MapManager from './map-manager.js';
import API from './api.js';
import AuthManager from './auth.js';

class CTLLoketApp {
    constructor() {
        this.mapManager = new MapManager();
        this.api = new API();
        this.authManager = new AuthManager();
        this.currentDistributeurs = [];
        this.userPosition = null;
        this.navigationActive = false;
        
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
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
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

        // Fermer modals en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
                this.hideAdminLogin();
            }
        });
    }

    async loadDistributeurs(filters = {}) {
        try {
            const distributeurs = await this.api.getDistributeurs(filters);
            this.currentDistributeurs = distributeurs;
            this.mapManager.updateDistributeurs(distributeurs);
            this.updateResultsList(distributeurs);
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showError('Erreur lors du chargement des distributeurs');
        }
    }

    async loadProchesDistributeurs(lat, lng) {
        try {
            const distributeurs = await this.api.getProchesDistributeurs(lat, lng);
            this.currentDistributeurs = distributeurs;
            this.mapManager.updateDistributeurs(distributeurs);
            this.updateResultsList(distributeurs);
            this.updateDistanceInfo(distributeurs);
        } catch (error) {
            console.error('Erreur chargement distributeurs proches:', error);
        }
    }

    updateResultsList(distributeurs) {
        const container = document.getElementById('resultsList');
        container.innerHTML = '';

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

        // Images
        const gallery = document.getElementById('distributeurImages');
        gallery.innerHTML = '';
        
        if (distributeur.images && distributeur.images.length > 0) {
            distributeur.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.url;
                imgEl.alt = distributeur.nom;
                gallery.appendChild(imgEl);
            });
        } else {
            gallery.innerHTML = '<p>Aucune image disponible</p>';
        }

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
            
            await this.loadProchesDistributeurs(
                position.coords.latitude, 
                position.coords.longitude
            );
            
            btn.classList.remove('loading');
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showError('Impossible d\'accéder à votre position');
            document.getElementById('locateBtn').classList.remove('loading');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
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
        if (!this.userPosition || !this.currentDistributeur) return;

        this.navigationActive = true;
        this.showNavigationPanel();
        
        const start = {
            lat: this.userPosition.coords.latitude,
            lng: this.userPosition.coords.longitude
        };
        
        const end = {
            lat: this.currentDistributeur.latitude,
            lng: this.currentDistributeur.longitude
        };

        await this.mapManager.startNavigation(start, end);
        this.updateNavigationInfo(start, end);
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '50 km/h'; // Vitesse moyenne estimée
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Rayon de la Terre en km
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
        const vitesseMoyenne = 50; // km/h
        const minutes = Math.round((distance / vitesseMoyenne) * 60);
        return `${minutes} min`;
    }

    updateDistanceInfo(distributeurs) {
        if (distributeurs.length > 0) {
            const nearest = distributeurs[0];
            document.getElementById('nearestDistance').textContent = 
                `${nearest.distance.toFixed(1)} km`;
            document.getElementById('estimatedTime').textContent = 
                this.calculateTime(nearest.distance);
        }
    }

    // Gestion des vues
    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Implémentation des différentes vues
        switch(view) {
            case 'map':
                this.mapManager.showMapView();
                break;
            case 'list':
                this.mapManager.showListView();
                break;
            case 'radar':
                this.mapManager.showRadarView();
                break;
        }
    }

    // Recherche et filtres
    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        const filtered = this.currentDistributeurs.filter(d => 
            d.nom.toLowerCase().includes(query) ||
            d.adresse.toLowerCase().includes(query)
        );
        this.updateResultsList(filtered);
        this.mapManager.highlightSearchResults(filtered);
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
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await this.authManager.login(username, password);
            window.location.href = '/admin.html';
        } catch (error) {
            this.showError('Identifiants incorrects');
        }
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
        this.mapManager.stopNavigation();
        this.navigationActive = false;
    }

    getTypeLabel(type) {
        const types = {
            'nourriture': 'Nourriture',
            'boissons': 'Boissons',
            'billets': 'Billets',
            'divers': 'Divers'
        };
        return types[type] || type;
    }

    showError(message) {
        // Implémentation simple d'affichage d'erreur
        alert(message);
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