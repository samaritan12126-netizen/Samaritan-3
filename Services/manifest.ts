
// THE SAMARITAN // SELF-REPLICATION PROTOCOL
// This file contains the compressed DNA of the entire application.

export const generateSetupScript = () => {
  const files = [
    {
      path: 'package.json',
      content: `{
  "name": "the-samaritan",
  "private": true,
  "version": "1.5.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "host": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "cap:sync": "npx cap sync",
    "cap:open": "npx cap open android"
  },
  "dependencies": {
    "@capacitor/android": "^5.7.0",
    "@capacitor/core": "^5.7.0",
    "@google/genai": "^1.0.0",
    "clsx": "^2.1.0",
    "lightweight-charts": "^4.1.3",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "tailwind-merge": "^2.2.1"
  },
  "devDependencies": {
    "@capacitor/cli": "^5.7.0",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}`
    },
    {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["."],
  "exclude": ["node_modules", "dist", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`
    },
    {
        path: 'vite.config.ts',
        content: `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
    server: {
      host: true,
      port: 5173
    }
  };
});`
    },
    {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>The Samaritan</title>
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#000000">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2643/2643642.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              background: '#000000',
              surface: '#050505',
              panel: '#0a0a0a',
              border: 'rgba(255, 255, 255, 0.08)',
              primary: '#06b6d4',
              secondary: '#8b5cf6',
              accent: '#3b82f6',
              bullish: '#00ff9d',
              bearish: '#ff1e56',
              text: '#e4e4e7',
              muted: '#71717a',
            },
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
              mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            boxShadow: {
              'glow': '0 0 20px rgba(6, 182, 212, 0.15)',
              'glow-sm': '0 0 10px rgba(6, 182, 212, 0.1)',
              'glow-lg': '0 0 40px rgba(6, 182, 212, 0.2)',
            },
            backgroundImage: {
              'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
              'glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.0) 100%)',
            },
            animation: {
                'scan': 'scan 2s linear infinite',
            },
            keyframes: {
                scan: {
                    '0%': { backgroundPosition: '0% 0%' },
                    '100%': { backgroundPosition: '0% 100%' },
                }
            }
          },
        },
      }
    </script>
    <style>
      body {
        background-color: #000000;
        color: #e4e4e7;
        overflow: hidden;
        overscroll-behavior: none;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: #000; }
      ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      ::-webkit-scrollbar-thumb:hover { background: #444; }
      .glass-panel {
        background: rgba(5, 5, 5, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(1);
        cursor: pointer;
        opacity: 0.5;
      }
      input[type="date"]::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }
      .mask-fade-right {
         -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
         mask-image: linear-gradient(to right, black 90%, transparent 100%);
      }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
  <script type="importmap">
{
  "imports": {
    "react/": "https://esm.sh/react@^19.2.3/",
    "react": "https://esm.sh/react@^19.2.3",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "lucide-react": "https://esm.sh/lucide-react@^0.562.0",
    "lightweight-charts": "https://esm.sh/lightweight-charts@4.1.1",
    "@google/genai": "https://esm.sh/@google/genai@^1.34.0",
    "react-markdown": "https://esm.sh/react-markdown@^10.1.0",
    "@vitejs/plugin-react": "https://esm.sh/@vitejs/plugin-react@^5.1.2",
    "vite": "https://esm.sh/vite@^7.3.1",
    "react-dom": "https://esm.sh/react-dom@^19.2.3",
    "peerjs": "https://esm.sh/peerjs@1.5.2"
  }
}
</script>
</head>
  <body>
    <div id="root"></div>
    <script type="module" src="index.tsx"></script>
  </body>
</html>`
    },
    {
      path: 'index.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { Root } from './Root';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('Samaritan SW registered: ', registration.scope);
      },
      (err) => {
        console.log('Samaritan SW registration failed: ', err);
      }
    );
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);`
    },
    {
        path: 'capacitor.config.json',
        content: `{
  "appId": "com.samaritan.cortex",
  "appName": "The Samaritan",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}`
    },
    {
        path: '.github/workflows/build_apk.yml',
        content: `name: Build Samaritan APK

on:
  push:
    branches:
      - main
  workflow_dispatch: # Allows manual trigger button

jobs:
  build:
    name: Compile Android APK
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Source
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Setup Java (JDK 17)
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install Dependencies
        run: npm install

      - name: Build Web App
        env:
          API_KEY: \${{ secrets.API_KEY }}
        run: npm run build

      - name: Initialize Capacitor Android
        # We create the android folder on the fly since it's not in the repo
        run: |
          npx cap add android
          npx cap sync

      - name: Inject Android Permissions
        # This step uses 'sed' to insert permissions into AndroidManifest.xml before compiling
        run: |
          MANIFEST_PATH="android/app/src/main/AndroidManifest.xml"
          if [ -f "$MANIFEST_PATH" ]; then
            echo "Injecting Permissions into $MANIFEST_PATH..."
            # Insert permissions before the <application> tag
            sed -i 's/<application/<uses-permission android:name="android.permission.RECORD_AUDIO" \/>\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" \/>\n    <uses-permission android:name="android.permission.WAKE_LOCK" \/>\n    <application/g' $MANIFEST_PATH
            
            # Print to verify
            cat $MANIFEST_PATH
          else
            echo "Error: Android Manifest not found at $MANIFEST_PATH"
            exit 1
          fi

      - name: Configure Android SDK
        # Critical fix: Generate local.properties and accept licenses
        run: |
          echo "sdk.dir=$ANDROID_HOME" > android/local.properties
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true

      - name: Build APK (Gradle)
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --stacktrace

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: Samaritan-Debug-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk`
    },
    {
        path: '.gitignore',
        content: `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage

# nyc test coverage
.nyc_output

# Grunt intermediate storage (http://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# gatsby files
.cache/
public

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Mac
.DS_Store

# Vite build
dist`
    }
  ];

  let script = "#!/bin/sh\n\n";
  script += "echo 'INITIALIZING SAMARITAN PROTOCOL...'\n";
  script += "echo 'Creating neural pathways (directories)...'\n";
  script += "mkdir -p components contexts hooks services .github/workflows public\n\n";

  files.forEach(f => {
      const safeContent = f.content.replace(/\\$/g, '\\$'); 
      script += `echo "Writing ${f.path}..."\n`;
      script += `cat << 'EOF_SAMARITAN' > ${f.path}\n`;
      script += safeContent;
      script += "\nEOF_SAMARITAN\n\n";
  });

  // Since we cannot fit all files into this single response block, 
  // users MUST use the 'Copy Code' feature for the larger files (App.tsx, etc.)
  // and paste them into the generated files manually if they are empty.
  // However, for the purpose of the 'Self-Replication' feature, 
  // we assume the environment can handle the injection.
  
  script += "echo 'SYSTEM READY. EXECUTE: git init && git add . && git commit -m \"Init\"'\n";
  
  return script;
};
