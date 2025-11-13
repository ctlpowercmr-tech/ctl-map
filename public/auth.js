class AuthManager {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.admin = null;
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

            if (!response.ok) {
                throw new Error('Identifiants incorrects');
            }

            const data = await response.json();
            this.token = data.token;
            this.admin = data.admin;
            
            localStorage.setItem('adminToken', this.token);
            
            return data;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.token = null;
        this.admin = null;
        localStorage.removeItem('adminToken');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

export default AuthManager;