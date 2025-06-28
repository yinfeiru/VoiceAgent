#!/usr/bin/env python3
"""
Text-to-Speech Manager
Unified interface for different TTS providers
"""

import subprocess
import tempfile
import os
import wave
import numpy as np
import time
from typing import Optional, Tuple, Dict, Any
from abc import ABC, abstractmethod

from config import get_logger, TTS_CONFIG, PERFORMANCE_CONFIG

logger = get_logger()

class BaseTTSProvider(ABC):
    """Base class for TTS providers"""
    
    @abstractmethod
    def synthesize(self, text: str) -> Optional[Tuple[int, np.ndarray]]:
        """Synthesize text to speech"""
        pass
    
    @abstractmethod
    def get_available_voices(self) -> list:
        """Get list of available voices"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if TTS provider is available"""
        pass

class MacOSTTSProvider(BaseTTSProvider):
    """macOS system TTS provider using 'say' command"""
    
    def __init__(self):
        self.voice = TTS_CONFIG.voice
        self.rate = TTS_CONFIG.rate
        self.volume = TTS_CONFIG.volume
        
    def synthesize(self, text: str) -> Optional[Tuple[int, np.ndarray]]:
        """Synthesize text using macOS say command"""
        try:
            with tempfile.NamedTemporaryFile(suffix='.aiff', delete=False) as tts_file:
                logger.debug(f"🔊 Generating TTS: {text[:50]}...")
                
                # Build say command with configurable parameters
                cmd = [
                    'say', 
                    '-v', self.voice,
                    '-r', str(self.rate),
                    '-o', tts_file.name,
                    text
                ]
                
                # Run say command with timeout
                result = subprocess.run(
                    cmd, 
                    check=True, 
                    capture_output=True,
                    timeout=PERFORMANCE_CONFIG.tts_timeout
                )
                
                # Convert AIFF to WAV at 24kHz
                wav_file = tts_file.name.replace('.aiff', '.wav')
                ffmpeg_cmd = [
                    'ffmpeg', '-y', '-i', tts_file.name,
                    '-ar', '24000', '-ac', '1', '-f', 'wav', wav_file
                ]
                
                subprocess.run(
                    ffmpeg_cmd, 
                    check=True, 
                    capture_output=True,
                    timeout=PERFORMANCE_CONFIG.tts_timeout
                )
                
                # Read the audio data
                with wave.open(wav_file, 'rb') as audio_file:
                    frames = audio_file.readframes(audio_file.getnframes())
                    tts_audio = np.frombuffer(frames, dtype=np.int16)
                
                # Clean up temporary files
                os.unlink(tts_file.name)
                os.unlink(wav_file)
                
                # Apply volume scaling
                if self.volume != 1.0:
                    tts_audio = (tts_audio * self.volume).clip(-32768, 32767).astype(np.int16)
                
                audio_array = tts_audio.reshape(1, -1)
                logger.debug(f"🔊 TTS generation completed: {len(tts_audio)} samples")
                
                return (24000, audio_array)
                
        except subprocess.TimeoutExpired:
            logger.error(f"❌ TTS generation timeout after {PERFORMANCE_CONFIG.tts_timeout}s")
            return None
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ TTS command failed: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ TTS generation failed: {e}")
            return None
    
    def get_available_voices(self) -> list:
        """Get list of available macOS voices"""
        try:
            result = subprocess.run(
                ['say', '-v', '?'], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            
            voices = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    # Parse voice name (format: "VoiceName    language    # description")
                    parts = line.split('#')[0].strip().split()
                    if parts:
                        voice_name = parts[0]
                        language = ' '.join(parts[1:]) if len(parts) > 1 else "unknown"
                        voices.append({
                            "name": voice_name,
                            "language": language.strip(),
                            "description": line.split('#')[1].strip() if '#' in line else ""
                        })
            
            return voices
            
        except Exception as e:
            logger.error(f"❌ Failed to get available voices: {e}")
            return []
    
    def is_available(self) -> bool:
        """Check if macOS say command is available"""
        try:
            result = subprocess.run(
                ['which', 'say'], 
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False

class TTSManager:
    """Unified TTS Manager"""
    
    def __init__(self):
        self.current_provider: Optional[BaseTTSProvider] = None
        self.provider_name = TTS_CONFIG.provider
        self._initialize_provider()
        
    def _initialize_provider(self):
        """Initialize the configured TTS provider"""
        logger.info(f"Initializing TTS with provider: {self.provider_name}")
        
        try:
            if self.provider_name == "macos":
                self.current_provider = MacOSTTSProvider()
                if not self.current_provider.is_available():
                    logger.error("❌ macOS TTS is not available (say command not found)")
                    self.current_provider = None
                else:
                    logger.info("✅ macOS TTS provider initialized")
            else:
                logger.error(f"❌ Unsupported TTS provider: {self.provider_name}")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize TTS provider: {e}")
            self.current_provider = None
    
    def synthesize(self, text: str) -> Optional[Tuple[int, np.ndarray]]:
        """Synthesize text to speech"""
        if not self.current_provider:
            logger.error("❌ No TTS provider available")
            return None
        
        if not text or not text.strip():
            logger.warning("⚠️ Empty text provided for TTS")
            return None
        
        start_time = time.time()
        
        try:
            result = self.current_provider.synthesize(text.strip())
            
            if result:
                duration = time.time() - start_time
                sample_rate, audio_data = result
                logger.info(f"✅ TTS completed in {duration:.2f}s: {text[:30]}...")
                return result
            else:
                logger.error("❌ TTS synthesis failed")
                return None
                
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ TTS synthesis error after {duration:.2f}s: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if TTS is available"""
        return self.current_provider is not None and self.current_provider.is_available()
    
    def get_available_voices(self) -> list:
        """Get list of available voices"""
        if not self.current_provider:
            return []
        return self.current_provider.get_available_voices()
    
    def get_current_voice_info(self) -> Dict[str, Any]:
        """Get information about current voice configuration"""
        return {
            "provider": self.provider_name,
            "voice": TTS_CONFIG.voice,
            "rate": TTS_CONFIG.rate,
            "volume": TTS_CONFIG.volume,
            "available": self.is_available()
        }
    
    def test_synthesis(self) -> bool:
        """Test TTS synthesis with a sample text"""
        test_text = "Hello, this is a test of the text-to-speech system."
        
        logger.info("🧪 Testing TTS synthesis...")
        result = self.synthesize(test_text)
        
        if result:
            logger.info("✅ TTS test successful")
            return True
        else:
            logger.error("❌ TTS test failed")
            return False
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get detailed provider information"""
        info = {
            "provider": self.provider_name,
            "available": self.is_available(),
            "current_voice": TTS_CONFIG.voice,
            "rate": TTS_CONFIG.rate,
            "volume": TTS_CONFIG.volume,
            "timeout": PERFORMANCE_CONFIG.tts_timeout
        }
        
        if self.is_available():
            info["available_voices"] = self.get_available_voices()
        
        return info 