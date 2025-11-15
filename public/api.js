class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('adminToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Distributeurs
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

    async getProchesDistributeurs(lat, lng, radius = 5) {
        const params = new URLSearchParams({
            lat,
            lng,
            radius
        });

        return await this.request(`/api/distributeurs?${params}`);
    }

    // Admin - Distributeurs
    async createDistributeur(distributeurData) {
        return await this.request('/api/admin/distributeurs', {
            method: 'POST',
            body: JSON.stringify(distributeurData)
        });
    }

    async updateDistributeur(id, distributeurData) {
        return await this.request(`/api/admin/distributeurs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(distributeurData)
        });
    }

    async deleteDistributeur(id) {
        return await this.request(`/api/admin/distributeurs/${id}`, {
            method: 'DELETE'
        });
    }

    // Avis
    async createAvis(avisData) {
        return await this.request('/api/avis', {
            method: 'POST',
            body: JSON.stringify(avisData)
        });
    }

    async getAvis(distributeurId) {
        return await this.request(`/api/avis?distributeur_id=${distributeurId}`);
    }

    // Admin - Statistiques
    async getStatistiques() {
        return await this.request('/api/admin/statistiques');
    }

    // Admin - Gestion des avis
    async getAvisAdmin(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/api/admin/avis?${params}`);
    }

    // Admin - Gestion des administrateurs
    async getAdmins() {
        return await this.request('/api/admin/admins');
    }

    // Auth
    async login(username, password) {
        const result = await this.request('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result.success && result.data.token) {
            this.token = result.data.token;
            localStorage.setItem('adminToken', this.token);
            localStorage.setItem('adminData', JSON.stringify(result.data.admin));
        }

        return result;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAdminData() {
        const adminData = localStorage.getItem('adminData');
        return adminData ? JSON.parse(adminData) : null;
    }

    // Health check
    async healthCheck() {
        return await this.request('/api/health');
    }

    // Upload d'images (simulation)
    async uploadImage(file) {
        // Dans une vraie application, vous utiliseriez un service comme Cloudinary
        // Pour l'instant, on simule avec une URL de base64
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // Gestion des erreurs
    handleError(error) {
        console.error('API Error:', error);
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            throw new Error('Problème de connexion réseau');
        }
        
        if (error.message.includes('401')) {
            this.logout();
            throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        throw error;
    }
}

export default API;
