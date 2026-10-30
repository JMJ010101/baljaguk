"use client";

import Image from "next/image";
import { useState } from "react";

const SIZE = 88;

// 이미지가 없거나 불러오지 못하면 대체 표시를 보여준다.
export default function PlaceThumbnail({ imageUrl }: { imageUrl?: string }) {
  const [failed, setFailed] = useState(false);

  if (imageUrl === undefined || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-22 shrink-0 items-center justify-center rounded-button bg-primary-soft text-muted"
      >
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m21 15-4.5-4.5L8 19" />
        </svg>
      </div>
    );
  }

  // 이미지는 변형하지 않는다. (CLAUDE.md: cpyrhtDivCd가 Type3이면 자르기, 필터 등 금지) 그래서 최적화를 끈다.
  return (
    <Image
      src={imageUrl}
      alt=""
      width={SIZE}
      height={SIZE}
      unoptimized
      onError={() => setFailed(true)}
      className="size-22 shrink-0 rounded-button object-cover"
    />
  );
}
