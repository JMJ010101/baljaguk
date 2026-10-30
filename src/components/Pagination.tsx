import Button from "@/components/Button";

type Props = {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
};

// 번호 목록 대신 이전 / 현재 / 다음만 보여준다. (모바일 360px 기준)
export default function Pagination({ page, pageCount, buildHref }: Props) {
  return (
    <nav aria-label="페이지 이동" className="flex items-center gap-3">
      <div className="flex-1">
        {page > 1 && (
          <Button href={buildHref(page - 1)} variant="secondary">
            이전
          </Button>
        )}
      </div>
      <p className="shrink-0 text-base text-muted" aria-current="page">
        {page} / {pageCount}
      </p>
      <div className="flex-1">
        {page < pageCount && (
          <Button href={buildHref(page + 1)} variant="secondary">
            다음
          </Button>
        )}
      </div>
    </nav>
  );
}
