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
        this.currentRating = 0;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initMap();
            this.bindEvents();
            this.setupTheme();
            this.checkGeolocationPermission();
            this.showNotification('CTL-LOKET prêt à vous servir !', 'info');
            
            // Charger les distributeurs initiaux
            await this.loadDistributeurs();
            
        } catch (error) {
            console.error('Erreur initialisation:', error);
            this.showNotification('Erreur lors du chargement de l\'application', 'error');
        }
    }

    async initMap() {
        try {
            await this.mapManager.init('map');
            this.mapManager.onMarkerClick(this.handleMarkerClick.bind(this));
            this.mapManager.onMapClick(this.handleMapClick.bind(this));
            console.log('✅ Carte initialisée avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showNotification('Erreur de chargement de la carte', 'error');
        }
    }

    bindEvents() {
        // Navigation entre les vues
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Recherche en temps réel
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }
        
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                this.loadDistributeurs();
            });
        }

        // Filtres
        document.getElementById('typeFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('villeFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('radiusFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('sortFilter')?.addEventListener('change', this.handleFilter.bind(this));

        // Localisation utilisateur
        document.getElementById('locateBtn')?.addEventListener('click', this.locateUser.bind(this));

        // Thème
        document.getElementById('themeToggle')?.addEventListener('click', this.toggleTheme.bind(this));

        // Accès admin
        document.getElementById('adminAccess')?.addEventListener('click', this.showAdminLogin.bind(this));

        // Menu mobile
        document.getElementById('mobileMenuToggle')?.addEventListener('click', this.toggleMobileMenu.bind(this));

        // Modal distributeur
        document.querySelector('#distributeurModal .close-btn')?.addEventListener('click', () => this.hideModal('distributeurModal'));
        document.getElementById('closeNav')?.addEventListener('click', this.hideNavigation.bind(this));

        // Navigation vers distributeur
        document.getElementById('navigateBtn')?.addEventListener('click', this.startNavigation.bind(this));
        document.getElementById('stopNavigation')?.addEventListener('click', this.hideNavigation.bind(this));
        document.getElementById('shareBtn')?.addEventListener('click', this.shareDistributeur.bind(this));

        // Recentrage carte
        document.getElementById('recenterBtn')?.addEventListener('click', this.recenterMap.bind(this));

        // Connexion admin
        document.getElementById('adminLoginForm')?.addEventListener('submit', this.handleAdminLogin.bind(this));

        // Contrôles carte
        document.getElementById('mapStyleBtn')?.addEventListener('click', this.cycleMapStyle.bind(this));
        document.getElementById('fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));

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
                this.hideMobileMenu();
            }
        });

        // Gestion de la visibilité
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.navigationActive) {
                this.updateNavigationProgress();
            }
        });

        console.log('✅ Événements liés avec succès');
    }

    async loadDistributeurs(filters = {}) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const response = await this.api.getDistributeurs(filters);
            
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.mapManager.updateDistributeurs(this.currentDistributeurs);
                this.updateResultsList(this.currentDistributeurs);
                this.updateResultsCount(this.currentDistributeurs.length);
                
                // Mettre à jour le compteur de distributeurs trouvés
                document.getElementById('foundCount').textContent = this.currentDistributeurs.length;
                
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showNotification('Erreur lors du chargement des distributeurs', 'error');
        } finally {
            this.hideLoading();
            this.isLoading = false;
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
                    <p class="subtext">Essayez de modifier vos critères de recherche</p>
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
                    <h4>${this.escapeHtml(distributeur.nom)}</h4>
                    <div class="card-info">
                        <span class="type">${this.getTypeLabel(distributeur.type)}</span>
                        <span class="address">${this.escapeHtml(distributeur.adresse)}</span>
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
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Étoiles pleines
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Demi-étoile
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Étoiles vides
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    async handleMarkerClick(distributeur) {
        try {
            const details = await this.loadDistributeurDetails(distributeur.id);
            this.showDistributeurDetails(details || distributeur);
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            this.showDistributeurDetails(distributeur);
        }
    }

    handleMapClick() {
        // Réinitialiser la sélection
        this.selectedDistributeur = null;
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    async loadDistributeurDetails(id) {
        try {
            const response = await this.api.getDistributeur(id);
            if (response.success) {
                return response.data;
            }
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            throw error;
        }
        return null;
    }

    async showDistributeurDetails(distributeur) {
        this.selectedDistributeur = distributeur;
        
        // Mettre à jour les informations de base
        document.getElementById('distributeurName').textContent = this.escapeHtml(distributeur.nom);
        document.getElementById('distributeurType').textContent = this.getTypeLabel(distributeur.type);
        document.getElementById('distributeurAddress').textContent = this.escapeHtml(distributeur.adresse);
        document.getElementById('distributeurVille').textContent = this.escapeHtml(distributeur.ville);
        document.getElementById('distributeurDescription').textContent = 
            this.escapeHtml(distributeur.description || 'Aucune description disponible');

        // Afficher/Masquer les informations optionnelles
        const phoneItem = document.getElementById('distributeurPhoneItem');
        const priceItem = document.getElementById('distributeurPriceItem');
        const phoneElement = document.getElementById('distributeurTelephone');
        const priceElement = document.getElementById('distributeurPrix');

        if (distributeur.telephone) {
            phoneElement.textContent = distributeur.telephone;
            phoneItem.style.display = 'flex';
        } else {
            phoneItem.style.display = 'none';
        }

        if (distributeur.prix_moyen) {
            priceElement.textContent = distributeur.prix_moyen;
            priceItem.style.display = 'flex';
        } else {
            priceItem.style.display = 'none';
        }

        // Gestion des images
        this.updateImageGallery(distributeur);

        // Section avis
        this.updateAvisSection(distributeur);

        this.showModal('distributeurModal');
        
        // Mettre en évidence la carte correspondante
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Animation de sélection sur la carte
        this.mapManager.highlightDistributeur(distributeur.id);
    }

    updateImageGallery(distributeur) {
        const gallery = document.getElementById('distributeurImages');
        gallery.innerHTML = '';
        
        if (distributeur.images && distributeur.images.length > 0) {
            distributeur.images.forEach((img, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = `image-item ${img.is_primary ? 'primary' : ''}`;
                imgContainer.innerHTML = `
                    <img src="${img.url}" alt="${distributeur.nom}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiB2aWV3Qm94PSIwIDAgMTAwIDc1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzUiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI1MCIgeT0iMzcuNSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZTwvdGV4dD48L3N2Zz4='">
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
    }

    updateAvisSection(distributeur) {
        const avisSection = document.getElementById('avisSection');
        if (!avisSection) return;

        // En-tête des avis
        const overallRating = document.getElementById('overallRating');
        if (overallRating) {
            if (distributeur.note_moyenne > 0) {
                overallRating.innerHTML = `
                    <div class="rating-big">${distributeur.note_moyenne.toFixed(1)}</div>
                    <div class="rating-stars">${this.generateStarRating(distributeur.note_moyenne)}</div>
                    <div class="rating-count">${distributeur.nombre_avis} avis</div>
                `;
            } else {
                overallRating.innerHTML = '<p>Soyez le premier à noter ce distributeur</p>';
            }
        }

        // Réinitialiser la notation
        this.currentRating = 0;
        this.updateRatingStars(0);

        // Gestion de la notation
        const stars = avisSection.querySelectorAll('.stars i');
        stars.forEach(star => {
            star.addEventListener('mouseover', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.updateRatingStars(rating);
            });

            star.addEventListener('mouseout', () => {
                this.updateRatingStars(this.currentRating);
            });

            star.addEventListener('click', (e) => {
                this.currentRating = parseInt(e.target.dataset.rating);
                this.updateRatingStars(this.currentRating);
            });
        });

        // Liste des avis existants
        this.updateAvisList(distributeur.avis || []);
    }

    updateRatingStars(rating) {
        const stars = document.querySelectorAll('#ratingStars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    }

    updateAvisList(avis) {
        const avisList = document.getElementById('avisList');
        if (!avisList) return;

        if (avis.length === 0) {
            avisList.innerHTML = '<p class="no-avis">Aucun avis pour le moment</p>';
            return;
        }

        avisList.innerHTML = avis.map(avisItem => `
            <div class="avis-item">
                <div class="avis-header-small">
                    <div class="avis-rating">
                        ${this.generateStarRating(avisItem.note)}
                    </div>
                    <div class="avis-date">
                        ${new Date(avisItem.created_at).toLocaleDateString('fr-FR')}
                    </div>
                </div>
                ${avisItem.commentaire ? `
                    <div class="avis-comment">${this.escapeHtml(avisItem.commentaire)}</div>
                ` : ''}
            </div>
        `).join('');
    }

    async submitAvis() {
        if (!this.selectedDistributeur || this.currentRating === 0) {
            this.showNotification('Veuillez sélectionner une note', 'warning');
            return;
        }

        const comment = document.getElementById('avisComment').value;

        try {
            await this.api.createAvis({
                distributeur_id: this.selectedDistributeur.id,
                note: this.currentRating,
                commentaire: comment
            });

            this.showNotification('Votre avis a été publié avec succès', 'success');
            
            // Recharger les détails du distributeur
            const updatedDetails = await this.loadDistributeurDetails(this.selectedDistributeur.id);
            if (updatedDetails) {
                this.showDistributeurDetails(updatedDetails);
            }
            
        } catch (error) {
            console.error('Erreur publication avis:', error);
            this.showNotification('Erreur lors de la publication de l\'avis', 'error');
        }
    }

    async locateUser() {
        const btn = document.getElementById('locateBtn');
        if (!btn) return;

        btn.classList.add('loading');
        this.updateGPSStatus('Recherche GPS...');

        try {
            const position = await this.getCurrentPosition();
            this.userPosition = position;
            
            const userCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            this.mapManager.flyTo(userCoords.lat, userCoords.lng, 16);
            this.mapManager.addUserMarker(userCoords.lat, userCoords.lng);
            
            // Mettre à jour le statut GPS
            this.updateGPSStatus('GPS connecté', 'connected');
            
            // Charger les distributeurs proches
            await this.loadDistributeurs({
                lat: userCoords.lat,
                lng: userCoords.lng,
                radius: document.getElementById('radiusFilter')?.value || 10
            });
            
            this.showNotification('Position localisée avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.updateGPSStatus('GPS non disponible', 'error');
            
            let errorMessage = 'Impossible d\'accéder à votre position';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Permission de géolocalisation refusée';
            } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Délai de localisation dépassé';
            }
            
            this.showNotification(errorMessage, 'error');
        } finally {
            btn.classList.remove('loading');
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

    updateGPSStatus(message, status = '') {
        const gpsStatus = document.getElementById('gpsStatus');
        if (!gpsStatus) return;

        gpsStatus.innerHTML = `<i class="fas fa-satellite"></i><span>${message}</span>`;
        gpsStatus.className = `gps-status ${status}`;
    }

    async startNavigation() {
        if (!this.userPosition || !this.selectedDistributeur) {
            this.showNotification('Localisez-vous d\'abord pour démarrer la navigation', 'warning');
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

        try {
            await this.mapManager.startNavigation(start, end);
            this.updateNavigationInfo(start, end);
            this.showNotification('Navigation démarrée', 'success');
        } catch (error) {
            console.error('Erreur navigation:', error);
            this.showNotification('Erreur lors du démarrage de la navigation', 'error');
        }
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '40 km/h';
        document.getElementById('remainingDistance').textContent = `${distance.toFixed(1)} km`;

        // Générer les étapes de navigation
        this.generateNavigationSteps(start, end, distance);
    }

    generateNavigationSteps(start, end, distance) {
        const stepsContainer = document.getElementById('navigationSteps');
        if (!stepsContainer) return;

        const steps = [
            { 
                instruction: 'Départ de votre position actuelle', 
                distance: '0 km',
                icon: 'fa-play'
            },
            { 
                instruction: 'Continuer tout droit sur 200m', 
                distance: '0.2 km',
                icon: 'fa-arrow-up'
            },
            { 
                instruction: 'Tourner à droite au carrefour', 
                distance: '0.8 km',
                icon: 'fa-arrow-right'
            },
            { 
                instruction: 'Prendre la deuxième sortie au rond-point', 
                distance: '1.5 km',
                icon: 'fa-redo'
            },
            { 
                instruction: `Destination: ${this.selectedDistributeur.nom}`, 
                distance: `${distance.toFixed(1)} km`,
                icon: 'fa-flag-checkered'
            }
        ];

        stepsContainer.innerHTML = steps.map((step, index) => `
            <div class="step-item ${index === steps.length - 1 ? 'arrival' : ''} ${index === 0 ? 'current' : ''}">
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

    updateNavigationProgress() {
        if (!this.navigationActive) return;
        
        // Simulation de la progression (dans une vraie app, utiliser les données GPS réelles)
        const remainingElement = document.getElementById('remainingDistance');
        if (remainingElement) {
            const currentDistance = parseFloat(remainingElement.textContent);
            if (currentDistance > 0.1) {
                const newDistance = Math.max(0, currentDistance - 0.1);
                remainingElement.textContent = `${newDistance.toFixed(1)} km`;
                
                // Mettre à jour l'étape courante
                const steps = document.querySelectorAll('.step-item');
                steps.forEach(step => step.classList.remove('current'));
                
                if (newDistance > 0) {
                    const currentStepIndex = Math.floor((1 - newDistance / parseFloat(document.getElementById('routeDistance').textContent)) * (steps.length - 1));
                    if (steps[currentStepIndex]) {
                        steps[currentStepIndex].classList.add('current');
                    }
                }
            }
        }
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

    // Gestion des vues
    switchView(view) {
        // Mettre à jour la navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Appliquer la vue
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

        this.loadDistributeurs({ search: query });
    }

    handleFilter() {
        const type = document.getElementById('typeFilter')?.value || 'all';
        const ville = document.getElementById('villeFilter')?.value || 'all';
        const radius = document.getElementById('radiusFilter')?.value || '10';
        const sort = document.getElementById('sortFilter')?.value || 'distance';
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        filters.radius = radius;
        
        // Si l'utilisateur est localisé, utiliser sa position
        if (this.userPosition) {
            filters.lat = this.userPosition.coords.latitude;
            filters.lng = this.userPosition.coords.longitude;
        }
        
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
        
        this.showNotification(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Vérification des permissions de géolocalisation
    async checkGeolocationPermission() {
        if (!navigator.permissions) return;

        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            this.updatePermissionState(result.state);
            
            result.onchange = () => {
                this.updatePermissionState(result.state);
            };
        } catch (error) {
            console.log('API Permissions non supportée');
        }
    }

    updatePermissionState(state) {
        if (state === 'granted') {
            this.updateGPSStatus('GPS prêt', 'connected');
        } else if (state === 'denied') {
            this.updateGPSStatus('GPS bloqué', 'error');
        }
    }

    // Menu mobile
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        
        if (sidebar) {
            sidebar.classList.toggle('active');
            toggleBtn.innerHTML = sidebar.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        }
    }

    hideMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        
        if (sidebar) {
            sidebar.classList.remove('active');
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
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
            const result = await this.authManager.login(username, password);
            if (result.success) {
                this.showNotification('Connexion administrateur réussie', 'success');
                setTimeout(() => {
                    window.location.href = '/admin.html';
                }, 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur connexion admin:', error);
            this.showNotification('Identifiants incorrects', 'error');
        }
    }

    // Partage
    shareDistributeur() {
        if (!this.selectedDistributeur) return;

        const shareData = {
            title: this.selectedDistributeur.nom,
            text: `Découvrez ${this.selectedDistributeur.nom} sur CTL-LOKET`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            // Fallback: copier dans le presse-papier
            navigator.clipboard.writeText(shareData.url).then(() => {
                this.showNotification('Lien copié dans le presse-papier', 'success');
            }).catch(() => {
                this.showNotification('Impossible de partager', 'error');
            });
        }
    }

    // Recentrage carte
    recenterMap() {
        if (this.userPosition) {
            this.mapManager.flyTo(
                this.userPosition.coords.latitude,
                this.userPosition.coords.longitude,
                16
            );
        } else {
            this.mapManager.flyTo(4.0511, 9.7679, 12); // Douala par défaut
        }
        this.showNotification('Carte recentrée', 'info');
    }

    // Utilitaires d'interface
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId = null) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
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
        this.mapManager.stopNavigation();
        this.navigationActive = false;
        this.showNotification('Navigation arrêtée', 'info');
    }

    showLoading(message = 'Chargement...') {
        const overlay = document.getElementById('loadingOverlay');
        const content = overlay?.querySelector('.loading-content p');
        
        if (overlay) {
            if (content) content.textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <div class="notification-content">
                <div class="notification-title">${this.getNotificationTitle(type)}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);

        // Fermeture manuelle
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification(notification);
        });

        // Fermeture automatique
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }

        return notification;
    }

    hideNotification(notification) {
        if (!notification.parentNode) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Succès',
            error: 'Erreur',
            warning: 'Attention',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    updateResultsCount(count) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${count} résultat${count !== 1 ? 's' : ''}`;
        }
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        this.showNotification('Style de carte changé', 'info');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Erreur fullscreen: ${err.message}`);
                this.showNotification('Plein écran non supporté', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que Mapbox est chargé
    if (typeof mapboxgl === 'undefined') {
        console.error('Mapbox GL JS non chargé');
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; gap: 1rem; background: #0f0f0f; color: white;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4444;"></i>
                <h2>Erreur de chargement</h2>
                <p>Mapbox GL JS n'a pas pu être chargé. Vérifiez votre connexion internet.</p>
                <button onclick="window.location.reload()" style="background: #00d4ff; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
        return;
    }

    // Démarrer l'application
    window.ctlLoketApp = new CTLLoketApp();
});

// Exposer certaines méthodes globalement pour les événements
window.submitAvis = function() {
    if (window.ctlLoketApp) {
        window.ctlLoketApp.submitAvis();
    }
};
