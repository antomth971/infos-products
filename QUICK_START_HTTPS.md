# 🚀 Démarrage rapide : HTTPS gratuit en 10 minutes

## ⚡ Version express (3 étapes seulement !)

### 1️⃣ Créez votre compte DuckDNS (2 min)

1. Allez sur **https://www.duckdns.org/**
2. Connectez-vous avec Google/GitHub/Reddit/Twitter
3. Créez un sous-domaine (ex: `monapp`)
4. **Notez** :
   - Votre domaine : `monapp.duckdns.org`
   - Votre token : (en haut de la page)

### 2️⃣ Envoyez le script sur votre serveur (1 min)

**Sur votre machine locale** :
```bash
cd /Users/anthonymathieu/Documents/projets/sean_project/infos_product
scp setup-duckdns.sh root@VOTRE_IP_CONTABO:/root/infos_product/
```

### 3️⃣ Lancez le script (5-7 min)

**Connectez-vous au serveur** :
```bash
ssh root@VOTRE_IP_CONTABO
cd /root/infos_product
chmod +x setup-duckdns.sh
./setup-duckdns.sh
```

Le script vous demandera :
- Votre sous-domaine DuckDNS (ex: `monapp`)
- Votre token DuckDNS
- Votre email

**C'est tout !** 🎉

---

## ✅ Test

Ouvrez votre navigateur et allez sur :
```
https://votre-domaine.duckdns.org
```

Testez le scanner QR : il devrait fonctionner ! 📷

---

## 📚 Documentation complète

Consultez `DUCKDNS_HTTPS_SETUP.md` pour :
- Installation manuelle
- Dépannage
- Maintenance
- Commandes utiles

---

## ❓ Problèmes ?

### Le site n'est pas accessible

Attendez 5 minutes que le DNS se propage, puis :
```bash
# Vérifier que tout tourne
docker-compose ps
systemctl status nginx

# Voir les logs
docker-compose logs -f
tail -f /var/log/nginx/error.log
```

### "Impossible d'accéder à la caméra"

Vérifiez que vous êtes bien en **HTTPS** :
- URL doit commencer par `https://`
- Cadenas vert dans la barre d'adresse

Si vous voyez toujours HTTP, relancez :
```bash
certbot --nginx -d votre-domaine.duckdns.org
systemctl reload nginx
```

---

**Besoin d'aide ?** Consultez `DUCKDNS_HTTPS_SETUP.md` 📖
