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
    
    try {
        // 3. Effettua la chiamata API sicura con JWT per AVVIARE IL TASK
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Il token segreto
            },
            body: JSON.stringify({ domanda: text })
        });
        
        if (response.status === 401 || response.status === 403) {
            // Token scaduto o non valido
            sessionStorage.removeItem('jwt_token');
            alert("Sessione scaduta. Effettua nuovamente il login.");
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Errore avvio analisi (status: ${response.status})`);
        }
        
        const data = await response.json();
        const taskId = data.task_id;
        
        // 4. Polling Asincrono: Controlla lo stato ogni 4 secondi
        let isDone = false;
        while (!isDone) {
            // Attendi 4 secondi prima di chiedere di nuovo
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            const statusRes = await fetch(`${CONFIG.BACKEND_URL}/api/chat/status/${taskId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!statusRes.ok) {
                throw new Error(`Errore controllo stato (status: ${statusRes.status})`);
            }
            
            const statusData = await statusRes.json();
            
            if (statusData.status === 'done') {
                // Rimuovi l'indicatore di digitazione
                removeMessage(typingId);
                // Mostra la risposta finale
                appendMessage('assistant', statusData.risposta, statusData.fonti);
                isDone = true;
            } else if (statusData.status === 'error') {
                throw new Error(statusData.detail || "Errore sconosciuto nel database vettoriale");
            }
            // Se lo stato è "processing", il ciclo ricomincia e attende altri 4 secondi
        }
        
    } catch (error) {
        console.error("Errore chat:", error);
        removeMessage(typingId);
        appendMessage('assistant', `❌ Si è verificato un errore: ${error.message}. Riprova più tardi.`);
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
