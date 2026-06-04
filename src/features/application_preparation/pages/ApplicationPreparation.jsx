import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import SaveResetWindow from '../../../components/SaveResetWindow/SaveResetWindow.jsx'
import styles from '../styles/ApplicationPreparation.module.css'
import authService from '../../../services/auth/authService.js'
import { API_APPLICATION_ENDPOINTS as EP } from '../../../services/apiConfig'
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

function ClaimItem({ claim, index, isEditing, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className={styles.claimItem}>
      <div className={styles.claimHeader}>
        <span className={styles.claimNumber}>{index + 1}.</span>
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

function SkeletonBlock({ lines = 6 }) {
  return (
    <div className={styles.skeletonBlock}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonLine}
          style={{ width: `${70 + Math.sin(i * 1.5) * 20}%` }}
        />
      ))}
    </div>
  )
}

export default function Application() {
  const { id } = useParams()
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

  const pollingRef = useRef(null)
  const pollingStartRef = useRef(null)

  const syncFromData = useCallback((d) => {
    setAbstract(normalizeAbstract(d.abstract))
    setClaims(normalizeClaims(d.claims))
    setDescription(normalizeDescription(d.description))
  }, [])

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(EP.APPLICATION(id), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getAccessToken()}`,
        },
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
      await fetchApplication()
      setLoading(false)
    }
    init()
  }, [fetchApplication])

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
        showSuccess('Документы успешно сгенерированы')
      }
    }, POLLING_INTERVAL)
  }, [fetchApplication, stopPolling, showSuccess, showError])

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
    try {
      const response = await fetch(EP.GENERATE(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getAccessToken()}`,
        },
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
    snapshotRef.current = { abstract, claims: [...claims], description }
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
      const response = await fetch(EP.APPLICATION(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getAccessToken()}`,
        },
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
    } catch (err) {
      showError(err.message || 'Ошибка сохранения')
      const snap = snapshotRef.current
      if (snap) {
        setAbstract(snap.abstract)
        setClaims(snap.claims)
        setDescription(snap.description)
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
    }
    setIsEditing(false)
    setSaveModalOpen(false)
    showSuccess('Данные сброшены')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(EP.EXPORT(id), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authService.getAccessToken()}`,
        },
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
  }

  const updateClaim = (index, value) => {
    setClaims((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  const deleteClaim = (index) => {
    setClaims((prev) => prev.filter((_, i) => i !== index))
  }

  const moveClaim = (index, direction) => {
    setClaims((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]]
      return next
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
                    <button
                      type="button"
                      className={styles.addClaimButton}
                      onClick={addClaim}
                    >
                      <img src={plusIcon} alt="" className={styles.addClaimIcon} aria-hidden="true" />
                      Добавить пункт
                    </button>
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
                    {claims.map((claim, index) => (
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
                      />
                    ))}
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
