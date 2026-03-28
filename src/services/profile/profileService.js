import { APP_CONFIG } from '../appConfig'
import { MOCK_USERS, MOCK_AI_MODELS } from '../mocks/mockData'
import { mockDelay } from '../mocks/mockUtils'
import { API_PROFILE_ENDPOINTS } from '../apiConfig'
import authService from '../auth/authService'

const getCurrentMockUser = () => {
  const email = 'test@test.com'
  return MOCK_USERS[email]
}

class ProfileService {
  async parseJson(response) {
    try {
      return await response.json()
    } catch {
      throw new Error('Ошибка сервера')
    }
  }

  async getProfile() {
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const user = getCurrentMockUser()
      if (!user) {
        throw new Error('Пользователь не найден')
      }
      return user.profile
    }

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
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const user = getCurrentMockUser()
      if (!user) {
        throw new Error('Пользователь не найден')
      }
      
      user.profile = {
        ...user.profile,
        ...profileData
      }
      
      return user.profile
    }

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
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const user = getCurrentMockUser()
      if (!user) {
        throw new Error('Пользователь не найден')
      }
      
      const mockAvatarUrl = `mock://avatar/${Date.now()}.jpg`
      user.profile.avatar = mockAvatarUrl
      
      return { avatar_url: mockAvatarUrl }
    }

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
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const user = getCurrentMockUser()
      if (!user) {
        throw new Error('Пользователь не найден')
      }
      return user.settings
    }

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
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      const user = getCurrentMockUser()
      if (!user) {
        throw new Error('Пользователь не найден')
      }
      
      user.settings = {
        ...user.settings,
        ...settingsData
      }
      
      return user.settings
    }

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
    if (APP_CONFIG.USE_OFFLINE_MODE) {
      await mockDelay(null)
      return MOCK_AI_MODELS
    }

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