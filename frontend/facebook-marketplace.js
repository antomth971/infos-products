// Configuration de l'API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

class FacebookMarketplace {
    constructor() {
        this.isAuthenticated = false;
        this.facebookConnected = false;
        this.listings = []; // Annonces Facebook réelles
        this.products = [];
        this.filteredProducts = [];
        this.selectedProductId = null;
        this.currentEditId = null;
        this.currentEditListing = null;

        // Éléments du DOM
        this.facebookStatus = document.getElementById('facebookStatus');
        this.publicationsList = document.getElementById('publicationsList');
        this.productGrid = document.getElementById('productGrid');
        this.productSearch = document.getElementById('productSearch');

        // Modals
        this.editModal = document.getElementById('editModal');
        this.createModal = document.getElementById('createModal');

        // Boutons des modals
        this.closeEditModal = document.getElementById('closeEditModal');
        this.closeCreateModal = document.getElementById('closeCreateModal');
        this.cancelEdit = document.getElementById('cancelEdit');
        this.cancelCreate = document.getElementById('cancelCreate');

        // Formulaires
        this.editForm = document.getElementById('editForm');
        this.createForm = document.getElementById('createForm');

        // Onglets
        this.tabs = document.querySelectorAll('.fb-tab');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.init();
    }

    async init() {
        // Vérifier l'authentification
        await this.checkAuthentication();

        // Event listeners pour les onglets
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Event listeners pour les modals
        this.closeEditModal.addEventListener('click', () => this.hideEditModal());
        this.closeCreateModal.addEventListener('click', () => this.hideCreateModal());
        this.cancelEdit.addEventListener('click', () => this.hideEditModal());
        this.cancelCreate.addEventListener('click', () => this.hideCreateModal());

        // Event listeners pour les formulaires
        this.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.createForm.addEventListener('submit', (e) => this.handleCreateSubmit(e));

        // Event listener pour la recherche de produits
        this.productSearch.addEventListener('input', () => this.filterProducts());

        // Fermer les modals en cliquant à l'extérieur
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) this.hideEditModal();
        });
        this.createModal.addEventListener('click', (e) => {
            if (e.target === this.createModal) this.hideCreateModal();
        });

        // Vérifier les paramètres URL (retour OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('connected') === 'true') {
            alert('✅ Connecté à Facebook avec succès !');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('error')) {
            const error = urlParams.get('error');
            let message = 'Erreur lors de la connexion à Facebook';
            if (error === 'no_code') message = 'Code d\'autorisation manquant';
            else if (error === 'no_page') message = 'Aucune page Facebook trouvée';
            else if (error === 'auth_failed') message = 'Échec de l\'authentification Facebook';
            alert('❌ ' + message);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Charger les données
        await this.checkFacebookStatus();
        await this.loadProducts();
    }

    async checkAuthentication() {
        try {
            const response = await fetch(`${API_URL}/api/auth/check`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (!result.authenticated) {
                window.location.href = '/login.html';
                return;
            }

            this.isAuthenticated = true;
            document.body.classList.add('authenticated');
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
            window.location.href = '/login.html';
        }
    }

    async checkFacebookStatus() {
        try {
            const response = await fetch(`${API_URL}/api/facebook/status`, {
                credentials: 'include'
            });
            const result = await response.json();

            this.facebookConnected = result.connected;
            this.renderFacebookStatus(result);

            if (this.facebookConnected) {
                await this.loadListings();
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    }

    renderFacebookStatus(status) {
        if (status.connected) {
            this.facebookStatus.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>✅ Connecté à Facebook</strong>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Page ID: ${status.pageId || 'N/A'}</p>
                    </div>
                    <button class="fb-btn fb-btn-secondary" onclick="app.disconnectFacebook()">
                        Déconnecter
                    </button>
                </div>
            `;
        } else {
            this.facebookStatus.innerHTML = `
                <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>⚠️ Non connecté à Facebook</strong>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Connectez-vous pour gérer vos annonces Marketplace</p>
                    </div>
                    <button class="fb-btn fb-btn-primary" onclick="app.connectFacebook()">
                        Se connecter
                    </button>
                </div>
            `;
        }
    }

    async connectFacebook() {
        try {
            const response = await fetch(`${API_URL}/api/facebook/login`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success && result.authUrl) {
                // Ouvrir la fenêtre d'authentification Facebook
                window.location.href = result.authUrl;
            } else {
                alert('❌ Erreur lors de l\'initialisation de la connexion');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la connexion à Facebook');
        }
    }

    async disconnectFacebook() {
        if (!confirm('Êtes-vous sûr de vouloir vous déconnecter de Facebook ?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/facebook/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                alert('✅ Déconnecté de Facebook');
                this.facebookConnected = false;
                this.listings = [];
                await this.checkFacebookStatus();
                this.renderListings();
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la déconnexion');
        }
    }

    switchTab(tabName) {
        // Mettre à jour les onglets
        this.tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Mettre à jour le contenu
        this.tabContents.forEach(content => {
            if (content.id === `tab-${tabName}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    async loadListings() {
        try {
            const response = await fetch(`${API_URL}/api/facebook/listings`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des annonces');
            }

            const result = await response.json();
            this.listings = result.data || [];
            this.renderListings();
        } catch (error) {
            console.error('Erreur:', error);
            this.publicationsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erreur lors du chargement des annonces</p>
                    <p style="font-size: 0.9rem; color: #999;">${error.message}</p>
                </div>
            `;
        }
    }

    async loadProducts() {
        try {
            const response = await fetch(`${API_URL}/api/items`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des produits');
            }

            const result = await response.json();
            this.products = result.data || [];
            this.filteredProducts = [...this.products];
            this.renderProducts();
        } catch (error) {
            console.error('Erreur:', error);
            this.productGrid.innerHTML = `
                <div class="empty-state">
                    <p>Erreur lors du chargement des produits</p>
                </div>
            `;
        }
    }

    renderListings() {
        if (!this.facebookConnected) {
            this.publicationsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔌</div>
                    <p>Connectez-vous à Facebook pour voir vos annonces</p>
                </div>
            `;
            return;
        }

        if (this.listings.length === 0) {
            this.publicationsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p>Aucune annonce pour le moment</p>
                    <p style="font-size: 0.9rem; color: #999;">Ajoutez un produit pour commencer</p>
                </div>
            `;
            return;
        }

        this.publicationsList.innerHTML = this.listings.map(listing => `
            <div class="fb-card">
                <div class="fb-card-header">
                    <div>
                        <h3 class="fb-card-title">${this.escapeHtml(listing.name || 'Sans titre')}</h3>
                        <div class="fb-card-meta">
                            <span class="status-badge status-published">Publié</span>
                            <span style="margin-left: 1rem; color: #1877f2; font-weight: 600;">
                                ${this.escapeHtml(listing.price || 'Prix non disponible')}
                            </span>
                        </div>
                    </div>
                    <div class="fb-card-actions">
                        <button class="fb-btn fb-btn-secondary" onclick="app.editListing('${listing.id}')">
                            ✏️ Modifier
                        </button>
                        <button class="fb-btn fb-btn-danger" onclick="app.deleteListing('${listing.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
                <p style="color: #666; margin-bottom: 1rem;">
                    ${this.escapeHtml(listing.description || 'Pas de description').substring(0, 150)}${(listing.description || '').length > 150 ? '...' : ''}
                </p>
                <div style="display: flex; gap: 0.5rem; font-size: 0.85rem; color: #999;">
                    ${listing.url ? `<a href="${listing.url}" target="_blank" style="color: #1877f2;">Voir sur Facebook</a>` : ''}
                    ${listing.created_time ? `<span>•</span><span>🕒 ${this.formatDate(listing.created_time)}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderProducts() {
        if (this.filteredProducts.length === 0) {
            this.productGrid.innerHTML = `
                <div class="empty-state">
                    <p>Aucun produit trouvé</p>
                </div>
            `;
            return;
        }

        this.productGrid.innerHTML = this.filteredProducts.map(product => {
            const imageUrl = product.images && product.images.length > 0
                ? product.images[0]
                : 'https://via.placeholder.com/250x150?text=Pas+d\'image';

            return `
                <div class="product-item ${this.selectedProductId === product.id ? 'selected' : ''}"
                     onclick="app.selectProduct('${product.id}')">
                    <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(product.name)}"
                         onerror="this.src='https://via.placeholder.com/250x150?text=Erreur'">
                    <div class="product-item-name" title="${this.escapeHtml(product.name)}">
                        ${this.escapeHtml(product.name)}
                    </div>
                    <div class="product-item-price">
                        ${this.escapeHtml(product.price || 'Prix non disponible')}
                    </div>
                </div>
            `;
        }).join('');
    }

    filterProducts() {
        const searchTerm = this.productSearch.value.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                (product.name && product.name.toLowerCase().includes(searchTerm)) ||
                (product.price && product.price.toLowerCase().includes(searchTerm))
            );
        }

        this.renderProducts();
    }

    selectProduct(productId) {
        if (!this.facebookConnected) {
            alert('⚠️ Veuillez d\'abord vous connecter à Facebook');
            return;
        }

        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.selectedProductId = productId;
        this.renderProducts();

        // Pré-remplir le formulaire de création
        document.getElementById('createTitle').value = product.name || '';
        document.getElementById('createPrice').value = product.price || '';
        document.getElementById('createDescription').value =
            product.description ? product.description.join('\n') : '';

        // Afficher la modal de création
        this.showCreateModal(productId);
    }

    showEditModal(listing) {
        this.currentEditListing = listing;
        this.currentEditId = listing.id;
        document.getElementById('editTitle').value = listing.name || '';
        document.getElementById('editPrice').value = listing.price || '';
        document.getElementById('editDescription').value = listing.description || '';
        this.editModal.classList.remove('hidden');
    }

    hideEditModal() {
        this.editModal.classList.add('hidden');
        this.currentEditId = null;
        this.currentEditListing = null;
    }

    showCreateModal(productId) {
        this.selectedProductId = productId;
        this.createModal.classList.remove('hidden');
    }

    hideCreateModal() {
        this.createModal.classList.add('hidden');
        this.selectedProductId = null;
        this.createForm.reset();
    }

    async editListing(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) return;
        this.showEditModal(listing);
    }

    async handleEditSubmit(e) {
        e.preventDefault();

        const data = {
            title: document.getElementById('editTitle').value,
            price: document.getElementById('editPrice').value,
            description: document.getElementById('editDescription').value
        };

        try {
            const response = await fetch(`${API_URL}/api/facebook/listings/${this.currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Annonce modifiée avec succès !');
                this.hideEditModal();
                await this.loadListings();
            } else {
                alert('❌ ' + (result.error || 'Erreur lors de la modification'));
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la modification');
        }
    }

    async handleCreateSubmit(e) {
        e.preventDefault();

        const data = {
            productId: this.selectedProductId,
            title: document.getElementById('createTitle').value,
            price: document.getElementById('createPrice').value,
            description: document.getElementById('createDescription').value,
            category: document.getElementById('createCategory').value
        };

        try {
            const response = await fetch(`${API_URL}/api/facebook/listings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Annonce créée avec succès sur Facebook Marketplace !');
                this.hideCreateModal();
                await this.loadListings();
                this.switchTab('publications');
            } else {
                alert('❌ ' + (result.error || 'Erreur lors de la création'));
                if (result.details) {
                    console.error('Détails:', result.details);
                }
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la création');
        }
    }

    async deleteListing(listingId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce de Facebook Marketplace ?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/facebook/listings/${listingId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Annonce supprimée avec succès !');
                await this.loadListings();
            } else {
                alert('❌ ' + (result.error || 'Erreur lors de la suppression'));
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la suppression');
        }
    }

    getCategoryLabel(category) {
        const labels = {
            'electronics': 'Électronique',
            'home': 'Maison & Jardin',
            'sports': 'Sports & Loisirs',
            'tools': 'Outils',
            'other': 'Autre'
        };
        return labels[category] || 'Autre';
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FacebookMarketplace();
});
