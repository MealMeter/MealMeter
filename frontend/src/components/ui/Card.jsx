// 역할: 카드 틀 (흰 배경 + 테두리). 메뉴 카드, 평가 카드 등에 쓴다. 담당: 김태건
// <Card as="li">...</Card>   props: as(그릴 태그, 기본 div), className

export default function Card({ as: Tag = "div", className = "", style, children, ...rest }) {
  return (
    <Tag
      className={className}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        padding: "var(--space-4)",
        color: "var(--color-text)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}