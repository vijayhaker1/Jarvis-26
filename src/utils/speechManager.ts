// Speech recognition and speech synthesis manager for JARVIS with hardened, low-latency execution and wake-word detection
import { soundEngine } from './audioSynthesizer';

export type RecognitionCallback = (text: string, isFinal: boolean) => void;
export type StateChangeCallback = (isListening: boolean, isWakeMode: boolean, hasPermissionError: boolean) => void;
export type WakeEventCallback = (type: 'WAKE_WORD_TRIGGERED', command?: string) => void;
export type CommandCallback = (command: string) => void;
export type FollowUpCallback = (active: boolean) => void;
export type VoiceProfile = 'ironman' | 'workshop' | 'baritone' | 'hindi' | 'browser';

class SpeechManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private voiceMuted: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private bestEnglishVoice: SpeechSynthesisVoice | null = null;
  private bestHindiVoice: SpeechSynthesisVoice | null = null;
  private voiceLanguage: 'auto' | 'en' | 'hi' = 'auto';

  // Authentic Iron Man Paul Bettany voice profile configurations
  private voiceProfile: VoiceProfile = 'ironman';
  private currentAudio: HTMLAudioElement | null = null;
  private pitchTuning: string = '-2Hz';
  private rateTuning: string = '-2%';
  private holographicAcoustics: boolean = true;
  private onVoiceProfileChangeCallbacks: Set<(profile: VoiceProfile) => void> = new Set();

  private onTranscriptCallbacks: Set<RecognitionCallback> = new Set();
  private onStateCallbacks: Set<StateChangeCallback> = new Set();
  private onWakeCallbacks: Set<WakeEventCallback> = new Set();
  private onCommandCallbacks: Set<CommandCallback> = new Set();
  private onFollowUpCallbacks: Set<FollowUpCallback> = new Set();

  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakingTimeout: any = null;

  // Hands-free wake word state & safety flags
  private wakeWordEnabled: boolean = true;
  private autoRestart: boolean = false;
  private restartTimeout: any = null;
  private awaitingCommandAfterWake: boolean = false;
  private wakeCommandTimeout: any = null;
  private conversationalSessionActive: boolean = false;
  private conversationalSessionTimeout: any = null;

  private silenceDebounceTimeout: any = null;
  private latestTranscript: string = '';
  private lastDispatchedCommand: string = '';
  private lastDispatchedTimestamp: number = 0;
  private hasPermissionError: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('jarvis_voice_profile') as VoiceProfile;
        if (savedProfile && ['ironman', 'workshop', 'baritone', 'hindi', 'browser'].includes(savedProfile)) {
          this.voiceProfile = savedProfile;
        }
        const savedAcoustics = localStorage.getItem('jarvis_holographic_acoustics');
        if (savedAcoustics !== null) {
          this.holographicAcoustics = savedAcoustics === 'true';
        }
      } catch (e) {}

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.hasPermissionError = false;
            this.notifyState();
          };

          this.recognition.onresult = (event: any) => {
            // Ignore microphone while Jarvis is actively speaking to prevent audio feedback loop
            if (this.isSpeaking) return;

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            const activeText = (finalTranscript || interimTranscript).trim();
            if (!activeText) return;

            this.latestTranscript = activeText;

            // Immediately stream live audio text to UI
            this.notifyTranscript(activeText, !!finalTranscript);

            if (finalTranscript) {
              // Phrase is finalized by speech engine
              if (this.silenceDebounceTimeout) {
                clearTimeout(this.silenceDebounceTimeout);
                this.silenceDebounceTimeout = null;
              }
              this.handleIncomingSpeech(activeText, true);
            } else {
              // Interim results: Debounce for 1100ms of user silence
              // This guarantees that even if the browser doesn't set isFinal immediately,
              // pausing speech will trigger command execution reliably.
              if (this.silenceDebounceTimeout) clearTimeout(this.silenceDebounceTimeout);
              this.silenceDebounceTimeout = setTimeout(() => {
                if (!this.isSpeaking && this.latestTranscript.trim().length > 1) {
                  this.handleIncomingSpeech(this.latestTranscript.trim(), true);
                }
              }, 1100);
            }
          };

          this.recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              console.warn('Speech recognition permission not granted. Waiting for user interaction.');
              this.hasPermissionError = true;
              this.autoRestart = false;
              this.isListening = false;
              if (this.restartTimeout) clearTimeout(this.restartTimeout);
              this.notifyState();
              return;
            }

            // 'no-speech' and 'aborted' are normal lifecycle events
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.warn('Speech recognition warning:', event.error);
            }
          };

          this.recognition.onend = () => {
            this.isListening = false;
            this.notifyState();

            // Only restart if autoRestart is desired, user permitted access, and not speaking
            if (this.autoRestart && !this.isSpeaking && !this.hasPermissionError) {
              this.scheduleRestart(250);
            }
          };

          this.isSupported = true;
        } catch (e) {
          console.warn('Failed to initialize speech recognition', e);
        }
      }

      this.initVoices();
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // 1. Natural English Voice (British priority for authentic JARVIS, with high-definition natural fallbacks)
        this.bestEnglishVoice =
          // Edge / Windows Online Natural British voices
          voices.find(v => v.lang.includes('en-GB') && (v.name.includes('Natural') || v.name.includes('Ryan') || v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
          // Chrome Google UK English Male
          voices.find(v => v.name.includes('Google UK English Male')) ||
          // Safari / iOS Daniel or Oliver
          voices.find(v => v.lang.includes('en-GB') && (v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Arthur'))) ||
          // Standard en-GB
          voices.find(v => v.lang.includes('en-GB')) ||
          // High-grade Natural English US/any
          voices.find(v => v.name.includes('Natural') && v.lang.startsWith('en')) ||
          voices.find(v => v.name.includes('Guy') || v.name.includes('Google US English') || v.name.includes('Samantha')) ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];

        // 2. Natural Hindi Voice
        this.bestHindiVoice =
          // Edge / Windows Natural Hindi (e.g. Swara or Madhur Online Natural)
          voices.find(v => (v.lang.startsWith('hi') || v.lang.includes('hi-IN')) && (v.name.includes('Natural') || v.name.includes('Online'))) ||
          // Google Hindi
          voices.find(v => v.name.includes('Google हिन्दी') || v.name.includes('Google Hindi') || v.name.toLowerCase().includes('hindi')) ||
          // Standard hi-IN
          voices.find(v => v.lang.startsWith('hi') || v.lang.includes('hi-IN')) ||
          // Apple Lekha
          voices.find(v => v.name.toLowerCase().includes('lekha') || v.name.toLowerCase().includes('neel')) ||
          // Indian English voice fallback
          voices.find(v => v.lang.includes('en-IN') || v.name.toLowerCase().includes('india')) ||
          null;

        this.selectedVoice = this.voiceLanguage === 'hi' && this.bestHindiVoice ? this.bestHindiVoice : this.bestEnglishVoice;
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }

  public setVoiceLanguage(lang: 'auto' | 'en' | 'hi') {
    this.voiceLanguage = lang;
    if (this.recognition) {
      if (lang === 'hi') {
        this.recognition.lang = 'hi-IN';
      } else if (lang === 'en') {
        this.recognition.lang = 'en-US';
      } else {
        this.recognition.lang = 'en-US';
      }
    }
  }

  public getVoiceLanguage(): 'auto' | 'en' | 'hi' {
    return this.voiceLanguage;
  }

  public activateFollowUpSession(durationMs = 14000) {
    this.conversationalSessionActive = true;
    if (this.conversationalSessionTimeout) clearTimeout(this.conversationalSessionTimeout);
    this.conversationalSessionTimeout = setTimeout(() => {
      this.deactivateFollowUpSession();
    }, durationMs);
    this.notifyFollowUp();
  }

  public deactivateFollowUpSession() {
    this.conversationalSessionActive = false;
    if (this.conversationalSessionTimeout) {
      clearTimeout(this.conversationalSessionTimeout);
      this.conversationalSessionTimeout = null;
    }
    this.notifyFollowUp();
  }

  public getIsFollowUpActive(): boolean {
    return this.conversationalSessionActive;
  }

  private notifyFollowUp() {
    this.onFollowUpCallbacks.forEach(cb => cb(this.conversationalSessionActive));
  }

  public onFollowUpChange(cb: FollowUpCallback) {
    this.onFollowUpCallbacks.add(cb);
    return () => this.onFollowUpCallbacks.delete(cb);
  }

  private dispatchCommand(command: string) {
    const clean = command.trim();
    if (!clean || clean.length < 2) return;
    const lower = clean.toLowerCase();
    const now = Date.now();

    // Prevent duplicate triggers within 1500ms
    if (this.lastDispatchedCommand === lower && now - this.lastDispatchedTimestamp < 1500) {
      return;
    }

    this.lastDispatchedCommand = lower;
    this.lastDispatchedTimestamp = now;
    this.latestTranscript = '';
    if (this.silenceDebounceTimeout) {
      clearTimeout(this.silenceDebounceTimeout);
      this.silenceDebounceTimeout = null;
    }

    // Notify listeners once with the finalized user command
    this.onCommandCallbacks.forEach((cb) => cb(clean));
  }

  private handleIncomingSpeech(text: string, isFinal: boolean) {
    const clean = text.trim();
    if (!clean || clean.length < 2) return;
    const lower = clean.toLowerCase();

    // Check for conversational termination / exit words
    const isExitWord = /^(?:thank you|thanks jarvis|that's all|bye|goodbye|cancel|stop|stand down|bas itna hi|shukriya|alvida)\b/i.test(clean);
    if (isExitWord && (this.conversationalSessionActive || this.awaitingCommandAfterWake)) {
      this.deactivateFollowUpSession();
      this.clearWakeTimeout();
      this.awaitingCommandAfterWake = false;
      this.speak("Standing by, sir. Call upon me whenever needed.");
      return;
    }

    // Wake word patterns: "hey jarvis", "hi jarvis", "ok jarvis", "okay jarvis", "jarvis", "jarves", "travis", "service", "harvis"
    const wakeRegex = /^(?:(?:hey|hi|hello|ok|okay)\s+)?(?:jarvis|jarves|travis|service|harvis)\b(?:\s*[,:]?\s*(.*))?/i;
    const wakeMatch = lower.match(wakeRegex);

    if (wakeMatch) {
      const trailingCommand = wakeMatch[1] ? wakeMatch[1].trim() : '';

      // Case 1: Spoke "Hey Jarvis" followed immediately by command (e.g. "Hey Jarvis, what is time now?")
      if (trailingCommand.length > 1) {
        this.clearWakeTimeout();
        this.awaitingCommandAfterWake = false;
        this.activateFollowUpSession(14000);
        this.dispatchCommand(trailingCommand);
        return;
      }

      // Case 2: Spoke "Hey Jarvis" alone
      this.awaitingCommandAfterWake = true;
      this.activateFollowUpSession(14000);
      this.notifyWake('WAKE_WORD_TRIGGERED');

      // Give user 12 seconds to speak their directive after saying "Hey Jarvis"
      this.clearWakeTimeout();
      this.wakeCommandTimeout = setTimeout(() => {
        this.awaitingCommandAfterWake = false;
        this.notifyState();
      }, 12000);
      return;
    }

    // Case 3: In active conversational follow-up window (e.g. asked question 1, now asking question 2 directly like "what is time now ?")
    if (this.conversationalSessionActive) {
      this.clearWakeTimeout();
      this.awaitingCommandAfterWake = false;
      this.activateFollowUpSession(14000); // refresh conversational window
      this.dispatchCommand(clean);
      return;
    }

    // Case 4: Already in command capture window after "Hey Jarvis" was spoken, OR manual directive mode
    if (this.awaitingCommandAfterWake || !this.wakeWordEnabled) {
      this.clearWakeTimeout();
      this.awaitingCommandAfterWake = false;
      this.activateFollowUpSession(14000);
      this.dispatchCommand(clean);
      return;
    }

    // Case 5: Spoke "jarvis" anywhere inside the sentence (e.g. "What is the time, Jarvis?")
    if (lower.includes('jarvis') || lower.includes('jarves')) {
      const stripped = clean.replace(/\b(?:(?:hey|hi|hello|ok|okay)\s+)?(?:jarvis|jarves)\b/gi, '').trim();
      if (stripped.length > 1) {
        this.clearWakeTimeout();
        this.awaitingCommandAfterWake = false;
        this.activateFollowUpSession(14000);
        this.dispatchCommand(stripped);
        return;
      }
    }

    // Standard transcript reporting for HUD visual banner display only
    this.notifyTranscript(text, isFinal);
  }

  public setAwaitingCommand(awaiting: boolean) {
    this.awaitingCommandAfterWake = awaiting;
    if (awaiting) {
      this.clearWakeTimeout();
      this.wakeCommandTimeout = setTimeout(() => {
        this.awaitingCommandAfterWake = false;
        this.notifyState();
      }, 10000);
    }
  }

  private clearWakeTimeout() {
    if (this.wakeCommandTimeout) {
      clearTimeout(this.wakeCommandTimeout);
      this.wakeCommandTimeout = null;
    }
  }

  private scheduleRestart(delayMs = 250) {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    if (this.hasPermissionError || !this.autoRestart || this.isSpeaking) return;

    this.restartTimeout = setTimeout(() => {
      if (this.autoRestart && !this.isSpeaking && !this.isListening && !this.hasPermissionError) {
        try {
          this.recognition?.start();
        } catch (e) {
          // Ignore state collision
        }
      }
    }, delayMs);
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getHasPermissionError(): boolean {
    return this.hasPermissionError;
  }

  public getIsWakeMode(): boolean {
    return this.autoRestart && this.wakeWordEnabled && !this.hasPermissionError;
  }

  public getIsAwaitingCommand(): boolean {
    return this.awaitingCommandAfterWake;
  }

  public setWakeWordEnabled(enabled: boolean) {
    this.wakeWordEnabled = enabled;
  }

  // Start continuous hands-free listening for "Hey Jarvis"
  public startHandsFreeListening() {
    if (!this.recognition) return;
    this.hasPermissionError = false;
    this.autoRestart = true;
    this.wakeWordEnabled = true;

    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        // Recognition might already be starting
      }
    }
    this.notifyState();
  }

  // Stop continuous hands-free listening
  public stopHandsFreeListening() {
    this.autoRestart = false;
    this.awaitingCommandAfterWake = false;
    this.clearWakeTimeout();
    if (this.restartTimeout) clearTimeout(this.restartTimeout);

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.notifyState();
  }

  public startListening() {
    this.startHandsFreeListening();
  }

  public stopListening() {
    this.stopHandsFreeListening();
  }

  public primeAudio() {
    soundEngine.unlock();
    if (typeof window !== 'undefined') {
      try {
        // Unlock HTMLAudioElement on user gesture
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
          silentAudio.pause();
        }).catch(() => {});
      } catch (e) {}

      if ('speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          const prime = new SpeechSynthesisUtterance(' ');
          prime.volume = 0.01;
          prime.rate = 10;
          window.speechSynthesis.speak(prime);
        } catch (e) {}
      }
    }
  }

  public setVoiceMuted(muted: boolean) {
    this.voiceMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
  }

  public isVoiceMuted(): boolean {
    return this.voiceMuted;
  }

  public getVoiceProfile(): VoiceProfile {
    return this.voiceProfile;
  }

  public setVoiceProfile(profile: VoiceProfile) {
    this.voiceProfile = profile;
    try {
      localStorage.setItem('jarvis_voice_profile', profile);
    } catch (e) {}
    this.onVoiceProfileChangeCallbacks.forEach(cb => cb(profile));
  }

  public onVoiceProfileChange(cb: (profile: VoiceProfile) => void) {
    this.onVoiceProfileChangeCallbacks.add(cb);
    return () => this.onVoiceProfileChangeCallbacks.delete(cb);
  }

  public getHolographicAcoustics(): boolean {
    return this.holographicAcoustics;
  }

  public setHolographicAcoustics(enabled: boolean) {
    this.holographicAcoustics = enabled;
    try {
      localStorage.setItem('jarvis_holographic_acoustics', String(enabled));
    } catch (e) {}
  }

  public auditionVoice(sampleText?: string) {
    this.primeAudio();
    const phrase = sampleText || "At your service, sir. All Stark laboratory flight thrusters and perimeter defenses are standing by.";
    this.speak(phrase);
  }

  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void
  ) {
    if (this.voiceMuted || typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = text
      .replace(/[*_#`[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Halt any currently active audio or speech synthesis
    this.stopSpeaking();

    // Temporarily pause speech recognition while Jarvis speaks to avoid self-triggering
    if (this.isListening) {
      try {
        this.recognition?.stop();
      } catch (e) {}
    }

    // Authentic holographic helmet HUD activation sound
    if (this.holographicAcoustics) {
      try {
        soundEngine.playBlip(780);
      } catch (e) {}
    }

    // If neural voice profile is selected, invoke the high-fidelity server Edge-TTS stream
    if (this.voiceProfile !== 'browser') {
      this.speakWithNeuralTTS(cleanText, onStart, onEnd);
    } else {
      this.speakWithBrowserSynthesis(cleanText, onStart, onEnd);
    }
  }

  private speakWithNeuralTTS(
    cleanText: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    let hasFinished = false;

    const finishSpeech = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
      this.isSpeaking = false;
      this.currentAudio = null;
      if (onEnd) onEnd();

      // Enable conversational follow-up window
      if (this.wakeWordEnabled || this.autoRestart) {
        this.activateFollowUpSession(14000);
      }

      // Resume continuous hands-free listening automatically after speaking
      if (this.autoRestart && !this.hasPermissionError) {
        this.scheduleRestart(350);
      }
    };

    try {
      const queryParams = new URLSearchParams({
        text: cleanText,
        voice: this.voiceProfile,
        pitch: this.pitchTuning,
        rate: this.rateTuning,
        lang: this.voiceLanguage,
      });

      const audioUrl = `/api/jarvis/tts?${queryParams.toString()}`;
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        finishSpeech();
      };

      audio.onerror = (err) => {
        console.warn('[Neural TTS] Server audio stream unavailable or interrupted, switching to calibrated browser speech synthesis', err);
        if (!hasFinished) {
          hasFinished = true;
          if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
          this.currentAudio = null;
          this.speakWithBrowserSynthesis(cleanText, onStart, onEnd);
        }
      };

      // Watchdog timeout to prevent audio stream from hanging
      const estimatedDurationMs = Math.max(3000, (cleanText.length / 11) * 1000 + 2000);
      this.speakingTimeout = setTimeout(() => {
        if (!hasFinished) {
          finishSpeech();
        }
      }, estimatedDurationMs);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn('[Neural TTS] Autoplay prevented, switching to local speech synthesis fallback:', playErr);
          if (!hasFinished) {
            hasFinished = true;
            if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
            this.currentAudio = null;
            this.speakWithBrowserSynthesis(cleanText, onStart, onEnd);
          }
        });
      }
    } catch (e) {
      console.warn('[Neural TTS] Pipeline exception, falling back:', e);
      this.speakWithBrowserSynthesis(cleanText, onStart, onEnd);
    }
  }

  private speakWithBrowserSynthesis(
    cleanText: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      if (this.speakingTimeout) clearTimeout(this.speakingTimeout);

      if (!this.selectedVoice) {
        this.initVoices();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
      const hasHindiWords = /\b(namaste|aap|aapka|aapki|main|mera|meri|hoon|hai|hain|kya|kaise|theek|sahayata|aadesh|samay|baje|taarikh|shukriya|dhanyavaad|kripya|boliye|bolo|kaun)\b/i.test(cleanText);
      const isHindi = this.voiceLanguage === 'hi' || (this.voiceLanguage === 'auto' && (hasDevanagari || hasHindiWords));

      if (isHindi && this.bestHindiVoice) {
        utterance.voice = this.bestHindiVoice;
        utterance.lang = this.bestHindiVoice.lang || 'hi-IN';
        utterance.rate = 1.0;
        utterance.pitch = 0.98;
      } else if (isHindi) {
        utterance.lang = 'hi-IN';
        utterance.rate = 1.0;
        utterance.pitch = 0.98;
      } else {
        if (this.bestEnglishVoice) {
          utterance.voice = this.bestEnglishVoice;
        } else if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        }
        utterance.lang = this.bestEnglishVoice?.lang || 'en-GB';
        utterance.rate = 0.96; // Calibrated Paul Bettany RP pace
        utterance.pitch = 0.92; // Dignified baritone register
      }

      let hasFinished = false;
      const finishSpeech = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (onEnd) onEnd();

        if (this.wakeWordEnabled || this.autoRestart) {
          this.activateFollowUpSession(14000);
        }

        if (this.autoRestart && !this.hasPermissionError) {
          this.scheduleRestart(350);
        }
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = (e) => {
        console.warn('Browser speech synthesis warning:', e);
        finishSpeech();
      };

      const estimatedDurationMs = Math.max(2500, (cleanText.length / 14) * 1000 + 1000);
      this.speakingTimeout = setTimeout(() => {
        if (!hasFinished) {
          finishSpeech();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Browser speech synthesis error', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
      if (this.autoRestart && !this.hasPermissionError) {
        this.scheduleRestart(300);
      }
    }
  }

  public stopSpeaking() {
    if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (this.autoRestart && !this.hasPermissionError) {
      this.scheduleRestart(200);
    }
  }

  public onTranscript(cb: RecognitionCallback) {
    this.onTranscriptCallbacks.add(cb);
    return () => this.onTranscriptCallbacks.delete(cb);
  }

  public onStateChange(cb: StateChangeCallback) {
    this.onStateCallbacks.add(cb);
    return () => this.onStateCallbacks.delete(cb);
  }

  public onWake(cb: WakeEventCallback) {
    this.onWakeCallbacks.add(cb);
    return () => this.onWakeCallbacks.delete(cb);
  }

  public onCommand(cb: CommandCallback) {
    this.onCommandCallbacks.add(cb);
    return () => this.onCommandCallbacks.delete(cb);
  }

  private notifyTranscript(text: string, isFinal: boolean) {
    this.onTranscriptCallbacks.forEach(cb => cb(text, isFinal));
  }

  private notifyState() {
    this.onStateCallbacks.forEach(cb => cb(this.isListening, this.getIsWakeMode(), this.hasPermissionError));
  }

  private notifyWake(type: 'WAKE_WORD_TRIGGERED', command?: string) {
    this.onWakeCallbacks.forEach(cb => cb(type, command));
  }
}

export const speechManager = new SpeechManager();
