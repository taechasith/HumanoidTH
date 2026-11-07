# แผนผังไฟล์โครงการ Thailand Humanoid Atlas

ตรวจสอบไฟล์ที่ติดตามโดย Git แล้วทั้งหมด 155 ไฟล์ ณ วันที่จัดทำเอกสารนี้

## โครงการนี้ทำอะไร

**Thailand Humanoid Atlas** คือแพลตฟอร์มวิจัยแบบสองภาษา (ไทย/อังกฤษ) สำหรับรวบรวม วิเคราะห์ และเผยแพร่ข้อมูลระบบนิเวศหุ่นยนต์ humanoid, social และ service robot ในประเทศไทย โดยครอบคลุม 4 มิติหลัก:

1. **ทะเบียนหุ่นยนต์** — รุ่น ผู้พัฒนา ประเทศต้นทาง สถานะในประเทศไทย และแหล่งอ้างอิง
2. **ผลงานและการมีส่วนร่วม** — งานวิจัย โค้ด GitHub ชุดข้อมูล โครงการ และกิจกรรม
3. **มุมมองสาธารณะ/สื่อ** — วิเคราะห์ stance, sentiment และประเด็น เช่น สุขภาพ ความเป็นส่วนตัว และผลกระทบต่องาน
4. **ครุภัณฑ์จริง** — การครอบครอง ผู้ดูแล สภาพ และตำแหน่งของหุ่นยนต์ โดยข้อมูลสำคัญเป็นส่วนตัวโดยปริยาย

ระบบหลักปัจจุบันคือ **Next.js 15 + Prisma + PostgreSQL** มีตัวดึงข้อมูลจาก OpenAlex, GitHub, GDELT และ YouTube พร้อมแผนที่ กราฟความสัมพันธ์ แดชบอร์ด และหน้าผู้ดูแลระบบ นอกจากนี้ยังเก็บโค้ดรุ่นเก่า **Python/FastAPI + SQLite** ไว้ใน `src/`

## ข้อสังเกตสำคัญ

- ชุดข้อมูล seed หลักมี 6,749 รายการ: แหล่งข้อมูล 6,714 รายการ, รุ่นหุ่นยนต์ 16, ความสัมพันธ์ 10, การวิเคราะห์มุมมอง 4, ผลงาน 3, งานดึงข้อมูล 1 และรายการส่งข้อมูล 1
- `thailand_humanoid_atlas_seed_records.json` และ `data/imports/thailand_humanoid_atlas_seed_records.json` เหมือนกันทุกไบต์
- `humanoidth.logo.png` เหมือน `public/logo.png`; `teal_v.2.glb` เหมือน `public/teal_v.2.glb`
- โค้ด Python รุ่นเก่าไม่ถูกรวมในการ type-check TypeScript และใช้ฐานข้อมูล SQLite แยกจากแอปหลัก
- `overviewpageuiref.png` เป็นภาพอ้างอิงการออกแบบ ไม่ใช่หน้าจอที่รันจริง

## ไฟล์รากและการตั้งค่า

- `.env.example` — ตัวอย่างตัวแปรสภาพแวดล้อม: PostgreSQL/Prisma, Google Maps, ingestion, network graph และ Basic Auth ผู้ดูแล
- `.gitignore` — ระบุไฟล์ที่ไม่ควรติดตาม เช่น dependencies, secret, build output, cache, ฐานข้อมูล local และ Prisma client ที่สร้างอัตโนมัติ
- `LICENSE` — ใบอนุญาต MIT
- `README.md` — คำอธิบายสาธารณะ วิธีติดตั้ง สถาปัตยกรรม routes และระเบียบวิธีวิจัย
- `thailand-humanoid-atlas-project.md` — เอกสารกำหนดผลิตภัณฑ์/วิศวกรรมฉบับละเอียด: ขอบเขต taxonomy pipeline อัลกอริทึม แผน MVP และ UI brief
- `package.json` — metadata, dependencies และคำสั่ง pnpm สำหรับพัฒนา build ฐานข้อมูล ingestion ทดสอบ และ SEO
- `pnpm-lock.yaml` — เวอร์ชัน dependencies ที่ล็อกไว้แน่นอน
- `next.config.ts` — การตั้งค่า Next.js และ output tracing root
- `next-env.d.ts` — declaration ที่ Next.js สร้างให้ TypeScript
- `tsconfig.json` — การตั้งค่า TypeScript แบบ strict และตัด `src/` รุ่นเก่าออก
- `middleware.ts` — ป้องกัน `/admin`, `/data-pulls`, `/api/ingest/*` และ `/api/export` ด้วย Basic Auth ใน production
- `playwright.config.ts` — การตั้งค่า Playwright/Chromium และ web server สำหรับทดสอบ
- `prisma.config.ts` — การตั้งค่า Prisma CLI, datasource, migrations และ seed
- `pyproject.toml` — metadata และ dependencies ของโค้ด Python รุ่นเก่า
- `vercel.json` — คำสั่ง build/deploy บน Vercel และ region Singapore
- `seo-report.md` — รายงาน SEO ที่สร้างไว้; คะแนน 82/100 และพบประเด็นหน้าผู้ดูแล 4 รายการ
- `seo-report.json` — รายงาน SEO รูปแบบ JSON
- `overviewpageuiref.png` — ภาพ mockup ของหน้า dashboard
- `humanoidth.logo.png` — สำเนาโลโก้ที่รากโครงการ (เหมือน public asset)
- `teal_v.2.glb` — สำเนาโมเดลหุ่นยนต์ 3D ที่รากโครงการ (เหมือน public asset)
- `thailand_humanoid_atlas_seed_records.json` — ชุดข้อมูล seed หลักสำหรับ Prisma และตัวเฝ้าดูข้อมูล

## แอป Next.js (`app/`)

- `app/layout.tsx` — เปลือก HTML หลัก ฟอนต์ SEO navigation การเลือกภาษา loader และปุ่ม ingestion ลอย
- `app/globals.css` — design system แบบ responsive: เมนู card form table modal motion และ mobile UI
- `app/page.tsx` — route `/`; หน้าภาพรวม corpus, สถานะ pipeline, ลิงก์ดำเนินการ และหุ่นยนต์ 3D
- `app/actions.ts` — server actions สำหรับ session ผู้ใช้ ภาษา การส่งข้อมูล การดึงข้อมูล และ CMS ของผู้ดูแล
- `app/loading.tsx` — หน้าจอระหว่างโหลด route
- `app/error.tsx` — หน้าจัดการข้อผิดพลาดระดับ route ที่ลองใหม่ได้
- `app/global-error.tsx` — หน้าจัดการข้อผิดพลาดระดับ root
- `app/not-found.tsx` — หน้า 404
- `app/sitemap.ts` — route สร้าง sitemap
- `app/robots.ts` — route สร้าง `robots.txt`

### หน้าข้อมูลสาธารณะ

- `app/dashboard/page.tsx` — `/dashboard`; dashboard สถิติระบบนิเวศจากฐานข้อมูล
- `app/robots/page.tsx` — `/robots`; ทะเบียนรุ่นหุ่นยนต์ พร้อมอ่านข้อมูลภาพ/วิดีโอจาก source metadata
- `app/perspectives/page.tsx` — `/perspectives`; รายการมุมมองสาธารณะและสื่อที่ผ่านการ annotate
- `app/contributions/page.tsx` — `/contributions`; ค้นหาผลงานวิจัย repository และโครงการ
- `app/inventory/page.tsx` — `/inventory`; รายการครุภัณฑ์ที่คำนึงถึงระดับการเผยแพร่ข้อมูล
- `app/database/page.tsx` — `/database`; หน้าค้นหาและดูข้อมูลดิบจากหลายตาราง
- `app/profile/page.tsx` — `/profile`; สมัคร/เข้าสู่ระบบ/ออกจากระบบแบบเบา
- `app/submit-data/page.tsx` — `/submit-data`; แบบฟอร์มส่ง source, correction, sighting และ contribution จากชุมชน
- `app/data-pulls/page.tsx` — `/data-pulls`; ควบคุมและดูสถานะงาน ingestion

### แผนที่ กราฟ และ analytics

- `app/map/page.tsx` — `/map`; โหลด cluster ของผลงานและแสดงแผนที่
- `app/map/actions.ts` — สร้าง contribution clusters จากข้อมูล พร้อมตัวเลือก Gemini และ fallback แบบอนุรักษ์นิยม
- `app/map/GoogleMapClient.tsx` — โหลด Google Maps ฝั่ง client, markers, bounds และป้ายสองภาษา
- `app/network/page.tsx` — `/network`; server wrapper ของหน้ากราฟความสัมพันธ์
- `app/network/NetworkGraphClient.tsx` — Cytoscape UI: filter, search, focus mode, layout, รายละเอียด node/edge และ reduced motion
- `app/network/cytoscapeStyles.ts` — รูปแบบ node, edge, label, arrow และ cluster ใน Cytoscape
- `app/network/NetworkGraphClient.module.css` — layout/toolbar/filter/canvas/detail panel ของหน้ากราฟ
- `app/analytics/page.tsx` — `/analytics`; รวม events และจำนวนข้อมูลจากฐานข้อมูล
- `app/analytics/AnalyticsPlayground.tsx` — กราฟ Recharts แบบโต้ตอบ การเลือกขอบเขต ช่วงเวลา หมวดหมู่ และ scatter analysis
- `app/analytics/AnalyticsBpmn.tsx` — สร้างภาพ BPMN-style ของ data/research pipeline

### ผู้ดูแลระบบและการยืนยันตัวตน

- `app/admin-login/page.tsx` — `/admin-login`; หน้าเข้าสู่ระบบผู้ดูแลแบบสองภาษา
- `app/admin-login/AdminLoginForm.tsx` — ฟอร์มรหัสผ่าน พร้อมปุ่มแสดง/ซ่อนรหัสผ่าน
- `app/admin/page.tsx` — `/admin`; route wrapper ของ admin console
- `app/admin/AdminConsolePage.tsx` — คิวตรวจสอบและ CMS สำหรับ source, robot, contribution และ submission
- `app/admin/cms/page.tsx` — redirect ไปยังมุม CMS ที่เหมาะสมใน admin console
- `app/admin/submitted-data/page.tsx` — redirect ไปยังมุมตรวจสอบ submissions ใน admin console

### API routes

- `app/api/export/route.ts` — endpoint ส่งออกข้อมูลฐานข้อมูลแบบป้องกัน
- `app/api/ingest/[adapter]/route.ts` — POST endpoint สำหรับเรียก ingestion adapter ตามชื่อ
- `app/api/network/graph/route.ts` — ส่ง nodes, edges, clusters และ metadata ของ graph
- `app/api/network/node/[node_id]/route.ts` — ส่งรายละเอียด node ที่เลือก
- `app/api/network/edge/[edge_id]/route.ts` — ส่งรายละเอียด edge ที่เลือก

### UI components

- `app/components/SidebarNav.tsx` — เมนู desktop และสถานะ route ปัจจุบัน
- `app/components/MobileHeader.tsx` — header สำหรับมือถือ
- `app/components/MobileTabNav.tsx` — เมนูด้านล่างสำหรับมือถือ
- `app/components/LanguageSelector.tsx` — เลือกภาษาไทย/อังกฤษผ่าน cookie
- `app/components/DataPullFab.tsx` — ปุ่มลอยและ modal สำหรับเริ่ม ingestion
- `app/components/FirstTimeLoader.tsx` — animation ตอนเข้าเว็บครั้งแรก
- `app/components/CopyCommands.tsx` — ปุ่ม copy คำสั่งไป clipboard
- `app/components/RobotViewer.tsx` — Three.js scene สำหรับโหลดและขยับโมเดล GLB
- `components/loading-ui/ring.tsx` — SVG loading spinner แบบวงแหวน
- `components/loading-ui/dots-ring.tsx` — SVG loading spinner แบบจุด
- `pages/_document.tsx` — document wrapper ของ Next.js สำหรับโครง HTML พื้นฐาน

## ฐานข้อมูล ข้อมูล และ library (`prisma/`, `data/`, `lib/`)

- `prisma/schema.prisma` — Prisma/PostgreSQL schema: users, sources, robots, entities, contributions, annotations, triplets, inventory, submissions, pipeline runs และ pull jobs
- `prisma/migrations/20260703081551_init/migration.sql` — migration เริ่มต้นที่สร้าง schema
- `prisma/migrations/migration_lock.toml` — lock ระบุ provider ของ migrations
- `prisma/seed.ts` — entrypoint สำหรับ seed ด้วย Prisma
- `data/imports/thailand_humanoid_atlas_seed_records.json` — ชุดข้อมูล fallback ของ relationship graph; ปัจจุบันเหมือน root seed
- `data/taxonomy.yml` — taxonomy กลางของ robot, embodiment, perspective, stance, sentiment, contribution, status และ source
- `data/seeds/organizations.seed.yml` — seed รายชื่อองค์กร
- `data/seeds/robot_models.seed.yml` — seed รุ่นหุ่นยนต์และ contributions; หลายรายการยังต้องตรวจสอบหลักฐาน
- `data/seeds/owned_inventory.seed.yml` — placeholder ของครุภัณฑ์ส่วนตัวและข้อกำหนด privacy
- `data/seeds/source_urls.seed.yml` — seed แหล่งอ้างอิงที่คัดเลือกไว้
- `lib/prisma.ts` — Prisma client แบบ singleton พร้อม PostgreSQL adapter
- `lib/seed-importer.ts` — อ่าน JSON seed และ upsert ข้อมูลเข้า Prisma แบบทำซ้ำได้อย่างปลอดภัย
- `lib/classifiers.ts` — classifier relevance/perspective แบบ keyword และ optional Gemini
- `lib/taxonomy.ts` — constants ของ taxonomy สำหรับ TypeScript/UI
- `lib/translations.ts` — dictionary ข้อความไทย/อังกฤษ
- `lib/url.ts` — ทำ URL ให้เป็น canonical และลบ tracking parameters
- `lib/geo.ts` — resolve hostname/IP อย่างปลอดภัย และเพิ่ม network-geolocation metadata
- `lib/map-points.ts` — แปลง source metadata เป็น map point
- `lib/network-graph.ts` — แกนสร้าง graph: โหลดจาก file/database/hybrid, merge entities, สร้าง edges/clusters และกรองผลลัพธ์
- `lib/seo.ts` — site URL, SEO defaults, route ที่ index ได้ และ no-index routes
- `lib/ingest/types.ts` — types สำหรับ normalized source และผล ingestion
- `lib/ingest/adapters.ts` — adapters สำหรับ OpenAlex, GitHub, GDELT และ YouTube
- `lib/ingest/save.ts` — บันทึก source, deduplicate URL, classify, annotate perspective และเพิ่ม geo metadata

## Static assets และเอกสาร

- `public/logo.png` — โลโก้ที่ browser เรียกใช้
- `public/teal_v.2.glb` — โมเดล humanoid 3D ที่ `RobotViewer` โหลด
- `public/llms.txt` — คำอธิบายโครงการและ public routes สำหรับ AI/search agents
- `docs/assets/banner-animated.svg` — banner SVG แบบเคลื่อนไหวสำหรับเอกสาร
- `docs/data-governance.md` — นโยบาย privacy, visibility ของ inventory, การ review และ takedown
- `docs/source-policy.md` — นโยบายแหล่งข้อมูล/API และการเก็บข้อมูล social media
- `docs/taxonomy.md` — แนวทางใช้ taxonomy แบบระมัดระวัง
- `docs/vercel-deploy.md` — วิธี deploy Vercel และ protected routes

## Scripts และ tests

- `scripts/dev.ts` — รัน Next development และ seed watcher พร้อมกัน
- `scripts/watch-seed.ts` — เฝ้าดู JSON seed ที่ราก แล้ว sync เข้า Prisma เมื่อเปลี่ยน
- `scripts/ingest.ts` — CLI สำหรับเรียก ingestion adapter เดี่ยว
- `scripts/verify-prisma.ts` — ตรวจสอบการเชื่อมต่อฐานข้อมูล Prisma
- `scripts/assert-no-mock-data.ts` — สแกน web source เพื่อหาสัญญาณ mock/simulated data ที่ห้ามใช้
- `scripts/seo-optimizer.ts` — audit SEO และอาจปรับ metadata/canonical ที่มีความเสี่ยงต่ำ
- `scripts/run_server.cmd` — launcher บน Windows ของ Python server รุ่นเก่า
- `test/classifiers.test.ts` — ทดสอบ TypeScript classifier
- `tests-node/network.spec.ts` — Playwright/API tests ของ graph, controls, mobile layout และ reduced motion
- `tests-node/smoke.spec.ts` — Playwright smoke test ของ routes ในสิทธิ์ admin
- `tests/conftest.py` — fixtures/config สำหรับ Python tests รุ่นเก่า
- `tests/test_pipeline.py` — ทดสอบ relevance, perspective และ graph pipeline รุ่นเก่า
- `tests/test_schema_and_ingest.py` — ทดสอบการสร้าง SQLite และการ ingest YAML ซ้ำได้
- `tests/test_web.py` — ทดสอบ FastAPI routes และการป้องกัน admin
- `tests/test_playwright_smoke.py` — Python Playwright smoke test บน desktop/mobile

## Python implementation รุ่นเก่า (`src/humanoid_atlas/`)

- `src/humanoid_atlas/__init__.py` — ประกาศ Python package
- `src/humanoid_atlas/__main__.py` — entrypoint `python -m humanoid_atlas`
- `src/humanoid_atlas/config.py` — Pydantic settings ของระบบเก่า
- `src/humanoid_atlas/models.py` — Pydantic models สำหรับ normalized source, annotation และ submission
- `src/humanoid_atlas/cli.py` — Typer CLI สำหรับ init database, ingestion, analysis, export และ FastAPI server

### Adapters รุ่นเก่า

- `src/humanoid_atlas/adapters/__init__.py` — package marker
- `src/humanoid_atlas/adapters/gdelt.py` — ดึงบทความ GDELT เข้า SQLite
- `src/humanoid_atlas/adapters/github.py` — ดึง GitHub repositories เป็น sources/contributions
- `src/humanoid_atlas/adapters/openalex.py` — ดึงงานวิชาการ OpenAlex เป็น sources/contributions
- `src/humanoid_atlas/adapters/rss.py` — อ่าน RSS/Atom เข้า sources
- `src/humanoid_atlas/adapters/youtube.py` — ดึง YouTube เมื่อมี API key
- `src/humanoid_atlas/adapters/manual_social.py` — เพิ่ม social-media reference ด้วยมืออย่างสอดคล้อง policy
- `src/humanoid_atlas/adapters/seed_yaml.py` — import YAML seed เข้า SQLite

### SQLite และ pipeline รุ่นเก่า

- `src/humanoid_atlas/db/session.py` — เปิด/configure SQLite connection
- `src/humanoid_atlas/db/schema.sql` — ตารางและ indexes ของ SQLite รุ่นเก่า
- `src/humanoid_atlas/db/migrate.py` — สร้าง SQLite schema
- `src/humanoid_atlas/db/repos.py` — repository helpers: upsert และ query SQLite
- `src/humanoid_atlas/pipeline/__init__.py` — package marker
- `src/humanoid_atlas/pipeline/relevance.py` — classifier relevance ของหุ่นยนต์ในไทยแบบ keyword
- `src/humanoid_atlas/pipeline/perception.py` — annotate stance, sentiment และ theme แบบ rule-based
- `src/humanoid_atlas/pipeline/nlp.py` — ดึง subject–relation–object แบบพื้นฐาน
- `src/humanoid_atlas/pipeline/graph_metrics.py` — สร้าง graph summary/cache ด้วย NetworkX
- `src/humanoid_atlas/pipeline/taxonomy_stats.py` — สร้าง statistics cache ตาม taxonomy

### FastAPI viewer รุ่นเก่า

- `src/humanoid_atlas/viewer/__init__.py` — package marker
- `src/humanoid_atlas/viewer/server.py` — FastAPI routes สำหรับ dashboard, records, inventory privacy modes, submission, CSV export และ admin review
- `src/humanoid_atlas/viewer/static/styles.css` — CSS ของ viewer รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/base.html` — layout/navigation ร่วมของ viewer รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/dashboard.html` — หน้า corpus summary รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/perspectives.html` — ตาราง perspectives รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/robots.html` — ทะเบียนหุ่นยนต์รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/inventory.html` — หน้าครุภัณฑ์แบบ public/operator รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/contributions.html` — ตาราง contributions รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/analytics.html` — หน้ากราฟ/สถิติรุ่นเก่า
- `src/humanoid_atlas/viewer/templates/database.html` — database browser/export รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/submit.html` — ฟอร์มส่งข้อมูลรุ่นเก่า
- `src/humanoid_atlas/viewer/templates/profile.html` — profile placeholder รุ่นเก่า
- `src/humanoid_atlas/viewer/templates/admin_submitted.html` — คิว review submissions พร้อม approve/reject/needs-info

## สรุปสถาปัตยกรรม

```text
External sources / community submissions
        ↓
Ingestion adapters → URL normalization → relevance/perspective classification
        ↓
Prisma + PostgreSQL
        ↓
Next.js routes: registry, contributions, perspectives, inventory,
map, relationship graph, analytics, admin CMS, export
```

โค้ดใน `app/`, `lib/`, `prisma/` และ `scripts/` คือระบบเว็บปัจจุบัน ส่วน `src/humanoid_atlas/` คือระบบ Python รุ่นเก่าที่ยังใช้เป็นเอกสารอ้างอิงหรือทางเลือกในการรันแบบ SQLite/FastAPI
