// 역할: 평가 작성 폼 (별점 필수 + 간/양/온도/식감/위생 태그 선택 + 자유 의견). 담당: 박준호
// createReview()로 보내고, 실패하면 서버 메시지를 그대로 보여 준다.
// <ReviewForm menuId={3} onCreated={(review) => ...} />
// props: menuId(평가할 메뉴 번호), onCreated(등록에 성공한 평가를 받는 함수)
import { useState } from 'react';
import { createReview } from '../../api/index.js';
import { COMMENT_MAX_LENGTH, HYGIENE_FIELD, TAG_FIELDS } from '../../api/reviewFields.js';
import Button from '../../components/ui/Button.jsx';
import ErrorMessage from '../../components/state/ErrorMessage.jsx';
import StarInput from './StarInput.jsx';
import TagSelector from './TagSelector.jsx';

// 태그 처음 상태: 모든 항목이 "안 고름"(null)
// → { saltiness: null, portion: null, temperature: null, texture: null, hygiene: null }
const EMPTY_TAGS = Object.fromEntries([...TAG_FIELDS, HYGIENE_FIELD].map((field) => [field.key, null]));

export default function ReviewForm({ menuId, onCreated }) {
  // ---- state: 화면이 기억하는 값들 ----
  const [rating, setRating] = useState(0); // 0 = 아직 별점을 안 고름
  const [tags, setTags] = useState(EMPTY_TAGS);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false); // 서버에 보내는 중인지 (두 번 누르기 방지)
  const [error, setError] = useState(null); // 서버가 돌려준 오류 메시지
  const [success, setSuccess] = useState(false); // 방금 등록에 성공했는지

  const ratingMissing = rating === 0;

  // 태그 하나가 바뀌면 그 항목만 바꾸고 나머지는 그대로 둔다
  function changeTag(key, value) {
    setTags((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(event) {
    // form의 기본 동작(페이지 새로고침)을 막는다. 새로고침 없이 목록에 바로 보여 줘야 하니까.
    event.preventDefault();
    // 버튼이 막혀 있어도 Enter 키 등으로 들어올 수 있어서 한 번 더 검사한다
    if (ratingMissing || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      // 명세서 5장 3번: 메뉴 번호, 별점, 간, 양, 온도, 식감, 위생, 의견
      const saved = await createReview({
        menuId: Number(menuId),
        rating,
        ...tags,
        comment: comment.trim(), // 앞뒤 공백만 있는 의견은 빈칸으로 보낸다
      });
      onCreated(saved); // 부모(MenuDetailPage)가 목록 맨 위에 넣는다
      // 폼 초기화
      setRating(0);
      setTags(EMPTY_TAGS);
      setComment('');
      setSuccess(true);
    } catch (err) {
      // 서버(또는 가짜 서버)가 보낸 메시지를 그대로 보여 준다. 예: "욕설이나 비방 표현은 등록할 수 없어요."
      setError(err.message);
    } finally {
      // 성공하든 실패하든 "보내는 중" 상태는 끝낸다
      setSubmitting(false);
    }
  }

  return (
    // noValidate: 브라우저 기본 경고창 대신 우리가 만든 안내 문구를 쓴다
    <form className="review-form" onSubmit={handleSubmit} noValidate>
      {/* 1. 별점 (필수) */}
      <StarInput
        value={rating}
        onChange={(value) => {
          setRating(value);
          setSuccess(false);
        }}
        describedBy={ratingMissing ? 'review-form-rating-hint' : undefined}
      />

      {/* 2. 맛·양 등 항목별 태그 (선택) */}
      <fieldset className="review-form__group">
        <legend className="review-form__legend">
          항목별 평가 <span className="muted">(선택, 다시 누르면 취소)</span>
        </legend>
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
      </fieldset>

      {/* 3. 위생 — 사고 신고 성격이라 다른 태그와 떨어뜨려 눈에 띄게 그린다 */}
      <div className="review-form__hygiene">
        <TagSelector
          field={HYGIENE_FIELD}
          value={tags[HYGIENE_FIELD.key]}
          onChange={(value) => changeTag(HYGIENE_FIELD.key, value)}
          warning
        />
        <p className="review-form__help">이물질이 나왔거나 상한 것 같다면 &quot;문제 있음&quot;을 골라 주세요.</p>
      </div>

      {/* 4. 자유 의견 (선택) */}
      <div className="review-form__comment">
        <label htmlFor="review-comment" className="review-form__legend">
          의견 <span className="muted">(선택)</span>
        </label>
        {/* 명세서: 입력창 위에 안내 문구를 둔다 */}
        <p id="review-comment-guide" className="review-form__help">
          메뉴에 대한 의견만 써주세요. 특정인을 향한 글은 삼가주세요
        </p>
        <textarea
          id="review-comment"
          className="review-form__textarea"
          rows={3}
          value={comment}
          // maxLength: 정해진 글자 수(reviewFields.js)보다 더 못 쓰게 막는다
          maxLength={COMMENT_MAX_LENGTH}
          // aria-describedby: 입력창에 들어오면 위 안내 문구와 글자 수도 함께 읽어 준다
          aria-describedby="review-comment-guide review-comment-count"
          onChange={(event) => {
            setComment(event.target.value);
            setSuccess(false);
          }}
        />
        <p id="review-comment-count" className="review-form__count">
          {comment.length} / {COMMENT_MAX_LENGTH}자
        </p>
      </div>

      {/* 서버가 거절했을 때 (금칙어 등) 폼 바로 근처에 메시지를 보여 준다 */}
      {error && <ErrorMessage message={error} />}

      <div className="review-form__actions">
        {/* 별점을 안 골랐으면 등록 버튼을 막고, 왜 막혔는지 글로 알려 준다 */}
        {ratingMissing && (
          <p id="review-form-rating-hint" className="review-form__hint">
            별점을 먼저 골라 주세요.
          </p>
        )}
        <Button type="submit" disabled={ratingMissing || submitting}>
          {submitting ? '등록하는 중…' : '평가 등록'}
        </Button>
      </div>

      {/* role="status": 화면 낭독기가 "평가가 등록됐어요"를 알아서 읽어 준다 */}
      <p role="status" className="review-form__success">
        {success ? '평가가 등록됐어요. 소중한 의견 고마워요!' : ''}
      </p>
    </form>
  );
}
