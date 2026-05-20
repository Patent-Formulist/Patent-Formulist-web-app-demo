// B:\projects\web-formulist\src\services\mocks\mockData.js
export const MOCK_USERS = {
  'fateev0803@gmail.com': {
    email: 'fateev0803@gmail.com',
    password: '11111111',
    tokens: {
      access: 'mock_access_token_123',
      refresh: 'mock_refresh_token_456'
    },
    profile: {
      name: 'Тестовый Пользователь',
      about: 'Разработчик патентной системы',
      email: 'test@test.com',
      avatar: null
    },
    settings: {
      isExpert: true,
      aiModel: 'GPT-4',
      subscription: 'Premium'
    }
  }
}

export const MOCK_PATENTS = {
  '1': {
    patent_uuid: '1',
    name: 'Устройство для автоматизации',
    technical_area: 'Электроника и автоматика',
    appointment: 'Устройство предназначено для автоматизации производственных процессов',
    construction: 'Устройство содержит блок управления, датчики, исполнительные механизмы',
    operation_principle: 'Работает на основе микроконтроллерной системы с обратной связью',
    technical_result: 'Повышение точности управления на 25%, снижение энергопотребления',
    search_query: 'автоматизация производство контроллер'
  },
  '2': {
    patent_uuid: '2',
    name: 'Способ обработки данных',
    technical_area: 'Информационные технологии',
    appointment: 'Способ предназначен для обработки больших массивов данных',
    construction: 'Реализован в виде алгоритма с использованием машинного обучения',
    operation_principle: 'Использует параллельную обработку и распределенные вычисления',
    technical_result: 'Ускорение обработки в 5 раз, снижение потребления памяти на 30%',
    search_query: 'обработка данных машинное обучение'
  },
  '3': {
    patent_uuid: '3',
    name: 'Композиционный материал',
    technical_area: 'Материаловедение',
    appointment: 'Материал для изготовления высокопрочных конструкций',
    construction: 'Состоит из полимерной матрицы и армирующих волокон',
    operation_principle: 'Прочность достигается за счет равномерного распределения нагрузки',
    technical_result: 'Увеличение прочности на 40%, снижение массы на 20%',
    search_query: 'композитный материал полимер'
  }
}

export const MOCK_ANALOGS = {
  '1': {
    '0': {
      number: 'RU2767088C1',
      title: 'Система автоматического управления технологическим процессом',
      link: 'https://patents.google.com/patent/RU2767088C1',
      abstract: 'Изобретение относится к области автоматизации. Система содержит датчики температуры, давления, блок управления на базе микропроцессора.',
      claims: '1. Система автоматического управления, содержащая датчики и блок управления, отличающаяся тем, что дополнительно содержит модуль прогнозирования.'
    },
    '1': {
      number: 'RU2750123C1',
      title: 'Устройство контроля производственных параметров',
      link: 'https://patents.google.com/patent/RU2750123C1',
      abstract: 'Устройство предназначено для мониторинга и контроля параметров в реальном времени.',
      claims: '1. Устройство контроля, характеризующееся наличием множества датчиков и централизованной системы обработки данных.'
    },
    '2': {
      number: 'RU2800456C2',
      title: 'Система управления с адаптивным алгоритмом',
      link: 'https://patents.google.com/patent/RU2800456C2',
      abstract: 'Система реализует самообучающийся алгоритм управления на основе нейронных сетей.',
      claims: '1. Система управления с адаптацией, включающая модуль машинного обучения.'
    }
  },
  '2': {
    '0': {
      number: 'RU2755000C1',
      title: 'Способ параллельной обработки данных',
      link: 'https://patents.google.com/patent/RU2755000C1',
      abstract: 'Способ обеспечивает высокоскоростную обработку больших объемов информации.',
      claims: '1. Способ обработки данных, характеризующийся распределением задач между несколькими вычислительными узлами.'
    },
    '1': {
      number: 'RU2780001C2',
      title: 'Алгоритм кластеризации данных',
      link: 'https://patents.google.com/patent/RU2780001C2',
      abstract: 'Алгоритм использует методы машинного обучения для группировки данных.',
      claims: '1. Алгоритм, включающий этапы предобработки, кластеризации и постобработки.'
    }
  },
  '3': {
    '0': {
      number: 'RU2733000C1',
      title: 'Армированный полимерный композит',
      link: 'https://patents.google.com/patent/RU2733000C1',
      abstract: 'Композит содержит эпоксидную смолу и углеродные волокна.',
      claims: '1. Композиционный материал, содержащий полимерную матрицу и армирующие волокна.'
    }
  }
}

export const MOCK_COMPARISON = {
  '1': {
    features: [
      'Наличие блока управления',
      'Использование датчиков обратной связи',
      'Микропроцессорная архитектура',
      'Система энергосбережения',
      'Модуль самодиагностики'
    ],
    analogs: ['RU2767088C1', 'RU2750123C1', 'RU2800456C2'],
    comparison: [
      ['+', '+', '+'],
      ['+', '+', '-'],
      ['+', '-', '+'],
      ['-', '-', '+'],
      ['-', '+', '-']
    ],
    frequency: ['3/3', '2/3', '2/3', '1/3', '1/3'],
    user_patent: ['+', '+', '+', '+', '+'],
    user_comparison: [
      ['+', '+', '+'],
      ['+', '+', '-'],
      ['+', '-', '+'],
      ['+', '-', '+'],
      ['+', '+', '-']
    ],
    analog_counts: ['5', '4', '4'],
    analog_features: [
      'Центральный блок управления',
      'Датчики температуры и давления',
      'Микропроцессорная система',
      'Энергоэффективный режим работы',
      'Модуль диагностики состояния'
    ],
    patent_features: [
      'Блок управления с ИИ',
      'Датчики обратной связи',
      'Микроконтроллер ARM',
      'Система энергосбережения',
      'Самодиагностика'
    ]
  },
  '2': {
    features: [
      'Параллельная обработка',
      'Использование ML-алгоритмов',
      'Распределенная архитектура',
      'Оптимизация памяти'
    ],
    analogs: ['RU2755000C1', 'RU2780001C2'],
    comparison: [
      ['+', '+'],
      ['-', '+'],
      ['+', '-'],
      ['+', '+']
    ],
    frequency: ['2/2', '1/2', '1/2', '2/2'],
    user_patent: ['+', '+', '+', '+'],
    user_comparison: [
      ['+', '+'],
      ['+', '+'],
      ['+', '-'],
      ['+', '+']
    ],
    analog_counts: ['4', '4'],
    analog_features: [
      'Многопоточная обработка',
      'Алгоритмы машинного обучения',
      'Распределенные вычисления',
      'Управление памятью'
    ],
    patent_features: [
      'Параллельная обработка данных',
      'ML-алгоритмы',
      'Распределенная система',
      'Оптимизация использования памяти'
    ]
  },
  '3': {
    features: [
      'Полимерная матрица',
      'Армирующие волокна',
      'Высокая прочность'
    ],
    analogs: ['RU2733000C1'],
    comparison: [
      ['+'],
      ['+'],
      ['+']
    ],
    frequency: ['1/1', '1/1', '1/1'],
    user_patent: ['+', '+', '+'],
    user_comparison: [
      ['+'],
      ['+'],
      ['+']
    ],
    analog_counts: ['3'],
    analog_features: [
      'Эпоксидная смола',
      'Углеродные волокна',
      'Повышенная прочность'
    ],
    patent_features: [
      'Полимерная матрица',
      'Армирующие волокна',
      'Высокая прочность'
    ]
  }
}

export const MOCK_PROTOTYPES = {
  '1': {
    prototype: {
      number: 'RU2810832C1',
      title: 'Сцепное стабилизирующее устройство одноосного прицепа',
      link: 'https://searchplatform.rospatent.gov.ru/patsearch/v0.2/docs/RU2810832C1_20231228',
      abstract: 'Изобретение относится к сцепным устройствам автомобильных и тракторных поездов с одноосными прицепами...',
      claims: 'Сцепное стабилизирующее устройство одноосного прицепа, содержащее тяговый рычаг...'
    },
    rows: [
      // 🔹 Ограничительные признаки (есть и у патента, и у прототипа)
      { section: 'limiting', row_number: 1, feature: 'Крестообразный шарнир', patent_feature: 'Крестовина с горизонтальной осью', prototype_feature: 'Крестообразный шарнир' },
      { section: 'limiting', row_number: 2, feature: 'Тяговый рычаг', patent_feature: 'Тяговый механизм', prototype_feature: 'Тяговый рычаг' },
      { section: 'limiting', row_number: 3, feature: 'Гидроцилиндры двухстороннего действия', patent_feature: 'Гидравлическая система стабилизации', prototype_feature: 'Гидроцилиндры двухстороннего действия' },
      
      // 🔹 Отличительные признаки (есть только у одного)
      { section: 'distinguishing', row_number: 4, feature: 'Шкворень крестовины', patent_feature: 'Поворотный механизм', prototype_feature: null },
      { section: 'distinguishing', row_number: 5, feature: 'Вилка-фланец', patent_feature: null, prototype_feature: 'Вилка-фланец' },
      { section: 'distinguishing', row_number: 6, feature: 'Шаровой шарнир', patent_feature: 'Крепежный узел', prototype_feature: null }
    ]
  },
  '2': {
    prototype: {
      number: 'RU2755000C1',
      title: 'Способ параллельной обработки данных',
      link: 'https://patents.google.com/patent/RU2755000C1',
      abstract: 'Способ обеспечивает высокоскоростную обработку больших объемов информации.',
      claims: '1. Способ обработки данных, характеризующийся распределением задач между несколькими вычислительными узлами.'
    },
    rows: [
      { section: 'limiting', row_number: 1, feature: 'Многопоточная обработка', patent_feature: 'Параллельная обработка данных', prototype_feature: 'Многопоточная обработка' },
      { section: 'limiting', row_number: 2, feature: 'Распределенные вычисления', patent_feature: 'Распределенная система', prototype_feature: 'Распределенные вычисления' },
      { section: 'distinguishing', row_number: 3, feature: 'Управление памятью', patent_feature: null, prototype_feature: 'Управление памятью' },
      { section: 'distinguishing', row_number: 4, feature: 'Оптимизация ресурсов', patent_feature: 'Оптимизация использования памяти', prototype_feature: null }
    ]
  },
  '3': {
    prototype: {
      number: 'RU2733000C1',
      title: 'Армированный полимерный композит',
      link: 'https://patents.google.com/patent/RU2733000C1',
      abstract: 'Композит содержит эпоксидную смолу и углеродные волокна.',
      claims: '1. Композиционный материал, содержащий полимерную матрицу и армирующие волокна.'
    },
    rows: [
      { section: 'limiting', row_number: 1, feature: 'Полимерная матрица', patent_feature: 'Полимерная матрица', prototype_feature: 'Эпоксидная смола' },
      { section: 'limiting', row_number: 2, feature: 'Армирующие волокна', patent_feature: 'Армирующие волокна', prototype_feature: 'Углеродные волокна' },
      { section: 'distinguishing', row_number: 3, feature: 'Повышенная прочность', patent_feature: 'Высокая прочность', prototype_feature: null }
    ]
  }
}

export const MOCK_AI_MODELS = [
  'GPT-4',
  'GPT-4 Turbo',
  'GPT-3.5 Turbo',
  'Claude 3 Opus',
  'Claude 3 Sonnet',
  'Claude 3.5 Sonnet',
  'Gemini Pro',
  'Gemini Ultra',
  'LLaMA 3 70B',
  'Mistral Large'
]

export const MOCK_ELEMENTS_DATA = [
  { id: 'el-1', description: 'Резистивные датчики влажности', position: 0 },
  { id: 'el-2', description: 'Микроконтроллер управления', position: 1 },
  { id: 'el-3', description: 'Радиомодуль передачи данных', position: 2 },
  { id: 'el-4', description: 'Автономный источник питания', position: 3 },
  { id: 'el-5', description: 'Блок аналого-цифрового преобразования', position: 4 },
  { id: 'el-6', description: 'Антенна радиосвязи', position: 5 },
]

export const MOCK_FIGURES_DATA = [
  {
    id: 'fig-1',
    description: 'Схема датчика для получения влажности с автономным питанием и передачей информации по радиосвязи — вид сверху.',
    element_ids: ['el-1', 'el-2', 'el-3', 'el-4'],
  },
  {
    id: 'fig-2',
    description: 'Принципиальная электрическая схема блока аналого-цифрового преобразования и антенного модуля — вид сбоку.',
    element_ids: ['el-5', 'el-6', 'el-2'],
  },
]

let mockPatentIdCounter = Object.keys(MOCK_PATENTS).length
let mockTaskIdCounter = 0

export const generateMockPatentId = () => {
  mockPatentIdCounter++
  return String(mockPatentIdCounter)
}

export const generateMockTaskId = (prefix = 'task') => {
  mockTaskIdCounter++
  return `${prefix}_${mockTaskIdCounter}_${Date.now()}`
}