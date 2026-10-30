// Dopo "npx cap add android": orientamento verticale, ID AdMob, permesso ID pubblicitario, versione.
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('app.config.json', 'utf8'));
const mf = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(mf, 'utf8');

if (!m.includes('com.google.android.gms.ads.APPLICATION_ID')) {
  m = m.replace(/<application([^>]*)>/, (all) => all + `\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${cfg.admob.androidAppId}"/>`);
}
if (!/screenOrientation/.test(m)) m = m.replace(/<activity\b/, '<activity android:screenOrientation="portrait"');
if (!m.includes('permission.AD_ID')) m = m.replace(/<\/manifest>/, '    <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>\n</manifest>');
if (!m.includes('android.permission.INTERNET')) m = m.replace(/<\/manifest>/, '    <uses-permission android:name="android.permission.INTERNET"/>\n</manifest>');
fs.writeFileSync(mf, m);


// Margini di sicurezza: l'app (Android 15+) disegna sotto la barra di stato e quella dei gesti.
// Qui il margine viene applicato in modo nativo, così funziona su ogni telefono e versione del WebView.
const pkgPath = cfg.appId.split('.').join('/');
const javaDir = 'android/app/src/main/java/' + pkgPath;
fs.mkdirSync(javaDir, { recursive: true });
fs.writeFileSync(javaDir + '/MainActivity.java', `package ${cfg.appId};

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        final View root = findViewById(android.R.id.content);
        root.setBackgroundColor(Color.parseColor("#0f1613"));
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), root);
        if (c != null) { c.setAppearanceLightStatusBars(false); c.setAppearanceLightNavigationBars(false); }
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(root);
    }

    @Override
    public void onResume() {
        super.onResume();
        ViewCompat.requestApplyInsets(findViewById(android.R.id.content));
    }
}
`);
console.log('MainActivity scritta in', javaDir);

const gf = 'android/app/build.gradle';
let gr = fs.readFileSync(gf, 'utf8');
const code = process.env.VERSION_CODE || '1';
gr = gr.replace(/versionCode\s+\d+/, 'versionCode ' + code).replace(/versionName\s+"[^"]*"/, 'versionName "' + cfg.versionName + '"');
fs.writeFileSync(gf, gr);

const vf = 'android/variables.gradle';
if (fs.existsSync(vf)) {
  const v = fs.readFileSync(vf, 'utf8');
  const t = /targetSdkVersion\s*=\s*(\d+)/.exec(v);
  console.log('targetSdkVersion =', t && t[1]);
  if (!t || Number(t[1]) < 36) { console.error('ATTENZIONE: Google Play richiede targetSdk 36 o più'); process.exitCode = 1; }
}
console.log('Android pronto: versionCode', code, 'versionName', cfg.versionName);
