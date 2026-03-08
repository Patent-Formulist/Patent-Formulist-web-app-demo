import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import * as XLSX from 'xlsx'
import styles from '../styles/Prototype.module.css'

const downloadPrototypeExcel = (prototype, patentId) => {
  const headers = ['Номер', 'Название', 'Ссылка', 'Реферат', 'Формула']
  const row = [
    prototype.number || '',
    prototype.title || '',
    prototype.link || '',
    prototype.abstract || '',
    prototype.claims || ''
  ]

  const worksheet = XLSX.utils.aoa_to_sheet([headers, row])
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 50 },
    { wch: 80 },
    { wch: 80 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Прототип')

  const fileName = `prototype_${patentId}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

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
      limitingPatentFeatures[idx] || '',
      feature
    ])
  })
  
  rows.push(['Отличительные признаки', '', ''])
  
  // Отличительные признаки
  distinguishingFeatures.forEach((feature, idx) => {
    rows.push([
      `${midpoint + idx + 1}. ${feature}`,
      distinguishingPatentFeatures[idx] || '',
      feature
    ])
  })

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
  const { getCompareTask, startPrototypeTask, getPrototypeTask } = useReference()
  const { showWarning, showSuccess, showError } = useToast()
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [viewMode, setViewMode] = useState('main')
  const [prevStatus, setPrevStatus] = useState(null)
  
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
  const isCompleted = prototypeTask?.status === TASK_STATUS.SUCCESS && prototypeData

  useEffect(() => {
    if (prototypeTask?.status !== prevStatus) {
      if (prototypeTask?.status === TASK_STATUS.SUCCESS) {
        showSuccess('Характеристики прототипа успешно получены')
      } else if (prototypeTask?.status === TASK_STATUS.FAILED) {
        showError(prototypeTask?.error || 'Ошибка получения характеристик прототипа')
      }
      setPrevStatus(prototypeTask?.status)
    }
  }, [prototypeTask?.status, prototypeTask?.error, prevStatus, showSuccess, showError])

  const handleGetPrototype = async () => {
    if (!isCompareCompleted) {
      showWarning('Сначала выполните сопоставление патента с аналогами')
      return
    }

    if (isCompleted) {
      setConfirmModalVisible(true)
      return
    }

    try {
      await startPrototypeTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи получения прототипа')
    }
  }

  const confirmRestart = async () => {
    setConfirmModalVisible(false)
    try {
      await startPrototypeTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи получения прототипа')
    }
  }

  const cancelRestart = () => {
    setConfirmModalVisible(false)
  }

  const handleDownloadPrototype = () => {
  if (!isCompleted) {
    showWarning('Сначала получите характеристики прототипа')
    return
  }
  
  if (!prototypeData?.prototype_features || !prototypeData?.patent_features) {
    showWarning('Данные признаков недоступны')
    return
  }
  
  try {
    downloadFeaturesExcel(
      prototypeData.prototype_features,
      prototypeData.patent_features,
      `prototype_comparison_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
    showSuccess('Таблица сравнения признаков успешно скачана')
  } catch (err) {
    showError('Ошибка при скачивании таблицы сравнения')
  }
}

  const handleGetFeatures = () => {
    if (!prototypeData?.prototype_features || !prototypeData?.patent_features) {
      showWarning('Сначала получите характеристики прототипа')
      return
    }
    setViewMode('features-menu')
  }

  const handleBackToMain = () => {
    setViewMode('main')
  }

  const handleBackToFeaturesMenu = () => {
    setViewMode('features-menu')
  }

  const handleShowAllFeatures = () => {
    setViewMode('features-all')
  }

  const handleShowPrototypeFeatures = () => {
    setViewMode('features-prototype')
  }

  const handleShowPatentFeatures = () => {
    setViewMode('features-patent')
  }

  const handleDownloadAllFeatures = () => {
    if (!prototypeData?.prototype_features || !prototypeData?.patent_features) {
      showWarning('Данные признаков недоступны')
      return
    }
    try {
      downloadFeaturesExcel(
        prototypeData.prototype_features,
        prototypeData.patent_features,
        `features_all_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      showSuccess('Признаки патента и прототипа успешно скачаны')
    } catch (err) {
      showError('Ошибка при скачивании признаков')
    }
  }

  const handleDownloadPrototypeFeatures = () => {
    if (!prototypeData?.prototype_features) {
      showWarning('Данные признаков прототипа недоступны')
      return
    }
    try {
      downloadPrototypeOnlyExcel(
        prototypeData.prototype_features,
        `features_prototype_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      showSuccess('Признаки прототипа успешно скачаны')
    } catch (err) {
      showError('Ошибка при скачивании признаков прототипа')
    }
  }

  const handleDownloadPatentFeatures = () => {
    if (!prototypeData?.patent_features) {
      showWarning('Данные признаков патента недоступны')
      return
    }
    try {
      downloadPatentOnlyExcel(
        prototypeData.patent_features,
        `features_patent_${id}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      showSuccess('Признаки патента успешно скачаны')
    } catch (err) {
      showError('Ошибка при скачивании признаков патента')
    }
  }

  const renderFeaturesComparisonTable = () => {
  if (!prototypeData?.prototype_features || !prototypeData?.patent_features) {
    return null
  }

  const { prototype_features, patent_features } = prototypeData
  
  // Разделяем признаки на ограничительные и отличительные
  // (первая половина - ограничительные, вторая - отличительные)
  const midpoint = Math.ceil(prototype_features.length / 2)
  const limitingFeatures = prototype_features.slice(0, midpoint)
  const distinguishingFeatures = prototype_features.slice(midpoint)
  
  const limitingPatentFeatures = patent_features.slice(0, midpoint)
  const distinguishingPatentFeatures = patent_features.slice(midpoint)

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.featureHeader}>Признаки</th>
              <th className={styles.featureHeader}>Признаки патента</th>
              <th className={styles.featureHeader}>Признаки прототипа</th>
            </tr>
          </thead>
          <tbody>
            {/* Ограничительные признаки */}
            <tr className={styles.sectionRow}>
              <td colSpan="3" className={styles.sectionTitle}>
                Ограничительные признаки
              </td>
            </tr>
            {limitingFeatures.map((feature, idx) => (
              <tr key={`limiting-${idx}`}>
                <td className={styles.featureCell}>
                  <span className={styles.featureNumber}>{idx + 1}.</span>
                  {feature}
                </td>
                <td className={styles.featureCell}>
                  {limitingPatentFeatures[idx] || '—'}
                </td>
                <td className={styles.featureCell}>
                  {feature}
                </td>
              </tr>
            ))}
            
            {/* Отличительные признаки */}
            <tr className={styles.sectionRow}>
              <td colSpan="3" className={styles.sectionTitle}>
                Отличительные признаки
              </td>
            </tr>
            {distinguishingFeatures.map((feature, idx) => (
              <tr key={`distinguishing-${idx}`}>
                <td className={styles.featureCell}>
                  <span className={styles.featureNumber}>{midpoint + idx + 1}.</span>
                  {feature}
                </td>
                <td className={styles.featureCell}>
                  {distinguishingPatentFeatures[idx] || '—'}
                </td>
                <td className={styles.featureCell}>
                  {feature}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

  const renderFeaturesAll = () => {
    if (!prototypeData?.prototype_features || !prototypeData?.patent_features) return null

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.numberHeader}>Номер</th>
                <th className={styles.featureHeader}>Признаки прототипа</th>
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

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.numberHeader}>Номер</th>
                <th className={styles.featureHeader}>Признаки прототипа</th>
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
      {/* Кнопки — только основные */}
      <div className={styles.buttonContainer}>
        <button 
          className={`${styles.actionButton} ${loading ? styles.loading : ''} ${isCompleted ? styles.completed : ''}`}
          onClick={handleGetPrototype}
          disabled={loading}
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

      {/* ТАБЛИЦА СРАВНЕНИЯ */}
      {prototypeData && renderFeaturesComparisonTable()}
    </div>

    {/* Модальное окно — оставьте как есть */}
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
