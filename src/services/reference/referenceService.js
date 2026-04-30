import { APP_CONFIG } from '../appConfig'
import { MOCK_ANALOGS, MOCK_COMPARISON, MOCK_PROTOTYPES, generateMockTaskId } from '../mocks/mockData'
import { mockDelay, globalMockTaskManager } from '../mocks/mockUtils'
import { API_PROCESSOR_ENDPOINTS } from '../apiConfig'
import authService from '../auth/authService'
import * as XLSX from 'xlsx'

const parseIdentityExcel = (worksheet) => {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  if (!data || data.length < 2) return { prototype: {}, rows: [] }
  
  const prototypeNumber = data[0]?.[2] || 'Unknown'
  const rows = []
  let currentSection = null
  let rowNumber = 1
  
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every(cell => !cell)) continue
    const cell1 = row[0]?.toString()?.trim()
    const cell2 = row[1]?.toString()?.trim()
    const cell3 = row[2]?.toString()?.trim()
    
    if (cell1?.includes('Ограничительные признаки')) { currentSection = 'limiting'; continue }
    if (cell1?.includes('Отличительные признаки')) { currentSection = 'distinguishing'; continue }
    if (!cell1 && !cell2 && !cell3) continue
    
    const featureText = cell1?.replace(/^\d+\.\s*/, '') || ''
    const patentFeature = cell2 === '-' || !cell2 ? null : cell2
    const prototypeFeature = cell3 === '-' || !cell3 ? null : cell3
    if (!patentFeature && !prototypeFeature) continue
    
    rows.push({ section: currentSection, row_number: rowNumber++, feature: featureText, patent_feature: patentFeature, prototype_feature: prototypeFeature })
  }
  return { prototype: { number: prototypeNumber, title: '', link: '', abstract: '', claims: '' }, rows }
}

export const TASK_STATUS = { RUNNING: 'running', SUCCESS: 'success', FAILED: 'failed', CANCELLED: 'cancelled' }
export const TASK_STATUS_MESSAGES = { [TASK_STATUS.RUNNING]: 'Выполняется...', [TASK_STATUS.SUCCESS]: 'Готово', [TASK_STATUS.FAILED]: 'Ошибка', [TASK_STATUS.CANCELLED]: 'Отменено' }

class ReferenceService {
  async createAnalogLink(patentId) {
    console.log('🟠 [Service] createAnalogLink: ЗАПУСК', { patentId, time: new Date().toISOString() })
    
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟠 [Service] createAnalogLink: оффлайн режим')
      await mockDelay(null)
      const taskId = generateMockTaskId('analog')
      globalMockTaskManager.createTask(taskId, patentId, 'analogs')
      setTimeout(() => {
        const analogsData = MOCK_ANALOGS[patentId] || MOCK_ANALOGS['1']
        globalMockTaskManager.completeTask(taskId, analogsData)
      }, 3000)
      return { task_id: taskId }
    }

    console.log('🟠 [Service] createAnalogLink: выполняем POST запрос...')
    const postStart = Date.now()

    // Шаг 1: Запуск задачи
    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.CREATE_SEARCH_BATCH,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ patent_id: String(patentId) })
      }
    )

    const postEnd = Date.now()
    console.log('🟠 [Service] createAnalogLink: POST завершён за', (postEnd - postStart), 'мс, status:', response.status)

    if (!response.ok) {
      console.error('🟠 [Service] createAnalogLink: POST ошибка', response.status)
      throw new Error('Ошибка создания задачи поиска аналогов')
    }

    const { task_id } = await response.json()
    console.log('🟠 [Service] createAnalogLink: получен task_id', { task_id })

    // Возвращаем только task_id — опрос будет в ReferenceContext
    return { task_id }
  }

  async getTaskResult(taskId, patentId) {
    console.log('🟤 [Service] getTaskResult: ВЫЗОВ', { taskId, patentId, time: new Date().toISOString() })
    
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_data_${patentId}`)
      console.log('🟤 [Service] getTaskResult: проверяем localStorage:', savedData ? 'данные есть' : 'данных нет')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('🟤 [Service] getTaskResult: возвращаем из кэша', { status: TASK_STATUS.SUCCESS, hasData: !!data, keys: Object.keys(data) })
          return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data }
        } catch (e) { console.error('🟤 [Service] getTaskResult: ошибка парсинга кэша:', e) }
      }
    }

    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟤 [Service] getTaskResult: оффлайн режим')
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)
      if (!task) return { status: TASK_STATUS.FAILED, message: 'Задача не найдена', task_id: taskId }
      if (task.status === 'success') return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: task.data }
      if (task.status === 'failed') return { status: TASK_STATUS.FAILED, message: task.error || 'Ошибка', task_id: taskId }
      return { status: TASK_STATUS.RUNNING, message: 'Выполняется...', task_id: taskId, progress: task.progress }
    }

    console.log('🟤 [Service] getTaskResult: РЕАЛЬНЫЙ РЕЖИМ - запрос к серверу')
    const getStart = Date.now()
    
    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.GET_SEARCH_RESULT(patentId),
      { method: 'GET', headers: { Accept: 'application/json' } }
    )
    
    const getEnd = Date.now()
    console.log('🟤 [Service] getTaskResult: GET завершён за', (getEnd - getStart), 'мс, status:', response.status)

    if (!response.ok) {
      console.error('🟤 [Service] getTaskResult: GET ошибка', response.status)
      throw new Error('Ошибка получения результата')
    }

    const data = await response.json()
    console.log('🟤 [Service] getTaskResult: данные получены, keys:', Object.keys(data))

    // 🔹 ЛОГ: проверка normalizedData
    let normalizedData;
    try {
      normalizedData = data.analogs || data
      console.log('🟤 [Service] getTaskResult: нормализация выполнена', { hasAnalogs: !!data.analogs, resultKeys: Object.keys(normalizedData) })
    } catch (e) {
      console.error('🟤 [Service] getTaskResult: ошибка нормализации:', e)
      normalizedData = data
    }

    if (patentId && normalizedData) {
      localStorage.setItem(`analogs_data_${patentId}`, JSON.stringify(normalizedData))
      console.log('🟤 [Service] getTaskResult: данные сохранены в localStorage')
    }

    console.log('🟤 [Service] getTaskResult: ВОЗВРАЩАЕМ', { status: TASK_STATUS.SUCCESS, hasData: !!normalizedData })
    return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: normalizedData }
  }

  async createAnalogCompare(patentId) {
    console.log('🟠 [Service] createAnalogCompare: ЗАПУСК', { patentId, time: new Date().toISOString() })
    
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟠 [Service] createAnalogCompare: оффлайн режим')
      await mockDelay(null)
      const taskId = generateMockTaskId('compare')
      globalMockTaskManager.createTask(taskId, patentId, 'compare')
      setTimeout(() => {
        const comparisonData = MOCK_COMPARISON[patentId] || MOCK_COMPARISON['1']
        globalMockTaskManager.completeTask(taskId, comparisonData)
      }, 4000)
      console.log('🟠 [Service] createAnalogCompare: оффлайн - возвращаем task_id', { taskId })
      return { task_id: taskId }
    }

    console.log('🟠 [Service] createAnalogCompare: выполняем POST запрос...')
    const postStart = Date.now()
    
    const response1 = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.CREATE_STATISTICS,
      { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ patent_id: patentId }) }
    )
    
    const postEnd = Date.now()
    console.log('🟠 [Service] createAnalogCompare: POST завершён за', (postEnd - postStart), 'мс, status:', response1.status)

    if (!response1.ok) {
      console.error('🟠 [Service] createAnalogCompare: POST ошибка', response1.status)
      switch (response1.status) {
        case 404: throw new Error('Патент не найден')
        case 400: throw new Error('Сначала получите аналоги')
        case 408: throw new Error('Превышено время ожидания')
        case 504: throw new Error('Сервер не ответил вовремя')
        case 503: throw new Error('Сервер временно недоступен')
        default:
          if (response1.status >= 500) throw new Error(`Ошибка сервера (${response1.status})`)
          throw new Error(`Ошибка создания задачи (${response1.status})`)
      }
    }

    // 🔹 ЛОГ: если есть лишний GET - он будет виден здесь
    if (response1.ok) {
      console.log('🟠 [Service] createAnalogCompare: POST успешен, продолжаем...')
      
      const response8 = await authService.authenticatedFetch(
        API_PROCESSOR_ENDPOINTS.GET_STATISTICS(patentId),
        { method: 'GET', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      )
      const getEnd = Date.now()
      console.log('🟠 [Service] createAnalogCompare: ДОП. GET завершён за', (getEnd - postEnd), 'мс, status:', response8.status)
      
      const data = await response8.json()
      const analogsData = data.analogs || data
      console.log('🟠 [Service] createAnalogCompare: данные получены, keys:', Object.keys(data))
      
      if (analogsData) {
        localStorage.setItem(`analogs_statistics_${patentId}`, JSON.stringify(analogsData))
        console.log('🟠 [Service] createAnalogCompare: данные сохранены в localStorage')
      }
    }

    const taskId = generateMockTaskId('compare')
    console.log('🟠 [Service] createAnalogCompare: создаём задачу в менеджере', { taskId })
    globalMockTaskManager.createTask(taskId, patentId, 'compare')
    
    // 🔹 ЛОГ: если есть completeTask - задача завершится мгновенно
    if (typeof analogsData !== 'undefined') {
      console.log('🟠 [Service] createAnalogCompare: вызываем completeTask (если есть)', { taskId })
      globalMockTaskManager.completeTask(taskId, analogsData)
    }

    console.log('🟠 [Service] createAnalogCompare: возвращаем task_id', { taskId })
    return { task_id: taskId }
  }

  async getCompareResult(taskId, patentId) {
    console.log('🟤 [Service] getCompareResult: ВЫЗОВ', { taskId, patentId, time: new Date().toISOString() })
    
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_statistics_${patentId}`)
      console.log('🟤 [Service] getCompareResult: проверяем localStorage:', savedData ? 'данные есть' : 'данных нет')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('🟤 [Service] getCompareResult: возвращаем из кэша', { status: TASK_STATUS.SUCCESS, hasData: !!data, keys: Object.keys(data) })
          return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data }
        } catch (e) { console.error('🟤 [Service] getCompareResult: ошибка парсинга кэша:', e) }
      }
    }

    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟤 [Service] getCompareResult: оффлайн режим')
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)
      if (!task) return { status: TASK_STATUS.FAILED, message: 'Задача не найдена', task_id: taskId }
      if (task.status === 'success') return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: task.data }
      if (task.status === 'failed') return { status: TASK_STATUS.FAILED, message: task.error || 'Ошибка', task_id: taskId }
      return { status: TASK_STATUS.RUNNING, message: 'Выполняется...', task_id: taskId, progress: task.progress }
    }

    console.log('🟤 [Service] getCompareResult: РЕАЛЬНЫЙ РЕЖИМ - запрос к серверу')
    const getStart = Date.now()
    
    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.GET_STATISTICS(patentId),
      { method: 'GET', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
    )
    
    const getEnd = Date.now()
    console.log('🟤 [Service] getCompareResult: GET завершён за', (getEnd - getStart), 'мс, status:', response.status)

    if (!response.ok) {
      console.error('🟤 [Service] getCompareResult: GET ошибка', response.status)
      throw new Error('Ошибка получения результата статистики')
    }

    const data = await response.json()
    console.log('🟤 [Service] getCompareResult: данные получены, keys:', Object.keys(data))

    let normalizedData = data;
    if (data && typeof data === 'object' && patentId && data[patentId]) {
      normalizedData = data[patentId];
      console.log('🟤 [Service] getCompareResult: данные распакованы по ключу:', patentId);
    }

    if (patentId && normalizedData) {
      localStorage.setItem(`analogs_statistics_${patentId}`, JSON.stringify(normalizedData))
      console.log('🟤 [Service] getCompareResult: данные сохранены в localStorage')
    }

    console.log('🟤 [Service] getCompareResult: ВОЗВРАЩАЕМ', { status: TASK_STATUS.SUCCESS, hasData: !!normalizedData })
    return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: normalizedData }
  }

  async createPrototypeTask(patentId) {
    console.log('🟠 [Service] createPrototypeTask: ЗАПУСК', { patentId, time: new Date().toISOString() })
    
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟠 [Service] createPrototypeTask: оффлайн режим')
      await mockDelay(null)
      const taskId = generateMockTaskId('prototype')
      globalMockTaskManager.createTask(taskId, patentId, 'prototype')
      setTimeout(() => {
        const prototypeData = MOCK_PROTOTYPES[patentId] || MOCK_PROTOTYPES['1']
        globalMockTaskManager.completeTask(taskId, prototypeData)
      }, 3000)
      console.log('🟠 [Service] createPrototypeTask: оффлайн - возвращаем task_id', { taskId })
      return { task_id: taskId }
    }

    console.log('🟠 [Service] createPrototypeTask: выполняем POST запрос...')
    const postStart = Date.now()
    
    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.CREATE_IDENTITY,
      { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ patent_id: patentId }) }
    )
    
    const postEnd = Date.now()
    console.log('🟠 [Service] createPrototypeTask: POST завершён за', (postEnd - postStart), 'мс, status:', response.status)

    if (!response.ok) {
      console.error('🟠 [Service] createPrototypeTask: POST ошибка', response.status)
      switch (response.status) {
        case 404: throw new Error('Патент не найден')
        case 400: throw new Error('Сначала выполните сопоставление')
        default: throw new Error('Ошибка создания задачи прототипа')
      }
    }

    // 🔹 ЛОГ: если есть лишний GET - он будет виден здесь
    if (response.ok) {
      console.log('🟠 [Service] createPrototypeTask: POST успешен, продолжаем...')
      
      const response2 = await authService.authenticatedFetch(
        API_PROCESSOR_ENDPOINTS.GET_IDENTITY(patentId),
        { method: 'GET', headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      )
      const getEnd = Date.now()
      console.log('🟠 [Service] createPrototypeTask: ДОП. GET завершён за', (getEnd - postEnd), 'мс, status:', response2.status)
      
      const data = await response2.json();
      const analogsData = data.analogs || data;
      console.log('🟠 [Service] createPrototypeTask: данные получены, keys:', Object.keys(data))

      let normalizedData = analogsData;
      if (analogsData && typeof analogsData === 'object' && analogsData[patentId]) {
        normalizedData = analogsData[patentId];
        console.log('🟠 [Service] createPrototypeTask: данные распакованы по ключу:', patentId);
      }

      localStorage.setItem(`analogs_identity_${patentId}`, JSON.stringify(normalizedData));
      console.log('🟠 [Service] createPrototypeTask: данные сохранены в localStorage')
    }

    const taskId = generateMockTaskId('prototype')
    console.log('🟠 [Service] createPrototypeTask: создаём задачу в менеджере', { taskId })
    globalMockTaskManager.createTask(taskId, patentId, 'prototype')
    
    // 🔹 ЛОГ: если есть completeTask - задача завершится мгновенно
    if (typeof analogsData !== 'undefined') {
      console.log('🟠 [Service] createPrototypeTask: вызываем completeTask (если есть)', { taskId })
      globalMockTaskManager.completeTask(taskId, analogsData)
    }

    console.log('🟠 [Service] createPrototypeTask: возвращаем task_id', { taskId })
    return { task_id: taskId }
  }

  async getPrototypeResult(taskId, patentId) {
    console.log('🟤 [Service] getPrototypeResult: ВЫЗОВ', { taskId, patentId, time: new Date().toISOString() })
    
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_identity_${patentId}`)
      console.log('🟤 [Service] getPrototypeResult: проверяем localStorage:', savedData ? 'данные есть' : 'данных нет')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('🟤 [Service] getPrototypeResult: возвращаем из кэша', { status: TASK_STATUS.SUCCESS, hasData: !!data })
          return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data }
        } catch (e) { console.error('🟤 [Service] getPrototypeResult: ошибка парсинга кэша:', e) }
      }
    }

    if (APP_CONFIG.USE_OFFLINE_MODE) {
      console.log('🟤 [Service] getPrototypeResult: оффлайн режим')
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)
      if (!task) return { status: TASK_STATUS.FAILED, message: 'Задача не найдена', task_id: taskId }
      if (task.status === 'success') return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: task.data }
      if (task.status === 'failed') return { status: TASK_STATUS.FAILED, message: task.error || 'Ошибка', task_id: taskId }
      return { status: TASK_STATUS.RUNNING, message: 'Выполняется...', task_id: taskId, progress: task.progress }
    }

    console.log('🟤 [Service] getPrototypeResult: РЕАЛЬНЫЙ РЕЖИМ - запрос к серверу')
    const getStart = Date.now()
    
    try {
      const response = await authService.authenticatedFetch(
        API_PROCESSOR_ENDPOINTS.GET_IDENTITY(patentId),
        { method: 'GET', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }
      )
      
      const getEnd = Date.now()
      console.log('🟤 [Service] getPrototypeResult: GET завершён за', (getEnd - getStart), 'мс, status:', response.status)

      if (!response.ok) throw new Error(`Ошибка ${response.status}: ${response.statusText}`)

      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsedData = parseIdentityExcel(worksheet)
      
      console.log('🟤 [Service] getPrototypeResult: данные распарсены, rows:', parsedData.rows?.length)

      if (patentId && parsedData) {
        localStorage.setItem(`analogs_identity_${patentId}`, JSON.stringify(parsedData))
        console.log('🟤 [Service] getPrototypeResult: данные сохранены в localStorage')
      }

      console.log('🟤 [Service] getPrototypeResult: ВОЗВРАЩАЕМ', { status: TASK_STATUS.SUCCESS, hasData: !!parsedData })
      return { status: TASK_STATUS.SUCCESS, message: 'Готово', task_id: taskId, data: parsedData }

    } catch (error) {
      console.error('🟤 [Service] getPrototypeResult: ОШИБКА:', error)
      throw new Error('Ошибка получения данных прототипа: ' + error.message)
    }
  }

  async setPrototype(patentId, prototypeNumber) {
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      MOCK_PROTOTYPES[patentId] = {
        prototype_number: prototypeNumber,
        selected_from_analogs: true
      }
      return MOCK_PROTOTYPES[patentId]
    }

    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.PROTOTYPE_SET,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          patent_id: patentId,
          prototype_number: prototypeNumber
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Ошибка установки прототипа')
    }

    const data = await response.json()
    return data
  }

  async getPrototype(patentId) {
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const prototype = MOCK_PROTOTYPES[patentId]
      if (!prototype) {
        throw new Error('Прототип не установлен')
      }
      return prototype
    }

    const response = await authService.authenticatedFetch(
      API_PROCESSOR_ENDPOINTS.PROTOTYPE_GET(patentId),
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Прототип не установлен')
      }
      throw new Error('Ошибка получения прототипа')
    }

    const data = await response.json()
    return data
  }

  async getPatentProgress(patentUuid) {
    try {
      const response = await authService.authenticatedFetch(
        API_PROCESSOR_ENDPOINTS.GET_PROGRESS(patentUuid),
        { 
          method: 'GET', 
          headers: { Accept: 'application/json' } 
        }
      )
      
      if (!response.ok) {
        throw new Error('Ошибка получения прогресса')
      }
      
      const data = await response.json()
      console.log('📊 Прогресс патента:', data)
      
      return {
        success: true,
        data: {
          lastUiButton: data.last_ui_button,  // "ANALOGS_SEARCH" | "STATISTICS" | "IDENTITY"
          statisticsState: data.statistics_pipeline_state,
          identityState: data.identity_pipeline_state,
          error: data.pipeline_error,
        }
      }
    } catch (error) {
      console.error('❌ Ошибка getPatentProgress:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }
}


export default new ReferenceService()
