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
    const EXEMPLES_URL = 'https://gist.githubusercontent.com/BiggerThanTheMall/ed3677e5396db3a07e74f98fb523b3a4/raw/exemples-emails.txt';
    const CACHE_DURATION = 60 * 60 * 1000;

    let exemplesCache = null;
    let exemplesCacheTime = 0;

    // ============================================
    // CHARGEMENT DES EXEMPLES
    // ============================================
    function loadExemples() {
        return new Promise((resolve) => {
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
                        resolve(response.responseText);
                    } else {
                        resolve(GM_getValue('exemples_cache', '') || '');
                    }
                },
                onerror: () => resolve(GM_getValue('exemples_cache', '') || '')
            });
        });
    }

    // ============================================
    // CONSTRUCTION DU PROMPT
    // ============================================
    function buildPrompt(exemples, recipient) {
        const systemPrompt = `Tu es le rédacteur professionnel du cabinet LTOA Assurances à Lyon. Tu transformes des brouillons d'emails en messages professionnels impeccables.

STYLE ATTENDU :
- Ton courtois et professionnel du secteur de l'assurance
- Phrases claires et bien construites
- Paragraphes aérés avec UNE ligne vide entre chaque paragraphe
- Structure logique : salutation → contenu → formule de politesse → signature

RÈGLES DE FORMATAGE ABSOLUES :
- EXACTEMENT UNE ligne vide entre chaque paragraphe
- Après "Bonjour," ou "Bonjour [Prénom]," → UNE ligne vide puis le texte
- Chaque idée/sujet = un paragraphe distinct
- Avant "Cordialement," ou "Bien cordialement," → UNE ligne vide
- Après "Cordialement," → PAS de ligne vide, directement le nom

RÈGLES DE GENRE ET CLIENT :
${recipient ? `- L'interlocuteur actuel est : **${recipient}**. Utilise cette info pour corriger le nom/prénom dans le texte (ex: si le brouillon dit "acha hagoune", corrige en "AGGOUN Aicha") et pour accorder le genre (Féminin/Masculin).` : '- Écrire AU MASCULIN par défaut sauf indice contraire.'}
- JAMAIS de "é(e)" ou "informé(e)" → choisis le bon genre.
- Si aucun indice → MASCULIN par défaut.

RÈGLES D'ÉNUMÉRATION :
- Si 3 éléments ou plus → LISTE À TIRETS ("- ").
- Introduire la liste par une phrase se terminant par " :".

DÉTECTION DES INSTRUCTIONS :
- Les doubles parenthèses (( )) sont des instructions pour toi (ex: ((ton ferme))) : APPLIQUE-LES et SUPPRIME-LES du mail final.
- Les parenthèses simples ( ) font partie du contenu normal : NE LES SUPPRIME PAS.

SIGNATURE :
- Termine toujours par "Cordialement," ou "Bien cordialement," suivi du Prénom NOM du collaborateur.
- Staff LTOA : Sheana KRIEF, Jake CASIMIR, Ghaïs KALAH, Eddy KALAH, Nadia KALAH, Doryan KALAH, Youness OUACHBAB.`;

        let exemplesSection = exemples ? `\n\nBASE D'EXEMPLES :\n${exemples}` : '';

        const outputFormat = `\n\nRÉPONDS UNIQUEMENT EN JSON VALIDE (sans markdown, sans backticks) :
{"objet": "Objet court et professionnel", "corps": "Le texte complet de l'email corrigé avec les sauts de ligne \\n"}

BROUILLON À RÉÉCRIRE :`;

        return systemPrompt + exemplesSection + outputFormat;
    }

    // ============================================
    // EXTRACTION DU CONTENU
    // ============================================
    function getMessageContent() {
        let recipientName = "";
        const nameElement = document.querySelector('h2.main_subtitle');
        if (nameElement) recipientName = nameElement.innerText.trim();

        let iframe = document.querySelector('iframe[id^="body_ifr"]')
            || document.querySelector('iframe[id*="_ifr"]')
            || document.querySelector('.tox-edit-area iframe');

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
            if (child.querySelector('img') || child.querySelector('table') || child.innerHTML.includes('--')) break;
            if (child.tagName === 'DIV' || child.tagName === 'P') {
                messageHtml += child.outerHTML;
                messageElements.push(child);
            }
        }

        const text = (messageElements.length === 0) ? (body.innerText || body.textContent) : messageHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

        return { text: text, elements: messageElements, body: body, useFullBody: (messageElements.length === 0), recipient: recipientName };
    }

    // ============================================
    // APPEL GEMINI
    // ============================================
    const GEMINI_MODELS = [
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview'
    ];

    async function callGemini(text, fullPrompt, modelIndex = 0) {
        let apiKey = GM_getValue('gemini_api_key', '');
        if (!apiKey) {
            apiKey = prompt('Entre ta clé API Gemini :');
            if (apiKey) GM_setValue('gemini_api_key', apiKey);
            else throw new Error('Clé API requise');
        }

        const model = GEMINI_MODELS[modelIndex];
        if (!model) throw new Error('Modèles non supportés ou erreur de clé.');

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
                            resolve(data.candidates[0].content.parts[0].text);
                        } else {
                            if (modelIndex < GEMINI_MODELS.length - 1) resolve(await callGemini(text, fullPrompt, modelIndex + 1));
                            else reject(new Error('Réponse vide'));
                        }
                    } catch (e) {
                        if (modelIndex < GEMINI_MODELS.length - 1) resolve(await callGemini(text, fullPrompt, modelIndex + 1));
                        else reject(e);
                    }
                },
                onerror: () => reject(new Error('Erreur réseau'))
            });
        });
    }

    // ============================================
    // REMPLACEMENT ET UI
    // ============================================
    function replaceMessageContent(content, newText) {
        const body = content.body;
        const newHtml = newText.split('\n').map(line => line.trim() === '' ? '<div><br></div>' : `<div>${line}</div>`).join('');

        if (content.useFullBody || content.elements.length === 0) {
            const sig = body.querySelector('table') || body.querySelector('img');
            if (sig) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = newHtml + '<div><br></div>';
                body.insertBefore(wrapper, sig.closest('div') || sig);
            } else {
                body.innerHTML = newHtml;
            }
        } else {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = newHtml;
            content.elements[0].parentNode.insertBefore(wrapper, content.elements[0]);
            content.elements.forEach(el => el.remove());
        }
    }

    async function handleCorrection() {
        const btn = document.querySelector('.gemini-correction-btn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<span class="tox-icon tox-tbtn__icon-wrap">⏳</span>';
        btn.disabled = true;

        try {
            const content = getMessageContent();
            if (!content || !content.text) return alert('Écris un brouillon d\'abord.');

            const exemples = await loadExemples();
            const fullPrompt = buildPrompt(exemples, content.recipient);

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
                const sub = document.querySelector('#send_email_subject');
                if (sub && !sub.value.trim()) {
                    sub.value = result.objet;
                    sub.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            showNotification('✅ Email corrigé !');
        } catch (e) {
            alert('Erreur : ' + e.message);
        } finally {
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        }
    }

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.textContent = message;
        notif.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#4CAF50;color:white;border-radius:4px;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-family:sans-serif;';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    function addButtonToEditor(container) {
        if (container.querySelector('.gemini-correction-btn')) return;
        const toolbar = container.querySelector('.tox-toolbar') || container.querySelector('.tox-toolbar__primary');
        if (!toolbar) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tox-tbtn gemini-correction-btn';
        btn.setAttribute('aria-label', 'Corriger avec Gemini');
        btn.title = 'Corriger avec Gemini';
        // LOGO ROBOT ORIGINE
        btn.innerHTML = '<span class="tox-icon tox-tbtn__icon-wrap"><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg></span>';
        btn.onclick = handleCorrection;

        const group = document.createElement('div');
        group.className = 'tox-toolbar__group';
        group.appendChild(btn);
        toolbar.appendChild(group);
    }

    function init() {
        window.resetGeminiKey = () => { GM_setValue('gemini_api_key', ''); alert('Clé supprimée'); };
        setInterval(() => {
            document.querySelectorAll('.tox-tinymce, .tox').forEach(addButtonToEditor);
        }, 2000);
    }

    init();
})();
