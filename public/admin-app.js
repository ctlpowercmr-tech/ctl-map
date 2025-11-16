import API from './api.js';
import AuthManager from './auth.js';
import MapManager from './map-manager.js';

class AdminApp {
    constructor() {
        this.api = new API();
        this.auth = new AuthManager();
        this.mapManager = new MapManager();
        this.currentDistributeurs = [];
        this.currentEditingId = null;
        this.uploadedImages = [];
        this.tempMarker = null;
        
        this.init();
    }

    async init() {
        // Vérifier l'authentification
        if (!this.auth.requireAuth()) {
            return;
        }

        try {
            await this.initMap();
            this.bindEvents();
            this.setupAdminUI();
            await this.loadDashboard();
            await this.loadDistributeurs();
            
            console.log('✅ AdminApp initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation AdminApp:', error);
            this.showError('Erreur lors du chargement de l\'interface admin');
        }
    }

    async initMap() {
        try {
            await this.mapManager.init('adminMap');
            this.setupAdminMapEvents();
        } catch (error) {
            console.error('❌ Erreur initialisation carte admin:', error);
            this.showError('Impossible de charger la carte');
        }
    }

    setupAdminMapEvents() {
        // Clic sur la carte pour définir l'emplacement
        this.mapManager.onMapClick((e) => {
            const coords = this.mapManager.getClickCoordinates(e);
            this.setDistributeurLocation(coords.lat, coords.lng);
        });

        // Clic sur un marqueur existant pour éditer
        this.mapManager.onMarkerClick((distributeur) => {
            this.editDistributeur(distributeur.id);
        });
    }

    setDistributeurLocation(lat, lng) {
        document.getElementById('distributeurLat').value = lat.toFixed(6);
        document.getElementById('distributeurLng').value = lng.toFixed(6);
        
        this.addTempMarker(lat, lng);
        this.showNotification(`Position définie: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'info');
    }

    addTempMarker(lat, lng) {
        // Supprimer l'ancien marqueur temporaire
        if (this.tempMarker) {
            this.tempMarker.remove();
        }

        try {
            const el = document.createElement('div');
            el.className = 'temp-marker';
            el.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
            el.style.color = '#00d4ff';
            el.style.fontSize = '2rem';
            el.style.filter = 'drop-shadow(0 4px 8px rgba(0, 212, 255, 0.4))';

            this.tempMarker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom'
            })
            .setLngLat([lng, lat])
            .addTo(this.mapManager.map);

        } catch (error) {
            console.error('❌ Erreur ajout marqueur temporaire:', error);
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(item.dataset.panel);
            });
        });

        // Formulaire distributeur
        document.getElementById('addDistributeurForm').addEventListener('submit', 
            this.handleDistributeurSubmit.bind(this)
        );

        // Localisation automatique
        document.getElementById('getCurrentLocation').addEventListener('click',
            this.getCurrentLocation.bind(this)
        );

        // Gestion des images
        document.getElementById('distributeurImages').addEventListener('change',
            this.handleImageUpload.bind(this)
        );

        // Recherche admin
        document.getElementById('adminSearch').addEventListener('input',
            this.debounce(this.handleAdminSearch.bind(this), 300)
        );

        // Filtres admin
        document.getElementById('adminTypeFilter').addEventListener('change',
            this.handleAdminFilter.bind(this)
        );
        document.getElementById('adminVilleFilter').addEventListener('change',
            this.handleAdminFilter.bind(this)
        );

        // Actions
        document.getElementById('refreshDistributeurs').addEventListener('click',
            this.loadDistributeurs.bind(this)
        );
        document.getElementById('resetForm').addEventListener('click',
            this.resetForm.bind(this)
        );
        document.getElementById('logoutBtn').addEventListener('click',
            this.logout.bind(this)
        );

        console.log('✅ Événements admin liés avec succès');
    }

    setupAdminUI() {
        // Afficher les informations de l'admin
        const admin = this.auth.getAdminData();
        if (admin) {
            document.getElementById('adminName').textContent = admin.full_name || admin.username;
        }

        // Charger les données dynamiques
        this.loadVilles();
        this.setupRealTimeUpdates();
    }

    async switchPanel(panelId) {
        // Mettre à jour la navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelId}"]`).classList.add('active');

        // Masquer tous les panels
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Afficher le panel sélectionné
        document.getElementById(panelId).classList.add('active');

        // Charger les données spécifiques au panel
        switch(panelId) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'distributeurs':
                await this.loadDistributeurs();
                break;
            case 'ajouter':
                this.setupAddPanel();
                break;
            case 'statistiques':
                await this.loadStatistiquesAvancees();
                break;
            case 'parametres':
                this.loadParametres();
                break;
        }
    }

    setupAddPanel() {
        // Recentrer la carte sur une vue par défaut
        this.mapManager.flyTo(4.0511, 9.7679, 12); // Douala
        this.resetForm();
    }

    async loadDashboard() {
        try {
            this.showLoading('Chargement des statistiques...');
            const response = await this.api.getStatistiques();
            
            if (response.success) {
                this.updateDashboard(response.data);
                this.createCharts(response.data);
                this.showNotification('Tableau de bord mis à jour', 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
            this.showError('Erreur lors du chargement des statistiques');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboard(stats) {
        // Mettre à jour les cartes de statistiques
        document.getElementById('totalDistributeurs').textContent = stats.total.toLocaleString();
        document.getElementById('totalVilles').textContent = stats.parVille.length.toLocaleString();
        document.getElementById('activiteMensuelle').textContent = stats.nouveauxCeMois.toLocaleString();

        // Mettre à jour les listes détaillées
        this.updateStatsLists(stats);
    }

    updateStatsLists(stats) {
        // Top villes
        const topVilles = stats.parVille.slice(0, 5);
        const villesList = document.getElementById('topVillesList');
        if (villesList) {
            villesList.innerHTML = topVilles.map(ville => `
                <div class="stats-item">
                    <span class="stats-label">${ville.ville}</span>
                    <span class="stats-value">${ville.count}</span>
                </div>
            `).join('');
        }

        // Top types
        const topTypes = stats.parType.slice(0, 5);
        const typesList = document.getElementById('topTypesList');
        if (typesList) {
            typesList.innerHTML = topTypes.map(type => `
                <div class="stats-item">
                    <span class="stats-label">${this.getTypeLabel(type.type)}</span>
                    <span class="stats-value">${type.count}</span>
                </div>
            `).join('');
        }
    }

    createCharts(stats) {
        // Chart des types (camembert)
        const typeCtx = document.getElementById('typeChart');
        if (typeCtx) {
            new Chart(typeCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.parType.map(t => this.getTypeLabel(t.type)),
                    datasets: [{
                        data: stats.parType.map(t => t.count),
                        backgroundColor: [
                            '#e74c3c', '#3498db', '#9b59b6', '#f39c12',
                            '#1abc9c', '#34495e', '#d35400', '#8e44ad'
                        ],
                        borderWidth: 2,
                        borderColor: '#1a1a1a'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }

        // Chart des villes (barres)
        const villeCtx = document.getElementById('villeChart');
        if (villeCtx) {
            new Chart(villeCtx, {
                type: 'bar',
                data: {
                    labels: stats.parVille.slice(0, 8).map(v => v.ville),
                    datasets: [{
                        label: 'Nombre de distributeurs',
                        data: stats.parVille.slice(0, 8).map(v => v.count),
                        backgroundColor: '#00d4ff',
                        borderColor: '#00b8e6',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        },
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                            }
                        }
                    }
                }
            });
        }
    }

    async loadDistributeurs(filters = {}) {
        try {
            this.showLoading('Chargement des distributeurs...');
            const response = await this.api.getDistributeurs(filters);
            
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.updateDistributeursTable(this.currentDistributeurs);
                this.updateAdminMap(this.currentDistributeurs);
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('❌ Erreur chargement distributeurs:', error);
            this.showError('Erreur lors du chargement des distributeurs');
        } finally {
            this.hideLoading();
        }
    }

    updateDistributeursTable(distributeurs) {
        const tbody = document.getElementById('distributeursTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (distributeurs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">
                        <i class="fas fa-search"></i>
                        <p>Aucun distributeur trouvé</p>
                    </td>
                </tr>
            `;
            return;
        }

        distributeurs.forEach(distributeur => {
            const row = this.createDistributeurTableRow(distributeur);
            tbody.appendChild(row);
        });
    }

    createDistributeurTableRow(distributeur) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="distributeur-info">
                    <strong>${this.escapeHtml(distributeur.nom)}</strong>
                    ${distributeur.note_moyenne > 0 ? `
                        <div class="table-rating">
                            <i class="fas fa-star"></i>
                            ${distributeur.note_moyenne.toFixed(1)}
                            <small>(${distributeur.nombre_avis})</small>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td>
                <span class="type-badge ${distributeur.type}">
                    ${this.getTypeLabel(distributeur.type)}
                </span>
            </td>
            <td>${this.escapeHtml(distributeur.ville)}</td>
            <td>${this.escapeHtml(distributeur.adresse)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="adminApp.editDistributeur(${distributeur.id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="adminApp.deleteDistributeur(${distributeur.id})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-view" onclick="adminApp.viewDistributeur(${distributeur.id})" title="Voir sur la carte">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        return row;
    }

    updateAdminMap(distributeurs) {
        this.mapManager.updateDistributeurs(distributeurs);
    }

    async handleDistributeurSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            this.showLoading(this.currentEditingId ? 'Modification...' : 'Création...');

            let result;
            if (this.currentEditingId) {
                result = await this.api.updateDistributeur(this.currentEditingId, formData);
            } else {
                result = await this.api.createDistributeur(formData);
            }

            if (result.success) {
                this.showNotification(
                    this.currentEditingId ? 
                    'Distributeur modifié avec succès' : 
                    'Distributeur créé avec succès', 
                    'success'
                );

                this.resetForm();
                await this.loadDistributeurs();
                this.switchPanel('distributeurs');
                
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Erreur sauvegarde distributeur:', error);
            this.showError('Erreur lors de la sauvegarde du distributeur');
        } finally {
            this.hideLoading();
        }
    }

    getFormData() {
        return {
            nom: document.getElementById('distributeurNom').value,
            type: document.getElementById('distributeurType').value,
            ville: document.getElementById('distributeurVille').value,
            adresse: document.getElementById('distributeurAdresse').value,
            latitude: parseFloat(document.getElementById('distributeurLat').value),
            longitude: parseFloat(document.getElementById('distributeurLng').value),
            description: document.getElementById('distributeurDescription').value,
            telephone: document.getElementById('distributeurTelephone')?.value || '',
            email: document.getElementById('distributeurEmail')?.value || '',
            site_web: document.getElementById('distributeurSiteWeb')?.value || '',
            prix_moyen: document.getElementById('distributeurPrix')?.value || '',
            horaires: this.getHorairesData(),
            services: this.getServicesData(),
            images: this.uploadedImages
        };
    }

    getHorairesData() {
        // Implémentation basique des horaires
        return {
            lundi: "09:00-18:00",
            mardi: "09:00-18:00",
            mercredi: "09:00-18:00", 
            jeudi: "09:00-18:00",
            vendredi: "09:00-18:00",
            samedi: "09:00-13:00",
            dimanche: "Fermé"
        };
    }

    getServicesData() {
        const type = document.getElementById('distributeurType').value;
        const servicesParType = {
            nourriture: ['Paiement mobile', 'Retrait', 'Snacks', 'Boissons'],
            boissons: ['Boissons fraîches', 'Eau', 'Sodas', 'Jus naturels'],
            billets: ['Billets électroniques', 'Réservation', 'Paiement en ligne'],
            divers: ['Service rapide', '24h/24', 'Distributeur automatique']
        };
        
        return servicesParType[type] || ['Service standard'];
    }

    validateForm(data) {
        const errors = [];

        if (!data.nom?.trim()) {
            errors.push('Le nom du distributeur est requis');
        }

        if (!data.type) {
            errors.push('Le type de distributeur est requis');
        }

        if (!data.ville) {
            errors.push('La ville est requise');
        }

        if (!data.adresse?.trim()) {
            errors.push('L\'adresse est requise');
        }

        if (!data.latitude || !data.longitude) {
            errors.push('La localisation est requise');
        }

        if (errors.length > 0) {
            this.showError(errors.join('<br>'));
            return false;
        }

        return true;
    }

    async getCurrentLocation() {
        try {
            this.showLoading('Localisation en cours...');

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            this.setDistributeurLocation(lat, lng);
            this.mapManager.flyTo(lat, lng, 16);

        } catch (error) {
            console.error('❌ Erreur géolocalisation:', error);
            this.showError('Impossible d\'obtenir votre position actuelle');
        } finally {
            this.hideLoading();
        }
    }

    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        this.uploadedImages = [];

        // Limiter à 3 images
        const filesToUpload = files.slice(0, 3);

        for (const file of filesToUpload) {
            try {
                this.showLoading(`Upload de ${file.name}...`);
                const imageData = await this.api.uploadImage(file);
                this.uploadedImages.push(imageData);
                this.addImagePreview(imageData, file.name);
                
            } catch (error) {
                console.error('❌ Erreur upload image:', error);
                this.showError(`Erreur lors du téléchargement de ${file.name}`);
            } finally {
                this.hideLoading();
            }
        }

        // Réinitialiser l'input file
        e.target.value = '';
    }

    addImagePreview(imageData, filename) {
        const preview = document.getElementById('imagePreview');
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${imageData}" alt="${filename}">
            <button type="button" class="remove-image" title="Supprimer">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        div.querySelector('.remove-image').addEventListener('click', () => {
            this.uploadedImages = this.uploadedImages.filter(img => img !== imageData);
            div.remove();
        });
        
        preview.appendChild(div);
    }

    async editDistributeur(id) {
        try {
            this.showLoading('Chargement des données...');
            const response = await this.api.getDistributeur(id);
            
            if (response.success) {
                this.currentEditingId = id;
                this.populateForm(response.data);
                this.switchPanel('ajouter');
                
                // Centrer sur le distributeur
                this.mapManager.flyTo(
                    response.data.latitude,
                    response.data.longitude,
                    16
                );

                this.showNotification('Distributeur chargé pour modification', 'info');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('❌ Erreur chargement distributeur:', error);
            this.showError('Erreur lors du chargement du distributeur');
        } finally {
            this.hideLoading();
        }
    }

    populateForm(distributeur) {
        // Remplir le formulaire
        document.getElementById('distributeurNom').value = distributeur.nom || '';
        document.getElementById('distributeurType').value = distributeur.type || '';
        document.getElementById('distributeurVille').value = distributeur.ville || '';
        document.getElementById('distributeurAdresse').value = distributeur.adresse || '';
        document.getElementById('distributeurLat').value = distributeur.latitude || '';
        document.getElementById('distributeurLng').value = distributeur.longitude || '';
        document.getElementById('distributeurDescription').value = distributeur.description || '';
        document.getElementById('distributeurTelephone').value = distributeur.telephone || '';
        document.getElementById('distributeurEmail').value = distributeur.email || '';
        document.getElementById('distributeurSiteWeb').value = distributeur.site_web || '';
        document.getElementById('distributeurPrix').value = distributeur.prix_moyen || '';

        // Gérer les images
        this.uploadedImages = distributeur.images?.map(img => img.url) || [];
        this.updateImagePreviews();

        // Mettre à jour le titre du formulaire
        document.querySelector('#ajouter h1').textContent = 'Modifier le distributeur';

        // Ajouter un marqueur temporaire
        if (distributeur.latitude && distributeur.longitude) {
            this.addTempMarker(distributeur.latitude, distributeur.longitude);
        }
    }

    updateImagePreviews() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';

        this.uploadedImages.forEach((imageData, index) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${imageData}" alt="Image ${index + 1}">
                <button type="button" class="remove-image" title="Supprimer">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            div.querySelector('.remove-image').addEventListener('click', () => {
                this.uploadedImages.splice(index, 1);
                this.updateImagePreviews();
            });
            
            preview.appendChild(div);
        });
    }

    async deleteDistributeur(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce distributeur ? Cette action est irréversible.')) {
            return;
        }

        try {
            this.showLoading('Suppression...');
            await this.api.deleteDistributeur(id);
            
            this.showNotification('Distributeur supprimé avec succès', 'success');
            await this.loadDistributeurs();
            
        } catch (error) {
            console.error('❌ Erreur suppression distributeur:', error);
            this.showError('Erreur lors de la suppression du distributeur');
        } finally {
            this.hideLoading();
        }
    }

    viewDistributeur(id) {
        const distributeur = this.currentDistributeurs.find(d => d.id === id);
        if (distributeur) {
            this.mapManager.flyTo(distributeur.latitude, distributeur.longitude, 16);
            this.mapManager.highlightDistributeur(id);
            this.showNotification(`Centré sur ${distributeur.nom}`, 'info');
        }
    }

    handleAdminSearch(e) {
        const query = e.target.value.trim();
        this.loadDistributeurs({ search: query });
    }

    handleAdminFilter() {
        const type = document.getElementById('adminTypeFilter').value;
        const ville = document.getElementById('adminVilleFilter').value;
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        
        this.loadDistributeurs(filters);
    }

    async loadVilles() {
        try {
            const response = await this.api.getDistributeurs();
            if (response.success) {
                const villes = [...new Set(response.data.map(d => d.ville).filter(Boolean))].sort();
                this.populateVilleFilters(villes);
            }
        } catch (error) {
            console.error('❌ Erreur chargement villes:', error);
        }
    }

    populateVilleFilters(villes) {
        const selectAdmin = document.getElementById('adminVilleFilter');
        const selectForm = document.getElementById('distributeurVille');
        
        [selectAdmin, selectForm].forEach(select => {
            if (select) {
                // Garder l'option "Toutes les villes" / "Sélectionnez une ville"
                const firstOption = select.options[0];
                select.innerHTML = '';
                select.appendChild(firstOption);
                
                // Ajouter les villes
                villes.forEach(ville => {
                    const option = document.createElement('option');
                    option.value = ville;
                    option.textContent = ville;
                    select.appendChild(option);
                });
            }
        });
    }

    async loadStatistiquesAvancees() {
        try {
            this.showLoading('Chargement des statistiques avancées...');
            // Implémenter les statistiques avancées
            this.createAdvancedCharts();
        } catch (error) {
            console.error('❌ Erreur statistiques avancées:', error);
            this.showError('Erreur lors du chargement des statistiques avancées');
        } finally {
            this.hideLoading();
        }
    }

    createAdvancedCharts() {
        // Chart d'activité mensuelle
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
                    datasets: [{
                        label: 'Nouveaux distributeurs',
                        data: [12, 19, 8, 15, 12, 18, 22, 19, 14, 16, 20, 25],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        },
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        }
                    }
                }
            });
        }

        // Chart de performance
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                    datasets: [{
                        label: 'Utilisateurs actifs',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        backgroundColor: '#00d4ff'
                    }, {
                        label: 'Recherches',
                        data: [28, 48, 40, 19, 86, 27, 90],
                        backgroundColor: '#9b59b6'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        },
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                            },
                            grid: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                            }
                        }
                    }
                }
            });
        }
    }

    loadParametres() {
        // Charger les paramètres actuels
        // Cette méthode serait étendue pour charger les paramètres depuis l'API
        console.log('⚙️ Panneau paramètres chargé');
    }

    setupRealTimeUpdates() {
        // Mettre à jour les données périodiquement
        setInterval(() => {
            if (document.getElementById('dashboard').classList.contains('active')) {
                this.loadDashboard();
            }
        }, 30000); // Toutes les 30 secondes
    }

    resetForm() {
        document.getElementById('addDistributeurForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        this.currentEditingId = null;
        this.uploadedImages = [];
        
        if (this.tempMarker) {
            this.tempMarker.remove();
            this.tempMarker = null;
        }
        
        document.querySelector('#ajouter h1').textContent = 'Ajouter un distributeur';
    }

    logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.auth.logout();
        }
    }

    // Utilitaires
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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Utiliser la même méthode de notification que l'app principale
        if (window.ctlLoketApp) {
            window.ctlLoketApp.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showLoading(message = 'Chargement...') {
        // Implémenter un indicateur de chargement spécifique à l'admin
        console.log('⏳', message);
    }

    hideLoading() {
        // Cacher l'indicateur de chargement
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

// Initialisation de l'application admin
let adminApp;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        adminApp = new AdminApp();
        window.adminApp = adminApp; // Rendre accessible globalement
        
    } catch (error) {
        console.error('❌ Erreur critique AdminApp:', error);
        
        // Afficher une page d'erreur
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; gap: 2rem; background: #0f0f0f; color: white; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ff4444;"></i>
                <h1>Erreur de chargement</h1>
                <p style="text-align: center; max-width: 400px;">
                    L'interface d'administration n'a pas pu être chargée. 
                    Vérifiez votre connexion et réessayez.
                </p>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.location.reload()" style="background: #00d4ff; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Réessayer
                    </button>
                    <button onclick="window.location.href = '/'" style="background: #718096; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-home"></i> Retour à l'accueil
                    </button>
                </div>
            </div>
        `;
    }
});
