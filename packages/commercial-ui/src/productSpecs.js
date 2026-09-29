/**
 * Client mirror of commercial_core/specs.py — used when API plans lack features/quotas.
 * Keep in sync when PRODUCT_SPECS changes.
 */

function m(free, starter, professional, enterprise, government, unlimited) {
  return {
    free,
    starter,
    professional,
    enterprise,
    government,
    unlimited,
  };
}

export const PRODUCT_SPECS = {
  cert_studio: {
    quotas: {
      cert_generated_monthly: m(50, 500, 5000, 50000, 100000, -1),
      cert_generated_daily: m(10, 100, 1000, 10000, -1, -1),
      templates_active: m(2, 10, 50, -1, -1, -1),
      bulk_job_max_rows: m(50, 500, 5000, 100000, -1, -1),
      storage_gb: m(0.5, 5, 50, 500, 1000, -1),
      team_members: m(1, 3, 10, -1, -1, -1),
      ocr_pages_monthly: m(10, 100, 1000, -1, -1, -1),
    },
    features: {
      ai_template_generation: m(false, false, true, true, true, true),
      ai_design_suggestions: m(false, false, true, true, true, true),
      ai_bulk_mapping: m(false, true, true, true, true, true),
      bulk_certs: m(false, true, true, true, true, true),
      esign_integration: m(false, false, true, true, true, true),
      mobile_photo_capture: m(false, true, true, true, true, true),
      webcam_capture: m(true, true, true, true, true, true),
      white_label: m(false, false, false, true, true, true),
    },
  },
  quizforge: {
    quotas: {
      assignments_active: m(2, 10, 50, -1, -1, -1),
      questions_in_pool: m(50, 500, 5000, -1, -1, -1),
      ai_questions_generated_monthly: m(0, 20, 200, 2000, -1, -1),
      live_quiz_participants: m(30, 100, 500, 5000, -1, -1),
      team_members: m(1, 3, 10, -1, -1, -1),
      storage_gb: m(0.1, 1, 10, 100, -1, -1),
    },
    features: {
      ai_question_generation: m(false, false, true, true, true, true),
      live_quiz_mode: m(false, true, true, true, true, true),
      proctoring: m(false, false, true, true, true, true),
      face_recognition_attendance: m(false, false, true, true, true, true),
      embed_mode: m(false, true, true, true, true, true),
      white_label: m(false, false, false, true, true, true),
    },
  },
  fetchdesk: {
    quotas: {
      sources_active: m(3, 15, 50, 200, -1, -1),
      crawls_per_day: m(10, 100, 500, 5000, -1, -1),
      items_stored: m(500, 5000, 50000, -1, -1, -1),
      image_extractions_monthly: m(10, 100, 1000, -1, -1, -1),
      storage_gb: m(0.5, 5, 50, 500, -1, -1),
    },
    features: {
      ai_editorial_assistant: m(false, false, true, true, true, true),
      image_scraping: m(false, true, true, true, true, true),
      playwright_js_rendering: m(false, false, true, true, true, true),
      webhook_outbound: m(false, false, true, true, true, true),
    },
  },
  workshopos: {
    quotas: {
      events_active: m(2, 10, 50, -1, -1, -1),
      registrations_per_event: m(50, 200, 1000, -1, -1, -1),
      total_bookings_monthly: m(100, 1000, 10000, -1, -1, -1),
      team_members: m(2, 5, 20, -1, -1, -1),
      storage_gb: m(0.5, 5, 50, 500, -1, -1),
    },
    features: {
      public_org_page_builder: m(false, true, true, true, true, true),
      payment_gateway: m(false, true, true, true, true, true),
      face_recognition_attendance: m(false, false, true, true, true, true),
      dynamic_forms_conditional: m(false, false, true, true, true, true),
      white_label: m(false, false, false, true, true, true),
    },
  },
};

/** Merge bundle_all specs from individual products (same as Python _bundle_*). */
function buildBundleSpecs() {
  const quotas = {};
  const features = {};
  for (const [pid, spec] of Object.entries(PRODUCT_SPECS)) {
    for (const [k, v] of Object.entries(spec.quotas)) quotas[`${pid}_${k}`] = v;
    for (const [k, v] of Object.entries(spec.features)) features[`${pid}_${k}`] = v;
  }
  return { quotas, features };
}

PRODUCT_SPECS.bundle_all = buildBundleSpecs();

/**
 * @param {object|null|undefined} plan
 * @param {string} product
 */
export function planWithSpecs(plan, product) {
  if (plan?.features && Object.keys(plan.features).length > 0) {
    return plan;
  }
  const spec = PRODUCT_SPECS[product];
  if (!spec) return plan || {};
  return {
    ...(plan || {}),
    features: spec.features,
    quotas: spec.quotas,
  };
}
