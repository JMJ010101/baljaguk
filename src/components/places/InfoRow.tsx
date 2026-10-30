const NO_INFO = "정보 없음";

// 라벨과 값 한 줄이다. 값이 없으면 빈 줄로 두지 않고 "정보 없음"을 보여준다.
// 값은 자유 텍스트라 파싱하지 않고 문자열 그대로 보여준다. 줄바꿈(\n)만 살린다. HTML로 렌더링하지 않는다.
export default function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-base text-muted">{label}</dt>
      <dd className="text-base whitespace-pre-line">{value ?? NO_INFO}</dd>
    </div>
  );
}
