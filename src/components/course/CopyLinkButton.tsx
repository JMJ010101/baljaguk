"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { buildCourseShareUrl } from "@/lib/course/courseLink";

type CopyState = "idle" | "copied" | "failed";

// 코스 링크를 복사한다. 주소는 현재 사이트 주소와 코스 id만으로 만든다. (쿼리 없음)
// 클립보드는 https나 localhost에서만 되고 거절될 수도 있어서, 실패하면 주소를 보여 주고 직접 복사하게 한다.
export default function CopyLinkButton({ courseId }: { courseId: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [url, setUrl] = useState("");

  async function copy() {
    const shareUrl = buildCourseShareUrl(window.location.origin, courseId);
    if (shareUrl === undefined) {
      setState("failed");
      return;
    }
    setUrl(shareUrl);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={copy}>
        <span className="inline-flex items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </svg>
          링크 복사하기
        </span>
      </Button>
      <div role="status" aria-live="polite">
        {state === "copied" && <p className="text-center text-base text-muted">링크를 복사했어요.</p>}
        {state === "failed" && (
          <div className="flex flex-col gap-2">
            <p className="text-base text-danger">복사하지 못했어요. 아래 주소를 직접 복사해 주세요.</p>
            {url !== "" && (
              <input
                readOnly
                value={url}
                aria-label="코스 링크"
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-12 w-full rounded-button border-2 border-accent bg-surface px-3 text-base"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
