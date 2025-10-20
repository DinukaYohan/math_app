## MathAI

**Course:** 159333 Programming Project &mdash; Dr. Surangika Ranathunga  
**Mission:** Help teachers and students generate curriculum-aware math word problems that respect the selected grade, country, language, topic, and preferred LLM.

---

## About

The Math App helps students and teachers generate curriculum-aware math questions by grade, language, country, topic, and model. Our aim is to make practice fast, consistent, and accessible.

---

## Team & Roles

- **Dinuka Yohan** &mdash; Backend Developer  
  Implemented Flask endpoints, validation logic, and question generation workflow.
- **Sunera Hewage** &mdash; Backend Developer  
  Built REST APIs, middleware, and server-side integrations.
- **Benul Santhush** &mdash; Database & Model Integration  
  Designed the SQLite schema, Excel importer, and OpenAI ChatGPT adapter.
- **Vimukthi Wepitiyage** &mdash; Frontend Developer  
  Crafted the core UI, filter flows, and generation/review experiences.
- **Kavish Ratnayaka** &mdash; Frontend Developer  
  Delivered responsive layouts, auth screens, and UX polish.

---

## Tech Stack

- **Languages:** Python, JavaScript, HTML, CSS, SQL
- **Backend:** Flask, Flask-JWT-Extended, SQLite, OpenPyXL
- **LLM Integrations:** Hugging Face Transformers (Qwen3 0.6B), Google Gemini, OpenAI GPT-4o mini
- **Frontend:** Bootstrap 5, vanilla JS, KaTeX
- **Tooling & Runtime:** Node.js + Express dev server, JWT auth, CORS, WAL-mode SQLite

---

## Project Structure

backend/ # Flask API, LLM adapters, SQLite DB + Excel importer
frontend/ # Static UI (HTML/CSS/JS) + assets
frontend/frontend-server/ # Express dev server + proxy
backend/data/maths LOs.xlsx # Curriculum objectives imported on startup


---

## Backend Setup & Run

```bash
cd backend

# 1. Create & activate virtualenv
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Configure API keys – see below.

# 4. Launch Flask app (SQLite DB + Excel import happen automatically)
python app.py


The API listens on http://127.0.0.1:8080.

cd frontend/frontend-server
npm install              # Installs Express + proxy middleware
node server.js           # Serves static UI on http://localhost:3000


The Express dev server proxies /api calls to the Flask backend.

If you would rather open the static pages directly (without Express), launch frontend/index.html in a browser and ensure CORS remains enabled in Flask.

Environment Variables
Variable	Purpose	Example
GEMINI_API_KEY	Required for Google Gemini requests (backend/gemini.py)	export GEMINI_API_KEY=your-key
OPENAI_API_KEY	Required for OpenAI GPT requests (backend/llm_openai.py)	export OPENAI_API_KEY=your-key
GEMINI_MODEL	Optional override (default gemini-2.5-flash)	export GEMINI_MODEL=gemini-1.5-flash
GEMINI_TEMPERATURE	Optional temperature tweak (default 0.7)	export GEMINI_TEMPERATURE=0.5
GEMINI_MAX_OUTPUT_TOKENS	Optional minimum output tokens (default floor 512)	export GEMINI_MAX_OUTPUT_TOKENS=768
Set Environment Variables

Set Environment Variables
Windows PowerShell

setx GEMINI_API_KEY "your-key-here"
setx OPENAI_API_KEY "your-key-here"
# Re-open the terminal or run $env:GEMINI_API_KEY="your-key-here" for the current session.


macOS / Linux

export GEMINI_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
# Optionally add the lines to ~/.bashrc or ~/.zshrc


Hugging Face (Qwen Model)

# Optional: authenticate if the model requires gated access
huggingface-cli login

# Model + tokenizer download automatically when you first run the backend.


Quick Test Workflow
Start the Flask backend (python app.py).
Start the frontend dev server (node server.js).
Visit http://localhost:3000, register/sign in, choose filters, and generate a math problem.
Switch models between Qwen, Gemini, and OpenAI to compare outputs.
Review history at /history.html, submit thumbs-up/down feedback, or clear entries.
Additional Notes
The Excel file backend/data/maths LOs.xlsx is loaded once at startup; ensure it exists or update the path before first run.
SQLite DB (backend/app.db) is created automatically with WAL and foreign-key enforcement.
JWT secret is currently set for development (dev-secret-change-me) inside backend/app.py; replace in production.
When deploying, expose only the Flask API; the frontend can be hosted from any static host pointing at the backend URL.

Happy teaching and learning! ✨
