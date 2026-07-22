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
        background: 'linear-gradient(95deg, #1f4c49 0%, #2b6460 30%, #52988c 60%, #1f4c49 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      나랏말
    </span>
  );
}
