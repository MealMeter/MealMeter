// 역할: 별점 표시 (읽기 전용). 담당: 김태건
// <StarRating value={4.2} />            → ★★★★☆ 4.2
// <StarRating value={5} showValue={false} />
// props: value(0~5), showValue(숫자도 보여줄지, 기본 true)

export default function StarRating({ value = 0, showValue = true }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  const filled = Math.round(v);

  return (
    <span
      role="img"
      aria-label={`5점 만점에 ${v.toFixed(1)}점`}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}
    >
      <span aria-hidden="true" style={{ letterSpacing: 2 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{ color: i < filled ? "var(--color-star)" : "var(--color-border-input)" }}
          >
            {i < filled ? "★" : "☆"}
          </span>
        ))}
      </span>
      {showValue && (
        <strong style={{ fontSize: "var(--font-size-small)", color: "var(--color-text)" }}>
          {v.toFixed(1)}
        </strong>
      )}
    </span>
  );
}
}