"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import CourseError from "@/components/course/CourseError";
import CourseProgress from "@/components/course/CourseProgress";
import { useSigungu } from "@/components/course/useSigungu";
import { MOOD_MAX_LENGTH } from "@/lib/ai/constants";
import { classifySubmitError, type ErrorScreenKind } from "@/lib/course/errorScreen";
import { moodLength, validateCourseForm, type CourseFormErrors, type CourseFormValues } from "@/lib/course/formErrors";
import type { FormPrefill } from "@/lib/course/prefill";
import { sigunguNotice } from "@/lib/course/sigungu";
import { postCourse } from "@/lib/course/submit";
import { COURSE_CONTENT_TYPE_IDS, CONTENT_TYPES } from "@/lib/tour/contentTypes";
import type { SidoListState } from "@/types";

const COURSE_TYPES = CONTENT_TYPES.filter((type) => COURSE_CONTENT_TYPE_IDS.includes(type.id));
const FORM_NOTICE = "조건을 확인하지 못했어요. 선택한 내용을 다시 확인해 주세요.";

const fieldClass = "min-h-12 w-full rounded-button border-2 border-accent bg-surface px-3 text-base disabled:opacity-60";

type Phase =
  | { kind: "form"; notice: boolean }
  | { kind: "submitting" }
  | { kind: "error"; screen: ErrorScreenKind; message?: string };

// 폼 값(mood 포함)은 이 컴포넌트의 state에만 둔다. URL, 쿼리, 로그, 오류 문구에는 넣지 않고, 오류 뒤 폼 복원도 state로만 한다.
// prefill은 "다시 만들기"로 넘어온 시도, 시군구, 유형이다. 처음 한 번만 초기값으로 쓰고, 그 뒤에는 사용자가 그대로 고칠 수 있다.
// mood는 미리 채우지 않는다. (prefill에 mood가 없다)
export default function CourseForm({ sidoState, prefill }: { sidoState: SidoListState; prefill?: FormPrefill }) {
  const router = useRouter();
  const [values, setValues] = useState<CourseFormValues>(() => ({
    sido: prefill?.sido ?? "",
    sigungu: prefill?.sigungu ?? "",
    types: prefill?.types ?? [],
    mood: "",
  }));
  const [errors, setErrors] = useState<CourseFormErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "form", notice: false });
  const abortRef = useRef<AbortController | null>(null);
  const { state: sigungu, reload } = useSigungu(values.sido);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sidoRegions = sidoState.status === "ok" ? sidoState.regions : [];

  // 화면에 보이는 시군구와 제출하는 시군구를 같은 값으로 맞춘다. 시군구 목록을 받았고 그 안에 있을 때만 쓰고,
  // 그 밖(로딩 중, 실패, 429, 시군구 없음, 목록에 없는 값)에는 빈 값이다. 목록에 없는 값이 화면에는 "전체"로 보이면서 제출되지 않게 한다.
  const sigunguValue =
    sigungu.status === "ok" && sigungu.regions.some((region) => region.code === values.sigungu) ? values.sigungu : "";
  // 미리 채운 시군구가 있고 목록을 아직 받는 중일 때만 제출을 잠시 막는다. 실패나 429이면 풀리고 시군구 없이 제출할 수 있다.
  const sigunguPending = values.sigungu !== "" && sigungu.status === "loading";

  async function submit() {
    if (sigunguPending) return;
    const validation = validateCourseForm({ ...values, sigungu: sigunguValue });
    if (!validation.ok) {
      setErrors(validation.errors);
      setPhase({ kind: "form", notice: false });
      return;
    }
    setErrors({});
    setPhase({ kind: "submitting" });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const outcome = await postCourse(validation.request, { signal: controller.signal });
    if (outcome.kind === "aborted") return;
    // 이동하는 동안에는 생성 중 화면을 유지한다. 주소에는 id만 쓴다.
    if (outcome.kind === "ok") {
      router.push(`/course/${outcome.id}`);
      return;
    }
    const view = classifySubmitError(outcome);
    if (view.kind === "form-error") setPhase({ kind: "form", notice: true });
    else setPhase({ kind: "error", screen: view.screen, message: view.message });
  }

  function toggleType(id: number) {
    setValues((prev) => ({
      ...prev,
      types: prev.types.includes(id) ? prev.types.filter((typeId) => typeId !== id) : [...prev.types, id],
    }));
  }

  if (phase.kind === "submitting") return <CourseProgress />;
  if (phase.kind === "error") {
    return (
      <CourseError
        screen={phase.screen}
        message={phase.message}
        onRetry={submit}
        onEdit={() => setPhase({ kind: "form", notice: false })}
      />
    );
  }

  const sigunguNote = sigungu.status === "failed" ? sigunguNotice(sigungu.failure) : undefined;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12 pt-6">
      <h1 className="text-2xl font-bold">어디로 가볼까요?</h1>
      <p className="mt-2 text-base text-muted">조건을 고르면 하루 코스를 만들어드려요.</p>

      {phase.notice && (
        <p role="alert" className="mt-4 rounded-card bg-notice px-4 py-3 text-base font-bold text-danger">
          {FORM_NOTICE}
        </p>
      )}

      <form
        className="mt-6 flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="sido" className="font-bold">
            지역
          </label>
          <select
            id="sido"
            className={fieldClass}
            disabled={sidoState.status !== "ok"}
            value={values.sido}
            onChange={(e) => setValues((prev) => ({ ...prev, sido: e.target.value, sigungu: "" }))}
          >
            <option value="">지역 선택</option>
            {sidoRegions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
          {sidoState.status === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-base text-muted">지역 목록을 불러오지 못했어요. 다시 불러온 뒤 선택해 주세요.</p>
              <Button variant="secondary" onClick={() => router.refresh()}>
                지역 목록 다시 불러오기
              </Button>
            </div>
          )}
          {sidoState.status === "empty" && (
            <p className="text-base text-muted">지역 목록이 비어 있어요. 잠시 후 다시 확인해 주세요.</p>
          )}
          {errors.sido !== undefined && <p className="text-base font-bold text-danger">{errors.sido}</p>}
        </div>

        {values.sido !== "" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="sigungu" className="font-bold">
              시·군·구 (선택)
            </label>
            <select
              id="sigungu"
              className={fieldClass}
              disabled={sigungu.status !== "ok"}
              value={sigunguValue}
              onChange={(e) => setValues((prev) => ({ ...prev, sigungu: e.target.value }))}
            >
              <option value="">{sigungu.status === "loading" ? "불러오는 중이에요" : "전체"}</option>
              {sigungu.status === "ok" &&
                sigungu.regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
            </select>
            {sigunguNote !== undefined && <p className="text-base text-muted">{sigunguNote}</p>}
            {sigungu.status === "failed" && sigungu.failure.kind !== "empty" && (
              <Button variant="secondary" onClick={reload}>
                시·군·구 다시 불러오기
              </Button>
            )}
            {errors.sigungu !== undefined && <p className="text-base font-bold text-danger">{errors.sigungu}</p>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p id="type-label" className="font-bold">
            장소 유형
          </p>
          <div role="group" aria-labelledby="type-label" className="flex flex-wrap gap-2">
            {COURSE_TYPES.map((type) => {
              const selected = values.types.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleType(type.id)}
                  className={`inline-flex min-h-11 items-center rounded-tag border-2 px-4 text-base ${
                    selected
                      ? "border-primary bg-primary-soft font-bold text-primary"
                      : "border-accent bg-surface text-foreground"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
          {errors.types !== undefined && <p className="text-base font-bold text-danger">{errors.types}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="mood" className="font-bold">
            원하는 분위기 (선택)
          </label>
          <textarea
            id="mood"
            rows={4}
            className="min-h-28 w-full rounded-button border-2 border-accent bg-surface px-3 py-2 text-base"
            placeholder="예: 조용하고 한적한 곳"
            value={values.mood}
            onChange={(e) => setValues((prev) => ({ ...prev, mood: e.target.value }))}
          />
          <p className="text-base text-muted">
            {moodLength(values.mood)}/{MOOD_MAX_LENGTH}자
          </p>
          {errors.mood !== undefined && <p className="text-base font-bold text-danger">{errors.mood}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={sigunguPending}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-button bg-primary px-5 py-2 text-base font-bold text-on-primary disabled:opacity-60"
          >
            코스 만들기
          </button>
          <p className="text-center text-base text-muted">코스를 만드는 데 시간이 조금 걸릴 수 있어요.</p>
        </div>
      </form>
    </main>
  );
}
