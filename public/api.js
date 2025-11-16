// Client API pour CTL-LOKET
class API {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('adminToken');
        this.retryCount = 0;
        this.maxRetries = 3;
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
                // Tentative de récupération du message d'erreur
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // Ignorer si le corps n'est pas du JSON
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`❌ API request failed: ${endpoint}`, error);
            
            // Retry logic pour les erreurs réseau
            if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Tentative ${this.retryCount}/${this.maxRetries} pour ${endpoint}`);
                await this.delay(1000 * this.retryCount);
                return this.request(endpoint, options);
            }
            
            this.retryCount = 0;
            throw this.handleError(error);
        }
    }

    shouldRetry(error) {
        // Retry seulement pour les erreurs réseau
        return error.message.includes('NetworkError') || 
               error.message.includes('Failed to fetch') ||
               error.message.includes('Network request failed');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== DISTRIBUTEURS ====================

    async getDistributeurs(filters = {}) {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && value !== 'all') {
                params.append(key, value);
            }
        });

        const endpoint = `/api/distributeurs${params.toString() ? `?${params}` : ''}`;
        return await this.request(endpoint);
    }

    async getDistributeur(id) {
        if (!id) {
            throw new Error('ID distributeur requis');
        }
        return await this.request(`/api/distributeurs/${id}`);
    }

    async getProchesDistributeurs(lat, lng, radius = 5) {
        if (!lat || !lng) {
            throw new Error('Coordonnées requises');
        }
        
        const params = new URLSearchParams({ lat, lng, radius });
        return await this.request(`/api/distributeurs?${params}`);
    }

    // ==================== ADMIN - DISTRIBUTEURS ====================

    async createDistributeur(distributeurData) {
        if (!distributeurData.nom || !distributeurData.type || !distributeurData.latitude || !distributeurData.longitude) {
            throw new Error('Données distributeur incomplètes');
        }

        return await this.request('/api/admin/distributeurs', {
            method: 'POST',
            body: JSON.stringify(distributeurData)
        });
    }

    async updateDistributeur(id, distributeurData) {
        if (!id) {
            throw new Error('ID distributeur requis');
        }

        return await this.request(`/api/admin/distributeurs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(distributeurData)
        });
    }

    async deleteDistributeur(id) {
        if (!id) {
            throw new Error('ID distributeur requis');
        }

        return await this.request(`/api/admin/distributeurs/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== AVIS ====================

    async createAvis(avisData) {
        if (!avisData.distributeur_id || !avisData.note) {
            throw new Error('Distributeur ID et note requis');
        }

        if (avisData.note < 1 || avisData.note > 5) {
            throw new Error('La note doit être entre 1 et 5');
        }

        return await this.request('/api/avis', {
            method: 'POST',
            body: JSON.stringify(avisData)
        });
    }

    async getAvis(distributeurId) {
        if (!distributeurId) {
            throw new Error('ID distributeur requis');
        }

        return await this.request(`/api/avis?distributeur_id=${distributeurId}`);
    }

    // ==================== ADMIN - STATISTIQUES ====================

    async getStatistiques() {
        return await this.request('/api/admin/statistiques');
    }

    // ==================== ADMIN - GESTION DES AVIS ====================

    async getAvisAdmin(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/api/admin/avis?${params}`);
    }

    async updateAvisStatut(avisId, statut) {
        if (!avisId || !statut) {
            throw new Error('ID avis et statut requis');
        }

        return await this.request(`/api/admin/avis/${avisId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut })
        });
    }

    // ==================== ADMIN - GESTION DES ADMINISTRATEURS ====================

    async getAdmins() {
        return await this.request('/api/admin/admins');
    }

    async createAdmin(adminData) {
        if (!adminData.username || !adminData.password) {
            throw new Error('Nom d\'utilisateur et mot de passe requis');
        }

        return await this.request('/api/admin/admins', {
            method: 'POST',
            body: JSON.stringify(adminData)
        });
    }

    async updateAdmin(id, adminData) {
        if (!id) {
            throw new Error('ID admin requis');
        }

        return await this.request(`/api/admin/admins/${id}`, {
            method: 'PUT',
            body: JSON.stringify(adminData)
        });
    }

    // ==================== AUTHENTIFICATION ====================

    async login(username, password) {
        if (!username || !password) {
            throw new Error('Nom d\'utilisateur et mot de passe requis');
        }

        const result = await this.request('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result.success && result.data.token) {
            this.token = result.data.token;
            localStorage.setItem('adminToken', this.token);
            localStorage.setItem('adminData', JSON.stringify(result.data.admin));
            
            // Réinitialiser le compteur de tentatives après une connexion réussie
            this.retryCount = 0;
        }

        return result;
    }

    logout() {
        this.token = null;
        this.retryCount = 0;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAdminData() {
        try {
            const adminData = localStorage.getItem('adminData');
            return adminData ? JSON.parse(adminData) : null;
        } catch {
            return null;
        }
    }

    // ==================== UTILITAIRES ====================

    async healthCheck() {
        try {
            return await this.request('/api/health');
        } catch (error) {
            return {
                success: false,
                error: 'Serveur indisponible'
            };
        }
    }

    async uploadImage(file) {
        return new Promise((resolve, reject) => {
            // Simulation d'upload - dans une vraie app, envoyer au serveur
            if (!file) {
                reject(new Error('Fichier requis'));
                return;
            }

            if (!file.type.startsWith('image/')) {
                reject(new Error('Type de fichier non supporté'));
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB
                reject(new Error('Fichier trop volumineux (max 5MB)'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Simuler un délai d'upload
                setTimeout(() => {
                    resolve(e.target.result);
                }, 1000);
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur de lecture du fichier'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // ==================== GESTION DES ERREURS ====================

    handleError(error) {
        console.error('API Error:', error);
        
        const message = error.message || 'Erreur inconnue';
        
        if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
            return new Error('Problème de connexion réseau. Vérifiez votre connexion internet.');
        }
        
        if (message.includes('401')) {
            this.logout();
            return new Error('Session expirée. Veuillez vous reconnecter.');
        }
        
        if (message.includes('403')) {
            return new Error('Accès refusé. Permissions insuffisantes.');
        }
        
        if (message.includes('404')) {
            return new Error('Ressource non trouvée.');
        }
        
        if (message.includes('500')) {
            return new Error('Erreur interne du serveur. Veuillez réessayer.');
        }
        
        return error;
    }

    // ==================== CACHE ET PERFORMANCE ====================

    async getDistributeursWithCache(filters = {}, forceRefresh = false) {
        const cacheKey = `distributeurs_${JSON.stringify(filters)}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        if (!forceRefresh && cached && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache corrompu, continuer avec une requête normale
            }
        }

        try {
            const result = await this.getDistributeurs(filters);
            
            if (result.success) {
                localStorage.setItem(cacheKey, JSON.stringify(result));
                localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
            }
            
            return result;
        } catch (error) {
            // En cas d'erreur, retourner le cache si disponible
            if (cached) {
                console.warn('⚠️ Utilisation du cache en raison d\'une erreur:', error);
                return JSON.parse(cached);
            }
            throw error;
        }
    }

    clearCache() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('distributeurs_')) {
                localStorage.removeItem(key);
                localStorage.removeItem(`${key}_timestamp`);
            }
        });
    }
}

export default API;
