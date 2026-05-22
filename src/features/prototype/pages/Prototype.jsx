import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import { API_PROCESSOR_ENDPOINTS } from '../../../services/apiConfig'
import * as XLSX from 'xlsx'
import styles from '../styles/Prototype.module.css'
import authService from "../../../services/auth/authService.js";
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'

// 🔹 НАСТРОЙКИ ОТЛАДКИ
const DEBUG = true; // ← Переключатель: true = логи включены, false = выключены
const MODULE = 'Prototype'; // ← Метка модуля для логов

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


const downloadFeaturesExcel = (prototypeFeatures, patentFeatures, fileName) => {
  const headers = ['', 'Признаки патента', 'Признаки прототипа']
  const rows = []

  // Разделяем на секции
  const midpoint = Math.ceil(prototypeFeatures.length / 2)
  const limitingFeatures = prototypeFeatures.slice(0, midpoint)
  const distinguishingFeatures = prototypeFeatures.slice(midpoint)
  const limitingPatentFeatures = patentFeatures.slice(0, midpoint)
  const distinguishingPatentFeatures = patentFeatures.slice(midpoint)

  rows.push(['Ограничительные признаки', '', ''])

  // Ограничительные признаки
  limitingFeatures.forEach((feature, idx) => {
    rows.push([
      `${idx + 1}. ${feature}`,
      limitingPatentFeatures[idx] || '-',
      feature
    ])
  })

  rows.push(['Отличительные признаки', '', ''])

  const maxDistinguishingLength = Math.max(distinguishingFeatures.length, distinguishingPatentFeatures.length)

  // Отличительные признаки
  for (let idx = 0; idx < maxDistinguishingLength; idx++) {
    rows.push([
      `${midpoint + idx + 1}. ${distinguishingFeatures[idx] || '—'}`,
      distinguishingPatentFeatures[idx] || '—',
      distinguishingFeatures[idx] || '—'
    ])
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet['!cols'] = [
    { wch: 70 },
    { wch: 60 },
    { wch: 60 }
  ]

  // Объединяем ячейки для заголовков секций
  const merges = []
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }) // Ограничительные
  merges.push({ s: { r: 1 + limitingFeatures.length + 1, c: 0 }, e: { r: 1 + limitingFeatures.length + 1, c: 2 } }) // Отличительные

  worksheet['!merges'] = merges

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Признаки')
  XLSX.writeFile(workbook, fileName)
}

const downloadPrototypeOnlyExcel = (prototypeFeatures, fileName) => {
  const headers = ['Номер', 'Признаки прототипа']
  const rows = prototypeFeatures.map((feature, idx) => [idx + 1, feature])

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet['!cols'] = [{ wch: 10 }, { wch: 60 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Признаки прототипа')
  XLSX.writeFile(workbook, fileName)
}

const downloadPatentOnlyExcel = (patentFeatures, fileName) => {
  const headers = ['Номер', 'Признаки патента']
  const rows = patentFeatures.map((feature, idx) => [idx + 1, feature])

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet['!cols'] = [{ wch: 10 }, { wch: 60 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Признаки патента')
  XLSX.writeFile(workbook, fileName)
}

export default function Prototype() {
  const { id } = useParams()
  const { startPrototypeTask, getPrototypeTask, getCompareTask, updatePrototypeTask } = useReference()
  const { showWarning, showSuccess, showError } = useToast()

  const [localDataLoaded, setLocalDataLoaded] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [viewMode, setViewMode] = useState('main')
  const [prevStatus, setPrevStatus] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

  const compareTask = getCompareTask(id)
  const prototypeTask = getPrototypeTask(id)

  console.log('🔍 [Prototype] id =', id);
  console.log('🔍 [Prototype] prototypeTask =', prototypeTask);
  console.log('🔍 [Prototype] prototypeTask?.data =', prototypeTask?.data);
  console.log('🔍 [Prototype] localStorage raw =', localStorage.getItem(`analogs_identity_${id}`));
  if (prototypeTask?.data) {
    console.log('🔍 [Prototype] has prototype?', !!prototypeTask.data.prototype);
    console.log('🔍 [Prototype] has prototype_features?', !!prototypeTask.data.prototype_features);
    console.log('🔍 [Prototype] has patent_features?', !!prototypeTask.data.patent_features);
  }
  
  const isCompareCompleted = compareTask?.status === TASK_STATUS.SUCCESS && compareTask?.data
  const loading = prototypeTask?.status === TASK_STATUS.RUNNING
  const error = prototypeTask?.error
  const prototypeData = prototypeTask?.data
  const prototypeNumber = prototypeData?.prototype?.number || '—'
  const isCompleted = prototypeTask?.status === TASK_STATUS.SUCCESS && prototypeData
  const isLoading = isSubmitting || prototypeTask?.status === TASK_STATUS.RUNNING

  // 🔹 Лог рендера (с группировкой)
  useEffect(() => {
    if (!DEBUG) return;
    console.groupCollapsed(`🔍 РЕНДЕР [${new Date().toLocaleTimeString()}]`)
    console.table({
      id,
      isLoading,
      isCompleted: !!isCompleted,
      taskStatus: prototypeTask?.status,
      hasData: !!prototypeData,
      isSubmitting,
      isCompareCompleted,
      dataKeys: prototypeData ? Object.keys(prototypeData).slice(0, 3) : null
    })
    console.groupEnd()
  }, [isLoading, isCompleted, prototypeTask?.status, prototypeData, isSubmitting, isCompareCompleted, id])

  useEffect(() => {
    const fetchData = async () => {
      // Если данные уже загружены из localStorage, пропускаем
      if (localDataLoaded) return;

      const savedData = localStorage.getItem(`prototype_${id}`)
      if (savedData && !prototypeTask?.data) {
        try {
          const data = JSON.parse(savedData)
          // Данные могут быть обёрнуты в поле analogs или быть сразу объектом
          const prototypeData = data.analogs || data

          if (updatePrototypeTask) {
            updatePrototypeTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: prototypeData,
              error: null
            });
            setLocalDataLoaded(true);
            showSuccess('Данные прототипа загружены из кэша');
          }
        } catch (e) {
          console.error('Ошибка парсинга данных из localStorage:', e)
        }
        return
      }

      // Если в localStorage нет — запрашиваем с сервера
      try {
        console.log('🌐 Запрашиваем данные прототипа с сервера')
        const response = await authService.authenticatedFetch(
          API_PROCESSOR_ENDPOINTS.GET_IDENTITY(id),
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
          const prototypeData = data[id] || data.analogs || data

          // Сохраняем в localStorage для будущих загрузок
          localStorage.setItem(`prototype_${id}`, JSON.stringify(prototypeData))

          if (updatePrototypeTask) {
            updatePrototypeTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: prototypeData,
              error: null
            });
            setLocalDataLoaded(true);
            showSuccess('Данные прототипа загружены с сервера');
          }
        } else {
          console.log('❌ Ответ сервера не OK');
        }
      } catch (err) {
        console.log('❌ Ошибка запроса к серверу:', err)
      }
    }

    fetchData()
  }, [id, prototypeTask?.data, localDataLoaded, updatePrototypeTask, showSuccess])

  useEffect(() => {
    if (prototypeTask?.status !== prevStatus) {
      logGroup('🔵 Статус изменился', () => {
        log('Старый статус', prevStatus)
        log('Новый статус', prototypeTask?.status)
        log('Время', new Date().toISOString())
      })
      if (prototypeTask?.status === TASK_STATUS.SUCCESS) {
        showSuccess('Характеристики прототипа успешно получены')
      } else if (prototypeTask?.status === TASK_STATUS.FAILED) {
        showError(prototypeTask?.error || 'Ошибка получения характеристик прототипа')
      }
      setPrevStatus(prototypeTask?.status)
    }
  }, [prototypeTask?.status, prototypeTask?.error, prevStatus, showSuccess, showError])

  useEffect(() => {
    if (prototypeTask?.status === TASK_STATUS.SUCCESS || prototypeTask?.status === TASK_STATUS.FAILED) {
      log('🔵 Сбрасываем isSubmitting', { status: prototypeTask?.status })
      setIsSubmitting(false)
    }
  }, [prototypeTask?.status])

  const handleGetPrototype = async () => {
    const clickTime = Date.now()
    
    logGroup('🔴 КЛИК: Получить прототип', () => {
      log('Время клика', new Date(clickTime).toISOString())
      log('Состояние', { isCompareCompleted, isCompleted, isLoading })
    })
    
    if (!isCompareCompleted) {
      log('⚠️ БЛОКИРОВКА: сопоставление не завершено')
      showWarning('Сначала выполните сопоставление патента с аналогами')
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
      log('🚀 Вызываем startPrototypeTask...')
      const startTime = Date.now()
      await startPrototypeTask(id)
      const endTime = Date.now()
      
      logGroup('✅ startPrototypeTask завершён', () => {
        log('Время выполнения', `${endTime - startTime} мс`)
        log('Новое состояние задачи', getPrototypeTask(id)?.status)
      })
    } catch (err) {
      log('❌ ОШИБКА startPrototypeTask', { message: err.message })
      showError(err.message || 'Ошибка запуска задачи получения прототипа')
      setIsSubmitting(false)
    }
  }

  const confirmRestart = async () => {
    log('🔴 confirmRestart: перезапуск задачи')
    setConfirmModalVisible(false)
    try {
      await startPrototypeTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи получения прототипа')
    }
  }

  const cancelRestart = () => {
    log('🔴 cancelRestart: отмена')
    setConfirmModalVisible(false)
  }

  const handleDownloadPrototype = () => {
    log('🔴 handleDownloadPrototype: попытка скачивания')
    if (!isCompleted || !prototypeData?.rows || prototypeData.rows.length === 0) {
      showWarning('Сначала получите характеристики прототипа')
      return
    }
    try {
      const prototypeFeatures = prototypeData.rows.map(r => r.feature || '')
      const patentFeatures = prototypeData.rows.map(r => r.patent_feature || '')
      log('📦 Скачиваем таблицу сравнения', { featuresCount: prototypeFeatures.length })
      downloadFeaturesExcel(prototypeFeatures, patentFeatures, `prototype_comparison_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showSuccess('Таблица сравнения признаков успешно скачана')
    } catch (err) {
      log('❌ Ошибка скачивания', { message: err.message })
      showError('Ошибка при скачивании таблицы сравнения')
    }
  }

  const handleGetFeatures = () => {
    log('🔴 handleGetFeatures: переход в меню признаков')
    if (!prototypeData?.rows || prototypeData.rows.length === 0) {
      showWarning('Сначала получите характеристики прототипа')
      return
    }
    setViewMode('features-menu')
  }

  const handleBackToMain = () => {
    log('🔴 handleBackToMain: возврат на главную')
    setViewMode('main')
  }

  const handleBackToFeaturesMenu = () => {
    log('🔴 handleBackToFeaturesMenu: возврат в меню признаков')
    setViewMode('features-menu')
  }

  const handleShowAllFeatures = () => {
    log('🔴 handleShowAllFeatures: показать все признаки')
    setViewMode('features-all')
  }

  const handleShowPrototypeFeatures = () => {
    log('🔴 handleShowPrototypeFeatures: показать признаки прототипа')
    setViewMode('features-prototype')
  }

  const handleShowPatentFeatures = () => {
    log('🔴 handleShowPatentFeatures: показать признаки патента')
    setViewMode('features-patent')
  }

  const handleDownloadAllFeatures = () => {
    log('🔴 handleDownloadAllFeatures: скачивание всех признаков')
    if (!prototypeData?.rows || prototypeData.rows.length === 0) {
      showWarning('Данные признаков недоступны')
      return
    }
    try {
      const prototypeFeatures = prototypeData.rows.map(r => r.feature || '')
      const patentFeatures = prototypeData.rows.map(r => r.patent_feature || '')
      downloadFeaturesExcel(prototypeFeatures, patentFeatures, `features_all_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showSuccess('Признаки патента и прототипа успешно скачаны')
    } catch (err) {
      log('❌ Ошибка скачивания', { message: err.message })
      showError('Ошибка при скачивании признаков')
    }
  }

  const handleDownloadPrototypeFeatures = () => {
    log('🔴 handleDownloadPrototypeFeatures: скачивание признаков прототипа')
    if (!prototypeData?.rows || prototypeData.rows.length === 0) {
      showWarning('Данные признаков прототипа недоступны')
      return
    }
    try {
      const prototypeFeatures = prototypeData.rows.map(r => r.feature || '').filter(f => f !== '')
      downloadPrototypeOnlyExcel(prototypeFeatures, `features_prototype_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showSuccess('Признаки прототипа успешно скачаны')
    } catch (err) {
      log('❌ Ошибка скачивания', { message: err.message })
      showError('Ошибка при скачивании признаков прототипа')
    }
  }

  const handleDownloadPatentFeatures = () => {
    log('🔴 handleDownloadPatentFeatures: скачивание признаков патента')
    if (!prototypeData?.rows || prototypeData.rows.length === 0) {
      showWarning('Данные признаков патента недоступны')
      return
    }
    try {
      const patentFeatures = prototypeData.rows.map(r => r.patent_feature || '').filter(f => f !== '')
      downloadPatentOnlyExcel(patentFeatures, `features_patent_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showSuccess('Признаки патента успешно скачаны')
    } catch (err) {
      log('❌ Ошибка скачивания', { message: err.message })
      showError('Ошибка при скачивании признаков патента')
    }
  }

  const renderFeaturesComparisonTable = () => {
    return logGroup('🟡 Рендер таблицы сравнения', () => {
      if (!prototypeData?.rows || prototypeData.rows.length === 0) {
        log('⚠️ Нет данных для таблицы (rows пустой)')
        return null
      }

      const { rows } = prototypeData
      const limitingRows = rows.filter(r => r.section === 'limiting')
      const distinguishingRows = rows.filter(r => r.section === 'distinguishing')
      
      log('✅ Рендерим таблицу', { 
        totalRows: rows.length, 
        limiting: limitingRows.length, 
        distinguishing: distinguishingRows.length 
      })

      return (
        <div className={styles.tableWrapper}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.featureHeader}>Признак</th>
                  <th className={styles.featureHeader}>Признак патента</th>
                  <th className={styles.featureHeader}>Признак прототипа {prototypeNumber}</th>
                </tr>
              </thead>
              <tbody>
                {limitingRows.length > 0 && (
                  <>
                    <tr className={styles.sectionRow}>
                      <td colSpan="3" className={styles.sectionTitle}>
                        Ограничительные признаки
                      </td>
                    </tr>
                    {limitingRows.map((row) => (
                      <tr key={`limiting-${row.row_number}`}>
                        <td className={styles.featureCell}>
                          <span className={styles.featureNumber}>{row.row_number}.</span>
                          {row.feature}
                        </td>
                        <td className={styles.featureCell}>
                          {row.patent_feature || '—'}
                        </td>
                        <td className={styles.featureCell}>
                          {row.prototype_feature || '—'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {distinguishingRows.length > 0 && (
                  <>
                    <tr className={styles.sectionRow}>
                      <td colSpan="3" className={styles.sectionTitle}>
                        Отличительные признаки
                      </td>
                    </tr>
                    {distinguishingRows.map((row) => (
                      <tr key={`distinguishing-${row.row_number}`}>
                        <td className={styles.featureCell}>
                          <span className={styles.featureNumber}>{row.row_number}.</span>
                          {row.feature}
                        </td>
                        <td className={styles.featureCell}>
                          {row.patent_feature || '—'}
                        </td>
                        <td className={styles.featureCell}>
                          {row.prototype_feature || '—'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    })
  }

  const renderFeaturesAll = () => {
    if (!prototypeData?.prototype_features || !prototypeData?.patent_features) return null
    log('🟡 Рендер: все признаки', { count: prototypeData.prototype_features?.length })
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.numberHeader}>Номер</th>
                <th className={styles.featureHeader}>Признаки прототипа {prototypeNumber}</th>
                <th className={styles.featureHeader}>Признаки патента</th>
              </tr>
            </thead>
            <tbody>
              {prototypeData.prototype_features.map((prototypeFeature, idx) => (
                <tr key={idx}>
                  <td className={styles.numberCell}>{idx + 1}</td>
                  <td className={styles.featureCell}>{prototypeFeature}</td>
                  <td className={styles.featureCell}>{prototypeData.patent_features[idx]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFeaturesPrototype = () => {
    if (!prototypeData?.prototype_features) return null
    log('🟡 Рендер: признаки прототипа', { count: prototypeData.prototype_features.length })
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.numberHeader}>Номер</th>
                <th className={styles.featureHeader}>Признаки прототипа {prototypeNumber}</th>
              </tr>
            </thead>
            <tbody>
              {prototypeData.prototype_features.map((feature, idx) => (
                <tr key={idx}>
                  <td className={styles.numberCell}>{idx + 1}</td>
                  <td className={styles.featureCell}>{feature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFeaturesPatent = () => {
    if (!prototypeData?.patent_features) return null
    log('🟡 Рендер: признаки патента', { count: prototypeData.patent_features.length })
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.numberHeader}>Номер</th>
                <th className={styles.featureHeader}>Признаки патента</th>
              </tr>
            </thead>
            <tbody>
              {prototypeData.patent_features.map((feature, idx) => (
                <tr key={idx}>
                  <td className={styles.numberCell}>{idx + 1}</td>
                  <td className={styles.featureCell}>{feature}</td>
                </tr>
              ))}
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
            onClick={handleGetPrototype}
            disabled={isLoading}
          >
            Получить характеристики прототипа
          </button>
          <button
            className={`${styles.actionButton} ${!isCompleted ? styles.inactive : ''}`}
            onClick={handleDownloadPrototype}
          >
            Скачать таблицу сравнения признаков
          </button>
        </div>

        {isLoading && logGroup('🟢 ПОКАЗЫВАЕМ СКЕЛЕТОН', () => {
          log('Причина', 'isLoading = true')
          return <SkeletonTable />
        })}

        {isCompleted && !isLoading && logGroup('🟢 ПОКАЗЫВАЕМ ТАБЛИЦУ', () => {
          log('Причина', 'isCompleted = true && !isLoading')
          return renderFeaturesComparisonTable()
        })}
      </div>

      {confirmModalVisible && createPortal(
        <div className={styles.modalOverlay} onClick={cancelRestart}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Повторное получение прототипа?</h3>
            <p className={styles.modalText}>
              Вы уверены, что хотите выполнить повторное получение характеристик прототипа?
            </p>
            <p className={styles.modalWarning}>
              Текущие данные будут заменены.
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

