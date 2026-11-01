import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CourseResult from "@/components/course/CourseResult";
import CourseStatus, { type CourseStatusKind } from "@/components/course/CourseStatus";
import { loadCoursePlaces, type CoursePlace } from "@/lib/course/places";
import type { PublicCourse } from "@/lib/course/types";
import { getCourse } from "@/lib/db/courses";
import { AppError } from "@/lib/errors";
import { enforcePlacesRateLimit } from "@/lib/rateLimit";

export const metadata: Metadata = {
  title: "하루 코스 | 발자국",
};

type LoadResult =
  | { kind: "ok"; course: PublicCourse; places: CoursePlace[] }
  | { kind: "missing" }
  | { kind: "status"; status: CourseStatusKind; message?: string };

// 조회와 분류만 한다. (react-hooks/error-boundaries 때문에 JSX는 try 밖에서 만든다.)
// 장소는 캐시에서 읽고, 캐시에 없는 장소가 있을 때만 호출 한도를 한 번 센다. (loadCoursePlaces 참고)
async function load(id: string, requestHeaders: Headers): Promise<LoadResult> {
  try {
    const course = await getCourse(id);
    if (course === null) return { kind: "missing" };

    const result = await loadCoursePlaces(course.placeIds, {
      beforeTourCalls: () => enforcePlacesRateLimit(requestHeaders),
    });
    if (result.ok) return { kind: "ok", course, places: result.places };
    if (result.code === "DB_UNAVAILABLE") return { kind: "status", status: "db" };
    if (result.code === "RATE_LIMIT") return { kind: "status", status: "rate-limit", message: result.message };
    return { kind: "status", status: "failed" };
  } catch (e) {
    // AppError가 아닌 예외는 app/error.tsx에 맡긴다.
    if (!(e instanceof AppError)) throw e;
    console.error("코스 조회 실패:", e.code);
    return { kind: "status", status: e.code === "DB_UNAVAILABLE" ? "db" : "failed" };
  }
}

// 서버 컴포넌트에서 직접 조회한다. 공개 링크라 로그인 없이 열린다.
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await load(id, await headers());

  if (result.kind === "missing") notFound();
  if (result.kind === "status") return <CourseStatus kind={result.status} message={result.message} />;
  return <CourseResult course={result.course} places={result.places} />;
}
