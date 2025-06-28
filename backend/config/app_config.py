#!/usr/bin/env python3
"""
Application Configuration Manager
Centralized configuration loading and validation
"""

import os
import ast
from typing import Dict, Any, List, Union
from dataclasses import dataclass

@dataclass
class AIModelConfig:
    """AI Model Configuration"""
    provider: str = "deepseek"
    deepseek_api_key: str = ""
    qwen_plus_api_key: str = ""

@dataclass 
class STTConfig:
    """Speech-to-Text Configuration"""
    model_provider: str = "sensevoice"
    sensevoice_model: str = "iic/SenseVoiceSmall"
    whisper_model: str = "small"
    language: str = "auto"

@dataclass
class TTSConfig:
    """Text-to-Speech Configuration"""
    provider: str = "macos"
    voice: str = "Meijia"
    rate: int = 200
    volume: float = 1.0

@dataclass
class AudioConfig:
    """Audio Processing Configuration"""
    sample_rate: int = 24000
    channels: int = 1
    chunk_duration: float = 1.0

@dataclass
class VADConfig:
    """Voice Activity Detection Configuration"""
    threshold: float = 0.3
    min_speech_duration: int = 300
    silence_duration: int = 4000
    pre_padding: int = 200
    post_padding: int = 200

@dataclass
class WebRTCConfig:
    """WebRTC Configuration"""
    stun_server: str = "stun:stun.l.google.com:19302"
    concurrency_limit: int = 10
    time_limit: int = 3600

@dataclass
class ServerConfig:
    """Server Configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = None

@dataclass
class LoggingConfig:
    """Logging Configuration"""
    level: str = "INFO"
    format: str = "SIMPLE"
    to_file: bool = False
    file_path: str = "logs/voiceagent.log"
    max_file_size: int = 10
    backup_count: int = 5

@dataclass
class DebugConfig:
    """Debug Configuration"""
    audio: bool = False
    audio_path: str = "debug_audio"

@dataclass
class PerformanceConfig:
    """Performance Configuration"""
    max_audio_duration: float = 30.0
    min_audio_duration: float = 0.5
    ai_response_timeout: int = 30
    tts_timeout: int = 10

class AppConfig:
    """Application Configuration Manager"""
    
    def __init__(self):
        self.ai_model = AIModelConfig()
        self.stt = STTConfig()
        self.tts = TTSConfig()
        self.audio = AudioConfig()
        self.vad = VADConfig()
        self.webrtc = WebRTCConfig()
        self.server = ServerConfig()
        self.logging = LoggingConfig()
        self.debug = DebugConfig()
        self.performance = PerformanceConfig()
        
        self.load_config()
        self.validate_config()
    
    def load_config(self):
        """Load configuration from environment variables"""
        
        # AI Model Configuration
        self.ai_model.provider = os.getenv("AI_MODEL_PROVIDER", "deepseek").lower()
        self.ai_model.deepseek_api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.ai_model.qwen_plus_api_key = os.getenv("QWEN_PLUS_API_KEY", "")
        
        # STT Configuration
        self.stt.model_provider = os.getenv("STT_MODEL_PROVIDER", "sensevoice").lower()
        self.stt.sensevoice_model = os.getenv("SENSEVOICE_MODEL", "iic/SenseVoiceSmall")
        self.stt.whisper_model = os.getenv("WHISPER_MODEL", "small")
        self.stt.language = os.getenv("STT_LANGUAGE", "auto")
        
        # TTS Configuration
        self.tts.provider = os.getenv("TTS_PROVIDER", "macos").lower()
        self.tts.voice = os.getenv("TTS_VOICE", "Meijia")
        self.tts.rate = int(os.getenv("TTS_RATE", "200"))
        self.tts.volume = float(os.getenv("TTS_VOLUME", "1.0"))
        
        # Audio Configuration
        self.audio.sample_rate = int(os.getenv("AUDIO_SAMPLE_RATE", "24000"))
        self.audio.channels = int(os.getenv("AUDIO_CHANNELS", "1"))
        self.audio.chunk_duration = float(os.getenv("AUDIO_CHUNK_DURATION", "1.0"))
        
        # VAD Configuration
        self.vad.threshold = float(os.getenv("VAD_THRESHOLD", "0.3"))
        self.vad.min_speech_duration = int(os.getenv("VAD_MIN_SPEECH_DURATION", "300"))
        self.vad.silence_duration = int(os.getenv("VAD_SILENCE_DURATION", "4000"))
        self.vad.pre_padding = int(os.getenv("VAD_PRE_PADDING", "200"))
        self.vad.post_padding = int(os.getenv("VAD_POST_PADDING", "200"))
        
        # WebRTC Configuration
        self.webrtc.stun_server = os.getenv("WEBRTC_STUN_SERVER", "stun:stun.l.google.com:19302")
        self.webrtc.concurrency_limit = int(os.getenv("WEBRTC_CONCURRENCY_LIMIT", "10"))
        self.webrtc.time_limit = int(os.getenv("WEBRTC_TIME_LIMIT", "3600"))
        
        # Server Configuration
        self.server.host = os.getenv("SERVER_HOST", "0.0.0.0")
        self.server.port = int(os.getenv("SERVER_PORT", "8000"))
        cors_origins_str = os.getenv("CORS_ORIGINS", '["http://localhost:3000", "http://127.0.0.1:3000"]')
        try:
            self.server.cors_origins = ast.literal_eval(cors_origins_str)
        except:
            self.server.cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        
        # Logging Configuration
        self.logging.level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.logging.format = os.getenv("LOG_FORMAT", "SIMPLE").upper()
        self.logging.to_file = os.getenv("LOG_TO_FILE", "false").lower() == "true"
        self.logging.file_path = os.getenv("LOG_FILE_PATH", "logs/voiceagent.log")
        self.logging.max_file_size = int(os.getenv("LOG_MAX_FILE_SIZE", "10"))
        self.logging.backup_count = int(os.getenv("LOG_BACKUP_COUNT", "5"))
        
        # Debug Configuration
        self.debug.audio = os.getenv("DEBUG_AUDIO", "false").lower() == "true"
        self.debug.audio_path = os.getenv("DEBUG_AUDIO_PATH", "debug_audio")
        
        # Performance Configuration
        self.performance.max_audio_duration = float(os.getenv("MAX_AUDIO_DURATION", "30.0"))
        self.performance.min_audio_duration = float(os.getenv("MIN_AUDIO_DURATION", "0.5"))
        self.performance.ai_response_timeout = int(os.getenv("AI_RESPONSE_TIMEOUT", "30"))
        self.performance.tts_timeout = int(os.getenv("TTS_TIMEOUT", "10"))
    
    def validate_config(self):
        """Validate configuration values"""
        errors = []
        
        # Validate AI model provider
        if self.ai_model.provider not in ["deepseek", "qwen-plus"]:
            errors.append(f"Invalid AI_MODEL_PROVIDER: {self.ai_model.provider}. Must be 'deepseek' or 'qwen-plus'")
        
        # Validate STT model provider
        if self.stt.model_provider not in ["sensevoice", "whisper"]:
            errors.append(f"Invalid STT_MODEL_PROVIDER: {self.stt.model_provider}. Must be 'sensevoice' or 'whisper'")
        
        # Validate TTS provider
        if self.tts.provider not in ["macos"]:
            errors.append(f"Invalid TTS_PROVIDER: {self.tts.provider}. Currently only 'macos' is supported")
        
        # Validate audio sample rate
        if self.audio.sample_rate not in [8000, 16000, 22050, 24000, 44100, 48000]:
            errors.append(f"Invalid AUDIO_SAMPLE_RATE: {self.audio.sample_rate}. Must be a standard sample rate")
        
        # Validate VAD threshold
        if not 0.0 <= self.vad.threshold <= 1.0:
            errors.append(f"Invalid VAD_THRESHOLD: {self.vad.threshold}. Must be between 0.0 and 1.0")
        
        # Validate TTS volume
        if not 0.0 <= self.tts.volume <= 1.0:
            errors.append(f"Invalid TTS_VOLUME: {self.tts.volume}. Must be between 0.0 and 1.0")
        
        # Validate logging level
        valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.logging.level not in valid_log_levels:
            errors.append(f"Invalid LOG_LEVEL: {self.logging.level}. Must be one of {valid_log_levels}")
        
        if errors:
            raise ValueError("Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in errors))
    
    def get_config_summary(self) -> Dict[str, Any]:
        """Get a summary of current configuration"""
        return {
            "ai_model": {
                "provider": self.ai_model.provider,
                "deepseek_configured": bool(self.ai_model.deepseek_api_key),
                "qwen_configured": bool(self.ai_model.qwen_plus_api_key),
            },
            "stt": {
                "provider": self.stt.model_provider,
                "model": self.stt.sensevoice_model if self.stt.model_provider == "sensevoice" else self.stt.whisper_model,
                "language": self.stt.language,
            },
            "tts": {
                "provider": self.tts.provider,
                "voice": self.tts.voice,
                "rate": self.tts.rate,
                "volume": self.tts.volume,
            },
            "audio": {
                "sample_rate": self.audio.sample_rate,
                "channels": self.audio.channels,
                "chunk_duration": self.audio.chunk_duration,
            },
            "vad": {
                "threshold": self.vad.threshold,
                "min_speech_duration": self.vad.min_speech_duration,
                "silence_duration": self.vad.silence_duration,
            },
            "webrtc": {
                "stun_server": self.webrtc.stun_server,
                "concurrency_limit": self.webrtc.concurrency_limit,
                "time_limit": self.webrtc.time_limit,
            },
            "server": {
                "host": self.server.host,
                "port": self.server.port,
                "cors_origins": self.server.cors_origins,
            },
            "debug": {
                "audio_debug": self.debug.audio,
                "audio_path": self.debug.audio_path,
            },
            "performance": {
                "max_audio_duration": self.performance.max_audio_duration,
                "min_audio_duration": self.performance.min_audio_duration,
                "ai_response_timeout": self.performance.ai_response_timeout,
                "tts_timeout": self.performance.tts_timeout,
            }
        }
    
    def print_config_summary(self):
        """Print configuration summary"""
        print("🔧 VoiceAgent Configuration Summary")
        print("=" * 50)
        
        print(f"📡 AI Model: {self.ai_model.provider}")
        if self.ai_model.provider == "deepseek":
            status = "✅ Configured" if self.ai_model.deepseek_api_key else "❌ Missing API Key"
            print(f"   DeepSeek: {status}")
        elif self.ai_model.provider == "qwen-plus":
            status = "✅ Configured" if self.ai_model.qwen_plus_api_key else "❌ Missing API Key"
            print(f"   Qwen-Plus: {status}")
        
        print(f"🎤 STT Model: {self.stt.model_provider}")
        if self.stt.model_provider == "sensevoice":
            print(f"   SenseVoice Model: {self.stt.sensevoice_model}")
        else:
            print(f"   Whisper Model: {self.stt.whisper_model}")
        print(f"   Language: {self.stt.language}")
        
        print(f"🔊 TTS Provider: {self.tts.provider}")
        print(f"   Voice: {self.tts.voice}")
        print(f"   Rate: {self.tts.rate} WPM")
        print(f"   Volume: {self.tts.volume}")
        
        print(f"🎵 Audio: {self.audio.sample_rate}Hz, {self.audio.channels}ch")
        print(f"🎯 VAD: threshold={self.vad.threshold}, silence={self.vad.silence_duration}ms")
        print(f"🌐 Server: {self.server.host}:{self.server.port}")
        print(f"📝 Debug Audio: {'Enabled' if self.debug.audio else 'Disabled'}")
        print("=" * 50)

# Global configuration instance
app_config = AppConfig()

# Export commonly used configs for convenience
AI_MODEL_CONFIG = app_config.ai_model
STT_CONFIG = app_config.stt
TTS_CONFIG = app_config.tts
AUDIO_CONFIG = app_config.audio
VAD_CONFIG = app_config.vad
WEBRTC_CONFIG = app_config.webrtc
SERVER_CONFIG = app_config.server
DEBUG_CONFIG = app_config.debug
PERFORMANCE_CONFIG = app_config.performance 