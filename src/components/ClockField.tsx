"use client";
import { useState } from "react";
export default function ClockField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const [parts, setParts] = useState({
    period: match ? (Number(match[1]) < 12 ? "AM" : "PM") : "",
    hour: match ? String(Number(match[1]) % 12 || 12) : "",
    minute: match?.[2] || "",
  });
  function change(key: keyof typeof parts, value: string) {
    const next = { ...parts, [key]: value };
    setParts(next);
    onChange(
      next.period && next.hour && next.minute
        ? `${String((Number(next.hour) % 12) + (next.period === "PM" ? 12 : 0)).padStart(2, "0")}:${next.minute}`
        : "",
    );
  }
  return (
    <fieldset className="clock-field">
      <legend>{label}</legend>
      <div className="clock-controls">
        <label className="sr-only" htmlFor={`${id}-period`}>
          {label} 오전·오후
        </label>
        <select
          id={`${id}-period`}
          value={parts.period}
          onChange={(e) => change("period", e.target.value)}
        >
          <option value="">오전·오후</option>
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>
        <label className="sr-only" htmlFor={`${id}-hour`}>
          {label} 시
        </label>
        <select
          id={`${id}-hour`}
          value={parts.hour}
          onChange={(e) => change("hour", e.target.value)}
        >
          <option value="">시</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}시
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-minute`}>
          {label} 분
        </label>
        <select
          id={`${id}-minute`}
          value={parts.minute}
          onChange={(e) => change("minute", e.target.value)}
        >
          <option value="">분</option>
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={String(i).padStart(2, "0")}>
              {String(i).padStart(2, "0")}분
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
