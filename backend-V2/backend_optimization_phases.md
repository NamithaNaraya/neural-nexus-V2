# Neural Nexus V2 Backend Optimization Phases

This document outlines the step-by-step phases of the backend optimization process. Each phase is designed to be independent and fully testable, allowing you to run verification commands before moving to the next step.

---

## Phase 1: Environment Alignment & Dependency Correction (Completed ✅)

**Goal**: Resolve startup failures, remove C-compilation errors on Windows, and ensure direct loading of your local database/Ollama variables from `.env` without hardcoded fallback URLs.

### Changes Made:
1. **`requirements.txt` Update**:
   - Replaced `python-Levenshtein` and `fuzzywuzzy` with `rapidfuzz==3.14.5` to prevent C++ compiler errors on Windows.
   - Added `faster-whisper>=0.10.0` (missing from imports).
   - Added `asyncpg>=0.29.0` (missing PostgreSQL async engine driver).
   - Added `langgraph` (for stateful chat orchestration).
2. **`app/core/config.py`**:
   - Upgraded Pydantic settings configuration to V2 syntax: `model_config = SettingsConfigDict(..., extra="ignore")`.
   - Stripped hardcoded defaults for `DATABASE_URL`, `NEO4J_URI`, and `REDIS_URL` so that settings load exclusively from `.env`.
3. **`app/services/analytics_chat/analytic_chat_service.py`**:
   - Removed legacy `fuzzywuzzy` imports to prevent startup failures.

### How to Test:
Run the FastAPI application using Uvicorn:
```powershell
uvicorn main:app --reload
```
**Expected Result**:
The application should start successfully, connect to Neo4j, PostgreSQL, and Redis (using the exact IP/ports from your `.env`), initialize the Ollama model, and print:
`INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`

---

## Phase 2: Local AI & Embeddings Consolidation

**Goal**: Ensure `app/services/ai_service.py` has no residual cloud API code (e.g. Gemini, OpenAI) and runs entirely on your local Ollama endpoints.

### Planned Changes:
* Simplify comments and clean docstrings in `app/services/ai_service.py` to reflect the local Ollama-only architecture.
* Confirm that any residual variables (like `GOOGLE_API_KEY` or `GEMINI_MODEL`) are fully removed from `app/core/config.py`.

### How to Test:
Create and run a short test script `test_ollama.py` in your terminal:
```powershell
python test_ollama.py
```
**Expected Result**:
Successfully prints a chat completion and a list of embeddings from your local Ollama instance on `http://10.10.20.225:11434`.

---

## Phase 3: Stateful LangGraph Chat Workflow Integration

**Goal**: Establish a routing and retrieval state graph via LangGraph (`app/services/chat_workflow.py`) to process chat queries in an organized pipeline.

### Planned Changes:
* Verify the node methods inside `app/services/chat_workflow.py` (`router_node`, `retriever_node`, `enricher_node`, `synthesizer_node`).
* Ensure they are correctly mapped to local `ChatOllama` LLM and `OllamaEmbeddings` services.
* Expose the compiled Graph workflow via a dependency injector function.

### How to Test:
Run a simple script to invoke the compiled LangGraph workflow:
```powershell
python test_workflow_compilation.py
```
**Expected Result**:
Prints the compiled state graph structure and confirms it compiles without syntax or connection errors.

---

## Phase 4: Route Consolidation & API Unification

**Goal**: Centralize all chat queries to use the optimized LangGraph pipeline while maintaining backwards compatibility with your frontend endpoints.

### Planned Changes:
* Update `app/routes/chat_optimized.py` to route `/api/v1/combined-chat/stream-answer` and `/api/v1/chat-optimized/query-stream` through the LangGraph engine.
* Maintain clean SSE (Server-Sent Events) formatting so that answers stream continuously to the UI.

### How to Test:
Run the stream testing script:
```powershell
python test_stream.py
```
**Expected Result**:
Retrieves a test authentication token, runs a combined chat stream request, and prints streamed response tokens and citations incrementally to the console.

---

## Phase 5: Legacy Code Purge & Folder Optimization

**Goal**: Remove unused endpoints, files, and packages to leave a clean, minimal, yet powerful codebase.

### Planned Changes:
* Delete any unused legacy routers or services that are now redundant (e.g., if there are duplicate or obsolete chat files in `app/services/` or `app/routes/`).
* Do a final inspection of `requirements.txt` to ensure only active packages are declared.

### How to Test:
Start the server and browse the interactive Swagger API documentation:
```powershell
uvicorn main:app --reload
```
Navigate to `http://127.0.0.1:8000/api/docs` and confirm the cleanup of legacy endpoints.
