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
        background: 'linear-gradient(95deg, #be3065 0%, #de4e80 30%, #f890bc 60%, #be3065 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      나랏말
    </span>
  );
}
