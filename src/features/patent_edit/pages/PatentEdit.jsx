import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatents } from '../../../contexts/PatentsContext'
import { useToast } from '../../../contexts/ToastContext'
import patentService from '../../../services/patent/patentService'
import styles from '../styles/PatentEdit.module.css'

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

export default function PatentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loadPatents } = usePatents()
  const { showSuccess, showError } = useToast()

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setValue
  } = useForm({
    mode: 'onBlur'
  })

  useEffect(() => {
    const loadPatentData = async () => {
      try {
        const patentData = await patentService.getPatent(id)
        
        FORM_FIELDS.forEach(field => {
          const value = patentData[field.name] || ''
          setValue(field.name, value)
        })
      } catch (error) {
        showError(error.message || 'Ошибка загрузки патента')
        navigate('/workspace')
      }
    }

    loadPatentData()
  }, [id, setValue, navigate, showError])

  const onSubmit = async (data) => {
    try {
      const patentData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value?.trim()) {
          acc[key] = value.trim()
        }
        return acc
      }, {})

      await patentService.editPatent(id, patentData)
      await loadPatents()
      showSuccess('Патент успешно обновлен')
      navigate('/workspace')
    } catch (error) {
      showError(error.message || 'Ошибка обновления патента')
    }
  }

  const handleCancel = () => {
    navigate('/workspace')
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
    <div className={styles.container}>
      <h2 className={styles.title}>Редактировать патент</h2>
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
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
