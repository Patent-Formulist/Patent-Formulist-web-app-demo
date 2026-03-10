import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import * as XLSX from 'xlsx'
import styles from '../styles/Analogues.module.css'
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'

const downloadExcel = (analogs, patentId) => {
  const headers = ['Номер', 'Название', 'Ссылка', 'Реферат', 'Формула']
  const rows = Object.values(analogs).map(analog => [
    analog.number,
    analog.title,
    analog.link,
    analog.abstract,
    analog.claims
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 50 },
    { wch: 80 },
    { wch: 80 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Аналоги')

  const fileName = `analogs_${patentId}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

export default function Analogues() {
  const { id } = useParams()
  const { startTask, getTask } = useReference()
  const { showWarning, showSuccess, showError } = useToast()
  
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [prevStatus, setPrevStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const task = getTask(id)
  const loading = task?.status === TASK_STATUS.RUNNING
  const error = task?.error
  const analogsData = task?.data
  const isCompleted = task?.status === TASK_STATUS.SUCCESS && analogsData
  const isLoading = isSubmitting || task?.status === TASK_STATUS.RUNNING

  useEffect(() => {
    if (task?.status !== prevStatus) {
      if (task?.status === TASK_STATUS.SUCCESS) {
        showSuccess('Аналоги успешно получены')
      } else if (task?.status === TASK_STATUS.FAILED) {
        showError(task?.error || 'Ошибка получения аналогов')
      }
      setPrevStatus(task?.status)
    }
  }, [task?.status, task?.error, prevStatus, showSuccess, showError])

  useEffect(() => {
    if (task?.status === TASK_STATUS.SUCCESS || task?.status === TASK_STATUS.FAILED) {
      setIsSubmitting(false)
    }
  }, [task?.status])

  const handleGetAnalogs = async () => {
    if (isCompleted) {
      setConfirmModalVisible(true)
      return
    }

    setIsSubmitting(true)

    try {
      await startTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи поиска аналогов')
      setIsSubmitting(false)
    }
  }

  const confirmRestart = async () => {
    setConfirmModalVisible(false)
    try {
      await startTask(id)
    } catch (err) {
      showError(err.message || 'Ошибка запуска задачи поиска аналогов')
    }
  }

  const cancelRestart = () => {
    setConfirmModalVisible(false)
  }

  const handleDownload = () => {
    if (!isCompleted) {
      showWarning('Сначала получите аналоги')
      return
    }

    try {
      downloadExcel(analogsData, id)
      showSuccess('Аналоги успешно скачаны')
    } catch (err) {
      showError('Ошибка при скачивании аналогов')
    }
  }

  const renderAnalogsTable = () => {
    if (!analogsData) return null

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
              {Object.values(analogsData).map((analog, index) => (
                <tr key={index}>
                  <td>{analog.analog_num || analog.number}</td>
                  <td>{analog.title}</td>
                  <td>
                    <a 
                      href={analog.analog_link || analog.link}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      Открыть
                    </a>
                  </td>
                  <td>{analog.abstract}</td>
                  <td>{analog.claims}</td>
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
            onClick={handleGetAnalogs}
            disabled={isLoading}
          >
            Получить аналоги
          </button>
          <button 
            className={`${styles.actionButton} ${!isCompleted ? styles.inactive : ''}`}
            onClick={handleDownload}
          >
            Скачать аналоги
          </button>
        </div>

        {isLoading && <SkeletonTable />}

        {analogsData && !isLoading && renderAnalogsTable()}
      </div>

      {confirmModalVisible && createPortal(
        <div className={styles.modalOverlay} onClick={cancelRestart}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Повторный поиск аналогов?</h3>
            <p className={styles.modalText}>
              Вы уверены, что хотите выполнить повторный поиск аналогов?
            </p>
            <p className={styles.modalWarning}>
              Данные следующих шагов (Сопоставление, Прототип) станут неактуальными и их нужно будет обновить.
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
