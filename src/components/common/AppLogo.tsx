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
        background: 'linear-gradient(95deg, #cc1858 0%, #f02570 30%, #ff70a8 60%, #cc1858 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      나랏말
    </span>
  );
}
