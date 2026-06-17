export function shareAnnouncement(params: {
  title: string;
  content: string;
  authorName: string;
}): void {
  const { title, content, authorName } = params;
  const lines = [
    '📢 [나랏말ᄊᆞ미] 공지사항',
    title,
    ...(content ? [`\n${content}`] : []),
    `\n(by ${authorName})`,
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
    '📍 [나랏말ᄊᆞ미] 장소 공지',
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
