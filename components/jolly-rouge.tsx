/**
 * The Jolie Rouge — the red "no quarter" flag. A white skull over two crossed
 * keys (the keys are yours; they are holding them). Authored, not borrowed.
 */
export function JollyRouge({
  className,
  title = "Jolly Rouge",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <path d="M0 0h64v40H0z" fill="var(--color-blood)" />
      <g
        stroke="var(--color-parchment)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18.5 32.5 45 10" />
        <path d="M45.5 32.5 19 10" />
      </g>
      <path
        d="M15.5 36.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm33 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        fill="var(--color-parchment)"
      />
      <path
        d="M44 9.5h5m-4 4h3.5M20 9.5h-5m4 4h-3.5"
        stroke="var(--color-parchment)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M32 3.5c-8.6 0-14 5.9-14 13.4 0 4.5 1.9 7.6 4.7 9.5v3.7c0 1.4 1.1 2.5 2.5 2.5h13.6c1.4 0 2.5-1.1 2.5-2.5v-3.7c2.8-1.9 4.7-5 4.7-9.5 0-7.5-5.4-13.4-14-13.4Z"
        fill="var(--color-parchment)"
      />
      <path
        d="M26.6 12.4a3.6 4.2 0 1 0 0 8.4 3.6 4.2 0 0 0 0-8.4Zm10.8 0a3.6 4.2 0 1 0 0 8.4 3.6 4.2 0 0 0 0-8.4ZM32 21.4l2.4 4.2h-4.8L32 21.4Z"
        fill="var(--color-blood)"
      />
      <path
        d="M27.6 27.4v5m4.4-5v5m4.4-5v5"
        stroke="var(--color-blood)"
        strokeWidth="1.8"
      />
    </svg>
  );
}
