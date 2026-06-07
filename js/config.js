const CONFIG = {
    // URL raw del Gist (senza limiti di rate limit API di GitHub)
    GIST_RAW_URL: "https://gist.githubusercontent.com/petmax1973/a9b516fffea743068838be945b5b3700/raw/backend_url.json",
    BACKEND_URL: "http://localhost:8000" // Fallback locale di default
};

let backendUrlPromise = null;

async function initBackendUrl() {
    try {
        // Aggiungiamo un timestamp per evitare problemi di cache del browser
        const response = await fetch(CONFIG.GIST_RAW_URL + '?t=' + new Date().getTime());
        const data = await response.json();
        
        if (data && data.url) {
            CONFIG.BACKEND_URL = data.url;
            console.log("Backend URL configurato in automatico (Raw Gist):", CONFIG.BACKEND_URL);
        } else {
            console.warn("Dati dell'URL del backend non validi nel Gist raw.");
        }
    } catch (error) {
        console.error("Errore di caricamento URL dal Gist raw:", error);
    }
}

// Avvia il caricamento dell'URL appena la pagina si apre e salva la promessa
backendUrlPromise = initBackendUrl();
