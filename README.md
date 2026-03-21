# PR Code Reviewer

An AI-powered GitHub Pull Request code reviewer built with Next.js, FastAPI, and Claude AI (Anthropic).

## Features

- **Instant PR Analysis** — Paste any GitHub PR URL and get a complete code review in seconds
- **Claude AI Integration** — Uses `claude-opus-4-6` with adaptive thinking for deep analysis
- **Health Score** — 0-100 quality score with animated circular gauge
- **Issue Detection** — Bugs, warnings, and suggestions with confidence percentages
- **Language-aware** — Specialized prompts for Python, JavaScript/TypeScript, and more
- **Strict Mode** — "Be Harsher" button re-analyzes with stricter criteria
- **Post to GitHub** — Post the AI review directly as a PR comment
- **Analysis History** — Last 5 analyses stored in localStorage
- **Rate Limiting** — 5 analyses per day (tracked in localStorage)
- **Large PR Warning** — Warns when a PR has 500+ changed lines

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| AI | Anthropic Claude (`claude-opus-4-6`) with adaptive thinking |
| External | GitHub REST API v3 |
| HTTP | httpx (backend), fetch (frontend) |

## Project Structure

```
pr reviewer/
├── backend/
│   ├── main.py                 # FastAPI app + CORS
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── routers/
│   │   ├── analyze.py          # POST /api/analyze
│   │   └── comment.py          # POST /api/post-comment
│   └── services/
│       ├── github.py           # GitHub API service
│       └── ai.py               # Claude AI service
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout (Inter font, dark theme)
    │   │   ├── page.tsx        # Main page with state management
    │   │   └── globals.css     # Tailwind + custom animations
    │   ├── components/
    │   │   ├── LandingInput.tsx      # URL input + analyze button
    │   │   ├── LoadingSteps.tsx      # Animated 3-step loader
    │   │   ├── HealthScore.tsx       # SVG circular gauge
    │   │   ├── SummaryCard.tsx       # PR summary + metadata
    │   │   ├── DiffViewer.tsx        # File-by-file issue viewer
    │   │   ├── IssuesPanel.tsx       # Filterable issues list
    │   │   └── AnalysisHistory.tsx   # localStorage history sidebar
    │   ├── lib/
    │   │   └── api.ts          # API client (analyzePR, postComment)
    │   └── types/
    │       └── index.ts        # TypeScript types
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── .env.local.example
```

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional) A [GitHub Personal Access Token](https://github.com/settings/tokens)

### 1. Backend Setup

```bash
cd "pr reviewer/backend"

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (and optionally GITHUB_TOKEN)
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### 2. Frontend Setup

```bash
cd "pr reviewer/frontend"

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local — defaults work if backend is on port 8000
```

Start the frontend development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from console.anthropic.com |
| `GITHUB_TOKEN` | No | GitHub Personal Access Token (increases rate limits from 60 to 5000 req/hr, required for private repos and posting comments) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_GITHUB_TOKEN` | No | GitHub token for posting PR comments from the frontend |

## API Endpoints

### `POST /api/analyze`

Analyzes a GitHub PR using Claude AI.

**Request body:**
```json
{
  "url": "https://github.com/owner/repo/pull/123",
  "strict_mode": false,
  "model": "claude-opus-4-6"
}
```

**Response:**
```json
{
  "summary": "This PR adds authentication middleware...",
  "health_score": 78,
  "language": "TypeScript",
  "issues": [
    {
      "severity": "bug",
      "file": "src/auth.ts",
      "line": 42,
      "description": "JWT token is not validated before use",
      "confidence": 95
    }
  ],
  "time_saved_minutes": 25,
  "pr_title": "Add JWT authentication",
  "pr_author": "octocat",
  "pr_base_branch": "main",
  "pr_head_branch": "feature/auth",
  "pr_description": "...",
  "total_changed_lines": 150,
  "pr_url": "https://github.com/owner/repo/pull/123",
  "pr_number": 123,
  "repo_name": "owner/repo"
}
```

### `POST /api/post-comment`

Posts the AI review as a GitHub PR comment.

**Request body:**
```json
{
  "url": "https://github.com/owner/repo/pull/123",
  "feedback": { ... },
  "github_token": "optional_token"
}
```

## Development Notes

- The backend uses `httpx` for async GitHub API calls
- Claude's response uses streaming with `get_final_message()` to support adaptive thinking
- The frontend stores history and rate limits in `localStorage`
- CORS is configured for `localhost:3000` — update `main.py` for production
- The diff is filtered to only changed lines (`+`/`-`) before sending to Claude to reduce token usage

## Troubleshooting

**"GitHub rate limit exceeded"** — Add a `GITHUB_TOKEN` to your backend `.env` file.

**"ANTHROPIC_API_KEY not set"** — Make sure you created `backend/.env` from `.env.example` and added your key.

**CORS errors in browser** — Ensure the backend is running on port 8000 and frontend on port 3000.

**"PR not found"** — The PR URL must be in format `https://github.com/owner/repo/pull/NUMBER`. Private repos require a `GITHUB_TOKEN`.
