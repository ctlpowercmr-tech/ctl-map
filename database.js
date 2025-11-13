import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

class DatabaseManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.POSTGRES_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.init();
    }

    async init() {
        try {
            await this.createTables();
            await this.createDefaultAdmin();
            console.log('✅ Base de données initialisée avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation base de données:', error);
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        
        try {
            // Table des administrateurs
            await client.query(`
                CREATE TABLE IF NOT EXISTS admins (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    full_name VARCHAR(100),
                    permissions JSONB DEFAULT '["all"]',
                    is_active BOOLEAN DEFAULT true,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Table des distributeurs
            await client.query(`
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
                    statut VARCHAR(20) DEFAULT 'actif',
                    prix_moyen VARCHAR(50),
                    note DECIMAL(3, 2) DEFAULT 0,
                    nombre_avis INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Table des images
            await client.query(`
                CREATE TABLE IF NOT EXISTS distributeur_images (
                    id SERIAL PRIMARY KEY,
                    distributeur_id INTEGER REFERENCES distributeurs(id) ON DELETE CASCADE,
                    image_url TEXT NOT NULL,
                    image_type VARCHAR(50) DEFAULT 'photo',
                    is_primary BOOLEAN DEFAULT false,
                    ordre INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Table des avis
            await client.query(`
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

            // Table des statistiques
            await client.query(`
                CREATE TABLE IF NOT EXISTS statistiques (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    valeur JSONB NOT NULL,
                    date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Table des logs
            await client.query(`
                CREATE TABLE IF NOT EXISTS logs (
                    id SERIAL PRIMARY KEY,
                    action VARCHAR(100) NOT NULL,
                    utilisateur_id INTEGER,
                    details JSONB,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Tables créées avec succès');
        } finally {
            client.release();
        }
    }

    async createDefaultAdmin() {
        try {
            const adminExists = await this.pool.query(
                'SELECT * FROM admins WHERE username = $1', 
                ['admin']
            );

            if (adminExists.rows.length === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 12);
                await this.pool.query(
                    `INSERT INTO admins (username, password_hash, email, full_name, permissions) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    ['admin', hashedPassword, 'admin@ctlloket.cm', 'Administrateur Principal', '["all"]']
                );
                console.log('👑 Admin créé: admin / admin123');
            }
        } catch (error) {
            console.error('Erreur création admin:', error);
        }
    }

    // CRUD Distributeurs
    async createDistributeur(distributeurData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO distributeurs 
                 (nom, type, latitude, longitude, adresse, ville, description, telephone, email, site_web, horaires, services, prix_moyen) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                 RETURNING *`,
                [
                    distributeurData.nom,
                    distributeurData.type,
                    distributeurData.latitude,
                    distributeurData.longitude,
                    distributeurData.adresse,
                    distributeurData.ville,
                    distributeurData.description,
                    distributeurData.telephone,
                    distributeurData.email,
                    distributeurData.site_web,
                    JSON.stringify(distributeurData.horaires || {}),
                    JSON.stringify(distributeurData.services || []),
                    distributeurData.prix_moyen
                ]
            );

            const distributeur = result.rows[0];

            // Gérer les images
            if (distributeurData.images && distributeurData.images.length > 0) {
                for (let i = 0; i < distributeurData.images.length; i++) {
                    await client.query(
                        'INSERT INTO distributeur_images (distributeur_id, image_url, is_primary, ordre) VALUES ($1, $2, $3, $4)',
                        [distributeur.id, distributeurData.images[i], i === 0, i]
                    );
                }
            }

            await client.query('COMMIT');
            return distributeur;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getDistributeurs(filters = {}) {
        const {
            type, 
            ville, 
            statut = 'actif',
            limit = 100,
            offset = 0,
            search = ''
        } = filters;

        let query = `
            SELECT d.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', di.id, 
                               'url', di.image_url,
                               'is_primary', di.is_primary,
                               'ordre', di.ordre
                           ) ORDER BY di.ordre, di.is_primary DESC
                       ) FILTER (WHERE di.id IS NOT NULL),
                       '[]'
                   ) as images,
                   COALESCE(AVG(a.note), 0) as note_moyenne,
                   COUNT(a.id) as nombre_avis
            FROM distributeurs d
            LEFT JOIN distributeur_images di ON d.id = di.distributeur_id
            LEFT JOIN avis a ON d.id = a.distributeur_id AND a.statut = 'approuve'
            WHERE d.statut = $1
        `;

        const params = [statut];
        let paramCount = 1;

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
            query += ` AND (d.nom ILIKE $${paramCount} OR d.adresse ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ` 
            GROUP BY d.id
            ORDER BY d.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(parseInt(limit), parseInt(offset));

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async getDistributeurById(id) {
        const result = await this.pool.query(
            `SELECT d.*, 
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', di.id, 
                                'url', di.image_url,
                                'is_primary', di.is_primary
                            )
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
            [id]
        );
        return result.rows[0];
    }

    async updateDistributeur(id, distributeurData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `UPDATE distributeurs 
                 SET nom = $1, type = $2, latitude = $3, longitude = $4, adresse = $5, 
                     ville = $6, description = $7, telephone = $8, email = $9, site_web = $10,
                     horaires = $11, services = $12, prix_moyen = $13, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $14 RETURNING *`,
                [
                    distributeurData.nom,
                    distributeurData.type,
                    distributeurData.latitude,
                    distributeurData.longitude,
                    distributeurData.adresse,
                    distributeurData.ville,
                    distributeurData.description,
                    distributeurData.telephone,
                    distributeurData.email,
                    distributeurData.site_web,
                    JSON.stringify(distributeurData.horaires || {}),
                    JSON.stringify(distributeurData.services || []),
                    distributeurData.prix_moyen,
                    id
                ]
            );

            if (distributeurData.images && distributeurData.images.length > 0) {
                // Supprimer les anciennes images
                await client.query('DELETE FROM distributeur_images WHERE distributeur_id = $1', [id]);
                
                // Ajouter les nouvelles images
                for (let i = 0; i < distributeurData.images.length; i++) {
                    await client.query(
                        'INSERT INTO distributeur_images (distributeur_id, image_url, is_primary, ordre) VALUES ($1, $2, $3, $4)',
                        [id, distributeurData.images[i], i === 0, i]
                    );
                }
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteDistributeur(id) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            await client.query('DELETE FROM distributeur_images WHERE distributeur_id = $1', [id]);
            await client.query('DELETE FROM avis WHERE distributeur_id = $1', [id]);
            const result = await client.query('DELETE FROM distributeurs WHERE id = $1 RETURNING *', [id]);
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Statistiques avancées
    async getStatistiques() {
        const totalDistributeurs = await this.pool.query('SELECT COUNT(*) FROM distributeurs WHERE statut = $1', ['actif']);
        const distributeursParVille = await this.pool.query('SELECT ville, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY ville ORDER BY count DESC', ['actif']);
        const distributeursParType = await this.pool.query('SELECT type, COUNT(*) as count FROM distributeurs WHERE statut = $1 GROUP BY type ORDER BY count DESC', ['actif']);
        const nouveauxCeMois = await this.pool.query('SELECT COUNT(*) FROM distributeurs WHERE created_at >= DATE_TRUNC($1, CURRENT_DATE) AND statut = $2', ['month', 'actif']);
        
        const notesMoyennes = await this.pool.query(`
            SELECT d.type, COALESCE(AVG(a.note), 0) as note_moyenne
            FROM distributeurs d
            LEFT JOIN avis a ON d.id = a.distributeur_id AND a.statut = 'approuve'
            WHERE d.statut = 'actif'
            GROUP BY d.type
        `);

        return {
            total: parseInt(totalDistributeurs.rows[0].count),
            parVille: distributeursParVille.rows,
            parType: distributeursParType.rows,
            nouveauxCeMois: parseInt(nouveauxCeMois.rows[0].count),
            notesMoyennes: notesMoyennes.rows
        };
    }

    // Gestion des avis
    async createAvis(avisData) {
        const result = await this.pool.query(
            'INSERT INTO avis (distributeur_id, utilisateur_id, note, commentaire) VALUES ($1, $2, $3, $4) RETURNING *',
            [avisData.distributeur_id, avisData.utilisateur_id, avisData.note, avisData.commentaire]
        );
        return result.rows[0];
    }

    async getAvisByDistributeur(distributeurId) {
        const result = await this.pool.query(
            'SELECT * FROM avis WHERE distributeur_id = $1 AND statut = $2 ORDER BY created_at DESC',
            [distributeurId, 'approuve']
        );
        return result.rows;
    }

    // Logs
    async logAction(action, utilisateurId = null, details = {}) {
        await this.pool.query(
            'INSERT INTO logs (action, utilisateur_id, details) VALUES ($1, $2, $3)',
            [action, utilisateurId, JSON.stringify(details)]
        );
    }
}

export default new DatabaseManager();
