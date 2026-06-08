const CONFIG = {
    // URL raw del Gist (senza limiti di rate limit API di GitHub)
    GIST_RAW_URL: "https://gist.githubusercontent.com/petmax1973/a9b516fffea743068838be945b5b3700/raw/backend_url.json",
    BACKEND_URL: "http://localhost:8000" // Fallback locale di default
};

let backendUrlPromise = null;

async function initBackendUrl() {
    try {
        // Usa l'API di GitHub invece dell'URL raw per evitare la cache di 5 minuti di GitHub
        const response = await fetch('https://api.github.com/gists/a9b516fffea743068838be945b5b3700' + '?t=' + new Date().getTime());
        const data = await response.json();
        
        if (data && data.files && data.files["backend_url.json"]) {
            const content = JSON.parse(data.files["backend_url.json"].content);
            if (content.url) {
                CONFIG.BACKEND_URL = content.url;
                console.log("Backend URL configurato in automatico (API Gist):", CONFIG.BACKEND_URL);
            }
        } else {
            console.warn("Dati dell'URL del backend non validi nel Gist API.");
        }
    } catch (error) {
        console.error("Errore di caricamento URL dal Gist API:", error);
    }
}

// Avvia il caricamento dell'URL appena la pagina si apre e salva la promessa
backendUrlPromise = initBackendUrl();
