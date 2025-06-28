#!/usr/bin/env python3
"""
Logging configuration module
Manages logging levels, formats and output methods for the entire application
"""

import os
import logging
import logging.handlers
from datetime import datetime
from typing import Dict, Any

DEFAULT_LOG_LEVEL = "INFO"
LOG_LEVEL = os.getenv("LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()

LOG_FORMATS = {
    "DETAILED": "%(asctime)s | %(name)s | %(levelname)8s | %(message)s",
    "SIMPLE": "%(asctime)s | %(levelname)8s | %(message)s", 
    "MINIMAL": "%(asctime)s | %(message)s"
}

CURRENT_FORMAT = os.getenv("LOG_FORMAT", "SIMPLE")

LOG_OUTPUT = {
    "CONSOLE": True,
    "FILE": os.getenv("LOG_TO_FILE", "false").lower() == "true",
    "FILE_PATH": os.getenv("LOG_FILE_PATH", "logs/voiceagent.log"),
    "MAX_FILE_SIZE": int(os.getenv("LOG_MAX_FILE_SIZE", "10")) * 1024 * 1024,
    "BACKUP_COUNT": int(os.getenv("LOG_BACKUP_COUNT", "5")),
}

class ColoredFormatter(logging.Formatter):
    """Colored log formatter"""
    
    COLORS = {
        'DEBUG': '\033[36m',
        'INFO': '\033[32m',
        'WARNING': '\033[33m',
        'ERROR': '\033[31m',
        'CRITICAL': '\033[35m',
        'RESET': '\033[0m'
    }
    
    def format(self, record):
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)

def setup_logger(name: str = "voiceagent") -> logging.Logger:
    """
    Setup and return logger instance
    
    Args:
        name: logger name
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    if logger.handlers:
        return logger
    
    log_level = getattr(logging, LOG_LEVEL)
    logger.setLevel(log_level)
    
    if LOG_OUTPUT["CONSOLE"]:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        
        console_formatter = ColoredFormatter(LOG_FORMATS[CURRENT_FORMAT])
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    
    if LOG_OUTPUT["FILE"]:
        log_dir = os.path.dirname(LOG_OUTPUT["FILE_PATH"])
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            LOG_OUTPUT["FILE_PATH"],
            maxBytes=LOG_OUTPUT["MAX_FILE_SIZE"],
            backupCount=LOG_OUTPUT["BACKUP_COUNT"],
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        
        file_formatter = logging.Formatter(LOG_FORMATS[CURRENT_FORMAT])
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger

def get_logger(name: str = "voiceagent") -> logging.Logger:
    """Convenient method to get logger instance"""
    return setup_logger(name)

def set_log_level(level: str):
    """Dynamically set log level"""
    global LOG_LEVEL
    LOG_LEVEL = level.upper()
    for logger_name in logging.Logger.manager.loggerDict:
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, level.upper()))

def get_log_config() -> Dict[str, Any]:
    """Get current logging configuration"""
    return {
        "level": LOG_LEVEL,
        "format": CURRENT_FORMAT,
        "output": LOG_OUTPUT,
    }

def print_log_config():
    """Print current logging configuration information"""
    config = get_log_config()
    print("🔧 Logging System Configuration:")
    print(f"   Level: {config['level']}")
    print(f"   Format: {config['format']}")
    print(f"   Console Output: {config['output']['CONSOLE']}")
    print(f"   File Output: {config['output']['FILE']}")
    if config['output']['FILE']:
        print(f"   Log File: {config['output']['FILE_PATH']}")
    print(f"   Environment Variable: LOG_LEVEL={LOG_LEVEL}") 