// Dopo "npx cap add ios": ID AdMob, permesso di tracciamento, verticale, nessuna domanda sulla crittografia.
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('app.config.json', 'utf8'));
const pf = 'ios/App/App/Info.plist';
let p = fs.readFileSync(pf, 'utf8');
const add = (key, xml) => { if (!p.includes('<key>' + key + '</key>')) p = p.replace(/<\/dict>\s*<\/plist>/, `\t<key>${key}</key>\n\t${xml}\n</dict>\n</plist>`); };
add('GADApplicationIdentifier', `<string>${cfg.admob.iosAppId}</string>`);
add('NSUserTrackingUsageDescription', '<string>Usiamo l\'identificativo pubblicitario solo per mostrarti annunci più pertinenti. Puoi dire di no: il gioco funziona uguale. / We use the advertising identifier only to show you more relevant ads. You can say no: the game works the same.</string>');
add('ITSAppUsesNonExemptEncryption', '<false/>');
add('SKAdNetworkItems', '<array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>');
// verticale su iPhone e iPad
p = p.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2');
p = p.replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>)[\s\S]*?(<\/array>)/, '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2');
fs.writeFileSync(pf, p);
console.log('iOS pronto');
