import type { ReactNode } from "react";
import Button from "@/components/Button";
import StatusScreen from "@/components/StatusScreen";

// 장소 목록 영역의 상태 화면들이다. 문구는 DESIGN.md의 "세부 문구 확정"이 정해지기 전의 초안이다.
// 서버 에러의 원본 내용은 받지 않는다. 사용자용 message만 받는다.
const FALLBACK_ERROR_DESCRIPTION = "잠시 후 다시 시도해 주세요.";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// 로딩은 기다리면 끝나는 상태라 다음 행동 버튼이 없다. (DESIGN.md에 예외로 적었다.)
export function PlacesLoading() {
  return (
    <div role="status">
      <StatusScreen
        variant="inline"
        icon={
          <Icon>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </Icon>
        }
        title="장소를 불러오고 있어요"
        description="잠시만 기다려 주세요."
      />
    </div>
  );
}

export function PlacesEmpty({ pageOverflow, firstPageHref }: { pageOverflow: boolean; firstPageHref: string }) {
  return (
    <StatusScreen
      variant="inline"
      icon={
        <Icon>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </Icon>
      }
      title={pageOverflow ? "이 페이지에는 장소가 없어요" : "조건에 맞는 장소가 없어요"}
      description={pageOverflow ? "첫 페이지부터 다시 볼 수 있어요." : "다른 지역이나 유형을 골라 보세요."}
    >
      {pageOverflow ? (
        <Button href={firstPageHref}>첫 페이지로</Button>
      ) : (
        <Button href="/places">필터 초기화</Button>
      )}
    </StatusScreen>
  );
}

// 오류 코드별로 제목과 다음 행동이 다르다. 코드와 원본 메시지는 화면에 보이지 않는다.
export function PlacesError({ code, message, onRetry }: { code: string; message?: string; onRetry: () => void }) {
  const warningIcon = (
    <Icon>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Icon>
  );

  if (code === "RATE_LIMIT") {
    return (
      <StatusScreen
        variant="inline"
        icon={warningIcon}
        title="조회 가능 횟수를 넘었어요"
        description={message ?? FALLBACK_ERROR_DESCRIPTION}
      >
        <Button href="/">처음으로</Button>
      </StatusScreen>
    );
  }

  if (code === "INVALID_INPUT") {
    return (
      <StatusScreen
        variant="inline"
        icon={warningIcon}
        title="조건을 확인해 주세요"
        description="선택한 조건으로는 장소를 찾을 수 없어요."
      >
        <Button href="/places">필터 초기화</Button>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      variant="inline"
      icon={warningIcon}
      title="장소를 불러오지 못했어요"
      description={message ?? FALLBACK_ERROR_DESCRIPTION}
    >
      <Button onClick={onRetry}>다시 시도</Button>
    </StatusScreen>
  );
}
