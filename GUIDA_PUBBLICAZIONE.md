# The Publican → app vera per Android (e poi iPhone)
Identificativo dell'app: **it.chriszimbu.publican** (non si può più cambiare dopo la pubblicazione)

## Cosa c'è qui e cosa è stato provato
- Il gioco (identico a quello su GitHub Pages) impacchettato come app con Capacitor 8.
- Pubblicità vere (Google AdMob: video con premio, interstitial, finestra del consenso GDPR, permesso di tracciamento su iPhone) e acquisto vero "Rimuovi pubblicità" (Google Play / App Store).
- Compilazione automatica su GitHub (Android, chiave di firma, iPhone/TestFlight), informativa privacy, testi dello store in 4 lingue.
- **Provato qui:** la logica delle pubblicità e degli acquisti con plugin finti (tutti i casi: annullato, errore, nessun annuncio, consenso negato, ripristino), il gioco nelle due modalità, gli script di preparazione.
- **NON provato qui:** la compilazione vera e i plugin su un telefono. Il mio ambiente non può scaricare i pacchetti né compilare app. La prima compilazione su GitHub potrebbe dare errori: succede spesso. Mandami lo screenshot o il testo dell'errore e lo correggo.

## Passo 1 · Gli account (fai subito Google Play, richiede più tempo)
1. **Google Play Console** (play.google.com/console): pagamento unico circa 25 $, account "Personale", verifica documento e telefono. Dopo l'apertura, per un account personale nuovo Google chiede un test chiuso con almeno 12 tester per 14 giorni prima della pubblicazione (controlla la regola nella Console).
2. **AdMob** (admob.google.com): gratuito, con dati fiscali e di pagamento. Il conto per incassare lo configuri lì.
3. **Apple Developer** (developer.apple.com/programs): circa 99 €/anno. Serve solo per la fase iPhone.

## Passo 2 · Repository PRIVATO su GitHub
1. github.com → **+** → *New repository* → nome `publican-app` → **Private** (importante: la chiave di firma sarà in un allegato del repository) → *Create*.

## Passo 3 · Carica i file
1. Sull'iPhone apri lo zip nell'app **File** (tocca lo zip: si scompatta).
2. Nel repository: **Add file → Upload files** → scegli **tutti i file** della cartella (sono tutti "piatti", niente cartelle) → *Commit changes*.
3. `privacy.html`: caricalo anche nel repository **appgame** (quello del gioco). Diventa `https://christiancolnago.github.io/appgame/privacy.html`.

## Passo 4 · Il file che avvia la compilazione
1. Nel repository `publican-app`: **Add file → Create new file**.
2. Nel nome scrivi esattamente: `.github/workflows/build.yml` (le barre creano le cartelle).
3. Apri `workflow-build.yml` dalla cartella dello zip, copia tutto il testo e incollalo → *Commit changes*.

## Passo 5 · Prima prova (annunci finti di Google, nessun rischio)
1. Scheda **Actions** → *Compila app* → **Run workflow** → scegli `android-prova` → *Run*.
2. Dopo circa 10 minuti, se è verde, scarica l'allegato *the-publican-apk-prova* (è un .apk da installare su un telefono Android; serve un telefono Android).
3. Se è rosso: aprilo, copia le ultime righe dell'errore e mandale a me.

## Passo 6 · La chiave di firma Android (si fa UNA volta)
1. Actions → *Run workflow* → `crea-chiave-android`.
2. Scarica l'allegato *chiave-android-DA-CONSERVARE* e **salva una copia di `upload.jks` e della password in un posto sicuro** (iCloud Drive o altro). Senza si può recuperare solo tramite il supporto Google.
3. Repository → **Settings → Secrets and variables → Actions → New repository secret**, tre volte:
   - `ANDROID_KEYSTORE_B64` = contenuto del file `1-ANDROID_KEYSTORE_B64.txt`
   - `ANDROID_KEYSTORE_PASSWORD` = contenuto di `2-ANDROID_KEYSTORE_PASSWORD.txt`
   - `ANDROID_KEY_ALIAS` = `upload`

## Passo 7 · Metti le pubblicità vere
1. In AdMob: **App → Aggiungi app** (Android, non ancora pubblicata va bene). Copia l'**ID app** (ca-app-pub-…~…).
2. Crea due blocchi annunci: **Con premio** (rewarded) e **Interstitial**. Copia i due ID (ca-app-pub-…/…).
3. Su GitHub apri `app.config.json` (icona matita) e cambia: `"testMode": false`, `androidAppId`, `android.rewarded`, `android.interstitial`. Lascia gli ID iOS di prova finché non fai la fase iPhone. *Commit changes*.
4. Mentre sviluppi non toccare mai le tue pubblicità vere: i clic su annunci veri del proprietario violano le regole AdMob. Con `testMode: true` sei al sicuro.
5. Nelle impostazioni di AdMob (Blocco annunci → Categorie sensibili) valuta se bloccare categorie di annunci inadatte a un pubblico di bevitori adulti.

## Passo 8 · Play Console
1. **Crea app** → nome *The Publican - Perfect Pour*, gioco, gratuita.
2. Compila: scheda dello store (testi in `STORE_TESTI.md`, più icona 512, immagine in evidenza 1024×500 e almeno 2 screenshot del telefono che fai tu dal gioco), informativa privacy (URL del passo 3), classificazione dei contenuti, sicurezza dei dati, pubblico (adulti), annunci = sì. Risposte suggerite in fondo a `STORE_TESTI.md`.
3. Actions → *Run workflow* → `android-store` → scarica *the-publican-aab-per-google-play* (file .aab).
4. Play Console → **Test → Test chiuso → Crea release** → carica il .aab → salva.
5. **Prodotti → Prodotti in-app → Crea prodotto**: ID `remove_ads`, nome "Rimuovi pubblicità", prezzo (es. 3,99 €), attivo. (Serve aver già caricato un .aab e il profilo pagamenti completato.)
6. **Testers**: aggiungi 12 o più indirizzi Gmail (amici, clienti del pub), manda loro il link di partecipazione; devono accettare e tenere l'app per 14 giorni.
7. Dopo i 14 giorni: **Richiedi accesso alla produzione** e invia per la revisione.

## Passo 9 · Aggiornare l'app in futuro
Cambia i file su GitHub (per il gioco: `index.html`; per la versione: `versionName` in `app.config.json`) → *Run workflow* → `android-store` → carica il nuovo .aab in Play Console. Il numero di versione tecnico cresce da solo a ogni compilazione.

## Fase iPhone (dopo Android)
Il tuo Mac del 2012 non può usare Xcode 26 (obbligatorio per Apple): la compilazione si fa su GitHub, su un Mac nel cloud.
1. In **App Store Connect** → Utenti e accessi → **Chiavi** → crea una chiave API (ruolo *App Manager* o Admin). Scarica il file `.p8` (si scarica una volta sola), annota *Key ID* e *Issuer ID*. Annota anche il tuo *Team ID* (Account → Appartenenza).
2. Crea in App Store Connect la scheda dell'app con identificativo `it.chriszimbu.publican` e il prodotto in-app `remove_ads`.
3. Su AdMob aggiungi l'app iOS e metti i suoi ID in `app.config.json`.
4. Secrets GitHub: `ASC_KEY_P8` (testo del file .p8), `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`.
5. Actions → `iphone`. Il build arriva in TestFlight; da lì provi e poi invii alla revisione.
Nota: Apple può rifiutare le app che sono solo un sito impacchettato. Qui ci sono funzioni native vere (pubblicità, acquisti, consenso, sensori): è un buon punto di partenza, ma la revisione è sua.

## Cose da ricordare
- Il costo: Play circa 25 $ una tantum, Apple circa 99 €/anno. Compilare su GitHub (repository privato) ha un limite mensile gratuito; per iPhone il tempo conta di più.
- Tieni al sicuro `upload.jks`.
- Se cambi il prezzo o la regola degli annunci non serve ricompilare: i prezzi si cambiano negli store.
