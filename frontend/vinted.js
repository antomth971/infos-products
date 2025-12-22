// Configuration de l'API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

// Gestionnaire de l'interface Vinted
class VintedApp {
    constructor() {
        this.allItems = [];
        this.filteredItems = [];
        this.selectedIds = new Set();
        this.isAuthenticated = false;

        // Éléments du DOM
        this.searchInput = document.getElementById('searchInput');
        this.loader = document.getElementById('loader');
        this.errorMessage = document.getElementById('errorMessage');
        this.tableContainer = document.getElementById('tableContainer');
        this.productsTableBody = document.getElementById('productsTableBody');
        this.itemCount = document.getElementById('itemCount');
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.addProductsBtn = document.getElementById('addProductsBtn');
        this.productModal = document.getElementById('productModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.productDetails = document.getElementById('productDetails');

        // Éléments pour l'ajout de produits - Modal de choix
        this.addChoiceModal = document.getElementById('addChoiceModal');
        this.closeChoiceModalBtn = document.getElementById('closeChoiceModalBtn');
        this.chooseLocalBtn = document.getElementById('chooseLocalBtn');
        this.chooseNewBtn = document.getElementById('chooseNewBtn');

        // Éléments pour l'ajout de produits - Modal principale
        this.addProductModal = document.getElementById('addProductModal');
        this.closeAddModalBtn = document.getElementById('closeAddModalBtn');
        this.addProductModalTitle = document.getElementById('addProductModalTitle');

        // Mode: Produits locaux
        this.localProductsMode = document.getElementById('localProductsMode');
        this.localProductSearch = document.getElementById('localProductSearch');
        this.addProductLoader = document.getElementById('addProductLoader');
        this.localProductsList = document.getElementById('localProductsList');

        // Mode: Nouveau produit
        this.newProductMode = document.getElementById('newProductMode');
        this.newProductForm = document.getElementById('newProductForm');
        this.newProductTitle = document.getElementById('newProductTitle');
        this.newProductDescription = document.getElementById('newProductDescription');
        this.newProductPrice = document.getElementById('newProductPrice');
        this.newProductCurrency = document.getElementById('newProductCurrency');
        this.backToLocalBtn = document.getElementById('backToLocalBtn');

        // Données locales
        this.localProducts = [];
        this.filteredLocalProducts = [];
        this.fromLocalProduct = false; // Flag pour savoir si on vient d'un produit local

        this.init();
    }

    async init() {
        // Vérifier l'authentification
        await this.checkAuthentication();

        // Événements
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        this.deleteSelectedBtn.addEventListener('click', () => this.handleDeleteSelected());
        this.addProductsBtn.addEventListener('click', () => this.handleAddProducts());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.closeChoiceModalBtn.addEventListener('click', () => this.closeChoiceModal());
        this.closeAddModalBtn.addEventListener('click', () => this.closeAddModal());
        this.chooseLocalBtn.addEventListener('click', () => this.chooseLocalMode());
        this.chooseNewBtn.addEventListener('click', () => this.chooseNewMode());
        this.localProductSearch.addEventListener('input', () => this.handleLocalProductSearch());
        this.newProductForm.addEventListener('submit', (e) => this.handleNewProductSubmit(e));
        this.backToLocalBtn.addEventListener('click', () => this.backToLocalProducts());

        // Fermer les modals si on clique sur le fond
        this.productModal.addEventListener('click', (e) => {
            if (e.target === this.productModal) {
                this.closeModal();
            }
        });

        this.addChoiceModal.addEventListener('click', (e) => {
            if (e.target === this.addChoiceModal) {
                this.closeChoiceModal();
            }
        });

        this.addProductModal.addEventListener('click', (e) => {
            if (e.target === this.addProductModal) {
                this.closeAddModal();
            }
        });

        // Charger les produits Vinted
        await this.loadItems();
    }

    // Vérifier l'authentification
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

    // Charger les produits depuis l'API Vinted
    async loadItems() {
        this.showLoader();
        this.hideError();

        try {
            const response = await fetch(`${API_URL}/api/vinted/items`, {
                credentials: 'include'
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors du chargement des produits');
            }

            // L'API Vinted retourne les items dans result.data
            // La structure peut varier, adapter selon la réponse réelle
            this.allItems = result.data.items || result.data || [];
            this.filteredItems = [...this.allItems];
            this.renderTable();
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            this.showError(error.message);
        } finally {
            this.hideLoader();
        }
    }

    // Recherche
    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredItems = [...this.allItems];
        } else {
            this.filteredItems = this.allItems.filter(item => {
                const title = (item.title || item.name || '').toLowerCase();
                const id = (item.id || '').toString().toLowerCase();
                const price = (item.price || '').toString().toLowerCase();

                return title.includes(searchTerm) ||
                       id.includes(searchTerm) ||
                       price.includes(searchTerm);
            });
        }

        this.renderTable();
    }

    // Sélectionner tout
    handleSelectAll() {
        if (this.selectAllCheckbox.checked) {
            // Sélectionner tous les produits filtrés
            this.filteredItems.forEach(item => {
                this.selectedIds.add(item.id);
            });
        } else {
            // Désélectionner tous
            this.selectedIds.clear();
        }

        this.updateCheckboxes();
        this.updateDeleteButton();
    }

    // Basculer la sélection d'un produit
    toggleSelection(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }

        this.updateCheckboxes();
        this.updateDeleteButton();
    }

    // Mettre à jour les checkboxes
    updateCheckboxes() {
        // Mettre à jour le checkbox "tout sélectionner"
        const allSelected = this.filteredItems.length > 0 &&
                           this.filteredItems.every(item => this.selectedIds.has(item.id));
        this.selectAllCheckbox.checked = allSelected;

        // Mettre à jour les checkboxes individuelles
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            const id = checkbox.dataset.id;
            checkbox.checked = this.selectedIds.has(id);
        });
    }

    // Mettre à jour le bouton de suppression
    updateDeleteButton() {
        this.deleteSelectedBtn.disabled = this.selectedIds.size === 0;
        if (this.selectedIds.size > 0) {
            this.deleteSelectedBtn.textContent = `🗑️ Supprimer (${this.selectedIds.size})`;
        } else {
            this.deleteSelectedBtn.textContent = '🗑️ Supprimer la sélection';
        }
    }

    // Supprimer les produits sélectionnés
    async handleDeleteSelected() {
        if (this.selectedIds.size === 0) return;

        const count = this.selectedIds.size;
        const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer ${count} produit(s) ?`);
        if (!confirmation) return;

        const deleteCode = prompt('Entrez le code de suppression :');
        if (!deleteCode) return;

        this.showLoader();
        this.hideError();

        try {
            const ids = Array.from(this.selectedIds);
            const response = await fetch(`${API_URL}/api/vinted/items/batch`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ ids, deleteCode })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }

            alert(result.message || 'Produits supprimés avec succès');
            this.selectedIds.clear();
            await this.loadItems(); // Recharger la liste
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showError(error.message);
        } finally {
            this.hideLoader();
        }
    }

    // Supprimer un produit individuel
    async handleDeleteItem(id, event) {
        event.stopPropagation(); // Empêcher l'ouverture du détail

        const confirmation = confirm('Êtes-vous sûr de vouloir supprimer ce produit ?');
        if (!confirmation) return;

        const deleteCode = prompt('Entrez le code de suppression :');
        if (!deleteCode) return;

        this.showLoader();
        this.hideError();

        try {
            const response = await fetch(`${API_URL}/api/vinted/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ deleteCode })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }

            alert('Produit supprimé avec succès');
            this.selectedIds.delete(id);
            await this.loadItems(); // Recharger la liste
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showError(error.message);
        } finally {
            this.hideLoader();
        }
    }

    // Ouvrir le détail d'un produit
    async openProductDetail(id) {
        this.showLoader();

        try {
            const response = await fetch(`${API_URL}/api/vinted/items/${id}/status`, {
                credentials: 'include'
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors du chargement du détail');
            }

            this.renderProductDetails(result.data);
            this.productModal.classList.remove('hidden');
        } catch (error) {
            console.error('Erreur lors du chargement du détail:', error);
            this.showError(error.message);
        } finally {
            this.hideLoader();
        }
    }

    // Afficher les détails du produit dans la modal
    renderProductDetails(item) {
        const html = `
            <div class="detail-section">
                <div class="detail-label">ID</div>
                <div class="detail-value">${this.escapeHtml(item.id || 'N/A')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Titre</div>
                <div class="detail-value">${this.escapeHtml(item.title || item.name || 'N/A')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Prix</div>
                <div class="detail-value">${this.escapeHtml(item.price || 'N/A')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Description</div>
                <div class="detail-value">${this.escapeHtml(item.description || 'N/A')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Statut</div>
                <div class="detail-value">${this.escapeHtml(item.status || 'N/A')}</div>
            </div>

            ${item.photos && item.photos.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-label">Photos</div>
                    <div class="product-images">
                        ${item.photos.map(photo => `
                            <img src="${this.escapeHtml(photo.url || photo)}"
                                 alt="Photo produit"
                                 class="product-image">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        this.productDetails.innerHTML = html;
    }

    // Fermer la modal
    closeModal() {
        this.productModal.classList.add('hidden');
    }

    // Gérer l'ajout de produits - Ouvrir la modal de choix
    async handleAddProducts() {
        this.addChoiceModal.classList.remove('hidden');
    }

    // Fermer la modal de choix
    closeChoiceModal() {
        this.addChoiceModal.classList.add('hidden');
    }

    // Choisir le mode "Produits locaux"
    async chooseLocalMode() {
        this.closeChoiceModal();
        this.fromLocalProduct = false;
        this.backToLocalBtn.classList.add('hidden');
        this.addProductModalTitle.textContent = 'Ajouter depuis mes produits';
        this.localProductsMode.classList.remove('hidden');
        this.newProductMode.classList.add('hidden');
        this.addProductModal.classList.remove('hidden');
        await this.loadLocalProducts();
    }

    // Choisir le mode "Nouveau produit"
    chooseNewMode() {
        this.closeChoiceModal();
        this.fromLocalProduct = false;
        this.backToLocalBtn.classList.add('hidden');
        this.addProductModalTitle.textContent = 'Créer un nouveau produit';
        this.localProductsMode.classList.add('hidden');
        this.newProductMode.classList.remove('hidden');
        this.addProductModal.classList.remove('hidden');
        // Réinitialiser le formulaire
        this.newProductForm.reset();
    }

    // Retourner à la liste des produits locaux
    backToLocalProducts() {
        this.fromLocalProduct = false;
        this.backToLocalBtn.classList.add('hidden');
        this.addProductModalTitle.textContent = 'Ajouter depuis mes produits';
        this.newProductMode.classList.add('hidden');
        this.localProductsMode.classList.remove('hidden');
        this.newProductForm.reset();
    }

    // Charger les produits de la base de données locale
    async loadLocalProducts() {
        this.addProductLoader.classList.remove('hidden');
        this.localProductsList.innerHTML = '';

        try {
            const response = await fetch(`${API_URL}/api/items`, {
                credentials: 'include'
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors du chargement des produits');
            }

            this.localProducts = result.data || [];
            this.filteredLocalProducts = [...this.localProducts];
            this.renderLocalProducts();
        } catch (error) {
            console.error('Erreur lors du chargement des produits locaux:', error);
            this.localProductsList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #c33;">
                    Erreur lors du chargement des produits
                </div>
            `;
        } finally {
            this.addProductLoader.classList.add('hidden');
        }
    }

    // Rechercher dans les produits locaux
    handleLocalProductSearch() {
        const searchTerm = this.localProductSearch.value.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredLocalProducts = [...this.localProducts];
        } else {
            this.filteredLocalProducts = this.localProducts.filter(item => {
                const name = (item.name || '').toLowerCase();
                const supplier = (item.supplier || '').toLowerCase();
                const price = (item.price || '').toLowerCase();

                return name.includes(searchTerm) ||
                       supplier.includes(searchTerm) ||
                       price.includes(searchTerm);
            });
        }

        this.renderLocalProducts();
    }

    // Afficher les produits locaux
    renderLocalProducts() {
        if (this.filteredLocalProducts.length === 0) {
            this.localProductsList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #999;">
                    Aucun produit trouvé
                </div>
            `;
            return;
        }

        const html = this.filteredLocalProducts.map(item => `
            <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; cursor: pointer; transition: all 0.2s;"
                 onmouseover="this.style.borderColor='#00a881'; this.style.background='#f8fff8'"
                 onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white'"
                 onclick="vintedApp.selectLocalProduct('${item.id}')">

                ${item.images && item.images.length > 0 ? `
                    <img src="${this.escapeHtml(item.images[0])}"
                         alt="Produit"
                         style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e0e0e0;">
                ` : `
                    <div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #999;">
                        📦
                    </div>
                `}

                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 0.3rem;">
                        ${this.escapeHtml(item.name || 'Sans titre')}
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">
                        ${item.supplier ? this.escapeHtml(item.supplier) + ' • ' : ''}
                        ${item.price ? this.escapeHtml(item.price) : 'Prix non défini'}
                    </div>
                </div>

                <button class="add-btn" style="padding: 0.6rem 1.2rem; margin: 0;">
                    Ajouter
                </button>
            </div>
        `).join('');

        this.localProductsList.innerHTML = html;
    }

    // Sélectionner un produit local et pré-remplir le formulaire
    selectLocalProduct(productId) {
        const product = this.localProducts.find(p => p.id === productId);
        if (!product) return;

        // Pré-remplir le formulaire avec les données du produit
        this.newProductTitle.value = product.name || '';
        this.newProductDescription.value = product.description ? product.description.join('\n') : '';

        // Extraire le prix (enlever les caractères non numériques)
        const priceValue = parseFloat(product.price?.replace(/[^0-9.]/g, '') || '0');
        this.newProductPrice.value = priceValue > 0 ? priceValue : '';

        // Détecter la devise depuis le prix
        if (product.price?.includes('$')) {
            this.newProductCurrency.value = 'USD';
        } else if (product.price?.includes('£')) {
            this.newProductCurrency.value = 'GBP';
        } else {
            this.newProductCurrency.value = 'EUR';
        }

        // Marquer qu'on vient d'un produit local
        this.fromLocalProduct = true;
        this.backToLocalBtn.classList.remove('hidden');

        // Basculer vers le mode formulaire
        this.localProductsMode.classList.add('hidden');
        this.newProductMode.classList.remove('hidden');
        this.addProductModalTitle.textContent = `Modifier et ajouter: ${product.name}`;

        // Scroll vers le haut du formulaire
        this.addProductModal.querySelector('.modal-content').scrollTop = 0;
    }

    // Gérer la soumission du formulaire de nouveau produit
    async handleNewProductSubmit(e) {
        e.preventDefault();

        const title = this.newProductTitle.value.trim();
        const description = this.newProductDescription.value.trim();
        const price = parseFloat(this.newProductPrice.value);
        const currency = this.newProductCurrency.value;

        if (!title || !price) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const confirmation = confirm(`Voulez-vous ajouter "${title}" sur Vinted ?`);
        if (!confirmation) return;

        this.addProductLoader.classList.remove('hidden');

        try {
            const vintedProductData = {
                title: title,
                description: description,
                price: price,
                currency: currency
                // Ajouter d'autres champs requis par Vinted si nécessaire
            };

            const response = await fetch(`${API_URL}/api/vinted/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(vintedProductData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de l\'ajout du produit');
            }

            alert('✅ Produit ajouté avec succès sur Vinted !');
            this.closeAddModal();
            await this.loadItems(); // Recharger la liste des produits Vinted
        } catch (error) {
            console.error('Erreur lors de l\'ajout du produit:', error);
            alert('❌ ' + error.message);
        } finally {
            this.addProductLoader.classList.add('hidden');
        }
    }

    // Fermer la modal d'ajout
    closeAddModal() {
        this.addProductModal.classList.add('hidden');
        this.localProductsMode.classList.add('hidden');
        this.newProductMode.classList.add('hidden');
        this.backToLocalBtn.classList.add('hidden');
        this.localProductSearch.value = '';
        this.localProducts = [];
        this.filteredLocalProducts = [];
        this.localProductsList.innerHTML = '';
        this.newProductForm.reset();
        this.fromLocalProduct = false;
    }

    // Afficher le tableau
    renderTable() {
        if (this.filteredItems.length === 0) {
            this.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        ${this.searchInput.value ? 'Aucun produit trouvé' : 'Aucun produit pour le moment'}
                    </td>
                </tr>
            `;
            this.itemCount.textContent = '(0)';
            this.tableContainer.style.display = 'block';
            return;
        }

        this.itemCount.textContent = `(${this.filteredItems.length})`;

        const html = this.filteredItems.map(item => `
            <tr onclick="vintedApp.openProductDetail('${item.id}')">
                <td class="checkbox-col" onclick="event.stopPropagation()">
                    <input
                        type="checkbox"
                        class="checkbox-input item-checkbox"
                        data-id="${item.id}"
                        onchange="vintedApp.toggleSelection('${item.id}')"
                        ${this.selectedIds.has(item.id) ? 'checked' : ''}
                    >
                </td>
                <td>${this.escapeHtml(item.id || 'N/A')}</td>
                <td>${this.escapeHtml(item.title || item.name || 'Sans titre')}</td>
                <td>${this.escapeHtml(item.price ? item.price + ' ' + (item.currency || '€') : 'N/A')}</td>
                <td>${this.escapeHtml(item.status || 'N/A')}</td>
                <td class="actions-col">
                    <button
                        class="delete-btn"
                        onclick="event.stopPropagation(); vintedApp.handleDeleteItem('${item.id}', event)"
                    >
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');

        this.productsTableBody.innerHTML = html;
        this.tableContainer.style.display = 'block';
        this.updateDeleteButton();
    }

    // Échapper le HTML pour éviter les XSS
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text.toString();
        return div.innerHTML;
    }

    // Afficher le loader
    showLoader() {
        this.loader.classList.remove('hidden');
        this.tableContainer.style.display = 'none';
    }

    // Cacher le loader
    hideLoader() {
        this.loader.classList.add('hidden');
    }

    // Afficher un message d'erreur
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    // Cacher le message d'erreur
    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// Initialiser l'application
const vintedApp = new VintedApp();
