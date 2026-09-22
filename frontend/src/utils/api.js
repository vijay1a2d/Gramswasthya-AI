import axios from 'axios'

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
    const raw = localStorage.getItem('gs_user')
    if (raw) {
        try {
            const { access_token } = JSON.parse(raw)
            if (access_token) {
                config.headers.Authorization = `Bearer ${access_token}`
            }
        } catch { }
    }
    return config
})

// ── Auth ───────────────────────────────────
export async function apiLogin(phone, password) {
    const formData = new URLSearchParams()
    formData.append('username', phone)
    formData.append('password', password)
    const { data } = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
}

export async function apiRegister(payload) {
    const { data } = await api.post('/auth/register', payload)
    return data
}

export async function apiGetMe() {
    const { data } = await api.get('/auth/me')
    return data
}

export async function apiGetDoctors() {
    const { data } = await api.get('/doctors/')
    return data
}

// ── Hospitals ──────────────────────────────
export async function apiGetHospitals() {
    const { data } = await api.get('/hospitals/')
    return data
}

// ── Patients ───────────────────────────────
export async function apiGetPatients(skip = 0, limit = 50, search = '') {
    const params = { skip, limit }
    if (search) params.search = search
    const { data } = await api.get('/patients/', { params })
    return data
}

export async function apiGetMyProfile() {
    const { data } = await api.get('/patients/profile/me')
    return data
}

export async function apiUpdateMyProfile(payload) {
    const { data } = await api.put('/patients/profile/me', payload)
    return data
}

export async function apiGetPatient(id) {
    const { data } = await api.get(`/patients/${id}`)
    return data
}

export async function apiRegisterPatient(payload) {
    const { data } = await api.post('/patients/register', payload)
    return data
}

export async function apiGetPatientStats() {
    const { data } = await api.get('/patients/stats/summary')
    return data
}

export async function apiRecordVitals(vitals) {
    const { data } = await api.post('/patients/vitals/', vitals)
    return data
}

export async function apiGetPatientVitals(patientId) {
    const { data } = await api.get(`/patients/${patientId}/vitals`)
    return data
}

export async function apiGetPatientDiagnoses(patientId) {
    const { data } = await api.get(`/patients/${patientId}/diagnoses`)
    return data
}

// ── CDSS ───────────────────────────────────
export async function apiSuggestTreatment(payload) {
    const { data } = await api.post('/cdss/suggest-treatment/', payload)
    return data
}

export async function apiCheckDrugInteractions(drugs) {
    const { data } = await api.post('/cdss/drug-interactions/', { drugs })
    return data
}

export async function apiGetGuidelines(disease) {
    const { data } = await api.get(`/cdss/guidelines/${disease}`)
    return data
}

export async function apiGetCdssDiseases() {
    const { data } = await api.get('/cdss/diseases/')
    return data
}

// ── Emergency ──────────────────────────────
export async function apiTriggerSOS(payload) {
    const { data } = await api.post('/emergency/sos', payload)
    return data
}

export async function apiResolveSOS(eventId) {
    const { data } = await api.put(`/emergency/events/${eventId}/resolve`)
    return data
}

export async function apiGetNearestFacility(lat, lng) {
    const { data } = await api.get('/emergency/nearest-facility', { params: { lat, lng } })
    return data
}

export async function apiGetEmergencyEvents() {
    const { data } = await api.get('/emergency/events')
    return data
}

// ── Health Passport ────────────────────────
export async function apiGetPassport(patientId) {
    const { data } = await api.get(`/passport/${patientId}`)
    return data
}

export async function apiGetPassportQR(patientId) {
    const { data } = await api.get(`/passport/${patientId}/qr`)
    return data
}

export async function apiLookupPassport(passportCode) {
    const { data } = await api.get(`/passport/lookup/${encodeURIComponent(passportCode)}`)
    return data
}

// ── Appointments ───────────────────────────
export async function apiCreateAppointment(payload) {
    const { data } = await api.post('/appointments/', payload)
    return data
}

export async function apiGetAppointments() {
    const { data } = await api.get('/appointments/')
    return data
}

export async function apiUpdateAppointmentStatus(id, status) {
    const { data } = await api.put(`/appointments/${id}/status`, { status })
    return data
}

// ── Disease Intelligence ───────────────────
export async function apiGetOutbreakAlerts() {
    const { data } = await api.get('/disease/alerts')
    return data
}

export async function apiGetSurveillanceSummary() {
    const { data } = await api.get('/disease/surveillance/summary')
    return data
}

export async function apiGetVillageScores() {
    const { data } = await api.get('/disease/village-scores')
    return data
}

// ── Workflow ───────────────────────────────
export async function apiGetWorkflowStats() {
    const { data } = await api.get('/workflow/stats')
    return data
}

export async function apiGetBedStatus() {
    const { data } = await api.get('/workflow/bed-status')
    return data
}

export async function apiGetSupplyForecast() {
    const { data } = await api.get('/workflow/supply-forecast')
    return data
}

export default api
