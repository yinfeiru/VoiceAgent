export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isPlaying?: boolean;
}

export interface AudioVisualizationData {
  frequencyData: Uint8Array;
  level: number;
  isActive: boolean;
}

export interface VoiceSettings {
  sensitivity: number;
  autoSpeak: boolean;
  language: string;
  apiKey: string;
}

export interface ConnectionStatus {
  connected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface AudioStreamOptions {
  sampleRate: number;
  channels: number;
  bufferSize: number;
}

export interface GradioConnection {
  url: string;
  sessionId?: string;
  connected: boolean;
} 