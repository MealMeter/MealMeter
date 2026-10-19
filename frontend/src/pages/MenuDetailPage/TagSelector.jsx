// 태그 선택 버튼 그룹 (항목 하나). 담당: 박준호
// 같은 버튼을 한 번 더 누르면 선택이 풀린다 (태그는 선택 사항).
export default function TagSelector({ field, value, onChange, warning = false }) {
  return (
    <fieldset className={warning ? 'tag-selector tag-selector--warning' : 'tag-selector'}>
      <legend>
        {warning && <span aria-hidden="true">⚠️ </span>}
        {field.label}
      </legend>
      <div className="tag-selector__options">
        {field.options.map((option) => (
          <button
            key={option}
            type="button"
            className="tag-selector__option"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? null : option)}
          >
            {value === option && <span aria-hidden="true">✓ </span>}
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
