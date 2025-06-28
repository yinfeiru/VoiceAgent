"""
AI Model Manager
Responsible for model initialization, switching and unified calling
"""

import os
from typing import Generator, Dict, Any
from .deepseek_model import DeepSeekModel
from .qwen_model import QwenModel
from .base_model import BaseAIModel
from config import get_logger

logger = get_logger()

class ModelManager:
    """AI Model Manager"""
    
    def __init__(self):
        self.models = {}
        self.current_provider = os.getenv("AI_MODEL_PROVIDER", "deepseek")
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize all available models"""
        logger.info("🤖 Initializing AI models...")
        
        try:
            self.models["deepseek"] = DeepSeekModel()
            logger.info(f"✅ DeepSeek model initialization completed")
        except Exception as e:
            logger.error(f"❌ DeepSeek model initialization failed: {e}")
            self.models["deepseek"] = None
        
        try:
            self.models["qwen-plus"] = QwenModel()
            logger.info(f"✅ Qwen-Plus model initialization completed")
        except Exception as e:
            logger.error(f"❌ Qwen-Plus model initialization failed: {e}")
            self.models["qwen-plus"] = None
    
    def get_current_model(self) -> BaseAIModel:
        """Get currently used model"""
        model = self.models.get(self.current_provider)
        if not model:
            raise ValueError(f"Model {self.current_provider} not initialized or does not exist")
        return model
    
    def get_current_provider(self) -> str:
        """Get current model provider"""
        return self.current_provider
    
    def is_current_model_configured(self) -> bool:
        """Check if current model is properly configured"""
        try:
            model = self.get_current_model()
            return model.is_configured()
        except:
            return False
    
    def get_all_model_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status information of all models"""
        status = {}
        for provider, model in self.models.items():
            if model:
                status[provider] = model.get_model_info()
            else:
                status[provider] = {
                    "provider": provider,
                    "configured": False,
                    "error": "Model initialization failed"
                }
        return status
    
    def call_ai_api_stream(self, user_message: str) -> Generator[str, None, None]:
        """Unified AI API calling interface"""
        logger.info(f"🎯 Current AI model: {self.current_provider}")
        
        try:
            model = self.get_current_model()
            
            if not model.is_configured():
                yield f"Sorry, {self.current_provider} model is not properly configured."
                return
            
            logger.info(f"🚀 Using {model.get_model_info()['provider']} model")
            
            for chunk in model.call_api_stream(user_message):
                yield chunk
                
        except Exception as e:
            logger.error(f"❌ AI model call failed: {e}")
            yield "Sorry, AI model encountered an issue while processing."
            return
    
    def get_conversation_history(self) -> list:
        """Get current model's conversation history"""
        try:
            model = self.get_current_model()
            return model.conversation_history
        except:
            return []
    
    def clear_conversation_history(self):
        """Clear current model's conversation history"""
        try:
            model = self.get_current_model()
            model.conversation_history = []
            logger.info("🗑️ Conversation history cleared")
        except Exception as e:
            logger.error(f"❌ Failed to clear conversation history: {e}")
    
    def switch_model(self, provider: str) -> bool:
        """Switch AI model"""
        if provider not in self.models:
            logger.error(f"❌ Unsupported model provider: {provider}")
            return False
        
        if not self.models[provider]:
            logger.error(f"❌ Model {provider} not properly initialized")
            return False
        
        old_provider = self.current_provider
        self.current_provider = provider
        logger.info(f"🔄 AI model switched: {old_provider} → {provider}")
        return True 