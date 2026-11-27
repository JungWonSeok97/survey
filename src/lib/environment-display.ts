import { SURVEY_DATA } from "./surveyData";

const sections = [
  { title: "실외 기상", keys: ["env_wind", "env_rain", "env_out_humidity", "env_out_temp", "env_lightning", "env_fog", "env_dust"] },
  { title: "공간·노면", keys: ["env_space", "env_friction"] },
  { title: "실내 쾌적성", keys: ["env_in_temp", "env_in_humidity", "env_ventilation"] },
  { title: "소음·가시성", keys: ["env_noise", "env_visibility"] },
];

const sourceLabels: Record<string, string | undefined> =
  SURVEY_DATA.find((question) => question.id === 6)!.condition_labels;

const displayLabels = new Map([
  ["env_rain", "비·눈"],
  ["env_out_temp", "실외 체감온도"],
  ["env_friction", "바닥 정지마찰계수"],
]);

// Pending rounds retain the wording sampled for that survey version, including its boundaries.
const shortValues = new Map([
  ["풍속이 10m/s 미만인 경우", "10 m/s 미만"],
  ["풍속 10m/s 이상인 경우", "10 m/s 이상"],
  ["비가 10mm/h(눈의 경우 1cm/h) 미만", "비 10 mm/h 미만 (눈 1 cm/h 미만)"],
  ["비가 10mm/h(눈의 경우 1cm/h) 이상", "비 10 mm/h 이상 (눈 1 cm/h 이상)"],
  ["실외 습도가 90% 미만인 경우", "90% 미만"],
  ["실외 습도가 90% 이하인 경우", "90% 이하"],
  ["실외 습도가 90% 이상인 경우", "90% 이상"],
  ["실외 온도가 35℃(체감 온도) 미만인 경우", "35℃ 미만"],
  ["실외 온도가 35℃(체감 온도) 이하인 경우", "35℃ 이하"],
  ["실외 온도가 35℃(체감 온도) 이상인 경우", "35℃ 이상"],
  ["낙뢰가 발생하지 않을 경우", "발생하지 않음"],
  ["낙뢰가 발생할 경우", "발생"],
  ["안개가 발생하지 않을 경우", "발생하지 않음"],
  ["안개가 발생할 경우", "발생"],
  ["황사로 인해 작업자가 확실히 사물을 볼 수 없는 경우", "사물을 뚜렷하게 보기 어려움"],
  ["황사로 인해 작업자가 숨 쉬기가 불편할 경우", "숨쉬기 불편함"],
  ["황사 영향이 없는 경우", "영향 없음"],
  ["작업공간의 크기가 10m^3 이상인 경우", "10 m³ 이상"],
  ["작업공간의 크기가 10m^3 이하인 경우", "10 m³ 이하"],
  ["작업공간의 크기가 10m^3 미만인 경우", "10 m³ 미만"],
  ["바닥 (정지)마찰계수(SCOF)가 ≥ 0.63인 경우", "SCOF 0.63 이상"],
  ["바닥 (정지)마찰계수(SCOF)가 < 0.63인 경우", "SCOF 0.63 미만"],
  ["실내 온도가 17℃ 이하인 경우", "17℃ 이하"],
  ["실내 온도가 17~28℃인 경우", "17~28℃"],
  ["실내 온도가 17℃ 초과 28℃ 미만인 경우", "17℃ 초과 28℃ 미만"],
  ["실내 온도가 28℃ 이상인 경우", "28℃ 이상"],
  ["실내 습도가 40% 이하인 경우", "40% 이하"],
  ["실내 습도가 40~75%인 경우", "40~75%"],
  ["실내 습도가 40% 초과 75% 미만인 경우", "40% 초과 75% 미만"],
  ["실내 습도가 75% 이상인 경우", "75% 이상"],
  ["통풍이 잘 될 경우", "잘됨"],
  ["통풍이 잘 되지 않을 경우", "잘되지 않음"],
  ["소음이 85dB 이하인 경우", "85 dB 이하"],
  ["소음이 85~115dB인 경우", "85~115 dB"],
  ["소음이 85dB 초과 115dB 미만인 경우", "85 dB 초과 115 dB 미만"],
  ["소음이 115dB 이상인 경우", "115 dB 이상"],
  ["보통작업을 수행할 정도의 조도가 형성된 경우", "보통 작업이 가능한 조도"],
  ["정밀작업을 수행할 정도의 조도가 형성된 경우", "정밀 작업이 가능한 조도"],
  ["초정밀작업을 수행할 정도의 조도가 형성된 경우", "초정밀 작업이 가능한 조도"],
]);

export function groupEnvironmentConditions(conditions: Record<string, string>) {
  const remaining = new Map(Object.entries(conditions));
  const groups: { title: string; items: [string, string][] }[] = [];
  for (const { title, keys } of sections) {
    const items: [string, string][] = [];
    for (const key of keys) {
      const label = sourceLabels[key];
      if (!label) continue;
      const original = remaining.get(label);
      if (original === undefined) continue;
      const shortened = shortValues.get(original);
      items.push(shortened === undefined
        ? [label, original]
        : [displayLabels.get(key) ?? label, shortened]);
      remaining.delete(label);
    }
    if (items.length) groups.push({ title, items });
  }
  if (remaining.size) groups.push({ title: "그 밖의 작업조건", items: [...remaining] });
  return groups;
}
