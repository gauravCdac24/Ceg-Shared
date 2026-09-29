import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { commercialNavigate } from './commercialNavigate.js';

const GOV_ORG_TYPES = [
  { value: 'central_govt', label: 'Central government' },
  { value: 'state_govt', label: 'State government' },
  { value: 'psu', label: 'Public sector undertaking' },
  { value: 'educational', label: 'Educational institution' },
  { value: 'ngo', label: 'NGO / society' },
  { value: 'other', label: 'Other public body' },
];

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Government waiver registration shell — host app supplies registerWaiver API.
 * Uses registration_kind: waiver_gov on the backend.
 */
export function ProductPricingWaiverPage({
  productLabel = 'Certificate Studio',
  pricingHref = '/pricing',
  loginHref = '/login',
  registerWaiver,
  MathCaptchaField,
  useMathCaptcha,
  reviewNote = 'Our team reviews applications within 1–2 business days.',
}) {
  const captcha = useMathCaptcha ? useMathCaptcha() : null;
  const [form, setForm] = useState({
    org_name: '',
    org_type: 'state_govt',
    department: '',
    gov_domain: '',
    waiver_justification: '',
    full_name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (captcha?.required && !captcha.solved) {
      setError('Complete the security check');
      return;
    }
    const orgSlug = slugify(form.org_name);
    if (!orgSlug || orgSlug.length < 2) {
      setError('Enter a valid organisation name');
      return;
    }
    setLoading(true);
    try {
      const res = await registerWaiver({
        org_name: form.org_name.trim(),
        org_slug: orgSlug,
        org_type: form.org_type,
        short_name: form.department.trim() || undefined,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        registration_kind: 'waiver_gov',
        gov_domain: form.gov_domain.trim() || undefined,
        waiver_justification: form.waiver_justification.trim() || undefined,
        ...(captcha?.payload || {}),
      });
      commercialNavigate(loginHref, {
        state: {
          message:
            res?.message ||
            'Account created. Sign in and upload required proofs to complete your waiver application.',
        },
      });
    } catch (err) {
      setError(err?.message || err?.response?.data?.detail || 'Registration failed');
      captcha?.refreshAfterFailure?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-pricing-page pricing-waiver-page">
      <header className="product-pricing-header pricing-waiver-page__header">
        <h1>Government waiver registration</h1>
        <p>
          Central or state government, defence, and public-sector bodies may apply for subsidised{' '}
          {productLabel} access. After sign-up you&apos;ll upload supporting documents. {reviewNote}
        </p>
      </header>

      <form className="pricing-waiver-form" onSubmit={onSubmit} noValidate>
        {error ? <p className="payment-error" role="alert">{error}</p> : null}

        <label>
          Organisation name
          <input required maxLength={255} value={form.org_name} onChange={set('org_name')} autoComplete="organization" />
        </label>

        <label>
          Organisation type
          <select required value={form.org_type} onChange={set('org_type')}>
            {GOV_ORG_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label>
          Department / ministry (optional)
          <input maxLength={64} value={form.department} onChange={set('department')} placeholder="e.g. Department of IT" />
        </label>

        <label>
          Official email domain (optional)
          <input maxLength={255} placeholder="example.gov.in" value={form.gov_domain} onChange={set('gov_domain')} />
        </label>

        <label>
          Why your organisation qualifies
          <textarea
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            value={form.waiver_justification}
            onChange={set('waiver_justification')}
            placeholder="Brief mandate, programme scale, and why subsidised access is appropriate."
          />
        </label>

        <label>
          Authorised signatory name
          <input required maxLength={160} value={form.full_name} onChange={set('full_name')} autoComplete="name" />
        </label>

        <label>
          Work email
          <input type="email" required maxLength={254} value={form.email} onChange={set('email')} placeholder="you@dept.gov.in" autoComplete="email" />
        </label>

        <label>
          Password
          <input type="password" required minLength={8} maxLength={128} value={form.password} onChange={set('password')} autoComplete="new-password" />
        </label>

        <label>
          Confirm password
          <input type="password" required minLength={8} maxLength={128} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </label>

        {MathCaptchaField && captcha ? (
          <MathCaptchaField
            captcha={captcha.captcha}
            answer={captcha.answer}
            onAnswerChange={captcha.setAnswer}
            onReload={captcha.reload}
            loading={captcha.loading}
            loadError={captcha.loadError}
          />
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={loading || (captcha && !captcha.canSubmit)}>
          {loading ? 'Submitting…' : 'Create waiver account'}
        </button>

        <p className="pricing-waiver-footer">
          Commercial organisation? <Link to={pricingHref}>View standard pricing</Link>
        </p>
      </form>
    </div>
  );
}
