# Hacks Bro AI

**Your AI. Three Modes. One Ecosystem.**

Hacks Bro AI is an independent AI workspace for chat, coding, app building, cybersecurity, research, knowledge, file creation, and creative workflows.

## Architecture

This repository is the independent GitHub version of Hacks Bro AI. It is intended to stand on its own and does not require the Hatchable runtime.

### Core modes

- **Normal** — conversational, creative, and general assistance
- **Beast** — concise defensive cybersecurity analysis
- **Hacking** — ethical security lab / CTF assistance

### Workspace

- AI chat and provider routing
- Code Writer
- App Maker / Project Maker workflows
- Real Maker creative workspace
- Cybersecurity tools
- Research and web-oriented workflows
- File creation
- Study mode
- Mobile-responsive workspace

## AI provider secrets

The current clean provider set is:

```text
OPENAI_API_KEY
GOOGLE_API_KEY
GROQ_API_KEY
MISTRAL_API_KEY
HF_TOKEN
XAI_API_KEY
OPENROUTER_API_KEY
CEREBRAS_API_KEY
```

Owner/admin runtime secret:

```text
ADMIN69_PASSWORD
```

Do **not** commit real secret values. Use GitHub repository/environment secrets. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the migration and Pages setup.

The new provider set intentionally excludes the old Netlify OAuth, Supabase/knowledge-base, and Anthropic/Claude credentials.

## GitHub Pages

This repository is currently named `haxbro-ai`, so its project-site URL is:

**https://m85948190-ctrl.github.io/haxbro-ai/**

GitHub's root user-site URL is based on the account/organization name and requires a repository named `<owner>.github.io`. Therefore **https://hacksbro.github.io/** requires an account or organization named `hacksbro` and a repository named `hacksbro.github.io`; changing this repository's name alone is not enough.

The repository includes `.github/workflows/pages.yml` for GitHub Actions deployment.

## Production rules

1. Keep secrets out of the repository and frontend bundles.
2. Rotate any credential that was ever exposed in a public commit.
3. Keep the GitHub Pages artifact static and free of server-side credentials.
4. Use a separate server/backend for provider API calls that must remain secret.

## Project

**Hacks Bro AI**  
Created by **Mainak Kuila**
