class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.navigationLine = null;
        this.directionSource = null;
        this.currentStyleIndex = 0;
        this.mapStyles = [
            'mapbox://styles/mapbox/navigation-day-v1',
            'mapbox://styles/mapbox/navigation-night-v1',
            'mapbox://styles/mapbox/satellite-streets-v12',
            'mapbox://styles/mapbox/light-v11'
        ];
        this.onMarkerClickCallback = null;
        this.onMapClickCallback = null;
    }

    async init(containerId) {
        // Token Mapbox - À remplacer par votre token
        mapboxgl.accessToken = 'pk.eyJ1IjoiY3RsLWxvY2F0aW9uIiwiYSI6ImNsb2Z5a2V1bTAwNG0ya3Bkdmx1cG1zN2kifQ.votre_token_ici';

        this.map = new mapboxgl.Map({
            container: containerId,
            style: this.mapStyles[this.currentStyleIndex],
            center: [11.5021, 3.8480], // Centre du Cameroun
            zoom: 6,
            pitch: 0,
            bearing: 0,
            antialias: true,
            attributionControl: true,
            customAttribution: '© CTL-LOKET'
        });

        await this.waitForMapLoad();
        this.setupMapControls();
        this.setupMapEvents();
    }

    waitForMapLoad() {
        return new Promise((resolve) => {
            this.map.on('load', () => {
                console.log('✅ Carte Mapbox chargée avec succès');
                resolve();
            });

            this.map.on('error', (e) => {
                console.error('❌ Erreur chargement carte:', e);
            });
        });
    }

    setupMapControls() {
        // Contrôles de navigation
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        
        // Contrôle de géolocalisation
        this.map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserLocation: true,
            showAccuracyCircle: true
        }), 'top-right');

        // Ajout des sources pour le terrain 3D
        this.map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });

        // Activation du terrain 3D
        this.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
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
    }

    updateDistributeurs(distributeurs) {
        this.clearMarkers();
        
        distributeurs.forEach(distributeur => {
            this.addDistributeurMarker(distributeur);
        });
    }

    addDistributeurMarker(distributeur) {
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
        el.style.transform = 'scale(0)';

        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([parseFloat(distributeur.longitude), parseFloat(distributeur.latitude)])
        .addTo(this.map);

        // Animation
        setTimeout(() => {
            el.style.transition = 'all 0.3s ease';
            el.style.opacity = '1';
            el.style.transform = 'scale(1)';
        }, 100);

        this.markers.push({
            marker,
            distributeur,
            element: el
        });
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
            <div class="marker-content" style="border-color: ${color}">
                <div class="marker-icon" style="background: ${color}">
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
        if (this.userMarker) {
            this.userMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'user-marker pulse-marker';
        el.innerHTML = `
            <div class="user-marker-content">
                <i class="fas fa-user"></i>
                <div class="pulse-ring"></div>
            </div>
        `;

        this.userMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);

        // Animation de pulsation
        this.startPulseAnimation(el);
    }

    startPulseAnimation(element) {
        const rings = element.querySelectorAll('.pulse-ring');
        rings.forEach(ring => {
            ring.style.animation = 'pulse 2s infinite';
        });
    }

    clearMarkers() {
        this.markers.forEach(({ marker }) => marker.remove());
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        this.map.flyTo({
            center: [lng, lat],
            zoom: zoom,
            essential: true,
            duration: 2000,
            curve: 1.5
        });
    }

    async startNavigation(start, end) {
        try {
            // Calcul d'itinéraire simplifié (dans une vraie app, utiliser Mapbox Directions API)
            await this.drawNavigationLine(start, end);
            this.animateNavigation(start, end);
            
        } catch (error) {
            console.error('Erreur navigation:', error);
            // Fallback: ligne droite
            this.drawStraightLine(start, end);
        }
    }

    async drawNavigationLine(start, end) {
        // Nettoyer l'ancien itinéraire
        this.stopNavigation();

        // Créer une ligne droite avec des points intermédiaires pour simulation
        const coordinates = this.generateRouteCoordinates(start, end);
        
        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            properties: {}
        };

        // Ajouter la source
        if (!this.map.getSource('route')) {
            this.map.addSource('route', {
                type: 'geojson',
                data: geojson
            });
        } else {
            this.map.getSource('route').setData(geojson);
        }

        // Ajouter le layer
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
                    'line-opacity': 0.8,
                    'line-dasharray': [0.5, 0.25]
                }
            });

            // Ajouter un glow effect
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
                    'line-width': 10,
                    'line-opacity': 0.2,
                    'line-blur': 5
                }
            });
        }

        this.navigationLine = {
            remove: () => {
                if (this.map.getLayer('route')) this.map.removeLayer('route');
                if (this.map.getLayer('route-glow')) this.map.removeLayer('route-glow');
                if (this.map.getSource('route')) this.map.removeSource('route');
            }
        };
    }

    generateRouteCoordinates(start, end, points = 10) {
        const coordinates = [];
        
        for (let i = 0; i <= points; i++) {
            const progress = i / points;
            const lat = start.lat + (end.lat - start.lat) * progress;
            const lng = start.lng + (end.lng - start.lng) * progress;
            
            // Ajouter un peu de variation pour simuler un vrai chemin
            const variation = Math.sin(progress * Math.PI) * 0.001;
            coordinates.push([lng + variation, lat + variation]);
        }
        
        return coordinates;
    }

    drawStraightLine(start, end) {
        const geojson = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [start.lng, start.lat],
                    [end.lng, end.lat]
                ]
            }
        };

        if (this.map.getSource('route')) {
            this.map.getSource('route').setData(geojson);
        }
    }

    animateNavigation(start, end) {
        const duration = 30000; // 30 secondes
        const startTime = Date.now();
        const routePoints = this.generateRouteCoordinates(start, end, 100);

        let currentPositionIndex = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            currentPositionIndex = Math.floor(progress * (routePoints.length - 1));
            const currentPoint = routePoints[currentPositionIndex];

            if (this.userMarker) {
                this.userMarker.setLngLat(currentPoint);
            }

            // Mettre à jour la vue pour suivre l'utilisateur
            if (progress < 0.95) { // Ne pas centrer sur la fin
                this.map.easeTo({
                    center: currentPoint,
                    duration: 1000,
                    essential: true
                });
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation arrivée
                this.showArrivalAnimation(end);
            }
        };

        animate();
    }

    showArrivalAnimation(end) {
        // Créer un effet de pulsation sur le marqueur de destination
        const destinationMarker = this.markers.find(m => 
            m.distributeur.latitude.toFixed(6) === end.lat.toFixed(6) &&
            m.distributeur.longitude.toFixed(6) === end.lng.toFixed(6)
        );

        if (destinationMarker) {
            destinationMarker.element.classList.add('arrival-pulse');
            setTimeout(() => {
                destinationMarker.element.classList.remove('arrival-pulse');
            }, 3000);
        }
    }

    stopNavigation() {
        if (this.navigationLine) {
            this.navigationLine.remove();
            this.navigationLine = null;
        }
    }

    cycleStyle() {
        this.currentStyleIndex = (this.currentStyleIndex + 1) % this.mapStyles.length;
        this.map.setStyle(this.mapStyles[this.currentStyleIndex]);
        
        // Réactiver le terrain et recharger les marqueurs
        this.map.once('style.load', () => {
            this.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            
            // Recharger les marqueurs après changement de style
            setTimeout(() => {
                this.markers.forEach(({ marker, distributeur }) => {
                    marker.addTo(this.map);
                });
            }, 500);
        });
    }

    updateMarkersVisibility() {
        const bounds = this.map.getBounds();
        this.markers.forEach(({ marker, distributeur }) => {
            const lngLat = [parseFloat(distributeur.longitude), parseFloat(distributeur.latitude)];
            const isVisible = bounds.contains(lngLat);
            marker.getElement().style.display = isVisible ? 'block' : 'none';
        });
    }

    updateMarkersSize() {
        const zoom = this.map.getZoom();
        const scale = Math.min(1, Math.max(0.5, (zoom - 10) / 5)); // Scale entre 0.5 et 1
        
        this.markers.forEach(({ element }) => {
            element.style.transform = `scale(${scale})`;
        });
    }

    highlightSearchResults(results) {
        this.markers.forEach(({ element, distributeur }) => {
            const isVisible = results.some(r => r.id === distributeur.id);
            element.style.opacity = isVisible ? '1' : '0.3';
            element.style.pointerEvents = isVisible ? 'auto' : 'none';
        });
    }

    showMapView() {
        this.map.setPitch(0);
        this.map.setBearing(0);
        this.map.flyTo({
            zoom: 12,
            duration: 1000
        });
    }

    showListView() {
        this.map.setPitch(0);
        this.map.setBearing(0);
        this.map.flyTo({
            zoom: 10,
            duration: 1000
        });
    }

    showRadarView() {
        this.map.setPitch(60);
        this.animateRadar();
    }

    animateRadar() {
        let bearing = 0;
        
        const animate = () => {
            bearing = (bearing + 0.2) % 360;
            this.map.setBearing(bearing);
            
            if (this.radarActive) {
                requestAnimationFrame(animate);
            }
        };
        
        this.radarActive = true;
        animate();
    }

    stopRadar() {
        this.radarActive = false;
    }

    onMarkerClick(callback) {
        this.onMarkerClickCallback = callback;
    }

    onMapClick(callback) {
        this.onMapClickCallback = callback;
    }

    // Méthode pour obtenir les coordonnées du clic
    getClickCoordinates(e) {
        return {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
        };
    }
}

export default MapManager;
