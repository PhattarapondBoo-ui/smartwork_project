import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandMark, BrandName, HeroPattern } from "@/components/Brand";
import { ORG } from "@/lib/org";
import { IMAGE_RETENTION_DAYS } from "@/lib/retention";

export const metadata: Metadata = { title: "ประกาศความเป็นส่วนตัว · Clean Dee" };

/**
 * Privacy notice (PDPA). A practical starting template — have it reviewed by a
 * lawyer and fill in ORG details in src/lib/org.ts before going live.
 */
export default function PrivacyPage() {
  const effective = new Date(`${ORG.effectiveDate}T00:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <BrandName />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </Link>
      </div>

      <section className="relative mb-6 overflow-hidden rounded-xl rounded-br-[3rem] bg-brand-600 px-6 py-8 text-white">
        <HeroPattern className="pointer-events-none absolute inset-y-0 right-0 h-full w-full opacity-60 sm:w-[55%] sm:opacity-100" />
        <div className="relative">
          <ShieldCheck className="h-8 w-8 text-white/80" />
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">ประกาศความเป็นส่วนตัว</h1>
          <p className="mt-2 text-sm font-light text-white/85">
            สำหรับผู้ใช้ระบบ Clean Dee ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) · มีผลตั้งแต่ {effective}
          </p>
        </div>
      </section>

      <article className="glass space-y-7 rounded-xl p-6 text-[15px] leading-relaxed text-gray-700 shadow-sm ring-1 ring-gray-200/80 sm:p-8">
        <Section title="1. ผู้ควบคุมข้อมูลส่วนบุคคล">
          <p>
            {ORG.name} (“ผู้ดูแลระบบ”) เป็นผู้เก็บและใช้ข้อมูลส่วนบุคคลของผู้ใช้ระบบ Clean Dee ซึ่งใช้มอบหมายงานทำความสะอาด
            ตรวจงาน และจ่ายค่าตอบแทนให้ผู้รับจ้าง
          </p>
        </Section>

        <Section title="2. ข้อมูลที่เราเก็บ">
          <ul className="list-disc space-y-1 pl-5">
            <li>ข้อมูลบัญชี: ชื่อ-นามสกุล ชื่อผู้ใช้ เบอร์โทรศัพท์ สิทธิ์การใช้งาน (รหัสผ่านถูกเข้ารหัสโดย Firebase Authentication เราไม่เห็นรหัสผ่านของคุณ)</li>
            <li>ข้อมูลการทำงาน: งานที่รับ เวลาที่รับและส่งงาน หมายเหตุ ผลการตรวจงาน</li>
            <li>รูปถ่ายผลงานที่ผู้รับจ้างแนบตอนส่งงาน</li>
            <li>ข้อมูลการรับเงิน: หมายเลขพร้อมเพย์ (เบอร์มือถือหรือเลขประจำตัวประชาชน) ยอดค่าตอบแทน ภาษีที่หักไว้ (ถ้ามี) และรูปสลิปการโอน</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">
            แนะนำให้ใช้<strong>เบอร์มือถือ</strong>เป็นพร้อมเพย์แทนเลขประจำตัวประชาชน เพื่อลดการเปิดเผยข้อมูลที่อ่อนไหว
          </p>
        </Section>

        <Section title="3. วัตถุประสงค์และฐานทางกฎหมาย">
          <ul className="list-disc space-y-1 pl-5">
            <li>มอบหมาย ติดตาม และตรวจงาน — เพื่อปฏิบัติตามสัญญาจ้างทำของระหว่างผู้ดูแลระบบกับผู้รับจ้าง</li>
            <li>จ่ายค่าตอบแทนและเก็บหลักฐานการจ่าย — เพื่อปฏิบัติตามสัญญา และหน้าที่ตามกฎหมายภาษีและการบัญชี</li>
            <li>รักษาความปลอดภัยของระบบและป้องกันการใช้งานโดยมิชอบ — ประโยชน์โดยชอบด้วยกฎหมายของผู้ดูแลระบบ</li>
          </ul>
        </Section>

        <Section title="4. ใครเห็นข้อมูลของคุณ">
          <ul className="list-disc space-y-1 pl-5">
            <li>ผู้ดูแลระบบ เห็นข้อมูลของผู้ใช้ทุกคนเท่าที่จำเป็นต่อการจัดการงานและการจ่ายเงิน</li>
            <li>ผู้รับจ้าง เห็นเฉพาะงานที่ตนรับหรือที่เปิดให้ทุกคน และข้อมูลการเงินของตนเองเท่านั้น หมายเลขพร้อมเพย์ของคุณไม่แสดงต่อผู้รับจ้างคนอื่น</li>
            <li>
              ผู้ให้บริการระบบ: Google Firebase (เก็บข้อมูลและยืนยันตัวตน) และ Vercel (แสดงผลเว็บไซต์) ซึ่งอาจเก็บข้อมูลบนเซิร์ฟเวอร์นอกประเทศไทย
              โดยผู้ให้บริการเหล่านี้มีมาตรการคุ้มครองข้อมูลตามมาตรฐานสากล
            </li>
            <li>หน่วยงานรัฐ เช่น กรมสรรพากร เมื่อกฎหมายกำหนด</li>
          </ul>
        </Section>

        <Section title="5. ระยะเวลาเก็บข้อมูล">
          <ul className="list-disc space-y-1 pl-5">
            <li>รูปถ่ายผลงาน: ลบอัตโนมัติหลังส่งงาน {IMAGE_RETENTION_DAYS} วัน (หมายเหตุและผลตรวจยังเก็บไว้)</li>
            <li>ข้อมูลการจ่ายเงินและสลิป: เก็บอย่างน้อย 5 ปี ตามระยะเวลาเก็บเอกสารทางบัญชีและภาษี</li>
            <li>ข้อมูลบัญชีผู้ใช้: เก็บตลอดระยะเวลาที่ใช้งาน และเมื่อเลิกใช้งาน จะปิดบัญชีและลบหรือทำให้ไม่ระบุตัวตนเมื่อพ้นหน้าที่ทางกฎหมาย</li>
          </ul>
        </Section>

        <Section title="6. สิทธิของคุณ">
          <p>
            คุณมีสิทธิขอเข้าถึงหรือขอสำเนา ขอแก้ไขให้ถูกต้อง ขอลบหรือระงับการใช้ ขอคัดค้าน และขอโอนย้ายข้อมูลส่วนบุคคลของคุณ
            รวมถึงร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) ทั้งนี้บางคำขออาจถูกจำกัดเมื่อต้องเก็บข้อมูลไว้ตามกฎหมาย
            เช่น หลักฐานการจ่ายเงิน
          </p>
          <p className="mt-2">คุณแก้ไขชื่อ เบอร์โทร และพร้อมเพย์ของตัวเองได้ที่หน้า “บัญชี”</p>
        </Section>

        <Section title="7. ความปลอดภัย">
          <p>
            ระบบจำกัดสิทธิ์การเข้าถึงตามบทบาท (ผู้ดูแลระบบ / ผู้รับจ้าง) เชื่อมต่อแบบเข้ารหัส (HTTPS) และไม่เก็บรหัสผ่านในฐานข้อมูล
            Clean Dee <strong>ไม่ได้รับหรือโอนเงินแทนใคร</strong> — การโอนเงินทำผ่านแอปธนาคารของผู้จ่ายโดยตรง
          </p>
        </Section>

        <Section title="8. ติดต่อเรา">
          <p>
            {ORG.name}
            <br />
            อีเมล: {ORG.email} · โทร: {ORG.phone}
          </p>
        </Section>

        <p className="border-t border-dashed border-gray-200 pt-5 text-xs text-gray-400">
          ประกาศนี้อาจปรับปรุงเป็นครั้งคราว หากมีการเปลี่ยนแปลงที่สำคัญจะแจ้งให้ผู้ใช้ทราบผ่านระบบ
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-medium text-brand-700">{title}</h2>
      {children}
    </section>
  );
}
