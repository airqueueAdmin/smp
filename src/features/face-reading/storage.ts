export type FortuneCategory = {
  key: 'wealth' | 'relationship' | 'achievement'
  label: string
  score: number
  summary: string
  factBomb: string
  action: string
}

export type FacePoint = {
  part: string
  headline: string
  description: string
  factBomb: string
}

export type FaceReadingRecord = {
  readingVersion: 2
  id: string
  createdAt: string
  totalScore: number
  title: string
  subtitle: string
  summary: string
  punchline: string
  outerImpression: string
  innerDrive: string
  stressPattern: string
  strengths: string[]
  blindSpots: string[]
  resetAction: string
  keywords: string[]
  categories: FortuneCategory[]
  facePoints: FacePoint[]
  luckyColor: string
  luckyMoment: string
}

type FortuneKey = FortuneCategory['key']

const HISTORY_KEY = 'gwansang-log:reading-history'
const MAX_HISTORY_LENGTH = 12

const ARCHETYPES = [
  {
    title: '배려하다 혼자 삐지는 조율가',
    subtitle: '분위기는 다 읽는데 내 마음은 뒤늦게 말하는 얼굴',
    summary: '관상식으로 풀면 사람 사이의 온도 차이를 빠르게 알아채고, 어색한 자리를 매끄럽게 만드는 힘이 있어요. 문제는 남의 기분은 실시간으로 챙기면서 정작 내 불편함은 “이 정도는 괜찮지” 하고 미뤄둔다는 거예요.',
    punchline: '싫은 소리는 못 했는데 상대가 알아서 눈치채길 바라고 있어요.',
    outerImpression: '부드럽고 믿을 만한 사람으로 보여요. 처음 만난 사람도 편하게 속얘기를 꺼내는 편이에요.',
    innerDrive: '사람들이 나를 필요로 할 때 안정감을 느껴요. 관계가 흔들리면 내 책임부터 찾는 경향이 있어요.',
    stressPattern: '참을 만큼 참았다고 생각한 순간 갑자기 거리를 둬요. 상대는 이유를 모르고, 본인은 이미 마음속에서 세 번쯤 이별한 상태가 되기 쉬워요.',
    strengths: ['갈등이 커지기 전에 분위기를 정리해요.', '상대가 말하지 않은 필요도 빨리 알아채요.', '여러 사람의 의견을 현실적인 합의로 묶어요.'],
    blindSpots: ['배려와 자기검열을 자주 헷갈려요.', '거절하지 않고 맡은 뒤 혼자 억울해해요.', '솔직한 대화보다 눈치 테스트를 먼저 시작해요.'],
    resetAction: '오늘 한 번은 돌려 말하지 말고 “나는 이게 불편해”라고 짧게 말해보세요.',
    keywords: ['눈치만렙', '속앓이', '신뢰감'],
  },
  {
    title: '일단 저지르고 수습하는 개척자',
    subtitle: '망설임보다 출발이 빠른 얼굴',
    summary: '결정 속도와 추진력이 강해서 남들이 회의만 할 때 이미 첫 결과물을 만드는 타입이에요. 다만 속도가 곧 방향은 아니라는 사실을 종종 두 번째 시행착오쯤에서 깨닫는 편이에요.',
    punchline: '용감한 게 맞는데, 가끔은 확인하기 귀찮아서 그냥 출발한 거예요.',
    outerImpression: '자신감 있고 답답함이 없는 사람으로 보여요. 일이 막히면 모두가 자연스럽게 당신을 쳐다봐요.',
    innerDrive: '주도권을 직접 잡고 결과를 만드는 데서 에너지를 얻어요. 통제할 수 없는 대기 시간이 가장 힘들어요.',
    stressPattern: '속도가 떨어지면 더 세게 밀어붙여요. 문제를 해결하려다 사람까지 과제로 취급하는 순간이 생길 수 있어요.',
    strengths: ['애매한 상황에서도 첫 결정을 내려요.', '실패를 오래 붙잡지 않고 다음 방법을 찾아요.', '주변 사람의 실행 속도까지 끌어올려요.'],
    blindSpots: ['설명 없이 결론부터 말해 독주처럼 보여요.', '시작의 재미가 사라지면 마무리를 미뤄요.', '도움을 요청하면 질 것 같아 혼자 버텨요.'],
    resetAction: '오늘 중요한 결정 하나는 실행 전에 반대 의견을 한 사람에게만 물어보세요.',
    keywords: ['돌진력', '수습본능', '독립심'],
  },
  {
    title: '생각이 너무 많은 전략가',
    subtitle: '작은 단서까지 계산하고 움직이는 얼굴',
    summary: '표면보다 맥락을 읽는 감각이 좋아서 허술한 계획과 빈말을 빠르게 알아채요. 준비한 만큼 실수가 적지만, 완벽한 타이밍을 기다리다가 쉬운 기회까지 어렵게 만드는 재주도 있어요.',
    punchline: '신중한 게 아니라 확신을 120% 받을 때까지 미루는 중일 수 있어요.',
    outerImpression: '차분하고 빈틈이 적어 보여요. 쉽게 흥분하지 않아 중요한 일을 맡기고 싶은 인상을 줘요.',
    innerDrive: '예측 가능한 구조와 충분한 근거가 있을 때 가장 편안해요. 모르는 채로 시작하는 것을 유난히 싫어해요.',
    stressPattern: '변수를 줄이려고 생각을 더 늘려요. 결국 머릿속 회의 참석자는 열 명인데 실제 행동하는 사람은 아무도 없는 상태가 돼요.',
    strengths: ['남들이 놓친 위험과 허점을 먼저 발견해요.', '감정보다 근거를 모아 안정적인 선택을 해요.', '복잡한 정보를 이해하기 쉽게 정리해요.'],
    blindSpots: ['준비를 생산성처럼 느끼며 실행을 늦춰요.', '상대의 말에서 숨은 뜻을 과하게 찾아요.', '실수하지 않으려다 새로운 경험 자체를 줄여요.'],
    resetAction: '완성도 70%인 일 하나를 오늘 바로 공개하거나 제출해보세요.',
    keywords: ['과몰입', '분석력', '완벽주의'],
  },
  {
    title: '분위기로 위기를 넘기는 낙천가',
    subtitle: '사람과 기회를 가볍게 끌어당기는 얼굴',
    summary: '새로운 관계와 변화에 열린 인상이라 어디서든 빠르게 자리를 잡아요. 무거운 분위기를 풀어주는 재능이 있지만, 웃고 넘긴 문제가 사라진 것은 아니라는 사실을 가끔 잊어요.',
    punchline: '긍정적인 게 장점인데, 귀찮은 현실까지 긍정으로 덮지는 마세요.',
    outerImpression: '밝고 접근하기 쉬운 사람으로 보여요. 처음 보는 자리에서도 오래 있던 사람처럼 자연스럽게 섞여요.',
    innerDrive: '재미와 새로운 자극이 있어야 집중력이 살아나요. 반복과 관리가 길어지면 마음이 먼저 다른 곳으로 가요.',
    stressPattern: '불편한 감정을 농담으로 바꾸고 약속을 가볍게 잡아요. 순간은 넘기지만 나중에 일정과 감정이 한꺼번에 밀려와요.',
    strengths: ['낯선 사람과도 빠르게 접점을 찾아요.', '위기에서 분위기를 환기하고 다시 움직여요.', '새로운 기회를 겁내지 않고 받아들여요.'],
    blindSpots: ['재미가 없으면 중요한 일도 뒤로 밀어요.', '괜찮다고 말한 뒤 속으로는 부담을 키워요.', '시작한 일을 관리하는 루틴이 약해요.'],
    resetAction: '오늘 가장 하기 싫은 일부터 20분만 타이머를 켜고 끝내세요.',
    keywords: ['친화력', '현실회피', '순발력'],
  },
  {
    title: '혼자 다 짊어지는 완성가',
    subtitle: '결국 끝을 보는 책임감 강한 얼굴',
    summary: '화려한 말보다 결과와 꾸준함으로 신뢰를 얻는 타입이에요. 맡은 일은 웬만하면 끝내지만, 아무도 부탁하지 않은 책임까지 주워 담고 “왜 나만 하지?”라는 결론에 도착하기 쉬워요.',
    punchline: '책임감이 센 게 아니라 남에게 맡기고 불안해할 바엔 직접 하는 쪽을 택한 거예요.',
    outerImpression: '묵직하고 약속을 지키는 사람으로 보여요. 급한 순간에 가장 먼저 떠올리는 사람일 가능성이 커요.',
    innerDrive: '쓸모 있는 사람이라는 확신에서 안정감을 얻어요. 기대에 못 미치는 모습을 보여주는 것을 지나치게 경계해요.',
    stressPattern: '말없이 일을 더 가져오고 표정이 굳어요. 도움은 거절하면서 아무도 돕지 않는다고 느끼는 모순에 빠질 수 있어요.',
    strengths: ['긴 호흡의 일을 꾸준히 밀고 가요.', '작은 약속도 가볍게 넘기지 않아요.', '위기에서도 실무를 챙겨 결과를 남겨요.'],
    blindSpots: ['위임보다 직접 하는 게 빠르다는 말을 자주 해요.', '쉬는 동안에도 해야 할 일을 떠올려요.', '기준을 말하지 않고 상대가 맞추길 기대해요.'],
    resetAction: '오늘 해야 할 일 중 하나는 방법까지 통제하지 말고 다른 사람에게 맡겨보세요.',
    keywords: ['책임과다', '버티기', '완성력'],
  },
  {
    title: '말이 먼저 도착하는 설득가',
    subtitle: '생각과 매력을 빠르게 전달하는 얼굴',
    summary: '원하는 것을 언어와 표정으로 선명하게 전달해 사람을 움직이는 힘이 있어요. 다만 설명하는 순간에는 이미 해낸 것처럼 느껴져, 일정표가 말의 속도를 따라오지 못할 때가 있어요.',
    punchline: '말을 너무 잘해서 본인도 아직 안 한 일을 거의 끝낸 줄 알아요.',
    outerImpression: '자신감 있고 반응이 빠른 사람으로 보여요. 발표나 협상처럼 시선이 모이는 자리에서 존재감이 커져요.',
    innerDrive: '내 생각이 사람에게 닿고 반응이 돌아올 때 에너지가 올라요. 무시당하거나 설명할 기회가 없으면 크게 답답해해요.',
    stressPattern: '말이 많아지고 약속의 범위가 커져요. 설득은 성공했는데 정작 실행할 시간은 남지 않는 상황을 만들기 쉬워요.',
    strengths: ['복잡한 생각을 매력적인 언어로 바꿔요.', '상대의 반응을 보며 표현 방식을 빠르게 바꿔요.', '사람이 모인 자리에서 방향과 에너지를 만들어요.'],
    blindSpots: ['설명한 것을 실행한 것으로 착각해요.', '조용한 사람의 반대를 동의로 해석해요.', '흥이 오르면 지키기 어려운 약속까지 해요.'],
    resetAction: '오늘 새 약속을 하나 잡기 전에 기존 약속 하나의 마감부터 확인하세요.',
    keywords: ['말발', '과한약속', '존재감'],
  },
] as const

const FOREHEAD_POINTS = [
  {
    headline: '넓게 트인 이마',
    description: '전체 흐름과 다음 수를 먼저 보는 기획형 기운이 강해요. 한 가지 일만 보기보다 여러 가능성을 동시에 열어두는 편이에요.',
    factBomb: '계획표를 예쁘게 만드는 것과 실제로 시작하는 것은 다른 일이라는 점만 기억하세요.',
  },
  {
    headline: '단정한 이마선',
    description: '원칙과 순서를 중시해 실수를 줄이고, 한번 만든 기준을 안정적으로 유지하는 힘이 보여요.',
    factBomb: '내 기준이 분명한 건 좋은데, 설명하지 않은 기준을 남이 모른다고 답답해하면 억울한 건 상대예요.',
  },
  {
    headline: '부드러운 이마 윤곽',
    description: '낯선 상황에서도 정면충돌보다 우회로를 찾아내는 유연한 판단력이 돋보여요.',
    factBomb: '유연함을 핑계로 결정까지 미루면 선택지가 늘어나는 게 아니라 피로만 늘어요.',
  },
] as const

const EYE_POINTS = [
  {
    headline: '차분하게 모이는 눈매',
    description: '상대의 속도와 감정 변화를 세심하게 포착하는 관찰력이 강한 인상이에요.',
    factBomb: '눈치는 빠른데 확인은 안 해서, 혼자 결론 내리고 혼자 서운해질 가능성이 있어요.',
  },
  {
    headline: '또렷한 눈의 중심',
    description: '목표가 정해지면 주변 소음을 줄이고 한 지점에 집중하는 힘이 강해 보여요.',
    factBomb: '집중력이 고집으로 바뀌는 순간, 맞는 방향보다 내가 정한 방향을 지키는 데 집착해요.',
  },
  {
    headline: '편안하게 열린 눈매',
    description: '새로운 사람과 정보를 경계하기보다 먼저 받아들이는 개방적인 기운이 있어요.',
    factBomb: '사람을 잘 믿는 건 장점이지만, 첫인상이 좋다는 이유로 검증까지 생략하지는 마세요.',
  },
] as const

const NOSE_POINTS = [
  {
    headline: '균형 잡힌 코의 중심',
    description: '이상과 현실 사이에서 손익을 계산하고 자원을 안정적으로 배분하는 감각이 보여요.',
    factBomb: '아끼는 데 집중하다가 정작 성장에 필요한 지출까지 손해로 볼 수 있어요.',
  },
  {
    headline: '곧은 콧대의 흐름',
    description: '결정한 방향을 쉽게 바꾸지 않고 꾸준히 밀어가는 자존과 버티는 힘이 강해요.',
    factBomb: '소신과 수정 거부는 한 끗 차이예요. 이미 틀린 길이면 오래 버틴다고 정답이 되지는 않아요.',
  },
  {
    headline: '부드러운 코끝',
    description: '실속을 챙기면서도 가까운 사람에게는 기꺼이 자원을 나누는 온기가 보여요.',
    factBomb: '남에게 쓸 때는 통 큰데 나를 위한 투자는 계속 다음 달로 미루는 경향이 있어요.',
  },
] as const

const MOUTH_POINTS = [
  {
    headline: '안정적인 입매',
    description: '말을 고르고 약속의 무게를 아는 신중한 소통 방식이 드러나요.',
    factBomb: '말을 아끼는 것과 설명을 생략하는 것은 달라요. 침묵이 항상 어른스러운 대응은 아니에요.',
  },
  {
    headline: '부드럽게 올라간 입꼬리',
    description: '호감과 기회를 대화 속에서 자연스럽게 만드는 친화력이 돋보여요.',
    factBomb: '분위기 맞추느라 웃었는데 동의한 것으로 처리되는 일이 생겨요. 싫을 때는 표정보다 말을 쓰세요.',
  },
  {
    headline: '선명한 입술선',
    description: '생각과 감정을 분명하게 표현하고 말로 흐름을 주도하는 힘이 있어요.',
    factBomb: '솔직함은 면죄부가 아니에요. 맞는 말도 타이밍과 표현이 세면 그냥 센 말로 남아요.',
  },
] as const

const JAW_POINTS = [
  {
    headline: '둥글게 이어진 턱선',
    description: '관계를 오래 품고 맡은 사람과 일을 끝까지 책임지는 안정감이 보여요.',
    factBomb: '끝까지 품는다고 다 좋은 관계는 아니에요. 정리할 인연까지 책임지려 하지 마세요.',
  },
  {
    headline: '단단한 턱의 중심',
    description: '어려운 순간에도 쉽게 무너지지 않고 마무리까지 버티는 힘이 강해요.',
    factBomb: '참는 능력이 좋다는 이유로 계속 참을 상황을 고르는 건 능력 낭비예요.',
  },
  {
    headline: '매끄러운 얼굴 윤곽',
    description: '상황의 변화에 맞춰 속도와 태도를 조절하는 현실적인 균형 감각이 좋아요.',
    factBomb: '맞춰주는 데 익숙해서 정작 내가 원하는 방향이 뭔지 늦게 알아차릴 수 있어요.',
  },
] as const

const LUCKY_COLORS = ['짙은 자주', '고요한 남색', '따뜻한 호박색', '맑은 옥색', '부드러운 상아색']
const LUCKY_MOMENTS = ['오전 9시에서 11시', '점심 직후의 짧은 산책', '오후 3시 무렵', '해 질 녘', '저녁 8시 이후']

const FORTUNE_COPY: Record<FortuneKey, {
  high: Omit<FortuneCategory, 'key' | 'label' | 'score'>
  mid: Omit<FortuneCategory, 'key' | 'label' | 'score'>
  low: Omit<FortuneCategory, 'key' | 'label' | 'score'>
}> = {
  wealth: {
    high: {
      summary: '돈의 흐름과 기회를 알아보는 감각이 빠른 편이에요.',
      factBomb: '버는 감각은 있는데 “이 정도는 괜찮지” 하는 보상 소비가 구멍이에요.',
      action: '오늘 자동이체나 반복 결제 하나만 점검하세요.',
    },
    mid: {
      summary: '큰 한 방보다 익숙한 방식으로 안정적으로 쌓는 흐름이에요.',
      factBomb: '돈이 안 모이는 이유를 수입 탓으로만 돌리지만, 계획 없는 소액 결제도 꽤 성실해요.',
      action: '일주일치 변동 지출에 상한선을 하나 정하세요.',
    },
    low: {
      summary: '새 수익보다 새는 돈을 막는 것이 먼저인 시기예요.',
      factBomb: '재테크 정보는 많이 보는데 통장 내역은 애써 안 보는 경향이 있어요.',
      action: '최근 30일 결제 내역에서 후회되는 세 건을 표시하세요.',
    },
  },
  relationship: {
    high: {
      summary: '편안한 인상과 반응력이 좋은 사람을 자연스럽게 끌어당겨요.',
      factBomb: '사람은 잘 모으는데 경계선이 약해서 남의 감정 쓰레기통이 되기 쉬워요.',
      action: '답하기 싫은 연락 하나는 바로 답장하지 않아도 괜찮아요.',
    },
    mid: {
      summary: '먼저 마음을 건네면 관계의 온도가 빠르게 올라가는 흐름이에요.',
      factBomb: '상대가 먼저 알아주길 기다리다가 타이밍을 놓치고 “역시 나만 진심”이라고 결론 내려요.',
      action: '고마운 사람 한 명에게 이유까지 붙여 먼저 연락하세요.',
    },
    low: {
      summary: '새 인연보다 기존 관계의 오해를 정리하는 일이 우선이에요.',
      factBomb: '거리 두기가 필요하다고 생각하지만, 실제로는 설명하기 귀찮아 잠수하는 것에 가까울 수 있어요.',
      action: '미뤄둔 답장 하나를 두 문장으로 끝내세요.',
    },
  },
  achievement: {
    high: {
      summary: '한 가지 목표에 집중하면 빠르게 결과를 끌어낼 힘이 있어요.',
      factBomb: '능력은 충분한데 잘하고 싶은 일이 너무 많아 우선순위가 늘 세 개예요.',
      action: '이번 주 가장 중요한 목표 하나만 맨 위에 고정하세요.',
    },
    mid: {
      summary: '작은 완료를 연결할수록 큰 목표가 현실로 바뀌는 흐름이에요.',
      factBomb: '의욕이 생기면 계획을 크게 잡고, 계획이 크니까 시작을 내일로 미뤄요.',
      action: '30분 안에 끝낼 수 있는 첫 단계만 오늘 완료하세요.',
    },
    low: {
      summary: '속도를 높이기보다 멈춘 이유부터 걷어내야 하는 시기예요.',
      factBomb: '시간이 없는 게 아니라 시작이 부담스러워 자잘한 일로 바쁜 척하는 중일 수 있어요.',
      action: '할 일 목록을 세 개 이하로 줄이고 첫 항목을 10분만 시작하세요.',
    },
  },
}

function hashImageData(value: string) {
  let hash = 2166136261
  const step = Math.max(1, Math.floor(value.length / 1800))

  for (let index = 0; index < value.length; index += step) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function score(seed: number, shift: number) {
  return 62 + ((seed >>> shift) % 35)
}

function getFortuneCopy(key: FortuneKey, value: number) {
  if (value >= 86) {
    return FORTUNE_COPY[key].high
  }

  if (value >= 75) {
    return FORTUNE_COPY[key].mid
  }

  return FORTUNE_COPY[key].low
}

function isFaceReadingRecord(value: unknown): value is FaceReadingRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<FaceReadingRecord>
  return (
    record.readingVersion === 2 &&
    typeof record.id === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.totalScore === 'number' &&
    typeof record.title === 'string' &&
    typeof record.punchline === 'string' &&
    Array.isArray(record.strengths) &&
    Array.isArray(record.blindSpots) &&
    Array.isArray(record.categories) &&
    Array.isArray(record.facePoints)
  )
}

export function createFaceReading(imageUri: string): FaceReadingRecord {
  const seed = hashImageData(imageUri)
  const createdAt = new Date().toISOString()
  const archetype = ARCHETYPES[seed % ARCHETYPES.length]
  const wealthScore = score(seed, 1)
  const relationshipScore = score(seed, 6)
  const achievementScore = score(seed, 11)
  const totalScore = Math.round((wealthScore + relationshipScore + achievementScore) / 3)
  const select = <T,>(items: readonly T[], shift: number) => items[(seed >>> shift) % items.length]
  const forehead = select(FOREHEAD_POINTS, 2)
  const eyes = select(EYE_POINTS, 5)
  const nose = select(NOSE_POINTS, 8)
  const mouth = select(MOUTH_POINTS, 12)
  const jaw = select(JAW_POINTS, 15)

  const createFortune = (
    key: FortuneKey,
    label: string,
    value: number,
  ): FortuneCategory => ({
    key,
    label,
    score: value,
    ...getFortuneCopy(key, value),
  })

  return {
    readingVersion: 2,
    id: `${Date.now()}-${seed.toString(36)}`,
    createdAt,
    totalScore,
    title: archetype.title,
    subtitle: archetype.subtitle,
    summary: archetype.summary,
    punchline: archetype.punchline,
    outerImpression: archetype.outerImpression,
    innerDrive: archetype.innerDrive,
    stressPattern: archetype.stressPattern,
    strengths: [...archetype.strengths],
    blindSpots: [...archetype.blindSpots],
    resetAction: archetype.resetAction,
    keywords: [...archetype.keywords],
    categories: [
      createFortune('wealth', '재물운', wealthScore),
      createFortune('relationship', '인연운', relationshipScore),
      createFortune('achievement', '성취운', achievementScore),
    ],
    facePoints: [
      { part: '이마', ...forehead },
      { part: '눈매', ...eyes },
      { part: '코', ...nose },
      { part: '입매', ...mouth },
      { part: '턱선', ...jaw },
    ],
    luckyColor: select(LUCKY_COLORS, 4),
    luckyMoment: select(LUCKY_MOMENTS, 9),
  }
}

export function getFaceReadingHistory() {
  const raw = window.localStorage.getItem(HISTORY_KEY)
  if (!raw) {
    return []
  }

  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter(isFaceReadingRecord).slice(0, MAX_HISTORY_LENGTH)
      : []
  } catch {
    return []
  }
}

export function getFaceReadingById(id: string) {
  return getFaceReadingHistory().find((record) => record.id === id) ?? null
}

export function saveFaceReading(record: FaceReadingRecord) {
  const history = [
    record,
    ...getFaceReadingHistory().filter((item) => item.id !== record.id),
  ].slice(0, MAX_HISTORY_LENGTH)

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  window.dispatchEvent(new CustomEvent('gwansang-log:reading-saved', { detail: record }))
}
