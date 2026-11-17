const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../Modulr_-_Correcteur_Email_Gemini.user.js'), 'utf8');
const email = { objet: 'Suivi de votre proposition', corps: 'Bonjour Madame,\n\nVotre devis est disponible.\n\nCordialement,' };
const candidate = (text, finishReason = 'STOP') => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });

function setup(responses = []) {
    const requests = [];
    const alerts = [];
    const writes = [];
    const button = { innerHTML: 'robot', disabled: false };
    const subject = { value: '', dispatchEvent() {} };
    const context = vm.createContext({
        GM_getValue: () => 'test-key', GM_setValue() {},
        GM_xmlhttpRequest(request) {
            requests.push(request);
            const data = responses.shift();
            if (!data) return request.onerror();
            request.onload({ status: 200, responseText: JSON.stringify(data) });
        },
        document: {
            querySelector: selector => selector === '.gemini-correction-btn' ? button : subject,
            createElement: () => ({ style: {}, remove() {} }),
            body: { appendChild() {} }
        },
        performance, console: { debug() {} }, alert: message => alerts.push(message),
        Event: class {}, setTimeout() {}
    });
    const expose = `
        globalThis.api = { parseEmailResponse, readGeminiResponse, callGemini, replaceMessageContent,
            handleCorrection,
            mockEditor() {
                getMessageContent = () => ({ text: 'Bonjour, le devis est disponible.', context: '' });
                loadExemples = async () => '';
                replaceMessageContent = (_, text) => writes.push(text);
            }
        };
    `;
    context.writes = writes;
    vm.runInContext(source.replace('    init();', expose), context);
    return { api: context.api, requests, alerts, writes, button, subject };
}

test('valid JSON and complete Markdown envelopes decode line breaks', () => {
    const { api } = setup();
    for (const response of [JSON.stringify(email), '```json\n' + JSON.stringify(email) + '\n```']) {
        assert.equal(api.parseEmailResponse(response).corps, email.corps);
    }
});

test('malformed, truncated and wrong-shaped responses are rejected', () => {
    const { api } = setup();
    const invalid = [
        '{"objet":"Suivi", "corps":"Bonjour Madame,\\n\\nJe souhaiterais',
        'Voici le résultat : ' + JSON.stringify(email),
        'null', '[]', '{}', '"Bonjour"',
        JSON.stringify({ objet: 'Suivi', corps: '' }),
        JSON.stringify({ objet: 'Suivi', corps: 42 }),
        JSON.stringify({ objet: null, corps: 'Bonjour' }),
        JSON.stringify({ objet: 'Suivi', corps: JSON.stringify(email) })
    ];
    invalid.forEach(response => assert.throws(() => api.parseEmailResponse(response)));
});

test('all text parts are combined and thought parts excluded', () => {
    const { api } = setup();
    const text = JSON.stringify(email);
    const data = candidate('');
    data.candidates[0].content.parts = [
        { thought: true, text: 'Réflexion privée' },
        { text: text.slice(0, 30) }, { text: text.slice(30) }
    ];
    assert.equal(api.readGeminiResponse(data).corps, email.corps);
});

test('blocked, empty and incomplete candidates never pass validation', () => {
    const { api } = setup();
    for (const data of [{}, { error: { message: 'Quota' } }, candidate(''),
        candidate(JSON.stringify(email), 'MAX_TOKENS'), candidate(JSON.stringify(email), 'SAFETY'),
        { candidates: [{ finishReason: 'STOP' }] }]) {
        assert.throws(() => api.readGeminiResponse(data));
    }
});

test('invalid first response retries second model with structured output configured', async () => {
    const { api, requests } = setup([candidate('{"corps":"tronqué'), candidate(JSON.stringify(email))]);
    assert.equal((await api.callGemini('brouillon', 'consignes')).corps, email.corps);
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0].url, requests[1].url);
    for (const request of requests) {
        const config = JSON.parse(request.data).generationConfig;
        assert.equal(config.responseMimeType, 'application/json');
        assert.deepEqual(config.responseSchema.required, ['objet', 'corps']);
    }
});

test('two invalid responses preserve draft and subject and restore button', async () => {
    const { api, writes, alerts, subject, button, requests } = setup([candidate('{'), candidate('{')]);
    api.mockEditor();
    await api.handleCorrection();
    assert.equal(requests.length, 2);
    assert.equal(writes.length, 0);
    assert.equal(subject.value, '');
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /Correction impossible/);
    assert.equal(button.disabled, false);
    assert.equal(button.innerHTML, 'robot');
});

test('valid response updates body, fills empty subject, preserves existing subject', async () => {
    for (const existing of ['', 'Objet déjà saisi']) {
        const { api, writes, subject, alerts } = setup([candidate(JSON.stringify(email))]);
        subject.value = existing;
        api.mockEditor();
        await api.handleCorrection();
        assert.equal(writes[0], email.corps);
        assert.equal(subject.value, existing || email.objet);
        assert.equal(alerts.length, 0);
    }
});

test('plain text is HTML-escaped before editor insertion', () => {
    const { api } = setup();
    const body = { querySelector: () => null, innerHTML: '' };
    api.replaceMessageContent({ body, useFullBody: true }, 'Montant < 100 € & délai > 2 jours\n\n<script>alert(1)</script>');
    assert.equal(body.innerHTML, '<div>Montant &lt; 100 € &amp; délai &gt; 2 jours</div><div><br></div><div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
});
