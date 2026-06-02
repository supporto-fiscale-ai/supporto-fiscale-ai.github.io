# AI Professionisti - Frontend (Web)

Questo progetto contiene l'interfaccia utente (HTML, CSS, JS) per interagire con l'assistente legale AI.
L'architettura è basata su file statici ("Vanilla") per poter essere caricata gratuitamente e con zero manutenzione su **GitHub Pages**.

## Struttura
- `index.html`: La pagina di Login.
- `chat.html`: L'interfaccia principale dell'assistente, che comunicherà con le API REST protette.
- `js/api.js` (o logica interna): Gestisce l'invio delle chiamate (fetch) al server e l'autenticazione JWT.
- `js/config.js`: Contiene l'URL del backend.

## Configurazione Collegamento (Automatica tramite Gist)
Dato che il backend gira in locale e il suo indirizzo Cloudflare cambia ad ogni riavvio, abbiamo implementato un sistema di "scoperta" automatica dell'indirizzo:

1. Sul backend gira uno script (`start_tunnel.py`) che lancia Cloudflare e pubblica il link appena generato su un file segreto su GitHub (un **Gist**).
2. All'avvio, questo frontend legge il file `js/config.js`, che contiene il link fisso al Gist.
3. Il frontend scarica il Gist, scopre qual è l'URL di Cloudflare del giorno e configura in automatico tutte le chiamate API senza richiedere il tuo intervento.

**Non dovrai più modificare `config.js` né fare commit ogni volta che riavvii il server locale!**

## Sicurezza e Deploy
- **Non inserire MAI password** all'interno di questi file HTML/JS, perché una volta pubblicati su GitHub Pages il codice sorgente sarà visibile a chiunque sappia usare "Ispeziona Elemento".
- Il login viene gestito chiedendo all'utente username e password. La pagina invia i dati al backend, riceve un **Token JWT** segreto e lo salva temporaneamente nel browser (`sessionStorage`).
- Il token garantisce che solo chi possiede le vere credenziali possa usare la tua intelligenza artificiale.

## Nuove Funzionalità dell'Interfaccia
- **Pulsante Nuova Chat**: Permette di ripulire istantaneamente lo schermo e di avviare una nuova sessione. Invia anche un segnale al server per uccidere eventuali processi pendenti della vecchia chat.
- **Pulsante Stop Risposta**: Appare dinamicamente durante la generazione dell'AI e permette all'utente di bloccare la scrittura e il calcolo sulla GPU in tempo reale.

## Comandi Rapidi Git (Push su GitHub Pages)
Per mandare online il sito:
```bash
git add .
git commit -m "Aggiornamento frontend"
git push origin main
```
Dopo qualche minuto, le modifiche saranno visibili sul tuo link GitHub Pages pubblico.

questo il link pubblico:  https://supporto-fiscale-ai.github.io/
