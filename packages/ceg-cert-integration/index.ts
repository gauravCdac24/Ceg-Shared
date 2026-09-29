export interface CertRecipient {
  recipient_name: string
  recipient_email?: string | null
  custom_fields?: Record<string, string | number | boolean | null>
}

export interface CertJobPayload {
  templateId: string
  rows: CertRecipient[] | Record<string, unknown>[]
  jobName?: string
  autoDispatchEmail?: boolean
  certIdFormat?: string
  sourceProduct?: 'quizforge' | 'workshopos' | 'ceg_portal' | string
}

export interface JobStatus {
  job_id: string
  status: string
  total_rows: number
  completed_rows: number
  failed_rows: number
  download_url?: string | null
}

export interface TemplateFieldMeta {
  id: string
  name: string
  thumbnail_url?: string | null
  fields: string[]
  page_size?: string
  status?: string
}

export interface RecipientCertSummary {
  serial_number: string
  recipient_name: string
  issuing_org: string
  issued_at?: string | null
  expires_at?: string | null
  verify_url: string
  wallet_url?: string
  org_logo_url?: string | null
  org_primary_color?: string
  source_product?: string | null
}

export class CertStudioClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      ...extra,
    }
  }

  async createJob(payload: CertJobPayload): Promise<{ jobId: string; job_id?: string; status?: string }> {
    const body = {
      template_id: payload.templateId,
      rows: payload.rows,
      source_product: payload.sourceProduct,
      auto_dispatch_email: payload.autoDispatchEmail ?? false,
      job_name: payload.jobName,
      cert_id_format: payload.certIdFormat,
    }
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/integrations/jobs`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return { jobId: data.job_id, ...data }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/integrations/jobs/${jobId}`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async getTemplates(): Promise<TemplateFieldMeta[]> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/integrations/platform/templates`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async getRecipientCertificates(email: string): Promise<RecipientCertSummary[]> {
    const q = encodeURIComponent(email)
    const res = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/api/v1/integrations/platform/recipient-certs?email=${q}`,
      { headers: this.headers() },
    )
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return data.items || []
  }

  async verifyCertificate(serial: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/integrations/verify`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ code_or_serial: serial }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }
}
