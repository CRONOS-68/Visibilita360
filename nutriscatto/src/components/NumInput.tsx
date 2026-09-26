import { useEffect, useState, type CSSProperties } from 'react';

export function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const fmt = (v: number | null, digits: number) =>
  v == null ? '' : String(Math.round(v * 10 ** digits) / 10 ** digits).replace('.', ',');

/** Campo numerico che accetta la virgola decimale e non "salta" mentre si scrive. */
export function NumInput({
  value,
  onChange,
  digits = 1,
  min = 0,
  placeholder,
  ariaLabel,
  id,
  style,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  digits?: number;
  min?: number;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  style?: CSSProperties;
}) {
  const [text, setText] = useState(fmt(value, digits));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmt(value, digits));
  }, [value, digits, focused]);
  return (
    <input
      id={id}
      className="input num"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={style}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        setText(fmt(value, digits));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNum(e.target.value);
        onChange(n == null ? null : Math.max(min, n));
      }}
    />
  );
}
