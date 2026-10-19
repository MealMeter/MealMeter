// 이용 안내 (서버를 부르지 않는 정적 페이지). 담당: 조현우
import { COMMENT_MAX_LENGTH } from '../../api/reviewFields.js';
import Button from '../../components/ui/Button.jsx';
import './GuidePage.css';

export default function GuidePage() {
  return (
    <article className="guide-page">
      <h1>MealMeter 이용 안내</h1>
      <p className="muted">우리의 의견이 더 나은 급식으로 이어지는 과정이에요.</p>

      <h2>이렇게 이용해요</h2>
      <ol>
        <li>메인에서 오늘의 메뉴를 확인해요.</li>
        <li>메뉴의 "평가하기"를 눌러 별점과 간·양·온도·식감 태그를 골라요.</li>
        <li>하고 싶은 말이 있으면 {COMMENT_MAX_LENGTH}자 안으로 의견을 남겨요.</li>
        <li>인기 순위에서 친구들이 좋아한 메뉴를 확인해요.</li>
      </ol>

      <h2>알아둘 점</h2>
      <ul>
        <li>로그인 없이 누구나 평가할 수 있고, 이름이나 학번은 입력하지 않아요.</li>
        <li>의견은 메뉴에 대해서만 써 주세요. 욕설이나 비방 표현이 들어간 글은 등록되지 않아요.</li>
        <li>위생 문제(이물질 등)는 일반 평가와 따로 눈에 띄게 표시돼요.</li>
        <li>순위는 같은 이름의 메뉴를 모아 평균 별점이 높은 순서로 정해요.</li>
      </ul>

      <Button to="/">오늘 급식 평가하러 가기</Button>
    </article>
  );
}
