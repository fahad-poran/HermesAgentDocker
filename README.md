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

===============-------------============------------==========

[!DockerN_HarmesImg](Images/docker_hermes_architecture.svg)

# Docker & Hermes Agent: Complete Engineering Guide

---

## PART 1: HOW DOCKER WORKS (Foundation)

### What is Docker?

Docker is a **containerization** technology that packages your application with all its dependencies into a lightweight, isolated environment called a **container**.

**Real-world analogy:**
- Without Docker: Shipping a car by disassembling it, then the buyer has to reassemble it and find compatible parts for their garage
- With Docker: Shipping the car in a sealed shipping container with everything it needs to run

### Key Concepts

#### 1. **Image vs Container**
- **Image**: A blueprint/template (like a recipe or class definition)
  - Read-only
  - Contains OS, dependencies, code, configuration
  - Stored on disk
  
- **Container**: A running instance of an image (like baking from the recipe)
  - Writable (has its own filesystem layer)
  - Isolated from other containers
  - Uses minimal resources

**Analogy:** Image = Class, Container = Object instance

#### 2. **Layers**
Docker images are built in layers (like a cake):
```
Layer 5: CMD instruction (what to run)
Layer 4: RUN pip install packages
Layer 3: RUN apt-get install tools
Layer 2: Copy source code
Layer 1: Base OS (python:3.12-slim)
```

Each layer is cached, so if you rebuild and only the last layer changed, Docker reuses previous layers (fast builds!).

#### 3. **Isolation**
Each container has its own:
- Filesystem
- Network interfaces
- Processes
- Environment variables
- User namespace

But they share the **host kernel** (unlike VMs which need their own kernel).

#### 4. **Volumes**
Containers are ephemeral (temporary). When a container stops, its data is lost.

**Volumes** are persistent storage that survives container restarts:
- **Named volumes**: Managed by Docker, stored in `/var/lib/docker/volumes`
- **Bind mounts**: Maps a host directory to a container directory (what your config uses)

#### 5. **Environment Variables**
Configuration passed into containers without hardcoding values.

---

## PART 2: LINE-BY-LINE DOCKERFILE ANALYSIS

### Dockerfile Breakdown

```dockerfile
FROM python:3.12-slim
```
- **What:** Specifies the base image
- **Why:** `python:3.12-slim` = Python 3.12 with minimal OS overhead
- **How it works:** Pulls this image from Docker Hub (default registry) if not cached
- **Alternatives:** `python:3.12` (larger, includes more tools), `python:3.12-alpine` (tiniest)

---

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ripgrep ffmpeg nodejs npm \
    && rm -rf /var/lib/apt/lists/*
```

**Line 1: `RUN apt-get update`**
- Refreshes the package manager's cache
- Necessary before installing anything in a fresh image

**Line 2: `apt-get install -y`**
- `-y`: Automatically answer "yes" to prompts
- Installs system packages:
  - `git`: Version control (to clone the agent repo)
  - `curl`: Download files from URLs
  - `ripgrep`: Fast text search tool
  - `ffmpeg`: Audio/video processing
  - `nodejs npm`: JavaScript runtime and package manager

**Line 3: `--no-install-recommends`**
- Installs only required dependencies, not suggested extras
- Reduces image size

**Line 4: `rm -rf /var/lib/apt/lists/*`**
- Deletes package manager cache
- **Critical for reducing image size** (saves ~100MB)
- Safe because apt-get update will regenerate it

**Why this whole block is one RUN:** Docker layers. Each RUN = one layer. Multiple RUNs = bigger image. Combining with `&&` chains commands: if any fails, the whole RUN fails (fail-fast).

---

```dockerfile
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
```

- **What:** Downloads and runs the `uv` installer script
  - `uv` = ultra-fast Python package installer (alternative to `pip`, much faster)
- **Why curl:** Downloads the installer script
- **Why piping to sh:** Executes it immediately
- **Flags:**
  - `L`: Follow redirects
  - `s`: Silent mode
  - `S`: Show errors despite silent mode
  - `f`: Fail silently on HTTP errors

---

```dockerfile
ENV PATH="/root/.local/bin:$PATH"
```

- **What:** Sets an environment variable for all subsequent layers and the container
- **Why:** `uv` installs to `/root/.local/bin`, so we need to add it to PATH
- **How it works:** When you run commands, the shell searches directories in PATH order
- **Result:** Now `uv` command is accessible from anywhere in the container

---

```dockerfile
RUN git clone https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent
```

- **What:** Clones the Hermes Agent repository
- **Where:** Into `/opt/hermes-agent` inside the container
- **Why `/opt/`:** Conventional location for optional software in Linux

---

```dockerfile
WORKDIR /opt/hermes-agent
```

- **What:** Changes the working directory (like `cd` on your machine)
- **Effect:** All subsequent commands run in this directory
- **For containers:** The default directory when you `docker exec` into it

---

```dockerfile
RUN uv venv venv --python 3.12 && . venv/bin/activate && uv pip install -e ".[all]"
```

**Part 1: `uv venv venv --python 3.12`**
- Creates a Python **virtual environment** in `./venv` folder
- Virtual environment = isolated Python installation
- `--python 3.12`: Use Python 3.12 specifically
- **Why?** Prevents dependency conflicts between projects

**Part 2: `. venv/bin/activate`**
- Activates the virtual environment
- `.` = source (loads environment variables into current shell)
- After this, `python` and `pip` refer to the venv, not the system Python

**Part 3: `uv pip install -e ".[all]"`**
- `-e`: Editable mode (installs in development mode, changes reflect immediately)
- `".[all]"`: Install from current directory with ALL optional dependencies
- Looking at the hermes-agent `pyproject.toml`, `[all]` includes: LLMs, tools, agent frameworks

---

```dockerfile
&& ln -sf /opt/hermes-agent/venv/bin/hermes /usr/local/bin/hermes
```

- **What:** Creates a symbolic link (shortcut)
- `ln -sf`: Link, symbolic, force (overwrite if exists)
- **Source:** `/opt/hermes-agent/venv/bin/hermes` (the installed command)
- **Destination:** `/usr/local/bin/hermes` (globally accessible location)
- **Effect:** You can type `hermes` anywhere in the container, not just in `/opt/hermes-agent`

---

```dockerfile
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf8
```

**PYTHONUNBUFFERED=1**
- **Problem:** By default, Python buffers stdout (collects output before printing)
- **Why it's bad in containers:** Logs are delayed, hard to debug
- **Solution:** Unbuffered = print immediately
- **Critical for:** Real-time log monitoring

**PYTHONIOENCODING=utf8**
- Forces Python to use UTF-8 encoding
- Prevents issues with non-ASCII characters (emojis, special characters)

---

```dockerfile
CMD ["sh", "-c", "mkdir -p /root/.hermes && exec hermes gateway run"]
```

- **What:** Default command when container starts
- **Breaking it down:**
  - `sh -c`: Run shell commands
  - `mkdir -p /root/.hermes`: Create data directory if it doesn't exist (safe to run repeatedly)
  - `exec hermes gateway run`: Start the Hermes agent
  - `exec`: Replaces the shell process with hermes (important for signal handling)

**Why `exec`?** Without it, Ctrl+C signals might not reach the hermes process properly.

---

## PART 3: LINE-BY-LINE DOCKER-COMPOSE ANALYSIS

### Docker Compose Explained

Docker Compose orchestrates **multiple containers** and their networking. Here it's just one service, but the configuration handles:
- Building the image
- Running the container
- Environment setup
- Volume mounting
- Network configuration

### docker-compose.yml Breakdown

```yaml
services:
  hermes:
```
- Defines a service named `hermes`
- In a multi-service setup, you'd have `web:`, `database:`, `redis:`, etc.

---

```yaml
build: .
```
- **What:** Build the Docker image from the Dockerfile in the current directory (`.`)
- **How:** Reads the Dockerfile and creates an image
- **Alternative:** `image: myimage:latest` (uses pre-built image instead)

---

```yaml
container_name: hermes-agent
```
- Names the container `hermes-agent`
- Without this, Docker generates random names like `nifty_hopper_42`
- Helps identify containers in `docker ps` output

---

```yaml
restart: always
```
- **What:** Restart policy
- **always**: Restart if container stops (for any reason)
- **Other options:**
  - `no`: Don't restart
  - `unless-stopped`: Restart unless explicitly stopped
  - `on-failure:5`: Restart up to 5 times if exit code is non-zero

---

```yaml
volumes:
  - ./hermes_data:/root/.hermes
```

**Bind Mount (local directory)**
- `./hermes_data`: Directory on your **host machine** (relative to docker-compose.yml location)
- `/root/.hermes`: Directory in the **container**
- **Effect:** Files written to `/root/.hermes` in the container appear in `./hermes_data` on your machine
- **Why?** Persist data (database files, cache, logs) after container restarts

**How it works:**
```
Host Machine                Container
./hermes_data/    <----->   /root/.hermes/
(your files)               (container's view)
```

Changes in either location are visible in the other (two-way sync).

---

```yaml
environment:
```
- Pass configuration to the container via environment variables

---

```yaml
- TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
- TELEGRAM_ALLOWED_USERS=${TELEGRAM_ALLOWED_USERS}
- GOOGLE_API_KEY=${GOOGLE_API_KEY}
```

- `${VARIABLE_NAME}`: Docker Compose reads from `.env` file
- **Example `.env` file:**
  ```
  TELEGRAM_BOT_TOKEN=123456:ABCdef...
  TELEGRAM_ALLOWED_USERS=12345,67890
  GOOGLE_API_KEY=AIza...
  ```
- **Why?** Keep secrets out of version control; load from environment

---

```yaml
- PYTHONUNBUFFERED=1
- PYTHONIOENCODING=utf8
```

- Same as in Dockerfile (redundant, but doesn't hurt)
- Environment variables can be set in Docker or docker-compose

---

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

- **Problem:** Container can't access `localhost:8000` on your machine by default
- **Solution:** Create a special hostname `host.docker.internal` that routes to the host
- **Use case:** If you have a service running on your machine, the container can connect to `host.docker.internal:8000`

---

```yaml
stdin_open: true
tty: true
```

- `stdin_open`: Keep stdin open (like `docker run -i`)
- `tty: true`: Allocate a pseudo-terminal (like `docker run -t`)
- **Effect:** You can interact with the container (send Ctrl+C, type input)
- **Critical for:** Debugging and monitoring

---

## PART 4: DOCKER ENGINEERING CONCEPTS

### Image Build Process

```
1. Read Dockerfile line by line
2. For each line:
   a. Execute instruction
   b. Create a new layer
   c. Save hash of this layer
3. Tag the final image
4. Store in local Docker daemon
```

**Layer Caching Example:**
```
First build:  Base OS → Install deps → Clone repo → Install packages → RUN CMD
              (no cache)

Second build: Base OS → Install deps → Clone repo → Install packages → RUN CMD
              (reuses all previous layers if Dockerfile lines 1-3 unchanged)
```

### Container Lifecycle

```
docker-compose up
    ↓
1. Check if image exists
   └─ If not: build it (Dockerfile)
2. Create container from image
   ├─ Allocate filesystem (image + writable layer)
   ├─ Set environment variables
   ├─ Mount volumes
   └─ Create network namespace
3. Run entrypoint/CMD
   └─ Execute: sh -c "mkdir -p /root/.hermes && exec hermes gateway run"
4. Container is running
5. docker-compose down
   ├─ Send SIGTERM to process
   ├─ Wait 10s for graceful shutdown
   └─ If still running: SIGKILL
6. Container stops, filesystem layer deleted
   └─ Volume data persists (in ./hermes_data)
```

### Networking

**When using docker-compose:**
- Containers are on an isolated network
- Can communicate using service names as hostnames
  - Example: If you had `database: postgres`, the hermes container could connect to `postgres:5432`
- Port mapping: `ports: ["8000:8000"]` = `localhost:8000` → `container:8000`

---

## PART 5: DOCKER COMMANDS FOR HERMES AGENT NAVIGATION

### Basic Lifecycle

```bash
# Start the container (builds image if needed)
docker-compose up -d

# View logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f hermes

# View last 100 lines
docker-compose logs --tail 100 hermes

# Stop container
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove, and remove volumes (clean slate)
docker-compose down -v
```

### Accessing the Container

```bash
# Open a shell inside the running container
docker-compose exec hermes sh

# Run a one-off command inside the container
docker-compose exec hermes hermes --help

# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View container details (IP, mounts, environment)
docker inspect container_name
```

### Image Management

```bash
# List images
docker images

# See Docker images with their sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Remove image (container must be stopped first)
docker rmi image_name

# Rebuild image (ignore cache)
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Debugging

```bash
# View container filesystem
docker-compose exec hermes ls -la /root/.hermes

# View container's Python environment
docker-compose exec hermes which python
docker-compose exec hermes python --version
docker-compose exec hermes pip list

# Check if packages installed correctly
docker-compose exec hermes hermes --version

# View environment variables
docker-compose exec hermes env | grep TELEGRAM

# Test connectivity to host
docker-compose exec hermes ping host.docker.internal

# View container's network
docker-compose exec hermes ifconfig
```

### Logs & Monitoring

```bash
# Follow logs with timestamps
docker-compose logs -f --timestamps

# Search logs
docker-compose logs hermes | grep ERROR

# Save logs to file
docker-compose logs hermes > hermes_logs.txt

# Monitor in real-time (CPU, memory)
docker stats

# View container resource usage
docker stats hermes-agent

# Check container health
docker inspect hermes-agent | grep -A 5 Health
```

### Volume Management

```bash
# List volumes
docker volume ls

# View volume details
docker volume inspect hermes-agent_hermes_agent_data

# Inspect what's in the mounted directory
ls -la ./hermes_data

# Copy file from container to host
docker-compose exec hermes cat /root/.hermes/config.json > config.json

# Copy file from host to container
docker cp ./config.json hermes-agent:/root/.hermes/config.json

# View disk usage by images/containers/volumes
docker system df

# Clean up unused images/containers/networks
docker system prune -a
```

### Troubleshooting

```bash
# Check if container crashed
docker-compose ps

# View last exit code
docker inspect hermes-agent | grep ExitCode

# Restart service
docker-compose restart hermes

# Restart with fresh build
docker-compose up -d --build

# Check Docker daemon logs
docker-compose logs

# Test build without running
docker-compose build

# Validate compose file
docker-compose config

# Check for port conflicts
docker ps --format "table {{.Names}}\t{{.Ports}}"

# View all errors in detail
docker-compose logs hermes 2>&1 | tail -50
```

---

## PART 6: HERMES-SPECIFIC COMMANDS

Once inside the container:

```bash
# Enter container
docker-compose exec hermes sh

# Check Hermes installation
hermes --version
hermes --help

# Test gateway
hermes gateway --help

# View agent config
hermes config

# Run hermes with verbose logging
hermes gateway run --verbose

# Test with specific backend
hermes gateway run --backend openai
```

---

## PART 7: COMMON WORKFLOWS

### Workflow 1: Setup and First Run

```bash
# 1. Create .env file with secrets
cat > .env << EOF
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_ALLOWED_USERS=123456,789012
GOOGLE_API_KEY=your_api_key_here
EOF

# 2. Start container
docker-compose up -d

# 3. Watch logs
docker-compose logs -f

# 4. Verify it's running
docker ps
```

### Workflow 2: Debug Connection Issues

```bash
# 1. Access container shell
docker-compose exec hermes sh

# 2. Check if packages installed
pip list | grep hermes

# 3. Test Python imports
python -c "import hermes; print(hermes.__version__)"

# 4. Check environment variables
env | grep TELEGRAM

# 5. Test network connectivity
ping host.docker.internal  # ping your machine
curl https://api.telegram.org  # test external network
```

### Workflow 3: Persist Data Between Restarts

```bash
# 1. Understand volume mount
# ./hermes_data on host <---> /root/.hermes in container

# 2. Check what was created
ls -la ./hermes_data

# 3. Backup before major changes
cp -r ./hermes_data ./hermes_data.backup

# 4. Restart (data persists)
docker-compose stop
docker-compose up -d
# ./hermes_data still exists with all previous data
```

### Workflow 4: Update Dependencies

```bash
# 1. Modify Dockerfile or hermes-agent requirements

# 2. Rebuild image
docker-compose build --no-cache hermes

# 3. Recreate container with new image
docker-compose up -d

# 4. Verify
docker-compose exec hermes pip list
```

---

## PART 8: KEY CONCEPTS SUMMARY TABLE

| Concept | Host Machine | Container | Persistence |
|---------|--------------|-----------|-------------|
| **Filesystem** | `/home/user/hermes` | `/opt/hermes-agent` | No (reset on restart) |
| **Data** | `./hermes_data/` | `/root/.hermes/` | **Yes (volume mount)** |
| **Environment** | `.env` file | Passed in docker-compose | Yes (in ENV vars) |
| **Network** | localhost:8000 | 0.0.0.0:8000 | Only within container |
| **Logs** | `docker-compose logs` | `stdout/stderr` | Viewable via Docker |

---

## PART 9: UNDERSTANDING PYTHONUNBUFFERED

**Problem (without PYTHONUNBUFFERED=1):**
```
Program writes: print("Starting agent...")
Python buffers: [waiting for 4KB or newline]
Docker logs: [nothing shown yet]
Program writes: print("Connecting...")
Python buffers: [waiting...]
Program writes: print("Connected!")
Container stops: [data lost, nothing logged]
```

**Solution (with PYTHONUNBUFFERED=1):**
```
Program writes: print("Starting agent...")
Python: [send immediately]
Docker logs: "Starting agent..." (appears instantly)
Program writes: print("Connecting...")
Python: [send immediately]
Docker logs: "Connecting..." (appears instantly)
Program writes: print("Connected!")
Python: [send immediately]
Docker logs: "Connected!" (appears instantly)
```

---

## QUICK REFERENCE CHEAT SHEET

```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f hermes

# Access shell
docker-compose exec hermes sh

# Stop
docker-compose down

# Clean everything
docker-compose down -v
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache --pull
```

---

## GLOSSARY

- **Image**: Blueprint for containers
- **Container**: Running instance of an image
- **Layer**: Cacheable step in Docker build
- **Volume**: Persistent data storage
- **Bind mount**: Map host directory to container directory
- **Environment variable**: Configuration passed to container
- **Entrypoint**: Default process to run in container
- **Virtual environment**: Isolated Python installation
- **Daemon**: Background service (Docker daemon runs containers)
- **Network namespace**: Isolated networking for containers

---

## FURTHER LEARNING

To deepen your understanding:
1. Run `docker inspect hermes-agent` and explore the JSON output
2. Build a simple Dockerfile yourself
3. Use `docker diff container_name` to see what changed
4. Try `docker commit container_name my-image` to save container state
5. Read Docker documentation on multi-stage builds (advanced)

==================---------------============------------
[!DockerN_HarmesFlowImg](Images/docker_workflow_timeline.svg)

# Docker & Hermes: Quick Command Reference

## 🚀 GETTING STARTED

### Start Hermes Agent
```bash
# Start in background
docker-compose up -d

# Start and watch logs
docker-compose up

# Start with fresh build
docker-compose up --build -d
```

### Monitor Logs
```bash
# Watch logs in real-time
docker-compose logs -f

# Watch only hermes service
docker-compose logs -f hermes

# Show last 50 lines and follow
docker-compose logs -f --tail 50

# Show with timestamps
docker-compose logs -f --timestamps

# Save logs to file
docker-compose logs > logs.txt 2>&1
```

---

## 🐛 DEBUGGING & TROUBLESHOOTING

### Access Container Shell
```bash
# Open interactive shell
docker-compose exec hermes sh

# Run single command
docker-compose exec hermes python --version
docker-compose exec hermes hermes --version
docker-compose exec hermes pip list
```

### Check Status
```bash
# Is container running?
docker ps

# All containers (running + stopped)
docker ps -a

# Container status
docker-compose ps

# Detailed container info
docker inspect hermes-agent

# Check exit code (0 = success, non-0 = error)
docker inspect hermes-agent | grep ExitCode
```

### Verify Setup
```bash
# Check if Telegram bot token is set
docker-compose exec hermes env | grep TELEGRAM_BOT_TOKEN

# Check all environment variables
docker-compose exec hermes env

# Verify Python packages
docker-compose exec hermes pip list | grep hermes

# Test Python imports
docker-compose exec hermes python -c "import hermes; print('OK')"

# Check network access
docker-compose exec hermes ping google.com
docker-compose exec hermes ping host.docker.internal
```

### View Data
```bash
# List what's in the persisted data directory
ls -la ./hermes_data/

# View specific file
cat ./hermes_data/some_file.json

# From inside container
docker-compose exec hermes ls -la /root/.hermes/

# Copy file out of container
docker cp hermes-agent:/root/.hermes/config.json ./config.json

# Copy file into container
docker cp ./config.json hermes-agent:/root/.hermes/config.json
```

---

## 🛑 STOPPING & CLEANING UP

### Stop Container
```bash
# Graceful stop (10 second timeout)
docker-compose stop

# Stop specific service
docker-compose stop hermes

# Force stop immediately
docker-compose kill

# Stop and remove containers
docker-compose down

# Stop, remove containers, and delete volumes
docker-compose down -v
```

### Clean Up Docker
```bash
# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune

# Remove all unused volumes
docker volume prune

# Remove all unused networks
docker network prune

# NUCLEAR OPTION: Remove everything
docker system prune -a --volumes
```

---

## 🔨 BUILDING & UPDATING

### Build Image
```bash
# Build using docker-compose
docker-compose build

# Rebuild without cache (ignores previous layers)
docker-compose build --no-cache

# Rebuild and start
docker-compose up --build -d

# Rebuild from scratch (pull latest base image)
docker-compose build --no-cache --pull
```

### Check Images
```bash
# List images
docker images

# Show image details (size, created date)
docker images --no-trunc

# Search for hermes image
docker images | grep hermes

# Show image layers/history
docker history hermes:latest
```

---

## 📊 MONITORING & STATS

### Resource Usage
```bash
# Monitor CPU, memory, network
docker stats

# Monitor specific container
docker stats hermes-agent

# Monitor with updates every 2 seconds
docker stats --no-stream

# Monitor and save to file
docker stats --no-stream hermes-agent > stats.txt
```

### Disk Usage
```bash
# Show Docker disk usage breakdown
docker system df

# Detailed breakdown
docker system df -v
```

### Network
```bash
# View network bridges
docker network ls

# Inspect hermes network
docker network inspect hermes_default

# View port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## 🔄 RESTART & RELOAD

### Restart Service
```bash
# Graceful restart
docker-compose restart hermes

# Stop and start fresh
docker-compose stop hermes && docker-compose start hermes

# Restart with rebuild
docker-compose down && docker-compose up --build -d
```

### Reload Configuration
```bash
# Update .env file and reload
nano .env
docker-compose up -d  # will detect .env changes

# Full reload with new image
docker-compose build --no-cache
docker-compose up -d
```

---

## 🔍 ADVANCED TROUBLESHOOTING

### Why Won't It Start?
```bash
# Step 1: Check logs
docker-compose logs hermes

# Step 2: Check if port is in use
lsof -i :8000  # if hermes uses port 8000

# Step 3: Check image exists
docker images | grep hermes

# Step 4: Check disk space
df -h

# Step 5: Validate compose file
docker-compose config

# Step 6: Try rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Why Are Logs Not Showing?
```bash
# Check if PYTHONUNBUFFERED is set
docker-compose exec hermes env | grep PYTHONUNBUFFERED

# Check if app is actually running
docker-compose exec hermes ps aux

# Check stdout/stderr redirect
docker-compose logs --tail 100

# Try attaching to logs
docker logs -f hermes-agent
```

### Data Persistence Issues
```bash
# Verify volume mount
docker inspect hermes-agent | grep -A 10 Mounts

# Check if ./hermes_data exists on host
ls -la ./hermes_data/

# Check permissions
stat ./hermes_data/

# Backup before troubleshooting
cp -r ./hermes_data ./hermes_data.backup

# Force recreate container
docker-compose down
docker-compose up -d
```

---

## 📝 COMMON WORKFLOWS

### Workflow: First Time Setup

```bash
# 1. Clone or navigate to project directory
cd ~/hermes-agent

# 2. Create .env file with secrets
cat > .env << 'EOF'
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklmnoPQRstuvWXYZ
TELEGRAM_ALLOWED_USERS=987654,123456
GOOGLE_API_KEY=AIzaSyD...
EOF

# 3. Build and start
docker-compose up --build -d

# 4. Wait 10 seconds for startup
sleep 10

# 5. Check logs
docker-compose logs -f

# 6. Verify running
docker ps
```

### Workflow: Debug Connection Issues

```bash
# 1. Access container
docker-compose exec hermes sh

# 2. Inside container, test connectivity
ping google.com           # external network
ping host.docker.internal # your machine
curl https://api.telegram.org  # Telegram API

# 3. Check if token is set
echo $TELEGRAM_BOT_TOKEN

# 4. Check if Python modules loaded
python -c "from hermes import *; print('OK')"

# 5. Exit and check compose file
exit
docker-compose config
```

### Workflow: Update Requirements

```bash
# 1. Edit Dockerfile (add new package)
# Example: add new Python library to requirements

# 2. Rebuild
docker-compose build --no-cache hermes

# 3. Recreate container
docker-compose down
docker-compose up -d

# 4. Verify new package
docker-compose exec hermes pip list | grep package_name

# 5. Check logs for any errors
docker-compose logs -f
```

### Workflow: Backup & Restore

```bash
# Backup persistent data
cp -r ./hermes_data ./hermes_data.backup.$(date +%Y%m%d_%H%M%S)

# Stop everything
docker-compose down

# Restore (if needed)
rm -rf ./hermes_data
cp -r ./hermes_data.backup.20240101_120000 ./hermes_data

# Restart
docker-compose up -d
```

### Workflow: Clean Slate

```bash
# Stop everything
docker-compose down -v

# Remove images
docker-compose build --no-cache

# Delete all local data
rm -rf ./hermes_data

# Start fresh
docker-compose up -d

# Verify
docker-compose logs -f
```

---

## 🎯 SPECIFIC HERMES COMMANDS

### Inside Container (after `docker-compose exec hermes sh`)

```bash
# Basic
hermes --version
hermes --help

# Gateway commands
hermes gateway --help
hermes gateway run
hermes gateway run --verbose

# Agent commands
hermes agent --help
hermes agent list

# Config
hermes config show
hermes config set key value
```

---

## 📋 QUICK REFERENCE TABLE

| Goal | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose stop` |
| Logs | `docker-compose logs -f` |
| Shell | `docker-compose exec hermes sh` |
| Rebuild | `docker-compose build --no-cache` |
| Status | `docker-compose ps` |
| Info | `docker inspect hermes-agent` |
| Clean | `docker-compose down -v` |
| List containers | `docker ps -a` |
| List images | `docker images` |

---

## 🚨 EMERGENCY COMMANDS

```bash
# Something is broken, start over
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
docker-compose up -d

# Check what's actually running
ps aux | grep docker
ps aux | grep hermes

# Force kill container (last resort)
docker kill hermes-agent
docker rm hermes-agent

# Free up disk space
docker system prune -a --volumes
```

---

## 📚 UNDERSTANDING YOUR FILES

### Your directory structure
```
.
├── Dockerfile           # How to build the image
├── docker-compose.yml   # How to run the container
├── .env                 # Secrets (create this!)
├── .gitignore           # Git ignore patterns
└── hermes_data/         # Persistent data (auto-created)
    ├── cache/
    ├── logs/
    └── config.json
```

### Key files explained

**Dockerfile**: Recipe for creating the image
- When you run `docker-compose up`, it reads this
- Defines what's installed, how the app starts

**.env file** (you create this): 
```
TELEGRAM_BOT_TOKEN=your_real_token
TELEGRAM_ALLOWED_USERS=123456
GOOGLE_API_KEY=your_api_key
```
- Keep this **secret** (add to .gitignore)
- Docker-compose reads and passes to container

**docker-compose.yml**: Configuration for running
- Specifies image, volumes, environment, ports
- Easy way to manage multiple containers

**hermes_data/**: Your persistent data
- Survives container restarts
- Synced with `/root/.hermes` inside container
- Don't delete unless you want to lose data

---

## 🎓 LEARNING RESOURCES

```bash
# Explore what's in your image
docker inspect hermes-agent | python -m json.tool | less

# See all your Docker resources
docker system df

# Check Docker logs
docker-compose logs --tail 200 hermes

# Learn about volumes
docker volume inspect hermes_hermes_agent_data

# See what changed in container
docker diff hermes-agent
```
