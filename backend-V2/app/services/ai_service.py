"""
AI Service - LangChain & LangGraph Integration

Unified LLM and Embedding provider using LangChain abstractions.
Routes LLM tasks to Gemini 2.5 Flash and Embeddings to Ollama.
"""
import logging
from typing import Any, Dict, List, Optional

from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser

from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """
    Unified AI Service using LangChain.
    
    Provides:
    - Chat capabilities (Ollama)
    - JSON extraction capabilities
    - Text Embeddings (Ollama)
    """
    
    def __init__(self):
        # 1. Initialize LLM strictly using Ollama
        self.llm = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0.1,
            num_predict=settings.OLLAMA_NUM_PREDICT,
            num_ctx=settings.OLLAMA_NUM_CTX,
            top_p=settings.OLLAMA_TOP_P,
            repeat_penalty=settings.OLLAMA_REPEAT_PENALTY,
        )
        logger.info(f"LangChain: Ollama initialized with model {settings.OLLAMA_MODEL} at {settings.OLLAMA_BASE_URL}")
        
        # 2. Initialize Embeddings strictly using Ollama
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_EMBED_MODEL
        )
        logger.info(f"LangChain: Ollama Embeddings initialized with {settings.OLLAMA_EMBED_MODEL}")


    def _convert_messages(self, messages: List[Dict[str, str]]) -> List[Any]:
        """Convert dict-style messages to LangChain message objects."""
        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))
        return lc_messages

    async def chat(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.1,
        **kwargs
    ) -> str:
        """Run a standard chat completion."""
        if not self.llm:
            raise RuntimeError("LLM Provider not configured properly.")
        
        lc_messages = self._convert_messages(messages)
        
        try:
            # We use ainvoke for async LangChain execution
            response = await self.llm.ainvoke(lc_messages)
            # Guard against None content (safety filters, empty responses, rate limits)
            return response.content or ""
        except Exception as e:
            logger.error(f"LangChain Chat Error: {e}")
            raise

    async def chat_json(
        self, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> Dict[str, Any]:
        """Run a chat completion and parse the output as JSON."""
        response_text = await self.chat(messages, **kwargs)
        
        try:
            # Clean up potential markdown blocks from Gemini
            clean = response_text.strip()
            if clean.startswith("```json"):
                clean = clean[7:-3].strip()
            elif clean.startswith("```"):
                clean = clean[3:-3].strip()
            
            import json
            return json.loads(clean)
        except Exception as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            # Manual extraction fallback
            try:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                if start >= 0 and end > start:
                    import json
                    return json.loads(response_text[start:end])
            except Exception as e:
                logger.error(f"Caught exception: {e}", exc_info=True)
                pass
            return {"error": "Extraction failed", "raw_response": response_text}

    async def embed(self, text: str) -> List[float]:
        """Generate a single embedding using Ollama via LangChain."""
        try:
            return await self.embeddings.aembed_query(text)
        except Exception as e:
            logger.error(f"LangChain Embedding Error: {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate multiple embeddings in batch."""
        try:
            return await self.embeddings.aembed_documents(texts)
        except Exception as e:
            logger.error(f"LangChain Batch Embedding Error: {e}")
            raise

    async def check_health(self) -> bool:
        """Verify connection to Ollama LLM."""
        try:
            await self.chat([{"role": "user", "content": "ping"}])
            return True
        except Exception as e:
            logger.error(f"AIService Health Check failed: {e}")
            return False

# Singleton instance
_ai_service: Optional[AIService] = None

def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service

# Compatibility helper
def get_ollama_service():
    return get_ai_service()
