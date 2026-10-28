import Link from "next/link";

const linkClass = "inline-flex min-h-11 items-center font-bold";

export default function Header() {
  return (
    <header className="mx-auto flex min-h-14 w-full max-w-md items-center justify-between px-4">
      <Link href="/" className={`${linkClass} text-2xl text-primary`}>
        발자국
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
