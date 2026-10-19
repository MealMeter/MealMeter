// 카드 틀 (흰 배경 + 테두리). 담당: 김태건
// <Card as="li">...</Card>   props: as(그릴 태그, 기본 div), className
import './ui.css';

export default function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`card ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
