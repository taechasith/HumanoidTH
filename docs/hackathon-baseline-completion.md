# Baseline Completion - HumanoidTH

> ข้อความนี้จัดทำสำหรับนำไปวางในหัวข้อ **Baseline Completion** ของ HRI HACKATHON THAILAND 2026 โดยอ้างอิงเฉพาะสิ่งที่ทีมพัฒนาและทดสอบใน Fork นี้แล้ว ไม่รวม Theme Feature ใหม่

## Part C / D - Baseline Audit และ Gap ที่พบ

ทีมเริ่มจากการ Fork และรัน HumanoidTH เพื่อทบทวนเส้นทางหลัก ได้แก่ Overview, Dashboard, Robot Models, Map, Network และ Analytics พบว่าแกนหลักของระบบเปิดใช้งานได้ แต่หลายหน้ามีข้อมูลหนาแน่นและลำดับการใช้งานไม่ชัด ทำให้ผู้ใช้ใหม่ตีความข้อมูลระบบนิเวศหุ่นยนต์ได้ยาก โดยเฉพาะ Network Graph ที่มี node/edge ซ้ำและทับกัน, Data Map ที่ต้องพึ่งแผนที่จริงและ API key เพื่อดูพื้นที่, Robot Model ที่ยังเรียงเป็นรายการเดียว และ Confidence Lens ที่เป็น scatter plot ตามเวลาซึ่งไม่ตอบคำถามเรื่องคุณภาพข้อมูลได้ตรงจุด

Baseline Completion ของทีมจึงเน้นทำให้ flow สำรวจข้อมูลหลักอ่านง่ายและพร้อมสาธิต โดยไม่เปลี่ยน schema ฐานข้อมูล: ปรับ navigation ให้จัดกลุ่มหน้า, ทำให้ map ใช้งานได้แม้ไม่มี Google Maps API, ลดความซ้ำซ้อนและความหนาแน่นของ Network Graph, เพิ่มการจัดกลุ่ม Robot Model และเปลี่ยนการอ่าน confidence ให้เป็น Histogram ที่ตีความได้ทันที

## Part E.1 - สรุป Baseline Completion (5-8 บรรทัด)

ทีมทำให้ Fork ของ HumanoidTH พร้อมสาธิตการสำรวจข้อมูลหุ่นยนต์ตั้งแต่ภาพรวมไปจนถึงข้อมูลเชิงลึก โดยจัด navigation และหน้าภาพรวมใหม่ให้ผู้ใช้เริ่มต้นใช้งานได้ชัดเจนขึ้น
หน้า Map มี Data Map แบบจังหวัดไทยที่ไม่ต้องใช้ Google Maps API และสลับไปใช้ Live Map ได้เมื่อกำหนด key
หน้า Network ลด node/edge ที่รบกวนสายตา, รวม edge ซ้ำ และใช้สีอธิบายชนิดความสัมพันธ์แทนความหนาของเส้น
หน้า Robot Model เพิ่มการดูตามพื้นที่, รายการล่าสุด และความนิยมใน Atlas โดยคำนวณจาก deployment สาธารณะและ records ที่เชื่อมโยง
หน้า Analytics เปลี่ยน Confidence Lens จาก scatter plot เป็น Histogram พร้อมเกณฑ์ High / Medium / Needs review
ระบบผ่าน `pnpm typecheck` และรัน development server ที่ `http://127.0.0.1:3000` ได้ พร้อมใช้เส้นทางหลักสำหรับ Demo

## Part E.2 - Scope, Definition of Done และสถานะ

| งาน / ฟังก์ชัน | สิ่งที่แก้ใน Fork | Definition of Done / วิธีตรวจ | สถานะ |
|---|---|---|---|
| **Baseline Completion: ทำให้ flow สำรวจข้อมูล HumanoidTH พร้อมใช้งานและพร้อม Demo** | **Baseline Completion - Required**: จัด navigation/overview, ทำ Data Map ใช้งานได้แม้ไม่มี Google Maps API, ลด edge/node ซ้ำใน Network Graph, จัดกลุ่ม Robot Model ตามพื้นที่/ล่าสุด/ความนิยม และเปลี่ยน Confidence Lens เป็น Histogram | ระบบถือว่าสมบูรณ์เมื่อ `pnpm typecheck` ผ่าน, development server เปิดได้, และกรรมการสามารถเปิด `/map`, `/robots`, `/network`, `/analytics` เพื่อทำ interaction หลักได้จริง; Data Map มี fallback ที่ชัดเจน, public location ไม่เปิดเผยข้อมูล private, Network ไม่มี edge ซ้ำจาก source URL ต่างกัน และ Analytics อธิบายระดับ confidence ได้ | **เสี่ยง** |

## Part F.1 - Working Prototype Definition

Fork ถือว่าพร้อม Demo เมื่อสามารถรัน development server และเปิด flow หลักได้จากระบบเดียวกัน: Overview -> Dashboard/Robot Model/Map/Network/Analytics ผู้ทดสอบต้องสามารถเลือกดูข้อมูลตามพื้นที่บน Data Map, สลับดู Robot Model ตามพื้นที่/ล่าสุด/ความนิยม, อ่าน Network ที่ลดความซ้ำซ้อนแล้ว และตีความ Confidence Histogram ได้โดยไม่ต้องเดาความหมายของกราฟ

คำสั่งตรวจสอบที่ใช้:

```bash
pnpm typecheck
pnpm dev:next
```

## Part F.2 - Demo Scenario ของ Baseline

1. เปิดหน้า Overview เพื่อแสดง navigation ใหม่และทางเข้าสู่ชุดข้อมูลหลัก
2. เปิด `/map` ใน Data Map mode เลือกจังหวัดที่มีข้อมูล เช่น Bangkok หรือ Rayong แล้วดูหน่วยงานและรายการที่เกี่ยวข้อง; สลับไป Live Map เพื่อแสดงการแยกโหมดและข้อกำหนด API key
3. เปิด `/robots` แล้วสลับจาก “ตามพื้นที่” ไป “ล่าสุดใน Atlas” และ “นิยมใน Atlas”; อธิบายว่า Popular in Atlas ไม่ใช่ยอดวิว แต่ใช้จำนวน deployment สาธารณะและ linked records
4. เปิด `/network` เพื่อแสดง node สำคัญ, edge ที่ไม่ซ้ำ และ legend สีของความสัมพันธ์
5. เปิด `/analytics` เลือก scope แล้วอธิบาย Histogram: แกน X คือช่วง confidence 0.00-1.00, แกน Y คือจำนวน record และรายการต่ำกว่า 0.50 คือกลุ่มควรตรวจทาน

## Part F.3 - Acceptance Criteria

- `pnpm typecheck` ผ่านโดยไม่มี TypeScript error
- Development server ตอบหน้าแรกที่ `http://127.0.0.1:3000`
- `/map`, `/robots`, `/network` และ `/analytics` เปิดได้และใช้ interaction หลักตาม Demo Scenario ได้
- Data Map ทำงานโดยไม่ต้องมี Google Maps API key; Google Live Map ใช้งานได้เมื่อกำหนด `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Robot location ไม่เปิดเผยตำแหน่งของ inventory ที่ไม่ใช่ `public`
- Network Graph ไม่สร้าง edge ซ้ำเพียงเพราะ source URL ต่างกัน
- Confidence Lens แสดง Histogram, จำนวนต่อช่วง, ค่าเฉลี่ย และเกณฑ์การตรวจทานชัดเจน

## Part G - Technical Architecture & System Design

### G.1 Current Repository Understanding

HumanoidTH เป็น web application ที่ใช้ **Next.js App Router** สำหรับ route และ UI, **Prisma/PostgreSQL** สำหรับข้อมูล robot model, contribution, inventory, source และ perspective, และใช้ client component สำหรับ interaction ของกราฟและตัวสำรวจข้อมูล เส้นทางหลักที่เกี่ยวข้องกับงาน Baseline คือ `/`, `/dashboard`, `/robots`, `/map`, `/network` และ `/analytics`.

Data flow หลักเริ่มจาก Prisma query ใน server page หรือ server action ส่งข้อมูลที่ผ่านการคัดเฉพาะ field ที่จำเป็นไปยัง client component จากนั้น component จัดกลุ่ม, filter และแสดงผลเป็น card, map หรือ graph. งานของทีมไม่เปลี่ยน schema ฐานข้อมูล แต่ทำให้ชั้น presentation และ data interpretation ใช้งานได้ชัดเจนขึ้น พร้อมคง privacy boundary ของ inventory ที่เปิดเผยต่อสาธารณะ.

```text
PostgreSQL / Prisma
        |
Next.js server page / server action
        |
route-specific client component
        |
filter / grouping / visualization / empty state
        |
user explores Atlas data and follows the demo flow
```

### G.2 File / Module / Technology ที่แก้

| Path / Module | บทบาทในระบบ | สิ่งที่แก้ / ใช้ใน Demo |
|---|---|---|
| `app/layout.tsx`, `app/components/TopNav.tsx`, `app/components/SidebarNav.tsx`, `app/page.tsx` | application shell และ overview | จัด navigation ขึ้นด้านบน, จัดกลุ่ม route, ซ่อนเมนู admin จากผู้ใช้ทั่วไป และเพิ่มจุดเริ่มต้นสำหรับ flow สำรวจข้อมูล |
| `app/dashboard/page.tsx`, `app/dashboard/DashboardCharts.tsx` | dashboard จากข้อมูลจริง | query/aggregate ข้อมูลจาก Prisma และแสดง KPI, composition, source, confidence และ offline state |
| `app/map/actions.ts`, `app/map/page.tsx` | location cluster และ server-side map data | fallback เมื่อไม่มี Gemini key, ส่ง cluster และ province boundary เข้า map mode |
| `app/map/LocationExplorer.tsx`, `app/map/MapModeSwitcher.tsx`, `app/map/provinceBoundaries.ts` | Data Map / Live Map | render ขอบเขตจังหวัด, search/select จังหวัด, แสดงรายละเอียดข้อมูล และสลับ mode โดยไม่บังคับใช้ Google API สำหรับ Data Map |
| `app/network/NetworkGraphClient.tsx`, `app/network/cytoscapeStyles.ts`, `lib/network-graph.ts` | graph construction และ interaction | ใช้ edge identity ที่ไม่ซ้ำตาม URL, ลด peripheral node, ปรับ layout/spacing และใช้ relation colour legend |
| `app/robots/page.tsx`, `app/robots/RobotDirectory.tsx` | robot registry explorer | โหลดเฉพาะ public inventory location, นับ linked contribution และจัดกลุ่มตามพื้นที่/ล่าสุด/ความนิยม |
| `app/analytics/page.tsx`, `app/analytics/AnalyticsPlayground.tsx` | analytics visualization | เปลี่ยน Confidence Lens เป็น Histogram พร้อม confidence band, average, coverage และ review count |
| `.env.example`, `prisma.config.ts` | environment/config | กำหนด Google Maps key สำหรับ Live Map และรองรับ direct database URL สำหรับ schema command เมื่อมี |

### G.3 Fork Development & Integration Plan

ทีมจะพัฒนาใน Fork เดียวและแยกงานเป็น branch ตามขอบเขตเพื่อลด merge conflict:

1. `baseline/navigation-dashboard` - navigation, overview และ dashboard
2. `baseline/map-network` - map interaction, network graph และ data visualization
3. `baseline/robots-analytics` - Robot Model grouping และ Confidence Histogram
4. `feature/hri-wellness-[feature-name]` - Theme Feature ใหม่; ต้องเรียกจาก route/module เดิมของ HumanoidTH และมี owner ชัดเจน

ก่อน merge แต่ละ branch ต้องผ่าน `pnpm typecheck` และผู้รับผิดชอบต้องทดสอบ route ที่ได้รับผลกระทบด้วยตนเอง จากนั้น Integrator จะ merge เข้า branch สำหรับ demo, รัน regression ตาม Demo Scenario, เก็บ screenshot/README และสร้าง commit สุดท้ายที่ระบุชัดว่าเป็น Baseline fix หรือ Theme Feature. หาก sync upstream ทำให้เกิด conflict ให้ทำก่อนเริ่มงานและก่อน final integration เท่านั้น เพื่อไม่รบกวนช่วงพัฒนา core flow.

## Part H - แผนดำเนินงาน Baseline ภายใน 1 วัน (สำหรับกรอกแผน)

| ช่วงเวลา | งาน Baseline | Output |
|---|---|---|
| เริ่ม Hack Day | Sync Fork, ติดตั้ง dependency, ตั้งค่า `.env`, รัน `pnpm typecheck` และ `pnpm dev:next` | ระบบเปิดได้และมี baseline audit ที่ยืนยันแล้ว |
| ช่วงเช้า | ตรวจ navigation, map mode, robot grouping และ data privacy ของ public location | Flow สำรวจข้อมูลหลักพร้อมทดสอบ |
| ช่วงกลางวัน | ตรวจ Network Graph: edge de-duplication, peripheral-node view, legend และ spacing | กราฟอ่านง่ายและตรวจความสัมพันธ์ได้ |
| ช่วงบ่าย | ตรวจ Analytics Histogram, responsive layout และ regression ของ route หลัก | หน้าหลักพร้อมสาธิต end-to-end |
| ก่อนจบวัน | รัน typecheck, ทดสอบ demo scenario, commit, เขียน README/notes และเตรียม screenshot/recording สำรอง | Fork พร้อมส่งกรรมการ |

## Known Constraints และ Fallback Plan

- Google Live Map ต้องมี `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; หากยังไม่มี ให้ใช้ Data Map ซึ่งไม่ส่งข้อมูล Atlas ไปยังผู้ให้บริการแผนที่และยังใช้เลือกจังหวัดได้จริง
- Province boundary dataset ถูก fetch และ cache จาก open data; หากโหลดไม่ได้ หน้าจะแจ้งสถานะและยังเลือก location ที่มีข้อมูลจากรายการได้
- ใน environment ที่ทดสอบ `next build` อาจติดการ resolve `fonts.googleapis.com`; ก่อน Demo ให้ใช้ network ที่ออกอินเทอร์เน็ตได้หรือเตรียม font cache/ทางเลือกไว้ล่วงหน้า โดย `pnpm typecheck` ผ่านแล้ว
- หากฐานข้อมูลไม่พร้อม ให้แสดงสถานะ offline ของ dashboard/analytics ตามระบบเดิม และสาธิต route ที่ทำงานจากข้อมูลที่มีอยู่โดยไม่อ้างตัวเลขจำลองเป็นข้อมูลจริง
