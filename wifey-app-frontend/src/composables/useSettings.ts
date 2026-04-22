import { ref } from 'vue'
import { API, apiFetch } from '../api'

interface Settings {
  partner_can_read_notes: string
  notifications_enabled: string
  notification_greeting: string
  notification_signoff: string
  notification_sender_name: string
  reminder_days: string
  [key: string]: string
}

const settings = ref<Settings>({ partner_can_read_notes: '0' })
let loaded = false

export function useSettings() {
  async function fetchSettings() {
    if (loaded) return
    try {
      const res = await apiFetch(`${API}/settings`)
      if (res.ok) {
        settings.value = await res.json()
        loaded = true
      }
    } catch {}
  }

  async function updateSetting(key: string, value: string) {
    settings.value = { ...settings.value, [key]: value }
    await apiFetch(`${API}/settings/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    })
  }

  function resetCache() {
    loaded = false
  }

  return { settings, fetchSettings, updateSetting, resetCache }
}
