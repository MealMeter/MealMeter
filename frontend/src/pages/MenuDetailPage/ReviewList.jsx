// 역할: 평가 목록 (별점, 태그 배지, 의견, 작성 시각). 위생 "문제 있음"은 경고 배지로 강조한다. 담당: 박준호
// <ReviewList reviews={reviews} />
// props: reviews(평가 배열, 최신이 맨 앞. 모양은 api/index.js의 Review 참고)
import { HYGIENE_FIELD, HYGIENE_PROBLEM, TAG_FIELDS } from '../../api/reviewFields.js';
import Card from '../../components/ui/Card.jsx';
import StarRating from '../../components/ui/StarRating.jsx';
import TagBadge from '../../components/ui/TagBadge.jsx';

// "2026-10-26T03:30:00.000Z" 같은 시각을 "10월 26일 오후 12:30"처럼 읽기 쉽게 바꾼다
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function ReviewList({ reviews }) {
  return (
    <ul className="review-list">
      {reviews.map((review) => {
        // 고른 태그만 배지로 보여 준다 (안 고른 항목은 null이라 빠진다)
        const tags = TAG_FIELDS.filter((field) => review[field.key]);
        const hasHygieneProblem = review[HYGIENE_FIELD.key] === HYGIENE_PROBLEM;

        return (
          // key: React가 목록에서 각 항목을 구분하는 값. 서버가 붙여 준 평가 번호를 쓴다
          <Card as="li" key={review.reviewId} className="review-list__item">
            <div className="review-list__top">
              <StarRating value={review.rating} />
              {/* <time>: 기계가 읽을 수 있는 시각(dateTime)과 사람이 읽는 글자를 함께 담는다 */}
              <time className="review-list__time muted" dateTime={review.createdAt}>
                {timeFormatter.format(new Date(review.createdAt))}
              </time>
            </div>

            {(hasHygieneProblem || tags.length > 0) && (
              <ul className="review-list__tags" aria-label="선택한 태그">
                {/* 위생 문제는 가장 먼저, 경고 모양으로 보여 준다. "없음"은 굳이 표시하지 않는다 */}
                {hasHygieneProblem && (
                  <li>
                    <TagBadge category={HYGIENE_FIELD.label} value={HYGIENE_PROBLEM} warning />
                  </li>
                )}
                {tags.map((field) => (
                  <li key={field.key}>
                    <TagBadge category={field.label} value={review[field.key]} />
                  </li>
                ))}
              </ul>
            )}

            {/* 의견은 안 쓰면 빈 문자열("")이라 그때는 아무것도 그리지 않는다 */}
            {review.comment && <p className="review-list__comment">{review.comment}</p>}
          </Card>
        );
      })}
    </ul>
  );
}
