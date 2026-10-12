interface Props {
  className?: string;
}

export default function AppLogo({ className = '' }: Props) {
  return (
    <span
      className={`logo-serif ${className}`}
      style={{
        fontSize: '1.08rem',
        lineHeight: 1,
        display: 'inline-block',
        background: 'linear-gradient(95deg, var(--p-800) 0%, var(--p-600) 30%, var(--p-400) 60%, var(--p-800) 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      나랏말
    </span>
  );
}
