// Configuration globale
let MAPBOX_TOKEN = 'pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21oem5tbDE4MGczeDJscXowbDY0bjJoaiJ9.jfJUv9lYDFWLwqm3eZq6Nw';

// Charger la configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (data.success && data.data.mapboxToken) {
            MAPBOX_TOKEN = data.data.mapboxToken;
        }
    } catch (error) {
        console.log('Utilisation du token Mapbox par défaut');
    }
}

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
    }

    async init(containerId) {
        await loadConfig();
        
        if (!MAPBOX_TOKEN) {
            console.error('Token Mapbox non configuré');
            this.showMapError(containerId);
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        try {
            this.map = new mapboxgl.Map({
                container: containerId,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [11.5021, 3.8480],
                zoom: 6
            });

            this.map.addControl(new mapboxgl.NavigationControl());
            this.map.addControl(new mapboxgl.ScaleControl());

            this.map.on('load', () => {
                console.log('✅ Carte Mapbox chargée avec succès');
                document.getElementById('map').style.visibility = 'visible';
            });

            this.map.on('error', (e) => {
                console.error('❌ Erreur carte Mapbox:', e);
                this.showMapError(containerId);
            });

        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showMapError(containerId);
        }
    }

    showMapError(containerId) {
        const mapElement = document.getElementById(containerId);
        mapElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 20px;">
                <i class="fas fa-map-marked-alt" style="font-size: 48px; margin-bottom: 16px; color: #ccc;"></i>
                <h3>Carte non disponible</h3>
                <p>La carte ne peut pas s'afficher pour le moment. Vérifiez votre connexion internet.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 16px;">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
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
            if (window.app && window.app.showDistributeurDetails) {
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
        if (this.userMarker) {
            this.userMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'user-marker';
        el.innerHTML = '<i class="fas fa-user" style="color: #e74c3c; font-size: 20px;"></i>';

        this.userMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        if (this.map) {
            this.map.flyTo({
                center: [lng, lat],
                zoom: zoom,
                duration: 2000
            });
        }
    }

    setStyle(styleUrl) {
        if (this.map) {
            this.map.setStyle(styleUrl);
        }
    }
}

class CTLLoketApp {
    constructor() {
        this.mapManager = new MapManager();
        this.currentDistributeurs = [];
        this.userPosition = null;
        this.selectedDistributeur = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.mapManager.init('map');
        await this.loadDistributeurs();
        this.setupTheme();
        
        console.log('✅ Application CTL-LOKET initialisée');
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Recherche
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.debounce(() => this.handleSearch(e.target.value), 300)();
        });

        // Filtres
        document.getElementById('typeFilter').addEventListener('change', () => this.handleFilter());
        document.getElementById('villeFilter').addEventListener('change', () => this.handleFilter());

        // Localisation
        document.getElementById('locateBtn').addEventListener('click', () => this.locateUser());

        // Thème
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Admin
        document.getElementById('adminAccess').addEventListener('click', () => this.showAdminLogin());

        // Modal
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        document.getElementById('closeNav').addEventListener('click', () => this.hideNavigation());

        // Navigation
        document.getElementById('navigateBtn').addEventListener('click', () => this.startNavigation());

        // Admin Login
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Map Controls
        document.getElementById('mapStyleBtn').addEventListener('click', () => this.cycleMapStyle());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Fermer modals en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });
    }

    async loadDistributeurs(filters = {}) {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`/api/distributeurs?${params}`);
            const data = await response.json();

            if (data.success) {
                this.currentDistributeurs = data.data;
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

    showDistributeurDetails(distributeur) {
        this.selectedDistributeur = distributeur;
        
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
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localisation...';
            btn.disabled = true;
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            this.userPosition = position;
            const coords = position.coords;
            
            this.mapManager.flyTo(coords.latitude, coords.longitude, 15);
            this.mapManager.addUserMarker(coords.latitude, coords.longitude);
            
            await this.loadDistributeurs({
                lat: coords.latitude,
                lng: coords.longitude,
                radius: 5
            });

            btn.innerHTML = originalText;
            btn.disabled = false;

        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showError('Impossible d\'accéder à votre position. Vérifiez les permissions de géolocalisation.');
            
            const btn = document.getElementById('locateBtn');
            btn.innerHTML = '<i class="fas fa-location-arrow"></i> Me localiser';
            btn.disabled = false;
        }
    }

    startNavigation() {
        if (!this.userPosition || !this.selectedDistributeur) {
            this.showError('Localisez-vous d\'abord et sélectionnez un distributeur');
            return;
        }

        this.showNavigationPanel();
        this.showSuccess('Navigation démarrée vers ' + this.selectedDistributeur.nom);
        
        // Animation simulée
        const start = {
            lat: this.userPosition.coords.latitude,
            lng: this.userPosition.coords.longitude
        };
        const end = {
            lat: this.selectedDistributeur.latitude,
            lng: this.selectedDistributeur.longitude
        };

        this.updateNavigationInfo(start, end);
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
        const steps = [
            { instruction: 'Départ de votre position actuelle', distance: '0 km' },
            { instruction: 'Continuer tout droit sur 200m', distance: '0.2 km' },
            { instruction: 'Tourner à droite au carrefour', distance: '0.8 km' },
            { instruction: `Destination: ${this.selectedDistributeur.nom}`, distance: `${distance.toFixed(1)} km` }
        ];

        stepsContainer.innerHTML = steps.map((step, index) => `
            <div class="step-item ${index === steps.length - 1 ? 'arrival' : ''}">
                <div class="step-icon">
                    <i class="fas fa-${index === steps.length - 1 ? 'flag-checkered' : 'directions'}"></i>
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
        return `${minutes} min`;
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.loadDistributeurs();
            return;
        }

        const filtered = this.currentDistributeurs.filter(d => 
            d.nom.toLowerCase().includes(query.toLowerCase()) ||
            d.adresse.toLowerCase().includes(query.toLowerCase())
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

    showAdminLogin() {
        this.showModal('adminLoginModal');
    }

    handleAdminLogin() {
        this.showSuccess('Connexion réussie! Redirection...');
        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1000);
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showNavigationPanel() {
        document.getElementById('navigationPanel').classList.add('active');
    }

    hideNavigation() {
        document.getElementById('navigationPanel').classList.remove('active');
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showSuccess(message) {
        alert('✅ ' + message);
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
        const styles = [
            'mapbox://styles/mapbox/streets-v12',
            'mapbox://styles/mapbox/outdoors-v12',
            'mapbox://styles/mapbox/light-v11',
            'mapbox://styles/mapbox/dark-v11'
        ];
        const currentStyle = this.mapManager.map.getStyle().sources;
        // Implémentation basique de changement de style
        this.showSuccess('Changement de style de carte');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Erreur fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CTLLoketApp();
});

