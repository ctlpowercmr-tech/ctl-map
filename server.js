import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
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
const pool = new Pool({
  connectionString: 'postgresql://ctl_map_user:qG8PBp0CrgXssy9OuSoirLzf346vNnxJ@dpg-d4cqrq3ipnbc739ksii0-a.oregon-postgres.render.com/ctl_map_mj9z',
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  try {
    const user = jwt.verify(token, 'ctl_loket_secret_2024');
    const admin = await pool.query(
      'SELECT * FROM admins WHERE id = $1 AND is_active = true',
      [user.id]
    );
    
    if (admin.rows.length === 0) {
      return res.status(403).json({ error: 'Admin non trouvé' });
    }

    req.user = admin.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Initialisation de la base de données
async function initDB() {
  try {
    // Table admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(100),
        permissions JSONB DEFAULT '["all"]',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table distributeurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS distributeurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        latitude DECIMAL(12, 9) NOT NULL,
        longitude DECIMAL(12, 9) NOT NULL,
        adresse TEXT NOT NULL,
        ville VARCHAR(100) NOT NULL,
        description TEXT,
        telephone VARCHAR(20),
        email VARCHAR(255),
        site_web VARCHAR(255),
        horaires JSONB,
        services JSONB,
        prix_moyen VARCHAR(50),
        note_moyenne DECIMAL(3, 2) DEFAULT 0,
        nombre_avis INTEGER DEFAULT 0,
        statut VARCHAR(20) DEFAULT 'actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table images
    await pool.query(`
      CREATE TABLE IF NOT EXISTS distributeur_images (
        id SERIAL PRIMARY KEY,
        distributeur_id INTEGER REFERENCES distributeurs(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        ordre INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table avis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS avis (
        id SERIAL PRIMARY KEY,
        distributeur_id INTEGER REFERENCES distributeurs(id) ON DELETE CASCADE,
        utilisateur_id VARCHAR(100),
        note INTEGER CHECK (note >= 1 AND note <= 5),
        commentaire TEXT,
        statut VARCHAR(20) DEFAULT 'approuve',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin par défaut
    const adminExists = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      ['admin']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await pool.query(
        `INSERT INTO admins (username, password_hash, email, full_name) 
         VALUES ($1, $2, $3, $4)`,
        ['admin', hashedPassword, 'admin@ctlloket.cm', 'Administrateur Principal']
      );
      console.log('✅ Admin créé: admin / admin123');
    }

    // Données de démonstration
    const distributeursExists = await pool.query('SELECT COUNT(*) FROM distributeurs');
    if (parseInt(distributeursExists.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO distributeurs (nom, type, latitude, longitude, adresse, ville, description, telephone, prix_moyen) VALUES
        ('Distributeur Bonapp', 'nourriture', 4.051056, 9.767868, 'Rue Joss, Akwa', 'Douala', 'Distributeur de snacks et boissons divers', '+237 6XX XXX XXX', '500-2000 FCFA'),
        ('Distributeur Aquavie', 'boissons', 4.048556, 9.704268, 'Avenue Charles de Gaulle', 'Douala', 'Distributeur d''eau et boissons fraîches', '+237 6XX XXX XXX', '500-1500 FCFA'),
        ('Distributeur TicketPlus', 'billets', 4.044456, 9.701268, 'Boulevard de la Liberté', 'Douala', 'Distributeur de tickets de bus et transport', '+237 6XX XXX XXX', '100-5000 FCFA'),
        ('Super Distributeur', 'divers', 4.040856, 9.699968, 'Marché Central', 'Douala', 'Distributeur multi-services', '+237 6XX XXX XXX', 'Variable')
      `);
      console.log('✅ Données de démonstration créées');
    }

    console.log('✅ Base de données initialisée');
  } catch (error) {
    console.error('❌ Erreur initialisation DB:', error);
  }
}

// Routes API

// Santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CTL-LOKET API en marche',
    timestamp: new Date().toISOString()
  });
});

// Connexion admin
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = true',
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

    // Mettre à jour dernière connexion
    await pool.query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        permissions: admin.permissions 
      },
      'ctl_loket_secret_2024',
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
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les distributeurs
app.get('/api/distributeurs', async (req, res) => {
  try {
    const { type, ville, search, lat, lng, radius = 10 } = req.query;
    
    let query = `
      SELECT d.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', di.id, 'url', di.image_url, 'is_primary', di.is_primary)
               ) FILTER (WHERE di.id IS NOT NULL),
               '[]'
             ) as images
      FROM distributeurs d
      LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
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

    query += ` GROUP BY d.id ORDER BY d.nom`;

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
      data: distributeurs
    });
  } catch (error) {
    console.error('Erreur récupération distributeurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un distributeur
app.get('/api/distributeurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const distributeurResult = await pool.query(`
      SELECT d.*, 
             COALESCE(
               json_agg(
                 json_build_object('id', di.id, 'url', di.image_url, 'is_primary', di.is_primary)
               ) FILTER (WHERE di.id IS NOT NULL),
               '[]'
             ) as images
      FROM distributeurs d
      LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
      WHERE d.id = $1
      GROUP BY d.id
    `, [id]);

    if (distributeurResult.rows.length === 0) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    const avisResult = await pool.query(
      'SELECT * FROM avis WHERE distributeur_id = $1 AND statut = $2 ORDER BY created_at DESC',
      [id, 'approuve']
    );

    const distributeur = distributeurResult.rows[0];
    distributeur.avis = avisResult.rows;

    res.json({
      success: true,
      data: distributeur
    });
  } catch (error) {
    console.error('Erreur récupération distributeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un avis
app.post('/api/avis', async (req, res) => {
  try {
    const { distributeur_id, note, commentaire, utilisateur_id = 'anonymous' } = req.body;

    if (!distributeur_id || !note) {
      return res.status(400).json({ error: 'Distributeur ID et note requis' });
    }

    const result = await pool.query(
      'INSERT INTO avis (distributeur_id, utilisateur_id, note, commentaire) VALUES ($1, $2, $3, $4) RETURNING *',
      [distributeur_id, utilisateur_id, note, commentaire]
    );

    // Mettre à jour la note moyenne
    await updateNoteMoyenne(distributeur_id);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur ajout avis:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function updateNoteMoyenne(distributeurId) {
  const result = await pool.query(`
    SELECT AVG(note) as moyenne, COUNT(*) as count 
    FROM avis 
    WHERE distributeur_id = $1 AND statut = 'approuve'
  `, [distributeurId]);

  const moyenne = parseFloat(result.rows[0].moyenne) || 0;
  const count = parseInt(result.rows[0].count);

  await pool.query(
    'UPDATE distributeurs SET note_moyenne = $1, nombre_avis = $2 WHERE id = $3',
    [moyenne, count, distributeurId]
  );
}

// Routes Admin

// Créer distributeur
app.post('/api/admin/distributeurs', authenticateToken, async (req, res) => {
  try {
    const { nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen } = req.body;

    const result = await pool.query(`
      INSERT INTO distributeurs (nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur création distributeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier distributeur
app.put('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen } = req.body;

    const result = await pool.query(`
      UPDATE distributeurs 
      SET nom = $1, type = $2, latitude = $3, longitude = $4, adresse = $5, ville = $6, 
          description = $7, telephone = $8, email = $9, site_web = $10, prix_moyen = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, prix_moyen, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur modification distributeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer distributeur
app.delete('/api/admin/distributeurs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM distributeurs WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distributeur non trouvé' });
    }

    res.json({
      success: true,
      message: 'Distributeur supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression distributeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques
app.get('/api/admin/statistiques', authenticateToken, async (req, res) => {
  try {
    const totalDistributeurs = await pool.query('SELECT COUNT(*) FROM distributeurs WHERE statut = $1', ['actif']);
    const parVille = await pool.query('SELECT ville, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY ville', ['actif']);
    const parType = await pool.query('SELECT type, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY type', ['actif']);
    const nouveauxMois = await pool.query(`SELECT COUNT(*) FROM distributeurs WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`);

    res.json({
      success: true,
      data: {
        total: parseInt(totalDistributeurs.rows[0].count),
        parVille: parVille.rows,
        parType: parType.rows,
        nouveauxMois: parseInt(nouveauxMois.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route fallback pour SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Fonction utilitaire de calcul de distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`🚀 Serveur CTL-LOKET démarré sur le port ${PORT}`);
  await initDB();
});
