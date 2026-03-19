import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import { API_REFERENCE_ENDPOINTS } from '../../../services/apiConfig'
import * as XLSX from 'xlsx'
import styles from '../styles/AnaloguesPatentComparison.module.css'
import authService from "../../../services/auth/authService.js";
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'

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

  useEffect(() => {
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
          API_REFERENCE_ENDPOINTS.PATENT_GET_STATISTICS(id),
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
  }, [id, task?.data, localDataLoaded, updateCompareTask, showSuccess])

  useEffect(() => {
    if (task?.status !== prevStatus) {
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
      setIsSubmitting(false)
    }
  }, [task?.status])

  const handleCompare = async () => {
    if (!isAnalogCompleted) {
      showWarning('Сначала выполните поиск аналогов')
      return
    }

    if (isCompleted) {
      setConfirmModalVisible(true)
      return
    }

    setIsSubmitting(true)
    
    try {
      await startCompareTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи сопоставления')
        setIsSubmitting(false)
    }
  }

  const confirmRestart = async () => {
    setConfirmModalVisible(false)
    try {
      await startCompareTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи сопоставления')
    }
  }

  const cancelRestart = () => {
    setConfirmModalVisible(false)
  }

  const handleDownload = () => {
    if (!isCompleted) {
      showWarning('Сначала выполните сопоставление патента с аналогами')
      return
    }

    try {
      // 🔹 РАСПАКОВКА: если данные в обёртке { "2": {...} }
      const dataToDownload = comparisonData[id] || comparisonData
      console.log('📦 Скачиваем данные:', dataToDownload)
      
      downloadExcel(dataToDownload, id)
      showSuccess('Таблица сопоставления успешно скачана')
    } catch (err) {
      console.error('❌ Ошибка скачивания:', err)
      showError('Ошибка при скачивании таблицы сопоставления')
    }
  }

  const renderComparisonTable = () => {
      if (!comparisonData) {
        console.log('📊 Нет данных для отображения');
        return null;
      }
      const patentData = comparisonData[id] || comparisonData;

      console.log('📊 patentData:', patentData);

      if (!patentData) {
        console.error('❌ Нет данных для патента', id);
        return <div className={styles.error}>Нет данных для отображения</div>;
      }

      if (!patentData) {
        console.error('❌ Нет данных для патента', id);
        return <div className={styles.error}>Нет данных для отображения</div>;
      }

      const { features, analogs, comparison, frequency, user_patent, user_comparison, analog_counts } = patentData;

      console.log('📊 analogs:', analogs);
      console.log('📊 features:', features);
      console.log('📊 features length:', features?.length);
      console.log('📊 analogs length:', analogs?.length);

      if (!features) {
        console.error('❌ features отсутствует');
        return <div className={styles.error}>Ошибка данных: признаки отсутствуют</div>;
      }

      if (!analogs) {
        console.error('❌ analogs отсутствует');
        return <div className={styles.error}>Ошибка данных: аналоги отсутствуют</div>;
      }
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

        {isLoading && <SkeletonTable />}

        {comparisonData && !isLoading && renderComparisonTable()}
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
