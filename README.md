# J.A.R.V.I.S. Mark VII — Futuristic AI Voice & Task Automation System

A full-stack, futuristic Stark Industries J.A.R.V.I.S. AI workstation featuring continuous hands-free **"Hey Jarvis"** wake-word detection, an interactive holographic Arc Reactor HUD, real-time telemetry, satellite email dispatch, smart facility environment controls, and an intelligent Google Gemini AI automation pipeline with local zero-latency failover.

---

## ⚡ Features

- **Hands-Free "Hey Jarvis" Wake Word**: Speak *"Hey Jarvis"* to wake the assistant or issue one-shot compound directives (e.g., *"Hey Jarvis, reply to Pepper"* or *"Hey Jarvis, lock blast doors"*) without manually clicking the mic every time.
- **Interactive Arc Reactor Core**: Holographic multi-ring SVG reactor with live frequency spectrum visualizer, rotation kinetics, pulse animations, and real-time status indication.
- **Expedited Comms & Mail Relay**: Encrypted satellite communication hub with instant optimistic reply dispatching, drafted reply previews, and unread badge counters.
- **Facility Hardware Automation**: Real-time smart controls for laboratory lighting (dimming, combat red, focus blue), perimeter force shields, electromagnetic blast doors, and DEFCON security levels.
- **Multitask Automation Queue**: Real-time task scheduler with progress tracking, audio blips, and status indicators.
- **Dual Intelligence Engine**: Powered by Google Gemini (`@google/genai`) for open-ended intelligence with an ultra-fast rule-based local pipeline for sub-15ms voice command fulfillment.
- **Cross-Platform Audio Synthesizer**: Custom Web Audio API synthesizer for sci-fi sound effects (wake chimes, telemetry sweeps, alert sirens, completion chimes) and British English vocal cadence.

---

## 📋 Prerequisites

Before running the application, make sure you have:

1. **Node.js**: Version **18.x** or **20.x+** recommended ([Download Node.js](https://nodejs.org/)).
2. **Package Manager**: `npm` (bundled with Node.js), `pnpm`, `yarn`, or `bun`.
3. **Supported Web Browser**: 
   - **Google Chrome** (Recommended for full Web Speech Recognition support)
   - **Microsoft Edge**, **Brave**, or **Opera** (Chromium-based browsers)
   - *Note: Safari has partial SpeechRecognition support; Chrome or Edge provides the best hands-free wake word experience.*
4. **Microphone**: A working internal or external microphone.
5. **(Optional) Google Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/). *The app works out of the box even without an API key using the high-speed local tactical command engine.*

---

## 🚀 Quick Start (All Platforms)

```bash
# 1. Clone or extract the repository
cd jarvis-ai-assistant

# 2. Install dependencies
npm install

# 3. Configure environment variables (Optional but recommended)
cp .env.example .env

# 4. Start the development server
npm run dev
```

Once started, open your browser and navigate to:
```
http://localhost:3000
```

---

## 💻 OS-Specific Setup Guides

### 🍎 macOS Setup (MacBook, iMac, Mac mini, Mac Studio)

#### 1. Install Node.js
If you don't have Node.js installed, the easiest way is via [Homebrew](https://brew.sh/) or [nvm](https://github.com/nvm-sh/nvm):

```bash
# Using Homebrew
brew install node

# Or verify existing installation
node -v
npm -v
```

#### 2. Project Setup
```bash
# Navigate to the project directory
cd /path/to/jarvis

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

#### 3. macOS Microphone Permissions
1. Open your browser (Google Chrome recommended) and navigate to `http://localhost:3000`.
2. When prompted by the browser, click **Allow** for microphone access.
3. If the prompt does not appear or permission is denied:
   - Go to **System Settings** > **Privacy & Security** > **Microphone**.
   - Ensure the toggle next to **Google Chrome** (or your browser) is switched **ON**.
4. In the JARVIS interface, click the **"ENGAGE JARVIS"** button or click the **Arc Reactor Core** once. This unlocks macOS audio permissions and starts continuous wake-word listening.

---

### 🪟 Windows Setup (Windows 10, Windows 11)

#### 1. Install Node.js
- Download and install the LTS version from [nodejs.org](https://nodejs.org/).
- Ensure the checkbox **"Add to PATH"** is checked during installation.
- Open **PowerShell** or **Command Prompt** (cmd) as Administrator and verify:
  ```powershell
  node -v
  npm -v
  ```

#### 2. Project Setup
In PowerShell or Command Prompt:
```powershell
# Navigate to the project folder
cd C:\path\to\jarvis

# Install dependencies
npm install

# Create environment file (PowerShell)
Copy-Item .env.example .env
# Or in classic CMD:
# copy .env.example .env
```

#### 3. Windows Microphone Privacy Settings
1. Open Windows **Settings** (`Win + I`).
2. Go to **Privacy & Security** > **Microphone** (or **Privacy** > **Microphone** on Windows 10).
3. Ensure **"Microphone access"** is turned **On**.
4. Ensure **"Let apps access your microphone"** and **"Let desktop apps access your microphone"** are both enabled.
5. Open Chrome/Edge at `http://localhost:3000`, click **Allow** on the microphone pop-up, and click **"ENGAGE JARVIS"** on the screen.

---

### 🐧 Linux Setup (Ubuntu, Debian, Fedora, Arch, WSL2)

#### 1. Install Node.js
**Ubuntu / Debian**:
```bash
sudo apt update
sudo apt install -y nodejs npm
# Or using NodeSource for latest LTS:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Fedora / RHEL**:
```bash
sudo dnf install -y nodejs npm
```

**Arch Linux**:
```bash
sudo pacman -S nodejs npm
```

#### 2. Project Setup
```bash
cd ~/path/to/jarvis
npm install
cp .env.example .env
```

#### 3. Linux Audio & Microphone Configuration
- Make sure your audio subsystem (**PulseAudio** or **PipeWire**) is running and your microphone input level is not muted:
  ```bash
  # Check mixer levels (alsamixer)
  alsamixer
  ```
- If running inside **WSL2** (Windows Subsystem for Linux), running GUI browsers directly in Linux may have restricted microphone access. It is recommended to run `npm run dev` in WSL2, then open **Google Chrome on Windows** and browse to `http://localhost:3000`.

---

## 🔑 Environment Variables Configuration

Open the `.env` file in the root directory:

```env
# Google Gemini API Key (Optional)
# Enables open-ended neural conversational intelligence
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Application URL
APP_URL="http://localhost:3000"
```

> **Note**: If `GEMINI_API_KEY` is not provided, the system automatically runs using its high-speed built-in tactical NLP rule engine with zero latency.

---

## 🛠️ Available Scripts

In the project root directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the unified Express + Vite development server on port 3000 |
| `npm run build` | Compiles the React frontend to `dist/` and bundles `server.ts` into `dist/server.cjs` |
| `npm run start` | Launches the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type verification (`tsc --noEmit`) |
| `npm run clean` | Cleans previous build artifacts (`dist/`) |

---

## 🎙️ How to Use Voice & Wake Word Commands

### 1. Initial Activation (Audio Unlock)
Modern web browsers block audio playback and continuous speech recognition until a user interacts with the page.
- Upon loading `http://localhost:3000`, click **"ENGAGE JARVIS"** or click the **Arc Reactor Core**.
- You will hear a confirmation chime and J.A.R.V.I.S. will acknowledge: *"Good day, sir. J.A.R.V.I.S. online..."*
- The status indicator will turn emerald: **"HANDS-FREE LISTENING: 'HEY JARVIS'"**.

### 2. Hands-Free Wake Phrases
You can speak naturally from across the desk:
- **Two-step command**: Say *"Hey Jarvis"*, wait for the acknowledgment chime, then speak your directive.
- **Compound command**: Say *"Hey Jarvis, [directive]"* in one single phrase.

### 3. Voice Directives Cheat Sheet

| Category | Sample Spoken Command | Action Taken |
| :--- | :--- | :--- |
| **Comms & Mail** | *"Hey Jarvis, check my mail"* | Opens comms hub and audits unread satellite transmissions |
| **Comms & Mail** | *"Hey Jarvis, reply to Pepper"* | Dispatches high-priority response to Pepper Potts with PGP-4096 encryption |
| **Comms & Mail** | *"Hey Jarvis, send response to Banner"* | Dispatches confirmed gamma telemetry response to Dr. Bruce Banner |
| **Lighting** | *"Hey Jarvis, dim the lights to 30%"* | Adjusts lab illumination to 30% focus blue mode |
| **Lighting** | *"Hey Jarvis, set lighting to combat red"* | Switches lighting mode to high-alert combat red |
| **Lighting** | *"Hey Jarvis, set lights to 100%"* | Illuminates laboratory to maximum brightness |
| **Security** | *"Hey Jarvis, lock blast doors"* | Seals electromagnetic blast doors and elevates grid to DEFCON 3 |
| **Security** | *"Hey Jarvis, unlock blast doors"* | Unlatches facility blast doors and standardizes clearance |
| **Timers** | *"Hey Jarvis, set a 15 minute timer"* | Arms a countdown sprint with live HUD ticking and audio alert |
| **Diagnostics** | *"Hey Jarvis, run diagnostics"* | Sweeps quantum registers, reactor thermal dissipation, and core telemetry |
| **Intelligence** | *"Hey Jarvis, search quantum computing"* | Synthesizes global information feeds and archives tactical memo |

---

## 🔧 Troubleshooting & FAQ

#### Q: The microphone does not detect my voice or says "Microphone Access Pending"
1. Check the browser address bar for a camera/mic icon with a red cross. Click it and select **"Always allow http://localhost:3000 to access your microphone"**.
2. Refresh the page and click **"ENGAGE JARVIS"**.
3. Ensure your browser is **Google Chrome** or **Microsoft Edge**, as Chromium provides native Web Speech API support.

#### Q: J.A.R.V.I.S. is not speaking out loud
1. Check if the **MUTE VOICE** button in the top HUD telemetry bar is active. Click it to unmute.
2. Web browsers require an initial click to play sound. Click anywhere on the screen or click the Arc Reactor once to prime the audio context.
3. Verify your system output volume is turned up.

#### Q: Port 3000 is already in use
If another application is using port 3000:
- **macOS / Linux**:
  ```bash
  # Find and terminate process on port 3000
  lsof -ti :3000 | xargs kill -9
  ```
- **Windows (PowerShell)**:
  ```powershell
  # Find process ID on port 3000
  netstat -ano | findstr :3000
  # Stop process (replace <PID> with number from previous command)
  taskkill /PID <PID> /F
  ```

---

## 🏗️ Architecture & Technology Stack

- **Frontend**:
  - **React 19** with TypeScript
  - **Tailwind CSS v4** for high-density HUD styling
  - **Motion** (`motion/react`) for fluid cybernetic transitions
  - **Lucide React** for tactical iconography
- **Audio & Speech Engine**:
  - **Web Audio API** (`SoundEngine`): Custom multi-oscillator polyphonic synthesizer generating harmonic square/sine chimes, frequency sweeps, and warning pulses without external MP3 files.
  - **Web Speech API** (`SpeechManager`): Continuous speech recognition with auto-rearm loop, regex wake-word parsing, and British English (`en-GB`) speech synthesis.
- **Backend**:
  - **Express 4** with TypeScript running via `tsx`
  - **Vite 8** integration with SSR middleware mode
  - **Google Gen AI SDK** (`@google/genai`) connecting to Gemini models
  - **esbuild** for high-speed single-bundle production compilation

---

## 📄 License

This project is created for personal exploration, productivity, and demonstrative purposes. All Stark Industries and J.A.R.V.I.S. motifs are inspired by the Marvel Cinematic Universe.
