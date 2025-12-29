# Checklist pré-déploiement

Utilisez cette checklist avant de déployer sur Contabo pour vous assurer que tout est prêt.

## ✅ Configuration locale

- [ ] Le fichier `.env` existe et contient toutes les variables nécessaires
- [ ] Les codes d'accès (`ACCESS_CODE` et `DELETE_CODE`) ont été changés
- [ ] Le `SESSION_SECRET` est une longue chaîne aléatoire
- [ ] L'URL MongoDB Atlas est correcte et testée
- [ ] Le projet démarre correctement en local (`npm start`)
- [ ] Les scraping fonctionnent sur différents fournisseurs

## ✅ Configuration MongoDB Atlas

- [ ] Compte MongoDB Atlas créé
- [ ] Cluster M0 (gratuit) créé
- [ ] Utilisateur de base de données créé avec mot de passe fort
- [ ] Network Access configuré (0.0.0.0/0 ou IP du serveur)
- [ ] URL de connexion copiée et testée

## ✅ Fichiers du projet

- [ ] `.gitignore` est à jour (ne pas commit .env)
- [ ] `.dockerignore` existe
- [ ] `Dockerfile` est présent
- [ ] `docker-compose.yml` est configuré
- [ ] `setup-server.sh` est exécutable
- [ ] `deploy.sh` est exécutable
- [ ] `.env.example` est à jour (sans vraies valeurs sensibles)

## ✅ Git

- [ ] Code committé sur GitHub/GitLab
- [ ] Dépôt accessible (public ou clé SSH configurée)
- [ ] Pas de fichiers sensibles (.env) dans le repo

## ✅ Contabo VPS

- [ ] Compte Contabo créé
- [ ] VPS commandé (Cloud VPS M minimum recommandé)
- [ ] Accès SSH reçus par email (IP + mot de passe)
- [ ] Connexion SSH testée
- [ ] Mot de passe root changé

## ✅ Sécurité

- [ ] Codes ACCESS_CODE et DELETE_CODE différents des valeurs par défaut
- [ ] SESSION_SECRET généré aléatoirement
- [ ] Mot de passe MongoDB fort
- [ ] Pare-feu configuré (UFW)
- [ ] Ports ouverts uniquement : 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (temporaire)

## ✅ Domaine (optionnel mais recommandé)

- [ ] Domaine acheté
- [ ] Enregistrement DNS A configuré
- [ ] Propagation DNS vérifiée

## ✅ Déploiement

- [ ] Script `setup-server.sh` exécuté avec succès
- [ ] Docker et Docker Compose installés
- [ ] Code cloné/uploadé sur le serveur
- [ ] Fichier `.env` créé sur le serveur avec les bonnes valeurs
- [ ] `deploy.sh` exécuté avec succès
- [ ] Application accessible sur `http://IP_SERVEUR:3000`
- [ ] Logs vérifiés (`docker-compose logs app`)
- [ ] Connexion MongoDB réussie
- [ ] Test de scraping effectué

## ✅ HTTPS (optionnel mais recommandé)

- [ ] Nginx installé
- [ ] Configuration Nginx créée
- [ ] Certbot installé
- [ ] Certificat SSL obtenu
- [ ] Application accessible en HTTPS
- [ ] Redirection HTTP → HTTPS active

## ✅ Post-déploiement

- [ ] Application testée via navigateur
- [ ] Login fonctionnel
- [ ] Scraping testé sur plusieurs fournisseurs
- [ ] Export Excel fonctionne
- [ ] Download ZIP d'images fonctionne
- [ ] Suppression de produit testée
- [ ] Logs vérifiés pour erreurs
- [ ] Monitoring configuré (Uptime Robot ou autre - optionnel)

## Commandes utiles

### Vérifier l'état
```bash
docker-compose ps
docker-compose logs -f app
htop
df -h
```

### Redémarrer l'application
```bash
docker-compose restart
```

### Mettre à jour
```bash
git pull
./deploy.sh
```

### Voir les ressources
```bash
docker stats
free -h
```

## En cas de problème

1. **L'application ne démarre pas**
   - Vérifier `.env` : `cat .env`
   - Vérifier les logs : `docker-compose logs app`
   - Vérifier MongoDB : tester la connexion

2. **Erreur MongoDB**
   - Vérifier Network Access dans Atlas
   - Vérifier l'URL de connexion
   - Tester : `ping google.com`

3. **Port 3000 non accessible**
   - Vérifier le pare-feu : `ufw status`
   - Vérifier le conteneur : `docker-compose ps`
   - Vérifier le port : `netstat -tulpn | grep 3000`

4. **Out of memory**
   - Upgrade VPS (au moins 4 GB RAM)
   - Ou ajouter du swap (voir guide)

## Support

- Guide complet : [CONTABO_DEPLOYMENT.md](CONTABO_DEPLOYMENT.md)
- Documentation Docker : https://docs.docker.com/
- Documentation MongoDB : https://docs.atlas.mongodb.com/
- Support Contabo : https://contabo.com/en/support/

---

**Prêt à déployer ?** Suivez le guide [CONTABO_DEPLOYMENT.md](CONTABO_DEPLOYMENT.md) !
