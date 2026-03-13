# TrustPay KE - Mobile & Desktop Apps

This directory contains the source code for the TrustPay KE mobile and desktop applications.

## Project Structure

```
trustpay-ke/
├── android-app/          # Android WebView App (APK)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/trustpay/ke/
│   │   │   │   └── MainActivity.java
│   │   │   ├── res/
│   │   │   │   ├── drawable/
│   │   │   │   ├── layout/
│   │   │   │   ├── mipmap-*/
│   │   │   │   └── values/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle.properties
│
├── electron-app/         # Windows Desktop App (Electron)
│   ├── assets/
│   │   ├── icon.svg
│   │   └── icon.ico
│   ├── main.js
│   ├── preload.js
│   ├── no-internet.html
│   └── package.json
│
└── README.md
```

## Building the Android App (APK)

### Prerequisites
- Android Studio (latest version)
- Java Development Kit (JDK) 17 or higher
- Android SDK with API 34

### Steps

1. **Open the project in Android Studio**
   ```
   Open Android Studio → File → Open → Select android-app folder
   ```

2. **Sync Gradle**
   - Android Studio will automatically sync the Gradle files
   - If not, click "Sync Now" in the notification bar

3. **Build the APK**
   - In Android Studio, go to: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   - Or press `Ctrl+Shift+F10` (Windows/Linux) / `Ctrl+R` (Mac)

4. **Locate the APK**
   - The APK will be generated at: `android-app/app/build/outputs/apk/debug/app-debug.apk`

### Running on a Device

1. Enable Developer Options on your Android device
2. Connect your device via USB
3. In Android Studio, select your device from the device dropdown
4. Click the "Run" button (green arrow)

---

## Building the Windows Desktop App (EXE)

### Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)

### Steps

1. **Navigate to the Electron app directory**
   ```bash
   cd electron-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm start
   ```

4. **Build the EXE**
   ```bash
   npm run build
   ```

5. **Locate the EXE**
   - The installer will be at: `electron-app/dist/TrustPay KE Setup 1.0.0.exe`
   - The portable EXE will be at: `electron-app/dist/win-unpacked/TrustPay KE.exe`

### Running the Built App

- Double-click `TrustPay KE.exe` in the `win-unpacked` folder
- Or run the installer from the `dist` folder

---

## App Features

### Android App
- ✅ Secure WebView loading
- ✅ Splash screen with branding
- ✅ No internet connection handling
- ✅ Zoom disabled
- ✅ No external browser navigation
- ✅ Login/forms work normally

### Windows Desktop App
- ✅ Secure WebView loading
- ✅ Splash screen with branding
- ✅ No internet connection handling
- ✅ Zoom disabled
- ✅ No external browser navigation
- ✅ Login/forms work normally

---

## Configuration

### Change Website URL

**Android (MainActivity.java - line 8):**
```java
private static final String WEBSITE_URL = "https://trustpay.co.ke/";
```

**Windows (main.js - line 4):**
```javascript
const WEBSITE_URL = 'https://trustpay.co.ke/';
```

### Change App Name

**Android:**
- Edit `app/src/main/res/values/strings.xml` - change `app_name`

**Windows:**
- Edit `package.json` - change `productName`

---

## Troubleshooting

### Android
- **Gradle sync failed**: Make sure JDK 17+ is installed and JAVA_HOME is set
- **Build failed**: Try `Build → Clean Project` then rebuild

### Windows
- **npm install failed**: Try running as Administrator
- **Build failed**: Delete `node_modules` and `package-lock.json`, then reinstall
- **App not starting**: Check if port 3000 is available (change in main.js if needed)

---

## License

MIT License - TrustPay KE
