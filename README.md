# Hermes Agent (Docker)

Docker setup for [Hermes Agent](https://github.com/NousResearch/hermes-agent) from NousResearch with Telegram gateway and OpenAI **gpt-4o-mini**.

Official docs: [https://hermes-agent.nousresearch.com/docs/getting-started/quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)

## Steps

**Step 1:** `cp .env.example .env` and fill in both values (`TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`).

**Step 2:** `docker-compose build` — takes 3–5 minutes (cloning + installing from GitHub).

**Step 3:** `docker-compose up -d`

**Step 4:** `docker-compose logs -f hermes` — wait for the gateway ready message.

**Step 5:** `docker-compose exec hermes hermes model` → select **OpenAI** → **gpt-4o-mini**

**Step 6:** `docker-compose exec hermes hermes gateway setup` → enter your Telegram token when prompted.

**Step 7:** Open Telegram and message your bot **`/start`**.

## Troubleshooting

- **`WSL detected` / systemd / gateway exits** → The image has no systemd. The container runs **`hermes gateway run`** (foreground). Do not use **`hermes gateway start`** as the main process in Docker.

- **`HOME` variable is not set** (Windows) → Compose defaults to a **named volume** for `/root/.hermes`. To use your user folder instead, set **`HERMES_HOST_DATA`** in `.env` (see `.env.example`).

- **`no such file or directory` errors** → Never use `COPY` for an entrypoint; use inline `CMD` in the Dockerfile (as in this repo).

- **`could not find hermes-agent`** → Never use `pip install hermes-agent`; it is not on PyPI. Install from the cloned repo with `uv` as in the Dockerfile.

- **Ollama connection issues** → Not needed here; this setup uses **OpenAI**.

- **Rebuild:** `docker-compose down && docker-compose build --no-cache && docker-compose up -d`

-----======------

After changing any of model , 
first enter 
docker exec -it hermes-agent bash
-> Hermes model

then
docker-compose restart hermes
docker-compose logs -f hermes