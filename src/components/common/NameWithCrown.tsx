import { Crown } from 'lucide-react';
import { getUserByName } from '../../store';

interface Props {
  name: string;
  className?: string;
  iconSize?: string;
}

export default function NameWithCrown({ name, className = '', iconSize = 'w-3 h-3' }: Props) {
  const role = getUserByName(name)?.role;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {name}
      {role === 'admin'    && <Crown className={`${iconSize} text-amber-400 flex-shrink-0`} />}
      {role === 'subadmin' && <Crown className={`${iconSize} text-blue-400 flex-shrink-0`} />}
    </span>
  );
}
