import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Configuration
const CONFIG = {
    MAPBOX_TOKEN: "pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21pMHpzanhzMTBnNDJpcHl5amp3Y3UxMSJ9.vBVUzayPx57ti_dbj0LuCw",
    APP_NAME: "CTL-LOKET"
};

// Données de démonstration enrichies
const distributeurs = [
    {
        id: 1,
        nom: "Distributeur Bonapp - Akwa",
        type: "nourriture",
        latitude: 4.051056,
        longitude: 9.767868,
        adresse: "Rue Joss, Akwa, Douala",
        ville: "Douala",
        description: "Distributeur automatique de snacks, sandwiches et boissons. Ouvert 24h/24.",
        images: [],
        telephone: "+237 6 55 44 33 22",
        prix_moyen: "500 - 2000 FCFA",
        horaires: "24h/24",
        services: ["Snacks", "Sandwiches", "Boissons", "Café"]
    },
    {
        id: 2,
        nom: "Distributeur Aquavie - Bonanjo",
        type: "boissons",
        latitude: 4.048556,
        longitude: 9.704256,
        adresse: "Avenue Charles de Gaulle, Bonanjo, Douala",
        ville: "Douala",
        description: "Distributeur d'eau minérale, jus naturels et boissons fraîches.",
        images: [],
        telephone: "+237 6 54 43 32 21",
        prix_moyen: "300 - 1500 FCFA",
        horaires: "06:00 - 22:00",
        services: ["Eau minérale", "Jus naturels", "Sodas", "Boissons énergisantes"]
    },
    {
        id: 3,
        nom: "Distributeur TicketPlus - Deido",
        type: "billets",
        latitude: 4.044367,
        longitude: 9.701267,
        adresse: "Boulevard de la Liberté, Deido, Douala",
        ville: "Douala",
        description: "Distributeur de tickets de bus, rechargement mobile et services numériques.",
        images: [],
        telephone: "+237 6 53 42 31 20",
        prix_moyen: "1000 - 5000 FCFA",
        horaires: "07:00 - 20:00",
        services: ["Tickets de bus", "Rechargement mobile", "Paiements", "Services numériques"]
    },
    {
        id: 4,
        nom: "Distributeur MultiService - Makepe",
        type: "divers",
        latitude: 4.060123,
        longitude: 9.750456,
        adresse: "Carrefour Makepe, Douala",
        ville: "Douala",
        description: "Distributeur multi-services : recharge, paiements, envoi d'argent.",
        images: [],
        telephone: "+237 6 52 41 30 19",
        prix_moyen: "500 - 10000 FCFA",
        horaires: "06:30 - 21:30",
        services: ["Recharge", "Paiements", "Envoi d'argent", "Services financiers"]
    },
    {
        id: 5,
        nom: "Distributeur SnackExpress - Bali",
        type: "nourriture",
        latitude: 4.055789,
        longitude: 9.745123,
        adresse: "Quartier Bali, Douala",
        ville: "Douala",
        description: "Distributeur de snacks rapides et boissons chaudes.",
        images: [],
        telephone: "+237 6 51 40 29 18",
        prix_moyen: "400 - 1800 FCFA",
        horaires: "05:30 - 23:00",
        services: ["Snacks", "Boissons chaudes", "Viennoiseries"]
    }
];

// Routes API
app.get('/api/distributeurs', (req, res) => {
    try {
        const { type, ville, lat, lng, radius = 10, search } = req.query;
        
        let filteredDistributeurs = [...distributeurs];

        // Filtrage par type
        if (type && type !== 'all') {
            filteredDistributeurs = filteredDistributeurs.filter(d => d.type === type);
        }

        // Filtrage par ville
        if (ville && ville !== 'all') {
            filteredDistributeurs = filteredDistributeurs.filter(d => d.ville === ville);
        }

        // Recherche texte
        if (search) {
            const searchLower = search.toLowerCase();
            filteredDistributeurs = filteredDistributeurs.filter(d => 
                d.nom.toLowerCase().includes(searchLower) ||
                d.adresse.toLowerCase().includes(searchLower) ||
                d.description.toLowerCase().includes(searchLower)
            );
        }

        // Calcul des distances si coordonnées fournies
        if (lat && lng) {
            filteredDistributeurs = filteredDistributeurs.map(distributeur => {
                const distance = calculateDistance(
                    parseFloat(lat),
                    parseFloat(lng),
                    distributeur.latitude,
                    distributeur.longitude
                );
                return { ...distributeur, distance };
            }).filter(d => d.distance <= radius)
              .sort((a, b) => a.distance - b.distance);
        }

        res.json({
            success: true,
            data: filteredDistributeurs,
            total: filteredDistributeurs.length,
            config: {
                mapboxToken: CONFIG.MAPBOX_TOKEN
            }
        });
    } catch (error) {
        console.error('Erreur API distributeurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

app.get('/api/distributeurs/:id', (req, res) => {
    try {
        const distributeur = distributeurs.find(d => d.id === parseInt(req.params.id));
        
        if (!distributeur) {
            return res.status(404).json({ 
                success: false,
                error: 'Distributeur non trouvé' 
            });
        }

        res.json({
            success: true,
            data: distributeur
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'CTL-LOKET API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        config: CONFIG
    });
});

// Route pour la configuration
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        data: CONFIG
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

// Gestion des erreurs non catchées
process.on('uncaughtException', (error) => {
    console.error('Exception non catchée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rejet non géré:', reason);
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur ${CONFIG.APP_NAME} démarré sur le port ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🗺️  Token Mapbox: ${CONFIG.MAPBOX_TOKEN ? 'Configuré' : 'Manquant'}`);
});
