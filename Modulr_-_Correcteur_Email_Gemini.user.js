// ==UserScript==
// @name         Modulr - Correcteur Email Gemini
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Corrige le corps des emails via Gemini dans Modulr - Style professionnel LTOA
// @author       Sheana
// @match        https://courtage.modulr.fr/fr/scripts/documents/documents_send.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      generativelanguage.googleapis.com
// @updateURL    https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @downloadURL  https://raw.githubusercontent.com/BiggerThanTheMall/modulr-gemini-email-corrector/main/Modulr_-_Correcteur_Email_Gemini.user.js
// @homepageURL  https://github.com/BiggerThanTheMall/modulr-gemini-email-corrector
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION - Ta clé API Gemini
    // ============================================
    const GEMINI_API_KEY = GM_getValue('gemini_api_key', '');

    // Prompt amélioré pour la correction + objet - Style professionnel LTOA
    const CORRECTION_PROMPT = `Tu es le rédacteur professionnel du cabinet LTOA Assurances à Lyon. Tu transformes des brouillons d'emails en messages professionnels impeccables.

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

RÈGLES DE RÉDACTION :
- Corrige toutes les fautes d'orthographe, grammaire, ponctuation
- Reformule de manière fluide et professionnelle
- Garde le même sens et TOUTES les informations importantes
- Développe si nécessaire pour la clarté
- Abréviations : "Cie" pour compagnie d'assurance, "CP" pour conditions particulières

COLLABORATEURS DU CABINET (reconnais-les même avec fautes) :
- Sheana KRIEF
- Jake CASIMIR (peut être écrit "casmir")
- Ghaïs KALAH (peut être écrit "ghais", "gais", etc.)
- Eddy KALAH
- Nadia KALAH
- Doryan KALAH
- Youness OUACHAB (peut être écrit "ouachbab")

SIGNATURE :
- Termine TOUJOURS par "Cordialement," ou "Bien cordialement," suivi du Prénom NOM du collaborateur
- Si aucun collaborateur mentionné, termine juste par "Cordialement," sans nom

EXEMPLE DE FORMATAGE CORRECT (note les lignes vides entre paragraphes) :

Bonjour Monsieur MAHFOUDI,

Merci pour votre transparence et pour le transfert de leur message.

Chose importante à préciser : nous ne sommes pas une banque. Nous ne sommes pas là pour vous vendre un produit à tout prix. Notre rôle de courtier, c'est de vous apporter un conseil : comparer objectivement, expliquer clairement ce pour quoi vous cotisez (garanties, franchises, plafonds, exclusions) et vous accompagner dans le suivi.

Pour être honnête, je suis surpris par la tournure de leur réponse. Elle met en avant des arguments assez généraux pour orienter votre choix, mais elle ne dit pas grand-chose sur ce qui compte réellement pour vous dans un contrat d'assurance : les conditions contractuelles et le coût réel en cas de sinistre (franchises, limites, modalités d'indemnisation).

Les avis Google ne reflètent pas toujours la qualité d'un contrat : ils concernent souvent une agence ou un service en particulier, et l'assurance est un domaine où les clients satisfaits laissent rarement un avis. Ce qui compte réellement, c'est ce qui est prévu noir sur blanc au contrat.

Dans tous les cas, que vous choisissiez la banque ou nous, nous continuerons à faire notre travail jusqu'au bout : le devoir de conseil et le suivi seront assurés, avec un seul objectif : que vous soyez correctement couvert et parfaitement au clair sur votre choix.

Bien cordialement,
Jake CASIMIR

AUTRE EXEMPLE :

Bonjour Madame,

J'ai bien demandé la réédition des documents auprès de la compagnie, car nous n'avons pas la main sur leur édition directe. Je leur ai demandé de nous les faire parvenir dès que possible.

Cela nous permettra d'en conserver une copie à jour et de pouvoir vous les transmettre rapidement. Je ne manquerai pas de revenir vers vous dès réception.

Cordialement,
Ghaïs KALAH

AUTRE EXEMPLE :

Bonjour,

Notre cliente nous confirme n'avoir rien reçu. Pourriez-vous éditer les documents de Mme BOUTELDJI Sonia à jour des informations transmises et nous les faire parvenir ? Nous avons besoin de l'avis d'échéance et du certificat d'adhésion.

Idem pour Mme BOUTELDJI Sabrina.

Merci grandement, je compte sur votre réactivité.

Cordialement,
Jake CASIMIR

RÉPONDS UNIQUEMENT EN JSON VALIDE (sans markdown, sans backticks), format exact :
{"objet": "Objet court et professionnel", "corps": "Le texte complet de l'email corrigé avec les sauts de ligne"}

BROUILLON À RÉÉCRIRE :
`;

    // Attendre qu'un élément apparaisse
    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            attempts++;
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 200);
    }

    // Créer le bouton style Modulr/TinyMCE avec icône robot
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

        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#dee0e2';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '';
        });

        button.addEventListener('click', handleCorrection);
        return button;
    }

    // Créer groupe toolbar
    function createToolbarGroup(button) {
        const group = document.createElement('div');
        group.className = 'tox-toolbar__group';
        group.setAttribute('role', 'toolbar');
        group.appendChild(button);
        return group;
    }

    // Extraire le contenu du message (sans la signature)
    function getMessageContent() {
        // Chercher l'iframe TinyMCE - plusieurs sélecteurs possibles
        let iframe = document.querySelector('iframe[id^="body_ifr"]');
        if (!iframe) {
            iframe = document.querySelector('iframe[id*="_ifr"]');
        }
        if (!iframe) {
            iframe = document.querySelector('.tox-edit-area iframe');
        }
        if (!iframe) {
            iframe = document.querySelector('.tox-edit-area__iframe');
        }
        if (!iframe) {
            // Chercher dans tous les iframes
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

        if (!iframe) {
            console.log('Modulr Gemini: Aucun iframe trouvé');
            console.log('Iframes disponibles:', document.querySelectorAll('iframe'));
            return null;
        }

        console.log('Modulr Gemini: iframe trouvé:', iframe.id || iframe);

        let iframeDoc;
        try {
            iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        } catch(e) {
            console.log('Modulr Gemini: Erreur accès iframe:', e);
            return null;
        }

        const body = iframeDoc.body;
        if (!body) {
            console.log('Modulr Gemini: body non trouvé dans iframe');
            return null;
        }

        console.log('Modulr Gemini: Contenu body:', body.innerHTML);

        // Prendre les premiers divs avant la signature (tables, images, etc.)
        const children = Array.from(body.children);
        let messageHtml = '';
        let messageElements = [];

        for (const child of children) {
            // Stop si on trouve une signature (table, image, ligne de séparation)
            if (child.querySelector('img') ||
                child.querySelector('table') ||
                child.innerHTML.includes('border-top') ||
                child.innerHTML.includes('--')) {
                break;
            }

            if (child.tagName === 'DIV' || child.tagName === 'P') {
                messageHtml += child.outerHTML;
                messageElements.push(child);
            }
        }

        // Si aucun div trouvé, prendre tout le contenu texte
        if (messageElements.length === 0) {
            const text = body.innerText || body.textContent;
            if (text && text.trim()) {
                return {
                    text: text.trim(),
                    elements: [],
                    body: body,
                    useFullBody: true
                };
            }
        }

        // Convertir HTML en texte
        const text = messageHtml
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>\s*<div>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();

        return {
            text: text,
            elements: messageElements,
            body: body,
            useFullBody: false
        };
    }

    // Appeler l'API Gemini avec retry
    async function callGemini(text, retryCount = 0) {
        let apiKey = GM_getValue('gemini_api_key', '');

        if (!apiKey) {
            apiKey = prompt('Entre ta clé API Gemini (gratuite sur aistudio.google.com) :');
            if (apiKey) {
                GM_setValue('gemini_api_key', apiKey);
            } else {
                throw new Error('Clé API requise');
            }
        }

        // Modèles Gemini disponibles
        const model = 'gemini-1.5-flash';

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: CORRECTION_PROMPT + text
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3
                    }
                }),
                onload: async function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.error) {
                            // Si rate limited et pas trop de retries, essayer un autre modèle
                            if (data.error.message.includes('quota') && retryCount < 3) {
                                console.log(`Rate limited sur ${model}, retry avec un autre modèle...`);
                                // Attendre un peu puis retry
                                await new Promise(r => setTimeout(r, 2000));
                                resolve(await callGemini(text, retryCount + 1));
                            } else {
                                reject(new Error(data.error.message));
                            }
                        } else if (data.candidates && data.candidates[0]) {
                            resolve(data.candidates[0].content.parts[0].text);
                        } else {
                            reject(new Error('Réponse inattendue de Gemini'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(new Error('Erreur réseau'));
                }
            });
        });
    }

    // Normaliser les sauts de ligne : exactement 1 ligne vide entre paragraphes
    function normalizeLineBreaks(text) {
        return text
            // Trim chaque ligne
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            // Remplacer 3+ sauts de ligne par exactement 2 (= 1 ligne vide)
            .replace(/\n{3,}/g, '\n\n')
            // S'assurer qu'il y a une ligne vide après "Bonjour..."
            .replace(/(Bonjour[^,\n]*,)\n(?!\n)/g, '$1\n\n')
            // S'assurer qu'il y a une ligne vide avant "Cordialement" ou "Bien cordialement"
            .replace(/([^\n])\n((?:Bien )?[Cc]ordialement)/g, '$1\n\n$2')
            // Supprimer la ligne vide entre "Cordialement," et le nom (garder 1 seul \n)
            .replace(/((?:Bien )?[Cc]ordialement,)\n\n+/g, '$1\n')
            .trim();
    }

    // Convertir le texte en HTML pour TinyMCE
    function textToHtml(text) {
        // Normaliser d'abord les sauts de ligne
        const normalizedText = normalizeLineBreaks(text);
        
        // Séparer par les doubles sauts de ligne (paragraphes)
        // puis traiter les simples sauts de ligne à l'intérieur
        const lines = normalizedText.split('\n');
        
        let html = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line === '') {
                // Ligne vide = saut de paragraphe (un <br> dans un div vide)
                html += '<div><br></div>';
            } else {
                html += `<div>${line}</div>`;
            }
        }
        
        return html;
    }

    // Remplacer le contenu
    function replaceMessageContent(content, newText) {
        const { elements, body, useFullBody } = content;

        // Convertir le texte corrigé en HTML propre
        const newHtml = textToHtml(newText);

        if (useFullBody || elements.length === 0) {
            // Remplacer tout le contenu du body (garder la signature si présente)
            const signature = body.querySelector('table') || body.querySelector('img');
            if (signature) {
                // Supprimer tout avant la signature
                const signatureParent = signature.closest('div') || signature;
                while (body.firstChild && body.firstChild !== signatureParent) {
                    body.removeChild(body.firstChild);
                }
                // Insérer le nouveau contenu avant la signature
                const wrapper = document.createElement('div');
                wrapper.innerHTML = newHtml + '<div><br></div>';
                body.insertBefore(wrapper, signatureParent);
            } else {
                body.innerHTML = newHtml;
            }
        } else {
            // Créer un conteneur pour le nouveau contenu
            const wrapper = document.createElement('div');
            wrapper.innerHTML = newHtml;
            
            // Insérer avant le premier élément
            elements[0].parentNode.insertBefore(wrapper, elements[0]);
            
            // Supprimer tous les anciens éléments du message
            for (const el of elements) {
                el.remove();
            }
        }
    }

    // Remplir le champ objet
    function setSubject(subject) {
        const subjectField = document.querySelector('#send_email_subject');
        if (subjectField) {
            subjectField.value = subject;
            // Déclencher les événements pour que Modulr détecte le changement
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
            subjectField.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Gérer le clic
    async function handleCorrection() {
        const button = document.querySelector('.gemini-correction-btn');
        const originalHtml = button.innerHTML;

        // Indicateur de chargement
        button.innerHTML = `<span class="tox-icon tox-tbtn__icon-wrap">⏳</span>`;
        button.disabled = true;

        try {
            const content = getMessageContent();
            if (!content || !content.text) {
                alert('Impossible de trouver le contenu du message.\n\nVérifie que tu as écrit quelque chose dans le corps de l\'email.');
                return;
            }

            console.log('Texte original:', content.text);

            const response = await callGemini(content.text);
            console.log('Réponse Gemini:', response);

            // Parser le JSON
            let result;
            try {
                // Nettoyer la réponse (enlever ```json si présent)
                const cleanResponse = response
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                result = JSON.parse(cleanResponse);
            } catch(e) {
                console.log('Erreur parsing JSON, utilisation du texte brut');
                // Fallback: utiliser la réponse comme texte brut
                result = { corps: response, objet: null };
            }

            // Remplacer le corps du message
            if (result.corps) {
                replaceMessageContent(content, result.corps);
            }

            // Proposer l'objet si généré
            if (result.objet) {
                const currentSubject = document.querySelector('#send_email_subject')?.value || '';
                const confirmMsg = currentSubject
                    ? `Remplacer l'objet actuel ?\n\nActuel : "${currentSubject}"\nProposé : "${result.objet}"`
                    : `Utiliser cet objet ?\n\n"${result.objet}"`;

                if (confirm(confirmMsg)) {
                    setSubject(result.objet);
                }
            }

            showNotification('✅ Email corrigé !');

        } catch (error) {
            console.error('Erreur:', error);
            if (error.message.includes('quota')) {
                alert('⚠️ Quota API Gemini épuisé !\n\nSolutions :\n1. Attends quelques minutes et réessaie\n2. Crée une nouvelle clé API sur aistudio.google.com\n3. Change de clé : tape "resetGeminiKey()" dans la console');
            } else {
                alert('Erreur: ' + error.message);
            }
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    // Notification
    function showNotification(message) {
        const notif = document.createElement('div');
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            z-index: 99999;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    // Init
    function init() {
        // Accepter mode=email, mode=reply, mode=send, etc.
        const validModes = ['mode=email', 'mode=reply', 'mode=send', 'mode=new'];
        const hasValidMode = validModes.some(mode => window.location.href.includes(mode));
        if (!hasValidMode) return;

        // Exposer fonction pour reset la clé API
        window.resetGeminiKey = function() {
            GM_setValue('gemini_api_key', '');
            alert('Clé API supprimée. Au prochain clic sur le bouton, tu pourras entrer une nouvelle clé.');
        };
        console.log('Modulr Gemini v2.2: Pour changer de clé API, tape resetGeminiKey() dans la console');

        waitForElement('.tox-toolbar', (toolbar) => {
            const button = createGeminiButton();
            button.classList.add('gemini-correction-btn');
            const group = createToolbarGroup(button);
            toolbar.appendChild(group);
            console.log('Modulr Gemini v2.2: Bouton ajouté !');
        });
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
