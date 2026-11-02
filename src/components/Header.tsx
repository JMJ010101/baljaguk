import Image from "next/image";
import Link from "next/link";
import { PAGE_WIDTH_CLASS } from "@/components/PageContainer";

const linkClass = "inline-flex min-h-11 items-center font-bold";
// 본문(PageContainer wide)과 같은 폭 단계를 쓴다. 완전한 문자열 상수끼리만 이어 붙인다.
const headerClass = `mx-auto flex min-h-14 w-full max-w-md items-center justify-between px-4 ${PAGE_WIDTH_CLASS.wide}`;

export default function Header() {
  return (
    <header className={headerClass}>
      <Link href="/" className={linkClass}>
        <Image src="/logo.png" alt="발자국" width={600} height={400} className="h-16 w-auto" />
      </Link>
      <nav className="flex items-center gap-5">
        <Link href="/places" className={`${linkClass} text-base`}>
          장소
        </Link>
        <Link href="/course/new" className={`${linkClass} text-base`}>
          코스 만들기
        </Link>
      </nav>
    </header>
  );
}
