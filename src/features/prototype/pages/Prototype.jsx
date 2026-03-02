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
  const headers = ['Номер', 'Признаки прототипа', 'Признаки патента']
  const rows = prototypeFeatures.map((prototypeFeature, idx) => [
    idx + 1,
    prototypeFeature,
    patentFeatures[idx] || ''
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 60 },
    { wch: 60 }
  ]

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

    try {
      downloadPrototypeExcel(prototypeData.prototype, id)
      showSuccess('Характеристики прототипа успешно скачаны')
    } catch (err) {
      showError('Ошибка при скачивании характеристик прототипа')
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

  const renderPrototypeTable = () => {
    if (!prototypeData?.prototype) return null

    const { prototype } = prototypeData

    return (
      <div className={styles.tableWrapper}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Название</th>
                <th>Ссылка</th>
                <th>Реферат</th>
                <th>Формула</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{prototype.number}</td>
                <td>{prototype.title}</td>
                <td>
                  <a 
                    href={prototype.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Открыть
                  </a>
                </td>
                <td>{prototype.abstract}</td>
                <td>{prototype.claims}</td>
              </tr>
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
        {viewMode === 'main' && (
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
              Скачать характеристики прототипа
            </button>
            <button 
              className={`${styles.actionButton} ${!isCompleted ? styles.inactive : ''}`}
              onClick={handleGetFeatures}
            >
              Получить признаки патента и прототипа
            </button>
          </div>
        )}

        {viewMode === 'features-menu' && (
          <div className={styles.buttonContainer}>
            <button 
              className={styles.actionButton}
              onClick={handleBackToMain}
            >
              Назад
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleShowAllFeatures}
            >
              Признаки патента и прототипа
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleShowPrototypeFeatures}
            >
              Признаки прототипа
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleShowPatentFeatures}
            >
              Признаки патента
            </button>
          </div>
        )}

        {viewMode === 'features-all' && (
          <div className={styles.buttonContainer}>
            <button 
              className={styles.actionButton}
              onClick={handleBackToFeaturesMenu}
            >
              Назад
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleDownloadAllFeatures}
            >
              Скачать признаки
            </button>
          </div>
        )}

        {viewMode === 'features-prototype' && (
          <div className={styles.buttonContainer}>
            <button 
              className={styles.actionButton}
              onClick={handleBackToFeaturesMenu}
            >
              Назад
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleDownloadPrototypeFeatures}
            >
              Скачать признаки
            </button>
          </div>
        )}

        {viewMode === 'features-patent' && (
          <div className={styles.buttonContainer}>
            <button 
              className={styles.actionButton}
              onClick={handleBackToFeaturesMenu}
            >
              Назад
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleDownloadPatentFeatures}
            >
              Скачать признаки
            </button>
          </div>
        )}

        {prototypeData && viewMode === 'main' && renderPrototypeTable()}
        {prototypeData && viewMode === 'features-all' && renderFeaturesAll()}
        {prototypeData && viewMode === 'features-prototype' && renderFeaturesPrototype()}
        {prototypeData && viewMode === 'features-patent' && renderFeaturesPatent()}
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
