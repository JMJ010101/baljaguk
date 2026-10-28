import type { ReactNode } from "react";

export default function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-tag bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
      {children}
    </span>
  );
}
