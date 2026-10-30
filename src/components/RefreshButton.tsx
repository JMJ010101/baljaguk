"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";

// 서버 컴포넌트가 그려 준 화면을 다시 불러온다. 서버에서 조회한 결과가 오류였을 때의 "다시 시도"다.
export default function RefreshButton({ children }: { children: string }) {
  const router = useRouter();
  return <Button onClick={() => router.refresh()}>{children}</Button>;
}
