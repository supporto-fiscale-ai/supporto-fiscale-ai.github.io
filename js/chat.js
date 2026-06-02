// Controllo Autenticazione Istantaneo
const token = sessionStorage.getItem('jwt_token');
if (!token) {
    // Se non c'è token, rimanda subito al login
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = '56px'; // reset base
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value.trim() === '') {
            this.style.height = '56px';
        }
    });

    // Gestione Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('jwt_token');
        window.location.href = 'index.html';
    });
});

let currentTaskId = null;
let isPollingActive = false;

// Permette l'invio premendo Enter (senza Shift)
function handleEnter(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const text = inputField.value.trim();
    const sendBtn = document.getElementById('sendBtn');
    
    if (!text) return;
    
    // 1. Aggiungi il messaggio dell'utente alla chat
    appendMessage('user', text);
    
    // Reset input
    inputField.value = '';
    inputField.style.height = '56px';
    inputField.disabled = true;
    sendBtn.disabled = true;

    // 2. Mostra l'indicatore di digitazione
    const typingId = appendTypingIndicator();
    
    const assistantMessageId = 'assistant-' + Date.now();
    let accumulatedText = "";
    let cursor = 0;
    let taskId = null;
    let pollTimeoutId = null;
    
    try {
        // 3. Avvia la domanda e ottieni il task_id
        const startResponse = await fetch(`${CONFIG.BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ domanda: text, mode: (typeof currentMode !== 'undefined' ? currentMode : 'laws') })
        });
        
        if (startResponse.status === 401 || startResponse.status === 403) {
            sessionStorage.removeItem('jwt_token');
            alert("Sessione scaduta. Effettua nuovamente il login.");
            window.location.href = 'index.html';
            return;
        }
        
        if (!startResponse.ok) {
            throw new Error(`Errore avvio chat (status: ${startResponse.status})`);
        }
        
        const startData = await startResponse.json();
        taskId = startData.task_id;
        
        currentTaskId = taskId;
        isPollingActive = true;
        document.getElementById('stopBtn').style.display = 'inline-flex';
        
        // 4. Avvia la routine di polling incrementale sequenziale e attendi il completamento
        await new Promise((resolve, reject) => {
            let active = true;
            const doPoll = async () => {
                if (!active || !isPollingActive) return;
                try {
                    const pollResponse = await fetch(`${CONFIG.BACKEND_URL}/api/chat/poll/${taskId}?cursor=${cursor}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!pollResponse.ok) {
                        throw new Error(`Errore nel polling (status: ${pollResponse.status})`);
                    }
                    
                    const data = await pollResponse.json();
                    
                    if (data.status === "error") {
                        throw new Error(data.error || "Errore sconosciuto del modello");
                    }
                    
                    // Se abbiamo nuovi token, li mostriamo a schermo
                    if (data.new_tokens && data.new_tokens.length > 0) {
                        removeMessage(typingId);
                        
                        if (!document.getElementById(assistantMessageId)) {
                            appendEmptyAssistantMessage(assistantMessageId);
                        }
                        
                        accumulatedText += data.new_tokens;
                        updateAssistantMessage(assistantMessageId, accumulatedText);
                    }
                    
                    // Aggiorniamo il cursor locale
                    cursor = data.cursor;
                    
                    if (data.status === "completed") {
                        active = false;
                        
                        // Rimuove l'indicatore nel caso non sia arrivato alcun token (caso limite)
                        removeMessage(typingId);
                        
                        // Mostriamo le fonti normative alla fine
                        appendSourcesToMessage(assistantMessageId, data.sources || []);
                        resolve();
                    } else {
                        // Pianifica il prossimo poll solo dopo il completamento del precedente
                        if (active) {
                            pollTimeoutId = setTimeout(doPoll, 1500);
                        }
                    }
                } catch (e) {
                    active = false;
                    reject(e);
                }
            };
            
            // Eseguiamo il primo poll immediatamente
            doPoll();
        });
        
    } catch (error) {
        console.error("Errore chat:", error);
        removeMessage(typingId);
        if (pollTimeoutId) clearTimeout(pollTimeoutId);
        
        if (document.getElementById(assistantMessageId)) {
            updateAssistantMessage(assistantMessageId, accumulatedText + `\n\n❌ *Errore di connessione: ${error.message}*`);
        } else {
            appendMessage('assistant', `❌ Si è verificato un errore: ${error.message}. Riprova più tardi.`);
        }
    } finally {
        isPollingActive = false;
        document.getElementById('stopBtn').style.display = 'none';
        currentTaskId = null;
        inputField.disabled = false;
        sendBtn.disabled = false;
        inputField.focus();
    }
}

function appendMessage(role, content, sources = []) {
    const chatBox = document.getElementById('chatBox');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerText = role === 'user' ? 'TU' : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Usa marked.js per renderizzare il markdown (se presente) per le risposte dell'assistente
    if (role === 'assistant' && typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(content);
    } else {
        // Per l'utente, textContent semplice
        contentDiv.textContent = content;
    }
    
    // Aggiungi le fonti se ci sono (solo per l'assistente)
    if (sources && sources.length > 0) {
        const sourcesContainer = document.createElement('div');
        sourcesContainer.className = 'sources-container';
        
        const title = document.createElement('div');
        title.className = 'sources-title';
        title.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Fonti Normative Consultate:';
        sourcesContainer.appendChild(title);
        
        sources.forEach(source => {
            const srcDiv = document.createElement('div');
            srcDiv.className = 'source-item';
            srcDiv.innerText = source;
            sourcesContainer.appendChild(srcDiv);
        });
        
        contentDiv.appendChild(sourcesContainer);
    }
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatBox.appendChild(messageDiv);
    
    // Scroll automatico in basso
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendTypingIndicator() {
    const chatBox = document.getElementById('chatBox');
    const id = 'typing-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message assistant`;
    messageDiv.id = id;
    
    messageDiv.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- Nuove Funzioni di Supporto per lo Streaming ---

function appendEmptyAssistantMessage(id) {
    const chatBox = document.getElementById('chatBox');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message assistant`;
    messageDiv.id = id;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerText = 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span class="streaming-cursor">|</span>';
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateAssistantMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
        const contentDiv = el.querySelector('.message-content');
        if (contentDiv) {
            // Aggiungiamo un cursore lampeggiante in coda durante la digitazione
            if (typeof marked !== 'undefined') {
                contentDiv.innerHTML = marked.parse(content) + '<span class="streaming-cursor">|</span>';
            } else {
                contentDiv.textContent = content + '|';
            }
        }
        const chatBox = document.getElementById('chatBox');
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function appendSourcesToMessage(id, sources) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const contentDiv = el.querySelector('.message-content');
    if (!contentDiv) return;
    
    // Rimuoviamo il cursore di streaming prima di mostrare le fonti
    const cursor = contentDiv.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    
    if (!sources || sources.length === 0) return;
    
    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'sources-container';
    
    const title = document.createElement('div');
    title.className = 'sources-title';
    title.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Fonti Normative Consultate:';
    sourcesContainer.appendChild(title);
    
    sources.forEach(source => {
        const srcDiv = document.createElement('div');
        srcDiv.className = 'source-item';
        srcDiv.innerText = source;
        sourcesContainer.appendChild(srcDiv);
    });
    
    contentDiv.appendChild(sourcesContainer);
    
    const chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Nuove funzioni per Modalità e Upload ---
let currentMode = 'laws';

function selectMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#modeSelector .nav-item').forEach(el => el.classList.remove('active'));
    const selectedEl = document.querySelector(`.nav-item[data-mode="${mode}"]`);
    if(selectedEl) selectedEl.classList.add('active');
}

function updateFileList() {
    const input = document.getElementById('fileUpload');
    const list = document.getElementById('fileList');
    if (input.files.length > 0) {
        let names = Array.from(input.files).map(f => f.name).join(', ');
        list.innerText = names;
    } else {
        list.innerText = '';
    }
}

async function uploadDocuments() {
    const input = document.getElementById('fileUpload');
    const status = document.getElementById('uploadStatus');
    const btn = document.getElementById('uploadBtn');
    
    if (input.files.length === 0) {
        status.innerText = 'Seleziona almeno un file.';
        return;
    }
    
    const formData = new FormData();
    for(let i=0; i<input.files.length; i++){
        formData.append('files', input.files[i]);
    }
    
    btn.disabled = true;
    btn.innerText = 'Elaborazione...';
    status.innerText = '';
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/upload_documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Errore durante il caricamento');
        }
        
        status.style.color = '#16a34a';
        status.innerText = 'Documenti caricati e pronti!';
        
        // Passa automaticamente alla modalità documenti o ibrida se si stavano cercando le leggi
        if (currentMode === 'laws') {
            selectMode('docs');
        }
    } catch (e) {
        status.style.color = '#ef4444';
        status.innerText = 'Errore: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.innerText = 'Elabora Documenti';
    }
}

function clearChat() {
    if (isPollingActive) {
        stopGeneration();
    }
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = `
        <div class="message assistant">
            <div class="avatar">AI</div>
            <div class="message-content">
                <p>Salve. Sono il tuo Assistente Commercialista (Sistema accelerato Blackwell). Cerca pure nella banca dati legislativa in linguaggio naturale. Come posso aiutarti oggi?</p>
            </div>
        </div>
    `;
}

async function stopGeneration() {
    isPollingActive = false;
    document.getElementById('stopBtn').style.display = 'none';
    
    if (currentTaskId) {
        try {
            await fetch(`${CONFIG.BACKEND_URL}/api/chat/stop/${currentTaskId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (e) {
            console.error("Errore stop:", e);
        }
        currentTaskId = null;
    }
}
