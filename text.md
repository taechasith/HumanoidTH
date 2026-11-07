# แนวทางการกรอก Proposal - HRI HACKATHON THAILAND 2026

คู่มือนี้ใช้กับ Project Document Template ของ HRI HACKATHON THAILAND 2026 โดยยึดหลักสำคัญ 3 ข้อ:

1. **ยืนยันจาก Fork จริง** - อย่าอ้างว่าแก้หรือทดสอบแล้ว หากยังไม่ได้ทำใน repository ของทีม
2. **แยก Baseline กับ Theme Feature** - Baseline คือทำระบบต้นทางให้พร้อมใช้งานและ Demo ได้; Theme Feature คือความสามารถใหม่ด้าน HRI Wellness Living Lab ที่ integrate เข้าระบบเดียวกัน
3. **เขียนให้ตรวจได้** - ทุกข้อสำคัญควรตอบได้ว่า “กรรมการจะคลิก/รันอะไร แล้วเห็นผลอะไร”

---

## ก่อนเริ่มกรอก: โครงคำตอบที่ดี

ใช้รูปแบบนี้กับทุกหัวข้อที่พูดถึงปัญหาและวิธีแก้:

> **ปัญหาที่พบ** -> **หลักฐานใน Fork/route/file** -> **สิ่งที่จะทำ** -> **ผลลัพธ์ที่ตรวจได้**

ตัวอย่าง:

> หน้า Network มี edge ซ้ำเมื่อความสัมพันธ์เดียวกันมาจากหลาย source URL ทำให้กราฟอ่านยาก (ตรวจจาก `lib/network-graph.ts` และหน้า `/network`) ทีมจะใช้ canonical edge key ที่ยึด source-relation-target เพื่อรวมข้อมูลความสัมพันธ์เดียวกัน ผลลัพธ์คือเปิด `/network` แล้ว edge ที่มีความหมายเดียวกันแสดงเพียงเส้นเดียวและ tooltip รวมหลักฐานที่เกี่ยวข้องได้

หลีกเลี่ยงประโยคกว้าง ๆ เช่น “จะทำ UI ให้ดีขึ้น”, “จะใช้ AI วิเคราะห์”, “จะทำระบบ Wellness” โดยไม่บอกว่าอยู่ route ไหน, ใช้ข้อมูลอะไร, หรือสาธิตอย่างไร

---

## Part A - Project Identity

### กรรมการต้องเห็น

ทีมคือใคร, Fork ไหน, ตั้งใจส่งอะไร, และสถานะ setup ปัจจุบันเป็นอย่างไร

### ควรกรอก

- **ชื่อทีม:** ใช้ชื่อเดียวกับ GitHub Organization/Repository หากเป็นไปได้
- **ชื่อ Feature / Contribution:** ตั้งให้เป็นผลลัพธ์ที่สื่อสารได้ ไม่ใช่ชื่อกว้าง ๆ เช่น “HRI Wellness Navigator” หรือ “Care Interaction Evidence Lens”
- **Fork URL:** ต้องเปิดให้กรรมการเห็นได้จริง และระบุ branch ที่จะส่งงานหากไม่ได้ใช้ `main`
- **สถานะ setup:** เลือกตามความจริง เช่น `Fork แล้ว / pnpm install แล้ว / pnpm dev:next รันได้ / typecheck ผ่าน`

### ตัวอย่างคำตอบที่ดี

> สถานะ: Fork แล้ว, ตรวจไฟล์ `.env` แล้ว, development server รันที่ localhost ได้ และ `pnpm typecheck` ผ่าน ณ วันที่ทดสอบ

### อย่าทำ

- ระบุว่า Build ผ่าน ถ้ายังตรวจเพียง dev server
- ใส่ URL private หรือ URL ที่ไม่ได้ชี้ไป Fork ของทีม
- ใช้ชื่อ Feature ที่ไม่บอกกลุ่มผู้ใช้หรือคุณค่าที่เกิดขึ้น

---

## Part B - Team Members & Roles

### กรรมการต้องเห็น

ทีมแบ่งงานได้จริงภายใน 1 วัน และไม่มีส่วนสำคัญที่ไม่มีเจ้าของ

### วิธีกรอกตาราง

ให้แต่ละคนมี 4 ส่วน: **บทบาท**, **ทักษะที่เกี่ยวข้อง**, **file/module ที่รับผิดชอบ**, และ **output ที่ส่งมอบ**

| บทบาท | เขียนให้ดีอย่างไร |
|---|---|
| Lead / Integrator | ระบุว่า lock scope, review PR, run end-to-end demo และตัดสินใจ fallback |
| Frontend / UX | ระบุ route/component ที่ปรับ, responsive QA และ demo flow |
| Data / AI | ระบุ dataset/API, validation, caching/fallback และไม่เก็บข้อมูลเกินจำเป็น |
| Backend / Security | ระบุ server action/API/role check/schema ที่ดูแล พร้อม test case |
| QA / Documentation | ระบุ acceptance test, screenshot, README, commit log และ demo script |

### ตัวอย่างคำตอบที่ดี

> Thanachat - Frontend/Designer - รับผิดชอบ `app/map/*`, `app/robots/*` และ responsive QA - ส่งมอบ data-map interaction, robot grouping และ screenshot สำหรับ demo

### อย่าทำ

- เขียนเพียง “ช่วยทำทุกอย่าง”
- ให้หลายคนแก้ file เดียวโดยไม่มีเจ้าของ integration
- ลืมกำหนดคนรับผิดชอบ final test และ README

---

## Part C - HRI Challenge Alignment

### C.1 Baseline Completion ภายใน 1 วัน

ตอบเป็น **Baseline Audit แบบจัดลำดับความสำคัญ** ไม่จำเป็นต้อง list ทุก bug ใน repository

#### โครงคำตอบที่แนะนำ

1. ระบุ 3-5 gap ที่ขัดขวางการ Build/Run, Flow หลัก หรือ Demo มากที่สุด
2. ระบุ route/file ที่เกี่ยวข้อง
3. บอกวิธีปิด gap และการทดสอบ
4. ระบุสิ่งที่ “ไม่ทำ” ใน 1 วันเพื่อล็อก scope

#### ตัวอย่างโครงประโยค

> ทีมจะเริ่มจากตรวจ `pnpm typecheck`, `pnpm dev:next` และ route หลัก ก่อน lock baseline gap ที่ส่งผลต่อ demo มากที่สุด ได้แก่ [gap 1], [gap 2] และ [gap 3] แต่ละ gap จะมี owner, commit และ acceptance test ชัดเจน เป้าหมายปลายวันคือสามารถเปิดระบบ, เดินตาม demo scenario และแสดงผลจาก Fork เดียวกันได้

### C.2 Theme Feature ใหม่

ต้องตอบครบ 5 อย่าง:

- ผู้ใช้เป้าหมายคือใคร
- สถานการณ์ Wellness/HRI คืออะไร
- Feature ทำอะไรได้จริง
- integrate ที่ route/module/data flow ใด
- Demo ให้กรรมการเห็นอย่างไร

#### สูตรตั้งชื่อ Feature

`[ผู้ใช้หรือบริบท] + [งานที่ผู้ใช้ทำ] + [ผลลัพธ์ HRI/Wellness]`

ตัวอย่าง: `Caregiver Robot Readiness Planner` ไม่ใช่ `Wellness AI Platform`

### C.3 ความเกี่ยวข้องกับ HRI

อย่าอธิบายเพียง “เกี่ยวกับหุ่นยนต์” ให้โยงเป็น interaction loop:

> ผู้ใช้ [ค้นหา/เลือก/ประเมิน/วางแผน] -> ระบบเชื่อมกับ [robot model, deployment, evidence, contribution] -> ได้ [คำแนะนำ/ข้อมูลตัดสินใจ/flow ดูแล] -> ส่งผลต่อ [ความปลอดภัย ความเข้าใจ หรือ wellness]

---

## Part D - Problem, Users & Evidence

### D.1 Gap ของระบบ

แยกแต่ละ gap เป็นแถวหรือหัวข้อย่อย:

| Gap | หลักฐาน | ผลกระทบ | แผนแก้ | หลักฐานหลังแก้ |
|---|---|---|---|---|
| Network อ่านยาก | screenshot/route/file | ผู้ใช้แยกความสัมพันธ์สำคัญไม่ได้ | de-duplicate edge + filter/layout | เปรียบเทียบก่อน-หลังและ demo interaction |

ให้เลือก gap ที่สอดคล้องกับเวลา 1 วันและสัมพันธ์กับ Theme Feature มากที่สุด

### D.2 ผู้ใช้หลัก

ระบุ **บทบาท + งานที่ต้องทำ + ความต้องการ** ไม่ใช่เพียงรายชื่อกลุ่มคน

> นักวิจัย HRI ที่ต้องการตรวจสอบว่าหุ่นยนต์รุ่นใดถูกใช้ในพื้นที่ใด และมีหลักฐาน/ผลงานใดเชื่อมโยงอยู่ ก่อนเลือก case study หรือ partner สำหรับงาน Wellness

### D.3 หลักฐาน

หลักฐานที่น่าเชื่อถือเรียงตามลำดับ:

1. ทดลอง run/ใช้ flow จริง พร้อม screenshot หรือ log
2. อ้าง route, component, schema หรือ API ใน Fork
3. อ้าง documentation/research เฉพาะที่เกี่ยวข้อง
4. บอกข้อจำกัดของข้อมูลอย่างตรงไปตรงมา

อย่าอ้าง user research หรือผลการทดลองกับคน หากยังไม่ได้ทำจริง

---

## Part E - Solution Concept

### E.1 สรุปแผน 5-8 บรรทัด

เขียนตามลำดับนี้:

1. ปัญหา/ผู้ใช้ 1 ประโยค
2. Baseline 2-3 งานที่ต้องทำให้ครบ
3. Theme Feature 1 ประโยคพร้อมจุด integration
4. Demo 1 ประโยค
5. ผลลัพธ์ที่ตรวจได้ 1 ประโยค

### Template ที่นำไปใช้ได้

> ทีมพัฒนา [ชื่อ Feature] สำหรับ [ผู้ใช้] ที่ต้องการ [งาน/ปัญหา] ในบริบท [Wellness/HRI] เราจะทำ Baseline Completion โดย [งานเดิม 1], [งานเดิม 2] และ [งานเดิม 3] เพื่อให้ Fork Build/Run และเดิน flow หลักได้ ภายในระบบเดียวกันจะเพิ่ม [Theme Feature] ที่เชื่อมกับ [route/module/data] ผู้ใช้สามารถ [interaction หลัก] และเห็น [ผลลัพธ์] จากนั้น Demo จะเริ่มจาก [หน้า/flow เดิม] ไปยัง [Feature ใหม่] โดยตรวจได้จาก [acceptance criteria]

### E.2 ตาราง Scope

แยก Baseline และ Theme Feature เป็นคนละแถวเสมอ

| งาน | ประเภท | Definition of Done | สถานะใน 1 วัน |
|---|---|---|---|
| Fix authorization ของ admin action | Baseline | ผู้ใช้ทั่วไปเรียก action ไม่ได้, admin ที่ authenticated เรียกได้, มี test/manual proof | ได้/เสี่ยง |
| Wellness feature | Theme | ใช้จริงจาก route เดิม, อ่าน/เขียนข้อมูลจริงที่ระบุ, มี demo scenario | ได้/เสี่ยง |

Definition of Done ต้องเป็น “พฤติกรรมที่สังเกตได้” ไม่ใช่ “เขียนโค้ดเสร็จ”

---

## Part F - Working Prototype Definition

### F.1 เมื่อจบ Hack Day ต้องอยู่ในสภาพใด

ระบุ 4 ส่วน:

- คำสั่ง run/check ที่ใช้จริง
- route หลักที่เปิดและใช้งานได้
- baseline gap ที่ปิดแล้ว
- theme feature ที่ใช้ได้จริงจาก Fork เดียวกัน

### F.2 Demo Scenario

เขียนเป็นลำดับที่คนอื่นทำตามได้ภายใน 2-4 นาที:

1. เปิด URL / login ด้วย role ที่ถูกต้อง (ถ้าจำเป็น)
2. แสดง baseline flow เดิมที่ถูกแก้
3. เริ่ม Theme Feature จากจุดที่สัมพันธ์กับ flow เดิม
4. ทำ interaction สำคัญ 1-3 ครั้ง
5. แสดงผล/ข้อมูล/การตัดสินใจที่เกิดขึ้น
6. ชี้ commit, README หรือ fallback หาก external service ไม่พร้อม

### F.3 Acceptance Criteria

เขียนในรูปแบบตรวจผ่าน/ไม่ผ่าน เช่น:

- `pnpm typecheck` ผ่าน
- เปิด `[route]` แล้วผู้ใช้ทำ `[action]` ได้
- ระบบบันทึก/แสดง `[data]` ตามเงื่อนไข `[privacy/role]`
- หาก `[external API]` ใช้ไม่ได้ ระบบแสดง `[fallback/empty state]` โดยไม่ล้ม
- Theme Feature ไม่ใช่ mockup และถูกเรียกจาก navigation/route ของ HumanoidTH

---

## Part G - Technical Architecture & System Design

### G.1 Current Repository Understanding

อธิบายเป็น **ข้อมูลเข้า -> ประมวลผล -> แสดงผล -> ผู้ใช้ทำอะไรต่อ** ไม่ต้องคัด README ทั้งหมด

ตัวอย่าง:

> HumanoidTH ใช้ Next.js App Router เป็น UI/API layer, Prisma/PostgreSQL สำหรับ registry และ contribution data, และมี route สำหรับ robots, map, network, analytics, submission และ data pulls งานของทีมเชื่อมจาก `[route เริ่มต้น]` ไป `[module/data]` และจบที่ `[ผลลัพธ์/route]`

### G.2 File / Module / Technology

ใส่เฉพาะไฟล์ที่คาดว่าจะมีการแก้ พร้อมหน้าที่:

| Path / Resource | หน้าที่ | สิ่งที่จะเปลี่ยน | ความเสี่ยง |
|---|---|---|---|
| `app/[route]/page.tsx` | route/server data | load data และส่ง props | DB unavailable |
| `app/[route]/Feature.tsx` | interaction UI | state, filter, validation | responsive/layout |
| `lib/[module].ts` | domain/data logic | dedupe, ranking, permission check | data quality |

### G.3 Fork Development & Integration Plan

- สร้าง branch แยก `baseline/...` และ `feature/...`
- ทุกคน commit เป็นส่วนเล็ก ๆ พร้อมข้อความสื่อความหมาย
- Lead/Integrator merge หลังผ่าน typecheck และ manual route test
- sync upstream ก่อนเริ่มและก่อน final integration เท่านั้น เพื่อลด conflict
- เก็บ README, screenshots และ demo instructions ใน Fork

---

## Part H - 1-Day Implementation Plan

ตารางที่ดีต้องมี **เวลา, owner, output ที่พิสูจน์ได้, จุดตัดสินใจลด scope**

| เวลา | งาน | Owner | Output / Gate |
|---|---|---|---|
| เริ่ม | Fork/sync, setup, run, audit | Lead + ทุกคน | server รัน, baseline gap lock |
| เช้า | Baseline fixes ที่บล็อก flow | Backend/Frontend | typecheck + manual test ผ่าน |
| กลางวัน | Theme Feature core | Feature owner | ใช้ได้จาก route จริง |
| บ่าย | integration, responsive, data/privacy test | Integrator + QA | demo scenario ผ่าน |
| ก่อนจบ | commit, README, deployment/demo backup | ทุกคน | tag/commit พร้อมส่ง |

**กติกาลด scope:** ตัด dashboard decoration, chart เสริม หรือ external integration ที่ไม่จำเป็นได้ แต่ห้ามตัด Baseline flow, security/privacy ที่จำเป็น หรือ Theme Feature core ที่ต้องใช้จริง

---

## Part I - Data, API & External Resources

แยกเป็น 4 คอลัมน์: **อะไร**, **ใช้ที่ไหน**, **สถานะเข้าถึง**, **fallback**

| Resource | ใช้ในส่วนใด | สถานะ | Fallback ที่ซื่อสัตย์ |
|---|---|---|---|
| PostgreSQL/Prisma | registry, contribution, profile | ต้องทดสอบ connection | แสดง offline state; ไม่แต่งตัวเลขให้เหมือนข้อมูลจริง |
| Google Maps API | Live Map mode | ต้องมี API key | ใช้ Data Map ที่ไม่พึ่ง provider key |
| AI API/Model | enrichment/cluster/assistant | key/quota ต้องพร้อม | จำกัด feature เป็น manual rule หรือ existing curated fallback โดยบอกผู้ใช้ชัดเจน |
| Open dataset | boundary/reference data | ตรวจ license/availability | cache หรือ empty state พร้อม explanation |

อย่าใส่ API ที่ทีมยังไม่รู้ว่าจะเรียกจาก file ไหน หรือไม่มี key/permission โดยไม่มีแผนสำรอง

---

## Part J - 4M1E Analysis

| หัวข้อ | ต้องตอบให้เฉพาะกับทีม |
|---|---|
| Man | ใครทำ audit, baseline, feature, integration, QA, pitch และใครเป็น decision maker |
| Money | API/cloud ที่อาจมีค่าใช้จ่าย, quota, และทางเลือก free/local ที่ใช้ได้ในวันแข่ง |
| Material | laptop, repository, database URL, API key, dataset, test account/device หรือ robot resource |
| Method | Fork -> Setup -> Audit -> Fix baseline -> Build feature -> Integrate -> Test -> Commit -> Demo |
| Environment | ข้อจำกัดเวลา 1 วัน, internet, deployment, team coordination, privacy ของข้อมูล Wellness และสถานที่จริง |

อย่าเขียน 4M1E เป็นคำจำกัดความทั่วไป; ทุกช่องต้องชี้กลับมาที่งานของทีม

---

## Part K - Risks, Ethics & Safety

### K.1 ความเสี่ยงทางเทคนิค

ระบุ **ความเสี่ยง + สัญญาณเตือน + คนรับผิดชอบ + แผนลดผลกระทบ**

| ความเสี่ยง | สัญญาณเตือน | แผนลดความเสี่ยง |
|---|---|---|
| Setup/DB ไม่พร้อม | run route ไม่ได้หรือ connection fail | ตรวจตั้งแต่ต้นวัน, เตรียม offline state และ data path ที่อนุญาต |
| API quota/key ไม่พร้อม | request fail/latency สูง | feature core ไม่ผูกกับ API เพียงตัวเดียว, ทำ fallback ที่ไม่หลอกผู้ใช้ |
| Merge conflict | แก้ file/route เดียวกัน | แบ่ง ownership, merge เป็นช่วง, ให้ Integrator ดูแล |
| Scope ใหญ่เกิน | core flow ยังไม่ผ่านตอนกลางวัน | ตัด enhancement เหลือ baseline + feature core + test |

### K.2 Ethics, Privacy & Safety

ถ้าเกี่ยวข้องกับ Wellness/HRI ให้ระบุอย่างน้อย:

- เก็บข้อมูลส่วนบุคคล/สุขภาพอะไรบ้าง และทำไมจึงจำเป็น
- ไม่เก็บอะไรบ้าง เช่น exact location, serial number, raw video/audio หากไม่จำเป็น
- consent, visibility, role-based access และวิธีลบ/แก้ไขข้อมูล
- ไม่อ้างว่า robot/AI วินิจฉัยหรือรักษาทางการแพทย์ หาก feature ไม่ผ่านการรับรอง
- กรณีข้อมูลไม่แน่นอน ให้แสดง confidence, source และข้อความกำกับความเสี่ยง

### K.3 วิธีลดความเสี่ยง

สรุปเป็นการกระทำที่ทำได้จริงก่อน Demo: validate input, mask sensitive fields, role check บน server, source attribution, empty/error state, manual test checklist และ demo backup

---

## Part L - Expected Impact & Future Extension

### L.1 ผลกระทบจากงานใน Hackathon

เขียนเป็นผลที่วัด/สังเกตได้จาก Fork ไม่ใช่คำโฆษณา:

> ก่อนแก้ ผู้ใช้ต้อง [ความยาก/ความเสี่ยง] หลังแก้ ผู้ใช้สามารถ [flow ที่ทำได้] จาก `[route]` และกรรมการตรวจได้จาก `[test/demo/commit]` Theme Feature เพิ่มความสามารถ `[capability]` สำหรับ `[user/context]` โดยเชื่อมกับข้อมูล/โมดูลเดิม

### L.2 Roadmap หลัง Hackathon

แบ่ง 3 ระยะ:

1. **Stabilize:** test, monitoring, permission, data quality
2. **Validate:** user study กับกลุ่มผู้ใช้เป้าหมาย, feedback และ ethics review
3. **Scale:** เพิ่ม dataset/organization/robot integration, API, research collaboration หรือ open-source issue/PR

อย่าระบุ roadmap ที่ไกลเกินโดยไม่มีเงื่อนไข เช่น “ขยายทั่วประเทศ” ควรระบุข้อมูล/partner/validation ที่ต้องมีให้ครบก่อน

---

## Part M - Final Declaration

ก่อนส่ง ให้ตรวจรายการนี้:

- Fork URL เปิดให้กรรมการเข้าดูได้และชี้ branch/commit ล่าสุด
- Deployment URL เปิดได้จริง หรือระบุ local demo instruction ที่ทดสอบแล้ว
- Demo URL เป็น video/screenshot/slide เสริม ไม่ใช่สิ่งทดแทน working prototype
- README มี setup, env variables, run command, test command และ fallback
- Commit history แยก baseline fix กับ theme feature อ่านได้
- ไม่มี API key, password, personal health data, exact private location หรือ secret อยู่ใน repository/document

---

## Final Proposal Checklist

- [ ] ทุก Part มีคำตอบเฉพาะโครงการ ไม่ใช่ placeholder
- [ ] Baseline Completion และ Theme Feature แยกกันทุกจุดที่เทมเพลตถาม
- [ ] ทุก feature มี route/module/data/integration point และ demo step
- [ ] ทุก claim สำคัญมีหลักฐานจาก Fork, test, screenshot หรือ documentation
- [ ] ทุก risk สำคัญมี owner และ fallback
- [ ] ทุก Definition of Done เป็นสิ่งที่กรรมการทดสอบได้
- [ ] ข้อความไม่อ้างผลการทดลองผู้ใช้, security fix, หรือ production readiness ที่ยังไม่ได้ทำจริง
