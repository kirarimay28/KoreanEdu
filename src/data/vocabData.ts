export interface VocabItem {
  num: number;       // sequential 1–60
  vocab: string;     // word shown in question sheet
  answer: string;    // correct answer from answer key
}

// Sequential 1–60.
// PDF has duplicate #25 (병풍 / 수간모옥) and no #59 — renumbered sequentially here.
export const VOCAB_ITEMS: VocabItem[] = [
  { num: 1,  vocab: '하다',                                        answer: '많다, 크다' },
  { num: 2,  vocab: 'ᄒᆞ다',                                      answer: '하다' },
  { num: 3,  vocab: '둏다(됴타)',                                   answer: '좋다' },
  { num: 4,  vocab: '좋다(죠타)',                                   answer: '깨끗하다' },
  { num: 5,  vocab: '니르다, 닐러',                                 answer: '이르다, 일러' },
  { num: 6,  vocab: '어리다',                                       answer: '어리석다' },
  { num: 7,  vocab: '어엿브다',                                     answer: '불쌍하다' },
  { num: 8,  vocab: '헌사ᄒᆞ다',                                   answer: '야단스럽다, 신비롭다' },
  { num: 9,  vocab: '싀어디다',                                     answer: '죽다, 사라지다' },
  { num: 10, vocab: '녜다, 녀다, 니다',                             answer: '가다' },
  { num: 11, vocab: '머흘다',                                       answer: '험하다' },
  { num: 12, vocab: '괴다',                                         answer: '사랑하다' },
  { num: 13, vocab: '혜다(혬)',                                     answer: '생각하다, 헤아리다(생각)' },
  { num: 14, vocab: '쿠니와',                                       answer: '커녕' },
  { num: 15, vocab: '도곤',                                         answer: '보다(비교)' },
  { num: 16, vocab: 'ᄉᆞᆯᄀᆞ장, ᄉᆞᆯ지',                         answer: '실컷' },
  { num: 17, vocab: '져근덧',                                       answer: '잠깐 동안' },
  { num: 18, vocab: '풍류를 드러내는 소재',                          answer: '술(酒), 낚시(조수(釣水)), 거문고(녹기금(綠綺琴))' },
  { num: 19, vocab: '인간(人間)',                                    answer: '인간세상, 속세' },
  { num: 20, vocab: '홍진(紅塵)',                                    answer: '속된 인간 세상' },
  { num: 21, vocab: '삼공(三公)',                                    answer: '삼정승(높은 벼슬)' },
  { num: 22, vocab: '백옥경(白玉京) 십이루(十二樓)',                  answer: '옥황상제가 사는 궁궐과 누각(임금이 계신 궁궐)' },
  { num: 23, vocab: '강호(江湖)',                                    answer: '자연 = 믈외, 연하일휘(煙霞日揮), 강산풍월(江山風月)' },
  { num: 24, vocab: '금수(錦繡)',                                    answer: '수놓은 비단(아름다운 자연을 비유)' },
  { num: 25, vocab: '병풍(屛風)',                                    answer: '아름다운 자연을 병풍에 그려진 그림에 비유' },
  { num: 26, vocab: '수간모옥(數間茅屋)',                             answer: '초가삼간' },
  { num: 27, vocab: '시비(是非)(柴扉)',                              answer: '시시비비(옳고 그름), 사립문' },
  { num: 28, vocab: '단표누항(簞瓢陋巷)',                             answer: '더러운 거리에서 먹는 한 그릇의 밥과 한 바가지의 물' },
  { num: 29, vocab: '삼순구식(三旬九食)',                             answer: '삼십 일에 아홉끼 먹는 가난한 생활' },
  { num: 30, vocab: '빈이무원(貧而無怨)',                             answer: '가난하지만 원망하지 않음' },
  { num: 31, vocab: '무심(無心)',                                    answer: '욕심이 없다' },
  { num: 32, vocab: '어옹(漁翁)',                                    answer: '늙은 어부(자연을 즐기는 삶)' },
  { num: 33, vocab: '천석고황(泉石膏肓), 연하고질(煙霞痼疾)',          answer: '자연을 사랑하는 병' },
  { num: 34, vocab: '물아일체(物我一體)',                             answer: '외물(外物)과 자아, 객관과 주관, 또는 물질계와 정신계가 어울려 하나가 됨' },
  { num: 35, vocab: '소요음영(逍遙吟詠)',                             answer: '천천히 거닐며 시를 읊음(≒미음완보(微吟緩步))' },
  { num: 36, vocab: '청려장(靑藜杖)',                                 answer: '명아주 지팡이(≒죽장(竹杖): 대나무 지팡이)' },
  { num: 37, vocab: '남여(藍輿)',                                    answer: '뚜껑이 없는 작은 가마' },
  { num: 38, vocab: '편작(扁鵲)',                                    answer: '명의의 대유' },
  { num: 39, vocab: '백이숙제(이제)',                                 answer: '지조와 절개의 아이콘' },
  { num: 40, vocab: '소부허유(소허)',                                 answer: '절개를 지키려고 산으로 들어간 중국의 대표적인 은둔 지사, 소부 허유(巢父許由)' },
  { num: 41, vocab: '희황(羲皇)',                                    answer: '중국 고대 태평성대를 이룬 복희씨' },
  { num: 42, vocab: '약수(弱水)',                                    answer: '중국 전설의 건널 수 없는 강→장애물' },
  { num: 43, vocab: '앙금(鴦衾)',                                    answer: '원앙이 수 놓아 있는 이불(부부 이불)' },
  { num: 44, vocab: '자규(子規)',                                    answer: '애상감(한(恨))을 드러내는 새(≒접동새, 소쩍새, 두견새, 불여귀, 귀촉도)' },
  { num: 45, vocab: '백구(白鷗)',                                    answer: '흰 갈매기(자연친화적 대상, 청자 설정)' },
  { num: 46, vocab: '실솔(蟋蟀)',                                    answer: '귀뚜라미(가을의 계절감)' },
  { num: 47, vocab: '암향(暗香)',                                    answer: '그윽이 풍기는 향기, 매화 향기, 충(忠)' },
  { num: 48, vocab: '미화(梅花)',                                    answer: '매실나무 꽃(봄의 계절감, 충(忠))' },
  { num: 49, vocab: '이화(梨花)',                                    answer: '배꽃(봄의 계절감)' },
  { num: 50, vocab: '도화(桃花)',                                    answer: '복숭아꽃(봄의 계절감, 도교적 이상세계)' },
  { num: 51, vocab: '행화(杏花)',                                    answer: '살구꽃(봄의 계절감)' },
  { num: 52, vocab: '세우(細雨)',                                    answer: '가랑비' },
  { num: 53, vocab: '녹음(綠陰)',                                    answer: '푸른 잎이 우거진 나무나 수풀. 또는 그 나무의 그늘(여름의 계절감)' },
  { num: 54, vocab: '서리',                                          answer: '대기 중의 수증기가 지상의 물체 표면에 얼어붙은 것(가을의 계절감)' },
  { num: 55, vocab: '삭풍(朔風)',                                    answer: '겨울 바람(\'눈\'과 함께 겨울의 계절감)' },
  { num: 56, vocab: '-고져',                                         answer: '-고자 한다(소망)' },
  { num: 57, vocab: '2인칭 주어+-는다(는다)',                         answer: '-는가?(의문형)' },
  { num: 58, vocab: '-ㄹ셰라',                                       answer: '-할까 두렵다' },
  { num: 59, vocab: '-셰라, -ㄹ샤',                                  answer: '-구나(감탄형)' },
  { num: 60, vocab: '어와, 어즈버',                                  answer: '아아(감탄사)' },
];

export function normalizeAnswer(s: string): string {
  return s.replace(/\s/g, '');
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}
