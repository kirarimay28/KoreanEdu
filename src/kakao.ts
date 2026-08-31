export function shareAnnouncement(params: {
  title: string;
  content: string;
  authorName: string;
}): void {
  const { title, content, authorName } = params;
  const lines = [
    '📢 [나랏말] 공지사항',
    title,
    ...(content ? [`\n${content}`] : []),
    `\n(by ${authorName})`,
    '\n⬇️자세한 내용⬇️\nhttps://korean-edu-pink.vercel.app/',
  ];
  const text = lines.join('\n');

  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사됐어요. 카카오톡에 붙여넣기 해주세요.');
    }).catch(() => {});
  }
}

export function shareAssignmentNotice(params: {
  date: string;
  works: Record<string, string>;  // subjectKey → work name
  goeoStart: number;
  goeoEnd: number;
  subjects: Array<{ key: string; label: string; methodText: string }>;
  warningText: string;
}): void {
  const { date, works, goeoStart, goeoEnd, subjects, warningText } = params;
  const d = new Date(date + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;

  const workLines: string[] = [];
  for (const subj of subjects) {
    const val = works[subj.key] ?? '';
    if (val && val !== '없음') workLines.push(`■ ${subj.label}: ${val}`);
    else if (val === '없음') workLines.push(`■ ${subj.label}: 없음`);
  }

  const methodLines: string[] = [];
  for (const subj of subjects) {
    methodLines.push(`[${subj.label}]`, subj.methodText, '');
  }

  const lines = [
    '📋 [나랏말] 이번 주 과제',
    `날짜: ${dateStr}`,
    '',
    ...workLines,
    '',
    ...methodLines,
    warningText,
    `★이번 주 고전 어휘는 ${goeoStart}번부터 ${goeoEnd}번까지입니다.`,
  ];

  const text = lines.join('\n');
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사됐어요. 카카오톡에 붙여넣기 해주세요.');
    }).catch(() => {});
  }
}

export function shareLocationNotice(params: {
  spaceName: string;
  startTime: string;
  endTime: string;
  notes: string;
  authorName: string;
}): void {
  const { spaceName, startTime, endTime, notes, authorName } = params;
  const lines = [
    '📍 [나랏말] 장소 공지',
    `장소: ${spaceName}`,
    `시간: ${startTime} ~ ${endTime}`,
    ...(notes ? [`특이사항: ${notes}`] : []),
    `(by ${authorName})`,
  ];
  const text = lines.join('\n');

  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사됐어요. 카카오톡에 붙여넣기 해주세요.');
    }).catch(() => {});
  }
}
