// 별점 입력 (1~5, 필수). 담당: 박준호
// 키보드: Tab으로 들어와서 화살표 키로 고른다 (라디오 버튼 기본 동작).
export default function StarInput({ value, onChange }) {
  return (
    <fieldset className="star-input">
      <legend>
        별점 <span className="muted">(필수)</span>
      </legend>
      <div className="star-input__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? 'star-input__star star-input__star--on' : 'star-input__star'}>
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n}점</span>
          </label>
        ))}
        <span className="star-input__value" aria-hidden="true">
          {value > 0 ? `${value}점` : ''}
        </span>
      </div>
    </fieldset>
  );
}
