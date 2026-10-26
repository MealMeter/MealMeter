// 역할: 별점 입력 (1~5, 필수). 라디오 버튼 묶음(fieldset/legend)으로 만든다. 담당: 박준호
// 키보드: Tab으로 들어와서 화살표 키로 고른다 (라디오 버튼 기본 동작).
// <StarInput value={rating} onChange={setRating} />
// props: value(0이면 아직 안 고름, 1~5), onChange(고른 숫자를 받는 함수), describedBy(안내 문구 id, 선택)

const STARS = [1, 2, 3, 4, 5];

export default function StarInput({ value, onChange, describedBy }) {
  return (
    // fieldset + legend: "이 라디오 버튼 5개는 '별점'이라는 한 묶음"이라고 화면 낭독기에 알려 준다
    <fieldset className="star-input" aria-describedby={describedBy}>
      <legend className="star-input__legend">
        별점 <span className="star-input__required">(필수)</span>
      </legend>

      <div className="star-input__stars">
        {STARS.map((star) => {
          // 고른 점수 이하의 별은 꽉 찬 별(★), 나머지는 빈 별(☆)로 그린다
          const filled = star <= value;
          return (
            // label로 감싸면 별 글자를 눌러도 안의 라디오 버튼이 선택된다
            <label key={star} className="star-input__option">
              {/* 진짜 입력은 이 라디오 버튼. 눈에는 안 보이게 숨기지만(sr-only) 키보드·화면 낭독기로는 쓸 수 있다 */}
              <input
                type="radio"
                name="rating"
                className="sr-only"
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
              />
              {/* 별 모양은 장식이라 낭독기는 건너뛰고(aria-hidden), 대신 "3점"처럼 글자를 읽어 준다 */}
              <span aria-hidden="true" className={filled ? 'star-input__star is-filled' : 'star-input__star'}>
                {filled ? '★' : '☆'}
              </span>
              <span className="sr-only">{star}점</span>
            </label>
          );
        })}

        {/* 색이나 별 모양만 보고 몰라도 되게 숫자로도 보여 준다 */}
        <span className="star-input__value" aria-hidden="true">
          {value ? `${value}점` : '골라 주세요'}
        </span>
      </div>
    </fieldset>
  );
}
