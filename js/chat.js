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
    
    try {
        // 3. Effettua la chiamata API asincrona per avviare il flusso
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Il token segreto
            },
            body: JSON.stringify({ domanda: text })
        });
        
        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem('jwt_token');
            alert("Sessione scaduta. Effettua nuovamente il login.");
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Errore connessione API (status: ${response.status})`);
        }
        
        // 4. Lettura del flusso in tempo reale (SSE)
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let isDone = false;
        
        while (!isDone) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            const parts = buffer.split("\n\n");
            // Conserva l'ultimo frammento possibilmente incompleto
            buffer = parts.pop();
            
            for (const part of parts) {
                const line = part.trim();
                if (!line) continue;
                
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === "[DONE]") {
                        isDone = true;
                        break;
                    }
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.type === "token") {
                            // Rimuovi l'indicatore di digitazione non appena arriva il primo token
                            removeMessage(typingId);
                            
                            // Se non abbiamo ancora creato il contenitore per il messaggio reale, lo creiamo ora
                            if (!document.getElementById(assistantMessageId)) {
                                appendEmptyAssistantMessage(assistantMessageId);
                            }
                            
                            accumulatedText += parsed.content;
                            updateAssistantMessage(assistantMessageId, accumulatedText);
                        } else if (parsed.type === "sources") {
                            appendSourcesToMessage(assistantMessageId, parsed.content);
                        } else if (parsed.type === "error") {
                            throw new Error(parsed.content);
                        }
                    } catch (e) {
                        console.error("Errore decodifica chunk SSE:", e, line);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error("Errore chat:", error);
        removeMessage(typingId);
        // Se il messaggio è già stato parzialmente scritto, mostriamo l'errore lì, altrimenti ne creiamo uno nuovo
        if (document.getElementById(assistantMessageId)) {
            updateAssistantMessage(assistantMessageId, accumulatedText + `\n\n❌ *Errore di connessione a metà stream: ${error.message}*`);
        } else {
            appendMessage('assistant', `❌ Si è verificato un errore: ${error.message}. Riprova più tardi.`);
        }
    } finally {
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
