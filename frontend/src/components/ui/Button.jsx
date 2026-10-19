// 버튼. 담당: 김태건
// <Button onClick={...}>등록</Button>
// <Button to="/menus/3">평가하기</Button>          → 페이지 이동 링크로 그려진다
// <Button variant="secondary" type="button">취소</Button>
// props: variant('primary' | 'secondary'), to(이동할 주소), 나머지는 <button>에 그대로 전달
import { Link } from 'react-router-dom';
import './ui.css';

export default function Button({ variant = 'primary', to, className = '', children, ...rest }) {
  const classes = `btn btn--${variant} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
