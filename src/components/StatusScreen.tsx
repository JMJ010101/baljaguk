import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  // 다음 행동 버튼들. 주 버튼은 하나만 둔다. inline 변형의 로딩 상태에서만 비운다.
  children?: ReactNode;
  // page: 화면 전체 상태(기본). inline: 페이지 안의 영역(목록 등)에서 쓰는 상태.
  variant?: "page" | "inline";
};

export default function StatusScreen({
  icon,
  title,
  description,
  children,
  variant = "page",
}: Props) {
  if (variant === "inline") {
    return (
      <section className="flex w-full flex-col items-center px-4 py-10 text-center">
        <div
          aria-hidden="true"
          className="flex size-20 items-center justify-center rounded-tag bg-primary-soft text-primary"
        >
          {icon}
        </div>
        <h2 className="mt-4 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-base text-muted">{description}</p>
        {children !== undefined && <div className="mt-6 flex w-full flex-col gap-3">{children}</div>}
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pt-20 text-center">
      <div
        aria-hidden="true"
        className="flex size-24 items-center justify-center rounded-tag bg-primary-soft text-primary"
      >
        {icon}
      </div>
      <h1 className="mt-6 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-base text-muted">{description}</p>
      <div className="mt-8 flex w-full flex-col gap-3">{children}</div>
    </main>
  );
}
