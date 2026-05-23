import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import { MOCK_ELEMENTS_DATA, MOCK_FIGURES_DATA } from '../../../services/mocks/mockData'
import SaveResetWindow from '../../../components/SaveResetWindow/SaveResetWindow.jsx'
import styles from '../styles/Schemes.module.css'
import penIcon from '../../../resources/pen.svg'
import plusIcon from '../../../resources/plus.svg'
import deleteIcon from '../../../resources/red-bin.svg'

const mockDelay = (ms = 900) => new Promise(res => setTimeout(res, ms))

const mockFetchElements = async () => {
  await mockDelay()
  return MOCK_ELEMENTS_DATA.map(el => ({ ...el }))
}

const mockFetchFigures = async () => {
  await mockDelay(700)
  return MOCK_FIGURES_DATA.map(fig => ({ ...fig, element_ids: [...fig.element_ids] }))
}

const saveToStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
const loadFromStorage = (key) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch { return null }
}

function SkeletonRows({ cols = 2, count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, c) => (
        <td key={c} className={styles.noPaddingCell}>
          <div className={styles.skeletonCell} />
        </td>
      ))}
    </tr>
  ))
}

export default function Schemes() {
  const { id } = useParams()
  const { showSuccess, showWarning, showError } = useToast()

  const storageKeyElements = `schemes_elements_${id}`
  const storageKeyFigures  = `schemes_figures_${id}`

  const [elements, setElements] = useState(() => loadFromStorage(storageKeyElements) || [])
  const [elementsLoading, setElementsLoading] = useState(false)
  const [elementsLoaded, setElementsLoaded] = useState(() => !!loadFromStorage(storageKeyElements))
  const [isElementsEdit, setIsElementsEdit] = useState(false)
  const [elemSaveModal, setElemSaveModal] = useState(false)
  const [elemRowHeights, setElemRowHeights] = useState([])
  const [elemHeaderH, setElemHeaderH] = useState(0)
  const elemRowRefs = useRef([])
  const elemHeaderRef = useRef(null)
  const elementsRef = useRef(elements)
  const elementsSnapshot = useRef(null)

  const [figures, setFigures] = useState(() => loadFromStorage(storageKeyFigures) || [])
  const [figuresLoading, setFiguresLoading] = useState(false)
  const [figuresLoaded, setFiguresLoaded] = useState(() => !!loadFromStorage(storageKeyFigures))
  const [isFiguresEdit, setIsFiguresEdit] = useState(false)
  const [figSaveModal, setFigSaveModal] = useState(false)

  useEffect(() => { elementsRef.current = elements }, [elements])

  useEffect(() => {
    if (elementsLoaded) saveToStorage(storageKeyElements, elements)
  }, [elements, elementsLoaded])

  useEffect(() => {
    if (figuresLoaded) saveToStorage(storageKeyFigures, figures)
  }, [figures, figuresLoaded])

  useEffect(() => {
    if (!isElementsEdit) return
    const update = () => {
      setElemRowHeights(elemRowRefs.current.map(r => r?.getBoundingClientRect().height || 48))
      setElemHeaderH(elemHeaderRef.current?.getBoundingClientRect().height || 48)
    }
    update()
    const obs = elemRowRefs.current.map(r => {
      if (!r) return null
      const o = new ResizeObserver(update)
      o.observe(r)
      return o
    })
    return () => obs.forEach(o => o?.disconnect())
  }, [isElementsEdit, elements])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (isElementsEdit) { e.preventDefault(); setElemSaveModal(true) }
        else if (isFiguresEdit) { e.preventDefault(); setFigSaveModal(true) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isElementsEdit, isFiguresEdit])

  const handleImportElements = async () => {
    if (elementsLoaded) { showWarning('Список уже составлен'); return }
    setElementsLoading(true)
    try {
      const data = await mockFetchElements()
      setElements(data)
      setElementsLoaded(true)
      showSuccess('Список составных частей сформирован')
    } catch { showError('Ошибка загрузки') }
    finally { setElementsLoading(false) }
  }

  const toggleElementsEdit = () => {
    if (isElementsEdit) { setElemSaveModal(true); return }
    elementsSnapshot.current = elements.map(el => ({ ...el }))
    setIsElementsEdit(true)
  }

  const handleSaveElements = async () => {
    const snapshot = elementsSnapshot.current
    const changed = JSON.stringify(snapshot) !== JSON.stringify(elements)

    setIsElementsEdit(false)
    setElemSaveModal(false)

    if (changed) {
      setElementsLoading(true)
      setFigures([])
      setFiguresLoaded(false)
      setIsFiguresEdit(false)
      localStorage.removeItem(storageKeyFigures)
      await mockDelay(800)
      setElementsLoading(false)
      showSuccess('Изменения сохранены. Фигуры нужно составить заново.')
    } else {
      showSuccess('Изменения сохранены')
    }
  }

  const handleResetElements = async () => {
    setElemSaveModal(false)
    setElementsLoading(true)
    try {
      const data = await mockFetchElements()
      setElements(data)
      setIsElementsEdit(false)
      showSuccess('Данные сброшены')
    } catch { showError('Ошибка сброса') }
    finally { setElementsLoading(false) }
  }

  const handleElemCellChange = (index, value) => {
    setElements(prev => prev.map((el, i) => i === index ? { ...el, description: value } : el))
  }

  const handleElemDeleteRow = (index) => {
    setElements(prev => prev.filter((_, i) => i !== index))
  }

  const handleElemAddRow = () => {
    setElements(prev => [
      ...prev,
      { id: `el-new-${Date.now()}`, description: '', position: prev.length }
    ])
  }

  const handleComposeFigures = async () => {
    if (figuresLoaded) { showWarning('Фигуры уже составлены'); return }
    if (!elementsLoaded) { showWarning('Сначала составьте список частей изобретения'); return }
    setFiguresLoading(true)
    try {
      const data = await mockFetchFigures()
      setFigures(data)
      setFiguresLoaded(true)
      showSuccess('Фигуры сформированы')
    } catch { showError('Ошибка загрузки') }
    finally { setFiguresLoading(false) }
  }

  const handleAddFigure = () => {
    setFigures(prev => [
      ...prev,
      { id: `fig-new-${Date.now()}`, description: '', element_ids: [] }
    ])
    if (!isFiguresEdit) setIsFiguresEdit(true)
  }

  const toggleFiguresEdit = () => {
    if (isFiguresEdit) { setFigSaveModal(true); return }
    setIsFiguresEdit(true)
  }

  const handleSaveFigures = () => {
    setIsFiguresEdit(false)
    setFigSaveModal(false)
    showSuccess('Изменения сохранены')
  }

  const handleResetFigures = async () => {
    setFigSaveModal(false)
    setFiguresLoading(true)
    try {
      const data = await mockFetchFigures()
      setFigures(data)
      setIsFiguresEdit(false)
      showSuccess('Данные сброшены')
    } catch { showError('Ошибка сброса') }
    finally { setFiguresLoading(false) }
  }

  const handleFigDescChange = (figIdx, value) => {
    setFigures(prev => prev.map((f, i) => i === figIdx ? { ...f, description: value } : f))
  }

  const handleCheckbox = (figIdx, elId, checked) => {
    setFigures(prev => prev.map((f, i) => {
      if (i !== figIdx) return f
      const ids = checked
        ? [...f.element_ids, elId]
        : f.element_ids.filter(eid => eid !== elId)
      return { ...f, element_ids: ids }
    }))
  }

  const handleDeleteFigure = (figIdx) => {
    setFigures(prev => prev.filter((_, i) => i !== figIdx))
  }


  return (
    <div className={styles.container}>
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.actionButton} ${elementsLoaded ? styles.completed : ''} ${elementsLoading ? styles.loading : ''}`}
          onClick={handleImportElements}
          disabled={elementsLoading}
        >
          Составить список составных частей изобретения
        </button>

        {elementsLoaded && (
          <button
            className={`${styles.actionButton} ${isElementsEdit ? styles.tableButtonActive : ''}`}
            onClick={toggleElementsEdit}
            disabled={elementsLoading}
          >
            <img
              src={penIcon}
              alt=""
              className={`${styles.buttonIcon} ${isElementsEdit ? styles.editIcon : ''}`}
              aria-hidden="true"
            />
            Редактировать
          </button>
        )}

        {isElementsEdit && (
          <button
            className={`${styles.actionButton} ${styles.finishEditButton}`}
            onClick={() => setElemSaveModal(true)}
          >
            Завершить редактирование
          </button>
        )}
      </div>
      {(elementsLoading || elementsLoaded) && (
        <div className={styles.tableSection}>
          {isElementsEdit && (
            <div
              className={styles.deleteButtonsColumn}
              style={{ paddingTop: `${elemHeaderH}px` }}
            >
              {elements.map((_, index) => (
                <div
                  key={`del-el-${index}`}
                  className={styles.deleteButtonRow}
                  style={{ height: `${elemRowHeights[index] || 48}px` }}
                >
                  <button
                    type="button"
                    className={styles.deleteRowButton}
                    onClick={() => handleElemDeleteRow(index)}
                    aria-label="Удалить строку"
                  >
                    <img src={deleteIcon} alt="" className={styles.deleteRowIcon} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.tableWrapper}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead ref={elemHeaderRef}>
                  <tr>
                    <th className={styles.colNumber}>№</th>
                    <th>Части изобретения</th>
                  </tr>
                </thead>
                <tbody>
                  {elementsLoading
                    ? <SkeletonRows cols={2} count={5} />
                    : elements.map((el, index) => (
                      <tr key={el.id} ref={el => { elemRowRefs.current[index] = el }}>
                        <td className={styles.colNumber}>{index + 1}</td>
                        <td>
                          {isElementsEdit ? (
                            <input
                              type="text"
                              value={el.description}
                              onChange={(e) => handleElemCellChange(index, e.target.value)}
                              className={styles.cellInput}
                            />
                          ) : el.description}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {isElementsEdit && (
              <button
                type="button"
                className={styles.tableAddRowButton}
                onClick={handleElemAddRow}
              >
                <img src={plusIcon} alt="" className={styles.addRowImg} />
              </button>
            )}
          </div>
        </div>
      )}

      {elementsLoaded && !elementsLoading && (
        <>
          <div className={`${styles.buttonContainer} ${styles.figuresButtonContainer}`}>
            <button
              className={`${styles.actionButton} ${figuresLoaded ? styles.completed : ''} ${figuresLoading ? styles.loading : ''}`}
              onClick={handleComposeFigures}
              disabled={figuresLoading}
            >
              Составить фигуры для подачи заявки
            </button>

            {figuresLoaded && (
              <button
                className={`${styles.actionButton}`}
                onClick={handleAddFigure}
              >
                <img src={plusIcon} alt="" className={styles.buttonIcon} aria-hidden="true" />
                Добавить фигуру
              </button>
            )}

            {figuresLoaded && (
              <button
                className={`${styles.actionButton} ${isFiguresEdit ? styles.tableButtonActive : ''}`}
                onClick={toggleFiguresEdit}
                disabled={figuresLoading}
              >
                <img
                  src={penIcon}
                  alt=""
                  className={`${styles.buttonIcon} ${isFiguresEdit ? styles.editIcon : ''}`}
                  aria-hidden="true"
                />
                Редактировать
              </button>
            )}

            {isFiguresEdit && (
              <button
                className={`${styles.actionButton} ${styles.finishEditButton}`}
                onClick={() => setFigSaveModal(true)}
              >
                Завершить редактирование
              </button>
            )}
          </div>

          {(figuresLoading || figuresLoaded) && (
            <div className={styles.figuresList}>
              {figuresLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className={styles.figureBlock}>
                    <div className={styles.figureLabelRow}>
                      <div className={styles.skeletonLabel} />
                    </div>
                    <div className={`${styles.drawingPlaceholder} ${styles.skeletonDrawing}`} />
                    <div className={styles.figureDescriptionBox}>
                      <div className={styles.skeletonCell} style={{ height: 48 }} />
                    </div>
                  </div>
                ))
                : figures.map((figure, figIdx) => (
                  <div key={figure.id} className={styles.figureBlock}>
                    <div className={styles.figureLabelRow}>
                      <span className={styles.figureLabel}>Фиг. {figIdx + 1}</span>
                      {isFiguresEdit && (
                        <button
                          type="button"
                          className={styles.deleteFigureButton}
                          onClick={() => handleDeleteFigure(figIdx)}
                          aria-label="Удалить фигуру"
                        >
                          <img src={deleteIcon} alt="" className={styles.deleteRowIcon} />
                          Удалить фигуру
                        </button>
                      )}
                    </div>

                    <div className={styles.drawingPlaceholder}>
                      <span className={styles.drawingPlaceholderText}>Место для чертежа</span>
                    </div>

                    <div className={styles.figureDescriptionBox}>
                      {isFiguresEdit ? (
                        <textarea
                          value={figure.description}
                          onChange={(e) => handleFigDescChange(figIdx, e.target.value)}
                          className={styles.figureDescriptionTextarea}
                        />
                      ) : (
                        <p className={styles.figureDescriptionText}>{figure.description}</p>
                      )}
                    </div>
                    <p className={styles.figureElementsTitle}>
                      Элементы на фиг. {figIdx + 1}
                    </p>

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.colCheck}></th>
                            <th className={styles.colNumber}>№</th>
                            <th>Части изобретения</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elements.map((el, idx) => {
                            const checked = figure.element_ids.includes(el.id)
                            return (
                              <tr key={el.id} className={checked ? styles.checkedRow : ''}>
                                <td className={styles.colCheck}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => handleCheckbox(figIdx, el.id, e.target.checked)}
                                    className={styles.checkbox}
                                    disabled={!isFiguresEdit}
                                  />
                                </td>
                                <td className={styles.colNumber}>{idx + 1}</td>
                                <td>{el.description}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}

      {figuresLoaded && (
        <div className={styles.exportButtonContainer}>
          <button
            className={styles.exportButton}
            onClick={() => showWarning('Экспорт в DOCX будет доступен после подключения бэкенда')}
          >
            Экспорт в DOCX
          </button>
          <button
            className={styles.exportButton}
            onClick={() => showWarning('Экспорт в XLSX будет доступен после подключения бэкенда')}
          >
            Экспорт в XLSX
          </button>
        </div>
      )}

      <SaveResetWindow
        isOpen={elemSaveModal}
        onClose={() => setElemSaveModal(false)}
        onSave={handleSaveElements}
        onReset={handleResetElements}
      />

      <SaveResetWindow
        isOpen={figSaveModal}
        onClose={() => setFigSaveModal(false)}
        onSave={handleSaveFigures}
        onReset={handleResetFigures}
      />
    </div>
  )
}
