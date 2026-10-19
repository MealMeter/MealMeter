// 평가 작성 폼 (별점 + 태그 + 의견). 담당: 박준호
import { useState } from 'react';
import { createReview } from '../../api/index.js';
import { COMMENT_MAX_LENGTH, HYGIENE_FIELD, TAG_FIELDS } from '../../api/reviewFields.js';
import Button from '../../components/ui/Button.jsx';
import StarInput from './StarInput.jsx';
import TagSelector from './TagSelector.jsx';

const EMPTY_TAGS = { saltiness: null, portion: null, temperature: null, texture: null, hygiene: null };

export default function ReviewForm({ menuId, onCreated }) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState(EMPTY_TAGS);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function changeTag(key, value) {
    setTags((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (rating === 0) {
      setErrorMessage('별점을 골라 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const saved = await createReview({ menuId, rating, ...tags, comment: comment.trim() });
      onCreated(saved);
      setRating(0);
      setTags(EMPTY_TAGS);
      setComment('');
      setSuccessMessage('평가를 등록했어요. 고마워요!');
    } catch (err) {
      // 서버가 보낸 메시지(금칙어 포함 등)를 폼 근처에 그대로 보여 준다.
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form card" onSubmit={handleSubmit} noValidate>
      <h2>평가 남기기</h2>

      <StarInput value={rating} onChange={setRating} />

      <div className="review-form__tags">
        {TAG_FIELDS.map((field) => (
          <TagSelector
            key={field.key}
            field={field}
            value={tags[field.key]}
            onChange={(value) => changeTag(field.key, value)}
          />
        ))}
      </div>

      <div className="review-form__hygiene">
        <TagSelector
          field={HYGIENE_FIELD}
          value={tags.hygiene}
          onChange={(value) => changeTag('hygiene', value)}
          warning
        />
      </div>

      <div className="review-form__comment">
        <label htmlFor="review-comment">
          한마디 남기기 <span className="muted">(선택)</span>
        </label>
        <p id="review-comment-help" className="muted">
          메뉴에 대한 의견만 써주세요. 특정인을 향한 글은 삼가주세요
        </p>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          rows={3}
          aria-describedby="review-comment-help review-comment-count"
          placeholder="예: 닭갈비가 촉촉하고 맛있었어요!"
        />
        <p id="review-comment-count" className="muted review-form__count">
          {comment.length} / {COMMENT_MAX_LENGTH}
        </p>
      </div>

      <p className="review-form__error" role="alert">
        {errorMessage}
      </p>
      <p className="review-form__success" role="status">
        {successMessage}
      </p>

      {rating === 0 && <p className="muted">별점을 골라야 등록할 수 있어요.</p>}
      <Button type="submit" disabled={rating === 0 || submitting}>
        {submitting ? '등록하는 중…' : '익명으로 평가 등록하기'}
      </Button>
    </form>
  );
}
