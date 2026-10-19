// 오류 표시. 서버가 보낸 한 줄 메시지를 그대로 보여 준다. 담당: 조현우
// <ErrorMessage message={error} onRetry={reload} />
// props: message, onRetry(있으면 "다시 시도" 버튼이 생긴다)
import Button from '../ui/Button.jsx';
import './state.css';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="state-box state-box--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
