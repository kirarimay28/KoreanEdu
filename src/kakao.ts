declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (params: object) => void;
      };
    };
  }
}

const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

export function initKakao() {
  if (!JS_KEY || !window.Kakao) return;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(JS_KEY);
  }
}

export function kakaoEnabled(): boolean {
  return !!JS_KEY && !!window.Kakao?.Share;
}

export function shareLocationNotice(params: {
  spaceName: string;
  startTime: string;
  endTime: string;
  notes: string;
  authorName: string;
}) {
  if (!kakaoEnabled()) return;
  const { spaceName, startTime, endTime, notes, authorName } = params;
  const lines = [
    '📍 [나랏말ᄊᆞ미] 장소 공지',
    `장소: ${spaceName}`,
    `시간: ${startTime} ~ ${endTime}`,
    ...(notes ? [`특이사항: ${notes}`] : []),
    `(by ${authorName})`,
  ];
  window.Kakao.Share.sendDefault({
    objectType: 'text',
    text: lines.join('\n'),
    link: {
      mobileWebUrl: 'https://korean-edu-pink.vercel.app',
      webUrl: 'https://korean-edu-pink.vercel.app',
    },
  });
}
