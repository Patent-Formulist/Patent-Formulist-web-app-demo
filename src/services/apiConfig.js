import { APP_CONFIG } from './appConfig'

// ФАЙЛ В GITIGNORE, ПРИ ИЗМЕНЕНИИ УБРАТЬ
const URL = APP_CONFIG.USE_OFFLINE_MODE 
  ? 'mock://localhost/api/v1'
  : 'http://localhost:8080/api/v1'
// ИЗМЕНЕННЫЙ УЧАСТОК КОДА МЕЖДУ КОММЕНТАРИЕВ
export const API_AUTH_ENDPOINTS = {
  LOGIN: `${URL}/users/login`,
  REGISTER: `${URL}/users/registration`,
  REFRESH: `${URL}/users/refresh`,
  LOGOUT: `${URL}/users/logout`,
  VALIDATE: `${URL}/users/validate`
}

export const API_PATENT_ENDPOINTS = {
  PATENT_GET_ALL: `${URL}/patents/`,
  PATENT_GET: (uuid) => `${URL}/patents/${uuid}/`,
  PATENT_CREATE: `${URL}/patents/`,
  PATENT_EDIT: (uuid) => `${URL}/patents/${uuid}/`,
  PATENT_DELETE: (uuid) => `${URL}/patents/${uuid}/`
}

export const API_REFERENCE_ENDPOINTS = {
  ANALOG_CREATE_LINK: (uuid) => `${URL}/patents/${uuid}/analogs/link/`,
  ANALOG_CREATE_METADATA: (uuid) => `${URL}/patents/${uuid}/analogs/metadata/`,
  ANALOG_GET_RESULT: (taskId) => `${URL}/analog/link/${taskId}/`,
  ANALOG_CREATE_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/`,
  PATENT_CREATE_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/attributes/`,
  ANALOG_CREATE_ATTRIBUTE_MATCHING: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/matching/`,
  PATENT_CREATE_GENERAL_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/attributes/general/`,
  ANALOG_CREATE_ATTRIBUTE_CHECKING: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/checking/`,
  PATENT_CREATE_ATTRIBUTE_CHECKING: (uuid) => `${URL}/patents/${uuid}/attributes/checking/`,
  PATENT_CREATE_STATISTICS: (uuid) => `${URL}/patents/${uuid}/analogs/statistics/`,
  ANALOG_CREATE_IDENTITY: (uuid) => `${URL}/patents/${uuid}/analogs/identity/`,

  ANALOG_GET_SEARCH_RESULT: (uuid) => `${URL}/patents/${uuid}/analogs/search/`,
  PATENT_GET_STATISTICS: (uuid) => `${URL}/patents/${uuid}/statistics/`,
  PATENT_GET_IDENTITY: (uuid) => `${URL}/patents/${uuid}/identity/`,


  ANALOG_GET_COMPARE_RESULT: (taskId) => `${URL}/analog/compare/${taskId}/`,
  PROTOTYPE_SET: `${URL}/prototype/`,
  PROTOTYPE_GET: (patentId) => `${URL}/prototype/${patentId}/`
}

export const API_PROFILE_ENDPOINTS = {
  PROFILE_GET: `${URL}/profile`,
  PROFILE_UPDATE: `${URL}/profile`,
  PROFILE_AVATAR_UPLOAD: `${URL}/profile/avatar`,
  SETTINGS_GET: `${URL}/settings`,
  SETTINGS_UPDATE: `${URL}/settings`,
  AI_MODELS_GET: `${URL}/ai-models`
}