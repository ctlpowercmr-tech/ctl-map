import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de base
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// Données simulées pour les distributeurs (en attendant la base de données)
const distributeurs = [
    {
        id: 1,
        nom: "Distributeur Bonapp",
        type: "nourriture",
        latitude: 4.0511,
        longitude: 9.7679,
        adresse: "Rue Joss, Douala",
        ville: "Douala",
        description: "Distributeur de snacks et boissons",
        images: []
    },
    {
        id: 2,
        nom: "Distributeur Aquavie",
        type: "boissons",
        latitude: 4.0486,
        longitude: 9.7043,
        adresse: "Avenue Charles de Gaulle, Douala",
        ville: "Douala",
        description: "Distributeur d'eau et boissons fraîches",
        images: []
    },
    {
        id: 3,
        nom: "Distributeur TicketPlus",
        type: "billets",
        latitude: 4.0444,
        longitude: 9.7013,
        adresse: "Boulevard de la Liberté, Douala",
        ville: "Douala",
        description: "Distributeur de tickets de bus",
        images: []
    }
];

// Routes API
app.get('/api/distributeurs', (req, res) => {
    const { type, ville, lat, lng, radius = 5 } = req.query;
    
    let filteredDistributeurs = [...distributeurs];

    // Filtrage par type
    if (type && type !== 'all') {
        filteredDistributeurs = filteredDistributeurs.filter(d => d.type === type);
    }

    // Filtrage par ville
    if (ville && ville !== 'all') {
        filteredDistributeurs = filteredDistributeurs.filter(d => d.ville === ville);
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
        data: filteredDistributeurs
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
