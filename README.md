# AI Professionisti - Frontend (Web)

Questo progetto contiene l'interfaccia utente (HTML, CSS, JS) per interagire con l'assistente legale AI.
L'architettura è basata su file statici ("Vanilla") per poter essere caricata gratuitamente e con zero manutenzione su **GitHub Pages**.

## Struttura
- `index.html`: La pagina di Login.
- `chat.html`: L'interfaccia principale dell'assistente, che comunicherà con le API REST protette.
- `js/api.js` (o logica interna): Gestisce l'invio delle chiamate (fetch) al server e l'autenticazione JWT.
- `js/config.js`: Contiene l'URL del backend.

## Configurazione Collegamento (Cloudflare Tunnel)
Dato che il backend gira in locale sul tuo server, questo frontend non saprà come raggiungerlo. Dovrai indicarglielo.

1. Avvia il Cloudflare Tunnel dal server di backend (vedi README del backend).
2. Copia l'URL HTTPS che ti viene restituito (es. `https://random-words.trycloudflare.com`).
3. Apri il file `js/config.js` (che creeremo a breve) e incolla l'URL:
   ```javascript
   const BACKEND_URL = "https://random-words.trycloudflare.com";
   ```

## Sicurezza e Deploy
- **Non inserire MAI password** all'interno di questi file HTML/JS, perché una volta pubblicati su GitHub Pages il codice sorgente sarà visibile a chiunque sappia usare "Ispeziona Elemento".
- Il login viene gestito chiedendo all'utente username e password. La pagina invia i dati al backend, riceve un **Token JWT** segreto e lo salva temporaneamente nel browser (`sessionStorage`).
- Il token garantisce che solo chi possiede le vere credenziali possa usare la tua intelligenza artificiale.

## Comandi Rapidi Git (Push su GitHub Pages)
Per mandare online il sito:
```bash
git add .
git commit -m "Aggiornamento frontend"
git push origin main
```
Dopo qualche minuto, le modifiche saranno visibili sul tuo link GitHub Pages pubblico.
