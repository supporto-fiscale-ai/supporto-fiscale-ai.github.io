document.addEventListener('DOMContentLoaded', () => {
    // Se c'è già un token, vai direttamente alla chat
    if (sessionStorage.getItem('jwt_token')) {
        window.location.href = 'chat.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            
            // Stato caricamento
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Autenticazione... <span class="typing-dot"></span><span class="typing-dot"></span>';
            errorDiv.innerText = '';

            // Attendi che la configurazione dell'URL del backend dal Gist sia completata
            if (typeof backendUrlPromise !== 'undefined' && backendUrlPromise) {
                await backendUrlPromise;
            }

            try {
                const response = await fetch(`${CONFIG.BACKEND_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Salva il token in sessionStorage (sparisce alla chiusura del tab)
                    sessionStorage.setItem('jwt_token', data.token);
                    // Redirect alla pagina della chat
                    window.location.href = 'chat.html';
                } else {
                    const errData = await response.json();
                    errorDiv.innerText = errData.detail || "Credenziali non valide.";
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Accedi in Sicurezza <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>';
                }
            } catch (error) {
                console.error("Errore di connessione:", error);
                errorDiv.innerText = "Errore di rete. Assicurati che il backend sia raggiungibile (o che il tunnel Cloudflare sia attivo).";
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Riprova <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
            }
        });
    }
});
