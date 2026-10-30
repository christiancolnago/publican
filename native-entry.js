// Punto d'ingresso dell'app nativa: collega i plugin veri al provider. Viene "impacchettato" in www/native.js da prepare.mjs.
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { store, ProductType, Platform, ErrorCode } from 'capacitor-plugin-cdv-purchase';
import './native-provider.js';

if (Capacitor.isNativePlatform()) {
  const g = globalThis;
  g.BB = g.BB || {};
  if (Capacitor.getPlatform() === 'android') {
    const st = document.documentElement.style;
    ['top', 'bottom', 'left', 'right'].forEach((k) => st.setProperty('--safe-area-inset-' + k, '0px'));
  }
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
