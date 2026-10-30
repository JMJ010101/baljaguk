"use client";

import Image from "next/image";
import { useState } from "react";

const THUMBNAIL_SIZE = 88;
// 공공누리 유형. Type1은 출처표시(권장), Type3은 거기에 변경금지다. (매뉴얼 Ver4.1)
const COPYRIGHT_CROP_ALLOWED = "Type1";

type Props = {
  imageUrl?: string;
  // 이미지 저작권 유형(cpyrhtDivCd). Type1일 때만 잘라서 채운다.
  copyright?: string;
  size: "thumbnail" | "hero";
  // 대표 사진처럼 내용이 의미 있을 때만 넘긴다. 썸네일은 옆의 이름이 있어 비워 둔다.
  alt?: string;
};

function Placeholder({ size }: { size: Props["size"] }) {
  const hero = size === "hero";
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 flex-col items-center justify-center gap-2 bg-primary-soft text-muted ${
        hero ? "aspect-3/2 w-full rounded-card" : "size-22 rounded-button"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={hero ? 48 : 32}
        height={hero ? 48 : 32}
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
      {hero && <span className="text-base">사진이 없어요</span>}
    </div>
  );
}

// 이미지가 없거나 불러오지 못하면 대체 표시를 보여준다.
// 이미지는 변형하지 않는다. (CLAUDE.md) 그래서 최적화를 끄고 원본 주소를 그대로 쓴다.
// 화면에서 자르는 것도 피한다. Type1이 아니면(Type3, 값이 없거나 모르는 값) object-contain으로 전체를 보여준다.
// TODO(확인 필요): "변경금지"가 화면 표시 방식(자르기)까지 포함하는지는 확인하지 못했다. 그래서 보수적으로 자르지 않는다.
export default function PlaceImage({ imageUrl, copyright, size, alt = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (imageUrl === undefined || failed) return <Placeholder size={size} />;

  const fit = copyright === COPYRIGHT_CROP_ALLOWED ? "object-cover" : "object-contain";

  if (size === "hero") {
    return (
      <div className="relative aspect-3/2 w-full overflow-hidden rounded-card bg-primary-soft">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          unoptimized
          onError={() => setFailed(true)}
          className={fit}
        />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={THUMBNAIL_SIZE}
      height={THUMBNAIL_SIZE}
      unoptimized
      onError={() => setFailed(true)}
      className={`size-22 shrink-0 rounded-button bg-primary-soft ${fit}`}
    />
  );
}
