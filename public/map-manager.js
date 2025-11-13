class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.navigationLine = null;
        this.currentStyleIndex = 0;
        this.mapStyles = [
            'mapbox://styles/mapbox/dark-v11',
            'mapbox://styles/mapbox/light-v11',
            'mapbox://styles/mapbox/satellite-v9',
            'mapbox://styles/mapbox/navigation-night-v1'
        ];
    }

    async init(containerId) {
        mapboxgl.accessToken = 'pk.eyJ1IjoiY3RsLWxvY2F0aW9uIiwiYSI6ImNsb2Z5a2V1bTAwNG0ya3Bkdmx1cG1zN2kifQ.YourTokenHere';

        this.map = new mapboxgl.Map({
            container: containerId,
            style: this.mapStyles[this.currentStyleIndex],
            center: [9.7679, 4.0511], // Douala
            zoom: 12,
            pitch: 45,
            bearing: 0,
            antialias: true
        });

        await this.waitForMapLoad();
        this.setupMapControls();
    }

    waitForMapLoad() {
        return new Promise((resolve) => {
            this.map.on('load', resolve);
        });
    }

    setupMapControls() {
        this.map.addControl(new mapboxgl.NavigationControl());
        this.map.addControl(new mapboxgl.ScaleControl());
        
        // Ajouter le contrôle 3D
        this.map.addControl(new mapboxgl.TerrainControl({
            source: 'mapbox-dem',
            exaggeration: 1
        }));

        // Activer le terrain 3D
        this.map.setTerrain({ 
            source: 'mapbox-dem', 
            exaggeration: 1.5 
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
        el.className = 'distributeur-marker';
        el.innerHTML = this.getMarkerHTML(distributeur);
        el.addEventListener('click', () => {
            this.onMarkerClick(distributeur);
        });

        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([distributeur.longitude, distributeur.latitude])
        .addTo(this.map);

        this.markers.push({
            marker,
            distributeur
        });
    }

    getMarkerHTML(distributeur) {
        const typeIcons = {
            'nourriture': 'fa-utensils',
            'boissons': 'fa-wine-bottle',
            'billets': 'fa-ticket-alt',
            'divers': 'fa-shopping-cart'
        };

        const icon = typeIcons[distributeur.type] || 'fa-map-marker-alt';
        
        return `
            <div class="marker-content ${distributeur.type}">
                <i class="fas ${icon}"></i>
                ${distributeur.distance ? 
                    `<div class="marker-distance">${distributeur.distance.toFixed(1)}km</div>` : 
                    ''
                }
            </div>
        `;
    }

    addUserMarker(lat, lng) {
        if (this.userMarker) {
            this.userMarker.remove();
        }

        const el = document.createElement('div');
        el.className = 'user-marker pulse-marker';
        el.innerHTML = '<i class="fas fa-user"></i>';

        this.userMarker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);
    }

    clearMarkers() {
        this.markers.forEach(({ marker }) => marker.remove());
        this.markers = [];
    }

    flyTo(lat, lng, zoom = 15) {
        this.map.flyTo({
            center: [lng, lat],
            zoom: zoom,
            essential: true
        });
    }

    async startNavigation(start, end) {
        // Implémentation simplifiée de la navigation
        // Dans une vraie application, vous utiliseriez l'API Directions de Mapbox
        
        this.drawNavigationLine(start, end);
        this.animateNavigation(start, end);
    }

    drawNavigationLine(start, end) {
        if (this.navigationLine) {
            this.navigationLine.remove();
        }

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

        this.map.addSource('route', {
            type: 'geojson',
            data: geojson
        });

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
                'line-width': 4,
                'line-opacity': 0.8
            }
        });

        this.navigationLine = {
            remove: () => {
                if (this.map.getLayer('route')) this.map.removeLayer('route');
                if (this.map.getSource('route')) this.map.removeSource('route');
            }
        };
    }

    animateNavigation(start, end) {
        // Animation de navigation simplifiée
        const duration = 5000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentLng = start.lng + (end.lng - start.lng) * progress;
            const currentLat = start.lat + (end.lat - start.lat) * progress;

            if (this.userMarker) {
                this.userMarker.setLngLat([currentLng, currentLat]);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
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
        
        // Réactiver le terrain après le changement de style
        this.map.once('style.load', () => {
            this.map.setTerrain({ 
                source: 'mapbox-dem', 
                exaggeration: 1.5 
            });
        });
    }

    // Méthodes pour les différentes vues
    showMapView() {
        this.map.setPitch(45);
        this.map.setBearing(0);
    }

    showListView() {
        // Vue plus plate pour la liste
        this.map.setPitch(0);
        this.map.setBearing(0);
    }

    showRadarView() {
        // Vue radar avec rotation
        this.map.setPitch(60);
        this.animateRadar();
    }

    animateRadar() {
        let bearing = 0;
        
        const animate = () => {
            bearing = (bearing + 0.5) % 360;
            this.map.setBearing(bearing);
            
            if (this.radarActive) {
                requestAnimationFrame(animate);
            }
        };
        
        this.radarActive = true;
        animate();
    }

    highlightSearchResults(results) {
        // Mettre en évidence les marqueurs correspondants
        this.markers.forEach(({ marker, distributeur }) => {
            const isVisible = results.some(r => r.id === distributeur.id);
            marker.getElement().style.opacity = isVisible ? '1' : '0.3';
        });
    }

    onMarkerClick(callback) {
        this.onMarkerClickCallback = callback;
    }
}

export default MapManager;