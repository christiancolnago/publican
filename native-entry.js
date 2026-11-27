// Punto d'ingresso dell'app nativa: collega i plugin veri al provider. Viene "impacchettato" in www/native.js da prepare.mjs.
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { store, ProductType, Platform, ErrorCode } from 'capacitor-plugin-cdv-purchase';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import './native-provider.js';

if (Capacitor.isNativePlatform()) {
  const g = globalThis;
  g.BB = g.BB || {};
  if (Capacitor.getPlatform() === 'android') {
    const st = document.documentElement.style;
    ['top', 'bottom', 'left', 'right'].forEach((k) => st.setProperty('--safe-area-inset-' + k, '0px'));
  }
  // avvisa il gioco quando l'app va in secondo piano (pausa, musica ferma) o torna in primo piano
  try { App.addListener('appStateChange', (s) => { document.dispatchEvent(new CustomEvent('bb-appstate', { detail: { active: !!s.isActive } })); }); } catch (err) {}
  // condivisione vera (WhatsApp, Telegram, ecc.): immagine del risultato + testo con il link; se l'immagine non va, solo testo
  g.BB.nativeShare = async ({ text, url, pngBase64, title }) => {
    const gone = (e) => /cancel|dismiss|abort/i.test(String((e && (e.message || e.errorMessage)) || e));
    if (pngBase64) {
      try {
        const f = await Filesystem.writeFile({ path: 'the-publican.png', data: pngBase64, directory: Directory.Cache });
        await Share.share({ text: text + ' ' + url, files: [f.uri], dialogTitle: title || '' });
        return 'shared';
      } catch (e) { if (gone(e)) return 'cancel'; }
    }
    try { await Share.share({ text, url, dialogTitle: title || '' }); return 'shared'; } catch (e) { return gone(e) ? 'cancel' : 'fail'; }
  };
  const cfg = g.BB_NATIVE_CONFIG || {};
  g.BB.nativeProvider = g.BB.createNativeProvider({
    AdMob, store, ProductType, Platform, ErrorCode,
    platform: Capacitor.getPlatform(), // 'android' | 'ios'
    config: cfg,
    events: {
      rewReward: RewardAdPluginEvents.Rewarded,
      rewDismissed: RewardAdPluginEvents.Dismissed,
      rewFailedShow: RewardAdPluginEvents.FailedToShow,
      intShowed: InterstitialAdPluginEvents.Showed,
      intDismissed: InterstitialAdPluginEvents.Dismissed,
      intFailedShow: InterstitialAdPluginEvents.FailedToShow,
    },
  });
}
