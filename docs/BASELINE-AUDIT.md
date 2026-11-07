# Baseline Audit: HumanoidTH Fork (ทีม Robosonic)

ใช้สถานะตามเอกสารโครงการ: **PASS**, **FAIL**, **BLOCKED**, **NOT TESTED** ข้อที่ไม่มีหลักฐานจะไม่ถูกนับเป็น PASS

**สภาพแวดล้อมที่ตรวจ (2026-11-07):** Windows 11, Node 24.16, pnpm 10.34, Chromium จาก Playwright, `next start` จาก production build
ฐานข้อมูล: **ไม่ได้เชื่อมต่อ** (`DATABASE_URL` เป็นค่าหลอก) ดังนั้นทุกข้อที่ต้องใช้ข้อมูลจริงจึงเป็น NOT TESTED ในรอบนี้

## 1. Setup และ Build

| รายการ | คำสั่ง | สถานะ | ผลลัพธ์ / หมายเหตุ |
|---|---|---|---|
| ติดตั้ง dependency | `pnpm install --frozen-lockfile` | **PASS** | ต้องมี `DATABASE_URL` ใน environment มิฉะนั้น `postinstall` (`prisma generate`) ล้มเหลว ทั้งที่ขั้นตอนนี้ไม่ได้เชื่อมต่อฐานข้อมูล |
| Unit test | `pnpm test` | **PASS** | 86 / 86 |
| Type check | `pnpm typecheck` | **PASS** | 0 errors |
| Production build | `next build` | **PASS** | |
| Lint | `next lint` | **BLOCKED** | repo ไม่มีไฟล์ตั้งค่า ESLint |
| ตรวจข้อมูลจำลอง | `pnpm check:no-mock-data` | **FAIL** | พบคำต้องห้ามใน `app/map/actions.ts`, `app/network/NetworkGraphClient.tsx`, `app/living-lab/robot/copy.ts`, `app/living-lab/robot/page.tsx` ยังไม่ได้แยกว่าเป็นข้อมูลจำลองจริงหรือเป็นแค่คำที่ตรงเงื่อนไข |

## 2. Route หลัก (production build, ไม่มีฐานข้อมูล)

รอบนี้ยืนยันได้แค่ว่าหน้าตอบกลับและไม่ล่มเมื่อฐานข้อมูลใช้ไม่ได้ **ยังไม่ได้ยืนยันว่าแสดงข้อมูลจริงถูกต้อง**

| Route | HTTP | หน้าไม่ล่มเมื่อไม่มี DB | ข้อมูลจริง |
|---|---|---|---|
| `/` | 200 | **PASS** | NOT TESTED |
| `/robots` | 200 | **PASS** | NOT TESTED |
| `/perspectives` | 200 | **PASS** | NOT TESTED |
| `/contributions` | 200 | **PASS** | NOT TESTED |
| `/map` | 200 | **PASS** | NOT TESTED |
| `/network` | 200 | **PASS** | NOT TESTED |
| `/analytics` | 200 | **PASS** | NOT TESTED |
| `/submit-data` | 200 | **PASS** | NOT TESTED |
| `/data-pulls` | 307 | **PASS** (redirect ตามการป้องกันสิทธิ์) | NOT TESTED |
| `/admin` | 307 | **PASS** (redirect ตามการป้องกันสิทธิ์) | NOT TESTED |
| `/living-lab` | 200 | **PASS** | NOT TESTED |
| `/living-lab/meet` | 200 | **PASS** | NOT TESTED |
| `/living-lab/robot` | 200 | **PASS** | NOT TESTED |
| `/api/hri/passport/{token}` | 500 | ตามคาด: API นี้ต้องใช้ DB สำหรับ rate limit และตอบ `server_error` แบบไม่เปิดเผยรายละเอียด | NOT TESTED |

## 3. Gap ที่แก้แล้ว

| Gap | หลักฐาน | สถานะ |
|---|---|---|
| ผู้ใช้ทั่วไปยกระดับเป็น admin และแก้ข้อมูลโดยไม่ยืนยันตัวตนได้ | commit `9806f23`, `test/admin-session.test.ts`, `tests-node/smoke.spec.ts` | PASS ตาม unit test; **smoke spec ไม่ได้รันซ้ำรอบนี้** |
| ตั้งค่า Neon Postgres สำหรับ Vercel | commit `d26d0af`, `docs/vercel-deploy.md` | NOT TESTED ในรอบนี้ |
| หุ่นยนต์หน้า Overview | commit `74593ce` | NOT TESTED ในรอบนี้ |
| ปัญหาจากการรีวิว PR #1 เช่น edit key หาย, anxiety รั่วทางหน้า meet และค้างใน session, กล้องไม่หยุดเมื่อถอน consent | commit `8f1d652`, `test/hri-session-privacy.test.ts`, `test/hri-camera-session.test.ts` | PASS ตาม unit test |

## 4. ปัญหาที่ยังเปิดอยู่

ข้อ 1–6 มาจาก `docs/HRI-PASSPORT-DELIVERY.md` §6 **ยังไม่ได้ตรวจซ้ำ** เพราะบางข้อต้องใช้ฐานข้อมูล

1. React hydration error #418 ที่ `/database`
2. `TypeError … 'notify'` ที่ `/network` บนจอมือถือ
3. เลื่อนแนวนอนเกินจอที่ `/` (เดสก์ท็อป), `/contributions` และ `/analytics` (มือถือ)
4. `/map` ใช้ mock clusters เมื่อไม่มี `GEMINI_API_KEY`
5. คำสั่ง seed ใน `prisma.config.ts` ชี้ไปที่ `tsx.CMD` ของ Windows ให้ใช้ `pnpm db:seed` แทน
6. ยังไม่ได้วัดความแม่นยำของโหมด Auto กับคนจริง
7. GitHub ระบุว่า repo นี้ไม่ใช่ fork (`fork: false`) และไม่มี remote `upstream` ทั้งที่กติกาข้อ 1 กำหนดให้ Fork

## 5. Theme Feature: HRI Passport

| เกณฑ์ในเอกสารโครงการ | หลักฐาน | สถานะ |
|---|---|---|
| ตอบด้วยเสียงทีละข้อ | `tests-node/hri-voice-flow.spec.ts` ใช้ตัวรับเสียงจำลอง | **PASS เฉพาะ wiring**; ไมโครโฟนจริง **NOT TESTED** |
| Text fallback เมื่อเบราว์เซอร์ไม่รองรับหรือไมค์ถูกปิด | spec เดียวกัน | **PASS** |
| คำตอบไม่ชัดเจนไม่เปลี่ยนค่า และถามซ้ำ | spec เดียวกัน, `test/hri-voice-answers.test.ts` | **PASS** |
| ตรวจทานและแก้ไขก่อนบันทึก | spec เดียวกัน | **PASS** |
| บันทึกล้มเหลวแล้วคำตอบไม่หาย | spec เดียวกัน | **PASS** |
| เริ่มใหม่แล้วล้าง consent และคำตอบ | spec เดียวกัน | **PASS** |
| บันทึกโปรไฟล์และเปิดผ่าน QR/token | `tests-node/hri-e2e.spec.ts` | **NOT TESTED** กับโค้ดล่าสุด (ต้องใช้ Neon `dev`) |
| Preview เปลี่ยนตามค่าที่บันทึก | `tests-node/hri-robot-console.spec.ts` | **NOT TESTED** กับโค้ดล่าสุด (ต้องใช้ Neon `dev`) |

ผล Playwright 22/22 ใน `docs/HRI-PASSPORT-DELIVERY.md` รันก่อน commit `8f1d652` และก่อนเพิ่มหน้าตรวจทาน จึงใช้ยืนยันโค้ดล่าสุดไม่ได้

## 6. สิ่งที่ต้องทำเพื่อปิด NOT TESTED

ต้องมี `.env.local` ของ Neon `dev` และ `NEON_BRANCH=dev`

```bash
pnpm build && pnpm start &
PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-
```

ทดสอบด้วยคนบนเครื่องเดโม:

- [ ] Chrome หรือ Edge พูดภาษาไทยผ่านไมโครโฟนจริงครบทุกคำถาม ในจุดที่เสียงดังเท่ากับวันงาน
- [ ] ปฏิเสธสิทธิ์ไมโครโฟนจริง แล้วพิมพ์คำตอบต่อได้
- [ ] เปิดด้วยเบราว์เซอร์ที่ไม่รองรับการรับเสียง แล้วพิมพ์คำตอบได้
- [ ] หุ่นพูดภาษาไทยแล้วไมโครโฟนไม่จับเสียงของหุ่นเอง
- [ ] เก็บ screenshot หรือวิดีโอของ route หลักพร้อมข้อมูลจริงเป็นหลักฐาน
