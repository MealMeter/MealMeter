// 역할: 태그 선택 버튼 그룹 (항목 하나, 예: 간 → 짜다/적당/싱겁다). 담당: 박준호
// 같은 버튼을 한 번 더 누르면 선택이 풀린다 (태그는 선택 사항).
// <TagSelector field={TAG_FIELDS[0]} value={value} onChange={...} warning={false} />
// props: field({ key, label, options }, reviewFields.js에서 가져온다), value(고른 값 또는 null),
//        onChange(새 값 또는 null을 받는 함수), warning(위생처럼 눈에 띄게 그릴 때 true)

export default function TagSelector({ field, value, onChange, warning = false }) {
  // 버튼을 눌렀을 때: 이미 고른 값이면 선택 해제(null), 아니면 그 값으로 바꾼다
  function handleClick(option) {
    onChange(value === option ? null : option);
  }

  return (
    <fieldset className={warning ? 'tag-selector tag-selector--warning' : 'tag-selector'}>
      <legend className="tag-selector__legend">{field.label}</legend>

      <div className="tag-selector__options">
        {field.options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              // type="button": form 안의 버튼은 기본이 "제출"이라, 이걸 안 쓰면 태그만 눌러도 평가가 등록돼 버린다
              type="button"
              className={selected ? 'tag-selector__option is-selected' : 'tag-selector__option'}
              // aria-pressed: 화면 낭독기가 "눌림 / 안 눌림"을 읽어 준다 (켜고 끄는 버튼)
              aria-pressed={selected}
              onClick={() => handleClick(option)}
            >
              {/* 색만으로 구분하지 않도록 고른 버튼에는 ✓ 표시도 붙인다 */}
              {selected && <span aria-hidden="true">✓ </span>}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
