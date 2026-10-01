# NEXXO Enterprise Network - GitHub CI/CD & Android APK Guide

यह गाइड आपको अपना कोड GitHub पर पुश करने और GitHub Actions से ऑटोमैटिक Android APK डाउनलोड करने की पूरी प्रक्रिया समझाती है।

---

## 1. गिट रिपॉजिटरी स्थिति (Current Git Status)

- **Local Git Repository**: पहले से इनिशियलाइज़ (`git init`) और कमिटेड है।
- **Branch**: `main`
- **CI/CD Workflow**: `.github/workflows/build-apk.yml` पूरी तरह कॉन्फ़िगर है (Node.js 20, Java JDK 21, Android SDK, Capacitor Sync, Gradle Assemble Debug/Release)।

---

## 2. GitHub पर अपना कोड कैसे पुश करें (Step-by-Step Push Instructions)

यदि आपने GitHub पर नया खाली रिपॉजिटरी (Repository) बना रखा है (उदा. `nexxo-enterprise`), तो केवल ये 2 कमांड्स चलाएं:

```bash
# 1. अपने GitHub रिपॉजिटरी का URL सेट करें (YOUR_USERNAME और REPO_NAME बदलें)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 2. कोड को main ब्रांच पर पुश करें
git push -u origin main
```

---

## 3. GitHub Actions से APK कैसे डाउनलोड करें (How to Download APK)

1. अपने GitHub रिपॉजिटरी पर जाएं।
2. ऊपर **Actions** टैब पर क्लिक करें।
3. बाईं तरफ **Build NEXXO Android APK** वर्कफ़्लो दिखेगा।
   - कोड पुश होते ही यह ऑटोमैटिक शुरू हो जाता है।
   - आप **Run workflow** बटन दबाकर कभी भी मैन्युअली भी APK बिल्ड कर सकते हैं (Debug या Release चुनकर)।
4. बिल्ड सफल (हरा टिक ✅) होने पर उस रन पर क्लिक करें।
5. नीचे **Artifacts** सेक्शन में जाएं:
   - **`NEXXO-Android-Debug-v1.0`** पर क्लिक करें।
   - ज़िप फ़ाइल डाउनलोड होगी, जिसे अनज़िप करने पर आपको सीधा `app-debug.apk` मिल जाएगा!

---

## 4. इन-ऐप यूज़र्स के लिए APK डाउनलोड लिंक सेट करना

जब आपका APK GitHub Release या किसी होस्टिंग पर अपलोड हो जाए:
1. NEXXO ऐप में **Admin Panel** (`/admin`) खोलें।
2. **Platform Settings** टैब में जाएं।
3. **Android Mobile APK Distribution** सेक्शन में:
   - **Android APK Download URL**: अपना डायरेक्ट APK डाउनलोड लिंक पेस्ट करें।
   - **Android Version**: जैसे `v1.0.0 (Official Build)`.
4. **Save Settings** पर क्लिक करें।
5. अब ऐप के अंदर कोई भी यूज़र जब **Download APK** पर क्लिक करेगा या QR कोड स्कैन करेगा, तो सीधे आपकी नई APK डाउनलोड होगी!
