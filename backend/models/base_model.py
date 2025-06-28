"""
AI Model Base Class Interface
Defines interfaces that all AI models must implement
"""

from abc import ABC, abstractmethod
from typing import Generator

class BaseAIModel(ABC):
    """AI Model Base Class"""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.conversation_history = []
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if model is properly configured"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> dict:
        """Get model information"""
        pass
    
    @abstractmethod
    def call_api_stream(self, user_message: str) -> Generator[str, None, None]:
        """Call API to get streaming response"""
        pass
    
    def add_to_history(self, role: str, content: str):
        """Add message to conversation history"""
        self.conversation_history.append({"role": role, "content": content})
        
        if len(self.conversation_history) > 20:
            self.conversation_history = self.conversation_history[-20:]
    
    def get_system_prompt(self) -> str:
        """Get system prompt"""
        return "You are a friendly and intelligent AI assistant. Please answer user questions in concise, natural language. Keep responses suitable for voice conversation, avoiding overly long sentences." 