// Gestionnaire de carte avec Mapbox GL JS
class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.navigationLine = null;
        this.directionSource = null;
        this.currentStyleIndex = 0;
        this.mapStyles = [
            'mapbox://styles/mapbox/navigation-day-v1',      // Style navigation jour
            'mapbox://styles/mapbox/navigation-night-v1',    // Style navigation nuit
            'mapbox://styles/mapbox/satellite-streets-v12',  // Style satellite
            'mapbox://styles/ctlpower/clp0q7v9c007s01r98bqy9p58' // Style Tesla personnalisé
        ];
        this.onMarkerClickCallback = null;
        this.onMapClickCallback = null;
        this.isInitialized = false;
    }

    async init(containerId) {
        try {
            // Configuration Mapbox avec votre token
            mapboxgl.accessToken = 'pk.eyJ1IjoiY3RscG93ZXIiLCJhIjoiY21pMHpzanhzMTBnNDJpcHl5amp3Y3UxMSJ9.vBVUzayPx57ti_dbj0LuCw';
            
            // Vérifier que le token est valide
            if (!mapboxgl.accessToken) {
                throw new Error('Token Mapbox non configuré');
            }

            this.map = new mapboxgl.Map({
                container: containerId,
                style: this.mapStyles[this.currentStyleIndex],
                center: [11.5021, 3.8480], // Centre du Cameroun
                zoom: 6,
                pitch: 0,
                bearing: 0,
                antialias: true,
                attributionControl: true,
                customAttribution: '© CTL-LOKET',
                maxZoom: 18,
                minZoom: 5
            });

            await this.waitForMapLoad();
            this.setupMapControls();
            this.setupMapEvents();
            this.isInitialized = true;
            
            console.log('✅ MapManager initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur initialisation MapManager:', error);
            throw error;
        }
    }

    waitForMapLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout chargement carte'));
            }, 10000);

            this.map.on('load', () => {
                clearTimeout(timeout);
                console.log('🗺️ Carte Mapbox chargée');
                resolve();
            });

            this.map.on('error', (e) => {
                clearTimeout(timeout);
                console.error('❌ Erreur chargement carte:', e);
                reject(e);
            });
        });
    }

    setupMapControls() {
        try {
            // Contrôles de navigation
            this.map.addControl(new mapboxgl.NavigationControl({
                showCompass: true,
                showZoom: true
            }), 'top-right');

            // Contrôle d'échelle
            this.map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }), 'bottom-left');

            // Contrôle de géolocalisation
            const geolocateControl = new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true,
                    timeout: 6000
                },
                trackUserLocation: true,
                showUserLocation: true,
                showAccuracyCircle: true,
                fitBoundsOptions: {
                    maxZoom: 16
                }
            });
            
            this.map.addControl(geolocateControl, 'top-right');

            // Événements du contrôle de géolocalisation
            geolocateControl.on('geolocate', (e) => {
                console.log('📍 Position géolocalisée:', e.coords);
            });

            geolocateControl.on('error', (e) => {
                console.error('❌ Erreur géolocalisation:', e);
            });

        } catch (error) {
            console.warn('⚠️ Certains contrôles carte non disponibles:', error);
        }
    }

    setupMapEvents() {
        // Clic sur la carte
        this.map.on('click', (e) => {
            if (this.onMapClickCallback) {
                this.onMapClickCallback(e);
            }
        });

        // Mouvement de la carte
        this.map.on('moveend', () => {
            this.updateMarkersVisibility();
        });

        // Zoom de la carte
        this.map.on('zoom', () => {
            this.updateMarkersSize();
        });

        // Erreurs de la carte
        this.map.on('error', (e) => {
            console.error('❌ Erreur carte:', e);
        });

        // Redimensionnement
        this.map.on('resize', () => {
            this.updateMarkersVisibility();
        });
    }

    updateDistributeurs(distributeurs) {
        if (!this.isInitialized) {
            console.warn('⚠️ Carte non initialisée');
            return;
        }

        this.clearMarkers();
        
        distributeurs.forEach(distributeur => {
            this.addDistributeurMarker(distributeur);
        });

        this.updateMarkersVisibility();
        console.log(`📍 ${distributeurs.length} distributeurs affichés sur la carte`);
    }

    addDistributeurMarker(distributeur) {
        try {
            const el = document.createElement('div');
            el.className = `distributeur-marker ${distributeur.type}`;
            el.innerHTML = this.getMarkerHTML(distributeur);
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onMarkerClickCallback) {
                    this.onMarkerClickCallback(distributeur);
                }
            });

            // Animation d'apparition
            el.style.opacity = '0';
            el.style.transform = 'scale(0) translateY(20px)';

            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom'
            })
            .setLngLat([parseFloat(distributeur.longitude), parseFloat(distributeur.latitude)])
            .addTo(this.map);

            // Animation d'entrée
            setTimeout(() => {
                el.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.opacity = '1';
                el.style.transform = 'scale(1) translateY(0)';
            }, 100);

            this.markers.push({
                marker,
                distributeur,
                element: el,
                id: distributeur.id
            });

        } catch (error) {
            console.error('❌ Erreur ajout marqueur:', error, distributeur);
        }
    }

    getMarkerHTML(distributeur) {
        const typeIcons = {
            'nourriture': 'fa-utensils',
            'boissons': 'fa-wine-bottle',
            'billets': 'fa-ticket-alt',
            'divers': 'fa-shopping-cart'
        };

        const typeColors = {
            'nourriture': '#e74c3c',
            'boissons': '#3498db',
            'billets': '#9b59b6',
            'divers': '#f39c12'
        };

        const icon = typeIcons[distributeur.type] || 'fa-map-marker-alt';
        const color = typeColors[distributeur.type] || '#2c3e50';
        
        return `
            <div class="marker-content">
                <div class="marker-icon ${distributeur.type}" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                ${distributeur.distance ? 
                    `<div class="marker-distance">${distributeur.distance.toFixed(1)}km</div>` : 
                    ''
                }
                ${distributeur.note_moyenne > 0 ? `
                    <div class="marker-rating">
                        <i class="fas fa-star"></i>
                        <span>${distributeur.note_moyenne.toFixed(1)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    addUserMarker(lat, lng) {
        if (!this.isInitialized) return;

        // Supprimer l'ancien marqueur
        if (this.userMarker) {
            this.userMarker.remove();
        }

        try {
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.innerHTML = `
                <div class="user-marker-content">
                    <i class="fas fa-user"></i>
                    <div class="pulse-ring"></div>
                    <div class="pulse-ring" style="animation-delay: 0.5s"></div>
                    <div class="pulse-ring" style="animation-delay: 1s"></div>
                </div>
            `;

            this.userMarker = new mapboxgl.Marker({
                element: el,
                anchor: 'center'
            })
            .setLngLat([lng, lat])
            .addTo(this.map);

            console.log('📍 Marqueur utilisateur ajouté:', { lat, lng });

        } catch (error) {
            console.error('❌ Erreur ajout marqueur utilisateur:', error);
        }
    }

    highlightDistributeur(distributeurId) {
        this.markers.forEach(({ element, distributeur }) => {
            if (distributeur.id === distributeurId) {
                element.classList.add('highlighted');
                element.style.zIndex = '1000';
                element.style.transform = 'scale(1.2)';
                
                // Animation de pulsation
                element.style.animation = 'pulse 2s infinite';
            } else {
                element.classList.remove('highlighted');
                element.style.zIndex = '';
                element.style.transform = '';
                element.style.animation = '';
            }
        });
    }

    clearMarkers() {
        this.markers.forEach(({ marker }) => {
            try {
                marker.remove();
            } catch (error) {
                console.warn('⚠️ Erreur suppression marqueur:', error);
            }
        });
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        if (!this.isInitialized) return;

        try {
            this.map.flyTo({
                center: [lng, lat],
                zoom: zoom,
                essential: true,
                duration: 2000,
                curve: 1.5,
                speed: 1.2
            });
        } catch (error) {
            console.error('❌ Erreur flyTo:', error);
        }
    }

    async startNavigation(start, end) {
        if (!this.isInitialized) {
            throw new Error('Carte non initialisée');
        }

        try {
            // Nettoyer la navigation précédente
            this.stopNavigation();

            // Calculer l'itinéraire
            const route = await this.calculateRoute(start, end);
            
            // Dessiner l'itinéraire
            await this.drawNavigationLine(route);
            
            // Animer la navigation
            this.animateNavigation(route);
            
            console.log('🧭 Navigation démarrée:', { start, end });

        } catch (error) {
            console.error('❌ Erreur démarrage navigation:', error);
            // Fallback: ligne droite
            this.drawStraightLine(start, end);
            this.animateNavigation({ coordinates: [
                [start.lng, start.lat],
                [end.lng, end.lat]
            ]});
        }
    }

    async calculateRoute(start, end) {
        // Simulation d'API de directions
        // Dans une vraie application, utiliser Mapbox Directions API
        return new Promise((resolve) => {
            setTimeout(() => {
                const coordinates = this.generateRouteCoordinates(start, end, 20);
                resolve({ coordinates });
            }, 500);
        });
    }

    generateRouteCoordinates(start, end, points = 20) {
        const coordinates = [];
        const latDiff = end.lat - start.lat;
        const lngDiff = end.lng - start.lng;
        
        for (let i = 0; i <= points; i++) {
            const progress = i / points;
            const t = progress * Math.PI;
            
            // Courbe de Bézier pour un chemin naturel
            const curveFactor = Math.sin(t) * 0.1;
            
            const lat = start.lat + latDiff * progress + curveFactor;
            const lng = start.lng + lngDiff * progress + curveFactor;
            
            coordinates.push([lng, lat]);
        }
        
        return coordinates;
    }

    async drawNavigationLine(route) {
        if (!this.map.getSource('route')) {
            this.map.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: route.coordinates
                    }
                }
            });
        } else {
            this.map.getSource('route').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: route.coordinates
                }
            });
        }

        // Couche de ligne principale
        if (!this.map.getLayer('route')) {
            this.map.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#00d4ff',
                    'line-width': 5,
                    'line-opacity': 0.8
                }
            });
        }

        // Effet de glow
        if (!this.map.getLayer('route-glow')) {
            this.map.addLayer({
                id: 'route-glow',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#00d4ff',
                    'line-width': 12,
                    'line-opacity': 0.2,
                    'line-blur': 5
                }
            });
        }

        // Point de départ
        if (!this.map.getSource('start-point')) {
            this.map.addSource('start-point', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: route.coordinates[0]
                    }
                }
            });

            this.map.addLayer({
                id: 'start-point',
                type: 'circle',
                source: 'start-point',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#00ff88',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        // Point d'arrivée
        if (!this.map.getSource('end-point')) {
            this.map.addSource('end-point', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: route.coordinates[route.coordinates.length - 1]
                    }
                }
            });

            this.map.addLayer({
                id: 'end-point',
                type: 'circle',
                source: 'end-point',
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#ff4444',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        this.navigationLine = {
            remove: () => {
                const layers = ['route', 'route-glow', 'start-point', 'end-point'];
                const sources = ['route', 'start-point', 'end-point'];
                
                layers.forEach(layer => {
                    if (this.map.getLayer(layer)) this.map.removeLayer(layer);
                });
                
                sources.forEach(source => {
                    if (this.map.getSource(source)) this.map.removeSource(source);
                });
            }
        };
    }

    drawStraightLine(start, end) {
        const coordinates = [
            [start.lng, start.lat],
            [end.lng, end.lat]
        ];

        if (this.map.getSource('route')) {
            this.map.getSource('route').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            });
        }
    }

    animateNavigation(route) {
        const duration = 30000; // 30 secondes
        const startTime = Date.now();
        const coordinates = route.coordinates;

        let currentPositionIndex = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            currentPositionIndex = Math.floor(progress * (coordinates.length - 1));
            const currentPoint = coordinates[currentPositionIndex];

            if (this.userMarker && currentPoint) {
                this.userMarker.setLngLat(currentPoint);
            }

            // Suivre la position avec la caméra (sauf à la fin)
            if (progress < 0.9) {
                this.map.easeTo({
                    center: currentPoint,
                    duration: 1000,
                    essential: true,
                    padding: { top: 0, bottom: 100, left: 0, right: 0 }
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.showArrivalAnimation(coordinates[coordinates.length - 1]);
            }
        };

        animate();
    }

    showArrivalAnimation(endPoint) {
        // Animation d'arrivée sur le marqueur de destination
        const destinationMarker = this.markers.find(m => {
            const markerLngLat = m.marker.getLngLat();
            return this.calculateDistance(
                markerLngLat.lat,
                markerLngLat.lng,
                endPoint[1],
                endPoint[0]
            ) < 0.01; // 10m de tolérance
        });

        if (destinationMarker) {
            destinationMarker.element.classList.add('arrival-pulse');
            setTimeout(() => {
                destinationMarker.element.classList.remove('arrival-pulse');
            }, 3000);
        }

        // Animation de la caméra
        this.map.flyTo({
            center: endPoint,
            zoom: 17,
            pitch: 60,
            bearing: 0,
            duration: 2000
        });
    }

    stopNavigation() {
        if (this.navigationLine) {
            this.navigationLine.remove();
            this.navigationLine = null;
        }
    }

    cycleStyle() {
        if (!this.isInitialized) return;

        this.currentStyleIndex = (this.currentStyleIndex + 1) % this.mapStyles.length;
        
        try {
            this.map.setStyle(this.mapStyles[this.currentStyleIndex]);
            
            this.map.once('style.load', () => {
                // Recharger les marqueurs après changement de style
                setTimeout(() => {
                    this.markers.forEach(({ marker, distributeur }) => {
                        try {
                            marker.addTo(this.map);
                        } catch (error) {
                            console.warn('⚠️ Erreur rechargement marqueur:', error);
                        }
                    });
                    
                    if (this.userMarker) {
                        this.userMarker.addTo(this.map);
                    }
                }, 500);
            });

        } catch (error) {
            console.error('❌ Erreur changement style:', error);
        }
    }

    updateMarkersVisibility() {
        if (!this.isInitialized) return;

        try {
            const bounds = this.map.getBounds();
            this.markers.forEach(({ marker, distributeur }) => {
                const lngLat = [parseFloat(distributeur.longitude), parseFloat(distributeur.latitude)];
                const isVisible = bounds.contains(lngLat);
                
                if (marker.getElement()) {
                    marker.getElement().style.display = isVisible ? 'block' : 'none';
                }
            });
        } catch (error) {
            console.warn('⚠️ Erreur mise à jour visibilité marqueurs:', error);
        }
    }

    updateMarkersSize() {
        if (!this.isInitialized) return;

        try {
            const zoom = this.map.getZoom();
            const scale = Math.min(1.2, Math.max(0.6, (zoom - 10) / 8));
            
            this.markers.forEach(({ element }) => {
                if (element) {
                    element.style.transform = `scale(${scale})`;
                }
            });
        } catch (error) {
            console.warn('⚠️ Erreur mise à jour taille marqueurs:', error);
        }
    }

    highlightSearchResults(results) {
        this.markers.forEach(({ element, distributeur }) => {
            const isVisible = results.some(r => r.id === distributeur.id);
            if (element) {
                element.style.opacity = isVisible ? '1' : '0.3';
                element.style.pointerEvents = isVisible ? 'auto' : 'none';
            }
        });
    }

    showMapView() {
        if (!this.isInitialized) return;

        this.map.flyTo({
            pitch: 0,
            bearing: 0,
            zoom: 12,
            duration: 1000
        });
    }

    showListView() {
        if (!this.isInitialized) return;

        this.map.flyTo({
            pitch: 0,
            bearing: 0,
            zoom: 10,
            duration: 1000
        });
    }

    showRadarView() {
        if (!this.isInitialized) return;

        this.map.flyTo({
            pitch: 60,
            bearing: 0,
            zoom: 13,
            duration: 1000
        });
        
        this.animateRadar();
    }

    animateRadar() {
        if (!this.isInitialized) return;

        let bearing = 0;
        this.radarActive = true;
        
        const animate = () => {
            if (!this.radarActive) return;
            
            bearing = (bearing + 0.3) % 360;
            this.map.easeTo({
                bearing: bearing,
                duration: 50
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    stopRadar() {
        this.radarActive = false;
    }

    getClickCoordinates(e) {
        return {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
        };
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
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

    onMarkerClick(callback) {
        this.onMarkerClickCallback = callback;
    }

    onMapClick(callback) {
        this.onMapClickCallback = callback;
    }

    // Nettoyage
    destroy() {
        if (this.map) {
            this.stopNavigation();
            this.stopRadar();
            this.clearMarkers();
            
            if (this.userMarker) {
                this.userMarker.remove();
            }
            
            this.map.remove();
            this.isInitialized = false;
        }
    }
}

export default MapManager;
