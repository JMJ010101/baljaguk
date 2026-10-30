import Link from "next/link";
import InfoRow from "@/components/places/InfoRow";
import InfoSection from "@/components/places/InfoSection";
import PlaceImage from "@/components/PlaceImage";
import Tag from "@/components/Tag";
import { getContentTypeLabel } from "@/lib/tour/contentTypes";
import { supportsOperatingInfo } from "@/lib/tour/normalize";
import type { Place, PlaceDetail } from "@/types";

type Props = {
  place: Place;
  detail: PlaceDetail;
  // 목록의 필터(?sido=&type=&page=)를 유지한 목록 주소다.
  backHref: string;
};

// 와이어프레임의 "‹ 장소 상세" 상단 바 대신 전역 Header 아래에 "‹ 목록으로" 행을 둔다. (DESIGN.md에 기록)
// 지도(위치), 사진 출처 줄, 코스 만들기 버튼은 이번 범위 밖이라 두지 않는다.
export default function PlaceDetailView({ place, detail, backHref }: Props) {
  const typeLabel = getContentTypeLabel(place.contentTypeId);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12">
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 text-base font-bold text-primary">
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
          <path d="m15 18-6-6 6-6" />
        </svg>
        목록으로
      </Link>

      <div className="mt-2">
        <PlaceImage size="hero" imageUrl={place.imageUrl} copyright={place.imageCopyright} alt={`${place.title} 대표 사진`} />
      </div>

      <h1 className="mt-4 text-2xl font-bold">{place.title}</h1>
      {place.address !== undefined && (
        <p className="mt-2 flex items-start gap-1 text-base text-muted">
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
      {typeLabel !== undefined && (
        <div className="mt-3">
          <Tag>{typeLabel}</Tag>
        </div>
      )}

      <InfoSection title="반려동물 동반 정보">
        <dl className="flex flex-col gap-3">
          <InfoRow label="동반 구분" value={detail.acmpyTypeCd} />
          <InfoRow label="동반 가능 동물" value={detail.acmpyPsblCpam} />
          <InfoRow label="필요 사항" value={detail.acmpyNeedMtr} />
          <InfoRow label="기타 안내" value={detail.etcAcmpyInfo} />
          <InfoRow label="관련 사고 대비사항" value={detail.relaAcdntRiskMtr} />
        </dl>
      </InfoSection>

      {supportsOperatingInfo(place.contentTypeId) ? (
        <InfoSection title="운영 정보">
          <dl className="flex flex-col gap-3">
            <InfoRow label="운영시간" value={detail.hours} />
            <InfoRow label="쉬는 날" value={detail.rest} />
          </dl>
        </InfoSection>
      ) : (
        // 행사(15)와 숙박(32)은 운영시간과 쉬는 날 개념이 달라 읽지 않는다. "정보 없음"과 구분해 안내만 한다.
        <InfoSection title="운영 정보" showNotice={false}>
          <p className="text-base text-muted">이 유형의 운영시간과 쉬는 날은 이번 화면에서는 보여 주지 않아요.</p>
        </InfoSection>
      )}

      <p className="mt-8 text-center text-base text-muted">장소 정보와 사진은 한국관광공사 데이터를 바탕으로 해요.</p>
    </main>
  );
}
