:root {
    --primary-bg: #0f0f0f;
    --secondary-bg: #1a1a1a;
    --accent-color: #00d4ff;
    --accent-hover: #00b8e6;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --border-color: #333333;
    --success-color: #00ff88;
    --warning-color: #ffaa00;
    --error-color: #ff4444;
    --card-bg: rgba(255, 255, 255, 0.05);
    --glass-bg: rgba(255, 255, 255, 0.1);
    --blur: blur(10px);
}

[data-theme="light"] {
    --primary-bg: #ffffff;
    --secondary-bg: #f5f5f5;
    --accent-color: #0066cc;
    --accent-hover: #0052a3;
    --text-primary: #333333;
    --text-secondary: #666666;
    --border-color: #dddddd;
    --card-bg: rgba(0, 0, 0, 0.05);
    --glass-bg: rgba(0, 0, 0, 0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--primary-bg);
    color: var(--text-primary);
    overflow: hidden;
    height: 100vh;
}

#app {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Tesla-like Header */
.tesla-header {
    background: var(--secondary-bg);
    border-bottom: 1px solid var(--border-color);
    backdrop-filter: var(--blur);
    position: sticky;
    top: 0;
    z-index: 1000;
    height: 70px;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
    height: 100%;
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-color);
}

.logo i {
    font-size: 1.8rem;
}

.nav-main {
    display: flex;
    gap: 1rem;
}

.nav-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.nav-btn:hover, .nav-btn.active {
    background: var(--accent-color);
    color: var(--primary-bg);
    border-color: var(--accent-color);
}

.header-actions {
    display: flex;
    gap: 0.5rem;
}

.icon-btn, .admin-access-btn {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.icon-btn:hover, .admin-access-btn:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: var(--primary-bg);
}

/* Mobile Menu Button */
.mobile-menu-btn {
    display: none;
    position: fixed;
    top: 1rem;
    left: 1rem;
    background: var(--accent-color);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    z-index: 1001;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Main Content */
.main-content {
    flex: 1;
    display: flex;
    height: calc(100vh - 70px);
    position: relative;
}

/* Sidebar */
.sidebar {
    width: 350px;
    background: var(--secondary-bg);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.3s ease;
}

.sidebar-header {
    display: none;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    justify-content: space-between;
    align-items: center;
}

.sidebar-header h3 {
    font-size: 1.1rem;
}

.close-sidebar {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.2rem;
    cursor: pointer;
}

.search-section {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.search-box {
    position: relative;
    display: flex;
    align-items: center;
}

.search-box i {
    position: absolute;
    left: 1rem;
    color: var(--text-secondary);
}

.search-box input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.search-box input:focus {
    outline: none;
    border-color: var(--accent-color);
}

.locate-btn {
    background: var(--accent-color);
    color: var(--primary-bg);
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 600;
    transition: background 0.3s ease;
    font-size: 0.9rem;
}

.locate-btn:hover {
    background: var(--accent-hover);
}

.filters-section {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
}

.filter-group select {
    width: 100%;
    padding: 0.75rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.9rem;
    cursor: pointer;
}

.advanced-filters {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.advanced-filters h4 {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--text-primary);
}

.filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.filter-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.filter-option input {
    display: none;
}

.checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.filter-option input:checked + .checkmark {
    background: var(--accent-color);
    border-color: var(--accent-color);
}

.filter-option input:checked + .checkmark::after {
    content: '✓';
    color: white;
    font-size: 0.8rem;
}

.results-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.results-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.results-header h3 {
    font-size: 1.1rem;
    color: var(--text-primary);
}

.results-count {
    background: var(--accent-color);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.results-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.distributeur-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.distributeur-card:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
}

.distributeur-card.active {
    border-color: var(--accent-color);
    background: rgba(0, 212, 255, 0.1);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.card-header h4 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
    color: var(--text-primary);
}

.distance-badge {
    background: var(--accent-color);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
}

.card-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.card-info .type {
    color: var(--accent-color);
    font-size: 0.8rem;
    font-weight: 600;
}

.card-info .address {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.rating {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    margin-top: 0.25rem;
}

.rating i {
    color: var(--warning-color);
    font-size: 0.7rem;
}

.rating-text {
    color: var(--text-secondary);
    font-size: 0.7rem;
}

.no-results {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    font-style: italic;
}

/* Map Container */
.map-container {
    flex: 1;
    position: relative;
    background: var(--primary-bg);
}

#map {
    width: 100%;
    height: 100%;
}

.map-controls {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 10;
}

.map-control-btn {
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    width: 44px;
    height: 44px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-size: 1rem;
}

.map-control-btn:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    transform: scale(1.05);
}

.position-info {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 10;
}

.info-card {
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    min-width: 120px;
}

.info-item .label {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.info-item .value {
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
}

.quick-actions {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 10;
}

.quick-action-btn {
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.quick-action-btn:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
}

/* Styles pour les marqueurs de carte */
.distributeur-marker {
    cursor: pointer;
    transition: all 0.3s ease;
}

.marker-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
}

.marker-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
}

.marker-icon.nourriture { background: #e74c3c; }
.marker-icon.boissons { background: #3498db; }
.marker-icon.billets { background: #9b59b6; }
.marker-icon.divers { background: #f39c12; }

.marker-distance {
    background: var(--accent-color);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
}

.marker-rating {
    background: white;
    color: var(--warning-color);
    padding: 0.2rem 0.4rem;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.1rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* User Marker */
.user-marker {
    z-index: 1000;
}

.user-marker-content {
    position: relative;
    width: 24px;
    height: 24px;
}

.user-marker-content i {
    color: var(--error-color);
    font-size: 1.2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    border: 2px solid var(--error-color);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.6;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.6;
    }
    100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
    }
}

/* Modals */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    z-index: 2000;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.modal.active {
    display: flex;
}

.modal-content {
    background: var(--secondary-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    animation: modalSlideIn 0.3s ease;
    display: flex;
    flex-direction: column;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.modal-header h2 {
    font-size: 1.3rem;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.3s ease;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    color: var(--error-color);
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.image-gallery {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
}

.image-item {
    position: relative;
    flex-shrink: 0;
}

.image-item img {
    width: 100px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.image-item.primary img {
    border-color: var(--accent-color);
}

.primary-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    background: var(--accent-color);
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-size: 0.6rem;
    font-weight: 600;
}

.no-image {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    width: 100%;
}

.no-image i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.distributeur-rating {
    margin-bottom: 1.5rem;
}

.rating-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 8px;
}

.rating-display .stars {
    display: flex;
    gap: 0.25rem;
    color: var(--warning-color);
}

.rating-text {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.distributeur-info {
    margin-bottom: 1.5rem;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.info-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 8px;
}

.info-item i {
    color: var(--accent-color);
    width: 16px;
    text-align: center;
}

.description-section {
    margin-bottom: 1.5rem;
}

.description-section h4 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}

.description {
    color: var(--text-secondary);
    line-height: 1.5;
    font-size: 0.9rem;
}

/* Section Avis */
.avis-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
}

.avis-section h4 {
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.avis-list {
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 1.5rem;
}

.avis-item {
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 8px;
    margin-bottom: 0.75rem;
}

.avis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.avis-stars {
    color: var(--warning-color);
    font-size: 0.8rem;
}

.avis-date {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.avis-comment {
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.4;
}

.add-review {
    background: var(--card-bg);
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.add-review h5 {
    margin-bottom: 0.75rem;
    color: var(--text-primary);
}

.rating-input .stars {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
}

.rating-input .stars i {
    font-size: 1.2rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
}

.rating-input .stars i:hover {
    color: var(--warning-color);
}

.rating-input .stars i.fas {
    color: var(--warning-color);
}

.rating-input textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--primary-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 0.9rem;
    resize: vertical;
    min-height: 80px;
    margin-bottom: 0.75rem;
    font-family: inherit;
}

.modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 1rem;
    flex-shrink: 0;
    flex-wrap: wrap;
}

.btn-primary {
    background: var(--accent-color);
    color: var(--primary-bg);
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    transition: background 0.3s ease;
    flex: 1;
    justify-content: center;
    font-size: 0.9rem;
    min-width: 140px;
}

.btn-primary:hover {
    background: var(--accent-hover);
}

.btn-secondary {
    background: var(--card-bg);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
    flex: 1;
    justify-content: center;
    font-size: 0.9rem;
    min-width: 120px;
}

.btn-secondary:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: var(--primary-bg);
}

.btn-danger {
    background: var(--error-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    transition: background 0.3s ease;
    flex: 1;
    justify-content: center;
}

.btn-danger:hover {
    background: #cc3333;
}

/* Admin Login */
.admin-login {
    max-width: 400px;
}

.login-header {
    text-align: center;
    padding: 2rem 1.5rem 1rem;
}

.login-header i {
    font-size: 3rem;
    color: var(--accent-color);
    margin-bottom: 1rem;
}

.login-header h2 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.input-group {
    position: relative;
    margin-bottom: 1rem;
}

.input-group i {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
}

.input-group input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.9rem;
}

.input-group input:focus {
    outline: none;
    border-color: var(--accent-color);
}

.btn-login {
    widthimport MapManager from './map-manager.js';
import API from './api.js';
import AuthManager from './auth.js';

class CTLLoketApp {
    constructor() {
        this.mapManager = new MapManager();
        this.api = new API();
        this.authManager = new AuthManager();
        this.currentDistributeurs = [];
        this.userPosition = null;
        this.navigationActive = false;
        this.selectedDistributeur = null;
        this.currentRating = 0;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initMap();
            this.bindEvents();
            this.setupTheme();
            this.checkGeolocationPermission();
            this.showNotification('CTL-LOKET prêt à vous servir !', 'info');
            
            // Charger les distributeurs initiaux
            await this.loadDistributeurs();
            
        } catch (error) {
            console.error('Erreur initialisation:', error);
            this.showNotification('Erreur lors du chargement de l\'application', 'error');
        }
    }

    async initMap() {
        try {
            await this.mapManager.init('map');
            this.mapManager.onMarkerClick(this.handleMarkerClick.bind(this));
            this.mapManager.onMapClick(this.handleMapClick.bind(this));
            console.log('✅ Carte initialisée avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation carte:', error);
            this.showNotification('Erreur de chargement de la carte', 'error');
        }
    }

    bindEvents() {
        // Navigation entre les vues
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Recherche en temps réel
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }
        
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                this.loadDistributeurs();
            });
        }

        // Filtres
        document.getElementById('typeFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('villeFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('radiusFilter')?.addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('sortFilter')?.addEventListener('change', this.handleFilter.bind(this));

        // Localisation utilisateur
        document.getElementById('locateBtn')?.addEventListener('click', this.locateUser.bind(this));

        // Thème
        document.getElementById('themeToggle')?.addEventListener('click', this.toggleTheme.bind(this));

        // Accès admin
        document.getElementById('adminAccess')?.addEventListener('click', this.showAdminLogin.bind(this));

        // Menu mobile
        document.getElementById('mobileMenuToggle')?.addEventListener('click', this.toggleMobileMenu.bind(this));

        // Modal distributeur
        document.querySelector('#distributeurModal .close-btn')?.addEventListener('click', () => this.hideModal('distributeurModal'));
        document.getElementById('closeNav')?.addEventListener('click', this.hideNavigation.bind(this));

        // Navigation vers distributeur
        document.getElementById('navigateBtn')?.addEventListener('click', this.startNavigation.bind(this));
        document.getElementById('stopNavigation')?.addEventListener('click', this.hideNavigation.bind(this));
        document.getElementById('shareBtn')?.addEventListener('click', this.shareDistributeur.bind(this));

        // Recentrage carte
        document.getElementById('recenterBtn')?.addEventListener('click', this.recenterMap.bind(this));

        // Connexion admin
        document.getElementById('adminLoginForm')?.addEventListener('submit', this.handleAdminLogin.bind(this));

        // Contrôles carte
        document.getElementById('mapStyleBtn')?.addEventListener('click', this.cycleMapStyle.bind(this));
        document.getElementById('fullscreenBtn')?.addEventListener('click', this.toggleFullscreen.bind(this));

        // Fermer les modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
                this.hideAdminLogin();
            }
        });

        // Gestion du clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.hideNavigation();
                this.hideMobileMenu();
            }
        });

        // Gestion de la visibilité
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.navigationActive) {
                this.updateNavigationProgress();
            }
        });

        console.log('✅ Événements liés avec succès');
    }

    async loadDistributeurs(filters = {}) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const response = await this.api.getDistributeurs(filters);
            
            if (response.success) {
                this.currentDistributeurs = response.data;
                this.mapManager.updateDistributeurs(this.currentDistributeurs);
                this.updateResultsList(this.currentDistributeurs);
                this.updateResultsCount(this.currentDistributeurs.length);
                
                // Mettre à jour le compteur de distributeurs trouvés
                document.getElementById('foundCount').textContent = this.currentDistributeurs.length;
                
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Erreur chargement distributeurs:', error);
            this.showNotification('Erreur lors du chargement des distributeurs', 'error');
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    updateResultsList(distributeurs) {
        const container = document.getElementById('resultsList');
        if (!container) return;

        container.innerHTML = '';

        if (distributeurs.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Aucun distributeur trouvé</p>
                    <p class="subtext">Essayez de modifier vos critères de recherche</p>
                </div>
            `;
            return;
        }

        distributeurs.forEach(distributeur => {
            const card = this.createDistributeurCard(distributeur);
            container.appendChild(card);
        });
    }

    createDistributeurCard(distributeur) {
        const card = document.createElement('div');
        card.className = 'distributeur-card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h4>${this.escapeHtml(distributeur.nom)}</h4>
                    <div class="card-info">
                        <span class="type">${this.getTypeLabel(distributeur.type)}</span>
                        <span class="address">${this.escapeHtml(distributeur.adresse)}</span>
                        ${distributeur.note_moyenne > 0 ? `
                            <div class="rating">
                                ${this.generateStarRating(distributeur.note_moyenne)}
                                <span class="rating-text">(${distributeur.nombre_avis})</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${distributeur.distance ? 
                    `<span class="distance-badge">${distributeur.distance.toFixed(1)}km</span>` : 
                    ''
                }
            </div>
        `;

        card.addEventListener('click', () => {
            this.showDistributeurDetails(distributeur);
        });

        return card;
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Étoiles pleines
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Demi-étoile
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Étoiles vides
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    async handleMarkerClick(distributeur) {
        try {
            const details = await this.loadDistributeurDetails(distributeur.id);
            this.showDistributeurDetails(details || distributeur);
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            this.showDistributeurDetails(distributeur);
        }
    }

    handleMapClick() {
        // Réinitialiser la sélection
        this.selectedDistributeur = null;
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    async loadDistributeurDetails(id) {
        try {
            const response = await this.api.getDistributeur(id);
            if (response.success) {
                return response.data;
            }
        } catch (error) {
            console.error('Erreur chargement détails:', error);
            throw error;
        }
        return null;
    }

    async showDistributeurDetails(distributeur) {
        this.selectedDistributeur = distributeur;
        
        // Mettre à jour les informations de base
        document.getElementById('distributeurName').textContent = this.escapeHtml(distributeur.nom);
        document.getElementById('distributeurType').textContent = this.getTypeLabel(distributeur.type);
        document.getElementById('distributeurAddress').textContent = this.escapeHtml(distributeur.adresse);
        document.getElementById('distributeurVille').textContent = this.escapeHtml(distributeur.ville);
        document.getElementById('distributeurDescription').textContent = 
            this.escapeHtml(distributeur.description || 'Aucune description disponible');

        // Afficher/Masquer les informations optionnelles
        const phoneItem = document.getElementById('distributeurPhoneItem');
        const priceItem = document.getElementById('distributeurPriceItem');
        const phoneElement = document.getElementById('distributeurTelephone');
        const priceElement = document.getElementById('distributeurPrix');

        if (distributeur.telephone) {
            phoneElement.textContent = distributeur.telephone;
            phoneItem.style.display = 'flex';
        } else {
            phoneItem.style.display = 'none';
        }

        if (distributeur.prix_moyen) {
            priceElement.textContent = distributeur.prix_moyen;
            priceItem.style.display = 'flex';
        } else {
            priceItem.style.display = 'none';
        }

        // Gestion des images
        this.updateImageGallery(distributeur);

        // Section avis
        this.updateAvisSection(distributeur);

        this.showModal('distributeurModal');
        
        // Mettre en évidence la carte correspondante
        document.querySelectorAll('.distributeur-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Animation de sélection sur la carte
        this.mapManager.highlightDistributeur(distributeur.id);
    }

    updateImageGallery(distributeur) {
        const gallery = document.getElementById('distributeurImages');
        gallery.innerHTML = '';
        
        if (distributeur.images && distributeur.images.length > 0) {
            distributeur.images.forEach((img, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = `image-item ${img.is_primary ? 'primary' : ''}`;
                imgContainer.innerHTML = `
                    <img src="${img.url}" alt="${distributeur.nom}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiB2aWV3Qm94PSIwIDAgMTAwIDc1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNzUiIGZpbGw9IiMzMzMzMzMiLz48dGV4dCB4PSI1MCIgeT0iMzcuNSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIj5JbWFnZTwvdGV4dD48L3N2Zz4='">
                    ${img.is_primary ? '<span class="primary-badge">Principale</span>' : ''}
                `;
                gallery.appendChild(imgContainer);
            });
        } else {
            gallery.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-image"></i>
                    <p>Aucune image disponible</p>
                </div>
            `;
        }
    }

    updateAvisSection(distributeur) {
        const avisSection = document.getElementById('avisSection');
        if (!avisSection) return;

        // En-tête des avis
        const overallRating = document.getElementById('overallRating');
        if (overallRating) {
            if (distributeur.note_moyenne > 0) {
                overallRating.innerHTML = `
                    <div class="rating-big">${distributeur.note_moyenne.toFixed(1)}</div>
                    <div class="rating-stars">${this.generateStarRating(distributeur.note_moyenne)}</div>
                    <div class="rating-count">${distributeur.nombre_avis} avis</div>
                `;
            } else {
                overallRating.innerHTML = '<p>Soyez le premier à noter ce distributeur</p>';
            }
        }

        // Réinitialiser la notation
        this.currentRating = 0;
        this.updateRatingStars(0);

        // Gestion de la notation
        const stars = avisSection.querySelectorAll('.stars i');
        stars.forEach(star => {
            star.addEventListener('mouseover', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.updateRatingStars(rating);
            });

            star.addEventListener('mouseout', () => {
                this.updateRatingStars(this.currentRating);
            });

            star.addEventListener('click', (e) => {
                this.currentRating = parseInt(e.target.dataset.rating);
                this.updateRatingStars(this.currentRating);
            });
        });

        // Liste des avis existants
        this.updateAvisList(distributeur.avis || []);
    }

    updateRatingStars(rating) {
        const stars = document.querySelectorAll('#ratingStars i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    }

    updateAvisList(avis) {
        const avisList = document.getElementById('avisList');
        if (!avisList) return;

        if (avis.length === 0) {
            avisList.innerHTML = '<p class="no-avis">Aucun avis pour le moment</p>';
            return;
        }

        avisList.innerHTML = avis.map(avisItem => `
            <div class="avis-item">
                <div class="avis-header-small">
                    <div class="avis-rating">
                        ${this.generateStarRating(avisItem.note)}
                    </div>
                    <div class="avis-date">
                        ${new Date(avisItem.created_at).toLocaleDateString('fr-FR')}
                    </div>
                </div>
                ${avisItem.commentaire ? `
                    <div class="avis-comment">${this.escapeHtml(avisItem.commentaire)}</div>
                ` : ''}
            </div>
        `).join('');
    }

    async submitAvis() {
        if (!this.selectedDistributeur || this.currentRating === 0) {
            this.showNotification('Veuillez sélectionner une note', 'warning');
            return;
        }

        const comment = document.getElementById('avisComment').value;

        try {
            await this.api.createAvis({
                distributeur_id: this.selectedDistributeur.id,
                note: this.currentRating,
                commentaire: comment
            });

            this.showNotification('Votre avis a été publié avec succès', 'success');
            
            // Recharger les détails du distributeur
            const updatedDetails = await this.loadDistributeurDetails(this.selectedDistributeur.id);
            if (updatedDetails) {
                this.showDistributeurDetails(updatedDetails);
            }
            
        } catch (error) {
            console.error('Erreur publication avis:', error);
            this.showNotification('Erreur lors de la publication de l\'avis', 'error');
        }
    }

    async locateUser() {
        const btn = document.getElementById('locateBtn');
        if (!btn) return;

        btn.classList.add('loading');
        this.updateGPSStatus('Recherche GPS...');

        try {
            const position = await this.getCurrentPosition();
            this.userPosition = position;
            
            const userCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            this.mapManager.flyTo(userCoords.lat, userCoords.lng, 16);
            this.mapManager.addUserMarker(userCoords.lat, userCoords.lng);
            
            // Mettre à jour le statut GPS
            this.updateGPSStatus('GPS connecté', 'connected');
            
            // Charger les distributeurs proches
            await this.loadDistributeurs({
                lat: userCoords.lat,
                lng: userCoords.lng,
                radius: document.getElementById('radiusFilter')?.value || 10
            });
            
            this.showNotification('Position localisée avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            this.updateGPSStatus('GPS non disponible', 'error');
            
            let errorMessage = 'Impossible d\'accéder à votre position';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Permission de géolocalisation refusée';
            } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Délai de localisation dépassé';
            }
            
            this.showNotification(errorMessage, 'error');
        } finally {
            btn.classList.remove('loading');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Géolocalisation non supportée'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            });
        });
    }

    updateGPSStatus(message, status = '') {
        const gpsStatus = document.getElementById('gpsStatus');
        if (!gpsStatus) return;

        gpsStatus.innerHTML = `<i class="fas fa-satellite"></i><span>${message}</span>`;
        gpsStatus.className = `gps-status ${status}`;
    }

    async startNavigation() {
        if (!this.userPosition || !this.selectedDistributeur) {
            this.showNotification('Localisez-vous d\'abord pour démarrer la navigation', 'warning');
            return;
        }

        this.navigationActive = true;
        this.showNavigationPanel();
        
        const start = {
            lat: this.userPosition.coords.latitude,
            lng: this.userPosition.coords.longitude
        };
        
        const end = {
            lat: this.selectedDistributeur.latitude,
            lng: this.selectedDistributeur.longitude
        };

        try {
            await this.mapManager.startNavigation(start, end);
            this.updateNavigationInfo(start, end);
            this.showNotification('Navigation démarrée', 'success');
        } catch (error) {
            console.error('Erreur navigation:', error);
            this.showNotification('Erreur lors du démarrage de la navigation', 'error');
        }
    }

    updateNavigationInfo(start, end) {
        const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        const time = this.calculateTime(distance);
        
        document.getElementById('routeDistance').textContent = `${distance.toFixed(1)} km`;
        document.getElementById('routeTime').textContent = time;
        document.getElementById('routeSpeed').textContent = '40 km/h';
        document.getElementById('remainingDistance').textContent = `${distance.toFixed(1)} km`;

        // Générer les étapes de navigation
        this.generateNavigationSteps(start, end, distance);
    }

    generateNavigationSteps(start, end, distance) {
        const stepsContainer = document.getElementById('navigationSteps');
        if (!stepsContainer) return;

        const steps = [
            { 
                instruction: 'Départ de votre position actuelle', 
                distance: '0 km',
                icon: 'fa-play'
            },
            { 
                instruction: 'Continuer tout droit sur 200m', 
                distance: '0.2 km',
                icon: 'fa-arrow-up'
            },
            { 
                instruction: 'Tourner à droite au carrefour', 
                distance: '0.8 km',
                icon: 'fa-arrow-right'
            },
            { 
                instruction: 'Prendre la deuxième sortie au rond-point', 
                distance: '1.5 km',
                icon: 'fa-redo'
            },
            { 
                instruction: `Destination: ${this.selectedDistributeur.nom}`, 
                distance: `${distance.toFixed(1)} km`,
                icon: 'fa-flag-checkered'
            }
        ];

        stepsContainer.innerHTML = steps.map((step, index) => `
            <div class="step-item ${index === steps.length - 1 ? 'arrival' : ''} ${index === 0 ? 'current' : ''}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-content">
                    <p>${step.instruction}</p>
                    <span class="step-distance">${step.distance}</span>
                </div>
            </div>
        `).join('');
    }

    updateNavigationProgress() {
        if (!this.navigationActive) return;
        
        // Simulation de la progression (dans une vraie app, utiliser les données GPS réelles)
        const remainingElement = document.getElementById('remainingDistance');
        if (remainingElement) {
            const currentDistance = parseFloat(remainingElement.textContent);
            if (currentDistance > 0.1) {
                const newDistance = Math.max(0, currentDistance - 0.1);
                remainingElement.textContent = `${newDistance.toFixed(1)} km`;
                
                // Mettre à jour l'étape courante
                const steps = document.querySelectorAll('.step-item');
                steps.forEach(step => step.classList.remove('current'));
                
                if (newDistance > 0) {
                    const currentStepIndex = Math.floor((1 - newDistance / parseFloat(document.getElementById('routeDistance').textContent)) * (steps.length - 1));
                    if (steps[currentStepIndex]) {
                        steps[currentStepIndex].classList.add('current');
                    }
                }
            }
        }
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

    calculateTime(distance) {
        const vitesseMoyenne = 40;
        const minutes = Math.round((distance / vitesseMoyenne) * 60);
        return `${minutes} min`;
    }

    // Gestion des vues
    switchView(view) {
        // Mettre à jour la navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Appliquer la vue
        switch(view) {
            case 'map':
                this.mapManager.showMapView();
                break;
            case 'list':
                this.mapManager.showListView();
                break;
            case 'radar':
                this.mapManager.showRadarView();
                break;
        }
    }

    // Recherche et filtres
    handleSearch(e) {
        const query = e.target.value.trim();
        if (query.length === 0) {
            this.loadDistributeurs();
            return;
        }

        this.loadDistributeurs({ search: query });
    }

    handleFilter() {
        const type = document.getElementById('typeFilter')?.value || 'all';
        const ville = document.getElementById('villeFilter')?.value || 'all';
        const radius = document.getElementById('radiusFilter')?.value || '10';
        const sort = document.getElementById('sortFilter')?.value || 'distance';
        
        const filters = {};
        if (type !== 'all') filters.type = type;
        if (ville !== 'all') filters.ville = ville;
        filters.radius = radius;
        
        // Si l'utilisateur est localisé, utiliser sa position
        if (this.userPosition) {
            filters.lat = this.userPosition.coords.latitude;
            filters.lng = this.userPosition.coords.longitude;
        }
        
        this.loadDistributeurs(filters);
    }

    // Gestion du thème
    setupTheme() {
        const savedTheme = localStorage.getItem('ctl-loket-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ctl-loket-theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        this.showNotification(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Vérification des permissions de géolocalisation
    async checkGeolocationPermission() {
        if (!navigator.permissions) return;

        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            this.updatePermissionState(result.state);
            
            result.onchange = () => {
                this.updatePermissionState(result.state);
            };
        } catch (error) {
            console.log('API Permissions non supportée');
        }
    }

    updatePermissionState(state) {
        if (state === 'granted') {
            this.updateGPSStatus('GPS prêt', 'connected');
        } else if (state === 'denied') {
            this.updateGPSStatus('GPS bloqué', 'error');
        }
    }

    // Menu mobile
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        
        if (sidebar) {
            sidebar.classList.toggle('active');
            toggleBtn.innerHTML = sidebar.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        }
    }

    hideMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        
        if (sidebar) {
            sidebar.classList.remove('active');
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }

    // Admin
    showAdminLogin() {
        this.showModal('adminLoginModal');
    }

    hideAdminLogin() {
        this.hideModal('adminLoginModal');
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            const result = await this.authManager.login(username, password);
            if (result.success) {
                this.showNotification('Connexion administrateur réussie', 'success');
                setTimeout(() => {
                    window.location.href = '/admin.html';
                }, 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erreur connexion admin:', error);
            this.showNotification('Identifiants incorrects', 'error');
        }
    }

    // Partage
    shareDistributeur() {
        if (!this.selectedDistributeur) return;

        const shareData = {
            title: this.selectedDistributeur.nom,
            text: `Découvrez ${this.selectedDistributeur.nom} sur CTL-LOKET`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            // Fallback: copier dans le presse-papier
            navigator.clipboard.writeText(shareData.url).then(() => {
                this.showNotification('Lien copié dans le presse-papier', 'success');
            }).catch(() => {
                this.showNotification('Impossible de partager', 'error');
            });
        }
    }

    // Recentrage carte
    recenterMap() {
        if (this.userPosition) {
            this.mapManager.flyTo(
                this.userPosition.coords.latitude,
                this.userPosition.coords.longitude,
                16
            );
        } else {
            this.mapManager.flyTo(4.0511, 9.7679, 12); // Douala par défaut
        }
        this.showNotification('Carte recentrée', 'info');
    }

    // Utilitaires d'interface
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId = null) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        } else {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        document.body.style.overflow = '';
    }

    showNavigationPanel() {
        const panel = document.getElementById('navigationPanel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    hideNavigation() {
        const panel = document.getElementById('navigationPanel');
        if (panel) {
            panel.classList.remove('active');
        }
        this.mapManager.stopNavigation();
        this.navigationActive = false;
        this.showNotification('Navigation arrêtée', 'info');
    }

    showLoading(message = 'Chargement...') {
        const overlay = document.getElementById('loadingOverlay');
        const content = overlay?.querySelector('.loading-content p');
        
        if (overlay) {
            if (content) content.textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <div class="notification-content">
                <div class="notification-title">${this.getNotificationTitle(type)}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('show'), 100);

        // Fermeture manuelle
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification(notification);
        });

        // Fermeture automatique
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }

        return notification;
    }

    hideNotification(notification) {
        if (!notification.parentNode) return;
        
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Succès',
            error: 'Erreur',
            warning: 'Attention',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }

    updateResultsCount(count) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${count} résultat${count !== 1 ? 's' : ''}`;
        }
    }

    getTypeLabel(type) {
        const types = {
            'nourriture': '🍽️ Nourriture',
            'boissons': '🥤 Boissons',
            'billets': '🎫 Billets',
            'divers': '🛍️ Divers'
        };
        return types[type] || type;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    cycleMapStyle() {
        this.mapManager.cycleStyle();
        this.showNotification('Style de carte changé', 'info');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Erreur fullscreen: ${err.message}`);
                this.showNotification('Plein écran non supporté', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que Mapbox est chargé
    if (typeof mapboxgl === 'undefined') {
        console.error('Mapbox GL JS non chargé');
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; gap: 1rem; background: #0f0f0f; color: white;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4444;"></i>
                <h2>Erreur de chargement</h2>
                <p>Mapbox GL JS n'a pas pu être chargé. Vérifiez votre connexion internet.</p>
                <button onclick="window.location.reload()" style="background: #00d4ff; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
        return;
    }

    // Démarrer l'application
    window.ctlLoketApp = new CTLLoketApp();
});

// Exposer certaines méthodes globalement pour les événements
window.submitAvis = function() {
    if (window.ctlLoketApp) {
        window.ctlLoketApp.submitAvis();
    }
};
