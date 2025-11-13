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
        
        this.init();
    }

    async init() {
        if (!this.auth.requireAuth()) {
            return;
        }

        await this.initMap();
        this.bindEvents();
        this.loadDashboard();
        this.loadDistributeurs();
        this.setupAdminUI();
    }

    async initMap() {
        await this.mapManager.init('adminMap');
        this.setupAdminMapEvents();
    }

    setupAdminMapEvents() {
        // Clic sur la carte pour ajouter un distributeur
        this.mapManager.onMapClick((e) => {
            const coords = this.mapManager.getClickCoordinates(e);
            document.getElementById('distributeurLat').value = coords.lat.toFixed(6);
            document.getElementById('distributeurLng').value = coords.lng.toFixed(6);
            
            // Ajouter un marqueur temporaire
            this.addTempMarker(coords.lat, coords.lng);
        });
    }

    addTempMarker(lat, lng) {
        // Supprimer l'ancien marqueur temporaire
        if (this.tempMarker) {
            this.tempMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'temp-marker';
        el.innerHTML = '<i class="fas fa-map-marker-alt"></i>';

        this.tempMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.mapManager.map);
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

        // Rafraîchissement
        document.getElementById('refreshDistributeurs').addEventListener('click',
            this.loadDistributeurs.bind(this)
        );

        // Déconnexion
        document.getElementById('logoutBtn').addEventListener('click',
            this.logout.bind(this)
        );

        // Reset formulaire
        document.getElementById('resetForm').addEventListener('click',
            this.resetForm.bind(this)
        );
    }

    setupAdminUI() {
        // Afficher le nom de l'admin
        const admin = this.auth.getAdminData();
        if (admin) {
            document.getElementById('adminName').textContent = admin.full_name || admin.username;
        }

        // Charger les villes disponibles
        this.loadVilles();
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
            case 'statistiques':
                await this.loadStatistiquesAvancees();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await this.api.getStatistiques();
            if (response.success) {
                this.updateDashboard(response.data);
                this.createCharts(response.data);
            }
        } catch (error) {
            this.showError('Erreur lors du chargement du dashboard');
        }
    }

    updateDashboard(stats) {
        document.getElementById('totalDistributeurs').textContent = stats.total;
        document.getElementById('totalVilles').textContent = stats.parVille.length;
        document.getElementById('activiteMensuelle').textContent = stats.nouveauxCeMois;
    }

    createCharts(stats) {
        // Chart des types
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
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Chart des villes
        const villeCtx = document.getElementById('villeChart');
        if (villeCtx) {
            new Chart(villeCtx, {
                type: 'bar',
                data: {
                    labels: stats.parVille.map(v => v.ville),
                    datasets: [{
                        label: 'Nombre de distributeurs',
                        data: stats.parVille.map(v => v.count),
                        backgroundColor: '#00d4ff'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    async loadDistributeurs(filters = {}) {
        try {
            const response = await this.api.getDistributeurs(filters);
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.updateDistributeursTable(this.currentDistributeurs);
                this.updateAdminMap(this.currentDistributeurs);
            }
        } catch (error) {
            this.showError('Erreur lors du chargement des distributeurs');
        }
    }

    updateDistributeursTable(distributeurs) {
        const tbody = document.getElementById('distributeursTableBody');
        tbody.innerHTML = '';

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
                    <strong>${distributeur.nom}</strong>
                    ${distributeur.note_moyenne > 0 ? `
                        <div class="table-rating">
                            <i class="fas fa-star"></i>
                            ${distributeur.note_moyenne.toFixed(1)}
                            <small>(${distributeur.nombre_avis})</small>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td><span class="type-badge ${distributeur.type}">${this.getTypeLabel(distributeur.type)}</span></td>
            <td>${distributeur.ville}</td>
            <td>${distributeur.adresse}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="adminApp.editDistributeur(${distributeur.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="adminApp.deleteDistributeur(${distributeur.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-view" onclick="adminApp.viewDistributeur(${distributeur.id})">
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
            if (this.currentEditingId) {
                await this.api.updateDistributeur(this.currentEditingId, formData);
                this.showSuccess('Distributeur modifié avec succès');
            } else {
                await this.api.createDistributeur(formData);
                this.showSuccess('Distributeur créé avec succès');
            }

            this.resetForm();
            this.loadDistributeurs();
            this.switchPanel('distributeurs');
            
        } catch (error) {
            this.showError('Erreur lors de la sauvegarde du distributeur');
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
        // Implémentation simplifiée des horaires
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
        // Services par défaut selon le type
        const servicesParType = {
            nourriture: ['Paiement mobile', 'Retrait', 'Snacks'],
            boissons: ['Boissons fraîches', 'Eau', 'Sodas'],
            billets: ['Billets électroniques', 'Réservation'],
            divers: ['Service rapide', '24h/24']
        };
        
        return servicesParType[document.getElementById('distributeurType').value] || [];
    }

    validateForm(data) {
        if (!data.nom || !data.type || !data.ville || !data.adresse) {
            this.showError('Veuillez remplir tous les champs obligatoires');
            return false;
        }

        if (!data.latitude || !data.longitude) {
            this.showError('Veuillez définir la localisation du distributeur');
            return false;
        }

        return true;
    }

    async getCurrentLocation() {
        try {
            const position = await this.getUserPosition();
            document.getElementById('distributeurLat').value = position.coords.latitude.toFixed(6);
            document.getElementById('distributeurLng').value = position.coords.longitude.toFixed(6);
            
            this.mapManager.flyTo(position.coords.latitude, position.coords.longitude, 16);
            this.addTempMarker(position.coords.latitude, position.coords.longitude);
            
        } catch (error) {
            this.showError('Impossible d\'obtenir votre position');
        }
    }

    getUserPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000
            });
        });
    }

    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        this.uploadedImages = [];

        for (const file of files.slice(0, 3)) { // Max 3 images
            try {
                const imageData = await this.api.uploadImage(file);
                this.uploadedImages.push(imageData);
                this.addImagePreview(imageData, file.name);
            } catch (error) {
                this.showError('Erreur lors du téléchargement de l\'image');
            }
        }
    }

    addImagePreview(imageData, filename) {
        const preview = document.getElementById('imagePreview');
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${imageData}" alt="${filename}">
            <button type="button" class="remove-image">&times;</button>
        `;
        
        div.querySelector('.remove-image').addEventListener('click', () => {
            div.remove();
            this.uploadedImages = this.uploadedImages.filter(img => img !== imageData);
        });
        
        preview.appendChild(div);
    }

    async editDistributeur(id) {
        try {
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
            }
        } catch (error) {
            this.showError('Erreur lors du chargement du distributeur');
        }
    }

    populateForm(distributeur) {
        document.getElementById('distributeurNom').value = distributeur.nom;
        document.getElementById('distributeurType').value = distributeur.type;
        document.getElementById('distributeurVille').value = distributeur.ville;
        document.getElementById('distributeurAdresse').value = distributeur.adresse;
        document.getElementById('distributeurLat').value = distributeur.latitude;
        document.getElementById('distributeurLng').value = distributeur.longitude;
        document.getElementById('distributeurDescription').value = distributeur.description || '';

        // Mettre à jour le titre du formulaire
        document.querySelector('#ajouter h1').textContent = 'Modifier le distributeur';
    }

    async deleteDistributeur(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce distributeur ?')) {
            return;
        }

        try {
            await this.api.deleteDistributeur(id);
            this.showSuccess('Distributeur supprimé avec succès');
            this.loadDistributeurs();
        } catch (error) {
            this.showError('Erreur lors de la suppression du distributeur');
        }
    }

    async viewDistributeur(id) {
        // Ouvrir dans un nouvel onglet l'interface publique
        window.open(`/?distributeur=${id}`, '_blank');
    }

    handleAdminSearch(e) {
        const query = e.target.value;
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
        // Charger les villes depuis les distributeurs existants
        try {
            const response = await this.api.getDistributeurs();
            if (response.success) {
                const villes = [...new Set(response.data.map(d => d.ville))].sort();
                this.populateVilleFilters(villes);
            }
        } catch (error) {
            console.error('Erreur chargement villes:', error);
        }
    }

    populateVilleFilters(villes) {
        const selectAdmin = document.getElementById('adminVilleFilter');
        const selectForm = document.getElementById('distributeurVille');
        
        [selectAdmin, selectForm].forEach(select => {
            if (select) {
                // Garder les options existantes et ajouter les nouvelles villes
                const existingOptions = Array.from(select.options).map(opt => opt.value);
                villes.forEach(ville => {
                    if (!existingOptions.includes(ville) && ville) {
                        const option = document.createElement('option');
                        option.value = ville;
                        option.textContent = ville;
                        select.appendChild(option);
                    }
                });
            }
        });
    }

    async loadStatistiquesAvancees() {
        // Implémentation des statistiques avancées
        this.createAdvancedCharts();
    }

    createAdvancedCharts() {
        // Chart d'activité (exemple)
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Nouveaux distributeurs',
                        data: [12, 19, 8, 15, 12, 18],
                        borderColor: '#00d4ff',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
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

    getTypeLabel(type) {
        const types = {
            'nourriture': '🍽️ Nourriture',
            'boissons': '🥤 Boissons',
            'billets': '🎫 Billets', 
            'divers': '🛍️ Divers'
        };
        return types[type] || type;
    }

    showError(message) {
        alert(`❌ ${message}`);
    }

    showSuccess(message) {
        alert(`✅ ${message}`);
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
const adminApp = new AdminApp();
window.adminApp = adminApp; // Rendre accessible globalement pour les événements
