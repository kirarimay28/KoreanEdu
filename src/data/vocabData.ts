export interface VocabItem {
  num: number;       // sequential 1–100
  vocab: string;     // word shown in question sheet
  answer: string;    // correct answer from answer key
}

// Sequential 1–100. Source: 달콤한 국어 고어 단어 100.
export const VOCAB_ITEMS: VocabItem[] = [
  // ── 명사형 ──────────────────────────────────────────────────────────
  { num: 1,   vocab: 'ᄀᆞ슬',                                   answer: '가을' },
  { num: 2,   vocab: '나리(물)',                                  answer: '시내(물)' },
  { num: 3,   vocab: '소반(小盤)',                                answer: '밥상' },
  { num: 4,   vocab: '바ᄅᆞ',                                    answer: '바다' },
  { num: 5,   vocab: '졍지',                                     answer: '부엌' },
  { num: 6,   vocab: '님빅 / 곰빅',                              answer: '앞 / 뒤' },
  { num: 7,   vocab: '즈슬',                                     answer: '모습을' },
  { num: 8,   vocab: '즈믄 / 온',                                answer: '천(1000) / 백(100)' },
  { num: 9,   vocab: '별헤',                                     answer: '벼랑에' },
  { num: 10,  vocab: '곶(ᄭᅩᆺ)',                                 answer: '꽃' },
  { num: 11,  vocab: '백구',                                     answer: '흰 갈매기' },
  { num: 12,  vocab: '이화',                                     answer: '배꽃(흰색, 봄)' },
  { num: 13,  vocab: '도화',                                     answer: '복숭아꽃(붉은색)' },
  { num: 14,  vocab: '행화',                                     answer: '살구꽃(분홍빛)' },
  { num: 15,  vocab: '해오라비',                                  answer: '해오라기, 하얀 백로' },
  { num: 16,  vocab: '뫼',                                       answer: '산 / 수라(궁중용어)' },
  { num: 17,  vocab: '하얌(향암)',                                answer: '시골에 살아 세상 이치를 모르는 어리석은 사람' },
  { num: 18,  vocab: '소(沼) / 지당(池塘)',                       answer: '연못' },
  { num: 19,  vocab: '청약립 / 녹사의',                          answer: '갓 / 우비(소박한 옷차림)' },
  { num: 20,  vocab: '믈 / 블 / 플',                             answer: '물 / 불 / 풀' },
  { num: 21,  vocab: '시비(柴扉)',                                answer: '사립문' },
  { num: 22,  vocab: '실솔',                                     answer: '귀뚜라미' },
  { num: 23,  vocab: '즌ᄃᆡ',                                    answer: '진 곳(위험한 곳)' },
  { num: 24,  vocab: '사창 / 옥창 / 규방',                       answer: '여인의 방' },
  { num: 25,  vocab: '해동 / 계림 / 동이 / 동방',                answer: '우리나라' },
  { num: 26,  vocab: '여름',                                     answer: '열매' },
  { num: 27,  vocab: '벽계수',                                   answer: '푸른 시냇물' },
  { num: 28,  vocab: '녀름',                                     answer: '여름' },
  { num: 29,  vocab: 'ᄀᆞ름(가롬)',                              answer: '강' },
  { num: 30,  vocab: 'ᄯᅡ',                                     answer: '땅' },
  { num: 31,  vocab: '관산',                                     answer: '국경, 관문, 요새' },
  { num: 32,  vocab: 'ᄭᅳᆺ(ᄭᅳ)',                               answer: '끝' },
  { num: 33,  vocab: '촉(燭)',                                   answer: '촛불' },
  { num: 34,  vocab: '녹양(綠楊) / 양류',                        answer: '버드나무' },
  { num: 35,  vocab: '연하 / 금수',                              answer: '안개와 노을 / 수놓은 비단' },
  { num: 36,  vocab: '혜음(혬, 혬가림)',                          answer: '근심, 걱정, 시름' },
  { num: 37,  vocab: '남여',                                     answer: '가마' },
  { num: 38,  vocab: '황운(黃雲)',                                answer: '누렇게 익은 곡식' },
  { num: 39,  vocab: '건곤',                                     answer: '하늘과 땅(온 세상)' },
  { num: 40,  vocab: '모쳠',                                     answer: '초가의 처마' },
  { num: 41,  vocab: '늘애(늘의)',                                answer: '날개' },
  { num: 42,  vocab: '이리',                                     answer: '아양' },
  { num: 43,  vocab: '삼춘 / 삼하 / 삼추 / 삼동',               answer: '봄 / 여름 / 가을 / 겨울' },
  { num: 44,  vocab: '시앗',                                     answer: '첩' },
  { num: 45,  vocab: '침선',                                     answer: '바느질' },
  { num: 46,  vocab: '수품',                                     answer: '솜씨, 실력, 능력' },
  { num: 47,  vocab: '잣',                                       answer: '성(城)' },
  { num: 48,  vocab: 'ᄆᆞ슬(ᄆᆞ을)',                            answer: '마을' },
  { num: 49,  vocab: '파람',                                     answer: '휘파람' },
  { num: 50,  vocab: '우음',                                     answer: '웃음' },
  { num: 51,  vocab: '홍진(紅塵) / 풍진 / 진세 / 인간 / 인세 / 사바 / 하계 / 차안', answer: '세속적 세계, 인간세계, 삶의 세계' },

  // ── 동사·형용사형 ─────────────────────────────────────────────────
  { num: 52,  vocab: '선ᄒᆞ다',                                  answer: '서운하다' },
  { num: 53,  vocab: '녀다(니다, 녜다)',                          answer: '가다, 지내다, 살아가다' },
  { num: 54,  vocab: '얼다',                                     answer: '(육체적)사랑하다' },
  { num: 55,  vocab: '괴다',                                     answer: '(정신적)사랑하다' },
  { num: 56,  vocab: '벼기다',                                   answer: '우기다, 모함하다' },
  { num: 57,  vocab: '방송하다',                                  answer: '내보내다, 석방하다' },
  { num: 58,  vocab: '늣기다(느끼다)',                            answer: '흐느끼다' },
  { num: 59,  vocab: '이슷하다',                                  answer: '비슷하다' },
  { num: 60,  vocab: '혀다',                                     answer: '(악기, 불)을 켜다' },
  { num: 61,  vocab: '어엿브다',                                  answer: '불쌍하다' },
  { num: 62,  vocab: '싀어디여',                                  answer: '사라져서, 죽어 없어져' },
  { num: 63,  vocab: '삼기다',                                   answer: '생기다, 태어나다, 만들어지다' },
  { num: 64,  vocab: 'ᄭᅴ우다',                                  answer: '꺼리다' },
  { num: 65,  vocab: 'ᄆᆞᆯ다 / 견화이다 / 마련하다',             answer: '마름질하다 / 재단하다' },
  { num: 66,  vocab: '여다(여희다)',                              answer: '이별하다, 헤어지다' },
  { num: 67,  vocab: '둏다(됴타)',                                answer: '좋다' },
  { num: 68,  vocab: '좋다(조타)',                                answer: '깨끗하다' },
  { num: 69,  vocab: '헌사ᄒᆞ다',                                answer: '야단스럽다' },
  { num: 70,  vocab: '어리다',                                   answer: '어리석다' },
  { num: 71,  vocab: '슬허하다',                                  answer: '슬퍼하다' },
  { num: 72,  vocab: '외다',                                     answer: '그르다, 잘못되다' },
  { num: 73,  vocab: '하다',                                     answer: '많다(多), 크다(大)' },
  { num: 74,  vocab: '쟐다',                                     answer: '짧다' },
  { num: 75,  vocab: '수이',                                     answer: '쉽게' },
  { num: 76,  vocab: '긋다',                                     answer: '끊어지다' },
  { num: 77,  vocab: '닛다',                                     answer: '이어지다' },
  { num: 78,  vocab: '오뎐된',                                   answer: '방정맞은' },
  { num: 79,  vocab: '고두',                                     answer: '머리를 조아리다' },
  { num: 80,  vocab: '오마 ᄒᆞ다(오다ᄒᆞ다)',                    answer: '온다고 하다' },
  { num: 81,  vocab: '가시다',                                   answer: '변하다, 바뀌다' },

  // ── 부사형 ──────────────────────────────────────────────────────────
  { num: 82,  vocab: 'ᄌᆞ로',                                    answer: '자주' },
  { num: 83,  vocab: '모쳐라',                                   answer: '마침' },
  { num: 84,  vocab: '고텨',                                     answer: '다시' },
  { num: 85,  vocab: '져근덧 / 건듯',                            answer: '잠깐 사이에, 어느 덧, 문득' },
  { num: 86,  vocab: '슬ᄀᆞ장',                                  answer: '실컷' },
  { num: 87,  vocab: 'ᄒᆞ마(하마)',                              answer: '이미, 벌써' },
  { num: 88,  vocab: '빗기(비겨)',                                answer: '비스듬히' },
  { num: 89,  vocab: '유세차',                                   answer: '이해의 차례는(제문 첫머리 관용어)' },

  // ── 조사·어미(문법적 기능)형 ──────────────────────────────────────
  { num: 90,  vocab: '~ㄹ셰라',                                  answer: '~할까 두렵다' },
  { num: 91,  vocab: '~손ᄃᆡ',                                   answer: '~에게' },
  { num: 92,  vocab: '~도곤 / ~라와 / ~에',                      answer: '~보다(비교부사격조사)' },
  { num: 93,  vocab: '~우희',                                    answer: '~전에(시간) / ~위에(공간)' },
  { num: 94,  vocab: '~다히(~다이)',                              answer: '~의, ~쪽(~답게)' },
  { num: 95,  vocab: '~ᄃᆡ',                                     answer: '~곳(장소)' },
  { num: 96,  vocab: '~제',                                      answer: '~때' },
  { num: 97,  vocab: '~ᄏᆞ니와',                                 answer: '물론이거니와' },
  { num: 98,  vocab: '~하 / ~곰',                                answer: '~야(호격조사) / ~좀(강세접미사)' },
  { num: 99,  vocab: '~고져',                                    answer: '~하고자(소망, 의도)' },
  { num: 100, vocab: '~다호라',                                  answer: '~같구나' },
];

export function normalizeAnswer(s: string): string {
  let r = s;
  while (/\([^()]*\)/.test(r)) r = r.replace(/\([^()]*\)/g, '');
  return r.replace(/\s/g, '');
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const split = (s: string) =>
    normalizeAnswer(s).split(',').map(t => t.trim()).filter(Boolean).sort();
  const u = split(userAnswer);
  const c = split(correctAnswer);
  return u.length === c.length && u.every((v, i) => v === c[i]);
}
