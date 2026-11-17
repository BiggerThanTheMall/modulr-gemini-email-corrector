# modulr-gemini-email-corrector

<!-- LTOA-INSTALLATION-START -->
## Liens d'installation et de mise à jour

Liens publics vérifiés sans connexion GitHub le 4 novembre 2026. Partager le lien « Installer » du script souhaité.

| Fichier | Version | Installation / `@downloadURL` | `@updateURL` |
|---|---|---|---|
| `Modulr_-_Correcteur_Email_Gemini.user.js` | 3.4.1 | [Installer](https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js) | [Vérifier la version](https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js) |

### Si le lien affiche du code au lieu d'ouvrir l'installation

Dans Tampermonkey : **Tableau de bord → Utilitaires → Importer depuis une URL**. Coller le lien « Installer » ci-dessus, lancer l'import puis confirmer l'installation ou la mise à jour. Cette méthode permet l'import même si le navigateur ne reconnaît pas automatiquement un lien `.user.js`.

### Mises à jour automatiques

Les adresses indiquées sont présentes dans l'en-tête des fichiers et restent fixes. Dans les paramètres Tampermonkey, activer les vérifications de mise à jour et choisir une fréquence régulière. Vérifier aussi que la recherche de mises à jour est autorisée pour le script concerné. Une vérification manuelle permet de tester sans attendre la prochaine vérification planifiée.

Une modification du code sur GitHub doit être accompagnée d'une augmentation de `@version` pour être reconnue comme une nouvelle version. Un commit seul ne suffit pas. Si une installation conserve une ancienne adresse, importer une fois le lien actuel dans le script existant. Ne pas supprimer le script pour conserver ses réglages.

Documentation officielle : [import depuis une URL](https://www.tampermonkey.net/faq.php?q=Q106), [version du script](https://www.tampermonkey.net/documentation.php?q=version), [adresses de mise à jour](https://www.tampermonkey.net/documentation.php?q=update_url).
<!-- LTOA-INSTALLATION-END -->

## Correctif 3.4.1

Les réponses Gemini sont demandées en JSON structuré puis validées avant toute insertion. Une réponse tronquée, bloquée ou mal formée déclenche une tentative avec le second modèle. Si les 2 réponses sont inutilisables, le brouillon et l’objet restent inchangés et une erreur s’affiche. Le JSON brut ne sert plus de texte de secours. Les parties de texte sont assemblées et les caractères HTML sont échappés avant insertion.

Tests sans appel API : `node --test tests/gemini-response.test.cjs`.
