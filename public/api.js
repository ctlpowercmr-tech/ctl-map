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
        this.selectedDistributeur = null;
        
        this.init();
    }

    async init() {
        await this.initMap();
        this.bindEvents();
        this.loadDistributeurs();
        this.setupTheme();
        this.checkGeolocationPermission();
    }

    async initMap() {
        await this.mapManager.init('map');
        this.mapManager.onMarkerClick(this.handleMarkerClick.bind(this));
        this.mapManager.onMapClick(this.handleMapClick.bind(this));
    }

    bindEvents() {
        // Navigation entre les vues
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.currentTarget.dataset.view));
        });

        // Recherche en temps réel
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

        // Localisation utilisateur
        document.getElementById('locateBtn').addEventListener('click', 
            this.locateUser.bind(this)
        );

        // Thème
        document.getElementById('themeToggle').addEventListener('click', 
            this.toggleTheme.bind(this)
        );

        // Accès admin
        document.getElementById('adminAccess').addEventListener('click', 
            this.showAdminLogin.bind(this)
        );

        // Modal distributeur
        document.querySelector('#distributeurModal .close-btn').addEventListener('click', 
            this.hideModal.bind(this)
        );
        document.getElementById('closeNav').addEventListener('click', 
            this.hideNavigation.bind(this)
        );

        // Navigation vers distributeur
        document.getElementById('navigateBtn').addEventListener('click', 
            this.startNavigation.bind(this)
        );

        // Connexion admin
        document.getElementById('adminLoginForm').addEventListener('submit', 
            this.handleAdminLogin.bind(this)
        );

        // Contrôles carte
        document.getElementById('mapStyleBtn').addEventListener('click', 
            this.cycleMapStyle.bind(this)
        );
        document.getElementById('fullscreenBtn').addEventListener('click', 
            this.toggleFullscreen.bind(this)
        );

        // Avis et notation
        document.getElementById('submitAvis').addEventListener('click', 
            this.submitAvis.bind(this)
        );

        // Fermer les modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
                this.hideAdminLogin();
            }
        });

        // Gestion du clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.hideNavigation();
            }
        });
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
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showError('Erreur lors du chargement des distributeurs');
            this.hideLoading();
        }
    }

    async loadDistributeurDetails(id) {
        try {
            const response = await this.api.getDistributeur(id);
            if (response.success) {
                return response.data;
            }
        } catch (error) {
            console.error('Erreur chargement détails:', error);
        }
        return null;
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
                        ${distributeur.note_moyenne > 0 ? `
                            <div class="rating">
                                ${this.generateStarRating(distributeur.note_moyenne)}
                                <span class="rating-text">(${distributeur.nombre_avis})</span>
                            </div>
                        ` : ''}
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

    generateStarRating(rating) {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push('<i class="fas fa-star"></i>');
        }
        if (hasHalfStar) {
            stars.push('<i class="fas fa-star-half-alt"></i>');
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push('<i class="far fa-star"></i>');
        }
        
        return stars.join('');
    }

    async handleMarkerClick(distributeur) {
        const details = await this.loadDistributeurDetails(distributeur.id);
        this.showDistributeurDetails(details || distributeur);
    }

    handleMapClick() {
        // Réinitialiser la sélection
        this.selectedDistributeur = null;
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    async showDistributeurDetails(distributeur) {
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
            ${distributeur.prix_moyen ? `
                <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${distributeur.prix_moyen}</span>
                </div>
            ` : ''}
        `;

        // Gestion des images
        const gallery = document.getElementById('distributeurImages');
        gallery.innerHTML = '';
        
        if (distributeur.images && distributeur.images.length > 0) {
            distributeur.images.forEach((img, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = `image-item ${img.is_primary ? 'primary' : ''}`;
                imgContainer.innerHTML = `
                    <img src="${img.url}" alt="${distributeur.nom}" loading="lazy">
                    ${img.is_primary ? '<span class="primary-badge">Principale</span>' : ''}
                `;
                gallery.appendChild(imgContainer);
            });
        } else {
            gallery.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Aucune image disponible</p>
                </div>
            `;
        }

        // Section avis
        this.updateAvisSection(distributeur);

        this.showModal('distributeurModal');
    }

    updateAvisSection(distributeur) {
        const avisSection = document.getElementById('avisSection');
        if (!avisSection) return;

        avisSection.innerHTML = `
            <div class="avis-header">
                <h4>Avis et notations</h4>
                ${distributeur.note_moyenne > 0 ? `
                    <div class="overall-rating">
                        <div class="rating-big">${distributeur.note_moyenne.toFixed(1)}</div>
                        <div class="rating-stars">${this.generateStarRating(distributeur.note_moyenne)}</div>
                        <div class="rating-count">${distributeur.nombre_avis} avis</div>
                    </div>
                ` : '<p>Soyez le premier à noter ce distributeur</p>'}
            </div>
            <div class="add-review">
                <h5>Donner votre avis</h5>
                <div class="rating-input">
                    <div class="stars">
                        ${[1,2,3,4,5].map(star => `
                            <i class="far fa-star" data-rating="${star}"></i>
                        `).join('')}
                    </div>
                    <textarea id="avisComment" placeholder="Partagez votre expérience..."></textarea>
                    <button id="submitAvis" class="btn-primary">
                        <i class="fas fa-paper-plane"></i>
                        Publier l'avis
                    </button>
                </div>
            </div>
        `;

        // Gestion de la notation
        const stars = avisSection.querySelectorAll('.stars i');
        let selectedRating = 0;
        
        stars.forEach(star => {
            star.addEventListener('mouseover', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.highlightStars(stars, rating);
            });

            star.addEventListener('mouseout', () => {
                this.highlightStars(stars, selectedRating);
            });

            star.addEventListener('click', (e) => {
                selectedRating = parseInt(e.target.dataset.rating);
                this.highlightStars(stars, selectedRating);
            });
        });
    }

    highlightStars(stars, rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    }

    async submitAvis() {
        if (!this.selectedDistributeur) return;

        const stars = document.querySelectorAll('.stars i');
        const rating = Array.from(stars).filter(star => 
            star.className.includes('fas')
        ).length;

        if (rating === 0) {
            this.showError('Veuillez sélectionner une note');
            return;
        }

        const comment = document.getElementById('avisComment').value;

        try {
            await this.api.createAvis({
                distributeur_id: this.selectedDistributeur.id,
                note: rating,
                commentaire: comment
            });

            this.showSuccess('Votre avis a été publié avec succès');
            this.hideModal();
            
            // Recharger les détails du distributeur
            const updatedDetails = await this.loadDistributeurDetails(this.selectedDistributeur.id);
            if (updatedDetails) {
                this.showDistributeurDetails(updatedDetails);
            }
        } catch (error) {
            this.showError('Erreur lors de la publication de l\'avis');
        }
    }

    async locateUser() {
        try {
            const btn = document.getElementById('locateBtn');
            btn.classList.add('loading');
            
            const position = await this.getCurrentPosition();
            this.userPosition = position;
            
            const userCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            this.mapManager.flyTo(userCoords.lat, userCoords.lng, 16);
            this.mapManager.addUserMarker(userCoords.lat, userCoords.lng);
            
            // Charger les distributeurs proches
            await this.loadDistributeurs({
                lat: userCoords.lat,
                lng: userCoords.lng,
                radius: 5
            });
            
            btn.classList.remove('loading');
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.showError('Impossible d\'accéder à votre position. Vérifiez les permissions de géolocalisation.');
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
                timeout: 15000,
                maximumAge: 60000
            });
        });
    }

    async startNavigation() {
        if (!this.userPosition || !this.selectedDistributeur) {
            this.showError('Impossible de démarrer la navigation. Localisez-vous d\'abord.');
            return;
        }

        this.navigationActive = true;
        this.showNavigationPanel();
        
        const start = {
            lat: this.userPosition.coords.latitude,
            lng: this.userPosition.coords.longitude
        };
        
        const end = {
            lat: this.selectedDistributeur.latitude,
            lng: this.selectedDistributeur.longitude
        };

        await this.mapManager.startNavigation(start, end);
        this.updateNavigationInfo(start, end);
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '40 km/h'; // Vitesse moyenne en ville

        // Générer les étapes de navigation
        this.generateNavigationSteps(start, end, distance);
    }

    generateNavigationSteps(start, end, distance) {
        const stepsContainer = document.getElementById('navigationSteps');
        const steps = [
            { instruction: 'Départ de votre position actuelle', distance: '0 km' },
            { instruction: 'Continuer tout droit sur 200m', distance: '0.2 km' },
            { instruction: 'Tourner à droite', distance: '0.5 km' },
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
        const vitesseMoyenne = 40; // km/h en ville
        const minutes = Math.round((distance / vitesseMoyenne) * 60);
        return `${minutes} min`;
    }

    // Gestion des vues
    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
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
        const query = e.target.value.trim();
        if (query.length === 0) {
            this.loadDistributeurs();
            return;
        }

        const filtered = this.currentDistributeurs.filter(d => 
            d.nom.toLowerCase().includes(query.toLowerCase()) ||
            d.adresse.toLowerCase().includes(query.toLowerCase()) ||
            d.ville.toLowerCase().includes(query.toLowerCase())
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

    // Vérification des permissions de géolocalisation
    async checkGeolocationPermission() {
        if (!navigator.permissions) return;

        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            if (result.state === 'granted') {
                console.log('Permission géolocalisation déjà accordée');
            } else if (result.state === 'prompt') {
                console.log('Permission géolocalisation à demander');
            }
        } catch (error) {
            console.log('API Permissions non supportée');
        }
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

    // Utilitaires d'interface
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId = null) {
        if (modalId) {
            document.getElementById(modalId).classList.remove('active');
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        document.body.style.overflow = '';
    }

    showNavigationPanel() {
        document.getElementById('navigationPanel').classList.add('active');
    }

    hideNavigation() {
        document.getElementById('navigationPanel').classList.remove('active');
        this.mapManager.stopNavigation();
        this.navigationActive = false;
    }

    showLoading(message = 'Chargement...') {
        // Implémentation d'un indicateur de chargement
        console.log(message);
    }

    hideLoading() {
        // Cacher l'indicateur de chargement
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
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
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Erreur fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    new CTLLoketApp();
});
