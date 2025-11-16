import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données avec fallback
let pool;
try {
    pool = new pg.Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Tester la connexion
    pool.query('SELECT NOW()').then(() => {
        console.log('✅ Connecté à PostgreSQL');
    }).catch(err => {
        console.warn('⚠️ PostgreSQL non disponible, utilisation du mode démo');
        pool = null;
    });
} catch (error) {
    console.warn('⚠️ Configuration PostgreSQL échouée, mode démo activé');
    pool = null;
}

// Données de démonstration
const demoDistributeurs = [
    {
        id: 1,
        nom: "Distributeur BonApp - Akwa",
        type: "nourriture",
        latitude: 4.0511,
        longitude: 9.7679,
        adresse: "Rue Joss, Akwa, Douala",
        ville: "Douala",
        description: "Distributeur de snacks et boissons 24h/24",
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "500 - 2000 FCFA",
        note_moyenne: 4.2,
        nombre_avis: 15,
        images: []
    },
    {
        id: 2,
        nom: "Distributeur AquaVie - Deido",
        type: "boissons",
        latitude: 4.0486,
        longitude: 9.7043,
        adresse: "Avenue Charles de Gaulle, Deido, Douala",
        ville: "Douala",
        description: "Distributeur d'eau et boissons fraîches",
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "300 - 1500 FCFA",
        note_moyenne: 4.5,
        nombre_avis: 8,
        images: []
    },
    {
        id: 3,
        nom: "Distributeur TicketPlus - Bonanjo",
        type: "billets",
        latitude: 4.0444,
        longitude: 9.7013,
        adresse: "Boulevard de la Liberté, Bonanjo, Douala",
        ville: "Douala",
        description: "Distributeur de tickets de bus et événements",
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "1000 - 5000 FCFA",
        note_moyenne: 4.0,
        nombre_avis: 12,
        images: []
    }
];
    // Créer admin par défaut
    const adminExists = await pool.query('SELECT * FROM admins WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await pool.query(
        'INSERT INTO admins (username, password_hash, email, full_name) VALUES ($1, $2, $3, $4)',
        ['admin', hashedPassword, 'admin@ctlloket.cm', 'Administrateur Principal']
      );
      console.log('✅ Admin créé: admin / admin123');
    }

    // Données de démonstration
    const distributeursExists = await pool.query('SELECT COUNT(*) FROM distributeurs');
    if (parseInt(distributeursExists.rows[0].count) === 0) {
      const distributeursDemo = [
        {
          nom: "Distributeur BonApp - Akwa",
          type: "nourriture",
          latitude: 4.0511,
          longitude: 9.7679,
          adresse: "Rue Joss, Akwa, Douala",
          ville: "Douala",
          description: "Distributeur de snacks et boissons 24h/24",
          telephone: "+237 6XX XXX XXX",
          prix_moyen: "500 - 2000 FCFA"
        },
        {
          nom: "Distributeur AquaVie - Deido",
          type: "boissons",
          latitude: 4.0486,
          longitude: 9.7043,
          adresse: "Avenue Charles de Gaulle, Deido, Douala",
          ville: "Douala",
          description: "Distributeur d'eau et boissons fraîches",
          telephone: "+237 6XX XXX XXX",
          prix_moyen: "300 - 1500 FCFA"
        },
        {
          nom: "Distributeur TicketPlus - Bonanjo",
          type: "billets",
          latitude: 4.0444,
          longitude: 9.7013,
          adresse: "Boulevard de la Liberté, Bonanjo, Douala",
          ville: "Douala",
          description: "Distributeur de tickets de bus et événements",
          telephone: "+237 6XX XXX XXX",
          prix_moyen: "1000 - 5000 FCFA"
        }
      ];

      for (const dist of distributeursDemo) {
        await pool.query(
          `INSERT INTO distributeurs (nom, type, latitude, longitude, adresse, ville, description, telephone, prix_moyen) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [dist.nom, dist.type, dist.latitude, dist.longitude, dist.adresse, dist.ville, dist.description, dist.telephone, dist.prix_moyen]
        );
      }
      console.log('✅ Données de démonstration créées');
    }

    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation base de données:', error);
  }
}

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'ctl_loket_secret_2024');
    const admin = await pool.query('SELECT * FROM admins WHERE id = $1 AND is_active = true', [user.id]);
    
    if (admin.rows.length === 0) {
      return res.status(403).json({ error: 'Administrateur non trouvé' });
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
    pool.query(
      'INSERT INTO logs (action, utilisateur_id, details) VALUES ($1, $2, $3)',
      [`${req.method} ${req.path}`, req.user?.id, JSON.stringify({
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent')
      })]
    ).catch(console.error);
  });
  next();
};
app.use(requestLogger);

// ==================== ROUTES PUBLIQUES ====================

// Page d'accueil
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Récupérer tous les distributeurs
app.get('/api/distributeurs', async (req, res) => {
  try {
    const { type, ville, search, lat, lng, radius = 10, limit = 50 } = req.query;
    
    let query = `
      SELECT d.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', di.id, 'url', di.image_url, 'is_primary', di.is_primary)
               ) FILTER (WHERE di.id IS NOT NULL),
               '[]'
             ) as images,
             COALESCE(AVG(a.note), 0) as note_moyenne,
             COUNT(a.id) as nombre_avis
      FROM distributeurs d
      LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
      LEFT JOIN avis a ON d.id = a.distributeur_id AND a.statut = 'approuve'
      WHERE d.statut = 'actif'
    `;
    const params = [];
    let paramCount = 0;

    if (type && type !== 'all') {
      paramCount++;
      query += ` AND d.type = $${paramCount}`;
      params.push(type);
    }

    if (ville && ville !== 'all') {
      paramCount++;
      query += ` AND d.ville = $${paramCount}`;
      params.push(ville);
    }

    if (search) {
      paramCount++;
      query += ` AND (d.nom ILIKE $${paramCount} OR d.adresse ILIKE $${paramCount} OR d.ville ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY d.id ORDER BY d.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    let distributeurs = result.rows;

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
      total: distributeurs.length
    });
  } catch (error) {
    console.error('Erreur récupération distributeurs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des distributeurs' 
    });
  }
});

// Récupérer un distributeur
app.get('/api/distributeurs/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, 
              COALESCE(
                json_agg(
                  json_build_object('id', di.id, 'url', di.image_url, 'is_primary', di.is_primary)
                ) FILTER (WHERE di.id IS NOT NULL),
                '[]'
              ) as images,
              COALESCE(AVG(a.note), 0) as note_moyenne,
              COUNT(a.id) as nombre_avis
       FROM distributeurs d
       LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
       LEFT JOIN avis a ON d.id = a.distributeur_id AND a.statut = 'approuve'
       WHERE d.id = $1
       GROUP BY d.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Distributeur non trouvé' 
      });
    }

    // Récupérer les avis
    const avis = await pool.query(
      'SELECT * FROM avis WHERE distributeur_id = $1 AND statut = $2 ORDER BY created_at DESC',
      [req.params.id, 'approuve']
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        avis: avis.rows
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
        error: 'Distributeur ID et note requis' 
      });
    }

    if (note < 1 || note > 5) {
      return res.status(400).json({ 
        success: false,
        error: 'La note doit être entre 1 et 5' 
      });
    }

    const result = await pool.query(
      'INSERT INTO avis (distributeur_id, utilisateur_id, note, commentaire) VALUES ($1, $2, $3, $4) RETURNING *',
      [distributeur_id, utilisateur_id || 'anonymous', note, commentaire]
    );

    // Mettre à jour la note moyenne
    await pool.query(
      `UPDATE distributeurs 
       SET note = (SELECT AVG(note) FROM avis WHERE distributeur_id = $1 AND statut = 'approuve'),
           nombre_avis = (SELECT COUNT(*) FROM avis WHERE distributeur_id = $1 AND statut = 'approuve')
       WHERE id = $1`,
      [distributeur_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
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

// Connexion admin
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Identifiants incorrects' 
      });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Identifiants incorrects' 
      });
    }

    // Mettre à jour dernière connexion
    await pool.query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'ctl_loket_secret_2024',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: { 
        token, 
        admin: { 
          id: admin.id, 
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name
        } 
      }
    });
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur interne du serveur' 
    });
  }
});

// CRUD Distributeurs
app.post('/api/admin/distributeurs', authenticateToken, async (req, res) => {
  try {
    const { nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen, images } = req.body;

    const result = await pool.query(
      `INSERT INTO distributeurs (nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen]
    );

    const distributeur = result.rows[0];

    // Gérer les images
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          'INSERT INTO distributeur_images (distributeur_id, image_url, is_primary, ordre) VALUES ($1, $2, $3, $4)',
          [distributeur.id, images[i], i === 0, i]
        );
      }
    }

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
    const { nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen, images } = req.body;

    const result = await pool.query(
      `UPDATE distributeurs 
       SET nom = $1, type = $2, latitude = $3, longitude = $4, adresse = $5, ville = $6, 
           description = $7, telephone = $8, email = $9, site_web = $10, prix_moyen = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 RETURNING *`,
      [nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Distributeur non trouvé' 
      });
    }

    // Gérer les images
    if (images) {
      await pool.query('DELETE FROM distributeur_images WHERE distributeur_id = $1', [id]);
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          'INSERT INTO distributeur_images (distributeur_id, image_url, is_primary, ordre) VALUES ($1, $2, $3, $4)',
          [id, images[i], i === 0, i]
        );
      }
    }

    res.json({
      success: true,
      data: result.rows[0]
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
    
    await pool.query('DELETE FROM distributeur_images WHERE distributeur_id = $1', [id]);
    await pool.query('DELETE FROM avis WHERE distributeur_id = $1', [id]);
    const result = await pool.query('DELETE FROM distributeurs WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Distributeur non trouvé' 
      });
    }

    res.json({
      success: true,
      message: 'Distributeur supprimé avec succès',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur suppression distributeur:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression du distributeur' 
    });
  }
});

// Statistiques
app.get('/api/admin/statistiques', authenticateToken, async (req, res) => {
  try {
    const totalDistributeurs = await pool.query('SELECT COUNT(*) FROM distributeurs WHERE statut = $1', ['actif']);
    const distributeursParVille = await pool.query('SELECT ville, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY ville ORDER BY count DESC', ['actif']);
    const distributeursParType = await pool.query('SELECT type, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY type ORDER BY count DESC', ['actif']);
    const nouveauxCeMois = await pool.query('SELECT COUNT(*) FROM distributeurs WHERE created_at >= DATE_TRUNC($1, CURRENT_DATE) AND statut = $2', ['month', 'actif']);
    
    const notesMoyennes = await pool.query(`
      SELECT d.type, COALESCE(AVG(a.note), 0) as note_moyenne
      FROM distributeurs d
      LEFT JOIN avis a ON d.id = a.distributeur_id AND a.statut = 'approuve'
      WHERE d.statut = 'actif'
      GROUP BY d.type
    `);

    res.json({
      success: true,
      data: {
        total: parseInt(totalDistributeurs.rows[0].count),
        parVille: distributeursParVille.rows,
        parType: distributeursParType.rows,
        nouveauxCeMois: parseInt(nouveauxCeMois.rows[0].count),
        notesMoyennes: notesMoyennes.rows
      }
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

// Gestion des avis admin
app.get('/api/admin/avis', authenticateToken, async (req, res) => {
  try {
    const { statut, limit = 50 } = req.query;
    
    let query = `
      SELECT a.*, d.nom as distributeur_nom
      FROM avis a
      JOIN distributeurs d ON a.distributeur_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (statut) {
      query += ` AND a.statut = $1`;
      params.push(statut);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    
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
    version: '3.0.0'
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
  const R = 6371;
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
app.listen(PORT, async () => {
  console.log(`🚀 Serveur CTL-LOKET démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  
  await initDB();
});

