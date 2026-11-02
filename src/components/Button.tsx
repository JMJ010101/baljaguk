import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary";

const base =
  "inline-flex min-h-12 w-full items-center justify-center rounded-button px-5 py-2 text-base font-bold";

// 마우스를 올리거나 키보드로 포커스(focus-visible)했을 때의 효과다. hover가 꺼진 버튼에는 붙이지 않는다.
// 움직임(떠오름, 확대)은 "동작 줄이기"에서 빠지고 색 변화만 남는다. 호버는 호버가 되는 기기에서만 적용된다.
const hoverBase =
  "motion-safe:transition-[filter,background-color,translate,scale] motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.03] motion-safe:focus-visible:-translate-y-0.5 motion-safe:focus-visible:scale-[1.03]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "border-2 border-primary bg-surface text-primary",
};

const hoverVariants: Record<Variant, string> = {
  primary: "hover:brightness-90 focus-visible:brightness-90",
  secondary: "hover:bg-primary-soft focus-visible:bg-primary-soft",
};

type Props = {
  variant?: Variant;
  children: ReactNode;
  // 호버와 포커스 효과를 켤지 정한다. 기본은 켜짐이다. 지도 안의 재시도 버튼처럼 빼야 하는 곳에서만 false로 둔다.
  hover?: boolean;
} & ({ href: string; onClick?: never } | { href?: never; onClick?: () => void });

export default function Button({
  variant = "primary",
  children,
  href,
  onClick,
  hover = true,
}: Props) {
  const className = hover ? `${base} ${variants[variant]} ${hoverBase} ${hoverVariants[variant]}` : `${base} ${variants[variant]}`;

  if (href !== undefined) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
