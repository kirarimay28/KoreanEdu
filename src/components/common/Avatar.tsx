interface Props {
  user: { username: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { wrapper: 'w-7 h-7', text: 'text-xs', img: 28 },
  md: { wrapper: 'w-10 h-10', text: 'text-base', img: 40 },
  lg: { wrapper: 'w-14 h-14', text: 'text-2xl', img: 56 },
  xl: { wrapper: 'w-20 h-20', text: 'text-3xl', img: 80 },
};

export default function Avatar({ user, size = 'md', className = '' }: Props) {
  const s = sizeMap[size];
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        className={`${s.wrapper} rounded-2xl object-cover flex-shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${s.wrapper} rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`${s.text} font-black text-primary-600`}>{user.username[0]}</span>
    </div>
  );
}
