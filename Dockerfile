FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ripgrep ffmpeg nodejs npm \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

RUN git clone https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent

WORKDIR /opt/hermes-agent

RUN uv venv venv --python 3.12 && . venv/bin/activate && uv pip install -e ".[all]" \
    && ln -sf /opt/hermes-agent/venv/bin/hermes /usr/local/bin/hermes

# Force Python to run unbuffered for real-time logs
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf8

# Use exec to ensure signals work properly
CMD ["sh", "-c", "mkdir -p /root/.hermes && exec hermes gateway run"]