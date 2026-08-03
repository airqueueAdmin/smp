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
    summary: '전체 인상이 부드럽고 상대의 반응을 먼저 살피는 흐름으로 읽혀요. 회의에서는 말수가 적은 사람까지 챙기고, 어색한 자리에서는 먼저 화제를 바꾸는 조율 능력이 좋아요. 다만 싫다는 말을 바로 하지 않아 작은 불편이 쌓인 뒤 갑자기 연락을 줄이거나 마음의 문을 닫기 쉬워요.',
    punchline: '사람의 마음을 먼저 알아보는 힘은 분명한 재능이에요. 다만 내 마음까지 상대가 알아서 읽어주길 기다리지는 마세요.',
    outerImpression: '말을 끊지 않고 끝까지 들어주는 인상이라 처음 만난 사람도 개인적인 고민을 쉽게 꺼내요. 단체에서는 강하게 앞서기보다 모두가 편한 방향을 찾아주는 사람으로 보여요.',
    innerDrive: '누군가에게 필요한 사람이라는 확신이 생길 때 가장 안정돼요. 관계가 어색해지면 상대의 문제보다 내가 무엇을 잘못했는지부터 되짚는 경향이 있어요.',
    stressPattern: '불편해도 괜찮다고 넘기다가 한계가 오면 설명 없이 거리를 둬요. 상대는 갑작스럽다고 느끼지만, 본인은 이미 오래 참았다고 생각하기 쉬워요.',
    strengths: ['갈등이 커지기 전에 말의 온도와 분위기를 조절해요.', '상대가 직접 말하지 않은 필요도 표정과 반응으로 빨리 알아채요.', '서로 다른 의견을 모두가 받아들일 수 있는 현실적인 합의로 묶어요.'],
    blindSpots: ['배려해야 한다는 생각 때문에 자신의 거절 신호를 무시해요.', '부탁을 받아들인 뒤 상대가 고마움을 알아주지 않으면 혼자 서운해져요.', '솔직히 묻기보다 상대가 눈치채는지 먼저 시험하는 경향이 있어요.'],
    resetAction: '오늘 한 번은 “저는 이 방식이 불편해요”라고 정확히 말해 보세요.',
    keywords: ['눈치만렙', '속앓이', '신뢰감'],
  },
  {
    title: '일단 저지르고 수습하는 개척자',
    subtitle: '망설임보다 출발이 빠른 얼굴',
    summary: '얼굴의 중심이 또렷하고 기운이 앞으로 뻗는 인상이라 판단과 행동 사이의 간격이 짧아요. 다른 사람이 자료를 더 모을 때 먼저 전화하고, 초안을 만들고, 현장을 확인하는 타입이에요. 다만 빨리 시작한 만큼 중간 설명과 마무리 점검이 빠지면 주변에는 독주로 보일 수 있어요.',
    punchline: '남들이 망설일 때 먼저 움직이는 배짱은 확실한 강점이에요. 출발하기 전에 방향만 한 번 확인하세요.',
    outerImpression: '자신감 있고 답답함이 없는 사람으로 보여요. 일이 멈췄을 때 주변에서 자연스럽게 결정을 기대하는 인상이에요.',
    innerDrive: '직접 주도권을 잡고 눈에 보이는 결과를 만들 때 에너지가 올라요. 답변을 기다리거나 통제할 수 없는 일정에 묶이는 상황을 특히 힘들어해요.',
    stressPattern: '계획이 늦어질수록 속도를 더 높이고 설명을 줄여요. 문제를 빨리 해결하려다가 동료의 감정이나 준비 상태까지 업무 변수로만 볼 수 있어요.',
    strengths: ['정보가 완벽하지 않아도 필요한 첫 결정을 내려요.', '실패 원인을 짧게 정리하고 바로 다음 방법을 시도해요.', '머뭇거리는 사람에게 구체적인 첫 행동을 제시해 실행을 끌어내요.'],
    blindSpots: ['결론에 도달한 과정을 생략해 독단적으로 보일 수 있어요.', '초반의 재미가 사라지면 점검과 문서화를 뒤로 미뤄요.', '도움을 청하면 주도권을 잃는다고 느껴 혼자 버텨요.'],
    resetAction: '시작하기 전에 믿을 만한 한 사람에게 반대 의견을 먼저 물어보세요.',
    keywords: ['돌진력', '수습본능', '독립심'],
  },
  {
    title: '생각이 너무 많은 전략가',
    subtitle: '작은 단서까지 계산하고 움직이는 얼굴',
    summary: '시선과 얼굴선이 안쪽으로 모이는 인상이라 겉으로 드러난 말보다 배경과 의도를 먼저 살펴요. 계약 조건의 예외 문구나 일정의 숨은 변수를 빠르게 찾고, 준비한 일에서는 실수가 적어요. 다만 확신이 생길 때까지 검토를 반복해 작은 결정도 실제보다 무겁게 만들 수 있어요.',
    punchline: '허점을 먼저 발견하고 실수를 줄이는 것이 가장 큰 강점이에요. 준비가 충분한데도 시작하지 않는다면 전략이 아니라 미루기예요.',
    outerImpression: '차분하고 빈틈이 적어 보여요. 감정적으로 반응하지 않아 중요한 자료나 돈이 걸린 일을 맡기고 싶은 인상을 줘요.',
    innerDrive: '일의 구조와 예상 가능한 범위가 보일 때 마음이 편해져요. 모르는 상태에서 일단 시작하라는 요구를 받으면 부담이 크게 올라가요.',
    stressPattern: '불안할수록 정보를 더 모으고 최악의 경우를 반복해서 계산해요. 머릿속에서는 여러 대안을 검토하지만 실제 첫 행동은 늦어지기 쉬워요.',
    strengths: ['계획에서 빠진 위험과 허점을 다른 사람보다 먼저 발견해요.', '기분보다 근거와 숫자를 모아 안정적인 선택을 해요.', '복잡한 정보를 순서와 기준으로 나눠 이해하기 쉽게 정리해요.'],
    blindSpots: ['자료를 더 모으는 일을 실행하고 있다고 착각해요.', '짧은 답변이나 표정에서 숨은 뜻을 과하게 추측해요.', '실패 가능성을 줄이려다가 새로운 경험 자체를 포기해요.'],
    resetAction: '완성도가 70%라면 오늘 바로 한 사람에게 보여주세요.',
    keywords: ['과몰입', '분석력', '완벽주의'],
  },
  {
    title: '분위기로 위기를 넘기는 낙천가',
    subtitle: '사람과 기회를 가볍게 끌어당기는 얼굴',
    summary: '눈매와 입매가 열려 보이는 인상이라 낯선 사람과도 빠르게 접점을 만들어요. 처음 가는 모임에서 먼저 말을 걸고, 분위기가 무거워지면 농담이나 새로운 제안으로 흐름을 바꾸는 힘이 있어요. 다만 그 순간을 편하게 넘긴 뒤 일정이나 감정 정리를 미루는 경향이 있어요.',
    punchline: '사람을 편하게 하고 막힌 분위기를 바꾸는 힘은 진짜 재능이에요. 웃고 넘긴 문제는 그날 안에 꼭 정리하세요.',
    outerImpression: '밝고 접근하기 쉬운 사람으로 보여요. 처음 참석한 자리에서도 오래 알고 지낸 사람처럼 자연스럽게 섞이는 인상이에요.',
    innerDrive: '재미와 새로운 자극이 있을 때 집중력이 빠르게 살아나요. 같은 방식의 반복과 세세한 관리가 길어지면 마음이 먼저 다른 곳으로 향해요.',
    stressPattern: '불편한 감정을 농담으로 바꾸고 일정을 낙관적으로 잡아요. 당장은 분위기가 풀리지만 나중에 약속과 감정이 동시에 밀릴 수 있어요.',
    strengths: ['낯선 사람과도 공통 관심사를 빠르게 찾아 대화를 열어요.', '위기에서 분위기를 환기하고 사람들이 다시 움직이게 해요.', '새로운 환경과 기회를 두려워하지 않고 경험으로 받아들여요.'],
    blindSpots: ['재미가 줄면 중요한 유지 업무도 뒤로 미뤄요.', '괜찮다고 웃은 뒤 혼자 부담을 키우는 경우가 있어요.', '시작한 일을 일정하게 관리하는 루틴이 약해요.'],
    resetAction: '가장 하기 싫은 일을 오늘 20분만 먼저 처리해 보세요.',
    keywords: ['친화력', '현실회피', '순발력'],
  },
  {
    title: '혼자 다 짊어지는 완성가',
    subtitle: '결국 끝을 보는 책임감 강한 얼굴',
    summary: '턱선과 얼굴 중심이 묵직하게 받치는 인상이라 시작보다 마무리에서 강한 힘이 보여요. 맡은 업무의 마지막 확인, 약속한 날짜, 사소한 후속 조치까지 챙겨 신뢰를 쌓아요. 다만 아무도 요구하지 않은 책임까지 가져오고 혼자 버틴 뒤 “왜 나만 하지?”라는 서운함에 빠지기 쉬워요.',
    punchline: '끝까지 책임지고 결과를 남기는 힘이 가장 큰 무기예요. 혼자 다 해야 제대로 된다는 생각은 내려놓으세요.',
    outerImpression: '묵직하고 약속을 지키는 사람으로 보여요. 문제가 생겼을 때 말보다 실제 처리를 맡기고 싶은 인상이에요.',
    innerDrive: '쓸모 있고 믿을 만한 사람이라는 확신에서 안정감을 얻어요. 기대에 못 미치는 모습을 보이면 신뢰를 잃을 것처럼 느끼는 경향이 있어요.',
    stressPattern: '힘들수록 말없이 일을 더 가져오고 표정이 굳어요. 도움을 제안받아도 거절하면서 아무도 돕지 않는다고 느끼는 모순에 빠질 수 있어요.',
    strengths: ['시간이 오래 걸리는 일도 일정한 속도로 끝까지 밀고 가요.', '작은 약속과 후속 연락도 가볍게 넘기지 않아요.', '위기 상황에서도 필요한 실무를 순서대로 챙겨 결과를 남겨요.'],
    blindSpots: ['설명하고 맡기기보다 직접 하는 편이 빠르다고 생각해요.', '쉬는 시간에도 해야 할 일을 떠올려 회복이 늦어요.', '자신의 높은 기준을 말하지 않고 상대가 알아서 맞추길 기대해요.'],
    resetAction: '오늘 해야 할 일 하나를 다른 사람에게 완전히 맡겨보세요.',
    keywords: ['책임과다', '버티기', '완성력'],
  },
  {
    title: '말이 먼저 도착하는 설득가',
    subtitle: '생각과 매력을 빠르게 전달하는 얼굴',
    summary: '입매와 표정의 전달력이 선명한 인상이라 생각을 말로 구조화하고 사람을 움직이는 힘이 좋아요. 발표에서는 복잡한 내용을 쉬운 비유로 바꾸고, 협상에서는 상대 반응에 맞춰 표현을 빠르게 조절해요. 다만 설명을 잘 마친 순간 이미 일을 해낸 듯한 만족을 느껴 실행 일정이 말의 속도를 따라오지 못할 수 있어요.',
    punchline: '생각을 매력적으로 전하고 사람을 움직이는 능력이 확실해요. 이제 말한 만큼 실행하면 돼요.',
    outerImpression: '자신감 있고 반응이 빠른 사람으로 보여요. 발표나 협상처럼 시선이 모이는 자리에서 존재감이 더 커져요.',
    innerDrive: '내 생각이 상대에게 정확히 전달되고 반응이 돌아올 때 에너지가 올라요. 설명할 기회 없이 무시당한다고 느끼면 답답함이 크게 쌓여요.',
    stressPattern: '불안할수록 설명이 길어지고 약속의 범위가 넓어져요. 설득은 성공했지만 실제로 처리할 시간이 부족한 상황을 만들기 쉬워요.',
    strengths: ['복잡한 생각을 상대가 기억하기 쉬운 언어와 비유로 바꿔요.', '표정과 반응을 보며 말의 속도와 표현을 빠르게 조절해요.', '사람이 모인 자리에서 방향을 정리하고 움직일 에너지를 만들어요.'],
    blindSpots: ['충분히 설명한 일을 실제로 진행한 것처럼 느껴요.', '말이 없는 사람의 반대를 동의로 해석할 수 있어요.', '분위기가 좋아지면 지키기 어려운 약속까지 크게 잡아요.'],
    resetAction: '새로운 약속을 잡기 전에 이미 말해둔 일 하나부터 끝내세요.',
    keywords: ['말발', '과한약속', '존재감'],
  },
] as const

const FOREHEAD_POINTS = [
  {
    headline: '넓게 트인 이마',
    description: '전통 관상에서 이마는 초년운과 사고의 폭을 보는 자리예요. 이마가 넓게 트여 보이면 눈앞의 한 가지보다 전체 일정과 다음 단계를 먼저 그리는 기획형으로 풀이해요. 새 업무를 받으면 세부 작업보다 목표와 순서부터 정리하는 편이에요.',
    factBomb: '큰 그림을 보는 눈이 좋아요. 계획을 정리한 날 첫 행동까지 바로 이어가면 생각이 성과로 바뀌어요.',
  },
  {
    headline: '단정한 이마선',
    description: '이마선이 단정하게 정리된 인상은 생각의 기준과 순서가 분명한 상으로 봐요. 즉흥적으로 바꾸기보다 검증된 절차를 지키며, 체크리스트나 일정표를 사용할 때 실수가 크게 줄어드는 타입이에요.',
    factBomb: '기준이 분명해 반복되는 일에서 신뢰를 얻어요. 그 기준을 주변에 미리 설명하면 고집으로 오해받지 않아요.',
  },
  {
    headline: '부드러운 이마 윤곽',
    description: '각이 강하지 않고 부드럽게 이어지는 이마 윤곽은 사고의 유연성과 적응력을 뜻해요. 계획이 틀어져도 정면으로 밀어붙이기보다 사람과 상황에 맞는 우회로를 찾아 손실을 줄이는 편이에요.',
    factBomb: '막힌 상황에서 다른 길을 찾는 감각이 좋아요. 선택지가 많아질 때는 결정 기한을 먼저 정해두세요.',
  },
] as const

const EYE_POINTS = [
  {
    headline: '차분하게 모이는 눈매',
    description: '관상에서 눈은 감정의 깊이와 사람을 대하는 방식을 살펴보는 핵심 자리예요. 눈매가 차분하게 모이면 말의 내용뿐 아니라 말투가 달라지는 순간과 표정의 미세한 변화까지 빨리 알아채는 관찰형으로 풀이해요.',
    factBomb: '상대의 감정 변화를 빨리 읽는 것이 강점이에요. 다만 표정만 보고 결론 내리지 말고 한 번 직접 물어보세요.',
  },
  {
    headline: '또렷한 눈의 중심',
    description: '눈동자의 중심이 또렷하게 느껴지는 상은 목표 의식과 집중력이 강한 편으로 봐요. 해야 할 일이 분명하면 주변 반응에 쉽게 흔들리지 않고, 한 과제를 끝낼 때까지 에너지를 모으는 힘이 있어요.',
    factBomb: '목표를 끝까지 밀어붙이는 집중력이 좋아요. 중간 점검 날짜를 정해두면 고집이 아니라 강한 추진력이 돼요.',
  },
  {
    headline: '편안하게 열린 눈매',
    description: '눈매가 편안하게 열려 보이면 사람과 새로운 정보를 받아들이는 문턱이 낮은 상으로 해석해요. 낯선 자리에서도 먼저 반응을 보여 상대를 편하게 만들고, 소개나 협업을 통해 기회를 얻는 경우가 많아요.',
    factBomb: '열린 태도가 사람과 기회를 불러와요. 돈과 계약이 걸린 선택에서는 호감과 검증을 따로 판단하세요.',
  },
] as const

const NOSE_POINTS = [
  {
    headline: '균형 잡힌 코의 중심',
    description: '전통 관상에서 코는 재물운과 현실 감각을 보는 재백궁으로 여겨요. 코의 중심이 균형 있게 잡혀 보이면 수입과 지출의 비율을 따지고, 시간·돈·사람을 무리 없이 배분하는 실속형으로 풀이해요.',
    factBomb: '큰 한 번보다 꾸준히 남기는 재물 감각이 좋아요. 배움과 장비처럼 성장을 만드는 지출에는 분명한 예산을 잡아보세요.',
  },
  {
    headline: '곧은 콧대의 흐름',
    description: '콧대의 흐름이 곧아 보이는 상은 자존감과 자기 기준이 분명한 편으로 해석해요. 한번 납득한 목표는 외부의 반대가 있어도 꾸준히 밀고 가며, 자신의 방식으로 결과를 확인해야 마음이 놓여요.',
    factBomb: '소신과 지속력이 분명해요. 처음 판단의 근거가 달라졌다면 방향을 바꾸는 것도 기준을 지키는 일이에요.',
  },
  {
    headline: '부드러운 코끝',
    description: '코끝이 부드럽고 둥글게 느껴지는 인상은 재물을 움켜쥐기보다 관계 안에서 나누는 기운으로 봐요. 평소에는 실속을 따지지만 가족이나 가까운 사람의 식사·선물·경조사에는 지갑이 쉽게 열리는 편이에요.',
    factBomb: '사람에게 쓰는 돈을 아까워하지 않는 따뜻함이 있어요. 베푸는 예산과 자신을 위한 예산을 같은 비율로 잡아보세요.',
  },
] as const

const MOUTH_POINTS = [
  {
    headline: '안정적인 입매',
    description: '관상에서 입은 말의 힘과 관계를 유지하는 방식을 보여주는 자리예요. 입매가 안정적으로 닫혀 보이면 즉흥적으로 약속하기보다 한 번 생각한 뒤 말하며, 한번 한 말은 지키려는 책임감이 강해요.',
    factBomb: '말이 가볍지 않아 신뢰를 얻어요. 결론만 짧게 말하면 차갑게 보일 수 있으니 이유를 한 문장 덧붙이세요.',
  },
  {
    headline: '부드럽게 올라간 입꼬리',
    description: '입꼬리가 부드럽게 올라간 인상은 말을 걸기 쉬운 호감형 상으로 봐요. 대화 중 자연스럽게 긍정 반응을 보여 상대의 긴장을 풀고, 소개·영업·협업처럼 관계가 기회가 되는 자리에서 강점이 커요.',
    factBomb: '사람을 편하게 하는 표정이 큰 자산이에요. 원하지 않는 부탁에는 미소 대신 분명한 거절 문장을 사용하세요.',
  },
  {
    headline: '선명한 입술선',
    description: '입술선이 선명하게 느껴지는 상은 생각과 감정을 언어로 정확히 구분하는 힘이 강해요. 회의나 갈등 상황에서 핵심 쟁점을 말로 정리하고, 원하는 방향을 분명하게 제시하는 편이에요.',
    factBomb: '정확한 표현이 사람을 움직여요. 맞는 말을 하는 것만큼 상대가 받아들일 시간과 말의 온도도 함께 살피세요.',
  },
] as const

const JAW_POINTS = [
  {
    headline: '둥글게 이어진 턱선',
    description: '전통 관상에서 턱은 말년운과 버티는 힘, 주변을 품는 범위를 살펴보는 자리예요. 턱선이 둥글게 이어지면 사람을 오래 기억하고, 한번 맡은 관계와 일을 쉽게 끊지 않는 안정형으로 해석해요.',
    factBomb: '사람과 일을 오래 품는 안정감이 있어요. 역할이 끝난 관계까지 책임지려 하지 말고 정리할 시점을 정하세요.',
  },
  {
    headline: '단단한 턱의 중심',
    description: '턱의 중심이 단단하게 받쳐 보이면 압박이 커질수록 쉽게 포기하지 않는 완성형 상으로 봐요. 일정이 길어지거나 예상 밖의 문제가 생겨도 마지막 결과를 확인할 때까지 버티는 힘이 강해요.',
    factBomb: '어려운 순간을 견디는 힘이 분명해요. 가치 없는 경쟁과 반복되는 무례에는 그 힘을 쓰지 말고 빨리 선을 그으세요.',
  },
  {
    headline: '매끄러운 얼굴 윤곽',
    description: '턱까지 이어지는 얼굴 윤곽이 매끄러우면 상황에 맞춰 태도와 속도를 조절하는 균형형으로 풀이해요. 강하게 밀어야 할 때와 한발 물러나야 할 때를 구분해 조직이나 관계에서 충돌을 줄이는 편이에요.',
    factBomb: '상황에 맞추는 현실 감각이 좋아요. 상대에게 맞추기 전에 내가 원하는 결과도 한 문장으로 정리해 보세요.',
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
      summary: '코의 중심에서 읽히는 현실 감각과 재물 흐름이 강한 편이에요.',
      factBomb: '수익이 될 기회를 알아보고 손익을 계산하는 감각이 좋아요. 본업 외 제안이나 협상에서도 조건을 유리하게 만들 수 있지만, 성과가 난 직후 보상 소비가 커지면 실제로 남는 돈은 줄어들어요.',
      action: '이번 달 성과금이나 추가 수입의 30%를 먼저 따로 보관하세요.',
    },
    mid: {
      summary: '큰 한 번보다 익숙한 방식으로 꾸준히 쌓는 재물 흐름이에요.',
      factBomb: '위험을 크게 지기보다 매달 일정한 금액을 남길 때 재물운이 안정돼요. 큰 지출보다 배달비·앱 결제·구독처럼 자주 나가는 소액이 재물 흐름을 약하게 만들 수 있어요.',
      action: '이번 주 생활비 한도를 정하고 결제 알림을 켜두세요.',
    },
    low: {
      summary: '새로운 수익을 찾기보다 이미 새는 돈을 막아야 하는 흐름이에요.',
      factBomb: '지금은 투자 종목을 늘리거나 큰 소비를 결정하기보다 현금 흐름을 다시 보는 것이 먼저예요. 특히 자동 결제와 감정적인 소액 소비를 정리하면 생각보다 빠르게 여유가 생겨요.',
      action: '최근 한 달 결제 내역에서 불필요한 지출 세 건을 오늘 정리하세요.',
    },
  },
  relationship: {
    high: {
      summary: '열린 눈매와 입매에서 사람을 끌어당기는 인연 기운이 강하게 보여요.',
      factBomb: '상대의 말을 편하게 받아주고 자연스럽게 반응하는 매력이 있어 새로운 모임이나 소개에서 호감을 얻기 쉬워요. 다만 모두에게 좋은 사람이 되려 하면 원하지 않는 약속까지 늘어날 수 있어요.',
      action: '이번 주에는 만나고 싶은 사람 한 명에게 먼저 구체적인 약속을 제안하세요.',
    },
    mid: {
      summary: '기다리기보다 먼저 마음을 표현할 때 살아나는 인연 흐름이에요.',
      factBomb: '관계를 오래 지켜보는 신중함은 있지만 상대가 먼저 확신을 주길 기다리는 시간이 길어요. 고마움이나 호감을 짧게라도 표현하면 애매했던 관계의 온도가 빠르게 올라갈 수 있어요.',
      action: '떠오르는 사람에게 안부만 묻지 말고 보고 싶은 날짜까지 함께 보내세요.',
    },
    low: {
      summary: '새 인연을 넓히기보다 기존 관계의 오해를 정리해야 하는 흐름이에요.',
      factBomb: '불편함이 생기면 혼자 생각을 정리한 뒤 거리를 두는 경향이 강해질 수 있어요. 설명 없이 연락을 줄이면 상대는 거절보다 이유를 모르는 데서 더 큰 상처를 받아요.',
      action: '미뤄둔 답장 하나를 현재 마음과 원하는 방향, 두 문장으로 보내세요.',
    },
  },
  achievement: {
    high: {
      summary: '이마의 계획성과 턱선의 지속력이 연결되어 성취 기운이 강해요.',
      factBomb: '목표를 구조화하고 끝까지 밀어붙이는 힘이 함께 들어와 있어요. 여러 일을 동시에 벌이기보다 승진 준비, 프로젝트 완료, 자격 취득처럼 결과가 분명한 한 가지에 집중할수록 성과가 커져요.',
      action: '이번 주 가장 중요한 결과 하나를 정하고 오전 첫 시간에 배치하세요.',
    },
    mid: {
      summary: '작은 완료를 끊기지 않게 이어갈 때 커지는 성취 흐름이에요.',
      factBomb: '한 번에 큰 결과를 만들기보다 오늘 끝낼 수 있는 단위를 계속 연결하는 편이 유리해요. 계획을 자주 바꾸면 기운이 분산되므로 이미 정한 방식으로 최소 일주일은 밀고 가세요.',
      action: '미뤄둔 목표를 30분 안에 끝낼 첫 단계로 나눠 오늘 완료하세요.',
    },
    low: {
      summary: '속도를 높이기보다 집중을 막는 요소부터 걷어내야 하는 흐름이에요.',
      factBomb: '능력이 부족한 것이 아니라 해야 할 일과 신경 쓰는 일이 너무 많이 섞여 있어요. 메시지 확인과 자잘한 수정으로 바쁜 시간을 보내면 정작 중요한 결과는 남지 않아요.',
      action: '오늘 할 일을 세 개만 남기고 첫 번째 일이 끝날 때까지 알림을 꺼두세요.',
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
