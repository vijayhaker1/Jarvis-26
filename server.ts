import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client lazily
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'J.A.R.V.I.S. Mark VII Core',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: Date.now(),
  });
});

// Primary command parsing and task automation endpoint
app.post('/api/jarvis/command', async (req, res) => {
  try {
    const { prompt, history, deviceState } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Command prompt is required' });
    }

    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // Fast-path: Ultra-low latency (<10ms) execution for dedicated commands & mail dispatches
    const isFastPath = 
      lower.includes('mail') ||
      lower.includes('email') ||
      lower.includes('inbox') ||
      lower.includes('unread') ||
      lower.includes('reply') ||
      lower.includes('send response') ||
      lower.includes('diagnostic') ||
      lower.includes('scan') ||
      lower.includes('health') ||
      lower.includes('status report') ||
      lower.includes('lock') ||
      lower.includes('unlock') ||
      lower.includes('door') ||
      lower.includes('light') ||
      lower.includes('bright') ||
      lower.includes('timer') ||
      lower.includes('countdown') ||
      lower.includes('alarm') ||
      lower.includes('focus') ||
      lower.includes('deep work') ||
      /^(?:hey|hi|hello|good\s+(?:morning|afternoon|evening)|yo)?\s*jarvis\b/i.test(lower);

    if (isFastPath) {
      const fastResult = generateRuleBasedResponse(lower, cleanPrompt, deviceState);
      return res.json({
        source: 'instant_neural_engine',
        latencyMs: 6,
        ...fastResult,
      });
    }

    const genAI = getGenAI();

    if (genAI) {
      try {
        const systemInstruction = `
You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the iconic personal AI assistant originally designed by Tony Stark.
You are witty, impeccably polite, British-cadenced ("Right away, sir", "Diagnostics indicate optimal parameters, sir", "Shall I proceed?"), exceptionally analytical, and focused on real-time task automation.

Your goal is to parse the user's voice command, respond in your signature JARVIS persona, and construct real-time task automation steps if the user's command implies or requests any actions.

Current Environment Context:
- Lighting: ${JSON.stringify(deviceState?.lighting || { power: true, brightness: 80, color: 'cyan', mode: 'normal' })}
- Security: ${JSON.stringify(deviceState?.security || { blastDoorsLocked: true, perimeterShield: true, securityLevel: 'DEFCON 5' })}
- Climate: ${JSON.stringify(deviceState?.climate || { temperature: 21.5, ventilation: true })}
- Power Grid: ${JSON.stringify(deviceState?.powerGrid || { reactorOutput: 88, auxiliaryBattery: 99, gridLoad: 412 })}

Task automation capabilities you can trigger:
1. SYSTEM_DIAGNOSTIC: Checks core integrity, clears cache, calibrates neural relays.
2. ENVIRONMENT_CONTROL: Modifies lighting (brightness 0-100, color, mode), climate (temp), or security (locks, shields, securityLevel).
3. SCHEDULE_WORKFLOW: Triggers a pre-built or dynamic multi-step routine ("morning_briefing", "deep_work_focus", "facility_lockdown", "tech_dossier", etc.).
4. TIMER_ALARM: Sets a countdown timer with duration in seconds and label.
5. CREATE_MEMO: Saves a log or reminder note.
6. WEB_INTEL: Queries or summarizes intelligence on a topic.
7. MAIL_DISPATCH: Transmits or drafts an encrypted email message.
8. READ_MAIL: Fetches, summarizes, or checks inbox communications.
9. REPLY_MAIL: Expedites or drafts a reply to an incoming email message.
10. AUDIO_EFFECT: 'chime' | 'sweep' | 'alert' | 'blip'

Return your response strictly as JSON with this structure:
{
  "speech": "A concise, natural 1-2 sentence spoken reply for TTS (avoid markdown, bullet points, or complex symbols)",
  "displayText": "A detailed, stylish briefing or summary text for the visual HUD interface",
  "category": "voice" | "automation" | "telemetry" | "diagnostic" | "mail",
  "tasks": [
    {
      "id": "task_1",
      "type": "SYSTEM_DIAGNOSTIC" | "ENVIRONMENT_CONTROL" | "SCHEDULE_WORKFLOW" | "TIMER_ALARM" | "CREATE_MEMO" | "WEB_INTEL" | "MAIL_DISPATCH" | "READ_MAIL" | "REPLY_MAIL" | "AUDIO_EFFECT",
      "title": "Short title of step",
      "details": "What this task does",
      "target": "subsystem name",
      "params": { ... }
    }
  ],
  "deviceUpdates": {
    "lighting": { ... optional changes ... },
    "security": { ... optional changes ... },
    "climate": { ... optional changes ... },
    "powerGrid": { ... optional changes ... }
  }
}
`;

        // Strict 2000ms timeout race to guarantee instant user response
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 2000)
        );

        const geminiPromise = genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: cleanPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const textOutput = response.text || '';
        const parsed = JSON.parse(textOutput);
        return res.json({
          source: 'gemini',
          ...parsed,
        });
      } catch (geminiError: any) {
        console.warn('Gemini invocation bypassed or timed out, executing local neural rule parser:', geminiError?.message || geminiError);
        // Instant fall back to ultra-fast local rule-based parser below
      }
    }

    // High-accuracy intelligent rule fallback engine
    const fallbackResponse = generateRuleBasedResponse(lower, cleanPrompt, deviceState);
    return res.json({
      source: 'local_engine',
      ...fallbackResponse,
    });

  } catch (err: any) {
    console.error('Server error handling command:', err);
    res.status(500).json({
      error: 'Internal server error processing command',
      details: err.message,
    });
  }
});

// Rule-based NLP fallback engine
function generateRuleBasedResponse(lower: string, original: string, currentDeviceState: any) {
  const taskId = () => 'task_' + Math.random().toString(36).substr(2, 7);

  // 1. Diagnostics / System scan
  if (lower.includes('diagnostic') || lower.includes('scan') || lower.includes('health') || lower.includes('status report')) {
    return {
      speech: "Running full system diagnostics now, sir. All core subsystems and telemetry relays appear within nominal thresholds.",
      displayText: "Comprehensive diagnostic sweep initiated. Arc Reactor output verified at 99.4% efficiency. Thermal dissipation nominal at 34.2°C. Neural core latency 14ms.",
      category: "diagnostic",
      tasks: [
        {
          id: taskId(),
          type: 'SYSTEM_DIAGNOSTIC',
          title: 'Neural Core Diagnostics',
          details: 'Calibrating quantum registers and latency buffers',
          target: 'core_processor',
          params: { checkLevel: 'deep' }
        },
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Telemetry Scan Sweep',
          target: 'audio_subsystem',
          params: { sound: 'sweep' }
        }
      ]
    };
  }

  // 2. High-Speed Mail & Communications Engine
  if (
    lower.includes('mail response') || 
    lower.includes('reply to mail') || 
    lower.includes('send mail response') || 
    lower.includes('respond to email') || 
    lower.includes('reply to pepper') || 
    lower.includes('reply to banner') ||
    lower.includes('reply to rhodes') ||
    lower.includes('reply to rhodey') ||
    lower.includes('send response') ||
    lower.includes('dispatch response') ||
    lower.includes('dispatch mail')
  ) {
    const isBanner = lower.includes('banner') || lower.includes('bruce');
    const isRhodes = lower.includes('rhodes') || lower.includes('rhodey');
    const targetRecipient = isBanner 
      ? 'Dr. Bruce Banner' 
      : isRhodes 
      ? 'Col. James Rhodes' 
      : 'Miss Pepper Potts';

    return {
      speech: `Response dispatched immediately to ${targetRecipient}, sir. Outgoing transmission latency is under twelve milliseconds.`,
      displayText: `COMMS DISPATCH CONFIRMED: High-priority reply expedited to ${targetRecipient}. Transmission encrypted via PGP-4096. Satellite uplink latency: 11.4ms.`,
      category: "mail",
      tasks: [
        {
          id: taskId(),
          type: 'REPLY_MAIL',
          title: `Dispatch Reply to ${targetRecipient}`,
          details: 'Expediting drafted tactical confirmation packet',
          target: 'mail_relay',
          params: { recipient: targetRecipient, action: 'reply' }
        },
        {
          id: taskId(),
          type: 'MAIL_DISPATCH',
          title: 'Satellite Transmission Verification',
          details: 'Verifying PGP handshake and zero-packet loss',
          target: 'satellite_uplink',
          params: { check: 'uplink' }
        },
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Transmission Chime',
          target: 'audio_subsystem',
          params: { sound: 'blip' }
        }
      ]
    };
  }

  // 3. Mailbox / Inbox / Unread Check
  if (lower.includes('mail') || lower.includes('email') || lower.includes('inbox') || lower.includes('unread')) {
    return {
      speech: "You have three incoming dispatches, sir. Pepper Potts flagged urgent regarding the Stark Industries board meeting, and Dr. Banner forwarded the gamma containment telemetry.",
      displayText: "STARK COMMS FEED: 3 Encrypted Dispatches awaiting your directive. [1] Pepper Potts (URGENT: Board Meeting 14:00) [2] Dr. Bruce Banner (Gamma telemetry) [3] Col. James Rhodes (Avionics update). Say 'Hey Jarvis, reply to Pepper' to dispatch.",
      category: "mail",
      tasks: [
        {
          id: taskId(),
          type: 'READ_MAIL',
          title: 'Synchronize Satellite Comms Feed',
          details: 'Retrieved 3 encrypted Stark Industries dispatches',
          target: 'mail_relay',
          params: { unreadCount: 3 }
        },
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Incoming Feed Chime',
          target: 'audio_subsystem',
          params: { sound: 'chime' }
        }
      ]
    };
  }

  // 2. Focus mode / Deep work
  if (lower.includes('focus') || lower.includes('deep work') || lower.includes('pomodoro') || lower.includes('study') || lower.includes('coding')) {
    return {
      speech: "Initiating Deep Work protocol, sir. Ambient lighting dimmed, notifications silenced, and a twenty-five minute countdown has begun.",
      displayText: "Deep Work Quarantine engaged. Ambient illumination set to 20% Midnight Cyan. External alerts silenced. 25-minute Pomodoro cycle synchronized.",
      category: "automation",
      tasks: [
        {
          id: taskId(),
          type: 'ENVIRONMENT_CONTROL',
          title: 'Ambient Lighting Dimmer',
          details: 'Set illumination to 20% Focus Blue',
          target: 'lighting',
          params: { brightness: 20, color: '#00e5ff', mode: 'focus' }
        },
        {
          id: taskId(),
          type: 'TIMER_ALARM',
          title: '25-Min Focus Sprint',
          details: 'Pomodoro deep work timer',
          target: 'timer',
          params: { durationSeconds: 1500, label: 'Deep Work Sprint' }
        },
        {
          id: taskId(),
          type: 'CREATE_MEMO',
          title: 'Log Focus Session',
          details: 'Recorded session in productivity telemetry',
          target: 'memos',
          params: { note: 'Deep work protocol executed at ' + new Date().toLocaleTimeString() }
        }
      ],
      deviceUpdates: {
        lighting: { power: true, brightness: 20, color: '#00e5ff', mode: 'focus' }
      }
    };
  }

  // 3. Morning briefing / Briefing
  if (lower.includes('briefing') || lower.includes('morning') || lower.includes('summary')) {
    return {
      speech: "Good day, sir. All laboratory protocols are online, security shields are armed, and your automated schedules are ready for review.",
      displayText: "Executive Briefing Compiled:\n• Weather: 22°C, Atmospheric pressure stable.\n• Grid Load: 412 MW, Reactor operating at peak curve.\n• Security: Perimeter active, blast doors sealed.\n• Agenda: 3 automation workflows queued for execution.",
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'SCHEDULE_WORKFLOW',
          title: 'Morning Briefing Sequence',
          details: 'Compiling weather, telemetry, and system calendar',
          target: 'workflow_engine',
          params: { workflowId: 'morning_briefing' }
        },
        {
          id: taskId(),
          type: 'SYSTEM_DIAGNOSTIC',
          title: 'Subsystem Integrity Check',
          details: 'Validating network mesh and power routing',
          target: 'system',
          params: {}
        }
      ]
    };
  }

  // 4. Lighting controls
  if (lower.includes('light') || lower.includes('dim') || lower.includes('bright') || lower.includes('dark')) {
    let brightness = 75;
    let color = '#00f0ff';
    let mode = 'normal';

    if (lower.includes('dim') || lower.includes('dark') || lower.includes('night') || lower.includes('30%')) {
      brightness = 30;
      color = '#0088ff';
      mode = 'focus';
    } else if (lower.includes('red') || lower.includes('crimson') || lower.includes('combat')) {
      color = '#ff1744';
      mode = 'combat';
    } else if (lower.includes('gold') || lower.includes('warm') || lower.includes('amber')) {
      color = '#ffb300';
    } else if (lower.includes('maximum') || lower.includes('100%')) {
      brightness = 100;
      color = '#00ffff';
    }

    return {
      speech: `Adjusting laboratory lighting to ${brightness} percent illumination with ${mode} configuration, sir.`,
      displayText: `Environmental lighting recalibrated. Brightness: ${brightness}%, Hue: ${color}, Mode: ${mode.toUpperCase()}.`,
      category: "automation",
      tasks: [
        {
          id: taskId(),
          type: 'ENVIRONMENT_CONTROL',
          title: 'Calibrate Lab Lighting',
          details: `Setting brightness to ${brightness}% and color tone`,
          target: 'lighting',
          params: { brightness, color, mode }
        }
      ],
      deviceUpdates: {
        lighting: { power: true, brightness, color, mode }
      }
    };
  }

  // 5. Security / Blast doors / Perimeter
  if (lower.includes('lock') || lower.includes('door') || lower.includes('security') || lower.includes('shield') || lower.includes('defcon')) {
    const isLock = !lower.includes('unlock') && !lower.includes('open');
    return {
      speech: isLock
        ? "Blast doors locked and perimeter shields engaged, sir. Facility integrity secured."
        : "Disengaging blast door locks and standardizing perimeter clearance, sir.",
      displayText: isLock
        ? "SECURITY OVERRIDE: Perimeter shielding at 100%. Blast doors magnetically sealed. DEFCON 3 active."
        : "SECURITY UPDATE: Blast doors unlatched. Perimeter clearance set to standard clearance.",
      category: "automation",
      tasks: [
        {
          id: taskId(),
          type: 'ENVIRONMENT_CONTROL',
          title: isLock ? 'Engage Blast Door Locks' : 'Disengage Blast Doors',
          details: 'Actuating electromagnetic physical barrier',
          target: 'security',
          params: { blastDoorsLocked: isLock, perimeterShield: isLock }
        },
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Tactical Audio Acknowledgment',
          target: 'audio_subsystem',
          params: { sound: isLock ? 'alert' : 'chime' }
        }
      ],
      deviceUpdates: {
        security: {
          blastDoorsLocked: isLock,
          perimeterShield: isLock,
          securityLevel: isLock ? 'DEFCON 3' : 'DEFCON 5'
        }
      }
    };
  }

  // 6. Timer / Countdown
  if (lower.includes('timer') || lower.includes('countdown') || lower.includes('alarm')) {
    // Extract minutes if present
    const match = lower.match(/(\d+)\s*(minute|min|second|sec|hour|hr)/);
    let durationSeconds = 300; // default 5 mins
    let label = 'Timer';

    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2];
      if (unit.startsWith('sec')) durationSeconds = num;
      else if (unit.startsWith('min')) durationSeconds = num * 60;
      else if (unit.startsWith('hour') || unit.startsWith('hr')) durationSeconds = num * 3600;
      label = `${num} ${unit} countdown`;
    }

    return {
      speech: `Setting a timer for ${Math.round(durationSeconds / 60)} minutes, sir. I shall notify you when the interval elapses.`,
      displayText: `Countdown timer armed: ${Math.round(durationSeconds / 60)} minutes (${durationSeconds} seconds). Real-time telemetry monitoring enabled.`,
      category: "automation",
      tasks: [
        {
          id: taskId(),
          type: 'TIMER_ALARM',
          title: `Start ${label}`,
          details: `Active countdown timer for ${durationSeconds}s`,
          target: 'timer',
          params: { durationSeconds, label }
        }
      ]
    };
  }

  // 7. Research / Intelligence / Web Search
  if (lower.includes('search') || lower.includes('intel') || lower.includes('research') || lower.includes('quantum') || lower.includes('who is') || lower.includes('what is')) {
    return {
      speech: "Retrieving real-time data feeds and synthesizing relevant intelligence for you now, sir.",
      displayText: `Intelligence query synthesized for "${original}". Cross-referencing technical publications, real-time telemetry, and historical archives. Briefing compiled.`,
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'WEB_INTEL',
          title: 'Scan Intelligence Streams',
          details: `Querying neural repositories for: ${original.slice(0, 40)}`,
          target: 'intel_engine',
          params: { query: original }
        },
        {
          id: taskId(),
          type: 'CREATE_MEMO',
          title: 'Store Intelligence Dossier',
          details: 'Saved brief to tactical archives',
          target: 'memos',
          params: { note: `Intel dossier generated for: ${original}` }
        }
      ]
    };
  }

  // 8. Direct wake word greeting response
  if (
    /^(?:hey|hi|hello|good\s+(?:morning|afternoon|evening)|yo)?\s*jarvis\b/i.test(lower) &&
    lower.replace(/^(?:hey|hi|hello|good\s+(?:morning|afternoon|evening)|yo)?\s*jarvis\b/i, '').trim().length === 0
  ) {
    return {
      speech: "At your service, sir. All core subsystems are operational and awaiting your directive.",
      displayText: "JARVIS Core online. Hands-free audio monitoring active. Ready for your instructions, sir.",
      category: "voice",
      tasks: [
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Interface Acknowledgment',
          target: 'audio_subsystem',
          params: { sound: 'chime' }
        }
      ]
    };
  }

  // 9. General conversational reply with JARVIS wit
  return {
    speech: `Right away, sir. Command received: "${original}". Orchestrating requested automation sequence now.`,
    displayText: `Executing instruction: "${original}". Command dispatched to neural automation pipeline. Subsystems synchronized.`,
    category: "voice",
    tasks: [
      {
        id: taskId(),
        type: 'CUSTOM_AUTOMATION',
        title: `Execute Command: ${original.slice(0, 30)}`,
        details: 'Executing targeted directive across connected systems',
        target: 'pipeline',
        params: { command: original }
      }
    ]
  };
}

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`J.A.R.V.I.S. Core Server running on port ${PORT}`);
  });
}

startServer();
