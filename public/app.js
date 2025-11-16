// Configuration Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21pMHpzanhzMTBnNDJpcHl5amp3Y3UxMSJ9.vBVUzayPx57ti_dbj0LuCw';

class CTLLoketApp {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.distributeurMarkers = [];
        this.currentDistributeurs = [];
        this.userPosition = null;
        this.navigationActive = false;
        this.selectedDistributeur = null;
        this.currentRoute = null;
        this.navigationInterval = null;
        
        this.init();
    }

    async init() {
        await this.initMap();
        this.bindEvents();
        this.loadDistributeurs();
        this.setupTheme();
        this.showNotification('CTL-LOKET prêt à vous servir !', 'success');
    }

    async initMap() {
        try {
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/navigation-day-v1',
                center: [11.5021, 3.8480],
                zoom: 6,
                pitch: 45,
                bearing: 0,
                antialias: true
            });

            this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

            // Attendre le chargement de la carte
            await new Promise((resolve) => {
                this.map.on('load', resolve);
            });

            console.log('✅ Carte Mapbox initialisée');

        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showNotification('Erreur de chargement de la carte', 'error');
        }
    }

    bindEvents() {
        // Navigation entre les vues
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
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
        document.getElementById('currentLocationBtn').addEventListener('click',
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

        // Modals
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });

        // Navigation
        document.getElementById('navigateBtn').addEventListener('click', 
            this.startNavigation.bind(this)
        );
        document.getElementById('stopNavigation').addEventListener('click',
            this.stopNavigation.bind(this)
        );

        // Actions rapides
        document.getElementById('quickNavigate').addEventListener('click',
            this.quickNavigate.bind(this)
        );
        document.getElementById('shareLocation').addEventListener('click',
            this.shareLocation.bind(this)
        );

        // Appel et partage
        document.getElementById('callBtn').addEventListener('click',
            this.callDistributeur.bind(this)
        );
        document.getElementById('shareBtn').addEventListener('click',
            this.shareDistributeur.bind(this)
        );

        // Avis
        document.getElementById('submitAvis').addEventListener('click',
            this.submitAvis.bind(this)
        );

        // Mobile
        document.getElementById('mobileMenuBtn').addEventListener('click',
            this.toggleSidebar.bind(this)
        );
        document.getElementById('closeSidebar').addEventListener('click',
            this.toggleSidebar.bind(this)
        );

        // Contrôles carte
        document.getElementById('mapStyleBtn').addEventListener('click',
            this.cycleMapStyle.bind(this)
        );
        document.getElementById('fullscreenBtn').addEventListener('click',
            this.toggleFullscreen.bind(this)
        );

        // Fermer modals en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        // Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModals();
                this.hideNavigation();
            }
        });
    }

    async loadDistributeurs(filters = {}) {
        try {
            this.showLoading();
            
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });

            const response = await fetch(`/api/distributeurs?${params}`);
            const data = await response.json();

            if (data.success) {
                this.currentDistributeurs = data.data;
                this.updateDistributeursOnMap();
                this.updateResultsList();
                this.updateResultsCount();
                this.hideLoading();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showNotification('Erreur de chargement des distributeurs', 'error');
            this.hideLoading();
        }
    }

    updateDistributeursOnMap() {
        // Supprimer les anciens marqueurs
        this.distributeurMarkers.forEach(marker => marker.remove());
        this.distributeurMarkers = [];

        // Ajouter les nouveaux marqueurs
        this.currentDistributeurs.forEach(distributeur => {
            this.addDistributeurMarker(distributeur);
        });
    }

    addDistributeurMarker(distributeur) {
        const el = document.createElement('div');
        el.className = 'distributeur-marker';
        el.innerHTML = this.getMarkerHTML(distributeur);

        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([distributeur.longitude, distributeur.latitude])
        .addTo(this.map);

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDistributeurDetails(distributeur);
        });

        this.distributeurMarkers.push(marker);
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
                <div class="marker-icon ${distributeur.type}" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                ${distributeur.distance ? `
                    <div class="marker-distance">${distributeur.distance.toFixed(1)}km</div>
                ` : ''}
                ${distributeur.note_moyenne > 0 ? `
                    <div class="marker-rating">
                        <i class="fas fa-star"></i>
                        <span>${distributeur.note_moyenne.toFixed(1)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateResultsList() {
        const container = document.getElementById('resultsList');
        const countElement = document.getElementById('foundCount');
        
        if (this.currentDistributeurs.length === 0) {
            container.innerHTML = '<div class="no-results">Aucun distributeur trouvé</div>';
            countElement.textContent = '0';
            return;
        }

        container.innerHTML = '';
        countElement.textContent = this.currentDistributeurs.length;

        this.currentDistributeurs.forEach(distributeur => {
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
                ${distributeur.distance ? `
                    <span class="distance-badge">${distributeur.distance.toFixed(1)}km</span>
                ` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            this.showDistributeurDetails(distributeur);
            this.highlightDistributeur(distributeur);
        });

        return card;
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    async showDistributeurDetails(distributeur) {
        this.selectedDistributeur = distributeur;
        
        try {
            const response = await fetch(`/api/distributeurs/${distributeur.id}`);
            const data = await response.json();

            if (data.success) {
                this.populateDistributeurModal(data.data);
                this.showModal('distributeurModal');
            }
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            this.populateDistributeurModal(distributeur);
            this.showModal('distributeurModal');
        }
    }

    populateDistributeurModal(distributeur) {
        // Informations de base
        document.getElementById('distributeurName').textContent = distributeur.nom;
        document.getElementById('distributeurType').textContent = this.getTypeLabel(distributeur.type);
        document.getElementById('distributeurAddress').textContent = distributeur.adresse;
        document.getElementById('distributeurVille').textContent = distributeur.ville;
        document.getElementById('distributeurTelephone').textContent = distributeur.telephone || 'Non disponible';
        document.getElementById('distributeurPrix').textContent = distributeur.prix_moyen || 'Variable';
        document.getElementById('distributeurDescription').textContent = 
            distributeur.description || 'Aucune description disponible';

        // Note et évaluation
        const ratingText = document.getElementById('ratingText');
        if (distributeur.note_moyenne > 0) {
            ratingText.textContent = `${distributeur.note_moyenne.toFixed(1)}/5 (${distributeur.nombre_avis} avis)`;
            document.querySelector('.rating-display .stars').innerHTML = 
                this.generateStarRating(distributeur.note_moyenne);
        } else {
            ratingText.textContent = 'Aucune évaluation';
            document.querySelector('.rating-display .stars').innerHTML = 
                '<span style="color: var(--text-secondary);">Aucune note</span>';
        }

        // Images
        const gallery = document.getElementById('distributeurImages');
        gallery.innerHTML = '';

        if (distributeur.images && distributeur.images.length > 0) {
            distributeur.images.forEach((image, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = `image-item ${image.is_primary ? 'primary' : ''}`;
                imgContainer.innerHTML = `
                    <img src="${image.url}" alt="${distributeur.nom}" onerror="this.style.display='none'">
                    ${image.is_primary ? '<span class="primary-badge">Principale</span>' : ''}
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

        // Avis
        this.populateAvisSection(distributeur.avis || []);
    }

    populateAvisSection(avis) {
        const avisList = document.getElementById('avisList');
        avisList.innerHTML = '';

        if (avis.length === 0) {
            avisList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Aucun avis pour le moment</p>';
            return;
        }

        avis.forEach(avisItem => {
            const avisElement = document.createElement('div');
            avisElement.className = 'avis-item';
            avisElement.innerHTML = `
                <div class="avis-header">
                    <div class="avis-stars">${this.generateStarRating(avisItem.note)}</div>
                    <div class="avis-date">${new Date(avisItem.created_at).toLocaleDateString()}</div>
                </div>
                <div class="avis-comment">${avisItem.commentaire || 'Aucun commentaire'}</div>
            `;
            avisList.appendChild(avisElement);
        });
    }

    highlightDistributeur(distributeur) {
        // Voler vers le distributeur
        this.map.flyTo({
            center: [distributeur.longitude, distributeur.latitude],
            zoom: 15,
            duration: 1000
        });

        // Mettre en évidence la carte
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }

    async locateUser() {
        try {
            this.showLoading('Localisation en cours...');
            
            const position = await this.getCurrentPosition();
            this.userPosition = position;
            
            const coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Centrer la carte sur la position
            this.map.flyTo({
                center: [coords.lng, coords.lat],
                zoom: 15,
                duration: 1500
            });

            // Ajouter le marqueur utilisateur
            this.addUserMarker(coords.lat, coords.lng);

            // Charger les distributeurs proches
            await this.loadDistributeurs({
                lat: coords.lat,
                lng: coords.lng,
                radius: 5
            });

            this.hideLoading();
            this.showNotification('Position localisée avec succès', 'success');

        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.hideLoading();
            
            let message = 'Impossible d\'accéder à votre position';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Permission de localisation refusée. Activez-la dans les paramètres de votre navigateur.';
            } else if (error.code === error.TIMEOUT) {
                message = 'Délai de localisation dépassé';
            }
            
            this.showNotification(message, 'error');
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

        // Mettre à jour les informations de navigation
        this.updateNavigationInfo(start, end);
        
        // Démarrer la simulation de navigation
        this.simulateNavigation(start, end);
        
        this.showNotification('Navigation démarrée vers ' + this.selectedDistributeur.nom, 'success');
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDestination').textContent = this.selectedDistributeur.nom;
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '40 km/h';

        // Générer les étapes
        this.generateNavigationSteps(start, end, distance);
    }

    generateNavigationSteps(start, end, distance) {
        const stepsContainer = document.getElementById('navigationSteps');
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

    simulateNavigation(start, end) {
        const duration = 30000; // 30 secondes de simulation
        const startTime = Date.now();
        let progress = 0;

        this.navigationInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);

            // Mettre à jour la barre de progression
            document.getElementById('progressFill').style.width = `${progress * 100}%`;
            document.getElementById('progressText').textContent = `${Math.round(progress * 100)}% parcouru`;

            // Mettre à jour la position simulée
            if (this.userMarker) {
                const currentLat = start.lat + (end.lat - start.lat) * progress;
                const currentLng = start.lng + (end.lng - start.lng) * progress;
                this.userMarker.setLngLat([currentLng, currentLat]);
            }

            if (progress >= 1) {
                this.completeNavigation();
            }
        }, 100);
    }

    completeNavigation() {
        clearInterval(this.navigationInterval);
        this.showNotification('Navigation terminée ! Vous êtes arrivé à destination.', 'success');
        
        // Effets d'arrivée
        document.querySelector('.step-item.arrival').classList.add('arrival-pulse');
        
        setTimeout(() => {
            this.stopNavigation();
        }, 3000);
    }

    stopNavigation() {
        this.navigationActive = false;
        this.hideNavigation();
        
        if (this.navigationInterval) {
            clearInterval(this.navigationInterval);
            this.navigationInterval = null;
        }
        
        // Réinitialiser la progression
        document.getElementById('progressFill').style.width = '0%';
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateTime(distance) {
        const vitesseMoyenne = 40; // km/h en ville
        const minutes = Math.round((distance / vitesseMoyenne) * 60);
        return `${minutes} min`;
    }

    async submitAvis() {
        if (!this.selectedDistributeur) return;

        const stars = document.querySelectorAll('#ratingStars i');
        const rating = Array.from(stars).filter(star => 
            star.classList.contains('fas')
        ).length;

        if (rating === 0) {
            this.showNotification('Veuillez sélectionner une note', 'warning');
            return;
        }

        const comment = document.getElementById('avisComment').value.trim();

        try {
            const response = await fetch('/api/avis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    distributeur_id: this.selectedDistributeur.id,
                    note: rating,
                    commentaire: comment
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Votre avis a été publié avec succès', 'success');
                this.hideModal('distributeurModal');
                
                // Recharger les détails du distributeur
                setTimeout(() => {
                    this.showDistributeurDetails(this.selectedDistributeur);
                }, 1000);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Erreur publication avis:', error);
            this.showNotification('Erreur lors de la publication de l\'avis', 'error');
        }
    }

    // Fonctionnalités avancées
    quickNavigate() {
        if (this.currentDistributeurs.length > 0) {
            const nearest = this.currentDistributeurs[0];
            this.showDistributeurDetails(nearest);
            this.startNavigation();
        } else {
            this.showNotification('Aucun distributeur trouvé à proximité', 'warning');
        }
    }

    shareLocation() {
        if (this.userPosition) {
            const coords = this.userPosition.coords;
            const url = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Ma position actuelle',
                    text: 'Voici ma position actuelle',
                    url: url
                });
            } else {
                navigator.clipboard.writeText(url);
                this.showNotification('Lien de position copié dans le presse-papier', 'success');
            }
        } else {
            this.showNotification('Localisez-vous d\'abord', 'warning');
        }
    }

    callDistributeur() {
        if (this.selectedDistributeur && this.selectedDistributeur.telephone) {
            window.open(`tel:${this.selectedDistributeur.telephone}`, '_blank');
        } else {
            this.showNotification('Numéro de téléphone non disponible', 'warning');
        }
    }

    shareDistributeur() {
        if (this.selectedDistributeur) {
            const distributeur = this.selectedDistributeur;
            const text = `Découvrez ${distributeur.nom} - ${distributeur.adresse}, ${distributeur.ville}`;
            const url = window.location.href;
            
            if (navigator.share) {
                navigator.share({
                    title: distributeur.nom,
                    text: text,
                    url: url
                });
            } else {
                navigator.clipboard.writeText(`${text}\n${url}`);
                this.showNotification('Informations copiées dans le presse-papier', 'success');
            }
        }
    }

    // Gestion des vues
    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        switch(view) {
            case 'map':
                this.map.setPitch(45);
                break;
            case 'list':
                this.map.setPitch(0);
                break;
            case 'radar':
                this.map.setPitch(60);
                this.animateRadar();
                break;
        }
    }

    animateRadar() {
        let bearing = 0;
        const animate = () => {
            bearing = (bearing + 0.5) % 360;
            this.map.setBearing(bearing);
            
            if (document.querySelector('[data-view="radar"]').classList.contains('active')) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    // Recherche et filtres
    handleSearch(e) {
        const query = e.target.value.trim();
        this.loadDistributeurs({ search: query });
    }

    handleFilter() {
        const type = document.getElementById('typeFilter').value;
        const ville = document.getElementById('villeFilter').value;
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        
        this.loadDistributeurs(filters);
    }

    updateResultsCount() {
        const count = this.currentDistributeurs.length;
        document.getElementById('resultsCount').textContent = `${count} trouvé${count > 1 ? 's' : ''}`;
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
        
        this.showNotification(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'success');
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Styles de carte
    cycleMapStyle() {
        const styles = [
            'mapbox://styles/mapbox/navigation-day-v1',
            'mapbox://styles/mapbox/navigation-night-v1',
            'mapbox://styles/mapbox/satellite-streets-v12',
            'mapbox://styles/mapbox/streets-v12'
        ];
        
        const currentStyle = this.map.getStyle().sprite;
        let nextIndex = 0;
        
        for (let i = 0; i < styles.length; i++) {
            if (currentStyle.includes(styles[i].split('/').pop())) {
                nextIndex = (i + 1) % styles.length;
                break;
            }
        }
        
        this.map.setStyle(styles[nextIndex]);
        this.showNotification('Style de carte changé', 'success');
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

    // Gestion mobile
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }

    // Utilitaires d'interface
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        if (modalId) {
            document.getElementById(modalId).classList.remove('active');
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        document.body.style.overflow = '';
    }

    hideModals() {
        this.hideModal();
        this.hideAdminLogin();
    }

    showNavigationPanel() {
        document.getElementById('navigationPanel').classList.add('active');
    }

    hideNavigation() {
        document.getElementById('navigationPanel').classList.remove('active');
    }

    showAdminLogin() {
        this.showModal('adminLoginModal');
    }

    hideAdminLogin() {
        this.hideModal('adminLoginModal');
    }

    showLoading(message = 'Chargement...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <div class="notification-content">
                <h4>${this.getNotificationTitle(type)}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;

        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.style.opacity = '1', 100);

        // Fermeture automatique
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // Fermeture manuelle
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        });
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

    getNotificationTitle(type) {
        const titles = {
            'success': 'Succès',
            'error': 'Erreur',
            'warning': 'Attention',
            'info': 'Information'
        };
        return titles[type] || 'Information';
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
}

// Gestion de la connexion admin
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/admin.html';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur connexion admin:', error);
        alert('Erreur de connexion: ' + error.message);
    }
});

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CTLLoketApp();
});
