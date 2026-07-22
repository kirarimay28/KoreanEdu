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
  classicPoetWork: string;
  classicProseWork: string;
  classicWork?: string;
  modernPoetWork: string;
  modernProseWork: string;
  goeoStart: number;
  goeoEnd: number;
}): void {
  const { date, classicPoetWork, classicProseWork, classicWork, modernPoetWork, modernProseWork, goeoStart, goeoEnd } = params;
  const d = new Date(date);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;

  const classicLines: string[] = [];
  if (classicPoetWork || classicProseWork) {
    if (classicPoetWork) classicLines.push(`■ 고전 시가: ${classicPoetWork}`);
    if (classicProseWork) classicLines.push(`■ 고전 산문: ${classicProseWork}`);
  } else if (classicWork) {
    classicLines.push(`■ 고전: ${classicWork}`);
  }

  const lines = [
    '📋 [나랏말] 이번 주 과제',
    `날짜: ${dateStr}`,
    '',
    ...classicLines,
    ...(modernPoetWork ? [`■ 현대시: ${modernPoetWork}`] : []),
    ...(modernProseWork ? [`■ 현대산문: ${modernProseWork}`] : []),
    '',
    '[고전]',
    '1. 수능 기출 풀이',
    '1) 문제 풀기',
    '2) 채점하기 (오답 있을 경우 →정답 체크 금지)',
    '3) 오답 정리',
    '-틀린 이유/오답이 오답인 이유/새로 고른 선지가 맞는 선지라고 판단한 근거',
    '4) 선지 단권화',
    '→작품 분석의 근거 추출하기 (문제 푸는 용도 XXX)',
    '',
    '2. 임용 기출 문제 유형 분석',
    '→키워드 위주로 분석합니다!',
    '지문/문제/선지 삼단 구조로 꼼꼼히!!',
    '',
    '3. 고어 암기 ▶ 매주 20개씩!',
    '→모이는 날에 10분 간 시험 봅니다!',
    '',
    '[현대]',
    '1. 수능 기출 풀이',
    '1) 문제 풀기',
    '2) 채점하기 (오답 있을 경우 →정답 체크 금지)',
    '3) 오답 정리',
    '-틀린 이유/오답이 오답인 이유/새로 고른 선지가 맞는 선지라고 판단한 근거',
    '4) 선지 단권화',
    '→작품 분석의 근거 추출하기 (문제 푸는 용도 XXX)',
    '',
    '2. 임용 기출 문제 유형 분석',
    '→키워드 위주로 분석합니다!',
    '지문/문제/선지 삼단 구조로 꼼꼼히!!',
    '',
    '★과제 불성실하게 해 오시면 경고 들어갑니다!!',
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
