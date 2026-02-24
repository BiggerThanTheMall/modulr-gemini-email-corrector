// ==UserScript==
// @name         Modulr - Correcteur Email Gemini
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Corrige le corps des emails via Gemini dans Modulr - Style professionnel LTOA avec base d'exemples externe
// @author       Sheana
// @match        https://courtage.modulr.fr/fr/scripts/documents/documents_send.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @downloadURL  https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @homepageURL  https://github.com/BiggerThanTheMall/modulr-gemini-email-corrector
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    // URL du fichier d'exemples sur GitHub (repo PRIVÉ)
const EXEMPLES_URL = 'https://gist.githubusercontent.com/BiggerThanTheMall/ed3677e5396db3a07e74f98fb523b3a4/raw/724dc432e781c6317c37b357c4a61713582c9fbf/exemples-emails.txt';;

    // Date d'expiration du token GitHub (31 décembre 2026)
    const TOKEN_EXPIRY = new Date('2026-12-31');

    // Durée du cache des exemples (1 heure)
    const CACHE_DURATION = 60 * 60 * 1000;

    let exemplesCache = null;
    let exemplesCacheTime = 0;

    // ============================================
    // RAPPEL EXPIRATION TOKEN
    // ============================================
    function checkTokenExpiry() {
        const now = new Date();
        const daysLeft = Math.ceil((TOKEN_EXPIRY - now) / (1000 * 60 * 60 * 24));

        // Afficher le rappel tout le mois de décembre 2026
        if (now.getFullYear() === 2026 && now.getMonth() === 11) { // 11 = décembre
            // Ne montrer qu'une fois par jour max
            const lastReminder = GM_getValue('token_reminder_date', '');
            const today = now.toISOString().split('T')[0];

            if (lastReminder !== today) {
                GM_setValue('token_reminder_date', today);

                let message, bgColor;
                if (daysLeft <= 0) {
                    message = `⚠️ Token GitHub EXPIRÉ ! Renouvelle-le sur github.com/settings/tokens puis : setGithubToken('nouveau_token')`;
                    bgColor = '#e53935';
                } else if (daysLeft <= 7) {
                    message = `⚠️ Token GitHub expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} ! Pense à le renouveler.`;
                    bgColor = '#e53935';
                } else {
                    message = `🔑 Rappel : ton token GitHub expire le 31/12/2026 (dans ${daysLeft} jours). Pense à le renouveler avant.`;
                    bgColor = '#FF9800';
                }

                showTokenReminder(message, bgColor);
            }
        }
    }

    function showTokenReminder(message, bgColor) {
        const notif = document.createElement('div');
        notif.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <span>${message}</span>
                <span style="cursor:pointer; font-size:18px; line-height:1;" id="close-token-reminder">✕</span>
            </div>
            <div style="margin-top:6px; font-size:11px; opacity:0.85;">
                Console → setGithubToken('nouveau_token')
            </div>
        `;
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 14px 18px;
            background: ${bgColor}; color: white; border-radius: 6px; z-index: 99999;
            font-family: Arial, sans-serif; font-size: 13px; max-width: 420px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); line-height: 1.4;
        `;
        document.body.appendChild(notif);

        // Fermer au clic sur la croix
        notif.querySelector('#close-token-reminder').addEventListener('click', () => notif.remove());

        // Auto-fermer après 15 secondes
        setTimeout(() => { if (notif.parentNode) notif.remove(); }, 15000);
    }

    // ============================================
    // CHARGEMENT DES EXEMPLES EXTERNES
    // ============================================
    function loadExemples() {
        return new Promise((resolve, reject) => {
            const now = Date.now();

            if (exemplesCache && (now - exemplesCacheTime) < CACHE_DURATION) {
                resolve(exemplesCache);
                return;
            }

            try {
                const cached = GM_getValue('exemples_cache', '');
                const cachedTime = GM_getValue('exemples_cache_time', 0);
                if (cached && (now - cachedTime) < CACHE_DURATION) {
                    exemplesCache = cached;
                    exemplesCacheTime = cachedTime;
                    resolve(cached);
                    return;
                }
            } catch(e) {}

            console.log('Modulr Gemini: Téléchargement des exemples...');

            const headers = { 'Accept': 'application/vnd.github.raw+json' };
const token = '';
```

**3.** Dans le bloc `// ==UserScript==` en haut, remplace :
```
// @connect      api.github.com
```

Par :
```
// @connect      gist.githubusercontent.com
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: EXEMPLES_URL + '?t=' + now,
                headers: headers,
                onload: function(response) {
                    if (response.status === 200 && response.responseText) {
                        exemplesCache = response.responseText;
                        exemplesCacheTime = now;
                        try {
                            GM_setValue('exemples_cache', response.responseText);
                            GM_setValue('exemples_cache_time', now);
                        } catch(e) {}
                        console.log(`Modulr Gemini: ${response.responseText.length} chars d'exemples chargés`);
                        resolve(response.responseText);
                    } else {
                        console.warn('Modulr Gemini: HTTP ' + response.status);
                        if (response.status === 404 || response.status === 401) {
                            console.warn('Modulr Gemini: Vérifie l\'URL et le token → setGithubToken()');
                        }
                        resolve(GM_getValue('exemples_cache', '') || '');
                    }
                },
                onerror: function() {
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
- Abréviations ne garder que le mot sans l'abréviation: "RI" pour relevé d'information (à ne pas confondre avec RIB (relevé d'identité bancaire) "Cie" pour compagnie, "CP" pour conditions particulières, "CG" pour conditions générales, "IPID" pour fiche d'information, "MRH" pour multirisque habitation, "RC Pro" pour responsabilité civile professionnelle, "PJ" pour protection juridique

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
Note comment les énumérations sont en tirets, comment le tutoiement est préservé,
et comment les instructions en ((doubles parenthèses)) modifient le ton.
Les parenthèses simples ( ) font partie du texte normal.
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
        const group = createToolbarGroup(button);
        toolbar.appendChild(group);
        console.log('Modulr Gemini v3.1: Bouton ajouté !');
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
        button.innerHTML = `
            <span class="tox-icon tox-tbtn__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" focusable="false">
                    <path fill="currentColor" d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
                </svg>
            </span>
        `;
        button.addEventListener('mouseenter', () => { button.style.backgroundColor = '#dee0e2'; });
        button.addEventListener('mouseleave', () => { button.style.backgroundColor = ''; });
        button.addEventListener('click', handleCorrection);
        return button;
    }

    function createToolbarGroup(button) {
        const group = document.createElement('div');
        group.className = 'tox-toolbar__group';
        group.setAttribute('role', 'toolbar');
        group.appendChild(button);
        return group;
    }

    function getMessageContent() {
        let iframe = document.querySelector('iframe[id^="body_ifr"]');
        if (!iframe) iframe = document.querySelector('iframe[id*="_ifr"]');
        if (!iframe) iframe = document.querySelector('.tox-edit-area iframe');
        if (!iframe) iframe = document.querySelector('.tox-edit-area__iframe');
        if (!iframe) {
            const iframes = document.querySelectorAll('iframe');
            for (const f of iframes) {
                try {
                    if (f.contentDocument && f.contentDocument.body && f.contentDocument.body.isContentEditable) { iframe = f; break; }
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
            if (text && text.trim()) return { text: text.trim(), elements: [], body, useFullBody: true };
        }

        const text = messageHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>\s*<div>/gi, '\n')
            .replace(/<[^>]+>/g, '').trim();

        return { text, elements: messageElements, body, useFullBody: false };
    }

    // ============================================
    // APPEL GEMINI
    // ============================================
    const GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite'
    ];

    async function callGemini(text, fullPrompt, modelIndex = 0) {
        let apiKey = GM_getValue('gemini_api_key', '');
        if (!apiKey) {
            apiKey = prompt('Entre ta clé API Gemini (gratuite sur aistudio.google.com) :');
            if (apiKey) GM_setValue('gemini_api_key', apiKey);
            else throw new Error('Clé API requise');
        }

        const model = GEMINI_MODELS[modelIndex];
        if (!model) throw new Error('Tous les modèles ont échoué. Vérifie ta clé API.');

        console.log(`Modulr Gemini: Essai avec ${model}...`);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
                            console.log(`Modulr Gemini: Succès avec ${model}`);
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
                    if (modelIndex < GEMINI_MODELS.length - 1) callGemini(text, fullPrompt, modelIndex + 1).then(resolve).catch(reject);
                    else reject(new Error('Erreur réseau'));
                }
            });
        });
    }

    // ============================================
    // FORMATAGE + REMPLACEMENT
    // ============================================
    function normalizeLineBreaks(text) {
        return text
            .split('\n').map(line => line.trim()).join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/(Bonjour[^,\n]*,)\n(?!\n)/g, '$1\n\n')
            .replace(/(Salut[^,\n]*,)\n(?!\n)/g, '$1\n\n')
            .replace(/([^\n])\n((?:Bien )?[Cc]ordialement)/g, '$1\n\n$2')
            .replace(/((?:Bien )?[Cc]ordialement,)\n\n+/g, '$1\n')
            .trim();
    }

    function textToHtml(text) {
        const normalizedText = normalizeLineBreaks(text);
        const lines = normalizedText.split('\n');
        let html = '';
        for (const line of lines) {
            html += line === '' ? '<div><br></div>' : `<div>${line}</div>`;
        }
        return html;
    }

    function replaceMessageContent(content, newText) {
        const { elements, body, useFullBody } = content;
        const newHtml = textToHtml(newText);

        if (useFullBody || elements.length === 0) {
            const signature = body.querySelector('table') || body.querySelector('img');
            if (signature) {
                const signatureParent = signature.closest('div') || signature;
                while (body.firstChild && body.firstChild !== signatureParent) body.removeChild(body.firstChild);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = newHtml + '<div><br></div>';
                body.insertBefore(wrapper, signatureParent);
            } else {
                body.innerHTML = newHtml;
            }
        } else {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = newHtml;
            elements[0].parentNode.insertBefore(wrapper, elements[0]);
            for (const el of elements) el.remove();
        }
    }

    function setSubject(subject) {
        const subjectField = document.querySelector('#send_email_subject');
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
        const button = document.querySelector('.gemini-correction-btn');
        if (!button) return;

        const originalHtml = button.innerHTML;
        button.innerHTML = `<span class="tox-icon tox-tbtn__icon-wrap">⏳</span>`;
        button.disabled = true;

        try {
            const content = getMessageContent();
            if (!content || !content.text) {
                alert('Vérifie que tu as écrit quelque chose dans le corps de l\'email.');
                return;
            }

            const exemples = await loadExemples();
            const fullPrompt = buildPrompt(exemples);
            console.log(`Modulr Gemini: Prompt = ${fullPrompt.length} chars`);

            const response = await callGemini(content.text, fullPrompt);

            let result;
            try {
                const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                result = JSON.parse(clean);
            } catch(e) {
                result = { corps: response, objet: null };
            }

            if (result.corps) replaceMessageContent(content, result.corps);

            if (result.objet) {
                const subjectField = document.querySelector('#send_email_subject');
                if (!subjectField?.value?.trim()) setSubject(result.objet);
            }

            showNotification('✅ Email corrigé !');

            // Vérifier l'expiration du token après chaque correction
            checkTokenExpiry();

        } catch (error) {
            console.error('Erreur:', error);
            if (error.message.includes('quota')) {
                alert('⚠️ Quota API épuisé ! Attends quelques minutes ou resetGeminiKey()');
            } else {
                alert('Erreur: ' + error.message);
            }
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background: #4CAF50; color: white; border-radius: 4px; z-index: 99999;
            font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        window.resetGeminiKey = function() {
            GM_setValue('gemini_api_key', '');
            alert('Clé API Gemini supprimée.');
        };

        window.setGithubToken = function(token) {
            GM_setValue('github_token', token);
            exemplesCache = null;
            exemplesCacheTime = 0;
            GM_setValue('exemples_cache', '');
            GM_setValue('exemples_cache_time', 0);
            loadExemples().then(ex => {
                if (ex) alert('✅ Token OK ! ' + ex.length + ' chars d\'exemples chargés.');
                else alert('⚠️ Token sauvegardé mais erreur chargement. Vérifie l\'URL.');
            });
        };

        window.reloadExemples = function() {
            exemplesCache = null;
            exemplesCacheTime = 0;
            GM_setValue('exemples_cache', '');
            GM_setValue('exemples_cache_time', 0);
            loadExemples().then(ex => {
                if (ex) alert('✅ Exemples rechargés ! ' + ex.length + ' chars.');
                else alert('⚠️ Aucun exemple chargé.');
            });
        };

        console.log('Modulr Gemini v3.1 — Commandes :');
        console.log('  resetGeminiKey()           → Changer clé API Gemini');
        console.log('  setGithubToken("ghp_xxx")  → Token GitHub (repo privé)');
        console.log('  reloadExemples()           → Recharger les exemples');

        loadExemples().then(ex => {
            console.log(ex ? `Exemples pré-chargés: ${ex.length} chars` : 'Aucun exemple (ça marchera quand même)');
        });

        const existingEditors = document.querySelectorAll('.tox-tinymce, .tox');
        for (const editor of existingEditors) addButtonToEditor(editor);

        setupObserver();
        setupPeriodicCheck();

        // Vérifier le token au chargement aussi
        checkTokenExpiry();

        console.log('Modulr Gemini v3.1: Init OK !');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
