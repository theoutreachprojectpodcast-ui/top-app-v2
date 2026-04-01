"use client";

export function FormRadio({ name, checked, onChange, children }) {
  return (
    <label className="dsChoice dsChoice--radio">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="dsChoice__control" aria-hidden="true" />
      <span className="dsChoice__text">{children}</span>
    </label>
  );
}

export function FormCheckbox({ checked, onChange, children }) {
  return (
    <label className="dsChoice dsChoice--checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="dsChoice__control" aria-hidden="true" />
      <span className="dsChoice__text">{children}</span>
    </label>
  );
}

