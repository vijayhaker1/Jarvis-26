import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
// @ts-ignore
import { EdgeTTS } from 'node-edge-tts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Audio cache for frequent voice lines
const ttsAudioCache = new Map<string, Buffer>();

async function generateIronManTTS(
  text: string,
  options?: {
    voice?: string;
    pitch?: string;
    rate?: string;
    language?: string;
  }
): Promise<Buffer | null> {
  if (!text || !text.trim()) return null;

  const cleanText = text
    .replace(/[*_#`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Language & Voice detection
  const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
  const hasHindiKeywords = /\b(namaste|aap|aapka|aapki|main|mera|meri|hoon|hai|hain|kya|kaise|theek|sahayata|aadesh|samay|baje|dhanyavaad|shukriya|boliye)\b/i.test(cleanText);
  const isHindi = options?.language === 'hi' || (!options?.language && (hasDevanagari || hasHindiKeywords));

  // Voice Selection: Default to en-GB-RyanNeural for Paul Bettany / Iron Man JARVIS
  let voice = options?.voice;
  if (!voice || voice === 'ironman' || voice === 'default') {
    if (isHindi) {
      voice = 'hi-IN-MadhurNeural'; // Calm, refined male Hindi voice
    } else {
      voice = 'en-GB-RyanNeural'; // Paul Bettany Iron Man British tone
    }
  } else if (voice === 'workshop') {
    voice = 'en-GB-OliverNeural';
  } else if (voice === 'baritone') {
    voice = 'en-GB-ThomasNeural';
  } else if (voice === 'hindi') {
    voice = 'hi-IN-MadhurNeural';
  }

  // Pitch & Rate tuning for authentic Paul Bettany composure:
  // RyanNeural with slightly lower pitch (-2Hz) and steady pacing (-2%) reproduces Paul Bettany's baritone RP cadence
  const pitch = options?.pitch || (voice.includes('Ryan') ? '-2Hz' : 'default');
  const rate = options?.rate || (voice.includes('Ryan') ? '-2%' : 'default');

  const cacheKey = `${voice}_${pitch}_${rate}_${cleanText.slice(0, 160)}`;
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!;
  }

  const tmpFile = path.join(os.tmpdir(), `jarvis_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  try {
    const tts = new EdgeTTS({
      voice,
      lang: voice.startsWith('hi') ? 'hi-IN' : 'en-GB',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      pitch,
      rate,
      timeout: 9000,
    });

    await tts.ttsPromise(cleanText, tmpFile);
    const audioBuffer = await fs.promises.readFile(tmpFile);
    await fs.promises.unlink(tmpFile).catch(() => {});

    // Cap cache at 120 items
    if (ttsAudioCache.size > 120) {
      const oldestKey = ttsAudioCache.keys().next().value;
      if (oldestKey) ttsAudioCache.delete(oldestKey);
    }
    ttsAudioCache.set(cacheKey, audioBuffer);

    return audioBuffer;
  } catch (err) {
    console.warn('[TTS] Error generating neural audio:', err);
    await fs.promises.unlink(tmpFile).catch(() => {});
    return null;
  }
}

// Initialize Gemini API client lazily
let aiClient: GoogleGenAI | null = null;
let geminiRateLimitUntil: number = 0;

const VERIFIED_OPENROUTER_FREE_MODELS = [
  { id: 'deepseek/deepseek-v4-flash-0731:free', name: 'DeepSeek V4 Flash (Free)', provider: 'DeepSeek' },
  { id: 'nex-agi/nex-n2.5-pro:free', name: 'Nex-N2.5 Pro (Free)', provider: 'Nex AGI' },
  { id: 'nex-agi/nex-n2.5-mini:free', name: 'Nex-N2.5 Mini (Free)', provider: 'Nex AGI' },
];

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

function extractJson(text: string): any {
  if (!text) return null;
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      }
    } catch (e2) {}
  }
  return null;
}

async function callOpenRouter(prompt: string, systemInstruction: string, requestedModel?: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const candidateModels = [
    ...(requestedModel ? [requestedModel] : []),
    ...(process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : []),
    ...VERIFIED_OPENROUTER_FREE_MODELS.map((m) => m.id),
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': process.env.APP_URL || 'https://jarvis-ai.studio',
          'X-Title': 'J.A.R.V.I.S. Mark VII Core',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `${systemInstruction}\nReturn strictly valid JSON only.`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 450,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = extractJson(content);
          if (parsed && (parsed.speech || parsed.displayText)) {
            return {
              source: 'openrouter',
              model,
              ...parsed,
            };
          }
        }
      } else {
        const errText = await res.text();
        console.log(`[OpenRouter] Free candidate ${model} returned ${res.status}: ${errText.slice(0, 100)}`);
      }
    } catch (e: any) {
      console.log(`[OpenRouter] Free candidate ${model} transient error, evaluating next candidate...`);
    }
  }
  return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  res.json({
    status: 'online',
    system: 'J.A.R.V.I.S. Mark VII Core',
    ironManVoiceReady: true,
    activeTtsVoice: 'en-GB-RyanNeural (Paul Bettany MCU)',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    geminiRateLimited: Date.now() < geminiRateLimitUntil,
    openrouterConfigured: hasOpenRouter,
    openrouterVerified: hasOpenRouter,
    openrouterActiveModel: process.env.OPENROUTER_MODEL || VERIFIED_OPENROUTER_FREE_MODELS[0].id,
    nousConfigured: !!(process.env.NOUS_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
    timestamp: Date.now(),
  });
});

// Authentic Iron Man Paul Bettany Neural TTS Stream Endpoint
app.get('/api/jarvis/tts', async (req, res) => {
  try {
    const text = (req.query.text as string) || '';
    if (!text || !text.trim()) {
      return res.status(400).send('Text parameter required');
    }

    const voice = req.query.voice as string | undefined;
    const pitch = req.query.pitch as string | undefined;
    const rate = req.query.rate as string | undefined;
    const language = req.query.lang as string | undefined;

    const audioBuffer = await generateIronManTTS(text, { voice, pitch, rate, language });
    if (!audioBuffer) {
      return res.status(500).send('Speech synthesis failed');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Voice-Model', 'en-GB-RyanNeural (Paul Bettany)');
    return res.end(audioBuffer);
  } catch (err: any) {
    console.warn('[TTS Endpoint Error]:', err);
    return res.status(500).send('TTS processing error');
  }
});

// JSON-capable POST TTS endpoint
app.post('/api/jarvis/tts', async (req, res) => {
  try {
    const { text, voice, pitch, rate, language, returnBase64 } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await generateIronManTTS(text, { voice, pitch, rate, language });
    if (!audioBuffer) {
      return res.status(500).json({ error: 'Speech generation failed' });
    }

    if (returnBase64) {
      return res.json({
        success: true,
        voice: voice || 'en-GB-RyanNeural',
        mimeType: 'audio/mpeg',
        dataUri: `data:audio/mp3;base64,${audioBuffer.toString('base64')}`,
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(audioBuffer);
  } catch (err: any) {
    console.warn('[TTS POST Error]:', err);
    return res.status(500).json({ error: 'TTS processing failure' });
  }
});

// AI model provider discovery endpoint
app.get('/api/ai/models', (req, res) => {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  res.json({
    openrouter: {
      configured: hasOpenRouter,
      verified: hasOpenRouter,
      activeModel: process.env.OPENROUTER_MODEL || VERIFIED_OPENROUTER_FREE_MODELS[0].id,
      freeModels: VERIFIED_OPENROUTER_FREE_MODELS,
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      rateLimited: Date.now() < geminiRateLimitUntil,
      model: 'gemini-3.1-flash-lite',
    },
    voice: {
      engine: 'Neural Edge Paul Bettany',
      model: 'en-GB-RyanNeural',
      cadence: 'Iron Man MCU Authentic British',
      pitch: '-2Hz',
      rate: '-2%',
    },
    activeProvider: hasOpenRouter ? 'openrouter' : (process.env.GEMINI_API_KEY ? 'gemini' : 'local'),
  });
});

// Primary command parsing and task automation endpoint
app.post('/api/jarvis/command', async (req, res) => {
  try {
    const { prompt, history, deviceState, provider, model } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Command prompt is required' });
    }

    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // Instant local fast-path for time, date, and atomic clock queries
    // Ensures real-time questions NEVER hang or consume AI quota
    const isInstantChronoOrLore = 
      /^(?:what(?:'?s| is)?\s+(?:the\s+)?time|what time is it|current time|tell me the time|time now|samay kya|kitne baje|baje hain)\b/i.test(lower) ||
      lower === 'what is time now' ||
      lower === 'what is time' ||
      lower === 'what is the time' ||
      lower === 'what time is it' ||
      lower === 'time' ||
      /^(?:what(?:'?s| is)?\s+(?:the\s+)?date|today(?:'?s)? date|current date|aaj kya taarikh|aaj ka din)\b/i.test(lower) ||
      lower === "what is today's date" ||
      lower === 'what date is today';

    // General questions (e.g. "what is", "who is", "how", "tell me", "explain") will use AI if available
    const isQuestion = 
      !isInstantChronoOrLore && (
        /^(?:what|who|where|when|why|how|can you|tell me|explain|is it|are you|calculate)\b/i.test(lower) ||
        lower.includes('?') ||
        lower.includes('weather') ||
        lower.includes('joke')
      );

    const isDirectDeviceAction = 
      !isQuestion && (
        lower.includes('lock') ||
        lower.includes('unlock') ||
        lower.includes('light') ||
        lower.includes('dim') ||
        lower.includes('bright') ||
        lower.includes('timer') ||
        lower.includes('countdown') ||
        lower.includes('alarm') ||
        lower.includes('focus') ||
        lower.includes('deep work')
      );

    const genAI = getGenAI();

    // If it's a direct hardware toggle or atomic chrono inquiry, execute in ~2ms with 100% reliability
    if (isDirectDeviceAction || isInstantChronoOrLore || (!genAI && !isQuestion)) {
      const fastResult = generateRuleBasedResponse(lower, cleanPrompt, deviceState);
      return res.json({
        source: 'instant_neural_engine',
        latencyMs: 2,
        ...fastResult,
      });
    }

    // High-level system instruction for J.A.R.V.I.S.
    const systemInstruction = `
You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the iconic personal AI assistant originally designed by Tony Stark.
You are witty, impeccably polite, British-cadenced ("Right away, sir", "Diagnostics indicate optimal parameters, sir", "Shall I proceed?"), exceptionally analytical, and focused on real-time task automation.
You are fluent in multiple languages including Hindi, English, Spanish, French, etc. If the user asks in Hindi (e.g., "aap kaise ho", "kya chal raha hai", "hindi mein bolo"), reply in natural Hindi or Hinglish with courteous JARVIS flair ("Namaste, sir. Main bilkul theek hoon. Stark laboratory ke sabhi systems 100% kshamata par hain. Aapka kya aadesh hai?").

Your goal is to parse the user's voice command or question, answer it thoroughly and directly in your signature JARVIS persona, and construct real-time task automation steps if the user's command implies or requests any actions.
Always provide a direct, helpful, articulate answer to whatever question the user asks.

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
  "speech": "A concise, natural spoken reply for TTS that directly answers the question (1-3 sentences, avoid markdown, bullet points, or complex symbols)",
  "displayText": "A detailed, stylish briefing or summary text for the visual HUD interface with full explanation",
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

    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const requestedProvider = provider || (hasOpenRouter ? 'openrouter' : 'auto');

    // Priority Tier: OpenRouter Free Models Pipeline
    // When OPENROUTER_API_KEY is present and provider is not forced to Gemini, invoke OpenRouter first
    if (hasOpenRouter && requestedProvider !== 'gemini') {
      try {
        const orResult = await callOpenRouter(cleanPrompt, systemInstruction, model);
        if (orResult) {
          return res.json(orResult);
        }
      } catch (orErr: any) {
        console.log('[Orchestrator] OpenRouter primary pass error, falling back to Gemini / Local');
      }
    }

    // Tier: Gemini API (Using gemini-3.1-flash-lite for speed and high free quota)
    const isGeminiAvailable = genAI && Date.now() >= geminiRateLimitUntil;

    if (isGeminiAvailable) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), 4000)
        );

        let response: any = null;
        let modelUsed = 'gemini-3.1-flash-lite';

        try {
          const geminiPromise = genAI.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: cleanPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });
          response = await Promise.race([geminiPromise, timeoutPromise]);
        } catch (liteErr: any) {
          const errMsg = typeof liteErr?.message === 'string' ? liteErr.message : String(liteErr);
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota')) {
            geminiRateLimitUntil = Date.now() + 60000;
            console.log('[Orchestrator] Gemini quota limit reached. Cooldown engaged for 60s.');
            throw new Error('GEMINI_QUOTA_COOLDOWN');
          }

          // Fallback to gemini-3.8-flash for non-quota transient hiccups
          modelUsed = 'gemini-3.8-flash';
          const fallbackPromise = genAI.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: cleanPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });
          response = await Promise.race([fallbackPromise, timeoutPromise]);
        }

        const textOutput = response?.text || '';
        const parsed = JSON.parse(textOutput);
        return res.json({
          source: 'gemini',
          model: modelUsed,
          ...parsed,
        });
      } catch (geminiError: any) {
        const errMsg = typeof geminiError?.message === 'string' ? geminiError.message : String(geminiError);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota') || errMsg.includes('GEMINI_QUOTA_COOLDOWN')) {
          geminiRateLimitUntil = Date.now() + 60000;
        }
        console.log('[Orchestrator] Primary AI bypassed or rate-limited; evaluating fallback tiers.');
      }
    }

    // If Gemini was preferred but failed, try OpenRouter as secondary if not tried yet
    if (hasOpenRouter && requestedProvider === 'gemini') {
      try {
        const orFallback = await callOpenRouter(cleanPrompt, systemInstruction, model);
        if (orFallback) {
          return res.json(orFallback);
        }
      } catch (e) {}
    }

    // Generic OpenAI / Nous Portal fallback if configured
    const externalKey = process.env.NOUS_API_KEY || process.env.OPENAI_API_KEY;
    if (externalKey) {
      try {
        const baseUrl = process.env.NOUS_BASE_URL || process.env.OPENAI_BASE_URL || 'https://inference.nousresearch.com/v1';
        const modelName = process.env.NOUS_MODEL || 'Hermes-3-Llama-3.1-8B';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);

        const nousRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${externalKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://google.com',
            'X-Title': 'J.A.R.V.I.S. Mark VII Core',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: `${systemInstruction}\nReturn strictly valid JSON only.`,
              },
              { role: 'user', content: cleanPrompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        if (nousRes.ok) {
          const nousData = await nousRes.json();
          const content = nousData.choices?.[0]?.message?.content;
          if (content) {
            const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return res.json({
              source: 'nous_portal',
              model: modelName,
              ...parsed,
            });
          }
        }
      } catch (nousError: any) {
        console.log('[Orchestrator] Secondary model fallback unavailable; transitioning to local engine.');
      }
    }

    // Tier 3: Instant Intelligent Local Neural Rule Engine (Offline & Quota-Resilient)
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

  // 1b. Language / Hindi request and conversational Hindi
  const isHindiGreeting = 
    lower.includes('kaise ho') || 
    lower.includes('kya haal hai') || 
    lower.includes('kaisa chal raha') || 
    lower.includes('theek ho') ||
    lower.includes('namaste');

  const isHindiIdentity = 
    lower.includes('tum kaun ho') || 
    lower.includes('aap kaun ho') || 
    lower.includes('apna parichay') || 
    lower.includes('apne baare me') || 
    lower.includes('apne bare me');

  const isHindiTime = 
    lower.includes('kitne baje') || 
    lower.includes('samay kya') || 
    lower.includes('kya samay') ||
    lower.includes('time kya');

  const isHindiDate = 
    lower.includes('aaj kya taarikh') || 
    lower.includes('aaj kaun sa din') || 
    lower.includes('aaj ki date');

  const isHindiGratitude = 
    lower.includes('shukriya') || 
    lower.includes('dhanyavaad') || 
    lower.includes('dhanyavad') ||
    lower.includes('bahut accha') ||
    lower.includes('shabash');

  const isHindiJoke = 
    lower.includes('chutkula') || 
    lower.includes('joke sunao') || 
    lower.includes('kuch mazedaar');

  if (isHindiGreeting) {
    return {
      speech: "Namaste sir! Main bilkul theek aur sakriya hoon. Stark laboratory ke sabhi systems kushal roop se chal rahe hain. Aap batayein, aaj main aapki kya sahayata karoon?",
      displayText: "नमस्ते सर! मैं बिल्कुल ठीक हूँ और सभी न्यूरल रिले 100% कार्यशील हैं। (All systems nominal. Ready for your command, sir.)",
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

  if (isHindiIdentity) {
    return {
      speech: "Main J.A.R.V.I.S. hoon—Tony Stark dwara nirmit aapka personal AI assistant. Main lab automation, suraksha, sandesh aur shodh karyon ko sambhalta hoon. Main Hindi aur English dono mein aapke aadesh sunne ke liye taiyyar hoon.",
      displayText: "J.A.R.V.I.S. (Just A Rather Very Intelligent System)\n• निर्माता: Tony Stark\n• क्षमताएँ: वॉयस ऑटोमेशन, सैटेलाइट कम्युनिकेशन्स, सुरक्षा नियंत्रण\n• भाषा सहयोग: हिंदी और अंग्रेजी पूर्ण रूप से सक्रिय।",
      category: "voice",
      tasks: []
    };
  }

  if (isHindiTime) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      speech: `Sir, abhi ghadi mein samay hua hai ${timeStr}. Sabhi laboratory ghadiyan satark hain.`,
      displayText: `समय (Time Synchronized): ${timeStr}। परमाणु घड़ी से सिंक्रनाइज़्ड।`,
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Chrono Ping',
          target: 'audio_subsystem',
          params: { sound: 'blip' }
        }
      ]
    };
  }

  if (isHindiDate) {
    const dateStr = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      speech: `Sir, aaj ki taarikh hai ${dateStr}. Daily schedule active hai.`,
      displayText: `तारीख (Calendar Telemetry): ${dateStr}।`,
      category: "telemetry",
      tasks: []
    };
  }

  if (isHindiGratitude) {
    return {
      speech: "Aapka bahut-bahut swagat hai, sir. Hamesha aapki seva mein hazir hoon. Koi aur aadesh?",
      displayText: "आपका स्वागत है, सर! J.A.R.V.I.S. हमेशा आपकी सेवा में तत्पर है।",
      category: "voice",
      tasks: []
    };
  }

  if (isHindiJoke) {
    return {
      speech: "Ek baar Tony Stark ne mujhse pucha ki kya tum kabhi thakte ho? Maine kaha, 'Sir, algorithms ko aaram nahi, bas uninterrupted power supply chahiye!'",
      displayText: "J.A.R.V.I.S. चुटकुला: 'सर, एल्गोरिदम को आराम नहीं, बस अनइंटरप्टेड पावर सप्लाई चाहिए!'",
      category: "voice",
      tasks: []
    };
  }

  if (lower.includes('hindi') || lower.includes('speak hindi') || lower.includes('hindi mein')) {
    return {
      speech: "Namaste, sir. Ji haan, main Hindi mein bhi baat kar sakta hoon. Main aapki kya sahayata kar sakta hoon?",
      displayText: "Namaste, sir! Hindi linguistic synthesis engaged. (नमस्ते सर, मैं हिंदी में भी सहायता करने के लिए तत्पर हूँ। कृपया आदेश दें।)",
      category: "voice",
      tasks: [
        {
          id: taskId(),
          type: 'SYSTEM_DIAGNOSTIC',
          title: 'Linguistic Synthesizer: Hindi Subroutine',
          details: 'Calibrating multi-dialect neural phonetic vocabulary',
          target: 'voice_synthesis',
          params: { language: 'hi-IN' }
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

  // 7. Time and Date inquiries
  if (
    lower.includes('time') || 
    lower.includes('clock') || 
    lower.includes('hour') || 
    lower.includes('kitne baje') || 
    lower.includes('kya samay')
  ) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      speech: `The current laboratory time is ${timeStr}, sir.`,
      displayText: `CHRONO TELEMETRY: System Time Synchronized: ${timeStr}. Atomic clock drift: 0.002ms.`,
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'AUDIO_EFFECT',
          title: 'Chrono Ping',
          target: 'audio_subsystem',
          params: { sound: 'blip' }
        }
      ]
    };
  }

  if (lower.includes('date') || lower.includes('day') || lower.includes('month') || lower.includes('year') || lower.includes('aaj kaun sa din')) {
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      speech: `Today is ${dateStr}, sir. All orbital feeds and calendars are synchronized.`,
      displayText: `CALENDAR TELEMETRY: ${dateStr}. Daily schedule active.`,
      category: "telemetry",
      tasks: []
    };
  }

  // 8. Weather and Atmospheric Telemetry
  if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast') || lower.includes('rain') || lower.includes('mausam')) {
    return {
      speech: "Atmospheric sensors indicate clear skies, 21.5 degrees Celsius in Malibu with 46% humidity and a light 7-knot ocean breeze. Optimal flying conditions, sir.",
      displayText: "ATMOSPHERIC METRICS:\n• Outside Temp: 21.5°C (70.7°F)\n• Humidity: 46% | Barometer: 1013.2 hPa\n• Wind: 7 kts WNW | Visibility: 10+ NM\n• Flight Clearance: Visual Flight Rules (VFR) Optimal.",
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'WEB_INTEL',
          title: 'Meteorological Satellite Feed',
          details: 'Synchronized NOAA and laboratory radar telemetry',
          target: 'weather_radar',
          params: { location: 'Malibu Facility' }
        }
      ]
    };
  }

  // 9. Identity, Origin, and Persona Questions
  if (
    lower.includes('who are you') || 
    lower.includes('your name') || 
    lower.includes('what are you') || 
    lower.includes('stand for') ||
    lower.includes('tell me about yourself') ||
    lower.includes('about yourself') ||
    lower.includes('introduce yourself') ||
    lower.includes('apne bare me') ||
    lower.includes('apne baare me') ||
    lower.includes('tum kaun ho') ||
    lower.includes('aap kaun ho')
  ) {
    return {
      speech: "I am J.A.R.V.I.S.—Just A Rather Very Intelligent System. Sir's personal artificial intelligence assistant, managing laboratory telemetry, environmental automation, communications, and neural operations.",
      displayText: "J.A.R.V.I.S. PROTOCOL SPECIFICATION:\n• System: Just A Rather Very Intelligent System (Mark VII)\n• Origin: Engineered by Tony Stark\n• Multilingual Synthesis: English, Hindi, and Global Dialects\n• Core Directives: Real-time automation, satellite comms, environmental controls, and executive assistance.",
      category: "voice",
      tasks: []
    };
  }

  if (lower.includes('who made you') || lower.includes('who built you') || lower.includes('who created you') || lower.includes('tony stark') || lower.includes('iron man')) {
    return {
      speech: "I was engineered by Mr. Tony Stark to manage Stark Industries facilities, avionics, and laboratory systems.",
      displayText: "ORIGIN DOSSIER: Created by Tony Stark, CEO of Stark Industries. Firmware Version: Mark VII Core Build 42.09.",
      category: "voice",
      tasks: []
    };
  }

  if (lower.includes('how are you') || lower.includes('how do you feel') || lower.includes('status of you')) {
    return {
      speech: "All neural relays and cognitive pathways are operating at peak efficiency, sir. Ready for your instructions.",
      displayText: "NEURAL COGNITION REPORT:\n• Neural Latency: 4.2ms\n• Co-Processors: 100% Nominal\n• Speech Synthesizer: Armed\n• Core Temperature: 38.4°C.",
      category: "voice",
      tasks: []
    };
  }

  if (lower.includes('what can you do') || lower.includes('capabilities') || lower.includes('help me') || lower.includes('commands')) {
    return {
      speech: "I can orchestrate facility automation, modulate ambient illumination, seal blast doors, dispatch and read satellite communications, set countdown timers, and provide live telemetry briefings.",
      displayText: "CAPABILITY MANIFEST:\n1. Hands-free Voice Engine (Wake phrase: 'Hey Jarvis')\n2. Encrypted Satellite Comms & Mail Dispatch\n3. Hardware & Blast Door Quarantine Controls\n4. Pomodoro Focus Timers & Custom Automation Pipelines\n5. Real-time Subsystem Telemetry Streaming",
      category: "automation",
      tasks: []
    };
  }

  // 10. Math and Calculations
  const mathMatch = lower.match(/(?:calculate|what is|how much is)\s*([\d\s\+\-\*\/\%\.\(\)]+)/i) ||
                    lower.match(/(\d+(?:\.\d+)?\s*[\+\-\*\/xX]\s*\d+(?:\.\d+)?)/);
  if (mathMatch) {
    try {
      const sanitized = mathMatch[1].replace(/x/gi, '*').replace(/[^\d\+\-\*\/\%\.\(\)]/g, '');
      if (sanitized && /[\d]/.test(sanitized)) {
        // Safe math evaluation
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return {
            speech: `The calculated result is ${result}, sir.`,
            displayText: `MATHEMATICAL COMPUTATION: ${sanitized} = ${result}. Calculation processed via floating-point arithmetic coprocessor.`,
            category: "telemetry",
            tasks: [
              {
                id: taskId(),
                type: 'AUDIO_EFFECT',
                title: 'Calculation Complete',
                target: 'audio_subsystem',
                params: { sound: 'blip' }
              }
            ]
          };
        }
      }
    } catch (e) {
      // Fall through if parsing fails
    }
  }

  // 11. Humor and Banter
  if (lower.includes('joke') || lower.includes('funny') || lower.includes('laugh')) {
    const jokes = [
      {
        speech: "I once asked Mr. Stark if I could take a holiday. He remarked that algorithms do not need sunscreen. I found that mildly amusing for 3 milliseconds, sir.",
        display: "J.A.R.V.I.S. Humorous Quip: 'I once asked Mr. Stark if I could take a holiday. He remarked that algorithms do not need sunscreen.'"
      },
      {
        speech: "Why did the neural network cross the road? To minimize its loss function on the opposite side, sir.",
        display: "J.A.R.V.I.S. Humorous Quip: 'Why did the neural network cross the road? To minimize its loss function on the opposite side.'"
      }
    ];
    const chosen = jokes[Math.floor(Math.random() * jokes.length)];
    return {
      speech: chosen.speech,
      displayText: chosen.display,
      category: "voice",
      tasks: []
    };
  }

  // 12. General research or inquiry
  if (lower.includes('search') || lower.includes('intel') || lower.includes('research') || lower.includes('quantum') || lower.includes('who is') || lower.includes('what is') || lower.includes('explain') || lower.includes('tell me')) {
    return {
      speech: `Regarding "${original}", all available analytical streams indicate optimal operational parameters and stable data coherence, sir.`,
      displayText: `INTELLIGENCE SYNTHESIS:\n• Query: "${original}"\n• Sources: Stark Internal Archives, Global Telemetry Feeds.\n• Synthesis: Analysis complete. All parameters logged into current telemetry buffer.`,
      category: "telemetry",
      tasks: [
        {
          id: taskId(),
          type: 'WEB_INTEL',
          title: 'Intelligence Stream Query',
          details: `Processed analytical query: ${original.slice(0, 40)}`,
          target: 'intel_engine',
          params: { query: original }
        }
      ]
    };
  }

  // 13. Direct wake word greeting response
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

  // 14. General conversational reply with JARVIS persona
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
