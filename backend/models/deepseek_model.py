"""
DeepSeek Model Implementation
"""

import os
import time
import json
import requests
from typing import Generator
from .base_model import BaseAIModel
from config import get_logger

logger = get_logger()

class DeepSeekModel(BaseAIModel):
    """DeepSeek Model Implementation"""
    def __init__(self):
        super().__init__("deepseek-chat")
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.api_url = "https://api.deepseek.com/chat/completions"
    
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    def get_model_info(self) -> dict:
        return {
            "provider": "DeepSeek",
            "model": self.model_name,
            "configured": self.is_configured(),
            "api_url": self.api_url
        }
    
    def call_api_stream(self, user_message: str) -> Generator[str, None, None]:
        start_time = time.time()
        if not self.is_configured():
            duration = time.time() - start_time
            logger.warning("⚠️ Warning: DEEPSEEK_API_KEY environment variable not set")
            yield "Sorry, DeepSeek assistant is temporarily unavailable."
            return
        try:
            self.add_to_history("user", user_message)
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": self.get_system_prompt()},
                    *self.conversation_history
                ],
                "max_tokens": 200,
                "temperature": 0.7,
                "stream": True
            }
            logger.info(f"🤖 Calling DeepSeek API...")
            logger.info(f"🤖 User message: {user_message}")
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=15,
                    stream=True
                )
            except requests.exceptions.ConnectionError as e:
                duration = time.time() - start_time
                logger.error(f"❌ DeepSeek connection error: {e}, duration: {duration:.2f}s")
                yield "Sorry, unable to connect to DeepSeek service."
                return
            except requests.exceptions.Timeout as e:
                duration = time.time() - start_time
                logger.error(f"❌ DeepSeek request timeout: {e}, duration: {duration:.2f}s")
                yield "Sorry, DeepSeek response timed out, please try again later."
                return
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"❌ DeepSeek request exception: {e}, duration: {duration:.2f}s")
                yield "Sorry, DeepSeek encountered a network issue."
                return
            if response.status_code == 200:
                logger.info("🔄 Starting to receive DeepSeek streaming response...")
                ai_reply = ""
                first_token_time = None
                try:
                    for line in response.iter_lines(decode_unicode=True):
                        if line:
                            if not line.startswith('data: '):
                                continue
                            line = line[6:]
                            if line.strip() == '[DONE]':
                                break
                            try:
                                data = json.loads(line)
                                if 'choices' in data and len(data['choices']) > 0:
                                    delta = data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    if content:
                                        if first_token_time is None:
                                            first_token_time = time.time()
                                            first_token_duration = first_token_time - start_time
                                            logger.info(f"⚡ DeepSeek first token arrived, duration: {first_token_duration:.2f}s")
                                        ai_reply += content
                                        logger.debug(f"🔄 DeepSeek receiving content: {repr(content)}")
                                        yield content
                            except json.JSONDecodeError as e:
                                logger.warning(f"⚠️ DeepSeek JSON parsing failed: {e}, line content: {repr(line)}")
                                continue
                except Exception as e:
                    logger.warning(f"⚠️ DeepSeek streaming processing exception: {e}")
                    if not ai_reply:
                        raise e
                duration = time.time() - start_time
                if ai_reply.strip():
                    self.add_to_history("assistant", ai_reply.strip())
                    if first_token_time:
                        remaining_duration = duration - (first_token_time - start_time)
                        logger.info(f"⚡ DeepSeek first token: {(first_token_time - start_time):.2f}s, remaining: {remaining_duration:.2f}s")
                    logger.info(f"✅ DeepSeek streaming response completed, total duration: {duration:.2f}s")
                    logger.info(f"🤖 DeepSeek complete reply: {ai_reply.strip()}")
                else:
                    logger.warning("❌ DeepSeek streaming response is empty")
            else:
                duration = time.time() - start_time
                logger.error(f"❌ DeepSeek API error: {response.status_code} - {response.text}, duration: {duration:.2f}s")
                yield "Sorry, DeepSeek cannot answer your question right now."
                return
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ DeepSeek API call failed: {e}, duration: {duration:.2f}s")
            yield "Sorry, DeepSeek encountered some technical issues."
            return 