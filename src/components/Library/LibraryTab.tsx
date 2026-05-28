import { BookMarked } from 'lucide-react';

export default function LibraryTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <BookMarked className="w-10 h-10 text-gray-200" />
      <p className="text-sm font-medium text-gray-400">도서관</p>
      <p className="text-xs text-gray-300">준비 중입니다.</p>
    </div>
  );
}
