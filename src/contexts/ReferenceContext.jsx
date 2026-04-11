import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import referenceService, { TASK_STATUS } from '../services/reference/referenceService'

const ReferenceContext = createContext()

const STORAGE_KEY_ANALOGS = 'analog_tasks'
const STORAGE_KEY_COMPARE = 'compare_tasks'
const STORAGE_KEY_PROTOTYPE = 'prototype_tasks'

export function ReferenceProvider({ children }) {
  const [analogTasks, setAnalogTasks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ANALOGS)
    return saved ? JSON.parse(saved) : {}
  })

  const [compareTasks, setCompareTasks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COMPARE)
    return saved ? JSON.parse(saved) : {}
  })

  const [prototypeTasks, setPrototypeTasks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROTOTYPE)
    return saved ? JSON.parse(saved) : {}
  })

  const analogIntervalsRef = useRef({})
  const compareIntervalsRef = useRef({})
  const prototypeIntervalsRef = useRef({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ANALOGS, JSON.stringify(analogTasks))
  }, [analogTasks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPARE, JSON.stringify(compareTasks))
  }, [compareTasks])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROTOTYPE, JSON.stringify(prototypeTasks))
  }, [prototypeTasks])

  useEffect(() => {
    Object.entries(analogTasks).forEach(([patentId, task]) => {
      if (task.status === TASK_STATUS.RUNNING && !analogIntervalsRef.current[patentId]) {
        restoreAnalogPolling(patentId, task.taskId)
      }
    })

    Object.entries(compareTasks).forEach(([patentId, task]) => {
      if (task.status === TASK_STATUS.RUNNING && !compareIntervalsRef.current[patentId]) {
        restoreComparePolling(patentId, task.taskId)
      }
    })

    Object.entries(prototypeTasks).forEach(([patentId, task]) => {
      if (task.status === TASK_STATUS.RUNNING && !prototypeIntervalsRef.current[patentId]) {
        restorePrototypePolling(patentId, task.taskId)
      }
    })
  }, [])

  const restoreAnalogPolling = useCallback((patentId, taskId) => {
    console.log('🟣 [Context] restoreAnalogPolling: ЗАПУЩЕН ПОЛЛИНГ', { patentId, taskId })
    
    analogIntervalsRef.current[patentId] = setInterval(async () => {
      const pollStart = Date.now()
      console.log('🟣 [Context] polling: интервал сработал', new Date().toISOString())
      
      try {
        console.log('🟣 [Context] polling: вызываем getTaskResult...')
        const result = await referenceService.getTaskResult(taskId, patentId)
        const pollEnd = Date.now()
        
        console.log('🟣 [Context] polling: getTaskResult вернул:', { 
          status: result?.status, 
          hasData: !!result?.data,
          time: (pollEnd - pollStart) + 'мс'
        })

        if (result.status === TASK_STATUS.SUCCESS) {
          console.log('🟣 [Context] polling: SUCCESS - останавливаем поллинг')
          clearInterval(analogIntervalsRef.current[patentId])
          delete analogIntervalsRef.current[patentId]

          setAnalogTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: TASK_STATUS.SUCCESS,
              data: result.data,
              error: null
            }
          }))
          
          console.log('🟣 [Context] polling: analogTasks обновлён на SUCCESS')
        } else if (result.status === TASK_STATUS.FAILED || result.status === TASK_STATUS.CANCELLED) {
          console.log('🟣 [Context] polling: FAILED/CANCELLED - останавливаем поллинг')
          clearInterval(analogIntervalsRef.current[patentId])
          delete analogIntervalsRef.current[patentId]

          setAnalogTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: result.status,
              data: null,
              error: result.message
            }
          }))
        } else {
          console.log('🟣 [Context] polling: статус', result.status, '- продолжаем поллинг')
        }
      } catch (error) {
        console.error('🟣 [Context] polling: ОШИБКА:', error)
        clearInterval(analogIntervalsRef.current[patentId])
        delete analogIntervalsRef.current[patentId]

        setAnalogTasks(prev => ({
          ...prev,
          [patentId]: {
            taskId,
            status: TASK_STATUS.FAILED,
            data: null,
            error: error.message
          }
        }))
      }
    }, 2000)
  }, [])

  const restoreComparePolling = useCallback((patentId, taskId) => {
    compareIntervalsRef.current[patentId] = setInterval(async () => {
      try {
        const result = await referenceService.getCompareResult(taskId, patentId)

        if (result.status === TASK_STATUS.SUCCESS) {
          clearInterval(compareIntervalsRef.current[patentId])
          delete compareIntervalsRef.current[patentId]

          setCompareTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: TASK_STATUS.SUCCESS,
              data: result.data,
              error: null
            }
          }))
        } else if (result.status === TASK_STATUS.FAILED || result.status === TASK_STATUS.CANCELLED) {
          clearInterval(compareIntervalsRef.current[patentId])
          delete compareIntervalsRef.current[patentId]

          setCompareTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: result.status,
              data: null,
              error: result.message
            }
          }))
        }
      } catch (error) {
        clearInterval(compareIntervalsRef.current[patentId])
        delete compareIntervalsRef.current[patentId]

        setCompareTasks(prev => ({
          ...prev,
          [patentId]: {
            taskId,
            status: TASK_STATUS.FAILED,
            data: null,
            error: error.message
          }
        }))
      }
    }, 2000)
  }, [])

  const restorePrototypePolling = useCallback((patentId, taskId) => {
    prototypeIntervalsRef.current[patentId] = setInterval(async () => {
      try {
        const result = await referenceService.getPrototypeResult(taskId, patentId)

        if (result.status === TASK_STATUS.SUCCESS) {
          clearInterval(prototypeIntervalsRef.current[patentId])
          delete prototypeIntervalsRef.current[patentId]

          setPrototypeTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: TASK_STATUS.SUCCESS,
              data: result.data,
              error: null
            }
          }))
        } else if (result.status === TASK_STATUS.FAILED || result.status === TASK_STATUS.CANCELLED) {
          clearInterval(prototypeIntervalsRef.current[patentId])
          delete prototypeIntervalsRef.current[patentId]

          setPrototypeTasks(prev => ({
            ...prev,
            [patentId]: {
              taskId,
              status: result.status,
              data: null,
              error: result.message
            }
          }))
        }
      } catch (error) {
        clearInterval(prototypeIntervalsRef.current[patentId])
        delete prototypeIntervalsRef.current[patentId]

        setPrototypeTasks(prev => ({
          ...prev,
          [patentId]: {
            taskId,
            status: TASK_STATUS.FAILED,
            data: null,
            error: error.message
          }
        }))
      }
    }, 2000)
  }, [])

  const startAnalogTask = useCallback(async (patentId) => {
    console.log('🔵 [Context] startAnalogTask: ПЕРЕД вызовом', { 
    patentId, 
    currentStatus: analogTasks[patentId]?.status 
    })
    console.log('🔵 [Context] startAnalogTask: ЗАПУСК', { patentId, time: new Date().toISOString() })
    
    try {
      console.log('🔵 [Context] Вызываем referenceService.createAnalogLink...')
      const createStart = Date.now()
      const createResponse = await referenceService.createAnalogLink(patentId)
      const createEnd = Date.now()
      console.log('🔵 [Context] createAnalogLink вернул:', createResponse, 'за', (createEnd - createStart), 'мс')
      
      const taskId = createResponse.task_id
      console.log('🔵 [Context] Устанавливаем статус RUNNING для taskId:', taskId)

      setAnalogTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId,
          status: TASK_STATUS.RUNNING,
          data: null,
          error: null
        }
      }))

      if (analogIntervalsRef.current[patentId]) {
        console.log('🔵 [Context] Очищаем старый интервал поллинга')
        clearInterval(analogIntervalsRef.current[patentId])
      }

      console.log('🔵 [Context] Запускаем restoreAnalogPolling')
      restoreAnalogPolling(patentId, taskId)

      return taskId
    } catch (error) {
      console.error('🔵 [Context] ОШИБКА startAnalogTask:', error)
      setAnalogTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId: null,
          status: TASK_STATUS.FAILED,
          data: null,
          error: error.message
        }
      }))
      throw error
    }
  }, [restoreAnalogPolling])

  const startCompareTask = useCallback(async (patentId) => {
    try {
      const createResponse = await referenceService.createAnalogCompare(patentId)
      const taskId = createResponse.task_id

      setCompareTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId,
          status: TASK_STATUS.RUNNING,
          data: null,
          error: null
        }
      }))

      if (compareIntervalsRef.current[patentId]) {
        clearInterval(compareIntervalsRef.current[patentId])
      }

      restoreComparePolling(patentId, taskId)

      return taskId
    } catch (error) {
      setCompareTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId: null,
          status: TASK_STATUS.FAILED,
          data: null,
          error: error.message
        }
      }))
      throw error
    }
  }, [restoreComparePolling])

  const startPrototypeTask = useCallback(async (patentId) => {
    try {
      const createResponse = await referenceService.createPrototypeTask(patentId)
      const taskId = createResponse.task_id

      setPrototypeTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId,
          status: TASK_STATUS.RUNNING,
          data: null,
          error: null
        }
      }))

      if (prototypeIntervalsRef.current[patentId]) {
        clearInterval(prototypeIntervalsRef.current[patentId])
      }

      restorePrototypePolling(patentId, taskId)

      return taskId
    } catch (error) {
      setPrototypeTasks(prev => ({
        ...prev,
        [patentId]: {
          taskId: null,
          status: TASK_STATUS.FAILED,
          data: null,
          error: error.message
        }
      }))
      throw error
    }
  }, [restorePrototypePolling])

  const getAnalogTask = useCallback((patentId) => {
    return analogTasks[patentId]
  }, [analogTasks])

  const getCompareTask = useCallback((patentId) => {
    return compareTasks[patentId]
  }, [compareTasks])

  const getPrototypeTask = useCallback((patentId) => {
    return prototypeTasks[patentId]
  }, [prototypeTasks])

  const clearAnalogTask = useCallback((patentId) => {
    if (analogIntervalsRef.current[patentId]) {
      clearInterval(analogIntervalsRef.current[patentId])
      delete analogIntervalsRef.current[patentId]
    }
    setAnalogTasks(prev => {
      const newTasks = { ...prev }
      delete newTasks[patentId]
      return newTasks
    })
  }, [])

  const clearCompareTask = useCallback((patentId) => {
    if (compareIntervalsRef.current[patentId]) {
      clearInterval(compareIntervalsRef.current[patentId])
      delete compareIntervalsRef.current[patentId]
    }
    setCompareTasks(prev => {
      const newTasks = { ...prev }
      delete newTasks[patentId]
      return newTasks
    })
  }, [])

  const clearPrototypeTask = useCallback((patentId) => {
    if (prototypeIntervalsRef.current[patentId]) {
      clearInterval(prototypeIntervalsRef.current[patentId])
      delete prototypeIntervalsRef.current[patentId]
    }
    setPrototypeTasks(prev => {
      const newTasks = { ...prev }
      delete newTasks[patentId]
      return newTasks
    })
  }, [])

  const clearTaskForPatent = useCallback((patentId) => {
    clearAnalogTask(patentId)
    clearCompareTask(patentId)
    clearPrototypeTask(patentId)
  }, [clearAnalogTask, clearCompareTask, clearPrototypeTask])

  const updateAnalogTask = useCallback((patentId, updates) => {
    setAnalogTasks(prev => ({
      ...prev,
      [patentId]: {
        ...prev[patentId],
        ...updates
      }
    }))
  }, [])

  const updateCompareTask = useCallback((patentId, updates) => {
    setCompareTasks(prev => ({
      ...prev,
      [patentId]: {
        ...prev[patentId],
        ...updates
      }
    }))
  }, [])

  const updatePrototypeTask = useCallback((patentId, updates) => {
    setPrototypeTasks(prev => ({
      ...prev,
      [patentId]: {
        ...prev[patentId],
        ...updates
      }
    }))
  }, [])

  return (
    <ReferenceContext.Provider value={{ 
      startTask: startAnalogTask,
      getTask: getAnalogTask, 
      clearTask: clearAnalogTask,
      updateTask: updateAnalogTask,
      startCompareTask,
      getCompareTask,
      clearCompareTask,
      updateCompareTask,
      startPrototypeTask,
      getPrototypeTask,
      clearPrototypeTask,
      updatePrototypeTask,
      clearTaskForPatent,  
      analogTasks,
      compareTasks,
      prototypeTasks
    }}>
      {children}
    </ReferenceContext.Provider>
  )
}

export function useReference() {
  const context = useContext(ReferenceContext)
  if (!context) {
    throw new Error('useAnalogTask must be used within AnalogTaskProvider')
  }
  return context
}
