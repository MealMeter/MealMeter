// 빈 화면 표시. 담당: 조현우
// <EmptyState message="오늘은 급식 정보가 없어요" />
// <EmptyState message="..."><Button to="/">홈으로</Button></EmptyState>  → 아래에 버튼 등 추가
import './state.css';

export default function EmptyState({ message, children }) {
  return (
    <div className="state-box">
      <p>{message}</p>
      {children}
    </div>
  );
}
