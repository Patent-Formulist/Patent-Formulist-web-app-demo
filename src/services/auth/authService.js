import { APP_CONFIG } from '../appConfig'
import { API_AUTH_ENDPOINTS } from '../apiConfig'

class AuthService {
  saveTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  getAccessToken() {
    return localStorage.getItem('accessToken')
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken')
  }

  clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async login(email, password) {

    const response = await fetch(API_AUTH_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      if (response.status === 500) {
        throw new Error('Ошибка сервера')
      }
      throw new Error('Ошибка авторизации')
    }

    const data = await response.json()
    this.saveTokens(data.access, data.refresh)
    return data
  }

  async register(email, password) {

    const response = await fetch(API_AUTH_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error('Неверные данные')
        case 422:
          throw new Error('Email должен быть вида user@example.com')
        default:
          throw new Error('Ошибка регистрации')
      }
    }

    const data = await response.json()
    this.saveTokens(data.access, data.refresh)
    return data
  }

  async validate() {

    const token = this.getAccessToken()
    if (!token) return false

    try {
      const response = await fetch(API_AUTH_ENDPOINTS.VALIDATE, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async refreshAccessToken() {

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('Refresh token отсутствует')
    }

    const response = await fetch(API_AUTH_ENDPOINTS.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      this.clearTokens()
      window.location.href = '/login'
      throw new Error('Не удалось обновить токен')
    }

    const data = await response.json()
    this.saveTokens(data.access, data.refresh)
    return data
  }

  async authenticatedFetch(url, options = {}) {

    const token = this.getAccessToken()
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }

    let response = await fetch(url, { ...options, headers })

    if (response.status === 401) {
      try {
        await this.refreshAccessToken()
        const newToken = this.getAccessToken()
        headers.Authorization = `Bearer ${newToken}`
        response = await fetch(url, { ...options, headers })
      } catch {
        this.clearTokens()
        window.location.href = '/login'
        throw new Error('Сессия истекла')
      }
    }

    return response
  }

  async logout() {

    try {
      const token = this.getAccessToken()
      if (token) {
        await fetch(API_AUTH_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } finally {
      this.clearTokens()
      window.location.href = '/login'
    }
  }
}

export default new AuthService()