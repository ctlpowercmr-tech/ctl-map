class AuthManager {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.admin = JSON.parse(localStorage.getItem('adminData') || 'null');
    }

    async login(username, password) {
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Identifiants incorrects');
            }

            if (!data.success) {
                throw new Error(data.error || 'Erreur de connexion');
            }

            this.token = data.data.token;
            this.admin = data.data.admin;
            
            localStorage.setItem('adminToken', this.token);
            localStorage.setItem('adminData', JSON.stringify(this.admin));
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        this.token = null;
        this.admin = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        
        // Rediriger vers la page d'accueil
        window.location.href = '/';
    }

    isAuthenticated() {
        if (!this.token || !this.admin) {
            return false;
        }

        // Vérifier l'expiration du token (simplifié)
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

    hasPermission(permission) {
        if (!this.admin || !this.admin.permissions) {
            return false;
        }

        return this.admin.permissions.includes('all') || 
               this.admin.permissions.includes(permission);
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Vérifier et rafraîchir l'authentification
    checkAuth() {
        if (!this.isAuthenticated()) {
            this.logout();
            return false;
        }
        return true;
    }

    // Rediriger si non authentifié
    requireAuth() {
        if (!this.checkAuth()) {
            window.location.href = '/';
            return false;
        }
        return true;
    }
}

export default AuthManager;
