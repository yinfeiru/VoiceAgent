"""
Qwen-Plus Model Implementation
"""

import os
import time
from typing import Generator
from openai import OpenAI
from .base_model import BaseAIModel
from config import get_logger

logger = get_logger()

class QwenModel(BaseAIModel):
    """Qwen-Plus Model Implementation"""
    
    def __init__(self):
        super().__init__("qwen-plus")
        self.api_key = os.getenv("QWEN_PLUS_API_KEY", "")
        self.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
        
        self.client = None
        if self.api_key:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
    
    def is_configured(self) -> bool:
        """Check if Qwen-Plus is properly configured"""
        return bool(self.api_key and self.client)
    
    def get_model_info(self) -> dict:
        """Get Qwen-Plus model information"""
        return {
            "provider": "Qwen-Plus (Alibaba Cloud)",
            "model": self.model_name,
            "configured": self.is_configured(),
            "base_url": self.base_url
        }
    
    def call_api_stream(self, user_message: str) -> Generator[str, None, None]:
        """Call Qwen-Plus API for streaming response"""
        
        start_time = time.time()
        
        if not self.is_configured():
            duration = time.time() - start_time
            logger.warning("⚠️ Warning: QWEN_PLUS_API_KEY environment variable not set or Qwen client not initialized")
            yield "Sorry, Qwen-Plus is temporarily unavailable."
            return
        
        try:
            self.add_to_history("user", user_message)
            
            messages = [
                {"role": "system", "content": self.get_system_prompt()},
                *self.conversation_history
            ]
            
            logger.info(f"🤖 Calling Qwen-Plus API...")
            logger.info(f"🤖 User message: {user_message}")
            
            try:
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    max_tokens=200,
                    temperature=0.7,
                    stream=True,
                    stream_options={"include_usage": True}
                )
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"❌ Qwen request exception: {e}, duration: {duration:.2f}s")
                yield "Sorry, unable to connect to Qwen service."
                return
            
            logger.info("🔄 Starting to receive Qwen streaming response...")
            ai_reply = ""
            first_token_time = None
            
            try:
                for chunk in completion:
                    if first_token_time is None:
                        first_token_time = time.time()
                        first_token_duration = first_token_time - start_time
                        logger.info(f"⚡ Qwen first token arrived, duration: {first_token_duration:.2f}s")
                    
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            content = delta.content
                            ai_reply += content
                            logger.debug(f"🔄 Qwen receiving content: {repr(content)}")
                            
                            yield content
                            
            except Exception as e:
                logger.warning(f"⚠️ Qwen streaming processing exception: {e}")
                if not ai_reply:
                    raise e
            
            duration = time.time() - start_time
            
            if ai_reply.strip():
                self.add_to_history("assistant", ai_reply.strip())
                
                if first_token_time:
                    remaining_duration = duration - (first_token_time - start_time)
                    logger.info(f"⚡ Qwen first token: {(first_token_time - start_time):.2f}s, remaining: {remaining_duration:.2f}s")
                
                logger.info(f"✅ Qwen-Plus streaming response completed, total duration: {duration:.2f}s")
                logger.info(f"🤖 Qwen complete reply: {ai_reply.strip()}")
            else:
                logger.warning("❌ Qwen streaming response is empty")
                
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ Qwen-Plus API call failed: {e}, duration: {duration:.2f}s")
            yield "Sorry, Qwen encountered an issue while processing."
            return 