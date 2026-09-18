// Speech recognition and speech synthesis manager for JARVIS with hardened, low-latency execution and wake-word detection

export type RecognitionCallback = (text: string, isFinal: boolean) => void;
export type StateChangeCallback = (isListening: boolean, isWakeMode: boolean, hasPermissionError: boolean) => void;
export type WakeEventCallback = (type: 'WAKE_WORD_TRIGGERED' | 'WAKE_WORD_WITH_COMMAND', command?: string) => void;

class SpeechManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private voiceMuted: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private onTranscriptCallbacks: Set<RecognitionCallback> = new Set();
  private onStateCallbacks: Set<StateChangeCallback> = new Set();
  private onWakeCallbacks: Set<WakeEventCallback> = new Set();
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakingTimeout: any = null;

  // Hands-free wake word state & safety flags
  private wakeWordEnabled: boolean = true;
  private autoRestart: boolean = false;
  private restartTimeout: any = null;
  private awaitingCommandAfterWake: boolean = false;
  private wakeCommandTimeout: any = null;
  private lastProcessedTranscript: string = '';
  private lastProcessedTimestamp: number = 0;
  private hasPermissionError: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
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

            this.handleIncomingSpeech(activeText, !!finalTranscript);
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
        // Look for British English or authoritative smooth voice (Paul, Daniel, Google UK English Male, etc.)
        const preferredVoice =
          voices.find(v => v.lang.includes('en-GB') && (v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('George') || v.name.includes('Oliver'))) ||
          voices.find(v => v.lang.includes('en-GB')) ||
          voices.find(v => v.name.includes('Natural') || v.name.includes('Guy') || v.name.includes('Google US English')) ||
          voices[0];
        
        if (preferredVoice) {
          this.selectedVoice = preferredVoice;
        }
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }

  private handleIncomingSpeech(text: string, isFinal: boolean) {
    const lower = text.toLowerCase();
    const now = Date.now();

    // Prevent duplicate triggers within 600ms
    if (this.lastProcessedTranscript === lower && now - this.lastProcessedTimestamp < 600) {
      return;
    }

    // Wake word patterns: "hey jarvis", "hi jarvis", "ok jarvis", "okay jarvis", or simply "jarvis"
    const wakeMatch = lower.match(/(?:(?:hey|hi|ok|okay)\s+)?jarvis\b(?:\s*[,:]?\s*(.*))?/i);

    if (this.wakeWordEnabled) {
      if (wakeMatch) {
        const trailingCommand = wakeMatch[1] ? wakeMatch[1].trim() : '';

        // Case 1: Spoke "Hey Jarvis" followed immediately by command (e.g. "Hey Jarvis, check my mail")
        if (trailingCommand.length > 1) {
          this.lastProcessedTranscript = lower;
          this.lastProcessedTimestamp = now;
          this.clearWakeTimeout();
          this.awaitingCommandAfterWake = false;
          this.notifyWake('WAKE_WORD_WITH_COMMAND', trailingCommand);
          this.notifyTranscript(text, true);
          return;
        }

        // Case 2: Spoke "Hey Jarvis" alone
        if (lower.includes('jarvis')) {
          this.lastProcessedTranscript = lower;
          this.lastProcessedTimestamp = now;
          this.awaitingCommandAfterWake = true;
          this.notifyWake('WAKE_WORD_TRIGGERED');
          this.notifyTranscript(text, false);

          // Give user 8 seconds to speak their directive after saying "Hey Jarvis"
          this.clearWakeTimeout();
          this.wakeCommandTimeout = setTimeout(() => {
            this.awaitingCommandAfterWake = false;
            this.notifyState();
          }, 8000);
          return;
        }
      }

      // Case 3: Already in command capture window after "Hey Jarvis" was spoken
      if (this.awaitingCommandAfterWake) {
        this.notifyTranscript(text, isFinal);
        if (isFinal && text.trim().length > 1) {
          this.clearWakeTimeout();
          this.awaitingCommandAfterWake = false;
          this.lastProcessedTranscript = lower;
          this.lastProcessedTimestamp = now;
          this.notifyWake('WAKE_WORD_WITH_COMMAND', text.trim());
        }
        return;
      }
    }

    // Standard transcript reporting
    this.notifyTranscript(text, isFinal);
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const prime = new SpeechSynthesisUtterance(' ');
        prime.volume = 0.01;
        prime.rate = 10;
        window.speechSynthesis.speak(prime);
      } catch (e) {
        // ignore
      }
    }
  }

  public setVoiceMuted(muted: boolean) {
    this.voiceMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public isVoiceMuted(): boolean {
    return this.voiceMuted;
  }

  public speak(
    text: string, 
    onStart?: () => void, 
    onEnd?: () => void
  ) {
    if (this.voiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
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

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      if (this.speakingTimeout) clearTimeout(this.speakingTimeout);

      // Refresh voice if not yet assigned
      if (!this.selectedVoice) {
        this.initVoices();
      }

      // Temporarily pause speech recognition while Jarvis speaks to avoid self-triggering
      if (this.isListening) {
        try {
          this.recognition?.stop();
        } catch (e) {}
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.05; // Slightly faster, crisp British cadence
      utterance.pitch = 0.95;

      let hasFinished = false;
      const finishSpeech = () => {
        if (hasFinished) return;
        hasFinished = true;
        if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
        this.isSpeaking = false;
        this.currentUtterance = null;
        if (onEnd) onEnd();

        // Resume continuous hands-free listening automatically after speaking
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
        console.warn('Speech synthesis error or interrupted:', e);
        finishSpeech();
      };

      // Safety watchdog: Chromium speech synthesis can stall or fail to fire onend
      const estimatedDurationMs = Math.max(2500, (cleanText.length / 14) * 1000 + 1000);
      this.speakingTimeout = setTimeout(() => {
        if (!hasFinished) {
          finishSpeech();
        }
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS execution error', e);
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

  private notifyTranscript(text: string, isFinal: boolean) {
    this.onTranscriptCallbacks.forEach(cb => cb(text, isFinal));
  }

  private notifyState() {
    this.onStateCallbacks.forEach(cb => cb(this.isListening, this.getIsWakeMode(), this.hasPermissionError));
  }

  private notifyWake(type: 'WAKE_WORD_TRIGGERED' | 'WAKE_WORD_WITH_COMMAND', command?: string) {
    this.onWakeCallbacks.forEach(cb => cb(type, command));
  }
}

export const speechManager = new SpeechManager();
