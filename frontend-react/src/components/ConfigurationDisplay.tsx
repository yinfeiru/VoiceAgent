import React, { useState, useEffect } from 'react';

interface ConfigData {
  status: string;
  configuration: {
    ai_model: {
      provider: string;
      deepseek_configured: boolean;
      qwen_configured: boolean;
    };
    stt: {
      provider: string;
      model: string;
      language: string;
    };
    tts: {
      provider: string;
      voice: string;
      rate: number;
      volume: number;
    };
    audio: {
      sample_rate: number;
      channels: number;
      chunk_duration: number;
    };
    vad: {
      threshold: number;
      min_speech_duration: number;
      silence_duration: number;
    };
    webrtc: {
      stun_server: string;
      concurrency_limit: number;
      time_limit: number;
    };
    debug: {
      audio_debug: boolean;
      audio_path: string;
    };
    performance: {
      max_audio_duration: number;
      min_audio_duration: number;
      ai_response_timeout: number;
      tts_timeout: number;
    };
  };
  stt?: {
    provider: string;
    model: string;
    language: string;
    loaded: boolean;
  };
  tts?: {
    provider: string;
    voice: string;
    rate: number;
    volume: number;
    available: boolean;
  };
  ai_model?: {
    provider: string;
    status: any;
    conversation_length: number;
  };
}

interface ConfigurationDisplayProps {
  isVisible: boolean;
  onClose: () => void;
}

const ConfigurationDisplay: React.FC<ConfigurationDisplayProps> = ({ isVisible, onClose }) => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchConfig();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const StatusBadge: React.FC<{ status: boolean; text: string }> = ({ status, text }) => (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}
    >
      {status ? '✅' : '❌'} {text}
    </span>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🔧 Configuration Status</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading configuration...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">❌ Error: {error}</p>
              <button
                onClick={fetchConfig}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {config && (
            <div className="space-y-6">
              {/* System Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">📊 System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-gray-700 mb-2">🎤 Speech-to-Text</h4>
                    <StatusBadge 
                      status={config.stt?.loaded || false} 
                      text={`${config.configuration.stt.provider} (${config.configuration.stt.model})`} 
                    />
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-gray-700 mb-2">🤖 AI Model</h4>
                    <StatusBadge 
                      status={
                        config.configuration.ai_model.provider === 'deepseek' 
                          ? config.configuration.ai_model.deepseek_configured
                          : config.configuration.ai_model.qwen_configured
                      }
                      text={config.configuration.ai_model.provider} 
                    />
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-gray-700 mb-2">🔊 Text-to-Speech</h4>
                    <StatusBadge 
                      status={config.tts?.available || false} 
                      text={`${config.configuration.tts.provider} (${config.configuration.tts.voice})`} 
                    />
                  </div>
                </div>
              </div>

              {/* Model Configuration */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">🎯 Model Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Speech Recognition</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Provider:</strong> {config.configuration.stt.provider}</li>
                      <li><strong>Model:</strong> {config.configuration.stt.model}</li>
                      <li><strong>Language:</strong> {config.configuration.stt.language}</li>
                      <li><strong>Status:</strong> 
                        <span className={`ml-1 ${config.stt?.loaded ? 'text-green-600' : 'text-red-600'}`}>
                          {config.stt?.loaded ? 'Loaded' : 'Not Loaded'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Text-to-Speech</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Provider:</strong> {config.configuration.tts.provider}</li>
                      <li><strong>Voice:</strong> {config.configuration.tts.voice}</li>
                      <li><strong>Rate:</strong> {config.configuration.tts.rate} WPM</li>
                      <li><strong>Volume:</strong> {config.configuration.tts.volume}</li>
                      <li><strong>Status:</strong>
                        <span className={`ml-1 ${config.tts?.available ? 'text-green-600' : 'text-red-600'}`}>
                          {config.tts?.available ? 'Available' : 'Unavailable'}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Audio & VAD Settings */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">🎵 Audio Processing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Audio Settings</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Sample Rate:</strong> {config.configuration.audio.sample_rate}Hz</li>
                      <li><strong>Channels:</strong> {config.configuration.audio.channels}</li>
                      <li><strong>Chunk Duration:</strong> {config.configuration.audio.chunk_duration}s</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Voice Activity Detection</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Threshold:</strong> {config.configuration.vad.threshold}</li>
                      <li><strong>Min Speech:</strong> {config.configuration.vad.min_speech_duration}ms</li>
                      <li><strong>Silence Duration:</strong> {config.configuration.vad.silence_duration}ms</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* WebRTC Settings */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">📡 WebRTC Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Connection</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>STUN Server:</strong> {config.configuration.webrtc.stun_server}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Limits</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Concurrency:</strong> {config.configuration.webrtc.concurrency_limit}</li>
                      <li><strong>Time Limit:</strong> {config.configuration.webrtc.time_limit}s</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Performance</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Max Audio:</strong> {config.configuration.performance.max_audio_duration}s</li>
                      <li><strong>AI Timeout:</strong> {config.configuration.performance.ai_response_timeout}s</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Debug & Advanced */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">🔍 Debug & Advanced</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Debug Settings</h4>
                    <ul className="text-sm space-y-1">
                      <li>
                        <strong>Audio Debug:</strong> 
                        <span className={`ml-1 ${config.configuration.debug.audio_debug ? 'text-green-600' : 'text-gray-600'}`}>
                          {config.configuration.debug.audio_debug ? 'Enabled' : 'Disabled'}
                        </span>
                      </li>
                      {config.configuration.debug.audio_debug && (
                        <li><strong>Debug Path:</strong> {config.configuration.debug.audio_path}</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Session Info</h4>
                    <ul className="text-sm space-y-1">
                      <li><strong>Conversation Length:</strong> {config.ai_model?.conversation_length || 0} messages</li>
                      <li><strong>TTS Timeout:</strong> {config.configuration.performance.tts_timeout}s</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={fetchConfig}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Refresh Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationDisplay; 