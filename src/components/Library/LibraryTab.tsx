import { FileText, Download } from 'lucide-react';

interface LibraryItem {
  title: string;
  description: string;
  filename: string;
  size: string;
  tag: string;
  tagColor: string;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    title: '고전문학 필독 작품 목록',
    description: '조선대 국어교육과 고전문학 필독 작품 목록 — 고대가요, 향가, 고려가요, 경기체가, 악장, 시조, 가사, 고전산문, 판소리 등 갈래별 정리',
    filename: '고전문학-필독작품목록.pdf',
    size: '319KB',
    tag: '작품 목록',
    tagColor: 'bg-indigo-50 text-indigo-600',
  },
  {
    title: '고전어 어휘 100개',
    description: '달콤한 국어 — 필수 고전어 어휘 100개, 현대어 풀이 및 예문 포함',
    filename: '고전어-어휘100.pdf',
    size: '353KB',
    tag: '어휘',
    tagColor: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: '고전문학 작품 학습지',
    description: '개별 작품 분석 학습지 — 갈래, 시적 화자, 배경, 정서·태도, 표현 등 항목별 정리 양식',
    filename: '고전문학-작품학습지.pdf',
    size: '620KB',
    tag: '학습지',
    tagColor: 'bg-amber-50 text-amber-600',
  },
];

export default function LibraryTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-4">클릭하면 새 탭에서 열립니다.</p>
      {LIBRARY_ITEMS.map(item => (
        <a
          key={item.filename}
          href={`/${item.filename}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition">
            <FileText className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-gray-800">{item.title}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.tagColor}`}>{item.tag}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
            <p className="text-[10px] text-gray-400 mt-1.5">{item.size}</p>
          </div>
          <Download className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />
        </a>
      ))}
    </div>
  );
}
