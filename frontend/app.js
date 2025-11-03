// Configuration de l'API
// Détection automatique de l'environnement
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

// Gestionnaire de l'interface
class App {
    constructor() {
        this.currentItemId = null;
        this.allItems = [];
        this.filteredItems = [];
        this.isAuthenticated = false;
        this.currentSupplier = '';

        // Éléments du DOM
        this.form = document.getElementById('scrapeForm');
        this.urlInput = document.getElementById('urlInput');
        this.searchInput = document.getElementById('searchInput');
        this.supplierFilter = document.getElementById('supplierFilter');
        this.exportExcelBtn = document.getElementById('exportExcelBtn');
        this.viewIgnoredBtn = document.getElementById('viewIgnoredBtn');
        this.loader = document.getElementById('loader');
        this.errorMessage = document.getElementById('errorMessage');
        this.itemsList = document.getElementById('itemsList');
        this.itemDetails = document.getElementById('itemDetails');
        this.itemCount = document.getElementById('itemCount');
        this.scanForUrlButton = document.getElementById('scanForUrl');
        this.qrScannerModal = document.getElementById('qrScannerModal');
        this.closeScannerBtn = document.getElementById('closeScannerBtn');
        this.qrScannerStatus = document.getElementById('qrScannerStatus');

        // Éléments pour la date personnalisée
        this.useCustomDateCheckbox = document.getElementById('useCustomDate');
        this.customDateInput = document.getElementById('customDateInput');
        this.selectedDateDisplay = document.getElementById('selectedDateDisplay');

        // Modal de choix du mode
        this.modeChoiceModal = document.getElementById('modeChoiceModal');
        this.closeModeChoiceBtn = document.getElementById('closeModeChoiceBtn');
        this.modeUrlCount = document.getElementById('modeUrlCount');
        this.modeVisibleBtn = document.getElementById('modeVisibleBtn');
        this.modeBackgroundBtn = document.getElementById('modeBackgroundBtn');

        // Instance du scanner QR
        this.html5QrCode = null;
        this.isProcessingQR = false; // Flag pour éviter les scans multiples
        this.lastQRCode = null; // Dernier QR code scanné
        this.lastQRTime = 0; // Timestamp du dernier scan

        // Keep-alive pour les traitements longs
        this.keepAliveInterval = null;
        this.autoRefreshInterval = null;

        // URLs en attente de traitement (pour la modal de choix)
        this.pendingUrls = null;

        this.init();
    }

    async init() {
        // Vérifier l'authentification avant tout
        await this.checkAuthentication();

        // Événements
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.supplierFilter.addEventListener('change', (e) => this.handleSupplierFilter(e));
        this.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        this.viewIgnoredBtn.addEventListener('click', () => this.viewIgnoredProducts());
        this.scanForUrlButton.addEventListener('click', () => this.scanForUrls());
        this.closeScannerBtn.addEventListener('click', () => this.closeScanner());

        // Event listeners pour la modal de choix du mode
        this.closeModeChoiceBtn.addEventListener('click', () => this.closeModeChoice());
        this.modeVisibleBtn.addEventListener('click', () => this.handleModeChoice('visible'));
        this.modeBackgroundBtn.addEventListener('click', () => this.handleModeChoice('background'));

        // Fermer la modal si on clique sur le fond
        this.modeChoiceModal.addEventListener('click', (e) => {
            if (e.target === this.modeChoiceModal) {
                this.closeModeChoice();
            }
        });

        // Event listeners pour la date personnalisée
        this.useCustomDateCheckbox.addEventListener('change', () => this.toggleCustomDate());
        this.customDateInput.addEventListener('change', () => this.updateDateDisplay());

        // Charger les éléments existants
        await this.loadItems();
    }

    // Gérer l'affichage du sélecteur de date
    toggleCustomDate() {
        if (this.useCustomDateCheckbox.checked) {
            this.customDateInput.style.display = 'block';
            this.selectedDateDisplay.style.display = 'inline';
            this.updateDateDisplay();
        } else {
            this.customDateInput.style.display = 'none';
            this.selectedDateDisplay.style.display = 'none';
        }
    }

    // Mettre à jour l'affichage de la date
    updateDateDisplay() {
        if (this.customDateInput.value) {
            const date = new Date(this.customDateInput.value + 'T00:00:00');
            this.selectedDateDisplay.textContent = `📅 ${date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;
        }
    }

    // Obtenir la date personnalisée si activée
    getCustomDate() {
        if (this.useCustomDateCheckbox.checked && this.customDateInput.value) {
            console.log('📅 Date personnalisée activée:', this.customDateInput.value);
            return this.customDateInput.value;
        }
        console.log('📅 Pas de date personnalisée (date actuelle sera utilisée)');
        return null;
    }

    // Vérifier si l'utilisateur est authentifié
    async checkAuthentication() {
        try {
            const response = await fetch(`${API_URL}/api/auth/check`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (!result.authenticated) {
                // Rediriger vers la page de login
                window.location.href = '/login.html';
                return;
            }

            this.isAuthenticated = true;

            // Afficher le contenu maintenant que l'utilisateur est authentifié
            document.body.classList.add('authenticated');
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
            window.location.href = '/login.html';
        }
    }

    // Charger tous les items depuis l'API
    async loadItems() {
        try {
            const response = await fetch(`${API_URL}/api/items`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                this.allItems = result.data;
                this.filteredItems = [...this.allItems];
                this.populateSupplierFilter();
                this.renderList();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des items:', error);
        }
    }

    // Remplir le select avec les fournisseurs uniques
    populateSupplierFilter() {
        // Extraire les fournisseurs uniques
        const suppliers = [...new Set(this.allItems.map(item => item.supplier).filter(s => s))];
        suppliers.sort();

        // Vider le select (sauf l'option "Tous")
        this.supplierFilter.innerHTML = '<option value="">Tous les fournisseurs</option>';

        // Ajouter les fournisseurs
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            if (supplier === this.currentSupplier) {
                option.selected = true;
            }
            this.supplierFilter.appendChild(option);
        });
    }

    // Afficher le loader
    showLoader() {
        this.loader.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
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

    // Gérer le filtre par fournisseur
    handleSupplierFilter(e) {
        this.currentSupplier = e.target.value;
        this.applyFilters();
    }

    // Gérer la recherche
    handleSearch(e) {
        this.applyFilters();
    }

    // Formater une date en texte français pour la recherche
    formatDateForSearch(isoString) {
        if (!isoString) return '';

        const date = new Date(isoString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        // Format complet : "23 octobre 2025"
        const fullFormat = date.toLocaleDateString('fr-FR', options);

        // Format court : "23/10/2025"
        const shortFormat = date.toLocaleDateString('fr-FR');

        // Format ISO : "2025-10-23"
        const isoFormat = date.toISOString().split('T')[0];

        // Retourner tous les formats possibles en minuscules
        return `${fullFormat} ${shortFormat} ${isoFormat}`.toLowerCase();
    }

    // Appliquer tous les filtres (recherche + fournisseur)
    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();

        let filtered = [...this.allItems];

        // Filtrer par fournisseur
        if (this.currentSupplier) {
            filtered = filtered.filter(item => item.supplier === this.currentSupplier);
        }

        // Filtrer par recherche (nom + date de création + source + URL)
        if (searchTerm) {
            filtered = filtered.filter(item => {
                // Recherche dans le nom
                const matchName = item.name && item.name.toLowerCase().includes(searchTerm);

                // Recherche dans la date de création
                const dateSearchText = this.formatDateForSearch(item.createdAt);
                const matchDate = dateSearchText.includes(searchTerm);

                // Recherche dans la source (fournisseur)
                const matchSupplier = item.supplier && item.supplier.toLowerCase().includes(searchTerm);

                // Recherche dans l'URL
                const matchUrl = item.url && item.url.toLowerCase().includes(searchTerm);

                return matchName || matchDate || matchSupplier || matchUrl;
            });
        }

        this.filteredItems = filtered;
        this.renderList();
    }

    // Gérer la soumission du formulaire
    async handleSubmit(e) {
        e.preventDefault();

        const input = this.urlInput.value.trim();
        if (!input) return;

        // Détecter si plusieurs URLs sont présentes (séparées par des retours à la ligne)
        const urls = input.split('\n').map(u => u.trim()).filter(u => u.length > 0);

        if (urls.length > 1) {
            // Afficher la modal de choix du mode
            this.showModeChoice(urls);
        } else {
            // Traitement d'une seule URL
            await this.processSingleUrl(urls[0]);
        }
    }

    // Afficher la modal de choix du mode
    showModeChoice(urls) {
        this.pendingUrls = urls;
        this.modeUrlCount.textContent = urls.length;
        this.modeChoiceModal.classList.remove('hidden');
    }

    // Fermer la modal de choix du mode
    closeModeChoice() {
        this.modeChoiceModal.classList.add('hidden');
        this.pendingUrls = null;
    }

    // Gérer le choix du mode
    async handleModeChoice(mode) {
        if (!this.pendingUrls) return;

        const urls = this.pendingUrls;
        this.closeModeChoice();

        if (mode === 'visible') {
            // Mode visible : traitement synchrone avec progression
            await this.processBatchUrlsSync(urls);
        } else if (mode === 'background') {
            // Mode arrière-plan : traitement async
            await this.processBatchUrls(urls);
        }
    }

    // Traiter une seule URL
    async processSingleUrl(url) {
        this.showLoader();

        try {
            const customDate = this.getCustomDate();
            const requestBody = { url };
            if (customDate) {
                requestBody.customDate = customDate;
            }

            const response = await fetch(`${API_URL}/api/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                // Recharger la liste des items
                await this.loadItems();

                // Sélectionner automatiquement le nouvel élément
                this.selectItem(result.data.id);

                // Réinitialiser le formulaire
                this.urlInput.value = '';
                this.hideLoader();
            } else {
                // Gérer l'alerte pour URL déjà scannée
                if (result.alreadyScanned) {
                    alert('⚠️ Cette URL a déjà été scannée !');
                } else {
                    this.showError(result.error || 'Erreur lors du scraping');
                }
                this.hideLoader();
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Erreur de connexion au serveur. Assurez-vous que le backend est démarré.');
            this.hideLoader();
        }
    }

    // Traiter plusieurs URLs en mode SYNCHRONE avec progression visible
    async processBatchUrlsSync(urls) {
        const customDate = this.getCustomDate();
        const loaderText = this.loader.querySelector('p');
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        this.showLoader();

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];

            // Mettre à jour le loader avec la progression détaillée
            const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
            loaderText.textContent = `Traitement en cours...\n\n` +
                `📊 Progression : ${i + 1}/${urls.length}\n` +
                `🔗 ${shortUrl}\n\n` +
                `✅ Réussis : ${successCount} | ⚠️ Ignorés : ${skippedCount} | ❌ Erreurs : ${errorCount}`;

            try {
                const requestBody = { url };
                if (customDate) {
                    requestBody.customDate = customDate;
                }

                const response = await fetch(`${API_URL}/api/scrape`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(requestBody)
                });

                const result = await response.json();

                if (result.success) {
                    successCount++;
                    console.log(`✅ [${i + 1}/${urls.length}] Succès: ${url}`);
                    // Recharger la liste pour montrer le nouveau produit
                    await this.loadItems();
                } else if (result.alreadyScanned) {
                    skippedCount++;
                    console.log(`⚠️ [${i + 1}/${urls.length}] Déjà scanné: ${url}`);
                } else {
                    errorCount++;
                    console.error(`❌ [${i + 1}/${urls.length}] Erreur: ${url} - ${result.error}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ [${i + 1}/${urls.length}] Erreur réseau: ${url}`, error);
            }

            // Petit délai entre chaque requête pour ne pas surcharger
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Recharger la liste complète
        await this.loadItems();

        // Réinitialiser le formulaire
        this.urlInput.value = '';
        this.hideLoader();

        // Afficher le récapitulatif
        const message = `📊 Traitement terminé !\n\n` +
            `✅ ${successCount} produit(s) ajouté(s)\n` +
            `⚠️ ${skippedCount} URL(s) déjà scannée(s)\n` +
            `❌ ${errorCount} erreur(s)`;
        alert(message);
    }

    // Traiter plusieurs URLs en lot (envoi au backend pour traitement en arrière-plan)
    async processBatchUrls(urls) {
        this.showLoader();
        const customDate = this.getCustomDate();
        const loaderText = this.loader.querySelector('p');
        loaderText.textContent = `Envoi de ${urls.length} URL(s) au serveur...`;

        try {
            const requestBody = { urls };
            if (customDate) {
                requestBody.customDate = customDate;
            }

            const response = await fetch(`${API_URL}/api/scrape-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                // Réinitialiser le formulaire
                this.urlInput.value = '';
                this.hideLoader();

                // Afficher un message de confirmation
                const message = `✅ Traitement démarré !\n\n${result.message}\n\nLe traitement continue en arrière-plan.\nLa page se mettra à jour automatiquement.\n\n⚠️ Gardez cette page ouverte pour maintenir le serveur actif.`;
                alert(message);

                // Démarrer le keep-alive pour maintenir le serveur actif
                this.startKeepAlive();

                // Recharger les items automatiquement toutes les 10 secondes
                // Calcul du temps estimé : ~10 secondes par URL
                const estimatedTime = urls.length * 10; // en secondes
                const maxRefreshTime = Math.max(estimatedTime, 600); // minimum 10 minutes

                this.startAutoRefresh(maxRefreshTime);

            } else {
                this.hideLoader();
                alert('❌ ' + (result.error || 'Erreur lors du traitement'));
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.hideLoader();
            alert('❌ Erreur de connexion au serveur');
        }
    }

    // Démarrer le keep-alive pour maintenir le serveur actif
    startKeepAlive() {
        // Arrêter l'intervalle existant si présent
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
        }

        console.log('🔄 Keep-alive démarré (ping toutes les 30 secondes)');

        // Envoyer un ping toutes les 30 secondes
        this.keepAliveInterval = setInterval(async () => {
            try {
                await fetch(`${API_URL}/api/health`, {
                    method: 'GET',
                    credentials: 'include'
                });
                console.log('✓ Ping serveur envoyé');
            } catch (error) {
                console.error('❌ Erreur ping serveur:', error);
            }
        }, 30000); // 30 secondes
    }

    // Arrêter le keep-alive
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
            console.log('⏹️ Keep-alive arrêté');
        }
    }

    // Démarrer le refresh automatique
    startAutoRefresh(maxDuration) {
        // Arrêter l'intervalle existant si présent
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        console.log(`🔄 Auto-refresh démarré pour ${Math.round(maxDuration / 60)} minutes`);

        let elapsedTime = 0;
        const refreshFrequency = 10000; // 10 secondes

        // Refresh immédiat
        this.loadItems();

        // Puis refresh périodique
        this.autoRefreshInterval = setInterval(async () => {
            await this.loadItems();
            elapsedTime += refreshFrequency;

            // Arrêter après le temps estimé
            if (elapsedTime >= maxDuration * 1000) {
                this.stopAutoRefresh();
                this.stopKeepAlive();
                console.log('✅ Auto-refresh et keep-alive arrêtés (temps écoulé)');
            }
        }, refreshFrequency);
    }

    // Arrêter le refresh automatique
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('⏹️ Auto-refresh arrêté');
        }
    }

    // Afficher le récapitulatif du traitement en lot
    showBatchSummary(added, skipped, errors) {
        let message = `📊 Récapitulatif du traitement :\n\n`;
        message += `✅ ${added} produit(s) ajouté(s)\n`;

        if (skipped.length > 0) {
            message += `⚠️ ${skipped.length} URL(s) ignorée(s) (déjà présente(s)) :\n`;
            skipped.forEach(url => {
                const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
                message += `  - ${shortUrl}\n`;
            });
        }

        if (errors.length > 0) {
            message += `\n❌ ${errors.length} erreur(s) :\n`;
            errors.forEach(({ url, error }) => {
                const shortUrl = url.length > 40 ? url.substring(0, 40) + '...' : url;
                message += `  - ${shortUrl}: ${error}\n`;
            });
        }

        alert(message);
    }

    // Supprimer un item (nécessite un code de suppression)
    async deleteItem(id, event) {
        event.stopPropagation(); // Empêcher la sélection de l'item

        // Demander le code de suppression
        const deleteCode = prompt('⚠️ SUPPRESSION\n\nPour confirmer la suppression, veuillez entrer le code de suppression :');

        // Si l'utilisateur annule ou laisse vide
        if (!deleteCode) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ deleteCode: deleteCode.trim() })
            });

            const result = await response.json();

            if (result.success) {
                // Si l'item supprimé était sélectionné, effacer les détails
                if (this.currentItemId === id) {
                    this.currentItemId = null;
                    this.itemDetails.innerHTML = '<p class="empty-message">Sélectionnez un élément pour voir ses détails</p>';
                }

                // Recharger la liste
                await this.loadItems();
                alert('✅ Élément supprimé avec succès');
            } else {
                // Afficher l'erreur (code invalide, etc.)
                alert('❌ ' + (result.error || 'Erreur lors de la suppression'));
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('❌ Erreur lors de la suppression de l\'élément');
        }
    }

    // Afficher la liste des éléments
    renderList() {
        const items = this.filteredItems;

        // Mettre à jour le compteur
        this.itemCount.textContent = `(${items.length})`;

        if (items.length === 0) {
            this.itemsList.innerHTML = '<p class="empty-message">Aucun élément pour le moment</p>';
            return;
        }

        this.itemsList.innerHTML = items.map(item => `
            <div class="list-item ${item.id === this.currentItemId ? 'active' : ''}" data-id="${item.id}">
                <div class="list-item-content">
                    <div class="list-item-name">${this.escapeHtml(item.name || 'Sans titre')}</div>
                    <div class="list-item-id">ID: ${item.id}${item.price ? ' • ' + this.escapeHtml(item.price) : ''}</div>
                </div>
                <button class="delete-btn" data-id="${item.id}">🗑️</button>
            </div>
        `).join('');

        // Ajouter les événements de clic pour sélection
        this.itemsList.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ne pas sélectionner si on clique sur le bouton supprimer
                if (!e.target.classList.contains('delete-btn')) {
                    const id = item.dataset.id;
                    this.selectItem(id);
                }
            });
        });

        // Ajouter les événements de clic pour suppression
        this.itemsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                this.deleteItem(id, e);
            });
        });
    }

    // Sélectionner et afficher un élément
    selectItem(id) {
        this.currentItemId = id;
        const item = this.allItems.find(i => i.id === id);

        if (!item) return;

        // Mettre à jour l'affichage de la liste
        this.renderList();

        // Afficher les détails
        this.renderDetails(item);
    }

    // Afficher les détails d'un élément
    renderDetails(item) {
        const priceHtml = item.price
            ? `<div class="detail-section">
                <div class="section-header">
                    <h3>Prix</h3>
                    <button class="copy-btn" data-copy-text="${this.escapeHtml(item.price)}" title="Copier le prix">📋 Copier</button>
                </div>
                <p style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${this.escapeHtml(item.price)}</p>
               </div>`
            : '';

        const descriptionText = item.description && item.description.length > 0
            ? item.description.join('\n')
            : '';

        const descriptionHtml = item.description && item.description.length > 0
            ? `<ul class="description-list">
                ${item.description.map(text => `<li>${this.escapeHtml(text)}</li>`).join('')}
               </ul>`
            : '<p class="empty-message">Aucune description disponible</p>';

        const descriptionCopyBtn = descriptionText
            ? `<button class="copy-btn" data-copy-text="${this.escapeHtml(descriptionText)}" title="Copier la description">📋 Copier</button>`
            : '';

        const imagesHtml = item.images && item.images.length > 0
            ? `<div class="images-grid">
                ${item.images.map(imgUrl => `
                    <div class="image-container">
                        <img src="${this.escapeHtml(imgUrl)}" alt="Image" onerror="this.parentElement.style.display='none'">
                    </div>
                `).join('')}
               </div>`
            : '<p class="empty-message">Aucune image disponible</p>';

        const downloadImagesBtn = item.images && item.images.length > 0
            ? `<button class="download-images-btn" data-item-id="${item.id}">📥 Télécharger toutes les images (${item.images.length})</button>`
            : '';

        const createdAtHtml = item.createdAt
            ? `<div class="detail-section">
                <h3>Date d'ajout</h3>
                <p style="color: #667eea;">${this.formatDate(item.createdAt)}</p>
               </div>`
            : '';

        this.itemDetails.innerHTML = `
            <div class="detail-title-wrapper">
                <div class="detail-title">${this.escapeHtml(item.name || 'Sans titre')}</div>
                <button class="copy-btn" data-copy-text="${this.escapeHtml(item.name || 'Sans titre')}" title="Copier le nom">📋 Copier</button>
            </div>

            ${priceHtml}

            <div class="detail-section">
                <div class="section-header">
                    <h3>Description</h3>
                    ${descriptionCopyBtn}
                </div>
                ${descriptionHtml}
            </div>

            <div class="detail-section">
                <h3>Images ${downloadImagesBtn}</h3>
                ${imagesHtml}
            </div>

            ${createdAtHtml}

            <div class="detail-section">
                <h3>Source</h3>
                <p style="word-break: break-all; color: #667eea;">
                    <a href="${this.escapeHtml(item.url)}" target="_blank" style="color: #667eea; text-decoration: none;">
                        ${this.escapeHtml(item.url)}
                    </a>
                </p>
            </div>
        `;

        // Ajouter l'événement pour le bouton de téléchargement
        const downloadBtn = this.itemDetails.querySelector('.download-images-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadAllImages(item));
        }

        // Ajouter les événements pour les boutons copier
        this.itemDetails.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.copyToClipboard(e.target));
        });
    }

    // Copier du texte dans le presse-papiers
    async copyToClipboard(button) {
        const text = button.getAttribute('data-copy-text');
        const originalText = button.textContent;

        try {
            await navigator.clipboard.writeText(text);
            button.textContent = '✅ Copié !';
            button.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);

        } catch (error) {
            console.error('Erreur lors de la copie:', error);
            button.textContent = '❌ Erreur';

            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }
    }

    // Télécharger toutes les images d'un item dans un ZIP
    async downloadAllImages(item) {
        if (!item.images || item.images.length === 0) {
            alert('Aucune image à télécharger');
            return;
        }

        const btn = this.itemDetails.querySelector('.download-images-btn');
        const originalText = btn.textContent;

        try {
            btn.disabled = true;
            btn.textContent = '⏳ Préparation du ZIP...';

            // Créer une instance de JSZip
            const zip = new JSZip();

            // Nettoyer le nom du produit pour le nom du dossier
            const folderName = this.sanitizeFolderName(item.name || 'produit');

            // Créer un dossier dans le ZIP
            const folder = zip.folder(folderName);

            // Télécharger et ajouter chaque image au ZIP
            for (let i = 0; i < item.images.length; i++) {
                const imageUrl = item.images[i];
                const index = i + 1; // Commencer à 1

                try {
                    // Mettre à jour la progression
                    btn.textContent = `⏳ Téléchargement ${i + 1}/${item.images.length}...`;

                    // Récupérer l'extension de l'image
                    const extension = this.getImageExtension(imageUrl);

                    // Télécharger l'image via le proxy backend pour éviter les problèmes CORS
                    let blob;
                    try {
                        // Essayer d'abord en direct
                        const directResponse = await fetch(imageUrl);
                        if (directResponse.ok) {
                            blob = await directResponse.blob();
                        } else {
                            throw new Error('Fetch direct échoué, utilisation du proxy');
                        }
                    } catch (directError) {
                        // Si le fetch direct échoue (CORS), utiliser le proxy backend
                        console.log(`Utilisation du proxy pour l'image ${index}`);
                        const proxyResponse = await fetch(`${API_URL}/api/download-image`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ url: imageUrl })
                        });

                        if (!proxyResponse.ok) {
                            throw new Error('Proxy échoué');
                        }

                        blob = await proxyResponse.blob();
                    }

                    // Ajouter l'image au dossier dans le ZIP
                    folder.file(`${index}.${extension}`, blob);

                } catch (error) {
                    console.error(`Erreur lors du téléchargement de l'image ${index}:`, error);
                    // Continuer même si une image échoue
                }
            }

            // Générer le fichier ZIP
            btn.textContent = '⏳ Création du ZIP...';
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // Télécharger le fichier ZIP
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();

            // Nettoyer
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            btn.textContent = '✅ ZIP téléchargé !';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Erreur lors du téléchargement des images:', error);
            alert('Erreur lors de la création du ZIP');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Nettoyer le nom du dossier/fichier
    sanitizeFolderName(name) {
        // Limiter à 50 caractères et retirer les caractères spéciaux
        return name
            .substring(0, 50)
            .replace(/[<>:"/\\|?*]/g, '') // Caractères interdits dans les noms de fichiers
            .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
            .replace(/_+/g, '_') // Éviter les underscores multiples
            .replace(/^_|_$/g, ''); // Retirer les underscores au début/fin
    }

    // Obtenir l'extension de l'image depuis l'URL
    getImageExtension(url) {
        // Retirer les paramètres d'URL
        const urlWithoutParams = url.split('?')[0];

        // Extraire l'extension
        const match = urlWithoutParams.match(/\.([a-zA-Z0-9]+)$/);
        if (match) {
            return match[1].toLowerCase();
        }

        // Valeur par défaut
        return 'jpg';
    }

    // Exporter vers Excel
    async exportToExcel() {
        try {
            // Désactiver le bouton pendant l'export
            this.exportExcelBtn.disabled = true;
            this.exportExcelBtn.textContent = '⏳ Export en cours...';

            // Appeler l'API pour générer le fichier Excel
            const response = await fetch(`${API_URL}/api/export/excel`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Erreur lors de l\'export');
                return;
            }

            // Récupérer le fichier en blob
            const blob = await response.blob();

            // Créer un lien de téléchargement temporaire
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_produits_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Nettoyer
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export Excel. Assurez-vous que le serveur est démarré.');
        } finally {
            // Réactiver le bouton
            this.exportExcelBtn.disabled = false;
            this.exportExcelBtn.textContent = '📊 Exporter en Excel';
        }
    }

    // Rediriger vers la page des produits ignorés
    viewIgnoredProducts() {
        window.location.href = '/ignored.html';
    }

    // Formater la date au format français
    formatDate(isoString) {
        const date = new Date(isoString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('fr-FR', options);
    }

    // Échapper les caractères HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    // Ouvrir le scanner QR
    async scanForUrls() {
        try {
            // Afficher la modal
            this.qrScannerModal.classList.remove('hidden');
            this.qrScannerStatus.textContent = '';
            this.qrScannerStatus.className = 'scanner-status';

            // Initialiser le scanner
            this.html5QrCode = new Html5Qrcode("qrReader");

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            };

            // Démarrer le scan
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Caméra arrière
                config,
                (decodedText) => {
                    // QR Code scanné avec succès
                    console.log(`QR Code scanné: ${decodedText}`);
                    this.processQRCode(decodedText);
                },
                (errorMessage) => {
                    // Erreur silencieuse (normal pendant le scan)
                }
            );

        } catch (err) {
            console.error('Erreur lors du démarrage du scanner:', err);
            this.showScannerStatus('Impossible d\'accéder à la caméra. Vérifiez les permissions.', 'error');
        }
    }

    // Fermer le scanner
    async closeScanner() {
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                this.html5QrCode.clear();
            } catch (err) {
                console.error('Erreur lors de l\'arrêt du scanner:', err);
            }
        }
        // Réinitialiser les flags de scan
        this.isProcessingQR = false;
        this.lastQRCode = null;
        this.lastQRTime = 0;

        this.qrScannerModal.classList.add('hidden');
    }

    // Afficher un statut dans le scanner
    showScannerStatus(message, type) {
        this.qrScannerStatus.textContent = message;
        this.qrScannerStatus.className = `scanner-status ${type}`;
    }

    // Traiter le QR code scanné
    async processQRCode(qrText) {
        const now = Date.now();
        const DEBOUNCE_TIME = 3000; // 3 secondes entre chaque scan

        // Vérifier si on est déjà en train de traiter un QR code
        if (this.isProcessingQR) {
            console.log('⏳ Traitement en cours, scan ignoré');
            return;
        }

        // Vérifier si c'est le même QR code récemment scanné
        if (this.lastQRCode === qrText && (now - this.lastQRTime) < DEBOUNCE_TIME) {
            console.log(`⏭️ QR code identique scanné il y a ${Math.round((now - this.lastQRTime) / 1000)}s, ignoré`);
            return;
        }

        // Marquer comme en cours de traitement
        this.isProcessingQR = true;
        this.lastQRCode = qrText;
        this.lastQRTime = now;

        this.showScannerStatus('QR Code détecté ! Traitement en cours...', 'info');

        // Extraire la plus grande chaîne si plusieurs chaînes séparées par "-"
        let query = qrText;
        if (qrText.includes('-')) {
            const parts = qrText.split('-');
            // Garder la plus grande chaîne
            query = parts.reduce((longest, current) =>
                current.length > longest.length ? current : longest
            , '');
            console.log(`Chaîne extraite: "${query}" (original: "${qrText}")`);
        }

        try {
            // Appeler le backend pour rechercher sur DuckDuckGo
            this.showScannerStatus(`Recherche du produit "${query}"...`, 'info');

            const response = await fetch(`${API_URL}/api/search-vevor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ query })
            });

            const result = await response.json();

            if (result.success && result.url) {
                // Lien Vevor trouvé !
                this.showScannerStatus(`✅ Lien Vevor trouvé !`, 'success');

                // Ajouter l'URL au textarea
                const currentValue = this.urlInput.value.trim();
                if (currentValue) {
                    this.urlInput.value = currentValue + '\n' + result.url;
                } else {
                    this.urlInput.value = result.url;
                }

                console.log(`URL ajoutée: ${result.url}`);

                // Réinitialiser le flag et fermer le scanner après 2 secondes
                setTimeout(() => {
                    this.isProcessingQR = false;
                    this.closeScanner();
                }, 2000);

            } else {
                // Aucun lien Vevor trouvé
                this.showScannerStatus(
                    `❌ ${result.error || 'Aucun lien Vevor trouvé'}`,
                    'error'
                );
                // Réinitialiser le flag après 2 secondes
                setTimeout(() => {
                    this.isProcessingQR = false;
                }, 2000);
            }

        } catch (error) {
            console.error('Erreur lors du traitement du QR code:', error);
            this.showScannerStatus('❌ Erreur lors de la recherche', 'error');
            // Réinitialiser le flag en cas d'erreur
            this.isProcessingQR = false;
        }
    }
}

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();

    // Nettoyer les intervalles quand la page se ferme
    window.addEventListener('beforeunload', () => {
        app.stopKeepAlive();
        app.stopAutoRefresh();
    });
});
