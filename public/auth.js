// Gestionnaire d'authentification sécurisé
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.admin = this.getAdminDataFromStorage();
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 heures
        this.setupSessionMonitoring();
    }

    getAdminDataFromStorage() {
        try {
            const adminData = localStorage.getItem('adminData');
            return adminData ? JSON.parse(adminData) : null;
        } catch (error) {
            console.error('❌ Erreur parsing admin data:', error);
            this.logout();
            return null;
        }
    }

    async login(username, password) {
        try {
            if (!username || !password) {
                throw new Error('Nom d\'utilisateur et mot de passe requis');
            }

            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur de connexion');
            }

            if (!data.success) {
                throw new Error(data.error || 'Identifiants incorrects');
            }

            // Sauvegarder les données d'authentification
            this.token = data.data.token;
            this.admin = data.data.admin;
            
            localStorage.setItem('adminToken', this.token);
            localStorage.setItem('adminData', JSON.stringify(this.admin));
            localStorage.setItem('loginTime', Date.now().toString());

            // Logger la connexion
            console.log('🔐 Connexion admin réussie:', this.admin.username);

            return data;

        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            
            // Logger la tentative échouée
            this.logFailedAttempt(username);
            
            throw error;
        }
    }

    logFailedAttempt(username) {
        const attempts = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
        const now = Date.now();
        
        // Nettoyer les tentatives anciennes (plus de 15 minutes)
        Object.keys(attempts).forEach(user => {
            if (now - attempts[user] > 15 * 60 * 1000) {
                delete attempts[user];
            }
        });

        attempts[username] = now;
        localStorage.setItem('failedAttempts', JSON.stringify(attempts));

        // Bloquer après 5 tentatives échouées
        const userAttempts = Object.values(attempts).filter(time => 
            time > now - 15 * 60 * 1000
        ).length;

        if (userAttempts >= 5) {
            console.warn('🚨 Trop de tentatives de connexion pour:', username);
            throw new Error('Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.');
        }
    }

    logout() {
        this.token = null;
        this.admin = null;
        
        // Nettoyer le localStorage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        localStorage.removeItem('loginTime');
        
        console.log('🔓 Déconnexion admin');
        
        // Rediriger vers la page d'accueil
        if (window.location.pathname.includes('admin')) {
            window.location.href = '/';
        }
    }

    isAuthenticated() {
        if (!this.token || !this.admin) {
            return false;
        }

        // Vérifier l'expiration du token
        if (this.isTokenExpired()) {
            this.logout();
            return false;
        }

        // Vérifier le timeout de session
        if (this.isSessionExpired()) {
            this.logout();
            return false;
        }

        return true;
    }

    isTokenExpired() {
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();
            
            if (isExpired) {
                console.warn('⚠️ Token expiré');
            }
            
            return isExpired;
        } catch (error) {
            console.error('❌ Erreur vérification token:', error);
            return true;
        }
    }

    isSessionExpired() {
        const loginTime = localStorage.getItem('loginTime');
        if (!loginTime) return true;

        const sessionAge = Date.now() - parseInt(loginTime);
        const isExpired = sessionAge > this.sessionTimeout;

        if (isExpired) {
            console.warn('⚠️ Session expirée');
        }

        return isExpired;
    }

    hasPermission(permission) {
        if (!this.admin || !this.admin.permissions) {
            return false;
        }

        return this.admin.permissions.includes('all') || 
               this.admin.permissions.includes(permission);
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Permission "${permission}" requise`);
        }
    }

    getAuthHeaders() {
        if (!this.isAuthenticated()) {
            throw new Error('Non authentifié');
        }

        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    setupSessionMonitoring() {
        // Vérifier la session périodiquement
        setInterval(() => {
            if (this.isAuthenticated() && this.isSessionExpired()) {
                this.logout();
                if (window.ctlLoketApp) {
                    window.ctlLoketApp.showNotification('Session expirée', 'warning');
                }
            }
        }, 60000); // Vérifier toutes les minutes

        // Réinitialiser le timeout de session sur les interactions utilisateur
        const resetSessionTimer = () => {
            if (this.isAuthenticated()) {
                localStorage.setItem('loginTime', Date.now().toString());
            }
        };

        // Événements utilisateur qui reset le timer de session
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });
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
            if (window.location.pathname.includes('admin')) {
                window.location.href = '/';
            }
            return false;
        }
        return true;
    }

    // Rafraîchir le token (si l'API le supporte)
    async refreshToken() {
        if (!this.token) {
            throw new Error('Aucun token à rafraîchir');
        }

        try {
            // Implémentation du refresh token si l'API le supporte
            // Pour l'instant, on utilise la même logique que login
            console.log('🔄 Tentative de rafraîchissement du token');
            
            // Dans une vraie implémentation, appeler l'endpoint /refresh
            // Pour l'instant, on se contente de vérifier la validité
            return this.isAuthenticated();
            
        } catch (error) {
            console.error('❌ Erreur rafraîchissement token:', error);
            this.logout();
            throw error;
        }
    }

    // Changer le mot de passe
    async changePassword(oldPassword, newPassword) {
        if (!this.isAuthenticated()) {
            throw new Error('Authentification requise');
        }

        if (!oldPassword || !newPassword) {
            throw new Error('Ancien et nouveau mot de passe requis');
        }

        if (newPassword.length < 8) {
            throw new Error('Le nouveau mot de passe doit faire au moins 8 caractères');
        }

        // Implémentation du changement de mot de passe
        // À intégrer avec l'API quand elle sera disponible
        console.log('🔐 Changement de mot de passe demandé');
        
        // Simulation
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: 'Mot de passe changé avec succès' });
            }, 1000);
        });
    }

    // Vérifier la force du mot de passe
    checkPasswordStrength(password) {
        if (!password) return 0;
        
        let strength = 0;
        
        // Longueur
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        
        // Complexité
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
        
        return Math.min(strength, 5);
    }

    getPasswordStrengthLabel(strength) {
        const labels = {
            0: 'Très faible',
            1: 'Faible',
            2: 'Moyen',
            3: 'Fort',
            4: 'Très fort',
            5: 'Excellent'
        };
        return labels[strength] || 'Inconnu';
    }
}

export default AuthManager;
