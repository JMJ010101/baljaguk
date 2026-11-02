type Props = {
  step: number;
  title: string;
  description: string;
};

// 홈의 "이렇게 만들어요" 카드 한 장. 순서 번호는 장식이 아니라 글자로 보여 준다.
export default function StepCard({ step, title, description }: Props) {
  return (
    <li className="rounded-card bg-surface p-4 shadow-card">
      <span className="inline-flex size-8 items-center justify-center rounded-tag bg-primary-soft text-base font-bold text-primary">
        {step}
      </span>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-base text-muted">{description}</p>
    </li>
  );
}
