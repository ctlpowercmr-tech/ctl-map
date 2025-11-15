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

// Données de démonstration
const distributeurs = [
    {
        id: 1,
        nom: "Distributeur Bonapp - Akwa",
        type: "nourriture",
        latitude: 4.0511,
        longitude: 9.7679,
        adresse: "Rue Joss, Akwa, Douala",
        ville: "Douala",
        description: "Distributeur automatique de snacks, sandwiches et boissons. Ouvert 24h/24.",
        images: [],
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "500 - 2000 FCFA"
    },
    {
        id: 2,
        nom: "Distributeur Aquavie - Bonanjo",
        type: "boissons",
        latitude: 4.0486,
        longitude: 9.7043,
        adresse: "Avenue Charles de Gaulle, Bonanjo, Douala",
        ville: "Douala",
        description: "Distributeur d'eau minérale, jus naturels et boissons fraîches.",
        images: [],
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "300 - 1500 FCFA"
    },
    {
        id: 3,
        nom: "Distributeur TicketPlus - Deido",
        type: "billets",
        latitude: 4.0444,
        longitude: 9.7013,
        adresse: "Boulevard de la Liberté, Deido, Douala",
        ville: "Douala",
        description: "Distributeur de tickets de bus, rechargement mobile et services numériques.",
        images: [],
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "1000 - 5000 FCFA"
    },
    {
        id: 4,
        nom: "Distributeur MultiService - Makepe",
        type: "divers",
        latitude: 4.0600,
        longitude: 9.7500,
        adresse: "Carrefour Makepe, Douala",
        ville: "Douala",
        description: "Distributeur multi-services : recharge, paiements, envoi d'argent.",
        images: [],
        telephone: "+237 6XX XXX XXX",
        prix_moyen: "500 - 10000 FCFA"
    }
];

// Routes API
app.get('/api/distributeurs', (req, res) => {
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
            d.ville.toLowerCase().includes(searchLower)
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
        total: filteredDistributeurs.length
    });
});

app.get('/api/distributeurs/:id', (req, res) => {
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

// Route pour la configuration
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        data: {
            mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
        }
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
    console.log(`🌐 URL: http://localhost:${PORT}`);
});
