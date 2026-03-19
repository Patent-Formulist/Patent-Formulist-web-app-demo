import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePatents } from '../../../contexts/PatentsContext'
import styles from '../styles/PatentCreation.module.css'


const FORM_FIELDS = [
  {
    name: 'name',
    label: 'Название',
    placeholder: 'Введите название патента',
    type: 'input',
    validation: { 
      required: 'Название патента обязательно',
      minLength: { value: 3, message: 'Минимум 3 символа' }
    }
  },
  {
    name: 'technical_area',
    label: 'Техническая область',
    placeholder: 'Опишите техническую область',
    type: 'input',
    validation: { required: 'Техническая область обязательна' }
  },
  {
    name: 'appointment',
    label: 'Назначение',
    placeholder: 'Опишите назначение патента',
    type: 'textarea',
    rows: 3,
    validation: { required: 'Назначение обязательно' }
  },
  {
    name: 'construction',
    label: 'Конструкция',
    placeholder: 'Опишите конструкцию',
    type: 'textarea',
    rows: 4,
    validation: { required: 'Конструкция обязательна' }
  },
  {
    name: 'operation_principle',
    label: 'Принцип работы',
    placeholder: 'Опишите принцип работы',
    type: 'textarea',
    rows: 4,
    validation: { required: 'Принцип работы обязателен' }
  },
  {
    name: 'technical_result',
    label: 'Технический результат',
    placeholder: 'Опишите технический результат',
    type: 'textarea',
    rows: 3,
    validation: { required: 'Технический результат обязателен' }
  },
  {
    name: 'search_query',
    label: 'Поисковый запрос',
    placeholder: 'Введите запрос с операторами',
    type: 'input',
    validation: { required: 'Поисковый запрос обязателен' }
  }
]


const FORM_STORAGE_KEY = 'patent_creation_form'


const getStoredValues = () => {
  if (typeof window === 'undefined') return {}
  const saved = localStorage.getItem(FORM_STORAGE_KEY)
  return saved ? JSON.parse(saved) : {}
}


export default function PatentCreation() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm({
    mode: 'onBlur',
    defaultValues: getStoredValues()
  })

  const navigate = useNavigate()
  const { createPatent } = usePatents()

  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const shouldSaveRef = useRef(true)

  const formValues = watch()

  const hasFormData = Object.values(formValues).some(value => 
    value && String(value).trim() !== ''
  )

  useEffect(() => {
    const subscription = watch((value) => {
      if (shouldSaveRef.current) {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(value))
      }
    })
    return () => subscription.unsubscribe()
  }, [watch])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (window.__REDIRECTING__) return;
      if (!hasFormData) return
      e.preventDefault()
      e.returnValue = ''
      return e.returnValue
    }

    if (hasFormData) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasFormData])

  useEffect(() => {
    if (cancelModalVisible) {
      document.body.style.overflow = 'hidden'
      const appRoot = document.getElementById('root')
      if (appRoot) {
        appRoot.style.filter = 'blur(4px)'
      }
    } else {
      document.body.style.overflow = 'unset'
      const appRoot = document.getElementById('root')
      if (appRoot) {
        appRoot.style.filter = 'none'
      }
    }
    return () => {
      document.body.style.overflow = 'unset'
      const appRoot = document.getElementById('root')
      if (appRoot) {
        appRoot.style.filter = 'none'
      }
    }
  }, [cancelModalVisible])

  const onSubmit = async (data) => {
    try {
      const patentData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value?.trim()) {
          acc[key] = value.trim()
        }
        return acc
      }, {})

      shouldSaveRef.current = false
      const createdPatent = await createPatent(patentData)
      localStorage.removeItem(FORM_STORAGE_KEY)
      reset()
      navigate(`/workspace/patents/${createdPatent.patent_uuid}`)
    } catch (error) {
      shouldSaveRef.current = true
    }
  }

  const handleCancel = () => {
    if (hasFormData) {
      setCancelModalVisible(true)
    } else {
      navigate('/workspace')
    }
  }

  const confirmCancel = () => {
    shouldSaveRef.current = false
    localStorage.removeItem(FORM_STORAGE_KEY)
    reset()
    setCancelModalVisible(false)
    navigate('/workspace')
  }

  const cancelCancel = () => {
    setCancelModalVisible(false)
  }

  const renderField = (field) => {
    const fieldError = errors[field.name]

    return (
      <div key={field.name} className={styles.formGroup}>
        <label htmlFor={field.name} className={styles.label}>
          {field.label}
        </label>
        
        {field.type === 'textarea' ? (
          <textarea
            id={field.name}
            placeholder={field.placeholder}
            rows={field.rows}
            className={`${styles.textarea} ${fieldError ? styles.error : ''}`}
            disabled={isSubmitting}
            {...register(field.name, field.validation)}
          />
        ) : (
          <input
            id={field.name}
            type="text"
            placeholder={field.placeholder}
            className={`${styles.input} ${fieldError ? styles.error : ''}`}
            disabled={isSubmitting}
            {...register(field.name, field.validation)}
          />
        )}
        
        {fieldError && (
          <span className={styles.errorMessage}>{fieldError.message}</span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={styles.container}>
        <h2 className={styles.title}>Новый патент</h2>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {FORM_FIELDS.map(renderField)}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className={styles.cancelButton}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      {cancelModalVisible && createPortal(
        <div className={styles.modalOverlay} onClick={cancelCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Покинуть создание патента?</h3>
            <p className={styles.modalText}>
              Вы уверены, что хотите покинуть страницу создания патента?
            </p>
            <p className={styles.modalWarning}>
              Ваши данные не сохранятся.
            </p>
            <div className={styles.modalButtons}>
              <button 
                className={styles.modalCancelButton} 
                onClick={cancelCancel}
                type="button"
              >
                Остаться
              </button>
              <button 
                className={styles.modalConfirmButton} 
                onClick={confirmCancel}
                type="button"
              >
                Покинуть
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}