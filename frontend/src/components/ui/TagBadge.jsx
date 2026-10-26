// 역할: 태그 배지. 색만으로 구분하지 않도록 항목 이름과 값을 글자로 함께 보여 준다. 담당: 김태건
// <TagBadge category="간" value="적당" />               → [간 · 적당]
// <TagBadge category="위생" value="문제 있음" warning /> → 눈에 띄는 경고 모양
// props: category, value, warning(위생 문제 등 강조할 때)

export default function TagBadge({ category, value, warning = false }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    padding: "var(--space-1) var(--space-3)",
    borderRadius: "var(--radius-chip)",
    fontSize: "var(--font-size-small)",
    whiteSpace: "nowrap",
  };

  const look = warning
    ? {
        background: "var(--color-danger-soft)",
        color: "var(--color-danger)",
        border: "1px solid var(--color-danger)",
        fontWeight: 700,
      }
    : {
        background: "var(--color-bg)",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border-input)",
      };

  return (
    <span style={{ ...base, ...look }}>
      {warning ? (
        <>
          <span aria-hidden="true">!</span>
          {category} {value}
        </>
      ) : (
        <>
          {category} · {value}
        </>
      )}
    </span>
  );
}