export type SystemState = 'STANDBY' | 'LISTENING' | 'WAKE_DETECTED' | 'PROCESSING' | 'EXECUTING' | 'SPEAKING';

export type TaskStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: number;
  read: boolean;
  priority: 'high' | 'normal' | 'urgent';
  draftReply?: string;
  status: 'received' | 'replied' | 'sent';
}

export interface AutomationTask {
  id: string;
  title: string;
  type: 
    | 'SYSTEM_DIAGNOSTIC'
    | 'ENVIRONMENT_CONTROL'
    | 'SCHEDULE_WORKFLOW'
    | 'TIMER_ALARM'
    | 'CREATE_MEMO'
    | 'WEB_INTEL'
    | 'CUSTOM_AUTOMATION'
    | 'MAIL_DISPATCH'
    | 'READ_MAIL'
    | 'REPLY_MAIL'
    | 'AUDIO_EFFECT';
  status: TaskStatus;
  progress: number; // 0 to 100
  details?: string;
  target?: string;
  params?: Record<string, any>;
  timestamp: number;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  triggerPhrase: string;
  iconName: string;
  color: string;
  steps: {
    id: string;
    title: string;
    actionType: string;
    durationMs: number;
  }[];
  active: boolean;
  lastRun?: number;
}

export interface SmartDeviceState {
  lighting: {
    power: boolean;
    brightness: number;
    color: string; // hex or preset name
    mode: 'normal' | 'stealth' | 'combat' | 'focus';
  };
  security: {
    blastDoorsLocked: boolean;
    perimeterShield: boolean;
    securityLevel: 'DEFCON 5' | 'DEFCON 3' | 'DEFCON 1';
  };
  climate: {
    temperature: number; // in Celsius
    ventilation: boolean;
  };
  powerGrid: {
    reactorOutput: number; // 0 - 100%
    auxiliaryBattery: number; // 0 - 100%
    gridLoad: number; // in MW
  };
}

export interface JarvisMessage {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  displayText?: string;
  timestamp: number;
  tasksTriggered?: AutomationTask[];
  category?: 'voice' | 'automation' | 'telemetry' | 'diagnostic' | 'mail';
}

export interface SystemTelemetry {
  cpuUsage: number;
  memoryUsage: number;
  reactorEfficiency: number;
  coreTemperature: number;
  neuralLatencyMs: number;
  protocolStatus: string;
  audioFrequency: number[];
}

export interface CustomRule {
  id: string;
  triggerPhrase: string;
  actionSummary: string;
  enabled: boolean;
  actions: {
    type: string;
    params: Record<string, any>;
  }[];
}
