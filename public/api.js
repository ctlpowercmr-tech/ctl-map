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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Distributeurs
    async getDistributeurs(filters = {}) {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        const endpoint = `/api/distributeurs${params.toString() ? `?${params}` : ''}`;
        return await this.request(endpoint);
    }

    async getProchesDistributeurs(lat, lng, radius = 5) {
        const params = new URLSearchParams({
            lat,
            lng,
            radius
        });

        return await this.request(`/api/distributeurs/proches?${params}`);
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

    // Admin - Statistiques
    async getStatistiques() {
        return await this.request('/api/admin/statistiques');
    }

    // Auth
    async login(username, password) {
        const result = await this.request('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result.token) {
            this.token = result.token;
            localStorage.setItem('adminToken', this.token);
        }

        return result;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
    }

    isAuthenticated() {
        return !!this.token;
    }
}

export default API;