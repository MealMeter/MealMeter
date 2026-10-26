// 역할: 공통 버튼. to를 주면 페이지 이동 링크로 그려진다. 담당: 김태건
// <Button onClick={...}>등록</Button>
// <Button to="/menus/3">평가하기</Button>
// <Button variant="secondary" type="button">취소</Button>
// props: variant('primary' | 'secondary'), to(이동할 주소), 나머지는 <button>에 그대로 전달

import { Link } from "react-router-dom";
import "./ui.css";

export default function Button({
  variant = "primary",
  to,
  className = "",
  children,
  ...rest
}) {
  const classes = `btn btn--${variant} ${className}`.trim();

  // to가 있으면 링크로
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  // 없으면 button (기본 type은 button: form 안에서 실수로 submit 되는 걸 방지)
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}