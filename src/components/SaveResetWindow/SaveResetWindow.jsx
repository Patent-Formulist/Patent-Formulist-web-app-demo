import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import styles from './SaveResetWindow.module.css'

// Окно сохранить/сбросить после редактирования
export default function SaveResetWindow({isOpen, onSave, onReset, onClose}) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={styles.title}>Сохранить изменения?</h3>

        <div className={styles.buttons}>
          <button className={styles.save} onClick={onSave}>
            Сохранить
          </button>

          <button className={styles.reset} onClick={onReset}>
            Сбросить
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}