#!/usr/bin/env python3
"""
VoiceAgent FastRTC Server
Real-time speech recognition and AI conversation using FastRTC WebRTC
Supports multiple AI models and configurable speech recognition
"""

import os
import tempfile
import wave
import subprocess
import time
import numpy as np
import requests
import json
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastrtc import (
    ReplyOnPause, Stream, AlgoOptions, SileroVadOptions,
    audio_to_bytes, aggregate_bytes_to_16bit
)
from openai import OpenAI
from models import ModelManager
from config import (
    get_logger, print_log_config, app_config, 
    SERVER_CONFIG, WEBRTC_CONFIG, AUDIO_CONFIG, 
    VAD_CONFIG, DEBUG_CONFIG, PERFORMANCE_CONFIG
)
from stt.stt_manager import STTManager
from tts.tts_manager import TTSManager

logger = get_logger()
load_dotenv()

# Global instances
stt_manager = None
tts_manager = None
model_manager = None
conversation_history = []

def log(message, level="INFO", force_show=False):
    """Logging function - deprecated, kept for compatibility"""
    if force_show or level in ["ERROR", "WARNING"]:
        if hasattr(logger, level.lower()):
            getattr(logger, level.lower())(message)
        else:
            logger.info(message)

def init_managers():
    """Initialize all managers (STT, TTS, AI models)"""
    global stt_manager, tts_manager, model_manager
    
    success = True
    
    # Initialize STT manager
    try:
        stt_manager = STTManager()
        if stt_manager.load_model():
            logger.info("✅ STT manager initialized successfully")
        else:
            logger.error("❌ STT manager initialization failed")
            success = False
    except Exception as e:
        logger.error(f"❌ STT manager initialization failed: {e}")
        success = False
    
    # Initialize TTS manager
    try:
        tts_manager = TTSManager()
        if tts_manager.is_available():
            logger.info("✅ TTS manager initialized successfully")
        else:
            logger.error("❌ TTS manager initialization failed")
            success = False
    except Exception as e:
        logger.error(f"❌ TTS manager initialization failed: {e}")
        success = False
    
    # Initialize AI model manager
    try:
        model_manager = ModelManager()
        logger.info("✅ AI model manager initialized successfully")
    except Exception as e:
        logger.error(f"❌ AI model manager initialization failed: {e}")
        success = False
    
    return success

def create_tts_audio(text):
    """Generate TTS audio using the configured TTS manager"""
    global tts_manager
    
    if not tts_manager or not tts_manager.is_available():
        logger.error("❌ TTS manager not available")
        return None
    
    try:
        result = tts_manager.synthesize(text)
        if result:
            sample_rate, audio_data = result
            return (sample_rate, audio_data)
        else:
            return None
    except Exception as e:
        logger.error(f"❌ TTS generation failed: {e}")
        return None

def response_handler(audio: tuple[int, np.ndarray]):
    """Process audio input and generate response"""
    try:
        total_start_time = time.time()
        
        sample_rate, audio_data = audio
        logger.info(f"🎤🎤🎤 FastRTC received audio: sample rate={sample_rate}Hz, shape={audio_data.shape}")
        logger.debug(f"📊 Audio data statistics: min={np.min(audio_data)}, max={np.max(audio_data)}, mean={np.mean(audio_data):.4f}")
        logger.debug(f"📊 Audio data type: {audio_data.dtype}")
        
        if len(audio_data) == 0:
            logger.error("❌ Received empty audio data")
            return
        
        original_shape = audio_data.shape
        if audio_data.ndim > 1:
            if audio_data.shape[0] == 1:
                audio_data = audio_data[0]
            else:
                audio_data = audio_data.flatten()
        
        duration = len(audio_data) / sample_rate
        logger.info(f"⏱️ Audio duration: {duration:.2f} seconds (original shape: {original_shape} -> processed length: {len(audio_data)})")
        
        unique_values = np.unique(audio_data)
        logger.debug(f"🔍 Number of unique values: {len(unique_values)}")
        if len(unique_values) <= 10:
            logger.warning(f"⚠️ Warning: Audio values change very little, first 10 unique values: {unique_values[:10]}")
        
        processed_sample_rate = sample_rate
        if sample_rate == 48000:
            logger.info("🔧 Executing sample rate conversion: 48kHz -> 24kHz")
            audio_data = audio_data[::2]
            processed_sample_rate = 24000
            duration = len(audio_data) / processed_sample_rate
            logger.info(f"🔧 Conversion completed: length={len(audio_data)}, duration={duration:.2f} seconds")
        
        rms = np.sqrt(np.mean(audio_data.astype(np.float32) ** 2))
        print(f"🔊 Audio RMS energy (int16): {rms:.2f}")
        
        if rms < 100:
            print(f"⚠️ Low audio energy (RMS: {rms:.2f}), possibly environmental sound or silence")
        elif rms > 5000:
            print(f"🔊 High audio energy (RMS: {rms:.2f}), possibly loud speech")
        else:
            print(f"✅ Normal audio energy (RMS: {rms:.2f})")
            
        if duration < PERFORMANCE_CONFIG.min_audio_duration:
            print(f"⚠️ Short audio ({duration:.2f} seconds), skipping processing")
            return
        
        if audio_data.dtype == np.int16:
            audio_float = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio_float = audio_data.astype(np.float32) / 2147483648.0
        else:
            audio_float = audio_data.astype(np.float32)
            
        print(f"🔄 Converted audio range: [{np.min(audio_float):.6f}, {np.max(audio_float):.6f}]")
        
        rms_float = np.sqrt(np.mean(audio_float ** 2))
        print(f"🔊 Audio RMS energy (float32): {rms_float:.6f}")
        
        if rms_float < 0.001:
            print("⚠️ Warning: Low audio energy, possibly silence or problematic audio")
            if rms_float > 0:
                print("🔧 Trying to enhance low energy audio...")
                enhancement_factor = 0.01 / rms_float
                enhancement_factor = min(enhancement_factor, 50)
                audio_float = audio_float * enhancement_factor
                rms_float = np.sqrt(np.mean(audio_float ** 2))
                print(f"🔧 Enhanced audio RMS: {rms_float:.6f}")
            else:
                print("❌ Audio completely silent, skipping processing")
                return
        
        if DEBUG_CONFIG.audio:
            debug_filename = f"{DEBUG_CONFIG.audio_path}/received_{datetime.now().strftime('%H%M%S')}.wav"
            os.makedirs(os.path.dirname(debug_filename), exist_ok=True)
            
            debug_audio_int16 = (audio_float * 32768.0).clip(-32768, 32767).astype(np.int16)
            
            with wave.open(debug_filename, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(processed_sample_rate)
                wav_file.writeframes(debug_audio_int16.tobytes())
            
            print(f"💾 Debug audio saved: {debug_filename} ({processed_sample_rate}Hz)")
            print(f"💾 Debug audio statistics: min={np.min(debug_audio_int16)}, max={np.max(debug_audio_int16)}")
            
            float_debug_filename = debug_filename.replace('.wav', '_stt_input.npy')
            np.save(float_debug_filename, audio_float)
            print(f"💾 STT input data saved: {float_debug_filename}")
        
        if len(audio_float) == 0:
            print("❌ Converted float32 data is empty")
            return
        
        if np.any(np.isnan(audio_float)) or np.any(np.isinf(audio_float)):
            print("❌ float32 data contains NaN or infinite values")
            return
        
        min_samples = int(PERFORMANCE_CONFIG.min_audio_duration * processed_sample_rate)
        if len(audio_float) < min_samples:
            print(f"❌ Short audio: {len(audio_float)} < {min_samples} samples")
            return
        
        max_samples = int(PERFORMANCE_CONFIG.max_audio_duration * processed_sample_rate)
        if len(audio_float) > max_samples:
            print(f"⚠️ Long audio, truncating to {PERFORMANCE_CONFIG.max_audio_duration} seconds: {len(audio_float)} -> {max_samples} samples")
            audio_float = audio_float[:max_samples]
        
        max_amplitude = np.max(np.abs(audio_float))
        if max_amplitude > 0 and max_amplitude < 0.01:
            print(f"🔧 Low audio amplitude ({max_amplitude:.6f}), normalizing")
            audio_float = audio_float / max_amplitude * 0.1
            
        audio_variance = np.var(audio_float)
        audio_std = np.std(audio_float)
        zero_crossings = np.sum(np.diff(np.signbit(audio_float)))
        
        print(f"🔍 Audio signal analysis:")
        print(f"    Variance: {audio_variance:.8f}")
        print(f"    Standard deviation: {audio_std:.8f}")  
        print(f"    Zero crossings: {zero_crossings}")
        print(f"    Zero crossing rate: {zero_crossings/len(audio_float):.6f}")
        
        if audio_std < 1e-6:
            print("❌ Flat audio signal, possibly constant or DC signal")
            return
            
        zero_crossing_rate = zero_crossings / len(audio_float)
        if zero_crossing_rate < 1e-4:
            print("⚠️ Low zero crossing rate, possible DC offset, trying high-pass filter")
            audio_float = audio_float - np.mean(audio_float)
        
        print("Starting STT transcription...")
        print(f"🎯 Input data to STT: length={len(audio_float)}, sample rate={processed_sample_rate}Hz")
        print(f"🎯 Audio data range: [{np.min(audio_float):.6f}, {np.max(audio_float):.6f}]")
        print(f"🎯 Maximum amplitude: {np.max(np.abs(audio_float)):.6f}")
        
        stt_start_time = time.time()
        
        try:
            global stt_manager
            if not stt_manager or not stt_manager.is_loaded():
                print("❌ STT manager not available")
                return
            
            print(f"🔄 Starting {stt_manager.model_provider} transcription...")
            
            # Convert float audio to int16 for STT processing
            audio_int16 = (audio_float * 32768.0).clip(-32768, 32767).astype(np.int16)
            
            # Use STT manager for transcription
            result = stt_manager.transcribe(audio_int16, processed_sample_rate)
            
            stt_duration = time.time() - stt_start_time
            print(f"✅ STT transcription completed, time: {stt_duration:.2f} seconds")
            print(f"🎯 STT recognition result: {result['text']}")
                
        except Exception as e:
            stt_duration = time.time() - stt_start_time
            print(f"❌ STT transcription failed: {e}, time: {stt_duration:.2f} seconds")
            import traceback
            print(f"Error details: {traceback.format_exc()}")
            return
        
        transcription = result["text"].strip()
        
        print(f"🎯 STT detected language: {result.get('language', 'unknown')}")
        print(f"🎯 STT no speech probability: {result.get('no_speech_prob', 0):.4f}")
        
        if not transcription or result.get('no_speech_prob', 0) > 0.9:
            print(f"⚠️ Poor transcription quality or no speech content, skipping processing (no speech probability: {result.get('no_speech_prob', 0):.3f})")
            return
        
        if transcription:
            exclamation_count = transcription.count('!')
            exclamation_density = exclamation_count / len(transcription) if len(transcription) > 0 else 0
            
            unique_chars = len(set(transcription.replace(' ', '').replace('\n', '')))
            total_chars = len(transcription.replace(' ', '').replace('\n', ''))
            repeat_density = 1 - (unique_chars / total_chars) if total_chars > 0 else 0
            
            print(f"🔍 Text quality check:")
            print(f"    Length: {len(transcription)}")
            print(f"    Exclamation mark count: {exclamation_count}, density: {exclamation_density:.3f}")
            print(f"    Number of unique characters: {unique_chars}, repeat density: {repeat_density:.3f}")
            
            is_bad_pattern = False
            bad_reason = ""
            
            bad_strings = ["subtitle by someone", "subtitle by", "subtitle"]
            for bad_str in bad_strings:
                if bad_str in transcription:
                    is_bad_pattern = True
                    bad_reason = f"Contains error string: {bad_str}"
                    break
            
            if exclamation_count > 20 or exclamation_density > 0.3:
                is_bad_pattern = True
                bad_reason = f"Exclamation marks too many: {exclamation_count} marks, density {exclamation_density:.3f}"
            
            if repeat_density > 0.8 and total_chars > 10:
                is_bad_pattern = True
                bad_reason = f"High repeat character density: {repeat_density:.3f}"
            
            if len(transcription) > 200:
                if "I love you" in transcription or "love you" in transcription:
                    is_bad_pattern = True
                    bad_reason = "Long text contains repeated love expression"
            
            clean_text = ''.join(c for c in transcription if c.isalpha())
            if len(clean_text) < len(transcription) * 0.3:
                is_bad_pattern = True
                bad_reason = f"Low effective character ratio: {len(clean_text)}/{len(transcription)}"
            
            hallucination_patterns = [
                "Thank you.", "thanks", "Thank you for watching",
                "please like subscribe and share", "thanks for watching", 
                "subtitle", "subtitle", "captions"
            ]
            for pattern in hallucination_patterns:
                if pattern in transcription:
                    is_bad_pattern = True
                    bad_reason = f"Detected SenseVoice hallucination pattern: {pattern}"
                    break
            
            if is_bad_pattern:
                print(f"⚠️ Discarding incorrect recognition ({bad_reason}): {transcription[:100]}...")
                return
            
            print(f"✅ Transcription result: {transcription}")
            
            current_provider = model_manager.get_current_provider()
            print(f"�� Starting AI stream API call (model: {current_provider})...")
            
            ai_api_start_time = time.time()
            
            first_token_received_time = None
            first_tts_start_time = None
            first_audio_ready_time = None
            
            text_buffer = ""
            min_tts_length = 3
            
            try:
                for text_chunk in model_manager.call_ai_api_stream(transcription):
                    if first_token_received_time is None:
                        first_token_received_time = time.time()
                        time_to_first_token = first_token_received_time - total_start_time
                        print(f"🎯 [Key Metric] From start to first token: {time_to_first_token:.3f} seconds")
                    
                    print(f"🔄 Received text fragment: {repr(text_chunk)}")
                    text_buffer += text_chunk
                    
                    if len(text_buffer.strip()) >= min_tts_length:
                        if first_tts_start_time is None:
                            first_tts_start_time = time.time()
                            time_to_first_tts = first_tts_start_time - total_start_time
                            print(f"🎯 [Key Metric] From start to first TTS: {time_to_first_tts:.3f} seconds")
                        
                        tts_start_time = time.time()
                        
                        print(f"🔊 Streaming TTS generation: {text_buffer.strip()[:30]}...")
                        tts_result = create_tts_audio(text_buffer.strip())
                        
                        if tts_result:
                            tts_duration = time.time() - tts_start_time
                            
                            if first_audio_ready_time is None:
                                first_audio_ready_time = time.time()
                                time_to_first_audio = first_audio_ready_time - total_start_time
                                print(f"🎯 [User starts hearing sound]: {time_to_first_audio:.3f} seconds ⭐")
                                print(f"🔊 First TTS time: {tts_duration:.3f} seconds")
                            
                            print(f"⚡ Streaming TTS completed, time: {tts_duration:.2f} seconds")
                            yield tts_result
                        
                        text_buffer = ""
                
                if text_buffer.strip():
                    print(f"🔊 Processing remaining text: {text_buffer.strip()[:30]}...")
                    tts_start_time = time.time()
                    tts_result = create_tts_audio(text_buffer.strip())
                    
                    if tts_result:
                        tts_duration = time.time() - tts_start_time
                        print(f"⚡ Final TTS completed, time: {tts_duration:.2f} seconds")
                        yield tts_result
                
                total_duration = time.time() - total_start_time
                ai_api_duration = time.time() - ai_api_start_time
                
                print("="*80)
                print("🎯 [Performance Statistics Report]")
                print("="*80)
                print(f"⏱️  Total processing time: {total_duration:.3f} seconds")
                print(f"🎤 STT(SenseVoice) time: {stt_duration:.3f} seconds")
                print(f"🤖 AI streaming time: {ai_api_duration:.3f} seconds")
                print(f"⚡ Other processing time: {(total_duration - stt_duration - ai_api_duration):.3f} seconds")
                print("-"*80)
                print("🎯 [Key User Experience Metrics]")
                if first_token_received_time:
                    time_to_first_token = first_token_received_time - total_start_time
                    print(f"📥 First token arrived: {time_to_first_token:.3f} seconds")
                if first_tts_start_time:
                    time_to_first_tts = first_tts_start_time - total_start_time
                    print(f"🔊 First TTS started: {time_to_first_tts:.3f} seconds")
                if first_audio_ready_time:
                    time_to_first_audio = first_audio_ready_time - total_start_time
                    print(f"🎵 [User starts hearing sound]: {time_to_first_audio:.3f} seconds ⭐⭐⭐")
                    if first_token_received_time and first_tts_start_time:
                        token_to_tts = first_tts_start_time - first_token_received_time
                        tts_processing = first_audio_ready_time - first_tts_start_time
                        print(f"   └─ Analysis: STT({stt_duration:.3f}s) + first token({time_to_first_token - stt_duration:.3f}s) + accumulation({token_to_tts:.3f}s) + TTS({tts_processing:.3f}s)")
                print("="*80)
                
            except Exception as e:
                print(f"❌ Streaming processing failed: {e}")
                error_audio = create_tts_audio("Sorry, there was an issue processing your request.")
                if error_audio:
                    yield error_audio
        else:
            print("No valid speech detected")
            
    except Exception as e:
        print(f"Audio processing failed: {e}")
        import traceback
        print(f"Error details: {traceback.format_exc()}")

print("Creating FastRTC Stream...")
stream = Stream(
    modality="audio",
    mode="send-receive",
    handler=ReplyOnPause(
        response_handler,
        algo_options=AlgoOptions(
            audio_chunk_duration=AUDIO_CONFIG.chunk_duration,
            started_talking_threshold=0.5,
            speech_threshold=0.2
        ),
        model_options=SileroVadOptions(
            threshold=VAD_CONFIG.threshold,
            min_speech_duration_ms=VAD_CONFIG.min_speech_duration,
            min_silence_duration_ms=VAD_CONFIG.silence_duration
        ),
        can_interrupt=True
    ),
    concurrency_limit=WEBRTC_CONFIG.concurrency_limit,
    time_limit=WEBRTC_CONFIG.time_limit
)
print("✅ Stream creation completed")

app = FastAPI(title="FastRTC Voice Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=SERVER_CONFIG.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Mounting FastRTC Stream to FastAPI...")
stream.mount(app)
print("✅ FastRTC Stream mounting completed")
print("🎯 FastRTC will automatically handle /webrtc/offer endpoint")

@app.get("/")
@app.head("/")
async def root():
    """Root path"""
    global stt_manager, tts_manager, model_manager
    
    current_provider = model_manager.get_current_provider()
    current_model = model_manager.get_current_model()
    model_info = current_model.get_model_info()
    
    if model_manager.is_current_model_configured():
        ai_status = f"✅ {model_info['provider']} configured"
    else:
        ai_status = f"❌ {model_info['provider']} not properly configured"
    
    # Get STT and TTS info
    stt_info = stt_manager.get_model_info() if stt_manager else {"provider": "Unknown", "model": "Unknown", "loaded": False}
    tts_info = tts_manager.get_current_voice_info() if tts_manager else {"voice": "Unknown", "available": False}
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>FastRTC + AI Voice Assistant</title>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .status-good {{ color: #28a745; }}
            .status-bad {{ color: #dc3545; }}
            .model-switch {{ background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <h1>🎤🤖 FastRTC + AI Voice Assistant Backend</h1>
        <p>Status: <span class="status-good">Running</span></p>
        <p>WebRTC Endpoint: <code>/webrtc/offer</code></p>
        <p>Health Check: <code>/api/health</code></p>
        
        <div class="model-switch">
            <h3>🎯 AI Model Configuration</h3>
            <p><strong>Current Model:</strong> {}</p>
            <p><strong>Model Status:</strong> {}</p>
            <p><strong>Switch Method:</strong> Set environment variable <code>AI_MODEL_PROVIDER</code></p>
            <ul>
                <li><code>AI_MODEL_PROVIDER=deepseek</code> - Use DeepSeek</li>
                <li><code>AI_MODEL_PROVIDER=qwen-plus</code> - Use Qwen-Plus</li>
            </ul>
        </div>
        
        <p><strong>STT Model:</strong> {} - {}</p>
        <p><strong>TTS Voice:</strong> {} ({})</p>
        <p>Conversation History: {} entries</p>
        <hr>
        <h3>🔧 Configuration Summary</h3>
        <ul>
            <li>🎤 STT Provider: {}</li>
            <li>🤖 AI Provider: {}</li>
            <li>🔊 TTS Provider: {}</li>
            <li>🎵 Audio: {}Hz, VAD: {}</li>
        </ul>
        
        <h3>📡 WebRTC Settings</h3>
        <ul>
            <li>STUN Server: {}</li>
            <li>Concurrency Limit: {}</li>
            <li>Time Limit: {} seconds</li>
        </ul>
    </body>
    </html>
    """.format(
        model_info['provider'], ai_status,
        stt_info['provider'], stt_info['model'],
        tts_info['voice'], 'Available' if tts_info['available'] else 'Unavailable',
        len(model_manager.get_conversation_history()),
        stt_info['provider'],
        model_info['provider'],
        tts_info.get('provider', 'Unknown'),
        AUDIO_CONFIG.sample_rate, VAD_CONFIG.threshold,
        WEBRTC_CONFIG.stun_server,
        WEBRTC_CONFIG.concurrency_limit,
        WEBRTC_CONFIG.time_limit
    )
    return HTMLResponse(content=html_content)

@app.get("/api/config")
async def get_config():
    """Get current configuration status"""
    global stt_manager, tts_manager, model_manager
    
    return {
        "status": "success",
        "configuration": app_config.get_config_summary(),
        "stt": stt_manager.get_model_info() if stt_manager else None,
        "tts": tts_manager.get_current_voice_info() if tts_manager else None,
        "ai_model": {
            "provider": model_manager.get_current_provider(),
            "status": model_manager.get_all_model_status(),
            "conversation_length": len(model_manager.get_conversation_history())
        } if model_manager else None
    }

@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    """Health check"""
    global stt_manager, tts_manager, model_manager
    
    return {
        "status": "healthy",
                    "service": "VoiceAgent FastRTC Server",
        "managers": {
            "stt_available": stt_manager.is_loaded() if stt_manager else False,
            "tts_available": tts_manager.is_available() if tts_manager else False,
            "ai_configured": model_manager.is_current_model_configured() if model_manager else False
        },
        "configuration": {
            "stt_provider": app_config.stt.model_provider,
            "ai_provider": app_config.ai_model.provider,
            "tts_provider": app_config.tts.provider,
            "audio_sample_rate": app_config.audio.sample_rate,
            "debug_enabled": app_config.debug.audio
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    print_log_config()
    app_config.print_config_summary()
    
    logger.info("="*60)
    logger.info("🚀 VoiceAgent FastRTC Server startup")
    logger.info(f"🕒 Startup time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("="*60)
    
    logger.info("🔧 Initializing all managers...")
    if not init_managers():
        logger.error("❌ Manager initialization failed, exiting program")
        exit(1)
    
    # Get status information
    current_provider = model_manager.get_current_provider()
    current_model = model_manager.get_current_model()
    model_info = current_model.get_model_info()
    stt_info = stt_manager.get_model_info()
    tts_info = tts_manager.get_current_voice_info()
    
    logger.info(f"🎯 Current AI model: {current_provider}")
    logger.info(f"🎤 STT: {stt_info['provider']} - {stt_info['model']}")
    logger.info(f"🔊 TTS: {tts_info['provider']} - {tts_info['voice']}")
    
    if model_manager.is_current_model_configured():
        logger.info(f"✅ {model_info['provider']} properly configured")
    else:
        logger.warning(f"⚠️ Warning: {model_info['provider']} not properly configured")
        if current_provider == "deepseek":
            logger.info("💡 Please set environment variable: export DEEPSEEK_API_KEY=your_api_key")
        elif current_provider == "qwen-plus":
                            logger.info("💡 Please set environment variable: export QWEN_PLUS_API_KEY=your_api_key")
    
    logger.info("✅ Backend initialization completed")
    logger.info(f"🌐 Server started at: http://{SERVER_CONFIG.host}:{SERVER_CONFIG.port}")
    logger.info(f"📊 Health check: http://localhost:{SERVER_CONFIG.port}/api/health")
    logger.info(f"🔧 Configuration: http://localhost:{SERVER_CONFIG.port}/api/config")
    logger.info(f"🎯 WebRTC endpoint: http://localhost:{SERVER_CONFIG.port}/webrtc/offer")
    logger.info(f"🎤 Pipeline: {stt_info['provider']} → {current_provider.upper()} → {tts_info['provider']}")
    logger.info("="*60)
    
    uvicorn.run(app, host=SERVER_CONFIG.host, port=SERVER_CONFIG.port, log_level="info") 