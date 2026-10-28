import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  // 다음 행동 버튼들. 주 버튼은 하나만 둔다.
  children: ReactNode;
};

export default function StatusScreen({
  icon,
  title,
  description,
  children,
}: Props) {
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
