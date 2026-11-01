import Link from "next/link";
import type { ReactNode } from "react";
import PlaceImage from "@/components/PlaceImage";
import Tag from "@/components/Tag";
import { getContentTypeLabel } from "@/lib/tour/contentTypes";
import type { Place } from "@/types";

type Props = {
  place: Place;
  href: string;
  // 제목 앞에 붙는 표시(코스의 순서 번호 등). 없으면 제목만 그린다.
  badge?: ReactNode;
  // 카드 아래 줄이다. 카드 전체가 링크라서 링크나 버튼을 넣지 않는다.
  footer?: ReactNode;
};

// 카드는 기본으로 동반 조건이나 운영시간을 보여주지 않는다. 그래서 "방문 전 확인 필요"도 넣지 않는다. (상세 화면에서 보여준다.)
// 코스 화면처럼 footer로 동반 조건이나 운영시간을 보여 주는 쪽이 "방문 전 확인 필요"를 함께 넣는다.
export default function PlaceCard({ place, href, badge, footer }: Props) {
  const typeLabel = getContentTypeLabel(place.contentTypeId);
  const title = <h2 className="text-lg font-bold">{place.title}</h2>;

  return (
    <Link href={href} className="block rounded-card bg-surface p-4 shadow-card">
      <article className="flex gap-4">
        <PlaceImage size="thumbnail" imageUrl={place.imageUrl} copyright={place.imageCopyright} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          {badge === undefined ? (
            title
          ) : (
            <div className="flex items-start gap-2">
              {badge}
              {title}
            </div>
          )}
          {place.address !== undefined && (
            <p className="flex items-start gap-1 text-base text-muted">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-1 shrink-0"
              >
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{place.address}</span>
            </p>
          )}
          {typeLabel !== undefined && <Tag>{typeLabel}</Tag>}
        </div>
      </article>
      {footer !== undefined && <div className="mt-3 flex flex-col gap-2">{footer}</div>}
    </Link>
  );
}
