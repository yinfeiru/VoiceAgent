#!/usr/bin/env python3
"""
Configuration module package
Contains logging configuration and application configuration
"""

from .logging_config import get_logger, setup_logger, set_log_level, get_log_config, print_log_config
from .app_config import (
    app_config,
    AI_MODEL_CONFIG,
    STT_CONFIG,
    TTS_CONFIG,
    AUDIO_CONFIG,
    VAD_CONFIG,
    WEBRTC_CONFIG,
    SERVER_CONFIG,
    DEBUG_CONFIG,
    PERFORMANCE_CONFIG
)

__all__ = [
    # Logging
    'get_logger', 
    'setup_logger', 
    'set_log_level', 
    'get_log_config', 
    'print_log_config',
    
    # App Configuration
    'app_config',
    'AI_MODEL_CONFIG',
    'STT_CONFIG', 
    'TTS_CONFIG',
    'AUDIO_CONFIG',
    'VAD_CONFIG',
    'WEBRTC_CONFIG',
    'SERVER_CONFIG',
    'DEBUG_CONFIG',
    'PERFORMANCE_CONFIG'
] 