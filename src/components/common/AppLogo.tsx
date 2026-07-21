interface Props {
  className?: string;
}

export default function AppLogo({ className = '' }: Props) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "'Pretendard', -apple-system, sans-serif",
        fontSize: '1.08rem',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        display: 'inline-block',
        background: 'linear-gradient(95deg, #1f4c49 0%, #2b6460 30%, #52988c 60%, #1f4c49 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      나랏말ᄊᆞ미
    </span>
  );
}
