# Worklist Management

ระบบติดตามและตรวจสอบงานที่มอบหมาย — Next.js 15 + TypeScript + Tailwind CSS + Firebase (Auth, Firestore) — ใช้แพ็กเกจฟรี (Spark) ได้
ธีมสีแดง-ขาว (#D32F2F / #FFFFFF) รองรับมือถือเต็มรูปแบบ

## ฟีเจอร์

| Role | สิ่งที่ทำได้ |
|---|---|
| **Employer** | Dashboard, ดูงานทั้งหมด (รวม Archived), ตรวจงาน อนุมัติ/ส่งกลับแก้ไข, ลบงาน (= Archive) และ Restore, เพิ่มงาน (มอบหมายทุกคนหรือรายบุคคล), จัดการผู้ใช้ (เพิ่ม/แก้ไข/ปิดการใช้งาน/กำหนด Role) |
| **Employee** | ดูงานที่มอบหมายให้ตัวเอง + งานแบบ "ทุกคน", กดรับงาน (ล็อกให้รับได้คนเดียว), เริ่มงาน, ส่งงานพร้อมรูปหลายรูป + หมายเหตุ, ส่งงานแก้ไขเมื่อถูกส่งกลับ |
| **ทุก Role** | เปลี่ยนรหัสผ่านเอง, แก้ไขชื่อ/เบอร์โทร, ดูประวัติการส่งงานย้อนหลัง |

สถานะงาน: `Open → Claimed → In Progress → Pending Review → Approved / Rejected` และ `Archived` (แสดงทับสถานะเดิม กู้คืนแล้วกลับเป็นสถานะเดิม)

## โครงสร้างโปรเจกต์

```
src/
  app/
    login/  setup/                หน้าเข้าสู่ระบบ / ตั้งค่าบัญชี Employer แรก
    (app)/                        หน้าที่ต้อง login (layout ตรวจสิทธิ์)
      tasks/                      Tab รายการงาน + Dashboard cards
      tasks/[id]/                 รายละเอียดงาน, รับงาน, ส่งงาน, ตรวจงาน, ประวัติ
      create/                     Tab เพิ่มรายการงาน (Employer)
      users/                      Tab จัดการบุคคล (Employer)
      account/                    ตั้งค่าบัญชี (ทุก Role)
  components/                     UI ที่ใช้ซ้ำ
  lib/
    api.ts                        ทุกการอ่าน/เขียน Firebase อยู่ที่นี่ไฟล์เดียว
    auth-context.tsx              สถานะ login + โปรไฟล์ (เตะผู้ใช้ที่ถูกปิดออกทันที)
    firebase.ts  types.ts  status.ts  format.ts  image.ts
firestore.rules                  สิทธิ์จริงบังคับที่นี่ (ฝั่ง server)
```

## โครงสร้างฐานข้อมูล (Firestore)

| Collection | Fields |
|---|---|
| `users/{uid}` | username, name, phone, role (`employer`/`employee`), status (`active`/`inactive`), created_at, updated_at |
| `users/{uid}/password_history/{id}` | user_id, changed_at |
| `tasks/{id}` | code (T-0001), title, description, location, assigned_type (`all`/`user`), assigned_user, assigned_user_name, status, due_date, is_archived, archived_at, created_by, created_by_name, created_at, updated_at, claimed_at, last_submitted_at |
| `tasks/{id}/submissions/{id}` | task_id, user_id, user_name, note, image_count, submitted_at, review_status, review_note, reviewed_by, reviewed_by_name, reviewed_at |
| `tasks/{id}/submissions/{id}/images/{id}` | data (รูป JPEG แบบ data URL ย่อเหลือไม่เกิน ~500KB), index, user_id, created_at — 1 รูปต่อ 1 เอกสาร |
| `meta/setup`, `meta/counters` | ใช้ภายในระบบ |

> **รหัสผ่านไม่ถูกเก็บใน Firestore** — Firebase Authentication จัดการและเข้ารหัสให้
> Username ถูกแปลงเป็นอีเมลภายใน `username@worklist.local` (ไม่มีการส่งอีเมลจริง)

## การติดตั้ง

ต้องมี **Node.js 20+** (https://nodejs.org) และบัญชี Firebase

### 1. สร้างโปรเจกต์ Firebase
1. ไปที่ https://console.firebase.google.com → **Add project**
2. **Build › Authentication › Get started** → เปิด **Email/Password**
3. **Build › Firestore Database › Create database** (Production mode, region `asia-southeast1`)
4. (ไม่ต้องเปิด Storage — รูปถูกเก็บใน Firestore)
5. **Project settings › General › Your apps › Web (</>)** → ลงทะเบียนแอป แล้วคัดลอกค่า config

### 2. ตั้งค่าและรันบนเครื่อง
```bash
npm install
cp .env.local.example .env.local     # แล้วกรอกค่า config จากข้อ 1.5
npm run dev                          # เปิด http://localhost:3000
```

### 3. Deploy Security Rules (สำคัญมาก — ห้ามข้าม)
```bash
npm install -g firebase-tools
firebase login
firebase use --add                   # เลือกโปรเจกต์ของคุณ
npm run deploy:rules
```

### 4. สร้าง Employer คนแรก
เปิด `/setup` (หน้า login จะมีลิงก์ให้ถ้ายังไม่มีผู้ดูแล) → สร้างบัญชี → จากนั้นเพิ่มผู้ใช้อื่นที่ Tab **จัดการบุคคล**
หน้า `/setup` ใช้ได้เพียงครั้งเดียว (บังคับด้วย rules)

## Deploy ขึ้น Production

**Vercel (แนะนำ ง่ายที่สุด)**
1. Push โค้ดขึ้น GitHub
2. https://vercel.com/new → Import repo
3. ใส่ Environment Variables ทั้งหมดจาก `.env.local` → Deploy
4. Firebase Console › Authentication › Settings › **Authorized domains** → เพิ่มโดเมน Vercel ของคุณ

**Firebase App Hosting** ก็ใช้ได้ (`firebase init apphosting`) โดยตั้ง env vars เดียวกัน

## หมายเหตุการออกแบบ

- **ลบงาน = Archive**: ไม่มีการลบจริง (`allow delete: if false`) กู้คืนได้ตลอด และ Employer เห็นงาน Archived ในตัวกรอง "ทั้งหมด"
- **รับงานได้คนเดียว**: ใช้ Firestore transaction + security rule ตรวจว่างานยัง `open` และยังไม่มีผู้รับ — ถ้าสองคนกดพร้อมกัน คนที่สองจะได้ข้อความ "งานนี้มีผู้รับไปแล้ว"
- **รูปภาพ**: เก็บใน Firestore (ไม่ต้องใช้ Storage/Blaze) โดยย่อในเบราว์เซอร์เป็น JPEG ด้านยาวสุด 1280px ไม่เกิน ~500KB ต่อรูป สูงสุด 10 รูป/ครั้ง — แพ็กเกจฟรีเก็บได้ 1GB (ประมาณ 4,000–6,000 รูป)
- **ลบรูปเก่าอัตโนมัติ**: รูปที่ส่งมาเกิน 60 วันจะถูกลบ (หมายเหตุ ผลตรวจ และประวัติยังอยู่) ทำงานในเบราว์เซอร์ของ Employer ตอนเปิดหน้ารายการงาน วันละครั้ง — ข้ามงานที่ยังรอตรวจ ปรับจำนวนวันได้ที่ `IMAGE_RETENTION_DAYS` ใน `src/lib/api.ts`
- **ปิดการใช้งานผู้ใช้**: ผู้ใช้ที่ `inactive` ถูก sign-out ทันทีและ rules ปฏิเสธทุกการเข้าถึง
- **เพิ่มผู้ใช้โดยไม่ต้องมี backend**: ใช้ Firebase app instance ที่สองสร้างบัญชี ทำให้ Employer ไม่ถูก logout
- **รีเซ็ตรหัสผ่านให้ผู้อื่น**: ทำที่ Firebase Console › Authentication (ถ้าต้องการปุ่มในระบบ ต่อยอดได้ด้วย Next.js API route + `firebase-admin`)
- Firebase Auth เปิดให้สมัครผ่าน API ได้ แต่บัญชีที่ไม่มีเอกสาร `users/{uid}` ที่ Employer สร้าง จะไม่มีสิทธิ์อ่าน/เขียนข้อมูลใด ๆ

## Scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน development server |
| `npm run build` / `npm start` | build และรัน production |
| `npm run typecheck` | ตรวจ TypeScript |
| `npm run deploy:rules` | deploy Firestore rules |
