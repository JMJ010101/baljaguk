"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Pagination from "@/components/Pagination";
import PlaceCard from "@/components/PlaceCard";
import { PlacesEmpty, PlacesError, PlacesLoading } from "@/components/places/PlacesStatus";
import { buildPlacesApiUrl, buildPlacesHref, getPageCount, parsePlacesQuery } from "@/lib/placesQuery";
import { CONTENT_TYPES } from "@/lib/tour/contentTypes";
import type { Place, SidoListState } from "@/types";

type ListOutcome =
  | { kind: "ok"; places: Place[]; totalCount?: number }
  | { kind: "error"; code: string; message?: string };

// 네트워크 실패나 형식이 다른 응답은 API_FAILED로 본다.
const FALLBACK_ERROR: ListOutcome = { kind: "error", code: "API_FAILED" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// 우리 API(/api/places)의 응답만 읽는다. 원본 에러 내용은 쓰지 않고 code와 사용자용 message만 읽는다.
async function fetchPlaces(url: string, signal: AbortSignal): Promise<ListOutcome> {
  try {
    const res = await fetch(url, { signal });
    const json: unknown = await res.json();
    if (!isRecord(json)) return FALLBACK_ERROR;

    if (res.ok) {
      if (!Array.isArray(json.places)) return FALLBACK_ERROR;
      return {
        kind: "ok",
        places: json.places as Place[],
        totalCount: typeof json.totalCount === "number" ? json.totalCount : undefined,
      };
    }

    const error = json.error;
    if (isRecord(error) && typeof error.code === "string") {
      return { kind: "error", code: error.code, message: typeof error.message === "string" ? error.message : undefined };
    }
    return FALLBACK_ERROR;
  } catch {
    return FALLBACK_ERROR;
  }
}

const fieldClass = "min-h-12 w-full rounded-button border-2 border-accent bg-surface px-3 text-base disabled:opacity-60";

export default function PlacesExplorer({ sidoState }: { sidoState: SidoListState }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 시도 목록을 쓸 수 없으면 URL의 sido는 무시한다.
  const sidoRegions = sidoState.status === "ok" ? sidoState.regions : [];
  const query = parsePlacesQuery(
    searchParams,
    sidoRegions.map((region) => region.code),
  );

  const apiUrl = buildPlacesApiUrl(query);
  const [retryCount, setRetryCount] = useState(0);
  const requestKey = `${apiUrl}#${retryCount}`;
  const [response, setResponse] = useState<{ key: string; outcome: ListOutcome } | null>(null);

  // 선택 값(시도, 타입, 페이지)이나 재시도 횟수가 바뀔 때마다 /api/places를 호출한다.
  // 응답이 현재 요청의 것이 아니면 로딩 중으로 본다. (effect 안에서 동기적으로 setState하지 않는다.)
  useEffect(() => {
    const controller = new AbortController();
    fetchPlaces(apiUrl, controller.signal).then((outcome) => {
      if (!controller.signal.aborted) setResponse({ key: requestKey, outcome });
    });
    return () => controller.abort();
  }, [apiUrl, requestKey]);

  const outcome = response?.key === requestKey ? response.outcome : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="sido" className="font-bold">
            지역
          </label>
          <select
            id="sido"
            className={fieldClass}
            disabled={sidoState.status !== "ok"}
            value={query.sido ?? ""}
            onChange={(e) =>
              router.push(buildPlacesHref({ ...query, sido: e.target.value === "" ? undefined : e.target.value, page: 1 }), {
                scroll: false,
              })
            }
          >
            <option value="">전체 지역</option>
            {sidoRegions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
          {sidoState.status === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-base text-muted">지역 목록을 불러오지 못했어요. 전체 지역의 장소는 볼 수 있어요.</p>
              <Button variant="secondary" onClick={() => router.refresh()}>
                지역 목록 다시 불러오기
              </Button>
            </div>
          )}
          {sidoState.status === "empty" && (
            <p className="text-base text-muted">지역 목록이 비어 있어요. 전체 지역의 장소는 볼 수 있어요.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p id="type-label" className="font-bold">
            장소 유형
          </p>
          <div role="group" aria-labelledby="type-label" className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => {
              const selected = type.id === query.type;
              return (
                <Link
                  key={type.id}
                  href={buildPlacesHref({ ...query, type: type.id, page: 1 })}
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-tag border-2 px-4 text-base ${
                    selected
                      ? "border-primary bg-primary-soft font-bold text-primary"
                      : "border-accent bg-surface text-foreground"
                  }`}
                >
                  {type.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-busy={outcome === null}>
        {outcome === null && <PlacesLoading />}
        {outcome?.kind === "error" && (
          <PlacesError
            code={outcome.code}
            message={outcome.message}
            onRetry={() => setRetryCount((count) => count + 1)}
          />
        )}
        {outcome?.kind === "ok" && outcome.places.length === 0 && (
          <PlacesEmpty
            pageOverflow={query.page > 1}
            firstPageHref={buildPlacesHref({ ...query, page: 1 })}
          />
        )}
        {outcome?.kind === "ok" && outcome.places.length > 0 && (
          <div className="flex flex-col gap-4">
            {outcome.totalCount !== undefined && (
              <p className="text-base text-muted">{outcome.totalCount.toLocaleString("ko-KR")}곳</p>
            )}
            <ul className="flex flex-col gap-4">
              {outcome.places.map((place) => (
                <li key={place.id}>
                  <PlaceCard place={place} href={`/places/${place.id}`} />
                </li>
              ))}
            </ul>
            {outcome.totalCount !== undefined && getPageCount(outcome.totalCount) > 1 && (
              <Pagination
                page={query.page}
                pageCount={getPageCount(outcome.totalCount)}
                buildHref={(page) => buildPlacesHref({ ...query, page })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
