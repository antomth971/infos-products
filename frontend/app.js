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
        this.loader = document.getElementById('loader');
        this.errorMessage = document.getElementById('errorMessage');
        this.itemsList = document.getElementById('itemsList');
        this.itemDetails = document.getElementById('itemDetails');
        this.itemCount = document.getElementById('itemCount');
        this.scanForUrlButton = document.getElementById('scanForUrl');

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
        this.scanForUrlButton.addEventListener('click', () => this.scanForUrls());

        // Charger les éléments existants
        await this.loadItems();
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

        // Filtrer par recherche (nom + date de création)
        if (searchTerm) {
            filtered = filtered.filter(item => {
                // Recherche dans le nom
                const matchName = item.name && item.name.toLowerCase().includes(searchTerm);

                // Recherche dans la date de création
                const dateSearchText = this.formatDateForSearch(item.createdAt);
                const matchDate = dateSearchText.includes(searchTerm);

                return matchName || matchDate;
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
            // Traitement en lot
            await this.processBatchUrls(urls);
        } else {
            // Traitement d'une seule URL
            await this.processSingleUrl(urls[0]);
        }
    }

    // Traiter une seule URL
    async processSingleUrl(url) {
        this.showLoader();

        try {
            const response = await fetch(`${API_URL}/api/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ url })
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

    // Traiter plusieurs URLs en lot (envoi au backend pour traitement en arrière-plan)
    async processBatchUrls(urls) {
        this.showLoader();
        const loaderText = this.loader.querySelector('p');
        loaderText.textContent = `Envoi de ${urls.length} URL(s) au serveur...`;

        try {
            const response = await fetch(`${API_URL}/api/scrape-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ urls })
            });

            const result = await response.json();

            if (result.success) {
                // Réinitialiser le formulaire
                this.urlInput.value = '';
                this.hideLoader();

                // Afficher un message de confirmation avec lien vers les résultats
                const message = `✅ Traitement démarré !\n\n${result.message}\n\nLe traitement continue en arrière-plan.\nVous pouvez fermer cette page.\n\nConsultez les résultats sur : ${window.location.origin}/results`;
                alert(message);

                // Recharger les items toutes les 5 secondes pendant 30 secondes
                let refreshCount = 0;
                const refreshInterval = setInterval(async () => {
                    await this.loadItems();
                    refreshCount++;
                    if (refreshCount >= 6) {
                        clearInterval(refreshInterval);
                    }
                }, 5000);

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
    // Scanner les URLs (fonctionnalité à implémenter selon les besoins)
    async scanForUrls() {
        await navigator.mediaDevices
        .getUserMedia({ audio: false, video: true })
        .then(function (stream) {
            console.log(stream);
        })
        .catch(function (err) {
            /* handle the error */
            console.error('Erreur lors de l\'accès à la caméra :', err);
        });
    }
}

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
