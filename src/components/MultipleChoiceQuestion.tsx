import type { Scenario } from "@/lib/survey-schema";

export default function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Scenario;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const entries = Object.entries(question.conditions);
  const groups =
    question.id === 6
      ? [
          { title: "실외 기상", items: entries.slice(0, 7) },
          { title: "공간·노면", items: entries.slice(7, 9) },
          { title: "실내 쾌적성", items: entries.slice(9, 12) },
          { title: "소음·가시성", items: entries.slice(12) },
        ]
      : [{ title: "제시된 작업조건", items: entries }];
  return (
    <article
      className="scenario-card"
      aria-labelledby={`psf-${question.id}-title`}
    >
      <div className="scenario-heading">
        <span className="number-badge">
          {String(question.id).padStart(2, "0")}
        </span>
        <div>
          <p className="eyebrow">PSF {question.id}</p>
          <h2 id={`psf-${question.id}-title`}>{question.psf}</h2>
        </div>
        <span className="tag">{entries.length}개 조건</span>
      </div>
      <p className="question-text">{question.text.replace(/^\d+\.\s*/, "")}</p>
      <div className="condition-groups">
        {groups.map((group) => (
          <section key={group.title} className="condition-group">
            <h3>{group.title}</h3>
            <dl className="conditions">
              {group.items.map(([label, text]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <fieldset className="answer-fieldset" disabled={disabled}>
        <legend>위 조건을 종합하면 어느 수준에 해당하나요?</legend>
        <p className="field-hint">
          본인의 판단에 가장 가까운 답변 하나를 선택해주세요.
        </p>
        <div className="answer-options">
          {question.options.map((option) => (
            <label
              key={option.code}
              className={`answer-option ${value === option.code ? "selected" : ""}`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.code}
                checked={value === option.code}
                onChange={() => onChange(option.code)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </article>
  );
}
