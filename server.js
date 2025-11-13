import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import DatabaseManager from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité avancé
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            connectSrc: ["'self'", "https://api.mapbox.com", "wss:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Rate limiting avancé
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_production_2024');
        const admin = await DatabaseManager.pool.query('SELECT * FROM admins WHERE id = $1 AND is_active = true', [user.id]);
        
        if (admin.rows.length === 0) {
            return res.status(403).json({ error: 'Administrateur non trouvé ou inactif' });
        }

        req.user = admin.rows[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalide' });
    }
};

// Middleware de logging
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        DatabaseManager.logAction(`${req.method} ${req.path}`, req.user?.id, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent')
        });
    });
    next();
};
app.use(requestLogger);

// ==================== ROUTES PUBLIQUES ====================

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Récupérer tous les distributeurs avec filtres avancés
app.get('/api/distributeurs', async (req, res) => {
    try {
        const { 
            type, 
            ville, 
            statut = 'actif',
            limit = 100,
            offset = 0,
            search = '',
            lat,
            lng,
            radius = 10
        } = req.query;

        let distributeurs = await DatabaseManager.getDistributeurs({
            type, ville, statut, limit, offset, search
        });

        // Calcul des distances si coordonnées fournies
        if (lat && lng) {
            distributeurs = distributeurs.map(distributeur => {
                const distance = calculateDistance(
                    parseFloat(lat),
                    parseFloat(lng),
                    parseFloat(distributeur.latitude),
                    parseFloat(distributeur.longitude)
                );
                return { ...distributeur, distance };
            }).filter(d => d.distance <= radius)
              .sort((a, b) => a.distance - b.distance);
        }

        res.json({
            success: true,
            data: distributeurs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: distributeurs.length
            }
        });
    } catch (error) {
        console.error('Erreur récupération distributeurs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des distributeurs' 
        });
    }
});

// Récupérer un distributeur spécifique
app.get('/api/distributeurs/:id', async (req, res) => {
    try {
        const distributeur = await DatabaseManager.getDistributeurById(req.params.id);
        
        if (!distributeur) {
            return res.status(404).json({ 
                success: false,
                error: 'Distributeur non trouvé' 
            });
        }

        // Récupérer les avis
        const avis = await DatabaseManager.getAvisByDistributeur(req.params.id);

        res.json({
            success: true,
            data: {
                ...distributeur,
                avis: avis
            }
        });
    } catch (error) {
        console.error('Erreur récupération distributeur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération du distributeur' 
        });
    }
});

// Ajouter un avis
app.post('/api/avis', async (req, res) => {
    try {
        const { distributeur_id, utilisateur_id, note, commentaire } = req.body;

        if (!distributeur_id || !note) {
            return res.status(400).json({ 
                success: false,
                error: 'Distributeur ID et note sont requis' 
            });
        }

        if (note < 1 || note > 5) {
            return res.status(400).json({ 
                success: false,
                error: 'La note doit être entre 1 et 5' 
            });
        }

        const avis = await DatabaseManager.createAvis({
            distributeur_id,
            utilisateur_id: utilisateur_id || 'anonymous',
            note,
            commentaire
        });

        res.status(201).json({
            success: true,
            data: avis
        });
    } catch (error) {
        console.error('Erreur création avis:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de l\'ajout de l\'avis' 
        });
    }
});

// ==================== ROUTES ADMIN ====================

// Connexion administrateur
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Nom d\'utilisateur et mot de passe requis' 
            });
        }

        const result = await DatabaseManager.pool.query(
            'SELECT * FROM admins WHERE username = $1 AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            await DatabaseManager.logAction('Tentative de connexion échouée', null, { username, reason: 'Utilisateur non trouvé' });
            return res.status(401).json({ 
                success: false,
                error: 'Identifiants incorrects' 
            });
        }

        const admin = result.rows[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            await DatabaseManager.logAction('Tentative de connexion échouée', admin.id, { username, reason: 'Mot de passe incorrect' });
            return res.status(401).json({ 
                success: false,
                error: 'Identifiants incorrects' 
            });
        }

        // Mettre à jour la dernière connexion
        await DatabaseManager.pool.query(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );

        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username,
                permissions: admin.permissions 
            },
            process.env.JWT_SECRET || 'fallback_secret_production_2024',
            { expiresIn: '24h' }
        );

        await DatabaseManager.logAction('Connexion réussie', admin.id, { username });

        res.json({
            success: true,
            data: { 
                token, 
                admin: { 
                    id: admin.id, 
                    username: admin.username,
                    email: admin.email,
                    full_name: admin.full_name,
                    permissions: admin.permissions
                } 
            }
        });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur interne du serveur' 
        });
    }
});

// CRUD Distributeurs (Admin)
app.post('/api/admin/distributeurs', authenticateToken, async (req, res) => {
    try {
        const distributeurData = req.body;

        // Validation des données
        if (!distributeurData.nom || !distributeurData.type || !distributeurData.latitude || 
            !distributeurData.longitude || !distributeurData.adresse || !distributeurData.ville) {
            return res.status(400).json({ 
                success: false,
                error: 'Tous les champs obligatoires doivent être remplis' 
            });
        }

        const distributeur = await DatabaseManager.createDistributeur(distributeurData);

        await DatabaseManager.logAction('Création distributeur', req.user.id, {
            distributeur_id: distributeur.id,
            nom: distributeur.nom
        });

        res.status(201).json({
            success: true,
            data: distributeur
        });
    } catch (error) {
        console.error('Erreur création distributeur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la création du distributeur' 
        });
    }
});

app.put('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const distributeurData = req.body;

        const distributeur = await DatabaseManager.updateDistributeur(id, distributeurData);

        if (!distributeur) {
            return res.status(404).json({ 
                success: false,
                error: 'Distributeur non trouvé' 
            });
        }

        await DatabaseManager.logAction('Modification distributeur', req.user.id, {
            distributeur_id: id,
            nom: distributeur.nom
        });

        res.json({
            success: true,
            data: distributeur
        });
    } catch (error) {
        console.error('Erreur modification distributeur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la modification du distributeur' 
        });
    }
});

app.delete('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const distributeur = await DatabaseManager.deleteDistributeur(id);

        if (!distributeur) {
            return res.status(404).json({ 
                success: false,
                error: 'Distributeur non trouvé' 
            });
        }

        await DatabaseManager.logAction('Suppression distributeur', req.user.id, {
            distributeur_id: id,
            nom: distributeur.nom
        });

        res.json({
            success: true,
            message: 'Distributeur supprimé avec succès',
            data: distributeur
        });
    } catch (error) {
        console.error('Erreur suppression distributeur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la suppression du distributeur' 
        });
    }
});

// Statistiques avancées
app.get('/api/admin/statistiques', authenticateToken, async (req, res) => {
    try {
        const statistiques = await DatabaseManager.getStatistiques();
        
        res.json({
            success: true,
            data: statistiques
        });
    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des statistiques' 
        });
    }
});

// Gestion des administrateurs
app.get('/api/admin/admins', authenticateToken, async (req, res) => {
    try {
        const result = await DatabaseManager.pool.query(
            'SELECT id, username, email, full_name, permissions, is_active, last_login, created_at FROM admins ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur récupération admins:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des administrateurs' 
        });
    }
});

// Gestion des avis
app.get('/api/admin/avis', authenticateToken, async (req, res) => {
    try {
        const { statut, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT a.*, d.nom as distributeur_nom
            FROM avis a
            JOIN distributeurs d ON a.distributeur_id = d.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (statut) {
            paramCount++;
            query += ` AND a.statut = $${paramCount}`;
            params.push(statut);
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await DatabaseManager.pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur récupération avis:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la récupération des avis' 
        });
    }
});

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'CTL-LOKET API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Gestion des erreurs 404
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint non trouvé' 
    });
});

// Route fallback pour SPA
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Fonction utilitaire pour calculer la distance
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur CTL-LOKET démarré sur le port ${PORT}`);
    console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
