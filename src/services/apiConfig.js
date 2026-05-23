import { APP_CONFIG } from './appConfig'

// ФАЙЛ В GITIGNORE, ПРИ ИЗМЕНЕНИИ УБРАТЬ
const URL = APP_CONFIG.USE_OFFLINE_MODE 
  ? 'mock://localhost/api/v2'
  : 'http://localhost/api/v2'
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

export const API_PROCESSOR_ENDPOINTS = {
  /*
  В данный момент не нужны, могут понадобиться при разделении действий
  ANALOG_CREATE_LINK: (uuid) => `${URL}/patents/${uuid}/analogs/link/`,
  ANALOG_CREATE_METADATA: (uuid) => `${URL}/patents/${uuid}/analogs/metadata/`,
  ANALOG_GET_RESULT: (taskId) => `${URL}/analog/link/${taskId}/`,
  ANALOG_CREATE_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/`,
  PATENT_CREATE_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/attributes/`,
  ANALOG_CREATE_ATTRIBUTE_MATCHING: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/matching/`,
  PATENT_CREATE_GENERAL_ATTRIBUTE: (uuid) => `${URL}/patents/${uuid}/attributes/general/`,
  ANALOG_CREATE_ATTRIBUTE_CHECKING: (uuid) => `${URL}/patents/${uuid}/analogs/attributes/checking/`,
  PATENT_CREATE_ATTRIBUTE_CHECKING: (uuid) => `${URL}/patents/${uuid}/attributes/checking/`,
  */

  BASE_SEARCH: `${URL}/processor/search/`,
  CREATE_SEARCH_BATCH: `${URL}/processor/search/batch`,
  CREATE_SEARCH_ANALOG: (analog_num) => `${URL}/processor/search/${analog_num}`,
  CREATE_STATISTICS: `${URL}/processor/statistics/`,
  CREATE_IDENTITY: `${URL}/processor/identity/`,

  GET_PROGRESS: (patentUuid) => `${URL}/processor/patent/${patentUuid}/progress`,
  GET_SEARCH_RESULT: (uuid) => `${URL}/processor/patent/${uuid}/search/`,
  GET_STATISTICS: (uuid) => `${URL}/processor/patent/${uuid}/statistics/`,
  GET_IDENTITY: (uuid) => `${URL}/processor/patent/${uuid}/identity/`,
}

export const API_PROFILE_ENDPOINTS = {
  PROFILE_GET: `${URL}/users/profile`,
  PROFILE_UPDATE: `${URL}/users/profile`,
  PROFILE_AVATAR_UPLOAD: `${URL}/users/profile/avatar`,
  SETTINGS_GET: `${URL}/users/settings`,
  SETTINGS_UPDATE: `${URL}/users/settings`,
  AI_MODELS_GET: `${URL}/users/ai-models`
}