// 불러오는 중 표시. 담당: 조현우
// <Loading />  또는  <Loading message="순위를 불러오는 중이에요" />
import './state.css';

export default function Loading({ message = '불러오는 중이에요…' }) {
  return (
    <div className="state-box" role="status">
      <span className="state-box__spinner" aria-hidden="true" />
      {message}
    </div>
  );
}
