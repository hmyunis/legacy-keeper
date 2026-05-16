# LegacyKeeper — The Family Memory Museum 🏛️🕰️

LegacyKeeper is a majestic, self-hosted 3D family archive. It moves beyond standard file grids by treating your memories as a curated museum exhibition. Built with a powerful AI pipeline, it automatically restores old photos, generates biographical chronicles, clusters faces, and allows semantic "vibe" searching.

![Tech Stack](https://img.shields.io/badge/Stack-React_Three_Fiber_|_Django_|_Celery_|_PostgreSQL_pgvector-gold?style=for-the-badge)

## 🌟 Features
- **3D Museum Hall & Vault:** Immersive WebGL galleries powered by React Three Fiber.
- **AI Restoration & Curation:** Automatically colorize, denoise, and caption old artifacts using local AI.
- **Story Weaver:** Generates rich biographies based on tagged photos and EXIF data.
- **Living Lineage:** Interactive federated family trees.
- **Vibe Search:** Semantic search using CLIP embeddings (e.g., *"Sunday morning coffee in the 90s"*).
- **Time Capsules:** Cryptographically sealed memories that unlock on a future date.

---

## 🚀 Installation Guide

You can run LegacyKeeper in two ways. **Method 1 (Docker)** is highly recommended for a smooth, isolated setup. **Method 2 (WSL Ubuntu)** is provided for developers who want to run the stack natively from scratch.

### Prerequisites (For Both Methods)
1. **Git** installed on your machine.
2. [Ollama](https://ollama.com/) installed locally to run the AI LLM (Llama 3.1:8b).
   - Run: `ollama run llama3.1:8b` in your terminal to download and start the model.

---

### Method 1: The Docker Way (Recommended) 🐳

This method spins up the Backend, Frontend, PostgreSQL, Redis, and MinIO automatically.

**Pre-requisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

**Steps:**
1. **Clone the repository:**
   ```bash
   git clone https://github.com/hmyunis/legacy-keeper.git
   cd legacy-keeper
   ```

2. **Configure Environment Variables:**
   ```bash
   # Copy the docker env template
   cp backend/.env.docker backend/.env
   ```
   *(Optional)* Add your `HF_TOKEN` (Hugging Face) to `backend/.env` to speed up the download of the CLIP and Face Recognition AI models.

3. **Build and Run:**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the Application:**
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173) (or `http://localhost` via Nginx depending on port mappings).
   - **MinIO Storage Console:** [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)

---

### Method 2: Manual Setup via WSL Ubuntu (From Scratch) 🐧

If you are on a brand new Windows PC and want to run everything natively inside WSL 2 without Docker containers, follow these steps meticulously.

**Pre-requisites:**
- Install WSL 2: Open PowerShell as Administrator and run `wsl --install`.
- Restart your PC and open the **Ubuntu** terminal.

#### 1. System Dependencies & C++ Build Tools
The backend requires `dlib` (for face recognition) and `pgvector`, which need C++ compilers.
```bash
sudo apt update && sudo apt upgrade -y

# Install Build Tools & Media Libraries
sudo apt install build-essential cmake pkg-config libx11-dev libopenblas-dev liblapack-dev libgtk-3-dev libboost-python-dev ffmpeg libmagic1 -y

# Install Python & Node.js pre-requisites
sudo apt install python3.12 python3.12-venv python3-pip curl software-properties-common -y
```

#### 2. Install Databases (PostgreSQL, pgvector, Redis)
```bash
# Install Postgres and Redis
sudo apt install postgresql postgresql-contrib redis-server postgresql-server-dev-all -y

# Start Redis
sudo service redis-server start

# Install pgvector (Build from source)
cd /tmp
git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
cd ~

# Configure PostgreSQL Database
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER legacy_user WITH PASSWORD 'legacy_pass';"
sudo -u postgres psql -c "CREATE DATABASE legacy_db OWNER legacy_user;"
sudo -u postgres psql -d legacy_db -c "CREATE EXTENSION vector;"
```

#### 3. Backend Setup (Django + Celery)
```bash
cd /path/to/legacy-keeper/backend

# Setup Python Environment
pip install pipenv
pipenv install
pipenv shell

# Environment Variables
cp .env.example .env
# Edit .env to ensure DATABASE_URL=postgres://legacy_user:legacy_pass@localhost:5432/legacy_db

# Run Migrations
python manage.py migrate

# Start Celery Worker (In a separate terminal tab)
pipenv shell
celery -A legacy_keeper worker -l INFO -Q high_priority,default,low_priority

# Start Celery Beat for Scheduled Tasks (In a separate terminal tab)
pipenv shell
celery -A legacy_keeper beat -l INFO

# Start Django Server (In a separate terminal tab)
pipenv shell
python manage.py runserver
```

#### 4. Frontend Setup (React + Vite)
```bash
# Install Node.js (Latest LTS via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

cd /path/to/legacy-keeper/frontend

# Install dependencies
npm install

# Setup Environment
cp .env.example .env

# Start Dev Server
npm run dev
```

**Access the application** by navigating to `http://localhost:5173` in your Windows browser.

---

## 🧠 AI Pipeline Architecture
1. **Face Recognition:** Uses `dlib` to extract 128D facial embeddings. Clusters are formed across the family tree.
2. **Semantic Search:** Uses `sentence-transformers/clip-ViT-B-32` to convert images into 512D vectors, stored in `pgvector` for instant "vibe" lookups via Cosine Distance.
3. **Story Weaver & Captioning:** Leverages a locally running `Ollama` (Llama 3) instance to write captions based on parsed EXIF data, detected faces, and semantic tags.

## 🛡️ Governance & Privacy
LegacyKeeper implements a strict Role-Based Access Control (RBAC) per vault (Admin, Contributor, Viewer). Data remains entirely on your machine/server. Time capsules are mathematically locked until their expiry dates are validated via Celery Beat periodic checks.