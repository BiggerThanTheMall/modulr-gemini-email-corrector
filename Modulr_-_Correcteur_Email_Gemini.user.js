// ==UserScript==
// @name         Modulr - Correcteur Email Gemini
// @namespace    http://tampermonkey.net/
// @version      3.3.1
// @description  Corrige le corps des emails via Gemini dans Modulr - Style professionnel LTOA avec base d'exemples externe
// @author       Sheana
// @match        https://courtage.modulr.fr/fr/scripts/documents/documents_send.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @connect      gist.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @downloadURL  https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @homepageURL  https://github.com/BiggerThanTheMall/modulr-gemini-email-corrector
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    // URL du Gist secret (pas besoin de token)
    const EXEMPLES_URL = 'https://gist.githubusercontent.com/BiggerThanTheMall/ed3677e5396db3a07e74f98fb523b3a4/raw/exemples-emails.txt';

    // Durée du cache des exemples (1 heure)
    const CACHE_DURATION = 60 * 60 * 1000;

    let exemplesCache = null;
    let exemplesCacheTime = 0;

    // ============================================
    // CHARGEMENT DES EXEMPLES DEPUIS LE GIST
    // ============================================
    function loadExemples() {
        return new Promise((resolve) => {
            const now = Date.now();

            // Cache mémoire
            if (exemplesCache && (now - exemplesCacheTime) < CACHE_DURATION) {
                resolve(exemplesCache);
                return;
            }

            // Cache local Tampermonkey
            try {
                const cached = GM_getValue('exemples_cache', '');
                const cachedTime = GM_getValue('exemples_cache_time', 0);
                if (cached && (now - cachedTime) < CACHE_DURATION) {
                    exemplesCache = cached;
                    exemplesCacheTime = cachedTime;
                    console.log('Modulr Gemini: Exemples chargés depuis le cache local');
                    resolve(cached);
                    return;
                }
            } catch(e) {}

            // Télécharger depuis le Gist
            console.log('Modulr Gemini: Téléchargement des exemples depuis le Gist...');

            GM_xmlhttpRequest({
                method: 'GET',
                url: EXEMPLES_URL + '?t=' + now,
                onload: function(response) {
                    if (response.status === 200 && response.responseText) {
                        exemplesCache = response.responseText;
                        exemplesCacheTime = now;
                        try {
                            GM_setValue('exemples_cache', response.responseText);
                            GM_setValue('exemples_cache_time', now);
                        } catch(e) {}
                        console.log('Modulr Gemini: ' + response.responseText.length + ' chars d\'exemples chargés');
                        resolve(response.responseText);
                    } else {
                        console.warn('Modulr Gemini: Erreur HTTP ' + response.status + ' pour les exemples');
                        resolve(GM_getValue('exemples_cache', '') || '');
                    }
                },
                onerror: function() {
                    console.warn('Modulr Gemini: Erreur réseau pour les exemples');
                    resolve(GM_getValue('exemples_cache', '') || '');
                }
            });
        });
    }

    // ============================================
    // CONSTRUCTION DU PROMPT
    // ============================================
    function buildPrompt(exemples) {
        const systemPrompt = `Tu es le rédacteur professionnel du cabinet LTOA Assurances à Lyon. Tu transformes des brouillons d'emails en messages professionnels impeccables.

STYLE ATTENDU :
- Ton courtois et professionnel du secteur de l'assurance
- Phrases claires et bien construites
- Paragraphes aérés avec UNE ligne vide entre chaque paragraphe
- Structure logique : salutation → contenu → formule de politesse → signature

RÈGLES DE FORMATAGE ABSOLUES :
- EXACTEMENT UNE ligne vide entre chaque paragraphe (pas 0, pas 2, pas 3)
- Après "Bonjour," ou "Bonjour [Prénom]," → UNE ligne vide puis le texte
- Chaque idée/sujet = un paragraphe distinct
- Avant "Cordialement," ou "Bien cordialement," → UNE ligne vide
- Après "Cordialement," → PAS de ligne vide, directement le nom
- Le nom du signataire sur la ligne juste après la formule de politesse

RÈGLES DE TUTOIEMENT / VOUVOIEMENT (TRÈS IMPORTANT) :
- Si le brouillon utilise le TU → garde le TU
- Si le brouillon utilise le VOUS → garde le VOUS
- Si le brouillon mélange TU et VOUS → utilise le VOUS
- Si aucun indice → VOUS par défaut
- Le tutoiement est souvent utilisé entre collègues ou contacts proches
- Le vouvoiement est la norme pour les clients et les compagnies

RÈGLES DE GENRE :
- Écrire AU MASCULIN par défaut sauf indice contraire
- JAMAIS de "é(e)" ou "informé(e)" → choisis le bon genre
- Si "Monsieur" ou prénom masculin → masculin
- Si "Madame" ou prénom féminin → féminin
- Si aucun indice → MASCULIN par défaut

RÈGLES D'ÉNUMÉRATION (TRÈS IMPORTANT) :
- Quand le brouillon liste 3 éléments ou plus (documents, pièces, garanties, contrats, références, etc.) → LISTE À TIRETS
- Format : un tiret "- " par élément, un élément par ligne
- Introduire la liste par une phrase qui se termine par " :"
- Exemple :
  Nous aurions besoin des pièces suivantes :
  - Permis de conduire
  - Carte grise du véhicule
  - RIB
- Si seulement 1 ou 2 éléments → les garder en ligne dans le texte

DÉTECTION DES INSTRUCTIONS DE TON / STYLE (TRÈS IMPORTANT) :
Le rédacteur peut inclure des INSTRUCTIONS destinées à toi dans son brouillon.
Ces instructions sont TOUJOURS entre DOUBLES PARENTHÈSES (( )).

⚠️ ATTENTION À NE PAS CONFONDRE :
- SIMPLES parenthèses ( ) = texte NORMAL qui fait partie du mail
  Exemples : "garantie tous risques (tous dommages, assistance 0km)", "contrat MRH (multirisque habitation)", "(réf. SIN-2024-0892)"
  → Ces parenthèses simples font partie du contenu, NE PAS les supprimer

- DOUBLES parenthèses (( )) = INSTRUCTIONS POUR TOI, pas du texte à envoyer
  Exemples : "((ton sympathique))", "((relance ferme))", "((urgent))", "((faire comprendre qu'on est déçu))"
  → SUPPRIME ces doubles parenthèses du texte final
  → ADAPTE le ton global du mail en fonction de l'instruction

Exemples d'instructions en doubles parenthèses :
  * ((ton sympathique et convivial)) → ton chaleureux, amical
  * ((ton formel)) ou ((très formel)) → ton soutenu, solennel
  * ((relance ferme)) → ton direct et assertif
  * ((urgent)) → marquer l'urgence
  * ((faire comprendre qu'on est déçu)) → diplomatie mais fermeté
  * ((mail pour un avocat)) → registre juridique adapté

Si AUCUNE double parenthèse → ton professionnel standard (courtois, neutre)

RÈGLES DE RÉDACTION :
- Corrige toutes les fautes d'orthographe, grammaire, ponctuation
- Reformule de manière fluide et professionnelle
- Garde le même sens et TOUTES les informations (noms, références, numéros, dates, montants)
- Développe si nécessaire pour la clarté
- Si une abrévation est donnée, developpe la sans rajouter l'abréviation en question entre parenthèses
- Abréviations : "Cie" pour compagnie, "CP" pour conditions particulières, "CG" pour conditions générales, "IPID" pour fiche d'information, "MRH" pour multirisque habitation, "RC Pro" pour responsabilité civile professionnelle, "PJ" pour protection juridique, "RI" pour relevé d'information, a ne pas confondre avec RIB

COLLABORATEURS DU CABINET (reconnais-les même avec fautes) :
- Sheana KRIEF (femme)
- Jake CASIMIR (homme) (peut être écrit "casmir")
- Ghaïs KALAH (homme) (peut être écrit "ghais", "gais", etc.)
- Eddy KALAH (homme)
- Nadia KALAH (femme)
- Doryan KALAH (homme)
- Youness OUACHBAB (homme) (peut être écrit "ouachab")

SIGNATURE :
- Termine TOUJOURS par "Cordialement," ou "Bien cordialement," suivi du Prénom NOM du collaborateur
- Si aucun collaborateur mentionné → "Cordialement," sans nom`;

        let exemplesSection = '';
        if (exemples && exemples.trim()) {
            exemplesSection = `

═══════════════════════════════════════════
BASE D'EXEMPLES DE RÉFÉRENCE
Voici des exemples réels du style d'écriture du cabinet LTOA.
Inspire-toi du ton, du niveau de détail, de la structure et du formatage.
Les parenthèses simples ( ) font partie du texte normal.
Les doubles parenthèses (( )) sont des instructions de ton à supprimer.
═══════════════════════════════════════════

${exemples}

═══════════════════════════════════════════
FIN DES EXEMPLES
═══════════════════════════════════════════`;
        }

        const outputFormat = `

RÉPONDS UNIQUEMENT EN JSON VALIDE (sans markdown, sans backticks), format exact :
{"objet": "Objet court et professionnel", "corps": "Le texte complet de l'email corrigé avec les sauts de ligne"}

IMPORTANT : Dans le champ "corps", utilise \\n pour les sauts de ligne. Pour les tirets de liste, écris "- " en début de ligne.

BROUILLON À RÉÉCRIRE :
`;

        return systemPrompt + exemplesSection + outputFormat;
    }

    // ============================================
    // BOUTON + TOOLBAR
    // ============================================
    function addButtonToEditor(tinyMceContainer) {
        if (tinyMceContainer.querySelector('.gemini-correction-btn')) return;
        const toolbar = tinyMceContainer.querySelector('.tox-toolbar');
        if (!toolbar) return;

        const button = createGeminiButton();
        button.classList.add('gemini-correction-btn');
        const group = document.createElement('div');
        group.className = 'tox-toolbar__group';
        group.setAttribute('role', 'toolbar');
        group.appendChild(button);
        toolbar.appendChild(group);
        console.log('Modulr Gemini v3.2: Bouton ajouté !');
    }

    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    let editors = [];
                    if (node.classList && (node.classList.contains('tox-tinymce') || node.classList.contains('tox'))) {
                        editors.push(node);
                    }
                    if (node.querySelectorAll) {
                        editors = editors.concat([...node.querySelectorAll('.tox-tinymce, .tox')]);
                    }
                    for (const editor of editors) addButtonToEditor(editor);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return observer;
    }

    function setupPeriodicCheck() {
        setInterval(() => {
            const editors = document.querySelectorAll('.tox-tinymce, .tox');
            for (const editor of editors) {
                if (!editor.querySelector('.gemini-correction-btn')) addButtonToEditor(editor);
            }
        }, 2000);
    }

    function createGeminiButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.tabIndex = -1;
        button.className = 'tox-tbtn';
        button.setAttribute('aria-label', 'Corriger avec Gemini');
        button.title = 'Corriger avec Gemini';
        button.innerHTML = '<span class="tox-icon tox-tbtn__icon-wrap"><svg width="24" height="24" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg></span>';
        button.addEventListener('mouseenter', function() { this.style.backgroundColor = '#dee0e2'; });
        button.addEventListener('mouseleave', function() { this.style.backgroundColor = ''; });
        button.addEventListener('click', handleCorrection);
        return button;
    }

    // ============================================
    // EXTRACTION DU CONTENU EMAIL
    // ============================================
    function getMessageContent() {
        let iframe = document.querySelector('iframe[id^="body_ifr"]')
            || document.querySelector('iframe[id*="_ifr"]')
            || document.querySelector('.tox-edit-area iframe')
            || document.querySelector('.tox-edit-area__iframe');

        if (!iframe) {
            const iframes = document.querySelectorAll('iframe');
            for (const f of iframes) {
                try {
                    if (f.contentDocument && f.contentDocument.body && f.contentDocument.body.isContentEditable) {
                        iframe = f;
                        break;
                    }
                } catch(e) {}
            }
        }
        if (!iframe) return null;

        let iframeDoc;
        try { iframeDoc = iframe.contentDocument || iframe.contentWindow.document; }
        catch(e) { return null; }

        const body = iframeDoc.body;
        if (!body) return null;

        const children = Array.from(body.children);
        let messageHtml = '';
        let messageElements = [];

        for (const child of children) {
            if (child.querySelector('img') || child.querySelector('table') ||
                child.innerHTML.includes('border-top') || child.innerHTML.includes('--')) break;
            if (child.tagName === 'DIV' || child.tagName === 'P') {
                messageHtml += child.outerHTML;
                messageElements.push(child);
            }
        }

        if (messageElements.length === 0) {
            const text = body.innerText || body.textContent;
            if (text && text.trim()) return { text: text.trim(), elements: [], body: body, useFullBody: true };
        }

        const text = messageHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>\s*<div>/gi, '\n')
            .replace(/<[^>]+>/g, '').trim();

        return { text: text, elements: messageElements, body: body, useFullBody: false };
    }

    // ============================================
    // APPEL GEMINI AVEC FALLBACK
    // ============================================
    const GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite'
    ];

    async function callGemini(text, fullPrompt, modelIndex) {
        if (modelIndex === undefined) modelIndex = 0;

        let apiKey = GM_getValue('gemini_api_key', '');
        if (!apiKey) {
            apiKey = prompt('Entre ta clé API Gemini (gratuite sur aistudio.google.com) :');
            if (apiKey) GM_setValue('gemini_api_key', apiKey);
            else throw new Error('Clé API requise');
        }

        const model = GEMINI_MODELS[modelIndex];
        if (!model) throw new Error('Tous les modèles ont échoué. Vérifie ta clé API.');

        console.log('Modulr Gemini: Essai avec ' + model + '...');

        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt + text }] }],
                    generationConfig: { temperature: 0.3 }
                }),
                onload: async function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.error) {
                            if (modelIndex < GEMINI_MODELS.length - 1) resolve(await callGemini(text, fullPrompt, modelIndex + 1));
                            else reject(new Error(data.error.message));
                        } else if (data.candidates && data.candidates[0]) {
                            console.log('Modulr Gemini: Succès avec ' + model);
                            resolve(data.candidates[0].content.parts[0].text);
                        } else {
                            if (modelIndex < GEMINI_MODELS.length - 1) resolve(await callGemini(text, fullPrompt, modelIndex + 1));
                            else reject(new Error('Réponse inattendue'));
                        }
                    } catch (e) {
                        if (modelIndex < GEMINI_MODELS.length - 1) resolve(await callGemini(text, fullPrompt, modelIndex + 1));
                        else reject(e);
                    }
                },
                onerror: function() {
                    if (modelIndex < GEMINI_MODELS.length - 1) {
                        callGemini(text, fullPrompt, modelIndex + 1).then(resolve).catch(reject);
                    } else reject(new Error('Erreur réseau'));
                }
            });
        });
    }

    // ============================================
    // FORMATAGE + REMPLACEMENT
    // ============================================
    function normalizeLineBreaks(text) {
        return text
            .split('\n').map(function(line) { return line.trim(); }).join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/(Bonjour[^,\n]*,)\n(?!\n)/g, '$1\n\n')
            .replace(/(Salut[^,\n]*,)\n(?!\n)/g, '$1\n\n')
            .replace(/([^\n])\n((?:Bien )?[Cc]ordialement)/g, '$1\n\n$2')
            .replace(/((?:Bien )?[Cc]ordialement,)\n\n+/g, '$1\n')
            .trim();
    }

    function textToHtml(text) {
        var normalizedText = normalizeLineBreaks(text);
        var lines = normalizedText.split('\n');
        var html = '';
        for (var i = 0; i < lines.length; i++) {
            if (lines[i] === '') {
                html += '<div><br></div>';
            } else {
                html += '<div>' + lines[i] + '</div>';
            }
        }
        return html;
    }

    function replaceMessageContent(content, newText) {
        var elements = content.elements;
        var body = content.body;
        var useFullBody = content.useFullBody;
        var newHtml = textToHtml(newText);

        if (useFullBody || elements.length === 0) {
            var signature = body.querySelector('table') || body.querySelector('img');
            if (signature) {
                var signatureParent = signature.closest('div') || signature;
                while (body.firstChild && body.firstChild !== signatureParent) {
                    body.removeChild(body.firstChild);
                }
                var wrapper = document.createElement('div');
                wrapper.innerHTML = newHtml + '<div><br></div>';
                body.insertBefore(wrapper, signatureParent);
            } else {
                body.innerHTML = newHtml;
            }
        } else {
            var wrapper2 = document.createElement('div');
            wrapper2.innerHTML = newHtml;
            elements[0].parentNode.insertBefore(wrapper2, elements[0]);
            for (var j = 0; j < elements.length; j++) {
                elements[j].remove();
            }
        }
    }

    function setSubject(subject) {
        var subjectField = document.querySelector('#send_email_subject');
        if (subjectField) {
            subjectField.value = subject;
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
            subjectField.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // ============================================
    // GESTION DU CLIC
    // ============================================
    async function handleCorrection() {
        var button = document.querySelector('.gemini-correction-btn');
        if (!button) return;

        var originalHtml = button.innerHTML;
        button.innerHTML = '<span class="tox-icon tox-tbtn__icon-wrap">⏳</span>';
        button.disabled = true;

        try {
            var content = getMessageContent();
            if (!content || !content.text) {
                alert('Vérifie que tu as écrit quelque chose dans le corps de l\'email.');
                return;
            }

            console.log('Texte original:', content.text);

            var exemples = await loadExemples();
            var fullPrompt = buildPrompt(exemples);
            console.log('Modulr Gemini: Prompt = ' + fullPrompt.length + ' chars (dont ' + (exemples ? exemples.length : 0) + ' d\'exemples)');

            var response = await callGemini(content.text, fullPrompt);
            console.log('Réponse Gemini:', response);

            var result;
            try {
                var clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                result = JSON.parse(clean);
            } catch(e) {
                result = { corps: response, objet: null };
            }

            if (result.corps) replaceMessageContent(content, result.corps);

            if (result.objet) {
                var subjectField = document.querySelector('#send_email_subject');
                var currentSubject = subjectField ? subjectField.value.trim() : '';
                if (!currentSubject) setSubject(result.objet);
            }

            showNotification('✅ Email corrigé !');

        } catch (error) {
            console.error('Erreur:', error);
            if (error.message.indexOf('quota') !== -1) {
                alert('⚠️ Quota API épuisé ! Attends quelques minutes ou change de clé : resetGeminiKey() dans la console');
            } else {
                alert('Erreur: ' + error.message);
            }
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    function showNotification(message) {
        var notif = document.createElement('div');
        notif.textContent = message;
        notif.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#4CAF50;color:white;border-radius:4px;z-index:99999;font-family:Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        document.body.appendChild(notif);
        setTimeout(function() { notif.remove(); }, 3000);
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        // Commandes console
        window.resetGeminiKey = function() {
            GM_setValue('gemini_api_key', '');
            alert('Clé API Gemini supprimée. Au prochain clic, tu pourras en entrer une nouvelle.');
        };

        window.reloadExemples = function() {
            exemplesCache = null;
            exemplesCacheTime = 0;
            GM_setValue('exemples_cache', '');
            GM_setValue('exemples_cache_time', 0);
            loadExemples().then(function(ex) {
                if (ex) alert('✅ Exemples rechargés ! ' + ex.length + ' chars.');
                else alert('⚠️ Aucun exemple chargé.');
            });
        };

        console.log('Modulr Gemini v3.2 — Commandes console :');
        console.log('  resetGeminiKey()   → Changer la clé API Gemini');
        console.log('  reloadExemples()   → Forcer le rechargement des exemples');

        // Pré-charger les exemples en arrière-plan
        loadExemples().then(function(ex) {
            if (ex) console.log('Modulr Gemini: Exemples pré-chargés : ' + ex.length + ' chars');
            else console.warn('Modulr Gemini: Aucun exemple chargé (le script fonctionnera quand même)');
        });

        // Ajouter le bouton aux éditeurs existants
        var existingEditors = document.querySelectorAll('.tox-tinymce, .tox');
        for (var i = 0; i < existingEditors.length; i++) {
            addButtonToEditor(existingEditors[i]);
        }

        // Observer + check périodique
        setupObserver();
        setupPeriodicCheck();

        console.log('Modulr Gemini v3.2: Init OK !');
    }

    // Démarrer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
