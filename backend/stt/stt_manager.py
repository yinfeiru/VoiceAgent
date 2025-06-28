#!/usr/bin/env python3
"""
Speech-to-Text Manager
Unified interface for SenseVoice and Whisper models
"""

import os
import tempfile
import wave
import numpy as np
import time
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

from config import get_logger, STT_CONFIG

logger = get_logger()

class BaseSTTModel(ABC):
    """Base class for STT models"""
    
    @abstractmethod
    def transcribe(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Transcribe audio data to text"""
        pass
    
    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        pass

class SenseVoiceModel(BaseSTTModel):
    """SenseVoice STT model implementation"""
    
    def __init__(self):
        self.model = None
        self.model_name = STT_CONFIG.sensevoice_model
        self.language = STT_CONFIG.language
        
    def load_model(self):
        """Load SenseVoice model"""
        try:
            from funasr import AutoModel
            
            logger.info(f"Loading SenseVoice model: {self.model_name}")
            
            # VAD configuration for SenseVoice
            vad_config = {
                "vad_threshold": 0.3,
                "silence_time": 4000,
                "min_speech_duration": 300,
                "pre_padding": 200,
                "post_padding": 200,
            }
            
            self.model = AutoModel(
                model=self.model_name,
                vad_model="fsmn-vad",
                vad_kwargs=vad_config,
                trust_remote_code=True,
                device="cpu"
            )
            
            logger.info("✅ SenseVoice model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load SenseVoice model: {e}")
            return False
    
    def transcribe(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Transcribe audio using SenseVoice"""
        if not self.model:
            raise RuntimeError("SenseVoice model not loaded")
        
        try:
            # Create temporary audio file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                # Convert to int16 if needed
                if audio_data.dtype != np.int16:
                    audio_int16 = (audio_data * 32768.0).clip(-32768, 32767).astype(np.int16)
                else:
                    audio_int16 = audio_data
                
                # Write WAV file
                with wave.open(temp_file.name, 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(audio_int16.tobytes())
                
                # Transcribe
                result = self.model.generate(
                    input=temp_file.name,
                    cache={},
                    language="zh" if self.language == "auto" else self.language,
                    use_itn=True,
                    batch_size_s=60,
                )
                
                # Clean up temp file
                os.unlink(temp_file.name)
                
                # Parse result
                if isinstance(result, list) and len(result) > 0:
                    transcription_result = result[0]
                    if isinstance(transcription_result, dict):
                        text = transcription_result.get("text", "").strip()
                        return {
                            "text": text,
                            "language": transcription_result.get("language", "unknown"),
                            "no_speech_prob": transcription_result.get("no_speech_prob", 0)
                        }
                    else:
                        text = str(transcription_result).strip()
                        return {
                            "text": text,
                            "language": "unknown",
                            "no_speech_prob": 0
                        }
                else:
                    return {
                        "text": "",
                        "language": "unknown", 
                        "no_speech_prob": 1.0
                    }
                    
        except Exception as e:
            logger.error(f"❌ SenseVoice transcription failed: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self.model is not None

class WhisperModel(BaseSTTModel):
    """Whisper STT model implementation"""
    
    def __init__(self):
        self.model = None
        self.model_size = STT_CONFIG.whisper_model
        self.language = None if STT_CONFIG.language == "auto" else STT_CONFIG.language
        
    def load_model(self):
        """Load Whisper model"""
        try:
            import whisper
            
            logger.info(f"Loading Whisper model: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            logger.info("✅ Whisper model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            return False
    
    def transcribe(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Transcribe audio using Whisper"""
        if not self.model:
            raise RuntimeError("Whisper model not loaded")
        
        try:
            # Whisper expects float32 audio normalized to [-1, 1]
            if audio_data.dtype == np.int16:
                audio_float = audio_data.astype(np.float32) / 32768.0
            else:
                audio_float = audio_data.astype(np.float32)
            
            # Whisper expects 16kHz, resample if needed
            if sample_rate != 16000:
                # Simple downsampling (should use proper resampling in production)
                downsample_factor = sample_rate // 16000
                if downsample_factor > 1:
                    audio_float = audio_float[::downsample_factor]
            
            # Transcribe
            result = self.model.transcribe(
                audio_float,
                language=self.language,
                task="transcribe"
            )
            
            return {
                "text": result["text"].strip(),
                "language": result.get("language", "unknown"),
                "no_speech_prob": 0.0  # Whisper doesn't provide this directly
            }
            
        except Exception as e:
            logger.error(f"❌ Whisper transcription failed: {e}")
            raise
    
    def is_loaded(self) -> bool:
        return self.model is not None

class STTManager:
    """Unified STT Manager"""
    
    def __init__(self):
        self.current_model: Optional[BaseSTTModel] = None
        self.model_provider = STT_CONFIG.model_provider
        
    def load_model(self) -> bool:
        """Load the configured STT model"""
        logger.info(f"Initializing STT with provider: {self.model_provider}")
        
        try:
            if self.model_provider == "sensevoice":
                self.current_model = SenseVoiceModel()
            elif self.model_provider == "whisper":
                self.current_model = WhisperModel()
            else:
                raise ValueError(f"Unsupported STT provider: {self.model_provider}")
            
            return self.current_model.load_model()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT manager: {e}")
            return False
    
    def transcribe(self, audio_data: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Transcribe audio to text"""
        if not self.current_model or not self.current_model.is_loaded():
            raise RuntimeError("STT model not loaded")
        
        start_time = time.time()
        result = self.current_model.transcribe(audio_data, sample_rate)
        duration = time.time() - start_time
        
        logger.info(f"STT transcription completed in {duration:.2f}s: {result['text'][:50]}...")
        
        return result
    
    def is_loaded(self) -> bool:
        """Check if STT model is loaded"""
        return self.current_model is not None and self.current_model.is_loaded()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get current model information"""
        if self.model_provider == "sensevoice":
            return {
                "provider": "SenseVoice",
                "model": STT_CONFIG.sensevoice_model,
                "language": STT_CONFIG.language,
                "loaded": self.is_loaded()
            }
        elif self.model_provider == "whisper":
            return {
                "provider": "Whisper",
                "model": STT_CONFIG.whisper_model,
                "language": STT_CONFIG.language,
                "loaded": self.is_loaded()
            }
        else:
            return {
                "provider": "Unknown",
                "model": "Unknown",
                "language": "Unknown",
                "loaded": False
            } 