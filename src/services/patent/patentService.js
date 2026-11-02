import { APP_CONFIG } from '../appConfig'
import { API_PATENT_ENDPOINTS } from '../apiConfig'
import authService from '../auth/authService'

class PatentService {
  async getUserPatents() {
    console.log('🔍 API_PATENT_ENDPOINTS.PATENT_GET_ALL =', API_PATENT_ENDPOINTS.PATENT_GET_ALL);

    const response = await authService.authenticatedFetch(
      API_PATENT_ENDPOINTS.PATENT_GET_ALL,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    let rawBody
    try {
      rawBody = await response.text()
    } catch {
      throw new Error('Ошибка чтения ответа')
    }

    let data
    try {
      data = rawBody ? JSON.parse(rawBody) : null
    } catch {
      data = null
    }

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error('Неверный запрос')
        case 404:
          throw new Error('Патенты не найдены')
        default:
          throw new Error(data?.detail ?? 'Ошибка загрузки патентов')
      }
    }

    if (data && typeof data.patents === 'object') {
      return Object.entries(data.patents).map(([id, patent]) => ({
        id,
        ...patent,
      }))
    }

    return []
  }

  async getPatent(patentUuid) {

    const response = await authService.authenticatedFetch(
      API_PATENT_ENDPOINTS.PATENT_GET(patentUuid),
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error('Патент не найден')
        default:
          throw new Error('Ошибка загрузки патента')
      }
    }

    const data = await response.json()
    return data
  }

  async createPatent(patentData) {

    const response = await authService.authenticatedFetch(
      API_PATENT_ENDPOINTS.PATENT_CREATE,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(patentData),
      }
    )

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error('Неверные данные патента')
        case 422:
          throw new Error('Ошибка валидации данных')
        default:
          throw new Error('Ошибка создания патента')
      }
    }

    const data = await response.json()
    return data
  }

  async editPatent(patentUuid, patentData) {

    const response = await authService.authenticatedFetch(
      API_PATENT_ENDPOINTS.PATENT_EDIT(patentUuid),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(patentData),
      }
    )

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error('Патент не найден')
        case 400:
          throw new Error('Неверные данные патента')
        default:
          throw new Error('Ошибка редактирования патента')
      }
    }

    const data = await response.json()
    return data
  }

  async deletePatent(patentUuid) {

    const response = await authService.authenticatedFetch(
      API_PATENT_ENDPOINTS.PATENT_DELETE(patentUuid),
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      switch (response.status) {
        case 404:
          throw new Error('Патент не найден')
        default:
          throw new Error('Ошибка удаления патента')
      }
    }

    return { success: true }
  }
}

export default new PatentService()