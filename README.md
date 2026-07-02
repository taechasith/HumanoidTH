# 🤖 Thailand Humanoid Atlas 🗺️

<p align="center">
  <img src="./docs/assets/banner-animated.svg" alt="Thailand Humanoid Atlas Banner" width="800">
</p>

<p align="center">
  <a href="https://github.com/taechasith/HumanoidTH/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white&color=F59E0B" alt="License" />
  </a>
  <a href="https://github.com/taechasith/HumanoidTH/pulls">
    <img src="https://img.shields.io/badge/PRs-welcome-emerald.svg?style=for-the-badge&logo=git&logoColor=white&color=10B981" alt="PRs Welcome" />
  </a>
  <a href="#-setup--installation">
    <img src="https://img.shields.io/badge/Stack-Next.js%20%7C%20Prisma%20%7C%20Postgres-emerald?style=for-the-badge&logo=nextdotjs&logoColor=white&color=064E3B" alt="Stack" />
  </a>
  <a href="https://github.com/taechasith/HumanoidTH/issues">
    <img src="https://img.shields.io/badge/Status-Active-yellow?style=for-the-badge&logo=statuspage&logoColor=white&color=EAB308" alt="Status" />
  </a>
</p>

---

## 💚 From Our Hearts to the Open Source Community 🌱

**Thailand Humanoid Atlas** is a labor of love, built by developers who believe that the future of humanoid and social robotics belongs to the community. We designed this research database platform to help map, understand, and accelerate Thailand’s robotics ecosystem. 

Whether it is cataloging companion robots caring for our grandparents, mapping academic publications by local researchers, or open-sourcing data structures, we want to create a transparent, reliable, and collaborative atlas for all.

We open-source this project from the heart, and we invite you to hack, contribute, and build the future of embodied AI in Thailand together! 🤝🚀

---

## 🗺️ The Four Core Ecosystem Layers

The platform collects, normalizes, classifies, and visualizes four connected layers of the robotics landscape:

| Layer | Focus | Key Indicators & Features |
| :--- | :--- | :--- |
| 🟢 **1. Perspectives** | **Public & Media Voice** | Stance analysis, sentiment, healthcare trust, job displacement, ethics |
| 🟡 **2. Contributions**| **Hacker & Researcher Directory** | Projects, papers, GitHub repositories, hardware builds, community events |
| 🟢 **3. Model Registry**| **Robot Catalog** | Manufacturer specs, country of origin, Thailand deployment status |
| 🟡 **4. Inventory** | **Physical Assets** | Maintenance logs, custody tracking, condition, and availability |

---

## ⚡ Tech Stack & Architecture

We built this platform using a modern, scalable, and developer-friendly stack:

- **Frontend & Routing:** [Next.js 15 (App Router)](https://nextjs.org/) for highly responsive Server Components and dynamic layouts.
- **Database & Modeling:** [Prisma ORM](https://www.prisma.io/) with [PostgreSQL](https://www.postgresql.org/) for transparent, typed data structures.
- **Data Ingestion Adapters:** Multi-source background adapters retrieving records from **OpenAlex**, **GitHub**, **GDELT**, and **YouTube**.
- **Interactive Visualization:** [Cytoscape.js](https://js.cytoscape.org/) for rendered interactive ecosystem network graphs.

---

## 🚀 Setup & Installation

Follow these simple steps to spin up the Thailand Humanoid Atlas on your local machine:

### 1. Clone the repository and install dependencies
```bash
# Clone the repository
git clone https://github.com/taechasith/HumanoidTH.git
cd HumanoidTH

# Install dependencies using pnpm
pnpm install
```

### 2. Configure Environment Variables
Create a local `.env` file by copying the template:
```bash
cp .env.example .env
```

Ensure your `.env` contains the required database link and API keys:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thailand_humanoid_atlas?schema=public"
YOUTUBE_API_KEY="your-youtube-api-key"
GITHUB_TOKEN="your-github-personal-access-token"
```
> [!NOTE]
> `YOUTUBE_API_KEY` is required only for video ingestion. `GITHUB_TOKEN` is optional but highly recommended to avoid API rate limiting.

### 3. Initialize & Seed the Database
```bash
# Generate Prisma client files
pnpm db:generate

# Push the schema to your local PostgreSQL
pnpm db:push

# Run seed script to populate sample robots, perspectives, and contributions
pnpm db:seed
```

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) inside your browser to see the atlas alive! 🟢✨

---

## 🔌 API Ingestion & Data Pulls

The platform features built-in ingestion adapters. You can use the UI dashboard at `/data-pulls` or trigger the background ingest API endpoints directly using `curl`:

#### 🌾 Ingest Academic papers from OpenAlex
```bash
curl -X POST http://localhost:3000/api/ingest/openalex \
  -H "content-type: application/json" \
  -d '{"query":"humanoid robot Thailand","limit":10}'
```

#### 💻 Ingest Repositories from GitHub
```bash
curl -X POST http://localhost:3000/api/ingest/github \
  -H "content-type: application/json" \
  -d '{"query":"robotics thailand","limit":10}'
```

---

## 🌐 Product Routes Map

Explore the main app modules:
- `🟢 /` — Interactive overview of the corpus, stats, and active tasks.
- `🟡 /robots` — Registry of robot models deployed or researched in Thailand.
- `🟢 /perspectives` — Media coverage database, platform sentiment, and safety metrics.
- `🟡 /contributions` — Directory of open-source repositories, makers, and papers.
- `🟢 /network` — Dynamic Cytoscape network graph mapping connections between institutions, developers, and robots.
- `🟡 /analytics` — Statistics, sentiment graphs, and attention metrics over time.
- `🟢 /data-pulls` — Control room to trigger data ingestion pipelines.
- `🟡 /submit-data` — Community submission form for sharing robot models and projects.

---

## ☁️ Vercel Deployment

This project is fully optimized for **Vercel** out-of-the-box using the provided `vercel.json` configuration.

### Vercel Environment Variables
Set these variables in your Vercel project settings:
```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
ADMIN_BASIC_USER="creativelab.co.th@gmail.com"
ADMIN_BASIC_PASSWORD="use-a-strong-password"
YOUTUBE_API_KEY="your-api-key"
GITHUB_TOKEN="your-token"
```

> [!IMPORTANT]
> - Production endpoints `/admin/*`, `/data-pulls`, and `/api/ingest/*` are protected with Basic Auth using `ADMIN_BASIC_USER` and `ADMIN_BASIC_PASSWORD`. Keep credentials safe!
> - The Vercel build command is configured to run `pnpm vercel-build` which automatically handles schema generation. Do **not** run `db:push` inside the Vercel build phase.

---

## 🛠️ Database Utility Commands

Prisma commands are mapped to convenient `pnpm` scripts:
* **Generate Client:** `pnpm db:generate`
* **Schema Sync:** `pnpm db:push`
* **Database Seeding:** `pnpm db:seed`

---

## 🤝 Join the Robotics Movement!

We believe that building a database for the Thailand robotics community should be a collective effort. Here is how you can help:
1. **Add Robot Models:** Spatially document models, prototypes, or service robots you've encountered or built in Thailand.
2. **Develop Adapters:** Help build connectors for localized Thai news portals, government research sites, or forums.
3. **Refine Stance Models:** Help improve sentiment/stance classification rules so we better map public trust.
4. **Fix Bugs & Improve UX:** Feel free to open issues or file PRs!

We look forward to seeing your pull requests! Keep building, keep sharing! 🤖💛💚

---

### 📝 Notes on Legacy Codebase
The original Python/FastAPI MVP remains in the `src/` directory for historical reference and potential background worker tasks, but the main Next.js web application is the active surface of the atlas project.

---

<p align="center">
  Made with 💚, 💛, and a lot of ☕ by developers in Thailand.
</p>

