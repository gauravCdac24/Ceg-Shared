import React, { useState } from 'react';

import { Link } from 'react-router-dom';

import { commercialNavigate } from './commercialNavigate.js';

import { OrgMasterSearchField } from './OrgMasterSearchField.jsx';
import { RoleMasterSelectField } from './RoleMasterSelectField.jsx';



/**

 * Commercial organisation registration — org name separate from admin email.

 * Host app supplies registerOrg API (POST /v1/organizations/register).

 */

export function ProductCommercialRegisterPage({

  productLabel = 'CeG Platform',

  pricingHref = '/pricing',

  waiverHref = '/pricing/waiver',

  loginHref = '/login',

  registerOrg,

  searchOrganizations,

  listRoles,

  createCustomRole,

  MathCaptchaField,

  captcha = null,

}) {

  const [form, setForm] = useState({

    org_name: '',

    org_slug: '',

    short_name: '',

    org_type: '',

    organization_master_id: null,

    role_master_id: null,

    role_name: '',

    full_name: '',

    email: '',

    password: '',

    confirm: '',

  });

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);



  const slugify = (name) =>

    name

      .trim()

      .toLowerCase()

      .replace(/[^a-z0-9]+/g, '-')

      .replace(/^-+|-+$/g, '')

      .slice(0, 48);



  const set = (key) => (e) => {

    const value = e.target.value;

    setForm((p) => {

      const next = { ...p, [key]: value };

      if (key === 'org_name' && !p.org_slug) {

        next.org_slug = slugify(value);

      }

      return next;

    });

  };



  const onSubmit = async (e) => {

    e.preventDefault();

    setError('');

    if (form.password !== form.confirm) {

      setError('Passwords do not match');

      return;

    }

    if (!form.organization_master_id && !form.org_type) {

      setError('Select an organisation type for new organisations');

      return;

    }

    if (!form.role_master_id && !form.role_name.trim()) {

      setError('Select your role or enter a custom role');

      return;

    }

    if (captcha?.required && !captcha.solved) {

      setError('Complete the security check');

      return;

    }

    setLoading(true);

    try {

      const res = await registerOrg({

        org_name: form.org_name.trim(),

        org_slug: form.org_slug.trim().toLowerCase(),

        full_name: form.full_name.trim(),

        email: form.email.trim().toLowerCase(),

        password: form.password,

        registration_kind: 'commercial',

        organization_master_id: form.organization_master_id || undefined,

        short_name: form.organization_master_id ? undefined : form.short_name.trim() || undefined,

        org_type: form.organization_master_id ? undefined : form.org_type,

        role_master_id: form.role_master_id || undefined,

        role_name: form.role_master_id ? undefined : form.role_name.trim() || undefined,

        ...(captcha?.payload || {}),

      });

      const payload = res?.data ?? res;

      if (payload?.requires_approval) {

        commercialNavigate(loginHref, {

          state: {

            pendingApproval: true,

            message:

              payload?.message ||

              `Your registration is pending approval from your ${payload?.organization_master_name || form.org_name.trim()} administrator.`,

            accountStatus: payload?.account_status,

          },

        });

        return;

      }

      commercialNavigate(loginHref, {

        state: {

          message:

            payload?.message ||

            `Account created for ${form.org_name.trim()}. Sign in to continue with ${productLabel}.`,

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

      <header className="product-pricing-header">

        <h1>Create your organisation account</h1>

        <p>

          Register your organisation for {productLabel}. Organisation name and admin email are separate — use any

          valid work email address.

        </p>

      </header>



      <form className="pricing-waiver-form" onSubmit={onSubmit}>

        {error ? <p className="payment-error">{error}</p> : null}



        <OrgMasterSearchField

          orgName={form.org_name}

          onOrgNameChange={(v) => setForm((p) => ({ ...p, org_name: v, org_slug: p.org_slug || slugify(v) }))}

          shortName={form.short_name}

          onShortNameChange={(v) => setForm((p) => ({ ...p, short_name: v }))}

          orgType={form.org_type}

          onOrgTypeChange={(v) => setForm((p) => ({ ...p, org_type: v }))}

          organizationMasterId={form.organization_master_id}

          onOrganizationMasterIdChange={(id) => setForm((p) => ({ ...p, organization_master_id: id }))}

          searchOrganizations={searchOrganizations}

        />



        <RoleMasterSelectField

          orgType={form.org_type}

          roleMasterId={form.role_master_id}

          onRoleMasterIdChange={(id) => setForm((p) => ({ ...p, role_master_id: id }))}

          roleName={form.role_name}

          onRoleNameChange={(v) => setForm((p) => ({ ...p, role_name: v }))}

          listRoles={listRoles}

          createCustomRole={createCustomRole}

        />



        <label>

          Organisation slug (URL identifier)

          <input required value={form.org_slug} onChange={set('org_slug')} autoComplete="off" />

          <span className="form-hint">Lowercase letters, numbers, hyphens only</span>

        </label>

        <label>

          Your full name

          <input required value={form.full_name} onChange={set('full_name')} autoComplete="name" />

        </label>

        <label>

          Work email

          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@cdac.in" />

        </label>

        <label>

          Password

          <input type="password" required value={form.password} onChange={set('password')} autoComplete="new-password" />

        </label>

        <label>

          Confirm password

          <input type="password" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />

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

          {loading ? 'Creating account…' : 'Create account'}

        </button>



        <p className="pricing-waiver-footer">

          Government organisation? <Link to={waiverHref}>Apply for a waiver</Link>

          {' · '}

          Already registered? <Link to={loginHref}>Sign in</Link>

        </p>

      </form>

    </div>

  );



}


