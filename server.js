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

// Configuration de la base de données
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com"],
      imgSrc: ["'self'", "data:", "https://", "http:"],
      connectSrc: ["'self'", "https://api.mapbox.com", "wss:"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par windowMs
});
app.use(limiter);

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Routes de l'API

// Connexion administrateur
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      admin: { 
        id: admin.id, 
        username: admin.username 
      } 
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Récupérer tous les distributeurs
app.get('/api/distributeurs', async (req, res) => {
  try {
    const { type, ville, limit = 50 } = req.query;
    
    let query = `
      SELECT d.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', di.id, 'url', di.image_url)
               ) FILTER (WHERE di.id IS NOT NULL),
               '[]'
             ) as images
      FROM distributeurs d
      LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (type) {
      paramCount++;
      query += ` AND d.type = $${paramCount}`;
      params.push(type);
    }

    if (ville) {
      paramCount++;
      query += ` AND d.ville = $${paramCount}`;
      params.push(ville);
    }

    query += ` GROUP BY d.id ORDER BY d.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération distributeurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Récupérer les distributeurs proches
app.get('/api/distributeurs/proches', async (req, res) => {
  try {
    const { lat, lng, radius = 5, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Coordonnées requises' });
    }

    const query = `
      SELECT d.*,
             (6371 * acos(cos(radians($1)) * cos(radians(d.latitude)) * 
             cos(radians(d.longitude) - radians($2)) + 
             sin(radians($1)) * sin(radians(d.latitude)))) as distance,
             COALESCE(
               json_agg(
                 json_build_object('id', di.id, 'url', di.image_url)
               ) FILTER (WHERE di.id IS NOT NULL),
               '[]'
             ) as images
      FROM distributeurs d
      LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
      WHERE (6371 * acos(cos(radians($1)) * cos(radians(d.latitude)) * 
             cos(radians(d.longitude) - radians($2)) + 
             sin(radians($1)) * sin(radians(d.latitude)))) < $3
      GROUP BY d.id
      ORDER BY distance
      LIMIT $4
    `;

    const result = await pool.query(query, [lat, lng, radius, limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération distributeurs proches:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// CRUD Distributeurs (Admin)
app.post('/api/admin/distributeurs', authenticateToken, async (req, res) => {
  try {
    const { nom, type, latitude, longitude, adresse, ville, description, images } = req.body;
    
    const result = await pool.query(
      `INSERT INTO distributeurs (nom, type, latitude, longitude, adresse, ville, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nom, type, latitude, longitude, adresse, ville, description]
    );

    const distributeur = result.rows[0];

    // Gérer les images
    if (images && images.length > 0) {
      for (const imageData of images) {
        await pool.query(
          'INSERT INTO distributeur_images (distributeur_id, image_url) VALUES ($1, $2)',
          [distributeur.id, imageData]
        );
      }
    }

    res.status(201).json(distributeur);
  } catch (error) {
    console.error('Erreur création distributeur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.put('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, latitude, longitude, adresse, ville, description } = req.body;
    
    const result = await pool.query(
      `UPDATE distributeurs 
       SET nom = $1, type = $2, latitude = $3, longitude = $4, adresse = $5, ville = $6, description = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [nom, type, latitude, longitude, adresse, ville, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur modification distributeur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.delete('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM distributeur_images WHERE distributeur_id = $1', [id]);
    const result = await pool.query('DELETE FROM distributeurs WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    res.json({ message: 'Distributeur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression distributeur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Statistiques
app.get('/api/admin/statistiques', authenticateToken, async (req, res) => {
  try {
    const totalDistributeurs = await pool.query('SELECT COUNT(*) FROM distributeurs');
    const distributeursParVille = await pool.query('SELECT ville, COUNT(*) FROM distributeurs GROUP BY ville');
    const distributeursParType = await pool.query('SELECT type, COUNT(*) FROM distributeurs GROUP BY type');
    
    res.json({
      total: parseInt(totalDistributeurs.rows[0].count),
      parVille: distributeursParVille.rows,
      parType: distributeursParType.rows
    });
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route par défaut
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Initialisation de la base de données
async function initDB() {
  try {
    // Table admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table distributeurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS distributeurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        adresse TEXT NOT NULL,
        ville VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table images des distributeurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS distributeur_images (
        id SERIAL PRIMARY KEY,
        distributeur_id INTEGER REFERENCES distributeurs(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Créer un admin par défaut
    const adminExists = await pool.query('SELECT * FROM admins WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('Admin créé: admin / admin123');
    }

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur initialisation base de données:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Serveur CTL-LOKET démarré sur le port ${PORT}`);
  initDB();
});