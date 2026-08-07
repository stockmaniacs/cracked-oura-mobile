import axios from 'axios'
import { getApiKey, getBackendUrl } from '@/store/apiKey'
import type { TodaySummary, WeekSummary, SleepDay, ReadinessDay, ActivityDay, HRVDay, SyncStatus } from '@/types/oura'

export const http = axios.create({ timeout: 30_000 })

// Dynamic baseURL + API key on every request
http.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl()
  const key = getApiKey()
  if (key) config.headers['X-API-Key'] = key
  return config
})

export const api = {
  health:       ()           => http.get<{ status: string; service: string; version: string }>('/api/v1/health'),
  todaySummary: ()           => http.get<TodaySummary>('/api/v1/summary/today'),
  weekSummary:  ()           => http.get<WeekSummary>('/api/v1/summary/week'),
  sleep:        (days = 30)  => http.get<SleepDay[]>('/api/v1/sleep', { params: { days } }),
  readiness:    (days = 30)  => http.get<ReadinessDay[]>('/api/v1/readiness', { params: { days } }),
  activity:     (days = 30)  => http.get<ActivityDay[]>('/api/v1/activity', { params: { days } }),
  hrv:          (days = 14)  => http.get<HRVDay[]>('/api/v1/hrv', { params: { days } }),
  syncStatus:   ()           => http.get<SyncStatus>('/api/v1/sync/status'),
  triggerSync:  ()           => http.post<{ message: string; status: string }>('/api/v1/sync'),
  dayData:      (date: string)  => http.get(`/api/v1/days/${date}`),
  query:        (path: string, startDate?: string, endDate?: string) =>
    http.get('/api/v1/query', { params: { path, start_date: startDate, end_date: endDate } }),
  schema:       ()           => http.get('/api/v1/schema'),
  startLogin:   (email: string)         => http.post('/api/v1/automation/start-login', { email }),
  submitOtp:    (otp: string, action = 'run') => http.post('/api/v1/automation/submit-otp', { otp, action }),
  uploadZip:    (file: File) => {
    const form = new FormData(); form.append('file', file)
    return http.post('/api/v1/ingest/zip', form)
  },
}
