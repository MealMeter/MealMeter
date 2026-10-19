// 별점 표시 (읽기 전용). 담당: 김태건
// <StarRating value={4.2} />            → ★★★★☆ 4.2
// <StarRating value={5} showValue={false} />
// props: value(0~5), showValue(숫자도 보여줄지, 기본 true)
import './ui.css';

export default function StarRating({ value, showValue = true }) {
  const filled = Math.round(value);
  return (
    <span className="star-rating">
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= filled ? 'star star--on' : 'star'}>
            ★
          </span>
        ))}
      </span>
      <span className="sr-only">5점 만점에 {value}점</span>
      {showValue && (
        <span className="star-rating__value" aria-hidden="true">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
