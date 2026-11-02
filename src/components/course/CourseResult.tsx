import Link from "next/link";
import Button from "@/components/Button";
import CopyLinkButton from "@/components/course/CopyLinkButton";
import CourseMap from "@/components/course/CourseMap";
import PageContainer from "@/components/PageContainer";
import PlaceCard from "@/components/PlaceCard";
import Tag from "@/components/Tag";
import VisitCheckNotice from "@/components/VisitCheckNotice";
import { buildMapStops } from "@/lib/course/mapStops";
import type { CoursePlace } from "@/lib/course/places";
import { buildRecreateHref } from "@/lib/course/prefill";
import { missingTypeNotices, placeCountLabel } from "@/lib/course/summary";
import type { PublicCourse } from "@/lib/course/types";
import { supportsOperatingInfo } from "@/lib/tour/normalize";

// 코스 결과 화면이다. 저장용 타입이 아니라 PublicCourse만 받는다. (사용자가 쓴 분위기는 이 화면에 오지 않는다)
// 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다.
// TODO(확인 필요): 카드 링크에 ?course=를 싣고 상세의 "코스로 돌아가기"를 연결하는 일은 이번 범위가 아니다. (카드는 /places/<id>로만 간다)
// 지도는 이미 읽은 장소의 좌표만 쓴다. (mapStops.ts) 지도가 실패해도 카드 목록은 그대로 보인다.
// TODO(확인 필요): 지역 이름 칩은 코드를 이름으로 바꾸는 호출이 필요해서 만들지 않았다. (summary.ts 참고)
// TODO(확인 필요): 사진 출처 표기 조건을 확인하기 전이라 사진 출처 문구는 쓰지 않는다.

function NumberBadge({ order }: { order: number }) {
  return (
    <span
      role="img"
      aria-label={`${order}번째 장소`}
      className="flex size-7 shrink-0 items-center justify-center rounded-tag bg-primary text-sm font-bold text-on-primary"
    >
      {order}
    </span>
  );
}

function ClockIcon() {
  return (
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function StopCard({ stop, order }: { stop: Extract<CoursePlace, { kind: "ok" }>; order: number }) {
  const { place, detail, stale } = stop;
  return (
    <PlaceCard
      hover={false}
      place={place}
      href={`/places/${place.id}`}
      badge={<NumberBadge order={order} />}
      footer={
        <>
          {detail.acmpyTypeCd !== undefined && (
            <div>
              <Tag>{detail.acmpyTypeCd}</Tag>
            </div>
          )}
          {supportsOperatingInfo(place.contentTypeId) && (
            <p className="flex items-start gap-1 text-base text-muted">
              <ClockIcon />
              <span className="line-clamp-3 whitespace-pre-line">
                <span className="font-bold">운영시간</span> {detail.hours ?? "정보 없음"}
              </span>
            </p>
          )}
          {stale && <p className="text-base text-muted">정보가 오래됐을 수 있어요.</p>}
          <VisitCheckNotice hover={false} />
        </>
      }
    />
  );
}

// 장소 정보를 가져오지 못한 자리다. 순서 번호는 유지한다.
function FailedStop({ stop, order }: { stop: Extract<CoursePlace, { kind: "failed" }>; order: number }) {
  const body = (
    <div className="flex items-start gap-3">
      <NumberBadge order={order} />
      <div className="flex flex-col gap-1">
        {stop.reason === "not-found" ? (
          <p className="text-lg font-bold">이 장소는 더 이상 확인되지 않아요.</p>
        ) : (
          <>
            <p className="text-lg font-bold">이 장소 정보를 불러오지 못했어요.</p>
            <p className="text-base text-muted">눌러서 장소 정보를 확인해 보세요.</p>
          </>
        )}
      </div>
    </div>
  );
  const className = "block rounded-card bg-surface p-4 shadow-card";
  if (stop.reason === "not-found") return <div className={className}>{body}</div>;
  return (
    <Link href={`/places/${stop.placeId}`} className={className}>
      {body}
    </Link>
  );
}

export default function CourseResult({ course, places }: { course: PublicCourse; places: CoursePlace[] }) {
  const notices = missingTypeNotices(course.missingTypes);
  const { stops: mapStops, hiddenCount } = buildMapStops(places);

  return (
    <PageContainer width="reading">
      <h1 className="text-2xl font-bold">하루 코스가 만들어졌어요</h1>
      <p className="mt-2 text-base text-muted">반려동물 동반 정보가 있는 장소로 골랐어요. 방문 전 확인이 필요해요.</p>
      <div className="mt-4">
        <Tag>{placeCountLabel(places.length)}</Tag>
      </div>

      {notices.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 rounded-card bg-primary-soft px-4 py-3 text-base">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      )}

      <CourseMap stops={mapStops} hiddenCount={hiddenCount} />

      <ol className="mt-6 flex flex-col gap-4">
        {places.map((stop, index) => (
          <li key={stop.kind === "ok" ? stop.place.id : stop.placeId}>
            {stop.kind === "ok" ? <StopCard stop={stop} order={index + 1} /> : <FailedStop stop={stop} order={index + 1} />}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3">
        <CopyLinkButton courseId={course.id} />
        <Button
          href={buildRecreateHref({ sido: course.sido, sigungu: course.sigungu, types: course.types })}
          variant="secondary"
        >
          다시 만들기
        </Button>
      </div>

      <p className="mt-8 text-center text-base text-muted">장소 정보는 한국관광공사 데이터를 바탕으로 해요.</p>
    </PageContainer>
  );
}
