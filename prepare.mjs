// Prepara la cartella www/ (il gioco + codice nativo) e le immagini per icone e splash.
// Uso: node prepare.mjs   (lo lancia da solo il workflow GitHub)
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const cfg = JSON.parse(fs.readFileSync('app.config.json', 'utf8'));
const must = (f) => { if (!fs.existsSync(f)) throw new Error('File mancante: ' + f); };
['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'native-entry.js', 'native-provider.js'].forEach(must);

fs.rmSync('www', { recursive: true, force: true });
fs.mkdirSync('www', { recursive: true });
for (const f of ['manifest.webmanifest', 'icon-192.png', 'icon-512.png']) fs.copyFileSync(f, path.join('www', f));

// configurazione letta dal gioco
const nativeCfg = { versionName: cfg.versionName, testMode: !!cfg.testMode, removeAdsProductId: cfg.removeAdsProductId, ids: { android: cfg.admob.android, ios: cfg.admob.ios } };
const tag = '<script>window.BB_NATIVE_CONFIG=' + JSON.stringify(nativeCfg) + ';</script>\n<script src="native.js"></script>\n';
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('</head>')) throw new Error('index.html senza </head>');
html = html.replace('</head>', tag + '</head>');
fs.writeFileSync('www/index.html', html);

await build({ entryPoints: ['native-entry.js'], bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: 'www/native.js', logLevel: 'info' });

// immagini per @capacitor/assets (icone e schermata iniziale)
fs.mkdirSync('assets', { recursive: true });
const map = { 'icon-1024.png': 'icon-only.png', 'icon-foreground.png': 'icon-foreground.png', 'icon-background.png': 'icon-background.png', 'splash.png': 'splash.png', 'splash-dark.png': 'splash-dark.png' };
for (const [src, dst] of Object.entries(map)) { must(src); fs.copyFileSync(src, path.join('assets', dst)); }

// capacitor.config allineato alla configurazione
const cc = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
cc.appId = cfg.appId; cc.appName = cfg.appName;
fs.writeFileSync('capacitor.config.json', JSON.stringify(cc, null, 2));
console.log('Preparato www/ per', cfg.appId, cfg.testMode ? '(annunci di PROVA)' : '(annunci REALI)');
if (!cfg.testMode && /3940256099942544/.test(JSON.stringify(cfg.admob))) throw new Error('testMode è false ma ci sono ancora i codici di prova di Google in app.config.json');
