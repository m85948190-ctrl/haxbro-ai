# Hacks Bro AI — GitHub deployment

## Provider secrets

Create these as GitHub repository/environment secrets. Never commit the values.

| GitHub secret | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `GOOGLE_API_KEY` | Google Gemini |
| `GROQ_API_KEY` | Groq |
| `MISTRAL_API_KEY` | Mistral |
| `HF_TOKEN` | Hugging Face |
| `XAI_API_KEY` | xAI / Grok |
| `OPENROUTER_API_KEY` | OpenRouter |
| `CEREBRAS_API_KEY` | Cerebras |
| `ADMIN69_PASSWORD` | HAxBRO owner/admin runtime |

Not part of the new provider set:

- Netlify OAuth
- Supabase / old knowledge-base credentials
- Anthropic / Claude

## GitHub Pages URLs

The current repository is `m85948190-ctrl/haxbro-ai`, so its project-site URL is:

`https://m85948190-ctrl.github.io/haxbro-ai/`

A root user-site URL such as `https://m85948190-ctrl.github.io/` requires a repository named exactly `m85948190-ctrl.github.io`.

A URL of `https://hacksbro.github.io/` is different: GitHub requires the account or organization owner to be named `hacksbro`, with a repository named `hacksbro.github.io`. Renaming only this `haxbro-ai` repository cannot create that root URL.

## Publishing

The repository contains `.github/workflows/pages.yml` for GitHub Actions Pages deployment. In the repository's **Settings → Pages**, select **GitHub Actions** as the source when that option is available. GitHub may take several minutes after the first successful deployment to publish the site.

## Security rules

- Real provider values belong only in GitHub Secrets or another server-side secret store.
- Do not put API keys in `public/`, HTML, JavaScript bundles, README files, screenshots, or commit messages.
- Rotate a provider key if it has ever been committed to a public repository.
