import { Crown } from 'lucide-react';
import { getUserByName } from '../../store';

interface Props {
  name: string;
  className?: string;
  iconSize?: string;
  showAvatar?: boolean;
  avatarSize?: 'xs' | 'sm' | 'md';
}

const AV = {
  xs: { wrap: 'w-5 h-5',   text: 'text-[8px]' },
  sm: { wrap: 'w-6 h-6',   text: 'text-[10px]' },
  md: { wrap: 'w-8 h-8',   text: 'text-xs' },
};

export default function NameWithCrown({
  name,
  className = '',
  iconSize = 'w-3 h-3',
  showAvatar = false,
  avatarSize = 'sm',
}: Props) {
  const user = getUserByName(name);
  const role = user?.role;
  const av = AV[avatarSize];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showAvatar && (
        user?.avatarUrl
          ? <img
              src={user.avatarUrl}
              alt={name}
              className={`${av.wrap} rounded-full object-cover flex-shrink-0`}
            />
          : <span className={`${av.wrap} rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0`}>
              <span className={`${av.text} font-bold text-primary-600`}>{name[0]}</span>
            </span>
      )}
      <span className="inline-flex items-center gap-0.5">
        {name}
        {role === 'admin'    && <Crown className={`${iconSize} text-amber-400 flex-shrink-0`} />}
        {role === 'subadmin' && <Crown className={`${iconSize} text-blue-400 flex-shrink-0`} />}
      </span>
    </span>
  );
}
