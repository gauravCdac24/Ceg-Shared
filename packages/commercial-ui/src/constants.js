export const FEATURE_DISPLAY_NAMES = {
  ai_template_generation: 'AI template generation',
  ai_design_suggestions: 'AI design suggestions',
  ai_bulk_mapping: 'AI bulk field mapping',
  bulk_certs: 'Bulk certificate generation',
  esign_integration: 'E-sign integration',
  mobile_photo_capture: 'Mobile photo capture',
  webcam_capture: 'Webcam capture',
  white_label: 'White-label branding',
  ai_question_generation: 'AI question generation',
  live_quiz_mode: 'Live quiz mode',
  proctoring: 'Proctoring',
  face_recognition_attendance: 'Face recognition attendance',
  embed_mode: 'Embed mode',
  ai_editorial_assistant: 'AI editorial assistant',
  image_scraping: 'Image scraping',
  playwright_js_rendering: 'JavaScript page rendering (Playwright)',
  webhook_outbound: 'Outbound webhooks',
  public_org_page_builder: 'Public org page builder',
  payment_gateway: 'Payment gateway',
  dynamic_forms_conditional: 'Conditional dynamic forms',
};

export const QUOTA_DISPLAY_NAMES = {
  cert_generated_monthly: 'Certificates / month',
  cert_generated_daily: 'Certificates / day',
  templates_active: 'Active templates',
  bulk_job_max_rows: 'Max bulk job rows',
  storage_gb: 'Storage',
  team_members: 'Team members',
  ocr_pages_monthly: 'OCR pages / month',
  assignments_active: 'Active assignments',
  questions_in_pool: 'Question pool size',
  ai_questions_generated_monthly: 'AI questions / month',
  live_quiz_participants: 'Live quiz participants',
  sources_active: 'Active sources',
  crawls_per_day: 'Crawls / day',
  items_stored: 'Stored items',
  image_extractions_monthly: 'Image extractions / month',
  events_active: 'Active events',
  registrations_per_event: 'Registrations per event',
  total_bookings_monthly: 'Bookings / month',
};

export const ORG_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'startup_dpiit', label: 'DPIIT Startup' },
  { value: 'academic_university', label: 'University' },
  { value: 'academic_college', label: 'College' },
  { value: 'corporate_large', label: 'Corporate' },
  { value: 'government_central', label: 'Central Government' },
  { value: 'government_state', label: 'State Government' },
  { value: 'research_institute', label: 'Research Institute' },
];

export const PRODUCTS = [
  { id: 'cert_studio', label: 'Cert Studio' },
  { id: 'quizforge', label: 'QuizForge' },
  { id: 'fetchdesk', label: 'FetchDesk' },
  { id: 'workshopos', label: 'WorkshopOS' },
  { id: 'bundle_all', label: 'All Products Bundle' },
];

export function formatInrFromPaise(paise) {
  if (paise < 0) return 'Contact sales';
  if (paise === 0) return 'Free';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
