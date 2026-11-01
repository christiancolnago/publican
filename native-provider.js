/* native-provider.js
   Provider REALE di pubblicità (AdMob) e acquisti (Google Play / App Store) per l'app nativa.
   Implementa la stessa interfaccia del TestProvider del gioco.
   Non importa nulla: riceve le dipendenze (plugin Capacitor) da native-entry.js. Così si può provare con dei finti plugin. */
(function (g) {
  'use strict';
  const BB = (g.BB = g.BB || {});

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  BB.createNativeProvider = function (deps) {
    const { AdMob, store, ProductType, Platform, ErrorCode, platform, config } = deps;
    const ev = Object.assign({
      rewReward: 'onRewardedVideoAdReward', rewDismissed: 'onRewardedVideoAdDismissed', rewFailedShow: 'onRewardedVideoAdFailedToShow',
      intShowed: 'onInterstitialAdShowed', intDismissed: 'onInterstitialAdDismissed', intFailedShow: 'onInterstitialAdFailedToShow',
    }, deps.events || {});
    const testMode = !!config.testMode;
    const ids = (config.ids && config.ids[platform]) || {};
    const productId = config.removeAdsProductId || 'remove_ads';
    const storePlatform = platform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

    class NativeProvider {
      constructor() {
        this.isTest = false;
        this.adsReady = false;
        this.storeReady = false;
        this.consentInfo = null;
        this.canShowPrivacy = false;
        this.onOwnedChange = null;
        this._init = null;
        this._lastOwned = false;
      }

      // ---------- avvio: consenso, tracciamento, SDK pubblicità, store ----------
      initialize() {
        if (!this._init) this._init = this._doInit();
        return this._init;
      }
      async _doInit() {
        // 1) iPhone: richiesta di tracciamento (ATT)
        if (platform === 'ios') {
          try {
            await sleep(800); // la finestra va mostrata ad app attiva
            const s = await AdMob.trackingAuthorizationStatus();
            if (s && s.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
          } catch (e) { /* senza risposta si va avanti: gli annunci non personalizzati restano possibili */ }
        }
        // 2) consenso GDPR (UMP di Google)
        let canRequest = true;
        try {
          let info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false });
          this.consentInfo = info;
          if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') {
            const after = await AdMob.showConsentForm();
            if (after) info = after;
            this.consentInfo = info;
          }
          if (info && info.canRequestAds === false) canRequest = false;
          this.canShowPrivacy = !!(info && info.isConsentFormAvailable);
        } catch (e) { /* se il consenso non è determinabile gli annunci restano spenti solo se il SDK lo rifiuta */ }
        // 3) SDK pubblicità
        if (canRequest) {
          try { await AdMob.initialize({ initializeForTesting: testMode }); this.adsReady = true; } catch (e) { this.adsReady = false; }
        }
        this.preloadInterstitial();
        // 4) acquisti
        try { await this._initStore(); } catch (e) { this.storeReady = false; }
      }

      async _initStore() {
        if (!store) return;
        store.register([{ id: productId, type: ProductType.NON_CONSUMABLE, platform: storePlatform }]);
        const check = () => {
          const o = this.ownsRemoveAds();
          if (o !== this._lastOwned) { this._lastOwned = o; if (o && typeof this.onOwnedChange === 'function') { try { this.onOwnedChange(); } catch (e) {} } }
        };
        store.when().approved((tr) => { try { tr.finish(); } catch (e) {} });
        store.when().finished(check);
        store.when().productUpdated(check);
        store.when().receiptUpdated(check);
        if (store.error) store.error(() => {});
        await store.initialize([storePlatform]);
        this.storeReady = true;
        check();
      }

      ownsRemoveAds() { try { return !!(store && store.owned(productId)); } catch (e) { return false; } }
      priceRemoveAds() {
        try { const p = store && store.get(productId, storePlatform); return (p && p.pricing && p.pricing.price) || ''; } catch (e) { return ''; }
      }

      // ---------- pubblicità ----------
      _listen(handles, name, fn) {
        return Promise.resolve(AdMob.addListener(name, fn)).then((h) => { if (h) handles.push(h); }).catch(() => {});
      }
      async showRewarded() {
        await this.initialize();
        if (!this.adsReady || !ids.rewarded) return { status: 'unavailable' };
        try { await AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: testMode }); } catch (e) { return { status: 'unavailable' }; }
        return new Promise((resolve) => {
          let rewarded = false, settled = false;
          const handles = [];
          let timer = null;
          const finish = (st) => {
            if (settled) return; settled = true; clearTimeout(timer);
            handles.forEach((h) => { try { h.remove(); } catch (e) {} });
            resolve({ status: st });
          };
          timer = setTimeout(() => finish(rewarded ? 'completed' : 'error'), 300000);
          (async () => {
            await this._listen(handles, ev.rewReward, () => { rewarded = true; });
            await this._listen(handles, ev.rewDismissed, () => finish(rewarded ? 'completed' : 'dismissed'));
            await this._listen(handles, ev.rewFailedShow, () => finish('error'));
            try {
              const r = await AdMob.showRewardVideoAd();
              if (r && (r.amount !== undefined || r.type !== undefined)) rewarded = true;
            } catch (e) { finish('error'); }
          })();
        });
      }
      async showInterstitial() {
        await this.initialize();
        if (!this.adsReady || !ids.interstitial) return { status: 'unavailable' };
        if (!this._intReady) {
          try { await withTimeout(AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testMode }), 5000); } catch (e) { return { status: 'unavailable' }; }
        }
        this._intReady = false;
        return new Promise((resolve) => {
          let shown = false, settled = false;
          const handles = [];
          let timer = null;
          const finish = (st) => {
            if (settled) return; settled = true; clearTimeout(timer);
            handles.forEach((h) => { try { h.remove(); } catch (e) {} });
            this.preloadInterstitial(); // prepara già il prossimo
            resolve({ status: st });
          };
          timer = setTimeout(() => finish(shown ? 'shown' : 'error'), 120000);
          (async () => {
            await this._listen(handles, ev.intShowed, () => { shown = true; });
            await this._listen(handles, ev.intDismissed, () => finish('shown'));
            await this._listen(handles, ev.intFailedShow, () => finish('error'));
            try { await AdMob.showInterstitial(); } catch (e) { finish('error'); }
          })();
        });
      }
      // prepara in anticipo l'annuncio di fine livello, così al tocco di "Continua" parte subito
      preloadInterstitial() {
        if (!this.adsReady || !ids.interstitial || this._intReady || this._intLoading) return;
        this._intLoading = true;
        Promise.resolve(AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testMode }))
          .then(() => { this._intReady = true; }).catch(() => {}).then(() => { this._intLoading = false; });
      }
      async showPrivacyOptions() {
        await this.initialize();
        if (!this.canShowPrivacy) return { status: 'unavailable' };
        try { await AdMob.showConsentForm(); return { status: 'shown' }; } catch (e) { return { status: 'error' }; }
      }

      // ---------- acquisti ----------
      async purchaseRemoveAds() {
        await this.initialize();
        if (!this.storeReady) return { status: 'unavailable' };
        if (this.ownsRemoveAds()) return { status: 'purchased' };
        let offer = null;
        try { const p = store.get(productId, storePlatform); offer = p && p.getOffer && p.getOffer(); } catch (e) {}
        if (!offer) return { status: 'unavailable' };
        let err;
        try { err = offer.order ? await offer.order() : await store.order(offer); } catch (e) { return { status: 'error' }; }
        if (err) {
          if (ErrorCode && err.code === ErrorCode.PAYMENT_CANCELLED) return { status: 'cancelled' };
          if (this.ownsRemoveAds()) return { status: 'purchased' };
          return { status: 'error' };
        }
        // ordine avviato: si attende la conferma dello store (fino a 3 minuti)
        for (let i = 0; i < 360; i++) {
          if (this.ownsRemoveAds()) return { status: 'purchased' };
          await sleep(500);
        }
        return { status: 'cancelled' };
      }
      async restorePurchases() {
        await this.initialize();
        if (!this.storeReady) return { status: 'unavailable' };
        try {
          const err = await store.restorePurchases();
          if (err) return { status: 'error' };
        } catch (e) { return { status: 'error' }; }
        for (let i = 0; i < 6; i++) { if (this.ownsRemoveAds()) break; await sleep(500); }
        return this.ownsRemoveAds() ? { status: 'restored', adsRemoved: true } : { status: 'none' };
      }
    }
    return new NativeProvider();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
