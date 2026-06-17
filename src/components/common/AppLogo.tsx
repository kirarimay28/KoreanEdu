interface Props {
  className?: string;
}

export default function AppLogo({ className = '' }: Props) {
  return (
    <img
      src="/logo.png"
      alt="나랏말ᄊᆞ미"
      className={className}
      style={{ imageRendering: 'auto', height: '1.75rem', width: 'auto', maxHeight: '1.75rem' }}
    />
  );
}
