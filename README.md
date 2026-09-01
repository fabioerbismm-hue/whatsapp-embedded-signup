# Collega WhatsApp Business

Pagina statica per avviare il flusso ufficiale Meta WhatsApp Embedded Signup in modalità
WhatsApp Business App Coexistence e inoltrarne il risultato a n8n. Non contiene segreti,
token né uno scambio client-side del codice OAuth.

## Verifica della documentazione (2 settembre 2026)

L'implementazione segue la documentazione ufficiale Meta per [Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview)
e [onboarding degli utenti WhatsApp Business App / Coexistence](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users).
Il parametro Coexistence documentato è ancora `featureType: "whatsapp_business_app_onboarding"`,
con `sessionInfoVersion: "3"`. Facebook Login for Business restituisce un codice usando
`response_type: "code"` e `override_default_response_type: true`. Il listener accetta solo
`WA_EMBEDDED_SIGNUP` e gli eventi documentati `FINISH`, `CANCEL` ed `ERROR`. È impostata
Graph API `v26.0`, versione corrente pubblicata da Meta il 29 luglio 2026. La configurazione
deve essere creata/aggiornata nell'Embedded Signup Builder (v4) di Meta.

## Configurazione n8n

Apri `app.js` e sostituisci:

```js
const N8N_CALLBACK_URL = 'INSERIRE_WEBHOOK_N8N';
```

con l'URL **HTTPS di produzione** del nuovo webhook n8n. Il webhook deve accettare `POST`
JSON, rispondere con uno status HTTP 2xx e consentire via CORS l'origine GitHub Pages.
Non usare la vecchia callback `/webhook/whatsapp-embedded-`. Lo scambio del codice con un
access token, che richiede l'App Secret, deve avvenire esclusivamente in n8n/backend.

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository GitHub, per esempio `whatsapp-connect`, senza aggiungere file.
2. Copia nella radice del nuovo repository i file di questa cartella.
3. Esegui `git init`, `git add .`, `git commit -m "Add WhatsApp Embedded Signup"`, aggiungi
   il remote indicato da GitHub e fai push sul branch `main`.
4. In GitHub apri **Settings → Pages**. In **Build and deployment** scegli **Deploy from a
   branch**, branch `main`, cartella `/(root)`, quindi **Save**.
5. L'URL sarà `https://NOME-UTENTE.github.io/NOME-REPOSITORY/` (oppure
   `https://NOME-UTENTE.github.io/` per un repository chiamato `NOME-UTENTE.github.io`).

## Configurazione Meta

Nel pannello dell'app Meta inserisci il dominio esatto `NOME-UTENTE.github.io` in
**Domini consentiti per l'SDK JavaScript** (senza protocollo e senza percorso). Se la
configurazione richiede URI OAuth, aggiungi l'URL completo della pagina, incluso percorso e
slash finale, per esempio `https://NOME-UTENTE.github.io/whatsapp-connect/`. Verifica inoltre
che il Configuration ID `1719559519101385` sia una configurazione Facebook Login for
Business/Embedded Signup v4 abilitata per WhatsApp e Coexistence e associata all'App ID
`4260497577614215`.

## Test

1. Pubblica la pagina e configura webhook, dominio e URI in Meta.
2. Apri l'URL GitHub Pages via HTTPS e attendi lo stato **Pronto**.
3. Premi **COLLEGA WHATSAPP** e completa il popup con un account/numero idoneo a Coexistence.
4. Verifica in n8n la ricezione del codice e dei soli campi sessione effettivamente forniti
   da Meta. Il codice non viene mostrato, registrato o salvato nel browser.
5. In modalità sviluppo possono completare il test solo gli utenti con un ruolo nell'app;
   per clienti reali servono modalità Live, requisiti del Business e permessi approvati.

> GitHub Pages può ospitare solo il frontend: n8n resta necessario per custodire l'App
> Secret, scambiare immediatamente il codice e completare le operazioni server-side previste.
