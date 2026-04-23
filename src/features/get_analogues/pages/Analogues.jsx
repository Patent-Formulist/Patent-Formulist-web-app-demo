import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useReference } from '../../../contexts/ReferenceContext'
import { useToast } from '../../../contexts/ToastContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import { API_PROCESSOR_ENDPOINTS } from '../../../services/apiConfig'
import * as XLSX from 'xlsx'
import styles from '../styles/Analogues.module.css'
import authService from "../../../services/auth/authService.js";
import { SkeletonTable } from '../../../components/Skeleton/SkeletonTable'
import SaveResetWindow from '../../../components/SaveResetWindow/SaveResetWindow.jsx' // Импорт окна подтверждения/сброса данных после редактирования
import plusIcon from '../../../resources/plus.svg'
import penIcon from '../../../resources/pen.svg'
import downloadIcon from '../../../resources/download.svg'
import deleteIcon from '../../../resources/red-bin.svg'
import returnIcon from '../../../resources/return.svg'
import forwardIcon from '../../../resources/forward.svg'

const DEBUG = true; // ← Переключатель: true = логи включены, false = выключены
const log = (label, data) => {
  if (!DEBUG) return;
  console.log(`[${new Date().toLocaleTimeString()}] ${label}`, data);
};
const logGroup = (label, callback) => {
  if (!DEBUG) return callback();
  console.group(`[${new Date().toLocaleTimeString()}] ${label}`);
  const result = callback();
  console.groupEnd();
  return result;
};

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
    const { startTask, getTask, updateTask } = useReference()
  const { showWarning, showSuccess, showError } = useToast()
  // const [localDataLoaded, setLocalDataLoaded] = useState(false)
  // const [localDataLoaded, setLocalDataLoaded] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [prevStatus, setPrevStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tableData, setTableData] = useState(null)
  const [isAddRowClicked, setIsAddRowClicked] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editHistory, setEditHistory] = useState([])
  const [redoHistory, setRedoHistory] = useState([])
  const [rowHeights, setRowHeights] = useState([])
  const [headerHeight, setHeaderHeight] = useState(0)
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const tableDataRef = useRef([])
  const activeEditCellRef = useRef(null)
  const rowRefs = useRef([])
  const headerRef = useRef(null)
  const isEditingRef = useRef(false)
  const task = getTask(id)
  const loading = task?.status === TASK_STATUS.RUNNING
  const error = task?.error
  const analogsData = task?.data
  const isCompleted = task?.status === TASK_STATUS.SUCCESS && analogsData
  const isLoading = isSubmitting || task?.status === TASK_STATUS.RUNNING

  // 🔹 Лог монтирования (с группировкой)
  useEffect(() => {
    logGroup('🚨 МОНТИРОВАНИЕ', () => {
      log('ID', id)
      log('Статус задачи', task?.status)
      log('Есть данные', !!analogsData)
      log('Ключи данных', analogsData ? Object.keys(analogsData) : null)
      log('localStorage', {
        key: `analogs_data_${id}`,
        has: !!localStorage.getItem(`analogs_data_${id}`)
      })
    })
  }, [])

  useEffect(() => {
    if (!DEBUG) return;
    console.groupCollapsed(`🔍 РЕНДЕР [${new Date().toLocaleTimeString()}]`)
    console.table({
      id,
      isLoading,
      isCompleted: !!isCompleted,
      taskStatus: task?.status,
      hasData: !!analogsData,
      isSubmitting,
      dataKeys: analogsData ? Object.keys(analogsData).slice(0, 5) : null // Первые 5 ключей
    })
    console.groupEnd()
  }, [isLoading, isCompleted, task?.status, analogsData, isSubmitting, id])

  /*useEffect(() => {
    const fetchData = async () => {
      if (localDataLoaded) return;

      const savedData = localStorage.getItem(`analogs_${id}`)
      if (savedData && !task?.data) {
        try {
          const data = JSON.parse(savedData)
          const analogsData = data.analogs || data

          if (updateTask) {
            updateTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: analogsData,
              error: null
            });
            setLocalDataLoaded(true);
            showSuccess('Аналоги успешно загружены из кэша');
          }
        } catch (e) {
          console.error('Ошибка парсинга данных:', e)
        }
        return
      }

      try {
        const response = await authService.authenticatedFetch(
          API_PROCESSOR_ENDPOINTS.GET_SEARCH_RESULT(id),
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
          const analogsData = data.analogs || data

          localStorage.setItem(`analogs_${id}`, JSON.stringify(analogsData))

          if (updateTask) {
            updateTask(id, {
              status: TASK_STATUS.SUCCESS,
              data: analogsData,
              error: null
            });
            showSuccess('Аналоги успешно загружены с сервера');
          }
        }
      } catch (err) {
        console.log('❌ Данных аналогов на сервере нет')
      }
    }

    fetchData()
  }, [id, localDataLoaded, updateTask, showSuccess])*/

  useEffect(() => {
    if (task?.status !== prevStatus) {
      console.log('🔵 [Analogues] Статус изменился:', { old: prevStatus, new: task?.status })
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
      console.log('🔵 [Analogues] Сбрасываем isSubmitting')
      setIsSubmitting(false)
    }
  }, [task?.status])

  useEffect(() => {
    if (analogsData) {
      setTableData(Object.values(analogsData))
      setIsEditMode(false)
      setEditHistory([]) // очищаем историю для сохранения шагов изменения таблички
      setRedoHistory([]) // очищаем историю для сохранения шагов изменения таблички
      setIsAddRowClicked(false)
    }
  }, [analogsData])

  // Сохраняется значение без перерисовки компонентов (это для стрелочек)
  useEffect(() => {
    tableDataRef.current = tableData || []
  }, [tableData])

  // Приводит строки к оной высоте для правильной отрисовки кнопок удаления
  useEffect(() => {
    if (!isEditMode) return

    const updateAllHeights = () => {
      const heights = rowRefs.current.map(row => row?.getBoundingClientRect().height || 48)
      setRowHeights(heights)
      setHeaderHeight(headerRef.current?.getBoundingClientRect().height || 48)
    }

    updateAllHeights()

    const observers = rowRefs.current.map(row => {
      if (!row) return null

      const observer = new ResizeObserver(updateAllHeights)
      observer.observe(row)
      return observer
    })

    return () => {
      observers.forEach(obs => obs?.disconnect())
    }
  }, [isEditMode, tableData])

  // Обработка Enter для показа окна сохранить/сбросить данные
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditMode) return

      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter') {
        e.preventDefault()
        setSaveModalVisible(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode])

  const handleGetAnalogs = async () => {
    const clickTime = Date.now()
    
    logGroup('🔴 КЛИК: Получить аналоги', () => {
      log('Время клика', new Date(clickTime).toISOString())
      log('Текущее состояние', { isCompleted, isLoading, taskStatus: task?.status })
    })
    
    if (isCompleted) {
      log('⚠️ Уже завершено - показываем модалку')
      setConfirmModalVisible(true)
      return
    }

    log('⬇️ Устанавливаем isSubmitting = true')
    setIsSubmitting(true)
    
    try {
      log('🚀 Вызываем startTask...')
      const startTime = Date.now()
      await startTask(id)
      const endTime = Date.now()
      
      logGroup('✅ startTask завершён', () => {
        log('Время выполнения', `${endTime - startTime} мс`)
        log('Новое состояние задачи', getTask(id)?.status)
      })
    } catch (err) {
      log('❌ ОШИБКА startTask', { message: err.message, stack: err.stack })
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

  const toggleEditMode = () => {
    if (isEditMode) {
      setSaveModalVisible(true)
      return
    }

    setIsEditMode(true)
  }

// Код реализации возвращения на предыдущие шаги или перехода вперед на несколько шагов

  const cloneSnapshot = (rows) => (rows || []).map(row => ({ ...row })) // Копируем данные чтобы не изменять исходник
  const areSnapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)

  const saveEditStep = () => {
    const snapshot = cloneSnapshot(tableDataRef.current)

    setEditHistory(prev => {
      const lastSnapshot = prev[prev.length - 1]
      if (lastSnapshot && areSnapshotsEqual(lastSnapshot, snapshot)) {
        return prev
      }

      return [...prev, snapshot]
    })
    setRedoHistory([])
  }

  // Предыдущие шаги в режиме редактирования
  const handleUndoEditStep = () => {
    setEditHistory(prev => {
      if (prev.length === 0) return prev

      const previousSnapshot = cloneSnapshot(prev[prev.length - 1])
      const currentSnapshot = cloneSnapshot(tableDataRef.current)

      setRedoHistory(next => {
        const lastRedoSnapshot = next[next.length - 1]
        if (lastRedoSnapshot && areSnapshotsEqual(lastRedoSnapshot, currentSnapshot)) {
          return next
        }
        return [...next, currentSnapshot]
      })

      setTableData(previousSnapshot)
      setIsAddRowClicked(false)

      return prev.slice(0, -1)
    })
  }
  // Следующие шаги в режиме редактирования
  const handleRedoEditStep = () => {
    setRedoHistory(prev => {
      if (prev.length === 0) return prev

      const nextSnapshot = cloneSnapshot(prev[prev.length - 1])
      const currentSnapshot = cloneSnapshot(tableDataRef.current)

      setEditHistory(history => {
        const lastEditSnapshot = history[history.length - 1]
        if (lastEditSnapshot && areSnapshotsEqual(lastEditSnapshot, currentSnapshot)) {
          return history
        }
        return [...history, currentSnapshot]
      })

      setTableData(nextSnapshot)
      setIsAddRowClicked(false)

      return prev.slice(0, -1)
    })
  }
// Конец функции стрелочек

  const handleAddRowButtonClick = () => {
    saveEditStep()
    setTableData(prev => [
    ...prev,
    {
      number: '',
      title: '',
      link: '',
      abstract: '',
      claims: '',
      isNew: true,
      isLoading: false,
      isDataLoaded: false,
      isAddingNumber: true
    }
  ])
    setIsAddRowClicked(true)
  }

  const updateRowAtIndex = (index, updates) => {
    setTableData(prev => prev.map((row, i) => 
      i === index ? { ...row, ...updates } : row
    ))
  }

  const handleLoadRowData = async (index) => {
    const currentRow = tableData[index]
    
    if (!currentRow?.number || currentRow.number.trim() === '') {
      showWarning('Введите номер патента перед загрузкой данных')
      return
    }

    saveEditStep()
    updateRowAtIndex(index, { isAddingNumber: false, isLoading: true })

    await new Promise(resolve => setTimeout(resolve, 2000))

    const mockData = {
      title: 'Название патента',
      link: 'https://example.com',
      abstract: 'Краткое описание патента...',
      claims: 'Формула изобретения...'
    }

    updateRowAtIndex(index, { ...mockData, isLoading: false, isDataLoaded: true })

    setIsAddRowClicked(false)
  }

  const handleNumberChange = (index, value) => {
    updateRowAtIndex(index, { number: value })
  }
  
  // Функционал по изменению значения в ячейке таблицы
  const getRowFieldValue = (row, field) => {
    if (field === 'link') return row.link || row.analog_link || ''
    return row[field] || ''
  }

  const handleCellFocus = (index, field) => {
    const cellKey = `${index}-${field}`
    if (activeEditCellRef.current === cellKey) return

    activeEditCellRef.current = cellKey
    isEditingRef.current = false
  }

  const handleCellBlur = () => {
    activeEditCellRef.current = null
    isEditingRef.current = false
  }

  const handleCellChange = (index, field, value) => {
    if (!isEditingRef.current) {
      saveEditStep()
      isEditingRef.current = true
    }

    updateRowAtIndex(index, { [field]: value })
  }

  // Функционал удаления строки
  const handleDeleteRow = (index) => {
    saveEditStep()
    setTableData(prev => prev.filter((_, rowIndex) => rowIndex !== index))
    setIsAddRowClicked(false)
  }

  const renderAnalogsTable = () => {
    if (!analogsData) return null

    return (
      <div className={styles.tableSection}>
        {isEditMode && (
          <div className={styles.deleteButtonsColumn} style={{ paddingTop: `${headerHeight}px` }}>
            {tableData?.map((_, index) => (
              <div
                key={`delete-${index}`}
                className={styles.deleteButtonRow}
                style={{ height: `${rowHeights[index] || 48}px` }}
              >
                <button
                  type="button"
                  className={styles.deleteRowButton}
                  onClick={() => handleDeleteRow(index)}
                  aria-label="Удалить строку"
                >
                  <img
                    src={deleteIcon}
                    alt=""
                    className={styles.deleteRowIcon}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.tableWrapper}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead ref={headerRef}>
                <tr>
                  <th>Номер</th>
                  <th>Название</th>
                  <th>Ссылка</th>
                  <th>Реферат</th>
                  <th>Формула</th>
                </tr>
              </thead>

              <tbody>
                {tableData?.map((analog, index) => {
                  const isNewRow = analog.isNew

                  if (isNewRow) {
                    if (analog.isAddingNumber) {
                      return (
                        <tr key={index} ref={el => { rowRefs.current[index] = el }}>
                          <td>
                            <input
                              type="text"
                              value={analog.number}
                              onChange={(e) =>
                                handleNumberChange(index, e.target.value)
                              }
                              className={styles.numberInput}
                              placeholder="Введите номер"
                            />
                          </td>

                          <td colSpan={4} className={styles.mergedCell}>
                            <button
                              type="button"
                              className={styles.loadDataRowButton}
                              onClick={() => handleLoadRowData(index)}
                              disabled={!analog.number}
                            >
                              Определить
                            </button>
                          </td>
                        </tr>
                      )
                    }

                    if (analog.isLoading) {
                      return (
                        <tr key={index} ref={el => { rowRefs.current[index] = el }}>
                          <td className={styles.noPaddingCell}>
                            <div className={styles.skeletonCell} />
                          </td>
                          <td className={styles.noPaddingCell}>
                            <div className={styles.skeletonCell} />
                          </td>
                          <td className={styles.noPaddingCell}>
                            <div className={styles.skeletonCell} />
                          </td>
                          <td className={styles.noPaddingCell}>
                            <div className={styles.skeletonCell} />
                          </td>
                          <td className={styles.noPaddingCell}>
                            <div className={styles.skeletonCell} />
                          </td>
                        </tr>
                      )
                    }

                    if (analog.isDataLoaded) {
                      return (
                        <tr key={index} ref={el => { rowRefs.current[index] = el }}>
                          <td>{analog.number}</td>
                          <td>
                            {isEditMode ? (
                              <input
                                type="text"
                                value={getRowFieldValue(analog, 'title')}
                                onFocus={() => handleCellFocus(index, 'title')}
                                onBlur={handleCellBlur}
                                onChange={(e) => handleCellChange(index, 'title', e.target.value)}
                                className={styles.cellInput}
                              />
                            ) : (
                              analog.title
                            )}
                          </td>
                          <td>
                            {isEditMode ? (
                              <input
                                type="text"
                                value={getRowFieldValue(analog, 'link')}
                                onFocus={() => handleCellFocus(index, 'link')}
                                onBlur={handleCellBlur}
                                onChange={(e) => handleCellChange(index, 'link', e.target.value)}
                                className={styles.cellInput}
                              />
                            ) : (
                              <a
                                href={analog.analog_link || analog.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.link}
                              >
                                Открыть
                              </a>
                            )}
                          </td>
                          <td>
                            {isEditMode ? (
                              <textarea
                                value={getRowFieldValue(analog, 'abstract')}
                                onFocus={() => handleCellFocus(index, 'abstract')}
                                onBlur={handleCellBlur}
                                onChange={(e) => handleCellChange(index, 'abstract', e.target.value)}
                                className={styles.cellTextarea}
                              />
                            ) : (
                              analog.abstract
                            )}
                          </td>
                          <td>
                            {isEditMode ? (
                              <textarea
                                value={getRowFieldValue(analog, 'claims')}
                                onFocus={() => handleCellFocus(index, 'claims')}
                                onBlur={handleCellBlur}
                                onChange={(e) => handleCellChange(index, 'claims', e.target.value)}
                                className={styles.cellTextarea}
                              />
                            ) : (
                              analog.claims
                            )}
                          </td>
                        </tr>
                      )
                    }
                  }

                  return (
                    <tr key={index} ref={el => { rowRefs.current[index] = el }}>
                      <td>{analog.analog_num || analog.number}</td>
                      <td>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={getRowFieldValue(analog, 'title')}
                            onFocus={() => handleCellFocus(index, 'title')}
                            onBlur={handleCellBlur}
                            onChange={(e) => handleCellChange(index, 'title', e.target.value)}
                            className={styles.cellInput}
                          />
                        ) : (
                          analog.title
                        )}
                      </td>
                      <td>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={getRowFieldValue(analog, 'link')}
                            onFocus={() => handleCellFocus(index, 'link')}
                            onBlur={handleCellBlur}
                            onChange={(e) => handleCellChange(index, 'link', e.target.value)}
                            className={styles.cellInput}
                          />
                        ) : (
                          <a
                            href={analog.analog_link || analog.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                          >
                            Открыть
                          </a>
                        )}
                      </td>
                      <td>
                        {isEditMode ? (
                          <textarea
                            value={getRowFieldValue(analog, 'abstract')}
                            onFocus={() => handleCellFocus(index, 'abstract')}
                            onBlur={handleCellBlur}
                            onChange={(e) => handleCellChange(index, 'abstract', e.target.value)}
                            className={styles.cellTextarea}
                          />
                        ) : (
                          analog.abstract
                        )}
                      </td>
                      <td>
                        {isEditMode ? (
                          <textarea
                            value={getRowFieldValue(analog, 'claims')}
                            onFocus={() => handleCellFocus(index, 'claims')}
                            onBlur={handleCellBlur}
                            onChange={(e) => handleCellChange(index, 'claims', e.target.value)}
                            className={styles.cellTextarea}
                          />
                        ) : (
                          analog.claims
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {isEditMode && !isAddRowClicked && (
            <button
              type="button"
              className={styles.tableAddRowButton}
              onClick={handleAddRowButtonClick}
            >
              <img
                src={plusIcon}
                alt=""
                className={styles.addRowImg}
              />
            </button>
          )}

        </div>
      </div>
    )
  }
 // Добавлены кнопки: редактирование и стрелочки
 // В самом конце добавлено окно сохранения/сброса данных после редактирования
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
          {isCompleted && (
            <button 
              className={`${styles.actionButton} ${isEditMode ? styles.tableButtonActive : ''}`}
              onClick={toggleEditMode}
              disabled={isLoading}
            >
              <img src={penIcon} alt="" className={`${styles.buttonIcon} ${isEditMode ? styles.editIcon : ''}`} aria-hidden="true" />
              Редактировать таблицу
            </button>
          )}
          <button 
            className={`${styles.actionButton} ${isEditMode ? styles.inactive : ''}`}
            onClick={handleDownload}
            disabled={isEditMode}
          >
            <img src={downloadIcon} alt="" className={`${styles.buttonIcon} ${isEditMode ? styles.darkIcon : ''}`} aria-hidden="true" />
            Скачать аналоги
          </button>
          {isEditMode && (
            <button
              className={`${styles.actionButton} ${styles.finishEditButton}`}
              onClick={() => setSaveModalVisible(true)}
            >
              Завершить редактирование
            </button>
          )}
        </div>
  
        {isEditMode && isCompleted && (
          <div className={styles.historyButtonsRow}>
            <button
              className={`${styles.actionButton} ${styles.historyButton} ${editHistory.length === 0 ? styles.inactive : ''}`}
              onClick={handleUndoEditStep}
              disabled={isLoading || editHistory.length === 0}
            >
              <img 
                src={returnIcon} 
                alt="" 
                className={`${styles.buttonIcon} ${styles.historyButtonIcon} ${editHistory.length === 0 ? styles.inactive : ''}`} 
                aria-hidden="true" 
              />
            </button>
            <button
              className={`${styles.actionButton} ${styles.historyButton} ${redoHistory.length === 0 ? styles.inactive : ''}`}
              onClick={handleRedoEditStep}
              disabled={isLoading || redoHistory.length === 0}
            >
              <img 
                src={forwardIcon} 
                alt="" 
                className={`${styles.buttonIcon} ${styles.historyButtonIcon} ${redoHistory.length === 0 ? styles.inactive : ''}`} 
                aria-hidden="true" 
              />
            </button>
          </div>
        )}

        {isLoading && logGroup('🟢 ПОКАЗЫВАЕМ СКЕЛЕТОН', () => {
          log('Причина', 'isLoading = true')
          return <SkeletonTable />
        })}

        {isCompleted && !isLoading && analogsData && typeof analogsData === 'object' && Object.keys(analogsData).length > 0 && renderAnalogsTable()}
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
              <button className={styles.modalCancelButton} onClick={cancelRestart} type="button">Отмена</button>
              <button className={styles.modalConfirmButton} onClick={confirmRestart} type="button">Продолжить</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <SaveResetWindow
        isOpen={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        onSave={() => {
          setIsEditMode(false)
          setEditHistory([])
          setRedoHistory([])
          setSaveModalVisible(false)
        }}

        onReset={() => {
          setTableData(Object.values(analogsData))
          setIsEditMode(false)
          setEditHistory([])
          setRedoHistory([])
          setSaveModalVisible(false)
        }}
      />
    </>
  )
}
