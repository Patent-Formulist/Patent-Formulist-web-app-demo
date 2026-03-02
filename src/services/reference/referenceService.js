import { APP_CONFIG } from '../appConfig'
import { MOCK_ANALOGS, MOCK_COMPARISON, MOCK_PROTOTYPES, generateMockTaskId } from '../mocks/mockData'
import { mockDelay, globalMockTaskManager } from '../mocks/mockUtils'
import { API_REFERENCE_ENDPOINTS } from '../apiConfig'
import authService from '../auth/authService'

export const TASK_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

export const TASK_STATUS_MESSAGES = {
  [TASK_STATUS.RUNNING]: 'Выполняется...',
  [TASK_STATUS.SUCCESS]: 'Готово',
  [TASK_STATUS.FAILED]: 'Ошибка',
  [TASK_STATUS.CANCELLED]: 'Отменено'
}

class ReferenceService {
  async createAnalogLink(patentId) {
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const taskId = generateMockTaskId('analog')
      
      globalMockTaskManager.createTask(taskId, patentId, 'analogs')
      
      setTimeout(() => {
        const analogsData = MOCK_ANALOGS[patentId] || MOCK_ANALOGS['1']
        globalMockTaskManager.completeTask(taskId, analogsData)
      }, 3000)
      
      return { task_id: taskId }
    }

    const response3 = await authService.authenticatedFetch(
      API_REFERENCE_ENDPOINTS.ANALOG_GET_SEARCH_RESULT(patentId),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    const data = await response3.json()
    const analogsData = data.analogs || data

    // 👇 СОХРАНЯЕМ ДАННЫЕ В localStorage
    if (analogsData) {
      localStorage.setItem(`analogs_data_${patentId}`, JSON.stringify(analogsData))
    }

    const taskId = generateMockTaskId('analog')
    globalMockTaskManager.createTask(taskId, patentId, 'analogs')
    globalMockTaskManager.completeTask(taskId, analogsData)

    return { task_id: taskId }
  }

  async getTaskResult(taskId, patentId) {
    // 👇 ИЗВЛЕКАЕМ patentId из taskId (формат "analog_3_timestamp")
    // const match = taskId?.match(/analog_(\d+)_/)
    // const patentId = match ? match[1] : null

    // 👇 ПРОВЕРЯЕМ localStorage ПЕРВЫМ ДЕЛОМ - ЭТО ДЛЯ ВСЕХ РЕЖИМОВ!
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_data_${patentId}`)
      console.log(`🔍 Проверяем localStorage для patentId ${patentId}:`, savedData ? 'данные есть' : 'данных нет')

      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('✅ Данные найдены в localStorage для patentId:', patentId)
          console.log('📦 Тип данных:', typeof data)
          console.log('📦 Это массив?', Array.isArray(data))
          console.log('📦 Это объект?', typeof data === 'object' && !Array.isArray(data))
          console.log('📦 Содержимое данных (первые 200 символов):', JSON.stringify(data).substring(0, 200))
          console.log('📦 Ключи объекта:', Object.keys(data))
          console.log('📦 Количество аналогов:', Object.keys(data).length)

          // Проверим структуру первого аналога если есть
          if (Object.keys(data).length > 0) {
            const firstKey = Object.keys(data)[0]
            console.log('📦 Структура первого аналога:', data[firstKey])
          }

          // ВАЖНО: возвращаем и НЕ выполняем код дальше!
          return {
            status: TASK_STATUS.SUCCESS,
            message: 'Готово',
            task_id: taskId,
            data: data
          }
        } catch (e) {
          console.error('❌ Ошибка парсинга данных из localStorage:', e)
          console.error('❌ Сырые данные:', savedData)
        }
      }
    }

    // Офлайн режим - только если нет данных в localStorage
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)

      if (!task) {
        return {
          status: TASK_STATUS.FAILED,
          message: 'Задача не найдена',
          task_id: taskId
        }
      }

      if (task.status === 'success') {
        return {
          status: TASK_STATUS.SUCCESS,
          message: 'Готово',
          task_id: taskId,
          data: task.data
        }
      }

      if (task.status === 'failed') {
        return {
          status: TASK_STATUS.FAILED,
          message: task.error || 'Ошибка выполнения',
          task_id: taskId
        }
      }

      return {
        status: TASK_STATUS.RUNNING,
        message: 'Выполняется...',
        task_id: taskId,
        progress: task.progress
      }
    }

    // Реальный режим - запрос к серверу
    // СЮДА МЫ ПОПАДАЕМ ТОЛЬКО ЕСЛИ:
    // 1. НЕТ ДАННЫХ В LOCALSTORAGE
    // 2. НЕ ОФЛАЙН РЕЖИМ
    console.log('🌐 Запрашиваем данные с сервера для taskId:', taskId)

    const response = await authService.authenticatedFetch(
      API_REFERENCE_ENDPOINTS.ANALOG_GET_SEARCH_RESULT(patentId), // 👈 ЭТОТ ЗАПРОС ТЕПЕРЬ БУДЕТ ТОЛЬКО ПРИ ОТСУТСТВИИ ДАННЫХ
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      throw new Error('Ошибка получения результата')
    }

    const data = await response.json()

    // Сохраняем полученные данные в localStorage
    if (patentId && data.analogs) {
      localStorage.setItem(`analogs_data_${patentId}`, JSON.stringify(data.analogs))
    }

    return data
  }

    async createAnalogCompare(patentId) {
      if (APP_CONFIG.USE_OFFLINE_MODE) {
        await mockDelay(null)
        const taskId = generateMockTaskId('compare')

        globalMockTaskManager.createTask(taskId, patentId, 'compare')

        setTimeout(() => {
          const comparisonData = MOCK_COMPARISON[patentId] || MOCK_COMPARISON['1']
          globalMockTaskManager.completeTask(taskId, comparisonData)
        }, 4000)

        return { task_id: taskId }
      }

      const response = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.ANALOG_CREATE_ATTRIBUTE(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Аттрибуты не созданы')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response2 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.ANALOG_CREATE_ATTRIBUTE_MATCHING(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response2.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Аттрибуты не объединенны')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response3 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_CREATE_ATTRIBUTE(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response3.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Патент не найден')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response4 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_CREATE_GENERAL_ATTRIBUTE(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response4.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Патент не найден')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response5 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.ANALOG_CREATE_ATTRIBUTE_CHECKING(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response5.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Патент не найден')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response6 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_CREATE_ATTRIBUTE_CHECKING(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response6.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Патент не найден')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response7 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_CREATE_STATISTICS(patentId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ patent_id: patentId }),
        }
      )

      if (!response7.ok) {
        switch (response.status) {
          case 404:
            throw new Error('Патент не найден')
          case 400:
            throw new Error('Сначала получите аналоги')
          default:
            throw new Error('Ошибка создания задачи сравнения')
        }
      }

      const response8 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_GET_STATISTICS(patentId),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )

      const data = await response8.json()
      const analogsData = data.analogs || data

      // 👇 СОХРАНЯЕМ ДАННЫЕ В localStorage
      if (analogsData) {
        localStorage.setItem(`analogs_statistics_${patentId}`, JSON.stringify(analogsData))
      }

      const taskId = generateMockTaskId('compare')
      globalMockTaskManager.createTask(taskId, patentId, 'compare')
      globalMockTaskManager.completeTask(taskId, analogsData)

      return { task_id: taskId }
    }

    async getCompareResult(taskId , patentId) {
    // 👇 ИЗВЛЕКАЕМ patentId из taskId (формат "compare_3_timestamp")
    const match = taskId?.match(/compare_(\d+)_/)
    console.log(`TaskId ${taskId}:`)
    console.log(`match ${match}:`)
    // const patentId = match ? match[1] : null

    // 👇 ПРОВЕРЯЕМ localStorage ПЕРВЫМ ДЕЛОМ - ДЛЯ СТАТИСТИКИ
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_statistics_${patentId}`)
      console.log(`🔍 Проверяем localStorage для statistics patentId ${patentId}:`, savedData ? 'данные есть' : 'данных нет')

      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('✅ Данные статистики найдены в localStorage для patentId:', patentId)
          console.log('📊 Тип данных:', typeof data)
          console.log('📊 Это массив?', Array.isArray(data))
          console.log('📊 Это объект?', typeof data === 'object' && !Array.isArray(data))
          console.log('📊 Ключи объекта:', Object.keys(data))
          console.log('📊 Содержимое данных (первые 200 символов):', JSON.stringify(data).substring(0, 200))

          // Проверим структуру данных если есть
          if (Object.keys(data).length > 0) {
            const firstKey = Object.keys(data)[0]
            console.log('📊 Структура данных для патента', patentId, ':', data[firstKey])

            // Дополнительная проверка для statistics
            if (data[firstKey] && data[firstKey].features) {
              console.log('📊 Количество признаков (features):', data[firstKey].features.length)
              console.log('📊 Количество аналогов (analogs):', data[firstKey].analogs.length)
            }
          }

          // ВАЖНО: возвращаем и НЕ выполняем код дальше!
          return {
            status: TASK_STATUS.SUCCESS,
            message: 'Готово',
            task_id: taskId,
            data: data
          }
        } catch (e) {
          console.error('❌ Ошибка парсинга данных статистики из localStorage:', e)
          console.error('❌ Сырые данные:', savedData)
        }
      }
    }

    // Офлайн режим - только если нет данных в localStorage
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)

      if (!task) {
        return {
          status: TASK_STATUS.FAILED,
          message: 'Задача не найдена',
          task_id: taskId
        }
      }

      if (task.status === 'success') {
        return {
          status: TASK_STATUS.SUCCESS,
          message: 'Готово',
          task_id: taskId,
          data: task.data
        }
      }

      if (task.status === 'failed') {
        return {
          status: TASK_STATUS.FAILED,
          message: task.error || 'Ошибка выполнения',
          task_id: taskId
        }
      }

      return {
        status: TASK_STATUS.RUNNING,
        message: 'Выполняется...',
        task_id: taskId,
        progress: task.progress
      }
    }

    // Реальный режим - запрос к серверу
    // СЮДА МЫ ПОПАДАЕМ ТОЛЬКО ЕСЛИ:
    // 1. НЕТ ДАННЫХ В LOCALSTORAGE
    // 2. НЕ ОФЛАЙН РЕЖИМ
    console.log('🌐 Запрашиваем данные статистики с сервера для patentId:', patentId)

    const response = await authService.authenticatedFetch(
      API_REFERENCE_ENDPOINTS.PATENT_GET_STATISTICS(patentId),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
      }
    )

    if (!response.ok) {
      throw new Error('Ошибка получения результата статистики')
    }

    const data = await response.json()
    console.log('📊 Получены данные статистики от сервера:', data)

    // Сохраняем полученные данные в localStorage
    if (patentId && data) {
      localStorage.setItem(`analogs_statistics_${patentId}`, JSON.stringify(data))
      console.log('💾 Данные статистики сохранены в localStorage с ключом:', `analogs_statistics_${patentId}`)
    }

    return data
}

  async createPrototypeTask(patentId) {
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const taskId = generateMockTaskId('prototype')
      
      globalMockTaskManager.createTask(taskId, patentId, 'prototype')
      
      setTimeout(() => {
        const prototypeData = MOCK_PROTOTYPES[patentId] || MOCK_PROTOTYPES['1']
        globalMockTaskManager.completeTask(taskId, prototypeData)
      }, 3000)
      
      return { task_id: taskId }
    }

    const response = await authService.authenticatedFetch(
      API_REFERENCE_ENDPOINTS.ANALOG_CREATE_IDENTITY(patentId),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ patent_id: patentId }),
      }
    )

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error('Патент не найден')
        case 400:
          throw new Error('Сначала выполните сопоставление с аналогами')
        default:
          throw new Error('Ошибка создания задачи прототипа')
      }
    }

    const response2 = await authService.authenticatedFetch(
        API_REFERENCE_ENDPOINTS.PATENT_GET_IDENTITY(patentId),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )

      const data = await response2.json();
      const analogsData = data.analogs || data;

      let normalizedData = analogsData;
      if (analogsData && typeof analogsData === 'object' && analogsData[patentId]) {
        normalizedData = analogsData[patentId];
      }

      localStorage.setItem(`analogs_identity_${patentId}`, JSON.stringify(normalizedData));

      const taskId = generateMockTaskId('prototype')
      globalMockTaskManager.createTask(taskId, patentId, 'prototype')
      globalMockTaskManager.completeTask(taskId, analogsData)

      return { task_id: taskId }
  }

  async getPrototypeResult(taskId, patentId) {
    // 👇 ИЗВЛЕКАЕМ patentId из taskId (формат "prototype_3_timestamp")
    const match = taskId?.match(/prototype_(\d+)_/)
    console.log(`TaskId ${taskId}:`)
    console.log(`match ${match}:`)
    // const patentId = match ? match[1] : null

    // 👇 ПРОВЕРЯЕМ localStorage ПЕРВЫМ ДЕЛОМ - ДЛЯ ПРОТОТИПА
    if (patentId) {
      const savedData = localStorage.getItem(`analogs_identity_${patentId}`)
      console.log(`🔍 Проверяем localStorage для identity patentId ${patentId}:`, savedData ? 'данные есть' : 'данных нет')

      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          console.log('✅ Данные прототипа найдены в localStorage для patentId:', patentId)
          console.log('📊 Тип данных:', typeof data)
          console.log('📊 Это массив?', Array.isArray(data))
          console.log('📊 Это объект?', typeof data === 'object' && !Array.isArray(data))
          console.log('📊 Ключи объекта:', Object.keys(data))
          console.log('📊 Содержимое данных (первые 200 символов):', JSON.stringify(data).substring(0, 200))

          // Проверим структуру данных если есть
          if (Object.keys(data).length > 0) {
            const firstKey = Object.keys(data)[0]
            console.log('📊 Структура данных прототипа для патента', patentId, ':', data[firstKey])
          }

          // ВАЖНО: возвращаем и НЕ выполняем код дальше!
          return {
            status: TASK_STATUS.SUCCESS,
            message: 'Готово',
            task_id: taskId,
            data: data
          }
        } catch (e) {
          console.error('❌ Ошибка парсинга данных прототипа из localStorage:', e)
          console.error('❌ Сырые данные:', savedData)
        }
      }
    }

    // Офлайн режим - только если нет данных в localStorage
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const task = globalMockTaskManager.getTask(taskId)

      if (!task) {
        return {
          status: TASK_STATUS.FAILED,
          message: 'Задача не найдена',
          task_id: taskId
        }
      }

      if (task.status === 'success') {
        return {
          status: TASK_STATUS.SUCCESS,
          message: 'Готово',
          task_id: taskId,
          data: task.data
        }
      }

      if (task.status === 'failed') {
        return {
          status: TASK_STATUS.FAILED,
          message: task.error || 'Ошибка выполнения',
          task_id: taskId
        }
      }

      return {
        status: TASK_STATUS.RUNNING,
        message: 'Выполняется...',
        task_id: taskId,
        progress: task.progress
      }
    }

    // Реальный режим - запрос к серверу
    // СЮДА МЫ ПОПАДАЕМ ТОЛЬКО ЕСЛИ:
    // 1. НЕТ ДАННЫХ В LOCALSTORAGE
    // 2. НЕ ОФЛАЙН РЕЖИМ
    console.log('🌐 Запрашиваем данные прототипа с сервера для patentId:', patentId)

    const response = await authService.authenticatedFetch(
      API_REFERENCE_ENDPOINTS.PATENT_GET_IDENTITY(patentId),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
      }
    )

    if (!response.ok) {
      throw new Error('Ошибка получения результата прототипа')
    }

    const data = await response.json()
    console.log('📊 Получены данные прототипа от сервера:', data)

    // Сохраняем полученные данные в localStorage
    if (patentId && data) {
      localStorage.setItem(`analogs_identity_${patentId}`, JSON.stringify(data))
      console.log('💾 Данные прототипа сохранены в localStorage с ключом:', `analogs_identity_${patentId}`)
    }

    return data
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
      API_REFERENCE_ENDPOINTS.PROTOTYPE_SET,
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
      API_REFERENCE_ENDPOINTS.PROTOTYPE_GET(patentId),
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
}

export default new ReferenceService()
