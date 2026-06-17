import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import patentService from '../../services/patent/patentService'
import { useReference } from '../../contexts/ReferenceContext'
import { useToast } from '../../contexts/ToastContext'
import { TASK_STATUS } from '../../services/reference/referenceService'
import styles from './styles/ReferenceLayout.module.css'

export default function PatentAnalogLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showWarning } = useToast()
  const { getTask, getCompareTask, getPrototypeTask, getSchemeTask, getApplicationTask} = useReference()
  
  const [patent, setPatent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const analogTask = getTask(id)
  const compareTask = getCompareTask(id)
  const prototypeTask = getPrototypeTask(id)
  const schemeTask = getSchemeTask(id)
  const applicationTask = getApplicationTask(id)
  
  const isAnalogsCompleted = analogTask?.status === TASK_STATUS.SUCCESS && analogTask?.data
  const isCompareCompleted = compareTask?.status === TASK_STATUS.SUCCESS && compareTask?.data
  const isPrototypeCompleted = prototypeTask?.status === TASK_STATUS.SUCCESS && prototypeTask?.data
  const isSchemesCompleted = schemeTask?.status === TASK_STATUS.SUCCESS && schemeTask?.data
  const isApplicationCompleted = applicationTask?.status === TASK_STATUS.SUCCESS && applicationTask?.data
  
  const isAnalogsRunning = analogTask?.status === TASK_STATUS.RUNNING
  const isCompareRunning = compareTask?.status === TASK_STATUS.RUNNING
  const isPrototypeRunning = prototypeTask?.status === TASK_STATUS.RUNNING

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const data = await patentService.getPatent(id)
        if (isMounted) {
          setPatent(data)
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message || 'Ошибка загрузки патента')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [id])

  const isActive = (path) => {
    return location.pathname === `/workspace/patents/${id}${path}`
  }

  const isAnySideTaskRunning = isAnalogsRunning || isCompareRunning || isPrototypeRunning

  const handleNavigate = (path) => {
    if (isAnalogsRunning) {
      showWarning('Дождитесь завершения поиска аналогов')
      return
    }

    if (path === '/analogs' && isAnalogsRunning) {
      showWarning('Поиск аналогов уже выполняется')
      return
    }

    if (path === '/attributes' && !isAnalogsCompleted) {
      showWarning('Сначала выполните поиск аналогов')
      return
    }

    if (path === '/prototype' && !isCompareCompleted) {
      showWarning('Сначала выполните сопоставление с аналогами')
      return
    }

    if (path === '/schemes' && !isPrototypeCompleted) {
      showWarning('Сначала выполните выявление прототипа')
      return
    }

    if (path === '/application' && !isPrototypeCompleted) {
      showWarning('Сначала завершите составление схем')
      return
    }

    navigate(`/workspace/patents/${id}${path}`)
  }

  if (loading) {
    return <div className={styles.container}>Загрузка...</div>
  }

  if (error) {
    return <div className={styles.container}>{error}</div>
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{patent?.name}</h2>
      <div className={styles.buttonContainer}>
        {/* Поиск аналогов */}
        <button 
          className={`${styles.actionButton} ${isActive('/analogs') ? styles.activeButton : ''} ${isAnalogsRunning ? styles.loading : ''} ${isAnalogsCompleted ? styles.completed : ''}`}
          onClick={() => handleNavigate('/analogs')}
          disabled={isAnalogsRunning}
        >
          Поиск аналогов
        </button>
        
        {/* Сопоставление с аналогами */}
        <button 
          className={`${styles.actionButton} ${isActive('/attributes') ? styles.activeButton : ''} ${(!isAnalogsCompleted || isAnalogsRunning) ? styles.inactiveButton : ''} ${isCompareRunning ? styles.loading : ''} ${isCompareCompleted ? styles.completed : ''}`}
          onClick={() => handleNavigate('/attributes')}
          disabled={!isAnalogsCompleted || isAnalogsRunning || isCompareRunning}
        >
          Сопоставление с аналогами
        </button>
        
        {/* Выявление прототипа */}
        <button 
          className={`${styles.actionButton} ${isActive('/prototype') ? styles.activeButton : ''} ${(!isCompareCompleted || isAnalogsRunning || isCompareRunning) ? styles.inactiveButton : ''} ${isPrototypeRunning ? styles.loading : ''} ${isPrototypeCompleted ? styles.completed : ''}`}
          onClick={() => handleNavigate('/prototype')}
          disabled={!isCompareCompleted || isAnalogsRunning || isCompareRunning || isPrototypeRunning}
        >
          Выявление прототипа
        </button>

        {/* Составление схем */}
        <button
          className={`${styles.actionButton} ${isActive('/schemes') ? styles.activeButton : ''} ${(!isPrototypeCompleted || isAnySideTaskRunning) ? styles.inactiveButton : ''} ${isSchemesCompleted ? styles.completed : ''}`}
          onClick={() => handleNavigate('/schemes')}
          disabled={!isPrototypeCompleted || isAnySideTaskRunning}
        >
          Составление схем
        </button>

        {/* Подготовка заявки */}
        <button
          className={`${styles.actionButton} ${isActive('/application') ? styles.activeButton : ''} ${(!isPrototypeCompleted || isAnySideTaskRunning) ? styles.inactiveButton : ''} ${isApplicationCompleted ? styles.completed : ''}`}
          onClick={() => handleNavigate('/application')}
          disabled={!isPrototypeCompleted || isAnySideTaskRunning}
        >
          Подготовка заявки
        </button>
      </div>
      <Outlet />
    </div>
  )
}
