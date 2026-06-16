import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import { useReference } from '../../../contexts/ReferenceContext'
import { TASK_STATUS } from '../../../services/reference/referenceService'
import SaveResetWindow from '../../../components/SaveResetWindow/SaveResetWindow.jsx'
import styles from '../styles/ApplicationPreparation.module.css'
import authService from '../../../services/auth/authService.js'
import { API_APPLICATION_ENDPOINTS } from '../../../services/apiConfig'
import penIcon from '../../../resources/pen.svg'
import applicationIcon from '../../../resources/application.svg'
import arrowIcon from '../../../resources/arrow.svg'
import plusIcon from '../../../resources/plus.svg'
import deleteIcon from '../../../resources/red-bin.svg'

const TABS = [
  { key: 'abstract', label: 'Реферат' },
  { key: 'claims', label: 'Формула изобретения' },
  { key: 'description', label: 'Описание изобретения' },
]

const POLLING_INTERVAL = 3000
const POLLING_TIMEOUT = 65000

const stripClaimNumbering = (text) =>
  String(text ?? '').replace(/^\d+\.\s*/, '').trim()

const normalizeClaims = (claims) => (claims ?? []).map(stripClaimNumbering)

const BOLD_HEADER_LINE = /^\s*\*\*[^*]+\*\*\s*$/
const ABSTRACT_TITLE = /^\s*(\*{1,2}\s*)?Реферат(\s*\*{1,2})?\s*:?\s*$/i
const ABSTRACT_TITLE_PREFIX = /^\s*(\*{1,2}\s*)?Реферат(\s*\*{1,2})?\s*:?\s*/

const normalizeAbstract = (text) => String(text ?? '')
  .split('\n')
  .filter((line) => !ABSTRACT_TITLE.test(line))
  .join('\n')
  .replace(new RegExp(`^${ABSTRACT_TITLE_PREFIX.source}`, 'i'), '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const normalizeDescription = (text) => String(text ?? '')
  .split('\n')
  .filter((line) => !BOLD_HEADER_LINE.test(line))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

function SkeletonBlock({ lines = 6 }) {
  return (
    <div className={styles.skeletonBlock}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={styles.skeletonLine} style={{ width: `${70 + Math.sin(i * 1.5) * 20}%` }} />
      ))}
    </div>
  )
}

function ClaimItem({
  claim, index, isEditing,
  onChange, onDelete, onMoveUp, onMoveDown,
  isFirst, isLast,
  color, isIndependent, dependsOn,
}) {
  return (
    <div
      className={styles.claimItem}
      style={color ? { borderLeftColor: color, borderLeftWidth: '3px' } : undefined}
    >
      <div className={styles.claimHeader}>
        <div className={styles.claimNumberRow}>
          <span
            className={`${styles.claimNumber} ${isIndependent ? styles.claimNumberIndependent : styles.claimNumberDependent}`}
            style={color ? { backgroundColor: color + '22', color } : undefined}
          >
            {index + 1}
          </span>

          {isIndependent && color && (
            <span
              className={styles.claimIndependentBadge}
              style={{ color, borderColor: color + '66' }}
            >
              независимый
            </span>
          )}
          {!isIndependent && dependsOn?.length > 0 && (
            <span className={styles.claimDependsOnBadge}>
              по п.&nbsp;{dependsOn.join(', ')}
            </span>
          )}
        </div>

        {isEditing && (
          <div className={styles.claimActions}>
            <button
              type="button"
              className={styles.claimActionBtn}
              onClick={onMoveUp}
              disabled={isFirst}
              title="Переместить вверх"
            >
              <img src={arrowIcon} alt="" className={styles.claimActionIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.claimActionBtn}
              onClick={onMoveDown}
              disabled={isLast}
              title="Переместить вниз"
            >
              <img
                src={arrowIcon}
                alt=""
                className={`${styles.claimActionIcon} ${styles.claimArrowDown}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className={`${styles.claimActionBtn} ${styles.claimDeleteBtn}`}
              onClick={onDelete}
              title="Удалить пункт"
            >
              <img src={deleteIcon} alt="" className={styles.claimActionIcon} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <textarea
          value={claim}
          onChange={(e) => onChange(e.target.value)}
          className={styles.claimTextarea}
          rows={3}
        />
      ) : (
        <p className={styles.claimText}>{claim}</p>
      )}
    </div>
  )
}

export default function Application() {
  const { id } = useParams()
  const { updateApplicationTask } = useReference()
  const { showSuccess, showWarning, showError } = useToast()
  const [activeTab, setActiveTab] = useState('abstract')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const snapshotRef = useRef(null)
  const [abstract, setAbstract] = useState('')
  const [claims, setClaims] = useState([])
  const [description, setDescription] = useState('')

  const [graphData, setGraphData] = useState(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [editingGraph, setEditingGraph] = useState([])
  const [selectedParent, setSelectedParent] = useState('')

  const pollingRef = useRef(null)
  const pollingStartRef = useRef(null)

  const syncFromData = useCallback((d) => {
    setAbstract(normalizeAbstract(d.abstract))
    setClaims(normalizeClaims(d.claims))
    setDescription(normalizeDescription(d.description))
  }, [])

  const fetchClaimsGraph = useCallback(async () => {
    setGraphLoading(true)
    try {
      const response = await fetch(API_APPLICATION_ENDPOINTS.CLAIMS_GRAPH(id), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAccessToken()}` },
      })
      if (!response.ok) {
        setGraphData(null)
        setEditingGraph([])
        return
      }
      const graph = await response.json()
      setGraphData(graph)
      setEditingGraph(graph.claims.map((claim) => ({ ...claim })))
    } catch {
      setGraphData(null)
    } finally {
      setGraphLoading(false)
    }
  }, [id])

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(API_APPLICATION_ENDPOINTS.APPLICATION(id), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAccessToken()}` },
      })
      if (!response.ok) return null
      const result = await response.json()
      setData(result)
      syncFromData(result)
      return result
    } catch {
      return null
    }
  }, [id, syncFromData])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const result = await fetchApplication()
      setLoading(false)
      if (result?.claims?.length) {
        fetchClaimsGraph()
      }
    }
    init()
  }, [fetchApplication, fetchClaimsGraph])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    pollingStartRef.current = Date.now()
    pollingRef.current = setInterval(async () => {
      if (Date.now() - pollingStartRef.current > POLLING_TIMEOUT) {
        stopPolling()
        setGenerating(false)
        showError('Превышено время ожидания генерации. Попробуйте ещё раз.')
        return
      }
      const result = await fetchApplication()
      if (result && result.abstract && result.claims?.length && result.description) {
        stopPolling()
        setGenerating(false)

        updateApplicationTask(id, {
          status: TASK_STATUS.SUCCESS,
          data: result,
          error: null,
        })

        showSuccess('Документы успешно сгенерированы')
        setGraphData(null)
        fetchClaimsGraph()
      }
    }, POLLING_INTERVAL)
  }, [fetchApplication, fetchClaimsGraph, stopPolling, showSuccess, showError])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || !isEditing) return
      e.preventDefault()
      setSaveModalOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditing])

  const handleGenerate = async () => {
    if (generating) return
    if (data && !data.is_outdated) {
      showWarning('Документы уже сгенерированы. Данные актуальны.')
      return
    }
    setGenerating(true)
    updateApplicationTask(id, {
      status: TASK_STATUS.RUNNING,
      data: null,
      error: null,
    })
    try {
      const response = await fetch(API_APPLICATION_ENDPOINTS.GENERATE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAccessToken()}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Ошибка ${response.status}`)
      }
      startPolling()
    } catch (err) {
      setGenerating(false)
      showError(err.message || 'Ошибка запуска генерации')
    }
  }

  const beginEdit = () => {
    snapshotRef.current = {
      abstract,
      claims: [...claims],
      description,
      editingGraph: editingGraph.map((claim) => ({ ...claim })),
    }
    setIsEditing(true)
  }

  const toggleEdit = () => {
    if (isEditing) {
      setSaveModalOpen(true)
    } else {
      beginEdit()
    }
  }

  const handleSave = async () => {
    setIsEditing(false)
    setSaveModalOpen(false)
    try {
      const response = await fetch(API_APPLICATION_ENDPOINTS.APPLICATION(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getAccessToken()}` },
        body: JSON.stringify({
          abstract: normalizeAbstract(abstract),
          claims: normalizeClaims(claims),
          description: normalizeDescription(description),
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Ошибка ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      syncFromData(result)
      showSuccess('Изменения сохранены')
      setGraphData(null)
      fetchClaimsGraph()
    } catch (err) {
      showError(err.message || 'Ошибка сохранения')
      const snap = snapshotRef.current
      if (snap) {
        setAbstract(snap.abstract)
        setClaims(snap.claims)
        setDescription(snap.description)
        setEditingGraph(snap.editingGraph)
      }
      setIsEditing(true)
    }
  }

  const handleReset = () => {
    const snap = snapshotRef.current
    if (snap) {
      setAbstract(snap.abstract)
      setClaims(snap.claims)
      setDescription(snap.description)
      setEditingGraph(snap.editingGraph)
    }
    setIsEditing(false)
    setSaveModalOpen(false)
    showSuccess('Данные сброшены')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(API_APPLICATION_ENDPOINTS.EXPORT(id), {
        method: 'POST',
        headers: { Authorization: `Bearer ${authService.getAccessToken()}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Ошибка ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `patent_application_${id}.docx`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('Файл DOCX скачан')
    } catch (err) {
      showError(err.message || 'Ошибка экспорта')
    } finally {
      setExporting(false)
    }
  }

  const addClaim = () => {
    if (!isEditing) beginEdit()
    setClaims((prev) => [...prev, ''])
    setEditingGraph((prev) => [
      ...prev,
      {
        number: prev.length + 1,
        text: '',
        is_independent: true,
        depends_on: [],
        family: prev.length + 1,
        color: null,
      },
    ])
  }

  const addSubClaim = () => {
    if (!selectedParent) return

    const parent = editingGraph.find((claim) => claim.number === selectedParent)
    if (!parent) return

    let insertIndex = parent.number - 1
    editingGraph.forEach((claim, index) => {
      if (claim.number === parent.number || claim.depends_on.includes(parent.number)) {
        insertIndex = index
      }
    })

    const prefillText = `по п. ${parent.number}, отличающийся тем, что `

    setClaims((prev) => {
      const next = [...prev]
      next.splice(insertIndex + 1, 0, prefillText)
      return next
    })

    setEditingGraph((prev) => {
      const next = prev.map((claim) => ({ ...claim }))
      next.splice(insertIndex + 1, 0, {
        number: insertIndex + 2,
        text: prefillText,
        is_independent: false,
        depends_on: [parent.number],
        family: parent.family,
        color: parent.color,
      })
      return next.map((claim, idx) => ({ ...claim, number: idx + 1 }))
    })

    setSelectedParent('')
  }

  const updateClaim = (index, value) => setClaims((prev) => prev.map((c, i) => (i === index ? value : c)))

  const deleteClaim = (index) => {
    setClaims((prev) => prev.filter((_, i) => i !== index))
    setEditingGraph((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((claim, idx) => ({ ...claim, number: idx + 1 }))
    )
  }

  const moveClaim = (index, direction) => {
    const target = index + direction
    setClaims((prev) => {
      const next = [...prev]
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setEditingGraph((prev) => {
      if (target < 0 || target >= prev.length) return prev
      const next = prev.map((claim) => ({ ...claim }));
      [next[index], next[target]] = [next[target], next[index]]
      return next.map((claim, idx) => ({ ...claim, number: idx + 1 }))
    })
  }

  const hasData = data && (abstract || claims.length > 0 || description)
  const isOutdated = data?.is_outdated

  const generateBtnClass = [
    styles.actionButton,
    generating && styles.loading,
    hasData && !isOutdated && styles.completed,
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.container}>
      <div className={`${styles.buttonContainer} ${isEditing ? styles.editing : ''}`}>
        <button
          type="button"
          className={generateBtnClass}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Генерация...' : hasData && !isOutdated ? 'Документы сгенерированы' : 'Сгенерировать заявку'}
        </button>

        {hasData && (
          <>
            <button
              type="button"
              className={`${styles.actionButton} ${isEditing ? styles.tableButtonActive : ''}`}
              onClick={toggleEdit}
              disabled={generating}
            >
              <img
                src={penIcon}
                alt=""
                className={`${styles.buttonIcon} ${isEditing ? styles.editIcon : ''}`}
                aria-hidden="true"
              />
              Редактировать
            </button>

            <button
              type="button"
              className={`${styles.actionButton} ${isEditing ? styles.inactive : ''} ${exporting ? styles.loading : ''}`}
              onClick={handleExport}
              disabled={exporting || isEditing}
            >
              Экспорт в DOCX
            </button>
          </>
        )}

        {isEditing && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.finishEditButton}`}
            onClick={() => setSaveModalOpen(true)}
          >
            Завершить редактирование
          </button>
        )}

        {isOutdated && !generating && (
          <span className={styles.outdatedBadge}>
            Данные карточки изменились — рекомендуется перегенерировать
          </span>
        )}
      </div>

      {(loading || generating || hasData) && (
        <div className={styles.card}>
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'abstract' && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Реферат</h3>
                </div>
                {loading || generating ? (
                  <SkeletonBlock lines={5} />
                ) : isEditing ? (
                  <textarea
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className={styles.mainTextarea}
                    rows={8}
                  />
                ) : (
                  <p className={styles.mainText}>{abstract}</p>
                )}
              </div>
            )}

            {activeTab === 'claims' && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Формула изобретения</h3>
                  {isEditing && (
                    <div className={styles.addClaimButtons}>
                      <button
                        type="button"
                        className={styles.addClaimButton}
                        onClick={addClaim}
                      >
                        <img src={plusIcon} alt="" className={styles.addClaimIcon} aria-hidden="true" />
                        Добавить пункт
                      </button>

                      <select
                        className={styles.subClaimSelect}
                        value={selectedParent}
                        onChange={(e) => setSelectedParent(Number(e.target.value))}
                      >
                        <option value="">Выберите пункт</option>
                        {editingGraph
                          .filter((claim) => claim.is_independent)
                          .map((claim) => (
                            <option key={claim.number} value={claim.number}>
                              Пункт {claim.number}
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        className={styles.addClaimButton}
                        disabled={!selectedParent}
                        onClick={addSubClaim}
                      >
                        <img src={plusIcon} alt="" className={styles.addClaimIcon} aria-hidden="true" />
                        Добавить подпункт
                      </button>
                    </div>
                  )}
                </div>

                {loading || generating ? (
                  <div className={styles.claimsList}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={styles.claimItem}>
                        <SkeletonBlock lines={3} />
                      </div>
                    ))}
                  </div>
                ) : claims.length === 0 ? (
                  <p className={styles.emptyHint}>Пункты формулы отсутствуют</p>
                ) : (
                  <div className={styles.claimsList}>
                    {claims.map((claim, index) => {
                      const graphClaim = editingGraph.find((c) => c.number === index + 1)
                      return (
                        <ClaimItem
                          key={index}
                          claim={claim}
                          index={index}
                          isEditing={isEditing}
                          onChange={(val) => updateClaim(index, val)}
                          onDelete={() => deleteClaim(index)}
                          onMoveUp={() => moveClaim(index, -1)}
                          onMoveDown={() => moveClaim(index, 1)}
                          isFirst={index === 0}
                          isLast={index === claims.length - 1}
                          color={graphClaim?.color ?? null}
                          isIndependent={graphClaim ? graphClaim.is_independent : true}
                          dependsOn={graphClaim?.depends_on ?? []}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'description' && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Описание изобретения</h3>
                </div>
                {loading || generating ? (
                  <SkeletonBlock lines={10} />
                ) : isEditing ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={styles.mainTextarea}
                    rows={18}
                  />
                ) : (
                  <pre className={styles.mainTextPre}>{description}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !generating && !hasData && (
        <div className={styles.emptyState}>
          <img src={applicationIcon} alt="" className={styles.emptyStateIcon} aria-hidden="true" />
          <p className={styles.emptyStateText}>
            Нажмите «Сгенерировать заявку» для генерации реферата, формулы патента и описания изобретения.
          </p>
        </div>
      )}

      <SaveResetWindow
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  )
}
