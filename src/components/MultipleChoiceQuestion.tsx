import { SURVEY_DATA } from "@/lib/surveyData";
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
  const environment = SURVEY_DATA.find(q => q.id === 6)!.condition_labels;
  const sections = [
    { title: "실외 기상", keys: ["env_wind", "env_rain", "env_out_humidity", "env_out_temp", "env_lightning", "env_fog", "env_dust"] },
    { title: "공간·노면", keys: ["env_space", "env_friction"] },
    { title: "실내 쾌적성", keys: ["env_in_temp", "env_in_humidity", "env_ventilation"] },
    { title: "소음·가시성", keys: ["env_noise", "env_visibility"] },
  ];
  const labels: Record<string, string | undefined> = environment;
  const groups = question.id === 6
    ? sections.map(({ title, keys }) => ({
        title,
        items: keys.flatMap(key => {
          const label = labels[key];
          return label && Object.hasOwn(question.conditions, label)
            ? [[label, question.conditions[label]]] : [];
        }),
      }))
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
