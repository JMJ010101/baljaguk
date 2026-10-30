import Link from "next/link";
import PlaceImage from "@/components/PlaceImage";
import Tag from "@/components/Tag";
import { getContentTypeLabel } from "@/lib/tour/contentTypes";
import type { Place } from "@/types";

// 카드는 동반 조건이나 운영시간을 보여주지 않는다. 그래서 "방문 전 확인 필요"도 넣지 않는다. (상세 화면에서 보여준다.)
export default function PlaceCard({ place, href }: { place: Place; href: string }) {
  const typeLabel = getContentTypeLabel(place.contentTypeId);

  return (
    <Link href={href} className="block rounded-card bg-surface p-4 shadow-card">
      <article className="flex gap-4">
        <PlaceImage size="thumbnail" imageUrl={place.imageUrl} copyright={place.imageCopyright} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <h2 className="text-lg font-bold">{place.title}</h2>
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
    </Link>
  );
}
