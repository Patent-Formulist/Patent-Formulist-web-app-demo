import { APP_CONFIG } from '../appConfig'
import { API_PROFILE_ENDPOINTS } from '../apiConfig'
import authService from '../auth/authService'

class ProfileService {
  async parseJson(response) {
    try {
      return await response.json()
    } catch {
      throw new Error('Ошибка сервера')
    }
  }

  async getProfile() {

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.PROFILE_GET,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = await this.parseJson(response)
    return data
  }

  async updateProfile(profileData) {

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.PROFILE_UPDATE,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(profileData),
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = await response.json()
    return data
  }

  async uploadAvatar(file) {

    const formData = new FormData()
    formData.append('avatar', file)

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.PROFILE_AVATAR_UPLOAD,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = await response.json()
    return data
  }

  async getSettings() {

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.SETTINGS_GET,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = this.parseJson(response)
    return data
  }

  async updateSettings(settingsData) {

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.SETTINGS_UPDATE,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(settingsData),
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = await response.json()
    return data
  }

  async getAvailableModels() {

    const response = await authService.authenticatedFetch(
      API_PROFILE_ENDPOINTS.AI_MODELS_GET,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )

    if (!response.ok) {
      if (response.status === 501 || response.status === 503) {
        throw new Error('В данный момент информацию о пользователе недоступна');
      }
      throw new Error('Ошибка загрузки профиля');
    }

    const data = await response.json()
    return data.models || []
  }
}

export default new ProfileService()