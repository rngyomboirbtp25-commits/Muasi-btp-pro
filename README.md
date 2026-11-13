# ChantierPro

Application mobile **Expo / React Native** de génie civil, entièrement en français et **100 % hors ligne** (données sauvegardées sur le téléphone).

| Onglet | Fonctions |
|---|---|
| 🧱 **Béton** | Dalle, poteau, semelle, mur · volume avec marge de perte (5–10 %) · ciment (sacs de 50 kg), sable, gravier, eau selon le dosage (250–400 kg/m³) · coût selon des prix unitaires modifiables |
| 🔩 **Ferraillage** | Dalle, poteau, semelle, poutre, mur · HA6 à HA20 · espacement, enrobage, nappes · barres longitudinales + cadres pour poteaux/poutres · nombre de barres, longueur, poids, barres de 12 m à commander, marge de chute (5–10 %) · coût au kg |
| 🧾 **Devis** | Client, projet, date · lignes (désignation, quantité, unité, prix unitaire) · sous-total, TVA réglable, total · import des calculs béton et ferraillage · export PDF et partage |
| 📅 **Planning** | Tâches (nom, début, durée, statut) · vue liste et chronologie · barre de progression globale |

## Tester avec Expo Go (QR code)

```bash
npm install
npx expo start
```

Scannez le QR code affiché avec l'application **Expo Go** (Android) ou l'appareil photo (iPhone).
Le projet utilise le SDK Expo 58 : installez la version d'Expo Go à jour.

## Générer un APK (EAS)

Profil `preview` dans `eas.json` → APK Android installable directement.

```bash
npx eas-cli build --platform android --profile preview
```

### Via GitHub Actions

Le workflow `.github/workflows/eas-build.yml` lance ce build à chaque push sur `main` (ou manuellement depuis l'onglet **Actions**).

1. Créez un jeton sur https://expo.dev/settings/access-tokens
2. Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret**, nom `EXPO_TOKEN`.
3. Le lien de téléchargement de l'APK apparaît ensuite sur https://expo.dev (rubrique *Builds* du projet).

## Hypothèses de calcul

- **Béton** (par m³) : ciment = dosage choisi · sable 0,4 m³ · gravier 0,8 m³ · eau = ½ × poids de ciment (E/C ≈ 0,5).
- **Ferraillage** : barres réparties sur la longueur utile (dimension − 2 × enrobage), n = ⌊longueur / espacement⌋ + 1 ; cadres = périmètre intérieur + 2 crochets de 10 Ø ; poids linéiques HA6 0,222 · HA8 0,395 · HA10 0,617 · HA12 0,888 · HA14 1,208 · HA16 1,578 · HA20 2,466 kg/m.
- **Planning** : avancement pondéré par la durée (à faire 0 %, en cours 50 %, terminé 100 %).

Ces résultats sont des estimations de chantier ; ils ne remplacent pas une note de calcul d'ingénieur.

## Structure

```
src/app/          écrans (Expo Router) : index (béton), ferraillage, devis, planning
src/components/   composants d'interface (gros boutons, champs, calendrier)
src/lib/          calculs, stockage local, génération du PDF
```
