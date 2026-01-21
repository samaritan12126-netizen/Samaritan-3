
# THE SAMARITAN // ALGORITHMIC TRADING INTELLIGENCE
**Version:** 1.5
**Codename:** CORTEX

## 1. SYSTEM OVERVIEW
The Samaritan is a high-performance React application designed for forensic market analysis, backtesting, and trading psychology optimization. It integrates a local "Neural Database" (IndexedDB) with a "Hydra" architecture (multi-model AI support) to provide institutional-grade insights.

## 2. DEPLOYMENT PROTOCOLS

### OPTION A: CLOUD (Vercel/Netlify) - Easiest
1. Download code.
2. Push to GitHub.
3. Connect Vercel to GitHub repo.
4. Add Environment Variable: `API_KEY`.

### OPTION B: TERMUX (Android Native) - Best Performance
Turns your device into the server. Zero latency.

**1. Install Termux (F-Droid Version ONLY)**
Do not use Play Store. Run:
```bash
pkg update && pkg upgrade
pkg install nodejs git
termux-setup-storage
```

**2. Install App**
Download the project ZIP to your phone's Downloads folder. Rename folder to `samaritan`.
```bash
cp -r /sdcard/Download/samaritan ~/
cd ~/samaritan
npm install
```

**3. Launch**
```bash
export API_KEY="your_key_here"
npm run host
```

**4. Connect**
Open Chrome: `http://localhost:5173`
Tap Menu -> "Add to Home Screen".

## 3. NATIVE APP CONVERSION (THE CLOUD FACTORY)
**Method: GitHub Actions (No PC Required)**

Since running Android Studio on a phone is infeasible, we use the Cloud Factory method.

1.  **Push Code:** Push this entire project to a GitHub Repository.
    ```bash
    git add .
    git commit -m "Deploy Cortex"
    git push
    ```
2.  **Wait:** Go to your repository on GitHub.com -> Click the **"Actions"** tab.
3.  **Monitor:** You will see a workflow named **"Build Samaritan APK"** running (Yellow dot).
4.  **Download:**
    *   When it turns Green (Success), click on the workflow run.
    *   Scroll down to the **"Artifacts"** section.
    *   Click **"Samaritan-Debug-APK"** to download the zip.
5.  **Install:** Extract the zip and install `app-debug.apk` on your phone.

*Note: You may need to enable "Install from Unknown Sources" on your phone.*

---
*Verified by The Samaritan Protocol.*
