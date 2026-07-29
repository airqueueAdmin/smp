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
    summary: '관상식으로 풀면 사람 사이의 온도 차이를 빠르게 알아채고, 어색한 자리를 매끄럽게 만드는 힘이 있어. 문제는 남의 기분은 실시간으로 챙기면서 정작 내 불편함은 “이 정도는 괜찮지” 하고 미뤄둔다는 거야.',
    punchline: '남의 기분을 빠르게 읽고 자리를 편하게 만드는 건 분명한 재능이야. 다만 네 마음까지 알아서 읽어주길 기다리지는 마.',
    outerImpression: '부드럽고 믿을 만한 사람으로 보여. 처음 만난 사람도 편하게 속얘기를 꺼내는 편이야.',
    innerDrive: '사람들이 나를 필요로 할 때 안정감을 느껴. 관계가 흔들리면 내 책임부터 찾는 경향이 있어.',
    stressPattern: '참을 만큼 참았다고 생각한 순간 갑자기 거리를 둬. 상대는 이유를 모르고, 본인은 이미 마음속에서 세 번쯤 이별한 상태가 되기 쉬워.',
    strengths: ['갈등이 커지기 전에 분위기를 정리해.', '상대가 말하지 않은 필요도 빨리 알아채.', '여러 사람의 의견을 현실적인 합의로 묶어.'],
    blindSpots: ['배려와 자기검열을 자주 헷갈려.', '거절하지 않고 맡은 뒤 혼자 억울해해.', '솔직한 대화보다 눈치 테스트를 먼저 시작해.'],
    resetAction: '눈치 게임 그만하고 “난 이게 싫어”라고 말해.',
    keywords: ['눈치만렙', '속앓이', '신뢰감'],
  },
  {
    title: '일단 저지르고 수습하는 개척자',
    subtitle: '망설임보다 출발이 빠른 얼굴',
    summary: '결정 속도와 추진력이 강해서 남들이 회의만 할 때 이미 첫 결과물을 만드는 타입이야. 다만 속도가 곧 방향은 아니라는 사실을 종종 두 번째 시행착오쯤에서 깨닫는 편이야.',
    punchline: '남들이 망설일 때 먼저 움직이는 배짱은 확실한 강점이야. 다만 출발 전에 방향만 한 번 확인해.',
    outerImpression: '자신감 있고 답답함이 없는 사람으로 보여. 일이 막히면 모두가 자연스럽게 너를 쳐다봐.',
    innerDrive: '주도권을 직접 잡고 결과를 만드는 데서 에너지를 얻어. 통제할 수 없는 대기 시간이 가장 힘들어.',
    stressPattern: '속도가 떨어지면 더 세게 밀어붙여. 문제를 해결하려다 사람까지 과제로 취급하는 순간이 생길 수 있어.',
    strengths: ['애매한 상황에서도 첫 결정을 내려.', '실패를 오래 붙잡지 않고 다음 방법을 찾아.', '주변 사람의 실행 속도까지 끌어올려.'],
    blindSpots: ['설명 없이 결론부터 말해 독주처럼 보여.', '시작의 재미가 사라지면 마무리를 미뤄.', '도움을 요청하면 질 것 같아 혼자 버텨.'],
    resetAction: '지르기 전에 딱 한 명한테 반대 의견부터 물어.',
    keywords: ['돌진력', '수습본능', '독립심'],
  },
  {
    title: '생각이 너무 많은 전략가',
    subtitle: '작은 단서까지 계산하고 움직이는 얼굴',
    summary: '표면보다 맥락을 읽는 감각이 좋아서 허술한 계획과 빈말을 빠르게 알아채. 준비한 만큼 실수가 적지만, 완벽한 타이밍을 기다리다가 쉬운 기회까지 어렵게 만드는 재주도 있어.',
    punchline: '허점을 먼저 보고 실수를 줄이는 건 네 강점이야. 다만 준비가 충분해도 시작하지 않으면 전략이 아니라 미루기야.',
    outerImpression: '차분하고 빈틈이 적어 보여. 쉽게 흥분하지 않아 중요한 일을 맡기고 싶은 인상을 줘.',
    innerDrive: '예측 가능한 구조와 충분한 근거가 있을 때 가장 편안해. 모르는 채로 시작하는 것을 유난히 싫어해.',
    stressPattern: '변수를 줄이려고 생각을 더 늘려. 결국 머릿속 회의 참석자는 열 명인데 실제 행동하는 사람은 아무도 없는 상태가 돼.',
    strengths: ['남들이 놓친 위험과 허점을 먼저 발견해.', '감정보다 근거를 모아 안정적인 선택을 해.', '복잡한 정보를 이해하기 쉽게 정리해.'],
    blindSpots: ['준비를 생산성처럼 느끼며 실행을 늦춰.', '상대의 말에서 숨은 뜻을 과하게 찾아.', '실수하지 않으려다 새로운 경험 자체를 줄여.'],
    resetAction: '70%만 됐어도 내놔. 더 붙잡는 건 완벽주의가 아니라 겁이야.',
    keywords: ['과몰입', '분석력', '완벽주의'],
  },
  {
    title: '분위기로 위기를 넘기는 낙천가',
    subtitle: '사람과 기회를 가볍게 끌어당기는 얼굴',
    summary: '새로운 관계와 변화에 열린 인상이라 어디서든 빠르게 자리를 잡아. 무거운 분위기를 풀어주는 재능이 있지만, 웃고 넘긴 문제가 사라진 것은 아니라는 사실을 가끔 잊어.',
    punchline: '사람을 편하게 하고 위기의 분위기를 바꾸는 힘은 진짜 재능이야. 다만 웃고 넘긴 문제는 나중에 꼭 정리해.',
    outerImpression: '밝고 접근하기 쉬운 사람으로 보여. 처음 보는 자리에서도 오래 있던 사람처럼 자연스럽게 섞여.',
    innerDrive: '재미와 새로운 자극이 있어야 집중력이 살아나. 반복과 관리가 길어지면 마음이 먼저 다른 곳으로 가.',
    stressPattern: '불편한 감정을 농담으로 바꾸고 약속을 가볍게 잡아. 순간은 넘기지만 나중에 일정과 감정이 한꺼번에 밀려와.',
    strengths: ['낯선 사람과도 빠르게 접점을 찾아.', '위기에서 분위기를 환기하고 다시 움직여.', '새로운 기회를 겁내지 않고 받아들여.'],
    blindSpots: ['재미가 없으면 중요한 일도 뒤로 밀어.', '괜찮다고 말한 뒤 속으로는 부담을 키워.', '시작한 일을 관리하는 루틴이 약해.'],
    resetAction: '제일 하기 싫은 일부터 20분 잡고 끝내.',
    keywords: ['친화력', '현실회피', '순발력'],
  },
  {
    title: '혼자 다 짊어지는 완성가',
    subtitle: '결국 끝을 보는 책임감 강한 얼굴',
    summary: '화려한 말보다 결과와 꾸준함으로 신뢰를 얻는 타입이야. 맡은 일은 웬만하면 끝내지만, 아무도 부탁하지 않은 책임까지 주워 담고 “왜 나만 하지?”라는 결론에 도착하기 쉬워.',
    punchline: '끝까지 책임지고 결과를 내는 힘은 네 가장 큰 무기야. 다만 혼자 다 해야 제대로 된다는 생각은 내려놔.',
    outerImpression: '묵직하고 약속을 지키는 사람으로 보여. 급한 순간에 가장 먼저 떠올리는 사람일 가능성이 커.',
    innerDrive: '쓸모 있는 사람이라는 확신에서 안정감을 얻어. 기대에 못 미치는 모습을 보여주는 것을 지나치게 경계해.',
    stressPattern: '말없이 일을 더 가져오고 표정이 굳어. 도움은 거절하면서 아무도 돕지 않는다고 느끼는 모순에 빠질 수 있어.',
    strengths: ['긴 호흡의 일을 꾸준히 밀고 가.', '작은 약속도 가볍게 넘기지 않아.', '위기에서도 실무를 챙겨 결과를 남겨.'],
    blindSpots: ['위임보다 직접 하는 게 빠르다는 말을 자주 해.', '쉬는 동안에도 해야 할 일을 떠올려.', '기준을 말하지 않고 상대가 맞추길 기대해.'],
    resetAction: '일 하나 넘기고 입 다물어. 방법까지 통제하지 마.',
    keywords: ['책임과다', '버티기', '완성력'],
  },
  {
    title: '말이 먼저 도착하는 설득가',
    subtitle: '생각과 매력을 빠르게 전달하는 얼굴',
    summary: '원하는 것을 언어와 표정으로 선명하게 전달해 사람을 움직이는 힘이 있어. 다만 설명하는 순간에는 이미 해낸 것처럼 느껴져, 일정표가 말의 속도를 따라오지 못할 때가 있어.',
    punchline: '생각을 매력적으로 전하고 사람을 움직이는 건 확실한 능력이야. 이제 말한 만큼 실행하면 돼.',
    outerImpression: '자신감 있고 반응이 빠른 사람으로 보여. 발표나 협상처럼 시선이 모이는 자리에서 존재감이 커져.',
    innerDrive: '내 생각이 사람에게 닿고 반응이 돌아올 때 에너지가 올라. 무시당하거나 설명할 기회가 없으면 크게 답답해해.',
    stressPattern: '말이 많아지고 약속의 범위가 커져. 설득은 성공했는데 정작 실행할 시간은 남지 않는 상황을 만들기 쉬워.',
    strengths: ['복잡한 생각을 매력적인 언어로 바꿔.', '상대의 반응을 보며 표현 방식을 빠르게 바꿔.', '사람이 모인 자리에서 방향과 에너지를 만들어.'],
    blindSpots: ['설명한 것을 실행한 것으로 착각해.', '조용한 사람의 반대를 동의로 해석해.', '흥이 오르면 지키기 어려운 약속까지 해.'],
    resetAction: '새 약속 잡지 말고 이미 벌인 일부터 끝내.',
    keywords: ['말발', '과한약속', '존재감'],
  },
] as const

const FOREHEAD_POINTS = [
  {
    headline: '넓게 트인 이마',
    description: '전체 흐름과 다음 수를 먼저 보는 기획형 기운이 강해. 한 가지 일만 보기보다 여러 가능성을 동시에 열어두는 편이야.',
    factBomb: '큰 그림을 보는 눈은 분명한 장점이야. 계획을 세운 뒤 첫 행동까지 바로 이어가면 더 강해져.',
  },
  {
    headline: '단정한 이마선',
    description: '원칙과 순서를 중시해 실수를 줄이고, 한번 만든 기준을 안정적으로 유지하는 힘이 보여.',
    factBomb: '기준이 분명해 실수가 적은 타입이야. 그 기준을 미리 말해 주면 신뢰도 더 커져.',
  },
  {
    headline: '부드러운 이마 윤곽',
    description: '낯선 상황에서도 정면충돌보다 우회로를 찾아내는 유연한 판단력이 돋보여.',
    factBomb: '우회로를 찾는 유연함이 뛰어나. 선택이 필요할 때는 기한만 정해둬.',
  },
] as const

const EYE_POINTS = [
  {
    headline: '차분하게 모이는 눈매',
    description: '상대의 속도와 감정 변화를 세심하게 포착하는 관찰력이 강한 인상이야.',
    factBomb: '눈치와 관찰력이 빠른 건 강점이야. 추측이 생기면 한 번 확인하면 오해도 줄어.',
  },
  {
    headline: '또렷한 눈의 중심',
    description: '목표가 정해지면 주변 소음을 줄이고 한 지점에 집중하는 힘이 강해 보여.',
    factBomb: '목표에 몰입하는 집중력이 강해. 가끔 방향만 점검하면 고집이 아니라 추진력이 돼.',
  },
  {
    headline: '편안하게 열린 눈매',
    description: '새로운 사람과 정보를 경계하기보다 먼저 받아들이는 개방적인 기운이 있어.',
    factBomb: '사람과 기회를 열린 태도로 보는 게 매력이야. 중요한 선택에서 검증 한 번만 더해.',
  },
] as const

const NOSE_POINTS = [
  {
    headline: '균형 잡힌 코의 중심',
    description: '이상과 현실 사이에서 손익을 계산하고 자원을 안정적으로 배분하는 감각이 보여.',
    factBomb: '현실 감각과 배분 능력이 좋아. 성장에 필요한 지출은 비용보다 투자로 봐도 괜찮아.',
  },
  {
    headline: '곧은 콧대의 흐름',
    description: '결정한 방향을 쉽게 바꾸지 않고 꾸준히 밀어가는 자존과 버티는 힘이 강해.',
    factBomb: '소신과 꾸준함이 확실한 사람이야. 정보가 달라졌을 때 방향을 바꾸는 것도 실력이야.',
  },
  {
    headline: '부드러운 코끝',
    description: '실속을 챙기면서도 가까운 사람에게는 기꺼이 자원을 나누는 온기가 보여.',
    factBomb: '가까운 사람에게 잘 베푸는 따뜻함이 있어. 그만큼 자신에게 쓰는 것도 아끼지 마.',
  },
] as const

const MOUTH_POINTS = [
  {
    headline: '안정적인 입매',
    description: '말을 고르고 약속의 무게를 아는 신중한 소통 방식이 드러나.',
    factBomb: '신중하고 약속을 가볍게 여기지 않는 말투가 신뢰를 줘. 필요한 설명까지 해주면 더 단단해져.',
  },
  {
    headline: '부드럽게 올라간 입꼬리',
    description: '호감과 기회를 대화 속에서 자연스럽게 만드는 친화력이 돋보여.',
    factBomb: '분위기를 밝게 하는 친화력이 큰 장점이야. 원치 않는 일에는 웃음 대신 분명한 말을 써도 돼.',
  },
  {
    headline: '선명한 입술선',
    description: '생각과 감정을 분명하게 표현하고 말로 흐름을 주도하는 힘이 있어.',
    factBomb: '솔직하고 선명한 표현이 사람을 움직여. 타이밍과 온도까지 맞추면 설득력이 더 커져.',
  },
] as const

const JAW_POINTS = [
  {
    headline: '둥글게 이어진 턱선',
    description: '관계를 오래 품고 맡은 사람과 일을 끝까지 책임지는 안정감이 보여.',
    factBomb: '사람과 일을 오래 책임지는 안정감이 있어. 끝난 관계를 놓는 것도 책임 있는 선택이야.',
  },
  {
    headline: '단단한 턱의 중심',
    description: '어려운 순간에도 쉽게 무너지지 않고 마무리까지 버티는 힘이 강해.',
    factBomb: '힘든 순간에도 끝까지 버티는 힘이 강해. 꼭 참지 않아도 되는 일에는 그 힘을 아껴둬.',
  },
  {
    headline: '매끄러운 얼굴 윤곽',
    description: '상황의 변화에 맞춰 속도와 태도를 조절하는 현실적인 균형 감각이 좋아.',
    factBomb: '상황에 맞춰 균형을 잡는 감각이 좋아. 맞추기 전에 내가 원하는 방향도 한 번 확인해.',
  },
] as const

const FACE_POINT_COPY = [
  ...FOREHEAD_POINTS,
  ...EYE_POINTS,
  ...NOSE_POINTS,
  ...MOUTH_POINTS,
  ...JAW_POINTS,
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
      summary: '돈의 흐름과 기회를 알아보는 감각이 빠른 편이야.',
      factBomb: '버는 감각과 기회를 보는 눈은 확실히 있어. 번 만큼 남기려면 보상 소비만 조절해.',
      action: '안 쓰는 구독 하나 끊어.',
    },
    mid: {
      summary: '큰 한 방보다 익숙한 방식으로 안정적으로 쌓는 흐름이야.',
      factBomb: '꾸준히 쌓는 힘이 있어. 소액 결제 흐름만 정리하면 안정감이 훨씬 커져.',
      action: '이번 주 지출 한도부터 정해.',
    },
    low: {
      summary: '새 수익보다 새는 돈을 막는 것이 먼저인 시기야.',
      factBomb: '흐름을 다시 정리할 현실 감각은 있어. 재테크 영상보다 결제 내역부터 보면 답이 빨리 보여.',
      action: '결제 내역 열고 쓸데없는 세 건부터 찾아.',
    },
  },
  relationship: {
    high: {
      summary: '편안한 인상과 반응력이 좋은 사람을 자연스럽게 끌어당겨.',
      factBomb: '사람을 편하게 만들고 모으는 매력이 확실해. 네 에너지를 지키는 선만 분명히 그어.',
      action: '답하기 싫은 연락은 씹어도 돼.',
    },
    mid: {
      summary: '먼저 마음을 건네면 관계의 온도가 빠르게 올라가는 흐름이야.',
      factBomb: '마음을 먼저 건넬 용기는 있어. 알아주길 기다리기보다 한마디 먼저 하면 관계가 빨리 풀려.',
      action: '보고 싶은 사람한테 먼저 연락해.',
    },
    low: {
      summary: '새 인연보다 기존 관계의 오해를 정리하는 일이 우선이야.',
      factBomb: '혼자 마음을 정리하는 힘은 있어. 잠수 대신 두 문장만 설명하면 오해를 크게 줄일 수 있어.',
      action: '미룬 답장 하나만 두 문장으로 끝내.',
    },
  },
  achievement: {
    high: {
      summary: '한 가지 목표에 집중하면 빠르게 결과를 끌어낼 힘이 있어.',
      factBomb: '결과를 끌어내는 능력과 집중력은 분명 네 무기야. 목표 하나에 힘을 모으면 더 크게 가.',
      action: '이번 주 목표는 하나만 남겨.',
    },
    mid: {
      summary: '작은 완료를 연결할수록 큰 목표가 현실로 바뀌는 흐름이야.',
      factBomb: '작은 일을 끝까지 잇는 힘이 있어. 계획을 줄이고 첫 단계부터 바로 끝내.',
      action: '30분짜리 첫 단계부터 끝내.',
    },
    low: {
      summary: '속도를 높이기보다 멈춘 이유부터 걷어내야 하는 시기야.',
      factBomb: '다시 시작할 힘은 충분해. 자잘한 일로 바쁜 척하지 말고 첫 과제부터 시작해.',
      action: '할 일 세 개만 남기고 첫 번째부터 시작해.',
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

function refreshFaceReadingCopy(record: FaceReadingRecord): FaceReadingRecord {
  const archetype = ARCHETYPES.find((item) => item.title === record.title)
  if (!archetype) {
    return record
  }

  return {
    ...record,
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
    categories: record.categories.map((category) => ({
      ...category,
      ...getFortuneCopy(category.key, category.score),
    })),
    facePoints: record.facePoints.map((point) => {
      const latestPoint = FACE_POINT_COPY.find(
        (item) => item.headline === point.headline,
      )

      return latestPoint ? { ...point, ...latestPoint } : point
    }),
  }
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
      ? value
        .filter(isFaceReadingRecord)
        .map(refreshFaceReadingCopy)
        .slice(0, MAX_HISTORY_LENGTH)
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
