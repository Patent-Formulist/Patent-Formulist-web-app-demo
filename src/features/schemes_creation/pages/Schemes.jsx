import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import SaveResetWindow from '../../../components/SaveResetWindow/SaveResetWindow.jsx'
import styles from '../styles/Schemes.module.css'
import authService from '../../../services/auth/authService.js'
import patentService from '../../../services/patent/patentService.js'
import { API_DRAWINGS_ENDPOINTS } from '../../../services/apiConfig'
import penIcon from '../../../resources/pen.svg'
import plusIcon from '../../../resources/plus.svg'
import deleteIcon from '../../../resources/red-bin.svg'

const INTRO_PHRASE = /^(состоит из[:,]?|содержит[:,]?|включает[:,]?)\s*/i
const INTRO_PHRASE_ONLY = /^(состоит из[:,]?|содержит[:,]?|включает[:,]?)$/i
const TEMP_ID = { ELEMENT: 'el-new-', FIGURE: 'fig-new-' }

const apiHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${authService.getAccessToken()}`,
})

const formatApiError = (payload, status) => {
  const { detail } = payload ?? {}
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).filter(Boolean).join('; ') || `Ошибка ${status}`
  }
  return `Ошибка ${status}`
}

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, { ...options, headers: apiHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(formatApiError(err, res.status))
  }
  if (res.status === 204) return null
  return res.json()
}

const isTempId = (id, prefix) => String(id).startsWith(prefix)
const snapshotsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const cloneElements = (list) => (list ?? []).map((el) => ({ ...el }))
const cloneFigures = (list) => (list ?? []).map((f) => ({
  ...f,
  element_ids: [...(f.element_ids ?? [])],
}))

const computeDiff = (snapshot, current, tempPrefix, isModified) => {
  const snap = snapshot ?? []
  const currentIds = new Set(current.map((item) => item.id))
  return {
    deleted: snap.filter((item) => !currentIds.has(item.id) && !isTempId(item.id, tempPrefix)),
    added: current.filter((item) => isTempId(item.id, tempPrefix)),
    modified: current.filter((item) => {
      if (isTempId(item.id, tempPrefix)) return false
      const orig = snap.find((s) => s.id === item.id)
      return orig && isModified(item, orig)
    }),
  }
}

const normalizeElement = (el) => ({
  id: el.id,
  description: el.description ?? '',
})

const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1).trimEnd()

const parseImportedElements = (text) => {
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(INTRO_PHRASE, '')
    .replace(/([.;])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = []
  let current = ''
  const words = normalized.split(' ')

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const prevWord = words[i - 1] ?? ''
    const isFirstWord = current.trim() === ''
    const splitHere = !isFirstWord && (
      prevWord.endsWith(';')
      || prevWord.endsWith('.')
      || (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase())
    )

    if (splitHere) {
      const trimmed = current.trim().replace(/[;,.]$/, '').trim()
      if (trimmed) parts.push(trimmed)
      current = `${word} `
    } else {
      current += `${word} `
    }
  }

  const last = current.trim().replace(/[;,.]$/, '').trim()
  if (last) parts.push(last)

  return parts
    .filter((s) => !INTRO_PHRASE_ONLY.test(s.trim()))
    .map((description) => capitalizeFirst(description.replace(INTRO_PHRASE, '')))
}

const normalizeFigure = (fig, elements) => {
  const elementIds = (fig.elements ?? [])
    .map((fe) => {
      const byId = elements.find((e) => e.id === fe.id)
      if (byId) return byId.id
      const byDesc = elements.find((e) =>
        e.description.toLowerCase().includes(fe.description.toLowerCase().slice(0, 10))
      )
      return byDesc?.id ?? null
    })
    .filter(Boolean)
  return { id: fig.id, title: fig.title ?? '', element_ids: elementIds }
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

function useEditSession(clone) {
  const snapshotRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const beginEdit = useCallback((data) => {
    snapshotRef.current = clone(data)
    setIsEditing(true)
  }, [clone])

  const requestClose = useCallback(() => setSaveModalOpen(true), [])

  const toggleEdit = useCallback((data) => {
    if (isEditing) {
      requestClose()
      return
    }
    beginEdit(data)
  }, [isEditing, beginEdit, requestClose])

  const dismissModal = useCallback(() => setSaveModalOpen(false), [])

  const exitEdit = useCallback(() => {
    setIsEditing(false)
    setSaveModalOpen(false)
  }, [])

  const resetToSnapshot = useCallback((setData) => {
    dismissModal()
    setIsEditing(false)
    if (snapshotRef.current) setData(clone(snapshotRef.current))
  }, [clone, dismissModal])

  return {
    snapshotRef,
    isEditing,
    setIsEditing,
    saveModalOpen,
    setSaveModalOpen,
    beginEdit,
    toggleEdit,
    requestClose,
    dismissModal,
    exitEdit,
    resetToSnapshot,
  }
}

export default function Schemes() {
  const { id } = useParams()
  const { showSuccess, showWarning, showError } = useToast()

  const [elements, setElements] = useState([])
  const [elementsLoading, setElementsLoading] = useState(false)
  const [elementsLoaded, setElementsLoaded] = useState(false)
  const [elemRowHeights, setElemRowHeights] = useState([])
  const [elemHeaderH, setElemHeaderH] = useState(0)
  const elemRowRefs = useRef([])
  const elemHeaderRef = useRef(null)
  const dragIndexRef = useRef(null)
  const elementsEdit = useEditSession(cloneElements)

  const [figures, setFigures] = useState([])
  const [figuresLoading, setFiguresLoading] = useState(false)
  const [figuresLoaded, setFiguresLoaded] = useState(false)
  const figuresEdit = useEditSession(cloneFigures)

  const fetchElements = useCallback(async () => {
    const data = await apiFetch(API_DRAWINGS_ENDPOINTS.ELEMENTS(id))
    return (data.elements ?? []).map(normalizeElement)
  }, [id])

  const fetchFigures = useCallback(async (elems) => {
    const data = await apiFetch(API_DRAWINGS_ENDPOINTS.FIGURES(id))
    return (data.figures ?? []).map((f) => normalizeFigure(f, elems))
  }, [id])

  useEffect(() => {
    const init = async () => {
      try {
        const elems = await fetchElements()
        if (elems.length === 0) return
        setElements(elems)
        setElementsLoaded(true)
        try {
          const figs = await fetchFigures(elems)
          if (figs.length > 0) {
            setFigures(figs)
            setFiguresLoaded(true)
          }
        } catch { /* фигуры необязательны при загрузке */ }
      } catch { /* пустое состояние до импорта */ }
    }
    init()
  }, [id, fetchElements, fetchFigures])

  useEffect(() => {
    if (!elementsEdit.isEditing) return
    const update = () => {
      setElemRowHeights(elemRowRefs.current.map((r) => r?.getBoundingClientRect().height || 48))
      setElemHeaderH(elemHeaderRef.current?.getBoundingClientRect().height || 48)
    }
    update()
    const observers = elemRowRefs.current.map((row) => {
      if (!row) return null
      const observer = new ResizeObserver(update)
      observer.observe(row)
      return observer
    })
    return () => observers.forEach((o) => o?.disconnect())
  }, [elementsEdit.isEditing, elements])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (elementsEdit.isEditing) {
        e.preventDefault()
        elementsEdit.requestClose()
      } else if (figuresEdit.isEditing) {
        e.preventDefault()
        figuresEdit.requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [elementsEdit.isEditing, elementsEdit.requestClose, figuresEdit.isEditing, figuresEdit.requestClose])

  const handleImportElements = async () => {
    if (elementsLoaded) {
      showWarning('Список уже составлен')
      return
    }
    setElementsLoading(true)
    try {
      const patent = await patentService.getPatent(id)
      const construction = (patent.construction ?? '').trim()
      if (!construction) {
        showWarning('Заполните поле «Конструкция» в описании изобретения')
        return
      }

      const descriptions = parseImportedElements(construction)
      if (descriptions.length === 0) {
        showWarning('Не удалось выделить составные части из конструкции')
        return
      }

      const data = await apiFetch(API_DRAWINGS_ENDPOINTS.IMPORT(id), {
        method: 'POST',
        body: JSON.stringify({ elements: descriptions }),
      })
      setElements((data.elements ?? []).map(normalizeElement))
      setElementsLoaded(true)
      showSuccess('Список составных частей сформирован')
    } catch (err) {
      showError(err.message || 'Ошибка загрузки')
    } finally {
      setElementsLoading(false)
    }
  }

  const handleSaveElements = async () => {
    const snapshot = elementsEdit.snapshotRef.current
    const changed = !snapshotsEqual(snapshot, elements)
    elementsEdit.exitEdit()

    if (!changed) {
      showSuccess('Изменения сохранены')
      return
    }

    setElementsLoading(true)
    setFigures([])
    setFiguresLoaded(false)
    figuresEdit.exitEdit()

    const { deleted, added, modified } = computeDiff(
      snapshot,
      elements,
      TEMP_ID.ELEMENT,
      (el, orig) => orig.description !== el.description,
    )

    try {
      await Promise.all([
        ...deleted.map((el) => apiFetch(API_DRAWINGS_ENDPOINTS.ELEMENT(id, el.id), { method: 'DELETE' })),
        ...modified.map((el) => apiFetch(API_DRAWINGS_ENDPOINTS.ELEMENT(id, el.id), {
          method: 'PUT',
          body: JSON.stringify({ description: el.description }),
        })),
        ...added.map((el, i) => apiFetch(API_DRAWINGS_ENDPOINTS.ELEMENTS(id), {
          method: 'POST',
          body: JSON.stringify({
            number: (snapshot ?? []).length + i + 1,
            description: el.description,
          }),
        })),
      ])

      let freshElems = await fetchElements()
      const orderChanged = !snapshotsEqual(
        elements.map((e) => e.id),
        (snapshot ?? []).map((e) => e.id),
      )

      if (orderChanged) {
        const idByDescription = new Map(freshElems.map((e) => [e.description, e.id]))
        const orderedIds = elements.map((e) => idByDescription.get(e.description)).filter(Boolean)
        if (orderedIds.length > 0) {
          await apiFetch(API_DRAWINGS_ENDPOINTS.ELEMENTS_REORDER(id), {
            method: 'POST',
            body: JSON.stringify({ element_ids: orderedIds }),
          })
          freshElems = await fetchElements()
        }
      }

      setElements(freshElems)
      showSuccess('Изменения сохранены. Фигуры нужно составить заново.')
    } catch (err) {
      showError(err.message || 'Ошибка сохранения')
      setElements(snapshot ?? [])
      elementsEdit.setIsEditing(true)
    } finally {
      setElementsLoading(false)
    }
  }

  const handleResetElements = () => {
    elementsEdit.resetToSnapshot(setElements)
    showSuccess('Данные сброшены')
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    const from = dragIndexRef.current
    if (from === null || from === index) return
    setElements((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(index, 0, moved)
      dragIndexRef.current = index
      return next
    })
  }

  const handleComposeFigures = async () => {
    if (figuresLoaded) {
      showWarning('Фигуры уже составлены')
      return
    }
    if (!elementsLoaded) {
      showWarning('Сначала составьте список частей изобретения')
      return
    }
    setFiguresLoading(true)
    try {
      const figs = await fetchFigures(elements)
      setFigures(figs)
      setFiguresLoaded(true)
      showSuccess(figs.length > 0 ? 'Фигуры загружены' : 'Список фигур пуст — добавьте первую')
    } catch (err) {
      showError(err.message || 'Ошибка загрузки')
    } finally {
      setFiguresLoading(false)
    }
  }

  const beginFiguresEdit = () => {
    if (!figuresEdit.isEditing) figuresEdit.beginEdit(figures)
  }

  const handleAddFigure = () => {
    beginFiguresEdit()
    setFigures((prev) => [
      ...prev,
      { id: `${TEMP_ID.FIGURE}${Date.now()}`, title: '', element_ids: [] },
    ])
    if (!figuresLoaded) setFiguresLoaded(true)
  }

  const handleSaveFigures = async () => {
    const snapshot = figuresEdit.snapshotRef.current ?? []
    const changed = !snapshotsEqual(snapshot, figures)
    figuresEdit.exitEdit()

    if (!changed) {
      showSuccess('Изменения сохранены')
      return
    }

    const figureModified = (fig, orig) =>
      orig.title !== fig.title
      || !snapshotsEqual(orig.element_ids, fig.element_ids)

    const { deleted, added, modified } = computeDiff(
      snapshot,
      figures,
      TEMP_ID.FIGURE,
      figureModified,
    )

    try {
      await Promise.all([
        ...deleted.map((fig) => apiFetch(API_DRAWINGS_ENDPOINTS.FIGURE(id, fig.id), { method: 'DELETE' })),
        ...modified.map((fig) => apiFetch(API_DRAWINGS_ENDPOINTS.FIGURE(id, fig.id), {
          method: 'PUT',
          body: JSON.stringify({ title: fig.title, element_ids: fig.element_ids }),
        })),
        ...added.map((fig, i) => apiFetch(API_DRAWINGS_ENDPOINTS.FIGURES(id), {
          method: 'POST',
          body: JSON.stringify({
            number: snapshot.length + i + 1,
            title: fig.title,
            element_ids: fig.element_ids,
          }),
        })),
      ])
      setFigures(await fetchFigures(elements))
      showSuccess('Изменения сохранены')
    } catch (err) {
      showError(err.message || 'Ошибка сохранения')
      setFigures(cloneFigures(snapshot))
      figuresEdit.setIsEditing(true)
    }
  }

  const handleResetFigures = () => {
    figuresEdit.resetToSnapshot(setFigures)
    showSuccess('Данные сброшены')
  }

  const handleExport = async (format) => {
    try {
      const res = await fetch(API_DRAWINGS_ENDPOINTS.EXPORT(id), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ format }),
      })
      if (!res.ok) throw new Error(`Ошибка ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `drawings_${id}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess(`Файл ${format.toUpperCase()} скачан`)
    } catch (err) {
      showError(err.message || 'Ошибка экспорта')
    }
  }

  const actionButtonClass = (active, loading, completed) =>
    [
      styles.actionButton,
      active && styles.tableButtonActive,
      loading && styles.loading,
      completed && styles.completed,
    ].filter(Boolean).join(' ')

  return (
    <div className={styles.container}>
      <div className={styles.buttonContainer}>
        <button
          type="button"
          className={actionButtonClass(false, elementsLoading, elementsLoaded)}
          onClick={handleImportElements}
          disabled={elementsLoading}
        >
          Составить список составных частей изобретения
        </button>

        {elementsLoaded && (
          <button
            type="button"
            className={actionButtonClass(elementsEdit.isEditing, elementsLoading)}
            onClick={() => elementsEdit.toggleEdit(elements)}
            disabled={elementsLoading}
          >
            <img
              src={penIcon}
              alt=""
              className={`${styles.buttonIcon} ${elementsEdit.isEditing ? styles.editIcon : ''}`}
              aria-hidden="true"
            />
            Редактировать
          </button>
        )}

        {elementsEdit.isEditing && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.finishEditButton}`}
            onClick={elementsEdit.requestClose}
          >
            Завершить редактирование
          </button>
        )}
      </div>

      {(elementsLoading || elementsLoaded) && (
        <div className={styles.tableSection}>
          {elementsEdit.isEditing && (
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
                    onClick={() => setElements((prev) => prev.filter((_, i) => i !== index))}
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
                  {elementsLoading ? (
                    <SkeletonRows cols={2} count={5} />
                  ) : (
                    elements.map((el, index) => (
                      <tr
                        key={el.id}
                        ref={(r) => { elemRowRefs.current[index] = r }}
                        draggable={elementsEdit.isEditing}
                        onDragStart={() => { dragIndexRef.current = index }}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={() => { dragIndexRef.current = null }}
                        className={elementsEdit.isEditing ? styles.draggableRow : ''}
                      >
                        <td className={styles.colNumber}>{index + 1}</td>
                        <td>
                          {elementsEdit.isEditing ? (
                            <input
                              type="text"
                              value={el.description}
                              onChange={(e) => setElements((prev) =>
                                prev.map((item, i) => i === index
                                  ? { ...item, description: e.target.value }
                                  : item)
                              )}
                              className={styles.cellInput}
                            />
                          ) : el.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {elementsEdit.isEditing && (
              <button
                type="button"
                className={styles.tableAddRowButton}
                onClick={() => setElements((prev) => [
                  ...prev,
                  { id: `${TEMP_ID.ELEMENT}${Date.now()}`, description: '' },
                ])}
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
              type="button"
              className={actionButtonClass(false, figuresLoading, figuresLoaded)}
              onClick={handleComposeFigures}
              disabled={figuresLoading}
            >
              Составить фигуры для подачи заявки
            </button>

            {figuresLoaded && (
              <>
                <button type="button" className={styles.actionButton} onClick={handleAddFigure}>
                  <img src={plusIcon} alt="" className={styles.buttonIcon} aria-hidden="true" />
                  Добавить фигуру
                </button>

                <button
                  type="button"
                  className={actionButtonClass(figuresEdit.isEditing, figuresLoading)}
                  onClick={() => figuresEdit.toggleEdit(figures)}
                  disabled={figuresLoading}
                >
                  <img
                    src={penIcon}
                    alt=""
                    className={`${styles.buttonIcon} ${figuresEdit.isEditing ? styles.editIcon : ''}`}
                    aria-hidden="true"
                  />
                  Редактировать
                </button>
              </>
            )}

            {figuresEdit.isEditing && (
              <button
                type="button"
                className={`${styles.actionButton} ${styles.finishEditButton}`}
                onClick={figuresEdit.requestClose}
              >
                Завершить редактирование
              </button>
            )}
          </div>

          {(figuresLoading || figuresLoaded) && (
            <div className={styles.figuresList}>
              {figuresLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
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
              ) : (
                figures.map((figure, figIdx) => (
                  <div key={figure.id} className={styles.figureBlock}>
                    <div className={styles.figureLabelRow}>
                      <span className={styles.figureLabel}>Фиг. {figIdx + 1}</span>
                      {figuresEdit.isEditing && (
                        <button
                          type="button"
                          className={styles.deleteFigureButton}
                          onClick={() => setFigures((prev) => prev.filter((_, i) => i !== figIdx))}
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
                      {figuresEdit.isEditing ? (
                        <textarea
                          value={figure.title}
                          onChange={(e) => setFigures((prev) =>
                            prev.map((f, i) => i === figIdx ? { ...f, title: e.target.value } : f)
                          )}
                          className={styles.figureDescriptionTextarea}
                        />
                      ) : (
                        <p className={styles.figureDescriptionText}>{figure.title}</p>
                      )}
                    </div>

                    <p className={styles.figureElementsTitle}>
                      Элементы на фиг. {figIdx + 1}
                    </p>

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.colCheck} />
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
                                    onChange={(e) => setFigures((prev) => prev.map((f, i) => {
                                      if (i !== figIdx) return f
                                      const ids = e.target.checked
                                        ? [...f.element_ids, el.id]
                                        : f.element_ids.filter((eid) => eid !== el.id)
                                      return { ...f, element_ids: ids }
                                    }))}
                                    className={styles.checkbox}
                                    disabled={!figuresEdit.isEditing}
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
              )}
            </div>
          )}
        </>
      )}

      {figuresLoaded && (
        <div className={styles.exportButtonContainer}>
          <button type="button" className={styles.exportButton} onClick={() => handleExport('docx')}>
            Экспорт в DOCX
          </button>
          <button type="button" className={styles.exportButton} onClick={() => handleExport('xlsx')}>
            Экспорт в XLSX
          </button>
        </div>
      )}

      <SaveResetWindow
        isOpen={elementsEdit.saveModalOpen}
        onClose={elementsEdit.dismissModal}
        onSave={handleSaveElements}
        onReset={handleResetElements}
      />

      <SaveResetWindow
        isOpen={figuresEdit.saveModalOpen}
        onClose={figuresEdit.dismissModal}
        onSave={handleSaveFigures}
        onReset={handleResetFigures}
      />
    </div>
  )
}
