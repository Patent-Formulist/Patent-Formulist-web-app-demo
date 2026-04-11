import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import { API_PROCESSOR_ENDPOINTS } from '../../../services/apiConfig'
import * as XLSX from 'xlsx'
import styles from '../styles/AnaloguesPatentComparison.module.css'
import authService from "../../../services/auth/authService.js";
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'

// 🔹 НАСТРОЙКИ ОТЛАДКИ
const DEBUG = true; // ← Переключатель: true = логи включены, false = выключены
const MODULE = 'Comparison'; // ← Метка модуля для логов

// 🔹 Хелперы для логов
const log = (label, data) => {
  if (!DEBUG) return;
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] [${MODULE}] ${label}`, data !== undefined ? data : '');
};

const logGroup = (label, callback) => {
  if (!DEBUG) return callback();
  const time = new Date().toLocaleTimeString();
  console.group(`[${time}] [${MODULE}] ${label}`);
  const result = callback();
  console.groupEnd();
  return result;
};

const logTable = (label, data) => {
  if (!DEBUG || !data) return;
  console.log(`[${new Date().toLocaleTimeString()}] [${MODULE}] ${label}`);
  console.table(data);
};

const TABLE_HEADERS = {
  mainRow: {
    features: 'Признаки',
    analogs: 'Аналоги',
    frequency: 'Частота встречаемости',
    userComparison: 'Сравнение с пользовательским'
  },
  subRow: {
    userPatent: 'Ваш патент'
  }
}

const downloadExcel = (data, patentId) => {
  if (!data?.features || !data?.analogs) {
    throw new Error('Неверный формат данных для скачивания')
  }
  const { features, analogs, comparison, frequency, user_patent, user_comparison, analog_counts } = data

  const headerRow1 = [
    TABLE_HEADERS.mainRow.features,
    ...Array(analogs.length).fill(TABLE_HEADERS.mainRow.analogs),
    TABLE_HEADERS.mainRow.frequency,
    TABLE_HEADERS.mainRow.userComparison,
    ...Array(analogs.length).fill(TABLE_HEADERS.mainRow.userComparison)
  ]

  const headerRow2 = [
    '',
    ...analogs,
    '',
    TABLE_HEADERS.subRow.userPatent,
    ...analogs
  ]
  
  const rows = features.map((feature, idx) => [
    feature,
    ...comparison[idx],
    frequency[idx],
    user_patent[idx],
    ...user_comparison[idx]
  ])

  rows.push(['Итого', ...Array(analogs.length).fill(''), '', '', ...analog_counts])

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...rows])
  
  const colWidths = [
    { wch: 60 },
    ...analogs.map(() => ({ wch: 15 })),
    { wch: 25 },
    { wch: 20 },
    ...analogs.map(() => ({ wch: 15 }))
  ]
  
  worksheet['!cols'] = colWidths

  const merges = []
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } })
  merges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: analogs.length } })
  const frequencyCol = analogs.length + 1
  merges.push({ s: { r: 0, c: frequencyCol }, e: { r: 1, c: frequencyCol } })
  const userStartCol = frequencyCol + 1
  const userEndCol = userStartCol + analogs.length
  merges.push({ s: { r: 0, c: userStartCol }, e: { r: 0, c: userEndCol } })

  worksheet['!merges'] = merges

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Сопоставление')

  const fileName = `comparison_${patentId}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

export default function AnaloguesPatentComparison() {
  const { id } = useParams()
  const { startCompareTask, getCompareTask, getTask, updateCompareTask } = useReference()
  const { showWarning, showSuccess, showError } = useToast()

  const [localDataLoaded, setLocalDataLoaded] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [prevStatus, setPrevStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const analogTask = getTask(id)
  const task = getCompareTask(id)
  const loading = task?.status === TASK_STATUS.RUNNING
  const error = task?.error
  const comparisonData = task?.data
  const isCompleted = task?.status === TASK_STATUS.SUCCESS && comparisonData
  const isAnalogCompleted = analogTask?.status === TASK_STATUS.SUCCESS
  const isLoading = isSubmitting || task?.status === TASK_STATUS.RUNNING

  // 🔹 Лог монтирования
  useEffect(() => {
    logGroup('🚨 МОНТИРОВАНИЕ', () => {
      log('ID', id)
      log('Статус задачи', task?.status)
      log('Есть данные', !!comparisonData)
      log('Ключи данных', comparisonData ? Object.keys(comparisonData).slice(0, 5) : null)
      log('localStorage', {
        key: `analogs_statistics_${id}`,
        has: !!localStorage.getItem(`analogs_statistics_${id}`)
      })
      log('Аналоги завершены', isAnalogCompleted)
    })
  }, [])

  // 🔹 Лог рендера (с группировкой)
  useEffect(() => {
    if (!DEBUG) return;
    console.groupCollapsed(`🔍 РЕНДЕР [${new Date().toLocaleTimeString()}]`)
    console.table({
      id,
      isLoading,
      isCompleted: !!isCompleted,
      taskStatus: task?.status,
      hasData: !!comparisonData,
      isSubmitting,
      isAnalogCompleted,
      dataKeys: comparisonData ? Object.keys(comparisonData).slice(0, 3) : null
    })
    console.groupEnd()
  }, [isLoading, isCompleted, task?.status, comparisonData, isSubmitting, isAnalogCompleted, id])

  /*useEffect(() => {
    const fetchData = async () => {
      // Если данные уже загружены из localStorage, пропускаем
      if (localDataLoaded) return;

      const savedData = localStorage.getItem(`analogs_statistics_${id}`)
      if (savedData && !task?.data) {
        try {
          const data = JSON.parse(savedData)
          // Данные могут быть обёрнуты в поле analogs или быть сразу объектом
          const comparisonData = data.analogs || data

          if (updateCompareTask) {
            updateCompareTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: comparisonData,
              error: null
            });
            setLocalDataLoaded(true);
            showSuccess('Данные сопоставления загружены из кэша');
          }
        } catch (e) {
          console.error('Ошибка парсинга данных из localStorage:', e)
        }
        return
      }

      // Если в localStorage нет — запрашиваем с сервера
      try {
        console.log('🌐 Запрашиваем данные сопоставления с сервера')
        const response = await authService.authenticatedFetch(
          API_PROCESSOR_ENDPOINTS.GET_STATISTICS(id),
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          const comparisonData = data.analogs || data

          // Сохраняем в localStorage для будущих загрузок
          localStorage.setItem(`analogs_statistics_${id}`, JSON.stringify(comparisonData))

          if (updateCompareTask) {
            updateCompareTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: comparisonData,
              error: null
            });
            setLocalDataLoaded(true);
            showSuccess('Данные сопоставления загружены с сервера');
          }
        } else {
          console.log('❌ Ответ сервера не OK');
        }
      } catch (err) {
        console.log('❌ Ошибка запроса к серверу:', err)
      }
    }

    fetchData()
  }, [id, task?.data, localDataLoaded, updateCompareTask, showSuccess])*/

  useEffect(() => {
    if (task?.status !== prevStatus) {
      logGroup('🔵 Статус изменился', () => {
        log('Старый статус', prevStatus)
        log('Новый статус', task?.status)
        log('Время', new Date().toISOString())
      })
      if (task?.status === TASK_STATUS.SUCCESS) {
        showSuccess('Сопоставление патента с аналогами успешно выполнено')
      } else if (task?.status === TASK_STATUS.FAILED) {
        showError(task?.error || 'Ошибка сопоставления патента с аналогами')
      }
      setPrevStatus(task?.status)
    }
  }, [task?.status, task?.error, prevStatus, showSuccess, showError])

  useEffect(() => {
    if (task?.status === TASK_STATUS.SUCCESS || task?.status === TASK_STATUS.FAILED) {
      log('🔵 Сбрасываем isSubmitting', { status: task?.status })
      setIsSubmitting(false)
    }
  }, [task?.status])

  const handleCompare = async () => {
    const clickTime = Date.now()
    
    logGroup('🔴 КЛИК: Сопоставить', () => {
      log('Время клика', new Date(clickTime).toISOString())
      log('Состояние', { isAnalogCompleted, isCompleted, isLoading })
    })
    
    if (!isAnalogCompleted) { 
      log('⚠️ БЛОКИРОВКА: аналоги не получены')
      showWarning('Сначала выполните поиск аналогов')
      return 
    }
    if (isCompleted) { 
      log('⚠️ Уже завершено - показываем модалку')
      setConfirmModalVisible(true)
      return 
    }

    log('⬇️ Устанавливаем isSubmitting = true')
    setIsSubmitting(true)
    
    try {
      log('🚀 Вызываем startCompareTask...')
      const startTime = Date.now()
      await startCompareTask(id)
      const endTime = Date.now()
      
      logGroup('✅ startCompareTask завершён', () => {
        log('Время выполнения', `${endTime - startTime} мс`)
        log('Новое состояние задачи', getCompareTask(id)?.status)
      })
    } catch (err) {
      log('❌ ОШИБКА startCompareTask', { message: err.message })
      showError(err.message || 'Ошибка запуска задачи сопоставления')
      setIsSubmitting(false)
    }
  }

  const confirmRestart = async () => {
    log('🔴 confirmRestart: перезапуск задачи')
    setConfirmModalVisible(false)
    try {
      await startCompareTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи сопоставления')
    }
  }

  const cancelRestart = () => {
    log('🔴 cancelRestart: отмена')
    setConfirmModalVisible(false)
  }

  const handleDownload = () => {
    log('🔴 handleDownload: попытка скачивания')
    if (!isCompleted) {
      showWarning('Сначала выполните сопоставление патента с аналогами')
      return
    }
    try {
      const dataToDownload = comparisonData[id] || comparisonData
      log('📦 Скачиваем данные', { keys: dataToDownload ? Object.keys(dataToDownload).slice(0, 3) : null })
      downloadExcel(dataToDownload, id)
      showSuccess('Таблица сопоставления успешно скачана')
    } catch (err) {
      log('❌ Ошибка скачивания', { message: err.message })
      showError('Ошибка при скачивании таблицы сопоставления')
    }
  }

  const renderComparisonTable = () => {
    return logGroup('🟡 Рендер таблицы', () => {
      if (!comparisonData) {
        log('⚠️ Нет данных (comparisonData = null/undefined)')
        return null
      }
      
      const patentData = comparisonData[id] || comparisonData;
      log('📊 patentData', patentData ? 'есть' : 'нет');

      if (!patentData) {
        log('❌ Нет данных для патента', id);
        return <div className={styles.error}>Нет данных для отображения</div>;
      }

      const { features, analogs, comparison, frequency, user_patent, user_comparison, analog_counts } = patentData;
      logTable('📊 Данные для таблицы', { 
        featuresCount: features?.length, 
        analogsCount: analogs?.length,
        hasComparison: !!comparison 
      });

      if (!features) {
        log('❌ features отсутствует');
        return <div className={styles.error}>Ошибка данных: признаки отсутствуют</div>;
      }
      if (!analogs) {
        log('❌ analogs отсутствует');
        return <div className={styles.error}>Ошибка данных: аналоги отсутствуют</div>;
      }
      
      log('✅ Рендерим таблицу', { features: features.length, analogs: analogs.length })
      
      return (
        <div className={styles.tableWrapper}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan="2" className={styles.featureHeader}>{TABLE_HEADERS.mainRow.features}</th>
                  <th colSpan={analogs.length} className={styles.sectionHeader}>{TABLE_HEADERS.mainRow.analogs}</th>
                  <th rowSpan="2">{TABLE_HEADERS.mainRow.frequency}</th>
                  <th colSpan={analogs.length + 1} className={styles.sectionHeader}>{TABLE_HEADERS.mainRow.userComparison}</th>
                </tr>
                <tr>
                  {analogs.map((analog, idx) => (
                    <th key={idx}>{analog}</th>
                  ))}
                  <th>{TABLE_HEADERS.subRow.userPatent}</th>
                  {analogs.map((analog, idx) => (
                    <th key={`user-${idx}`}>{analog}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, featureIdx) => (
                  <tr key={featureIdx}>
                    <td className={styles.featureCell}>{feature}</td>
                    {comparison[featureIdx].map((value, analogIdx) => (
                      <td key={analogIdx} className={styles.valueCell}>{value}</td>
                    ))}
                    <td className={styles.frequencyCell}>{frequency[featureIdx]}</td>
                    <td className={styles.valueCell}>{user_patent[featureIdx]}</td>
                    {user_comparison[featureIdx].map((value, analogIdx) => (
                      <td key={`user-comp-${analogIdx}`} className={styles.valueCell}>{value}</td>
                    ))}
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td className={styles.totalLabel}>Итого</td>
                  {analogs.map((_, idx) => (
                    <td key={`empty-analog-${idx}`}></td>
                  ))}
                  <td></td>
                  <td></td>
                  {analog_counts.map((count, idx) => (
                    <td key={`user-total-${idx}`} className={styles.totalCell}>{count}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    })
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.actionButton} ${isLoading ? styles.loading : ''} ${isCompleted ? styles.completed : ''}`}
            onClick={handleCompare}
            disabled={isLoading}
          >
            Сопоставить патент с аналогами
          </button>
          <button 
            className={`${styles.actionButton} ${!isCompleted ? styles.inactive : ''}`}
            onClick={handleDownload}
          >
            Скачать таблицу сопоставления
          </button>
        </div>

        {isLoading && logGroup('🟢 ПОКАЗЫВАЕМ СКЕЛЕТОН', () => {
          log('Причина', 'isLoading = true')
          return <SkeletonTable />
        })}

        {isCompleted && !isLoading && comparisonData && logGroup('🟢 ПОКАЗЫВАЕМ ТАБЛИЦУ', () => {
          log('Причина', 'isCompleted = true && !isLoading')
          return renderComparisonTable()
        })}
      </div>

      {confirmModalVisible && createPortal(
        <div className={styles.modalOverlay} onClick={cancelRestart}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Повторное сопоставление?</h3>
            <p className={styles.modalText}>
              Вы уверены, что хотите выполнить повторное сопоставление патента с аналогами?
            </p>
            <p className={styles.modalWarning}>
              Данные следующих шагов (Прототип) станут неактуальными и их нужно будет обновить.
            </p>
            <div className={styles.modalButtons}>
              <button 
                className={styles.modalCancelButton} 
                onClick={cancelRestart}
                type="button"
              >
                Отмена
              </button>
              <button 
                className={styles.modalConfirmButton} 
                onClick={confirmRestart}
                type="button"
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}