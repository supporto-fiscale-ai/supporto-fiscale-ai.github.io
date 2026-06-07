const CONFIG = {
    // URL del Gist pubblico (API di GitHub)
    GIST_URL: "https://api.github.com/gists/a9b516fffea743068838be945b5b3700",
    BACKEND_URL: "http://localhost:8000" // Fallback locale di default se il caricamento del Gist fallisce o è lento
};

async function initBackendUrl() {
    try {
        // Aggiungiamo un timestamp per evitare problemi di cache del browser
        const response = await fetch(CONFIG.GIST_URL + '?t=' + new Date().getTime());
        const data = await response.json();
        
        // Estrapoliamo il contenuto JSON
        const fileContentStr = data.files['backend_url.json'].content;
        const fileContent = JSON.parse(fileContentStr);
        
        CONFIG.BACKEND_URL = fileContent.url;
        console.log("Backend URL configurato in automatico:", CONFIG.BACKEND_URL);
    } catch (error) {
        console.error("Errore di caricamento URL dal Gist:", error);
    }
}

// Avvia il caricamento dell'URL appena la pagina si apre
initBackendUrl();
