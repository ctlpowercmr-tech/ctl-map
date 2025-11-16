// Configuration Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21pMHpzanhzMTBnNDJpcHl5amp3Y3UxMSJ9.vBVUzayPx57ti_dbj0LuCw';

class AdminApp {
    constructor() {
        this.map = null;
        this.token = localStorage.getItem('adminToken');
        this.currentDistributeurs = [];
        this.editingId = null;
        this.currentMarker = null;
        
        this.init();
    }

    async init() {
        if (!this.checkAuth()) {
            window.location.href = '/';
            return;
        }

        await this.initMap();
        this.bindEvents();
        this.loadDashboard();
        this.loadDistributeurs();
        this.setupAdminInfo();
    }

    checkAuth() {
        if (!this.token) {
            return false;
        }

        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    async initMap() {
        try {
            this.map = new mapboxgl.Map({
                container: 'adminMap',
                style: 'mapbox://styles/mapbox/light-v11',
                center: [11.5021, 3.8480],
                zoom: 6,
                pitch: 0
            });

            this.map.addControl(new mapboxgl.NavigationControl());

            this.map.on('click', (e) => {
                const { lng, lat } = e.lngLat;
                this.setDistributeurLocation(lat, lng);
            });

            await new Promise((resolve) => {
                this.map.on('load', resolve);
            });

        } catch (error) {
            console.error('Erreur initialisation carte admin:', error);
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

        // Formulaire
        document.getElementById('distributeurForm').addEventListener('submit', 
            this.handleDistributeurSubmit.bind(this)
        );

        // Localisation
        document.getElementById('getCurrentLocation').addEventListener('click',
            this.getCurrentLocation.bind(this)
        );

        // Recherche et filtres
        document.getElementById('adminSearch').addEventListener('input',
            this.debounce(this.handleSearch.bind(this), 300)
        );
        document.getElementById('adminTypeFilter').addEventListener('change',
            this.handleFilter.bind(this)
        );
        document.getElementById('adminVilleFilter').addEventListener('change',
            this.handleFilter.bind(this)
        );

        // Actions
        document.getElementById('refreshDistributeurs').addEventListener('click',
            this.loadDistributeurs.bind(this)
        );
        document.getElementById('clearForm').addEventListener('click',
            this.clearForm.bind(this)
        );
        document.getElementById('cancelEdit').addEventListener('click',
            this.cancelEdit.bind(this)
        );

        // Déconnexion
        document.getElementById('logoutBtn').addEventListener('click',
            this.logout.bind(this)
        );

        // Paramètres
        document.getElementById('saveSettings').addEventListener('click',
            this.saveSettings.bind(this)
        );
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

        // Charger les données spécifiques
        switch(panelId) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'distributeurs':
                await this.loadDistributeurs();
                break;
            case 'statistiques':
                await this.loadAdvancedStats();
                break;
        }
    }

    setupAdminInfo() {
        const adminData = JSON.parse(localStorage.getItem('adminData'));
        if (adminData) {
            document.getElementById('adminName').textContent = adminData.full_name || adminData.username;
        }
    }

    async loadDashboard() {
        try {
            const response = await this.apiRequest('/api/admin/statistiques');
            if (response.success) {
                this.updateDashboard(response.data);
                this.createCharts(response.data);
            }
        } catch (error) {
            this.showError('Erreur chargement dashboard');
        }
    }

    updateDashboard(stats) {
        document.getElementById('totalDistributeurs').textContent = stats.total;
        document.getElementById('totalVilles').textContent = stats.parVille.length;
        document.getElementById('nouveauxMois').textContent = stats.nouveauxMois;
        
        // Calcul note moyenne
        const moyenne = stats.parType.reduce((acc, type) => acc + (type.note_moyenne || 0), 0) / stats.parType.length;
        document.getElementById('moyenneNotes').textContent = moyenne.toFixed(1);
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
                        backgroundColor: ['#e74c3c', '#3498db', '#9b59b6', '#f39c12']
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
            this.showLoading();
            
            const params = new URLSearchParams(filters);
            const response = await this.apiRequest(`/api/distributeurs?${params}`);
            
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.updateDistributeursTable();
                this.updateAdminMap();
                this.hideLoading();
            }
        } catch (error) {
            this.showError('Erreur chargement distributeurs');
            this.hideLoading();
        }
    }

    updateDistributeursTable() {
        const tbody = document.getElementById('distributeursTableBody');
        tbody.innerHTML = '';

        this.currentDistributeurs.forEach(distributeur => {
            const row = this.createDistributeurRow(distributeur);
            tbody.appendChild(row);
        });
    }

    createDistributeurRow(distributeur) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="distributeur-info">
                    <strong>${distributeur.nom}</strong>
                    <small>${distributeur.adresse}</small>
                </div>
            </td>
            <td>
                <span class="type-badge ${distributeur.type}">
                    ${this.getTypeLabel(distributeur.type)}
                </span>
            </td>
            <td>${distributeur.ville}</td>
            <td>${distributeur.adresse}</td>
            <td>
                ${distributeur.note_moyenne > 0 ? `
                    <div class="rating-display">
                        <span class="rating">${distributeur.note_moyenne.toFixed(1)}</span>
                        <i class="fas fa-star"></i>
                    </div>
                ` : '--'}
            </td>
            <td>
                <span class="status-badge ${distributeur.statut}">
                    ${distributeur.statut}
                </span>
            </td>
            <td>
                <div class="action-buttons">
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

    updateAdminMap() {
        // Nettoyer la carte
        if (this.currentMarker) {
            this.currentMarker.remove();
        }

        // Ajouter les distributeurs sur la carte
        this.currentDistributeurs.forEach(distributeur => {
            const el = document.createElement('div');
            el.className = 'distributeur-marker';
            el.innerHTML = `
                <div class="marker-content">
                    <div class="marker-icon ${distributeur.type}">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                </div>
            `;

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([distributeur.longitude, distributeur.latitude])
                .addTo(this.map);

            el.addEventListener('click', () => {
                this.editDistributeur(distributeur.id);
            });
        });
    }

    async handleDistributeurSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        if (!this.validateForm(formData)) return;

        try {
            if (this.editingId) {
                await this.updateDistributeur(this.editingId, formData);
            } else {
                await this.createDistributeur(formData);
            }
            
            this.clearForm();
            this.loadDistributeurs();
            this.switchPanel('distributeurs');
            
        } catch (error) {
            this.showError('Erreur sauvegarde distributeur');
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
            telephone: document.getElementById('distributeurTelephone').value,
            prix_moyen: document.getElementById('distributeurPrix').value
        };
    }

    validateForm(data) {
        const required = ['nom', 'type', 'ville', 'adresse', 'latitude', 'longitude'];
        for (const field of required) {
            if (!data[field]) {
                this.showError(`Le champ ${field} est requis`);
                return false;
            }
        }
        return true;
    }

    setDistributeurLocation(lat, lng) {
        document.getElementById('distributeurLat').value = lat.toFixed(6);
        document.getElementById('distributeurLng').value = lng.toFixed(6);
        
        document.getElementById('currentLat').textContent = lat.toFixed(6);
        document.getElementById('currentLng').textContent = lng.toFixed(6);

        // Mettre à jour le marqueur
        if (this.currentMarker) {
            this.currentMarker.remove();
        }

        this.currentMarker = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .addTo(this.map);

        // Centrer sur la position
        this.map.flyTo({
            center: [lng, lat],
            zoom: 15
        });
    }

    async getCurrentLocation() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            this.setDistributeurLocation(lat, lng);
            
        } catch (error) {
            this.showError('Impossible d\'obtenir la position actuelle');
        }
    }

    async createDistributeur(data) {
        const response = await this.apiRequest('/api/admin/distributeurs', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (response.success) {
            this.showSuccess('Distributeur créé avec succès');
            return response.data;
        } else {
            throw new Error(response.error);
        }
    }

    async updateDistributeur(id, data) {
        const response = await this.apiRequest(`/api/admin/distributeurs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (response.success) {
            this.showSuccess('Distributeur modifié avec succès');
            return response.data;
        } else {
            throw new Error(response.error);
        }
    }

    async editDistributeur(id) {
        try {
            const response = await this.apiRequest(`/api/distributeurs/${id}`);
            
            if (response.success) {
                this.populateForm(response.data);
                this.editingId = id;
                this.switchPanel('ajouter');
                
                // Centrer sur le distributeur
                this.setDistributeurLocation(
                    response.data.latitude,
                    response.data.longitude
                );
            }
        } catch (error) {
            this.showError('Erreur chargement distributeur');
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
        document.getElementById('distributeurTelephone').value = distributeur.telephone || '';
        document.getElementById('distributeurPrix').value = distributeur.prix_moyen || '';

        document.getElementById('formTitle').textContent = 'Modifier le distributeur';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Modifier le distributeur';
        document.getElementById('cancelEdit').style.display = 'block';
    }

    async deleteDistributeur(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce distributeur ?')) {
            return;
        }

        try {
            const response = await this.apiRequest(`/api/admin/distributeurs/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.showSuccess('Distributeur supprimé avec succès');
                this.loadDistributeurs();
            }
        } catch (error) {
            this.showError('Erreur suppression distributeur');
        }
    }

    viewDistributeur(id) {
        window.open(`/?distributeur=${id}`, '_blank');
    }

    clearForm() {
        document.getElementById('distributeurForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('currentLat').textContent = '--';
        document.getElementById('currentLng').textContent = '--';
        
        this.editingId = null;
        document.getElementById('formTitle').textContent = 'Ajouter un distributeur';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Enregistrer le distributeur';
        document.getElementById('cancelEdit').style.display = 'none';

        if (this.currentMarker) {
            this.currentMarker.remove();
            this.currentMarker = null;
        }
    }

    cancelEdit() {
        this.clearForm();
        this.switchPanel('distributeurs');
    }

    handleSearch(e) {
        const query = e.target.value;
        this.loadDistributeurs({ search: query });
    }

    handleFilter() {
        const type = document.getElementById('adminTypeFilter').value;
        const ville = document.getElementById('adminVilleFilter').value;
        const statut = document.getElementById('adminStatutFilter').value;
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        if (statut !== 'all') filters.statut = statut;
        
        this.loadDistributeurs(filters);
    }

    async loadAdvancedStats() {
        // Implémentation des statistiques avancées
        this.createAdvancedCharts();
    }

    createAdvancedCharts() {
        // Chart d'activité
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Nouveaux distributeurs',
                        data: [5, 8, 12, 6, 15, 10],
                        borderColor: '#00d4ff',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }

        // Chart performance
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                    datasets: [{
                        label: 'Utilisateurs actifs',
                        data: [45, 52, 48, 65, 72, 58, 40],
                        backgroundColor: '#00d4ff'
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
    }

    async saveSettings() {
        // Implémentation sauvegarde paramètres
        this.showSuccess('Paramètres sauvegardés avec succès');
    }

    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        window.location.href = '/';
    }

    // Utilitaires API
    async apiRequest(url, options = {}) {
        const config = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body) {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        return await response.json();
    }

    // Utilitaires d'interface
    showLoading() {
        document.getElementById('adminLoading').classList.add('active');
    }

    hideLoading() {
        document.getElementById('adminLoading').classList.remove('active');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Implémentation simple de notification
        alert(`${type.toUpperCase()}: ${message}`);
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

// Initialisation de l'application admin
const adminApp = new AdminApp();
window.adminApp = adminApp;
