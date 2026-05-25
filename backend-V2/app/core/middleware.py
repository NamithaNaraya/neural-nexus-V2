"""
Middleware Module

Provides pure ASGI middleware for:
- Request logging
- Rate limiting
"""
import time
import logging
import json

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """
    Request logging middleware (Pure ASGI).
    
    Logs all incoming requests with timing information without buffering the response body.
    Safe for use with StreamingResponse and SSE.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        start_time = time.time()
        status_code = [500]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 500)
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Add X-Response-Time header
                headers = list(message.get("headers", []))
                headers.append((b"x-response-time", f"{duration_ms}ms".encode("latin-1")))
                message["headers"] = headers
                
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = int((time.time() - start_time) * 1000)
            path = scope.get("path", "")
            method = scope.get("method", "")
            # Skip noisy endpoints
            if not any(p in path for p in ["/health", "/status", "/sse"]):
                logger.info(f"{method} {path} - {status_code[0]} ({duration_ms}ms)")


class RateLimitMiddleware:
    """
    Simple rate limiting middleware (Pure ASGI).
    
    Limits requests per IP per minute without buffering responses.
    Uses in-memory storage.
    """
    def __init__(self, app, requests_per_minute: int = 100):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
            
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        
        current_minute = int(time.time() / 60)
        key = f"{client_ip}:{current_minute}"
        
        if key in self.request_counts:
            if self.request_counts[key] >= self.requests_per_minute:
                response_body = json.dumps({
                    "error": "Too many requests",
                    "message": f"Rate limit of {self.requests_per_minute} requests per minute exceeded.",
                    "retry_after": 60 - (int(time.time()) % 60)
                }).encode("utf-8")
                
                await send({
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(response_body)).encode("latin-1")),
                    ]
                })
                await send({
                    "type": "http.response.body",
                    "body": response_body,
                })
                return
            self.request_counts[key] += 1
        else:
            # Clean old entries
            self.request_counts = {
                k: v for k, v in self.request_counts.items()
                if k.endswith(f":{current_minute}")
            }
            self.request_counts[key] = 1
            
        await self.app(scope, receive, send)
