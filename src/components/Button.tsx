import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary";

const base =
  "inline-flex min-h-11 w-full items-center justify-center rounded-button px-5 py-2 text-base font-bold";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "border-2 border-primary bg-surface text-primary",
};

type Props = {
  variant?: Variant;
  children: ReactNode;
} & ({ href: string; onClick?: never } | { href?: never; onClick?: () => void });

export default function Button({
  variant = "primary",
  children,
  href,
  onClick,
}: Props) {
  const className = `${base} ${variants[variant]}`;

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
