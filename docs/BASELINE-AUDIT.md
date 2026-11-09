# Baseline Audit: HumanoidTH Fork (ทีม Robosonic)

ใช้สถานะตามเอกสารโครงการ: **PASS**, **FAIL**, **BLOCKED**, **NOT TESTED** ข้อที่ไม่มีหลักฐานจะไม่ถูกนับเป็น PASS

**Repository:** https://github.com/6710615151/Robosonic เป็น fork ของ `taechasith/HumanoidTH`

**สภาพแวดล้อมที่ตรวจ (2026-11-07):** Windows 11, Node 24.16, pnpm 10.34, Chromium จาก Playwright
**โค้ดที่ตรวจ:** `main` รวมกับ `feat/living-lab-identity` และ `feat/hri-spoken-summary`
**ฐานข้อมูล:** Postgres 16 ชั่วคราวใน Docker บนเครื่องที่ตรวจ ลง migration ทั้ง 4 ตัวและ seed แล้ว **ไม่ใช่ Neon และไม่ใช่ production**

## 1. Setup และ Build

| รายการ | คำสั่ง | สถานะ | ผลลัพธ์ / หมายเหตุ |
|---|---|---|---|
| ติดตั้ง dependency | `pnpm install --frozen-lockfile` | **PASS** | ต้องมี `DATABASE_URL` ใน environment มิฉะนั้น `postinstall` (`prisma generate`) ล้มเหลว ทั้งที่ขั้นตอนนี้ไม่ได้เชื่อมต่อฐานข้อมูล |
| Migration บนฐานข้อมูลเปล่า | `prisma migrate deploy` | **PASS** | ลงครบ 4 ตัว ห้ามใช้คำสั่งนี้กับ production เดิมที่สร้างด้วย `db push` ให้ทำตาม `docs/hri-passport-api.md` |
| Migration บน Neon `dev` และ production | | **NOT TESTED** | เครื่องที่ตรวจไม่มีสิทธิ์เข้าถึง |
| Seed | `pnpm db:seed` | **PASS** | |
| Unit test | `pnpm test` | **PASS** | 117 / 117 |
| Type check | `pnpm typecheck` | **PASS** | 0 errors |
| Production build | `next build` | **PASS** | |
| Lint | `next lint` | **BLOCKED** | repo ไม่มีไฟล์ตั้งค่า ESLint |
| ตรวจข้อมูลจำลอง | `pnpm check:no-mock-data` | **FAIL** | ดูข้อ 4 |

## 2. Playwright ในเบราว์เซอร์จริง

รันกับ production build ยกเว้น `hri-identity-flow` ที่ต้องใช้ `next dev` เพื่ออ่านรหัสจาก log ของ server

| ชุดทดสอบ | สถานะ | ผล |
|---|---|---|
| `hri-e2e` (สร้าง, QR, API, การ์ด, robot console, แก้ไข, ลบ) | **PASS** | 1 / 1 |
| `hri-passport-api` (API, rate limit, การเดา token) | **PASS** | 8 / 8 |
| `hri-passport-card` | **PASS** | 7 / 7 |
| `hri-robot-console` | **PASS** | 3 / 3 |
| `hri-auto-mode` (กล้องจำลอง ไม่มีคนในภาพ) | **PASS** | 3 / 3 |
| `hri-voice-flow` (ตัวรับเสียงจำลอง) | **PASS** | 6 / 6 |
| `hri-spoken-summary` (เครื่องพูดจำลอง) | **PASS** | 4 / 4 |
| `hri-identity-flow` (รหัสจริงจาก server ลงฐานข้อมูลจริง ไม่ส่งอีเมล) | **PASS** | 2 / 2 |
| `hri-identity-card` (ไม่มีฐานข้อมูล, ทั้งบังคับและไม่บังคับอีเมล) | **PASS** | 2 / 2 ในแต่ละโหมด |
| `smoke` (crawl ทุก route ในฐานะ admin, คนทั่วไปเป็น admin ไม่ได้) | **PASS** | 2 / 2 |
| `network` | **NOT TESTED** | รายงานเดิมระบุว่า 2 ข้อต้องใช้ `next dev` |

## 3. Gap ที่แก้แล้ว

| Gap | หลักฐาน | สถานะ |
|---|---|---|
| ผู้ใช้ทั่วไปยกระดับเป็น admin และแก้ข้อมูลโดยไม่ยืนยันตัวตนได้ | commit `9806f23`, `test/admin-session.test.ts`, `tests-node/smoke.spec.ts` | **PASS** |
| Repo ไม่ใช่ fork ตามกติกาข้อ 1 | GitHub ระบุ parent เป็น `taechasith/HumanoidTH` | **PASS** |
| ตั้งค่า Neon Postgres สำหรับ Vercel | commit `d26d0af`, `docs/vercel-deploy.md` | **NOT TESTED** |
| หุ่นยนต์หน้า Overview | commit `74593ce` | **NOT TESTED** ด้วยการดูจริง |
| ปัญหาจากการรีวิว เช่น edit key หาย, anxiety รั่ว, กล้องไม่หยุดเมื่อถอน consent | commit `8f1d652`, unit test | **PASS** |

## 4. ปัญหาที่ยังเปิดอยู่

**`check:no-mock-data` ไม่ผ่าน** แยกได้เป็น

- `app/map/actions.ts`: **ปัญหาจริงของระบบเดิม** เมื่อ Gemini ล้มเหลว ระบบเขียนข้อมูลจำลองลง `StatsCache` จึงอาจถูกแสดงเหมือนข้อมูลจริง
- `app/network/NetworkGraphClient.tsx`: ใช้ไฟล์สำรองเมื่อโหลดข้อมูลสดไม่ได้ และมีข้อความเตือนผู้ใช้ ยังไม่ได้ตรวจว่าครบทุกกรณี
- `app/living-lab/robot/*`, `LivingLabClient.tsx`: คำที่ตรงเงื่อนไขเฉย ๆ เช่น "simulated" ซึ่งเป็นการแจ้งผู้ใช้ตามจริง

ข้อต่อไปนี้มาจาก `docs/HRI-PASSPORT-DELIVERY.md` §6 **ยังไม่ได้ตรวจซ้ำ**

1. React hydration error #418 ที่ `/database`
2. `TypeError … 'notify'` ที่ `/network` บนจอมือถือ
3. เลื่อนแนวนอนเกินจอที่ `/` (เดสก์ท็อป), `/contributions` และ `/analytics` (มือถือ)
4. คำสั่ง seed ใน `prisma.config.ts` ชี้ไปที่ `tsx.CMD` ของ Windows ให้ใช้ `pnpm db:seed` แทน

## 5. Theme Feature: HRI Passport

| เกณฑ์ในเอกสารโครงการ | หลักฐาน | สถานะ |
|---|---|---|
| ตอบด้วยเสียงทีละข้อ | `hri-voice-flow` | **PASS เฉพาะ wiring**; ไมโครโฟนจริง **NOT TESTED** |
| Text fallback เมื่อเบราว์เซอร์ไม่รองรับหรือไมค์ถูกปิด | `hri-voice-flow` | **PASS** |
| ตรวจทานและแก้ไขก่อนบันทึก | `hri-voice-flow` | **PASS** |
| บันทึกโปรไฟล์และเปิดผ่าน QR/token | `hri-e2e` | **PASS** |
| Preview เปลี่ยนตามค่าที่บันทึก | `hri-e2e`, `hri-robot-console` | **PASS** |
| หุ่นบอกสิ่งที่ตัวเองจะทำตาม passport | `hri-spoken-summary`, unit test | **PASS เฉพาะข้อความ**; เสียงจริงและความยาว **NOT TESTED** |
| ยืนยันอีเมล, ลบอีเมล, ไม่รั่วเข้า API | `hri-identity-flow`, unit test | **PASS** โดยไม่ได้ส่งอีเมลจริง |
| ส่งอีเมลจริงผ่าน EmailJS | | **NOT TESTED** |
| โหมด Auto กับคนจริง | | **NOT TESTED** |
| สแกน QR ด้วยมือถือจริง | | **NOT TESTED** |

## 6. สิ่งที่ต้องทำเพื่อปิด NOT TESTED

- [ ] Chrome หรือ Edge พูดภาษาไทยผ่านไมโครโฟนจริงครบทุกคำถาม ในจุดที่เสียงดังเท่ากับวันงาน
- [ ] ปฏิเสธสิทธิ์ไมโครโฟนจริง แล้วพิมพ์คำตอบต่อได้
- [ ] หุ่นพูดภาษาไทยแล้วไมโครโฟนไม่จับเสียงของหุ่นเอง
- [ ] ฟังเสียงสรุปของ Robot A ว่าชัด และยาวไม่เกินประมาณ 8 วินาที
- [ ] โหมด Auto กับคนจริงตาม `HRI_FEASIBILITY_SPIKE.md` §3.4
- [ ] สแกน QR จากจอด้วยมือถือจริง
- [ ] ส่งรหัสจริงผ่าน EmailJS ถึง Gmail และอีเมลมหาวิทยาลัย
- [ ] ลง migration และรัน Playwright บน Neon `dev` ถ้าจะ deploy
- [ ] เก็บ screenshot หรือวิดีโอของ route หลักเป็นหลักฐาน
