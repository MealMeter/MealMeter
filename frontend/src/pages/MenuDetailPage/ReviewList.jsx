// 평가 목록. 담당: 박준호
import { HYGIENE_FIELD, HYGIENE_PROBLEM, TAG_FIELDS } from '../../api/reviewFields.js';
import Card from '../../components/ui/Card.jsx';
import StarRating from '../../components/ui/StarRating.jsx';
import TagBadge from '../../components/ui/TagBadge.jsx';
import EmptyState from '../../components/state/EmptyState.jsx';

function formatTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReviewList({ reviews }) {
  return (
    <section className="review-list" aria-labelledby="review-list-title">
      <h2 id="review-list-title">친구들의 평가</h2>
      {reviews.length === 0 ? (
        <EmptyState message="아직 평가가 없어요. 첫 평가를 남겨 보세요" />
      ) : (
        <ul>
          {reviews.map((review) => (
            <Card as="li" key={review.reviewId} className="review-list__item">
              <div className="review-list__head">
                <StarRating value={review.rating} />
                <time dateTime={review.createdAt} className="muted">
                  {formatTime(review.createdAt)}
                </time>
              </div>
              <div className="review-list__tags">
                {review.hygiene === HYGIENE_PROBLEM && (
                  <TagBadge category={HYGIENE_FIELD.label} value={review.hygiene} warning />
                )}
                {TAG_FIELDS.filter((field) => review[field.key]).map((field) => (
                  <TagBadge key={field.key} category={field.label} value={review[field.key]} />
                ))}
              </div>
              {review.comment && <p>{review.comment}</p>}
            </Card>
          ))}
        </ul>
      )}
    </section>
  );
}
