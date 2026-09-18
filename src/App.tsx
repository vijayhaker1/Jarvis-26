/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SystemState, 
  AutomationTask, 
  AutomationWorkflow, 
  SmartDeviceState, 
  JarvisMessage, 
  SystemTelemetry,
  EmailMessage
} from './types';
import { soundEngine } from './utils/audioSynthesizer';
import { speechManager } from './utils/speechManager';
import { ArcReactor } from './components/ArcReactor';
import { TelemetryBar } from './components/TelemetryBar';
import { VoiceCommandBar } from './components/VoiceCommandBar';
import { TaskAutomationPanel } from './components/TaskAutomationPanel';
import { SmartDeviceControls } from './components/SmartDeviceControls';
import { LiveTelemetryLogs } from './components/LiveTelemetryLogs';
import { CustomAutomationModal } from './components/CustomAutomationModal';
import { MailCommunicationsPanel, INITIAL_EMAILS } from './components/MailCommunicationsPanel';
import { Mail, Cpu, LayoutDashboard, Sliders, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

// Initial pre-configured automation workflows
const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: 'morning_briefing',
    name: 'Protocol Alpha: Morning Briefing',
    description: 'Telemetry diagnostic, atmospheric climate fetch, agenda compile, and executive vocal report.',
    triggerPhrase: 'morning briefing',
    iconName: 'Sun',
    color: '#f59e0b',
    active: true,
    steps: [
      { id: 's1', title: 'System Diagnostics & Arc Calibration', actionType: 'SYSTEM_DIAGNOSTIC', durationMs: 1200 },
      { id: 's2', title: 'Atmospheric Environmental Sync', actionType: 'ENVIRONMENT_CONTROL', durationMs: 1000 },
      { id: 's3', title: 'Task Pipeline Compilation', actionType: 'SCHEDULE_WORKFLOW', durationMs: 900 },
    ],
  },
  {
    id: 'deep_work_focus',
    name: 'Protocol Beta: Deep Work Quarantine',
    description: 'Dims ambient illumination to Focus Blue, activates perimeter defense, and arms 25-min sprint.',
    triggerPhrase: 'engage focus mode',
    iconName: 'Zap',
    color: '#06b6d4',
    active: true,
    steps: [
      { id: 's1', title: 'Set Ambient Illumination (20% Focus Blue)', actionType: 'ENVIRONMENT_CONTROL', durationMs: 800 },
      { id: 's2', title: 'Engage Perimeter Isolation', actionType: 'ENVIRONMENT_CONTROL', durationMs: 900 },
      { id: 's3', title: 'Arm 25-Min Countdown Sprint', actionType: 'TIMER_ALARM', durationMs: 700 },
    ],
  },
  {
    id: 'facility_lockdown',
    name: 'Protocol Gamma: Facility Lockdown',
    description: 'Electromagnetic blast doors sealed, defensive grid to 100%, DEFCON 3 armed.',
    triggerPhrase: 'lock blast doors',
    iconName: 'ShieldAlert',
    color: '#f43f5e',
    active: true,
    steps: [
      { id: 's1', title: 'Engage Blast Door Locks', actionType: 'ENVIRONMENT_CONTROL', durationMs: 1100 },
      { id: 's2', title: 'Reroute Arc Grid to Force Shields', actionType: 'ENVIRONMENT_CONTROL', durationMs: 1200 },
      { id: 's3', title: 'Elevate Security to DEFCON 3', actionType: 'ENVIRONMENT_CONTROL', durationMs: 800 },
    ],
  },
  {
    id: 'intel_dossier',
    name: 'Protocol Delta: Tech Dossier Sweep',
    description: 'Scans neural information streams, cross-references models, and compiles tactical memorandum.',
    triggerPhrase: 'synthesize intelligence',
    iconName: 'Cpu',
    color: '#10b981',
    active: true,
    steps: [
      { id: 's1', title: 'Query Global Information Feeds', actionType: 'WEB_INTEL', durationMs: 1300 },
      { id: 's2', title: 'Distill Key Breakthroughs', actionType: 'WEB_INTEL', durationMs: 1100 },
      { id: 's3', title: 'Archive Memorandum in Tactical Vault', actionType: 'CREATE_MEMO', durationMs: 800 },
    ],
  },
];

const INITIAL_DEVICE_STATE: SmartDeviceState = {
  lighting: {
    power: true,
    brightness: 85,
    color: '#00f0ff',
    mode: 'normal',
  },
  security: {
    blastDoorsLocked: true,
    perimeterShield: true,
    securityLevel: 'DEFCON 5',
  },
  climate: {
    temperature: 21.5,
    ventilation: true,
  },
  powerGrid: {
    reactorOutput: 92,
    auxiliaryBattery: 99,
    gridLoad: 423,
  },
};

export default function App() {
  const [systemState, setSystemState] = useState<SystemState>('STANDBY');
  const [isListening, setIsListening] = useState(false);
  const [isWakeMode, setIsWakeMode] = useState(true);
  const [isAwaitingCommand, setIsAwaitingCommand] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [soundFxMuted, setSoundFxMuted] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(true);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [hasMicPermissionError, setHasMicPermissionError] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<'all' | 'mail' | 'tasks' | 'devices' | 'logs'>('all');

  // Core Data State
  const [deviceState, setDeviceState] = useState<SmartDeviceState>(INITIAL_DEVICE_STATE);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(INITIAL_WORKFLOWS);
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>(INITIAL_EMAILS);
  const [activeTimers, setActiveTimers] = useState<
    { id: string; label: string; remainingSeconds: number; totalSeconds: number }[]
  >([]);

  // Telemetry Metrics
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    cpuUsage: 14.8,
    memoryUsage: 4.2,
    reactorEfficiency: 99.4,
    coreTemperature: 34.2,
    neuralLatencyMs: 12,
    protocolStatus: 'MARK VII NOMINAL',
    audioFrequency: [],
  });

  // Message stream
  const [messages, setMessages] = useState<JarvisMessage[]>([
    {
      id: 'init_welcome',
      sender: 'jarvis',
      text: 'Good day, sir. All laboratory protocols are online, satellite comms are synchronized, and real-time task automation is at your disposal.',
      displayText: 'J.A.R.V.I.S. Core Online. Voice recognition, holographic HUD, satellite mail dispatch, and real-time task automation active. How may I be of assistance, sir?',
      timestamp: Date.now(),
      category: 'telemetry',
    },
  ]);

  // Check health and Gemini status on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setGeminiConnected(data.geminiConfigured);
      })
      .catch((err) => {
        console.warn('Health check warning:', err);
      });

    setIsSpeechSupported(speechManager.getIsSupported());

    // Unlock Web Audio Context and SpeechSynthesis on first user interaction anywhere
    const unlockOnInteraction = () => {
      soundEngine.unlock();
      speechManager.primeAudio();
    };

    window.addEventListener('pointerdown', unlockOnInteraction, { passive: true });
    window.addEventListener('keydown', unlockOnInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockOnInteraction);
      window.removeEventListener('keydown', unlockOnInteraction);
    };
  }, []);

  // Fluctuating live telemetry simulation for sci-fi atmosphere
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: +(12 + Math.random() * 5).toFixed(1),
        memoryUsage: +(4.1 + Math.random() * 0.4).toFixed(1),
        coreTemperature: +(34.0 + Math.random() * 0.6).toFixed(1),
        reactorEfficiency: +(99.2 + Math.random() * 0.6).toFixed(1),
        neuralLatencyMs: Math.floor(10 + Math.random() * 5),
      }));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Active timers countdown tick
  useEffect(() => {
    if (activeTimers.length === 0) return;

    const timerInterval = setInterval(() => {
      setActiveTimers((prev) => {
        const next = [];
        for (const t of prev) {
          if (t.remainingSeconds <= 1) {
            soundEngine.playAlertBeep();
            setMessages((prevMsg) => [
              ...prevMsg,
              {
                id: 'timer_done_' + Date.now(),
                sender: 'jarvis',
                text: `Sir, your countdown timer for "${t.label}" has elapsed.`,
                displayText: `TIMER ALERT: "${t.label}" interval completed.`,
                timestamp: Date.now(),
                category: 'automation',
              },
            ]);
            speechManager.speak(`Sir, your countdown timer for ${t.label} has elapsed.`);
          } else {
            next.push({ ...t, remainingSeconds: t.remainingSeconds - 1 });
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeTimers.length]);

  // Wire up speech recognition and wake-word events
  useEffect(() => {
    const unsubState = speechManager.onStateChange((listening, wakeMode, permError) => {
      setIsListening(listening);
      setIsWakeMode(wakeMode);
      setHasMicPermissionError(permError);
      if (!listening) {
        if (systemState === 'LISTENING' || systemState === 'WAKE_DETECTED') {
          setSystemState('STANDBY');
        }
      }
    });

    const unsubWake = speechManager.onWake((type, command) => {
      if (type === 'WAKE_WORD_TRIGGERED') {
        // Spoke "Hey Jarvis" alone
        setSystemState('WAKE_DETECTED');
        setIsAwaitingCommand(true);
        soundEngine.playWakeChime();

        const wakeAcks = [
          "At your service, sir. What is your command?",
          "Yes, sir? Standing by.",
          "Online and listening, sir.",
        ];
        const randomAck = wakeAcks[Math.floor(Math.random() * wakeAcks.length)];

        setMessages((prev) => [
          ...prev,
          {
            id: 'wake_' + Date.now(),
            sender: 'jarvis',
            text: randomAck,
            displayText: 'Wake phrase "Hey Jarvis" detected. Awaiting directive...',
            timestamp: Date.now(),
            category: 'voice',
          },
        ]);

        speechManager.speak(randomAck, () => {
          setSystemState('SPEAKING');
        }, () => {
          setSystemState('WAKE_DETECTED');
        });
      } else if (type === 'WAKE_WORD_WITH_COMMAND' && command) {
        // Spoke "Hey Jarvis [command]"
        setIsAwaitingCommand(false);
        soundEngine.playBlip(1100);
        executeCommand(command);
      }
    });

    const unsubTranscript = speechManager.onTranscript((transcript, isFinal) => {
      setLiveTranscript(transcript);

      // If user typed or spoke in manual mode without wake phrase
      if (!isWakeMode && isFinal && transcript.trim()) {
        soundEngine.playBlip(1100);
        executeCommand(transcript.trim());
        setLiveTranscript('');
      }
    });

    return () => {
      unsubState();
      unsubWake();
      unsubTranscript();
    };
  }, [systemState, deviceState, isWakeMode]);

  // Handle Hands-Free Wake Word Toggle
  const handleToggleWakeMode = () => {
    soundEngine.unlock();
    speechManager.primeAudio();
    const nextMode = !isWakeMode;
    setIsWakeMode(nextMode);

    if (nextMode) {
      speechManager.startHandsFreeListening();
      setIsListening(true);
      soundEngine.playWakeChime();
      setHasMicPermissionError(false);
      setMessages((prev) => [
        ...prev,
        {
          id: 'wake_on_' + Date.now(),
          sender: 'system',
          text: 'Hands-free wake-word detection armed. Say "Hey Jarvis" or "Hey Jarvis, [command]" anytime.',
          timestamp: Date.now(),
          category: 'voice',
        },
      ]);
    } else {
      speechManager.stopHandsFreeListening();
      setIsListening(false);
      soundEngine.playBlip(600);
      setIsAwaitingCommand(false);
      setSystemState('STANDBY');
      setMessages((prev) => [
        ...prev,
        {
          id: 'wake_off_' + Date.now(),
          sender: 'system',
          text: 'Hands-free wake-word detection suspended. Use the mic button or command input.',
          timestamp: Date.now(),
          category: 'voice',
        },
      ]);
    }
  };

  // Handle Voice Mute / Unmute
  const handleToggleVoice = () => {
    const nextMuted = !voiceMuted;
    setVoiceMuted(nextMuted);
    speechManager.setVoiceMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playBlip(800);
    }
  };

  // Handle Sound FX Mute / Unmute
  const handleToggleSoundFx = () => {
    const nextMuted = !soundFxMuted;
    setSoundFxMuted(nextMuted);
    soundEngine.setEnabled(!nextMuted);
    if (!nextMuted) {
      soundEngine.playBlip(1000);
    }
  };

  // Toggle listening via Arc Reactor or Mic button
  const handleToggleListening = () => {
    soundEngine.unlock();
    speechManager.primeAudio();

    if (isListening) {
      speechManager.stopHandsFreeListening();
      setIsListening(false);
      setIsWakeMode(false);
      setSystemState('STANDBY');
    } else {
      speechManager.startHandsFreeListening();
      setIsListening(true);
      setIsWakeMode(true);
      setHasMicPermissionError(false);
      setSystemState('LISTENING');
      soundEngine.playWakeChime();

      // Vocal greeting when engaging Jarvis
      const intro = "Good day, sir. J.A.R.V.I.S. online and standing by. How may I be of assistance?";
      speechManager.speak(intro, () => {
        setSystemState('SPEAKING');
      }, () => {
        setSystemState('LISTENING');
      });
    }
  };

  // Fast, non-blocking asynchronous execution of automation steps
  const executeAutomationTasks = async (incomingTasks: AutomationTask[], updates?: any) => {
    if (!incomingTasks || incomingTasks.length === 0) return;

    setTasks((prev) => [...incomingTasks, ...prev]);

    for (const task of incomingTasks) {
      // Step 1: Mark Running (70ms)
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'RUNNING', progress: 40 } : t))
      );
      soundEngine.playBlip(750);
      await new Promise((r) => setTimeout(r, 70));

      // Step 2: Progress 85% (70ms)
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, progress: 85 } : t))
      );
      await new Promise((r) => setTimeout(r, 70));

      // Handle specific task side effects
      if (task.type === 'TIMER_ALARM' && task.params?.durationSeconds) {
        const secs = task.params.durationSeconds;
        const label = task.params.label || 'Countdown';
        setActiveTimers((prev) => [
          ...prev,
          {
            id: 'timer_' + Date.now(),
            label,
            remainingSeconds: secs,
            totalSeconds: secs,
          },
        ]);
      } else if (task.type === 'ENVIRONMENT_CONTROL' && task.params) {
        const p = task.params;
        setDeviceState((prev) => ({
          ...prev,
          lighting: p.brightness !== undefined
            ? { ...prev.lighting, ...p }
            : prev.lighting,
          security: p.blastDoorsLocked !== undefined
            ? { ...prev.security, ...p }
            : prev.security,
        }));
      } else if (task.type === 'REPLY_MAIL') {
        // Mark email as replied immediately
        setEmails((prev) =>
          prev.map((m) =>
            m.id === 'mail_1' || m.sender.toLowerCase().includes('pepper')
              ? { ...m, status: 'replied', read: true }
              : m
          )
        );
      } else if (task.type === 'READ_MAIL') {
        setEmails((prev) => prev.map((m) => ({ ...m, read: true })));
      } else if (task.type === 'MAIL_DISPATCH') {
        soundEngine.playTaskComplete();
      }

      // Step 3: Complete
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'COMPLETED', progress: 100 } : t))
      );
      soundEngine.playTaskComplete();
    }

    // Apply any explicit device updates from response
    if (updates) {
      setDeviceState((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  };

  // Primary Command Execution Routine (dispatches to server & updates HUD with zero lag)
  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    soundEngine.unlock();
    speechManager.primeAudio();

    // Strip out leading "hey jarvis" or "jarvis" so the NLP focuses on directive
    const cleanCommand = command
      .replace(/^(?:(?:hey|hi|ok|okay)\s+)?jarvis\b[\s,:]*/i, '')
      .trim() || command.trim();

    setIsAwaitingCommand(false);

    if (!isWakeMode) {
      speechManager.stopListening();
      setIsListening(false);
    }
    setSystemState('PROCESSING');
    soundEngine.playScanSweep();

    // Append user voice message
    const userMsgId = 'user_' + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: cleanCommand,
        timestamp: Date.now(),
        category: 'voice',
      },
    ]);

    // Check if command is mail related to auto-focus mail view
    const lowerCmd = cleanCommand.toLowerCase();
    if (lowerCmd.includes('mail') || lowerCmd.includes('email') || lowerCmd.includes('inbox') || lowerCmd.includes('reply')) {
      if (activeHubTab !== 'mail' && activeHubTab !== 'all') {
        setActiveHubTab('mail');
      }
    }

    try {
      // Call server backend
      const res = await fetch('/api/jarvis/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanCommand,
          deviceState,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const speechReply = data.speech || 'Right away, sir.';
      const displayReply = data.displayText || data.speech;
      const tasksToRun: AutomationTask[] = (data.tasks || []).map((t: any) => ({
        ...t,
        status: 'QUEUED',
        progress: 0,
        timestamp: Date.now(),
      }));

      // Append Jarvis response message
      const jarvisMsgId = 'jarvis_' + Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: jarvisMsgId,
          sender: 'jarvis',
          text: speechReply,
          displayText: displayReply,
          timestamp: Date.now(),
          tasksTriggered: tasksToRun,
          category: data.category || 'voice',
        },
      ]);

      // Speak back to the user IMMEDIATELY without waiting for tasks to finish
      setSystemState('SPEAKING');
      setIsSpeaking(true);
      speechManager.speak(
        speechReply,
        () => {
          setIsSpeaking(true);
          setSystemState('SPEAKING');
        },
        () => {
          setIsSpeaking(false);
          setSystemState('STANDBY');
        }
      );

      // Execute automation tasks asynchronously in real-time with zero blocking
      if (tasksToRun.length > 0) {
        executeAutomationTasks(tasksToRun, data.deviceUpdates);
      }
    } catch (err: any) {
      console.error('Command processing failure:', err);
      const fallbackMsg = "My apologies, sir. Executing local failsafe response.";
      setMessages((prev) => [
        ...prev,
        {
          id: 'error_' + Date.now(),
          sender: 'jarvis',
          text: fallbackMsg,
          displayText: `Relay Note: ${err.message}. Local failsafe activated.`,
          timestamp: Date.now(),
          category: 'diagnostic',
        },
      ]);
      setSystemState('STANDBY');
    }
  };

  // Mail Action Handlers
  const handleReplyEmail = (emailId: string, replyText: string) => {
    soundEngine.unlock();
    speechManager.primeAudio();
    soundEngine.playTaskComplete();

    // 1. Locate recipient
    const targetEmail = emails.find((m) => m.id === emailId) || emails[0];
    const recipientName = targetEmail ? targetEmail.sender : 'Miss Pepper Potts';

    // 2. Mark as replied and read in state immediately
    setEmails((prev) =>
      prev.map((m) =>
        m.id === emailId ? { ...m, status: 'replied', read: true } : m
      )
    );

    // 3. Immediately queue and show tasks in HUD
    const replyTask: AutomationTask = {
      id: 'task_reply_' + Date.now(),
      type: 'REPLY_MAIL',
      title: `Dispatch Reply to ${recipientName}`,
      details: `Expedited PGP-4096 transmission: "${replyText.slice(0, 45)}..."`,
      target: 'mail_relay',
      status: 'COMPLETED',
      progress: 100,
      timestamp: Date.now(),
    };
    const uplinkTask: AutomationTask = {
      id: 'task_uplink_' + (Date.now() + 1),
      type: 'MAIL_DISPATCH',
      title: 'Satellite Transmission Verification',
      details: 'Satellite uplink verified at 99.8% signal integrity (8ms latency)',
      target: 'satellite_uplink',
      status: 'COMPLETED',
      progress: 100,
      timestamp: Date.now(),
    };
    setTasks((prev) => [replyTask, uplinkTask, ...prev]);

    // 4. Append user & Jarvis messages to live stream
    const spokenReply = `Response dispatched immediately to ${recipientName}, sir. Outgoing transmission latency is under twelve milliseconds.`;
    setMessages((prev) => [
      ...prev,
      {
        id: 'user_mail_' + Date.now(),
        sender: 'user',
        text: `Dispatch reply to ${recipientName}: "${replyText}"`,
        timestamp: Date.now(),
        category: 'mail',
      },
      {
        id: 'jarvis_mail_' + (Date.now() + 2),
        sender: 'jarvis',
        text: spokenReply,
        displayText: `COMMS DISPATCH CONFIRMED: High-priority reply expedited to ${recipientName}. Satellite uplink latency: 11.4ms.`,
        timestamp: Date.now(),
        tasksTriggered: [replyTask, uplinkTask],
        category: 'mail',
      },
    ]);

    // 5. Vocal output immediately!
    setSystemState('SPEAKING');
    setIsSpeaking(true);
    speechManager.speak(
      spokenReply,
      () => {
        setIsSpeaking(true);
        setSystemState('SPEAKING');
      },
      () => {
        setIsSpeaking(false);
        setSystemState('STANDBY');
      }
    );

    // 6. Notify server backend asynchronously in background
    fetch('/api/jarvis/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Dispatch mail response to ${recipientName}: ${replyText}`,
        deviceState,
      }),
    }).catch((e) => console.warn('Background mail sync warning:', e));
  };

  const handleSendNewEmail = (to: string, subject: string, body: string) => {
    soundEngine.unlock();
    speechManager.primeAudio();
    soundEngine.playWakeChime();
    const newMail: EmailMessage = {
      id: 'sent_' + Date.now(),
      sender: 'Tony Stark',
      senderEmail: 'tony@starkindustries.com',
      subject,
      snippet: body.slice(0, 75) + '...',
      body,
      timestamp: Date.now(),
      read: true,
      priority: 'high',
      status: 'sent',
    };
    setEmails((prev) => [newMail, ...prev]);
    executeCommand(`Transmit dispatch to ${to} with subject ${subject}: ${body}`);
  };

  const handleMarkRead = (emailId: string) => {
    setEmails((prev) => prev.map((m) => (m.id === emailId ? { ...m, read: true } : m)));
    soundEngine.playBlip(900);
  };

  const handleRefreshMail = () => {
    soundEngine.unlock();
    speechManager.primeAudio();
    soundEngine.playScanSweep();

    const unread = emails.filter((m) => !m.read).length;
    const spoken = unread > 0
      ? `You have ${unread} pending dispatches on the satellite relay, sir.`
      : `All satellite communications channels are synchronized and up to date, sir.`;

    setMessages((prev) => [
      ...prev,
      {
        id: 'mail_sync_' + Date.now(),
        sender: 'jarvis',
        text: spoken,
        displayText: `Encrypted Satellite Uplink Synchronized. Signal strength: -42 dBm. Pending dispatches: ${unread}.`,
        timestamp: Date.now(),
        category: 'mail',
      },
    ]);

    setSystemState('SPEAKING');
    setIsSpeaking(true);
    speechManager.speak(
      spoken,
      () => {
        setIsSpeaking(true);
        setSystemState('SPEAKING');
      },
      () => {
        setIsSpeaking(false);
        setSystemState('STANDBY');
      }
    );
  };

  // Trigger an entire pre-configured routine
  const handleTriggerWorkflow = (workflow: AutomationWorkflow) => {
    soundEngine.playWakeChime();
    executeCommand(`Execute ${workflow.name}: ${workflow.triggerPhrase}`);
  };

  // Save new custom user routine
  const handleSaveCustomWorkflow = (newWf: AutomationWorkflow) => {
    setWorkflows((prev) => [newWf, ...prev]);
    soundEngine.playTaskComplete();
    const memoMsg = `Custom protocol "${newWf.name}" registered to voice registry with trigger phrase: "${newWf.triggerPhrase}".`;
    setMessages((prev) => [
      ...prev,
      {
        id: 'custom_wf_' + Date.now(),
        sender: 'jarvis',
        text: memoMsg,
        timestamp: Date.now(),
        category: 'automation',
      },
    ]);
    speechManager.speak(`Custom protocol ${newWf.name} registered and armed, sir.`);
  };

  const handleCancelTimer = (id: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== id));
    soundEngine.playBlip(600);
  };

  const handleClearLogs = () => {
    setMessages([]);
    soundEngine.playBlip(500);
  };

  const unreadMails = emails.filter((m) => !m.read).length;

  return (
    <div className="min-h-screen bg-[#030712] text-cyan-100 flex flex-col relative overflow-x-hidden">
      {/* Background Animated Sci-Fi Scanlines & Grids */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 hud-scanline" />
      </div>

      {/* Top Telemetry Header */}
      <TelemetryBar
        telemetry={telemetry}
        voiceMuted={voiceMuted}
        soundFxMuted={soundFxMuted}
        onToggleVoice={handleToggleVoice}
        onToggleSoundFx={handleToggleSoundFx}
        geminiConnected={geminiConnected}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 relative z-10">
        {/* Audio Harness & Microphone Activation Warning if Browser Blocked Mic */}
        {hasMicPermissionError && (
          <div className="w-full bg-amber-950/60 border border-amber-500/70 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-200 text-xs font-mono backdrop-blur-md animate-pulse">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>MICROPHONE ACCESS PENDING:</strong> Browser security requires explicit permission to enable hands-free audio recognition.
              </span>
            </div>
            <button
              type="button"
              id="btn-activate-mic-permission"
              onClick={handleToggleListening}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
            >
              Authorize Mic Access
            </button>
          </div>
        )}

        {/* Holographic Arc Reactor & Voice Command Center */}
        <section className="w-full flex flex-col items-center justify-center pt-2 pb-4">
          <ArcReactor
            state={systemState}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isWakeMode={isWakeMode}
            onClick={handleToggleListening}
            activeTaskCount={tasks.filter((t) => t.status === 'RUNNING').length}
          />

          {/* Voice Input & Quick Command Trigger */}
          <div className="w-full max-w-3xl mt-2">
            <VoiceCommandBar
              isListening={isListening}
              isWakeMode={isWakeMode}
              isAwaitingCommand={isAwaitingCommand}
              onToggleListening={handleToggleListening}
              onToggleWakeMode={handleToggleWakeMode}
              onSubmitCommand={executeCommand}
              systemState={systemState}
              liveTranscript={liveTranscript}
              isSpeechSupported={isSpeechSupported}
              hasMicPermissionError={hasMicPermissionError}
            />
          </div>
        </section>

        {/* Holographic Subsystem Navigation Tabs */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              id="tab-all"
              onClick={() => setActiveHubTab('all')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all ${
                activeHubTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>ALL SUBSYSTEMS</span>
            </button>

            <button
              type="button"
              id="tab-mail"
              onClick={() => setActiveHubTab('mail')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all ${
                activeHubTab === 'mail'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMMS & MAIL</span>
              {unreadMails > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {unreadMails}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-tasks"
              onClick={() => setActiveHubTab('tasks')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all ${
                activeHubTab === 'tasks'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>TASK AUTOMATION</span>
              {tasks.filter((t) => t.status === 'RUNNING').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              id="tab-devices"
              onClick={() => setActiveHubTab('devices')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-all ${
                activeHubTab === 'devices'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>HARDWARE & SECURITY</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-cyan-500/70">
            <span>RESPONSE LATENCY: <strong className="text-emerald-400">12ms</strong></span>
            <span>•</span>
            <span>VOICE CADENCE: <strong className="text-cyan-300">BRITISH EN-GB</strong></span>
          </div>
        </div>

        {/* Encrypted Comms & Mail Dispatch Center */}
        {(activeHubTab === 'all' || activeHubTab === 'mail') && (
          <section className="w-full">
            <MailCommunicationsPanel
              emails={emails}
              onReplyEmail={handleReplyEmail}
              onSendNewEmail={handleSendNewEmail}
              onMarkRead={handleMarkRead}
              onRefreshMail={handleRefreshMail}
              isProcessing={systemState === 'PROCESSING'}
            />
          </section>
        )}

        {/* Real-time Automation Engine & Routines */}
        {(activeHubTab === 'all' || activeHubTab === 'tasks') && (
          <section className="w-full">
            <TaskAutomationPanel
              tasks={tasks}
              workflows={workflows}
              onTriggerWorkflow={handleTriggerWorkflow}
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
              activeTimers={activeTimers}
              onCancelTimer={handleCancelTimer}
            />
          </section>
        )}

        {/* Environment Controls & Live Telemetry Stream Grid */}
        {(activeHubTab === 'all' || activeHubTab === 'devices' || activeHubTab === 'logs') && (
          <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Smart Device & Hardware Controls */}
            {(activeHubTab === 'all' || activeHubTab === 'devices') && (
              <div className={activeHubTab === 'devices' ? 'lg:col-span-12' : 'lg:col-span-7'}>
                <SmartDeviceControls
                  deviceState={deviceState}
                  onUpdateState={(partial) => {
                    setDeviceState((prev) => ({ ...prev, ...partial }));
                    soundEngine.playBlip(900);
                  }}
                />
              </div>
            )}

            {/* Live Telemetry & Command Stream Log */}
            {(activeHubTab === 'all' || activeHubTab === 'logs') && (
              <div className={activeHubTab === 'logs' ? 'lg:col-span-12' : 'lg:col-span-5'}>
                <LiveTelemetryLogs
                  messages={messages}
                  onClearLogs={handleClearLogs}
                />
              </div>
            )}
          </section>
        )}
      </main>

      {/* Custom Protocol Builder Modal */}
      <CustomAutomationModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaveWorkflow={handleSaveCustomWorkflow}
      />
    </div>
  );
}
