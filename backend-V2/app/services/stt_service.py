import os
import logging
from typing import Optional
from faster_whisper import WhisperModel
import tempfile
from app.core.config import settings

logger = logging.getLogger(__name__)

class STTService:
    _instance: Optional['STTService'] = None
    _model: Optional[WhisperModel] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(STTService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Lazy initialization to avoid loading model on every import
        pass

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            model_name = settings.WHISPER_MODEL
            logger.info(f"🎙️ Loading Whisper model ({model_name})...")
            # Using configured model, e.g. "tiny" (~70MB) for ultra-fast startup/loading
            # device="cpu" ensures it runs without needing a GPU
            # compute_type="int8" reduces memory usage/latency on CPU
            self._model = WhisperModel(model_name, device="cpu", compute_type="int8")
            logger.info(f"✅ Whisper model ({model_name}) loaded")
        return self._model

    async def transcribe(self, audio_bytes: bytes) -> str:
        """
        Transcribes audio bytes to text using Faster-Whisper.
        """
        try:
            model = self._get_model()
            
            # Save bytes to a temporary file because Whisper expects a file path or stream
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                # Transcribe
                segments, info = model.transcribe(tmp_path, beam_size=5)
                
                text = ""
                for segment in segments:
                    text += segment.text
                
                return text.strip()
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            logger.error(f"❌ STT transcription failed: {e}")
            raise e

# Singleton instance
stt_service = STTService()

def get_stt_service() -> STTService:
    return stt_service
