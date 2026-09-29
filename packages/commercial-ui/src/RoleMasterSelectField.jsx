import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';

const OTHER_VALUE = '__other__';

const FALLBACK_ROLES_BY_ORG_TYPE = {
  central_govt: ['Director', 'Under Secretary', 'Section Officer', 'Scientist C', 'Scientist D', 'Deputy Director'],
  state_govt: ['Director', 'Under Secretary', 'Section Officer', 'Deputy Director', 'District Officer'],
  educational: ['Registrar', 'Dean', 'Professor', 'Associate Professor', 'Assistant Professor', 'Training Coordinator'],
  psu: ['Manager', 'Senior Manager', 'Executive', 'General Manager', 'Director'],
  bfsi: ['Branch Manager', 'Relationship Manager', 'Analyst', 'Operations Manager'],
  private: ['Director', 'Manager', 'Team Lead', 'HR Administrator', 'IT Administrator', 'Training Coordinator'],
  ngo: ['Programme Manager', 'Coordinator', 'Director', 'Trustee', 'Volunteer Lead'],
  judiciary: ['Registrar', 'Court Master', 'Section Officer', 'Deputy Registrar'],
  cag: ['Director', 'Deputy Director', 'Audit Officer', 'Principal Auditor'],
  other: ['Manager', 'Team Lead', 'Coordinator', 'Administrator', 'Director'],
};

function normalizeRoleRows(results, orgType) {
  const rows = Array.isArray(results) ? results.filter((r) => r?.role_name) : [];
  if (rows.length) return rows;
  const names = FALLBACK_ROLES_BY_ORG_TYPE[orgType] || FALLBACK_ROLES_BY_ORG_TYPE.other;
  return names.map((role_name, index) => ({
    id: `fallback-${orgType}-${index}`,
    role_name,
    _fallback: true,
  }));
}

/**
 * Org-type-scoped role dropdown + custom role entry (role master).
 * Host supplies listRoles(orgType, q?) and createCustomRole({ role_name, org_type }).
 */
export function RoleMasterSelectField({
  orgType,
  roleMasterId,
  onRoleMasterIdChange,
  roleName,
  onRoleNameChange,
  listRoles,
  createCustomRole,
  disabled = false,
  label = 'Your role',
  required = true,
  hasError = false,
  fieldError = '',
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('select');
  const [customText, setCustomText] = useState('');
  const [creating, setCreating] = useState(false);
  const selectId = useId();
  const customId = useId();

  const effectiveOrgType = (orgType || '').trim();
  const inputClass = hasError || fieldError ? 'input input--error' : 'input';
  const usingFallback = useMemo(
    () => options.length > 0 && options.every((row) => row._fallback),
    [options],
  );

  const loadRoles = useCallback(async () => {
    if (!effectiveOrgType || !listRoles) {
      setOptions(normalizeRoleRows([], effectiveOrgType || 'other'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await listRoles(effectiveOrgType);
      const results = data?.results || data || [];
      setOptions(normalizeRoleRows(results, effectiveOrgType));
    } catch (err) {
      setOptions(normalizeRoleRows([], effectiveOrgType));
      setError(err?.message || 'Could not load roles — common titles are shown below.');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgType, listRoles]);

  useEffect(() => {
    onRoleMasterIdChange?.(null);
    onRoleNameChange?.('');
    setMode('select');
    setCustomText('');
    loadRoles();
  }, [effectiveOrgType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!options.length || roleMasterId || (roleName && String(roleName).trim())) return;
    const first = options[0];
    if (!first?.role_name) return;
    if (first._fallback) {
      onRoleMasterIdChange?.(null);
      onRoleNameChange?.(first.role_name);
    } else {
      onRoleMasterIdChange?.(first.id);
      onRoleNameChange?.(first.role_name);
    }
  }, [options, roleMasterId, roleName, onRoleMasterIdChange, onRoleNameChange]);

  const selectRole = (e) => {
    const value = e.target.value;
    if (value === OTHER_VALUE) {
      setMode('other');
      onRoleMasterIdChange?.(null);
      onRoleNameChange?.('');
      return;
    }
    setMode('select');
    setCustomText('');
    const row = options.find((r) => String(r.id) === value);
    if (row) {
      if (row._fallback) {
        onRoleMasterIdChange?.(null);
        onRoleNameChange?.(row.role_name);
      } else {
        onRoleMasterIdChange?.(row.id);
        onRoleNameChange?.(row.role_name);
      }
    } else {
      onRoleMasterIdChange?.(null);
      onRoleNameChange?.('');
    }
  };

  const submitCustom = async () => {
    const text = customText.trim();
    if (text.length < 2 || !effectiveOrgType) return;
    if (!createCustomRole) {
      onRoleNameChange?.(text);
      onRoleMasterIdChange?.(null);
      return;
    }
    setCreating(true);
    setError('');
    try {
      const data = await createCustomRole({ role_name: text, org_type: effectiveOrgType });
      const row = data?.id ? data : data?.data || data;
      if (row?.id) {
        onRoleMasterIdChange?.(row.id);
        onRoleNameChange?.(row.role_name || text);
        setMode('select');
        await loadRoles();
      } else {
        onRoleNameChange?.(text);
        onRoleMasterIdChange?.(null);
      }
    } catch (err) {
      setError(err?.message || 'Could not save custom role');
    } finally {
      setCreating(false);
    }
  };

  const selectValue = useMemo(() => {
    if (mode === 'other') return OTHER_VALUE;
    if (roleMasterId) return String(roleMasterId);
    if (roleName) {
      const match = options.find((row) => row.role_name === roleName);
      if (match) return String(match.id);
    }
    return '';
  }, [mode, roleMasterId, roleName, options]);

  if (!effectiveOrgType) {
    return (
      <div className="role-master-select form-group">
        <label className="form-label form-label--required" htmlFor={selectId}>
          {label}
        </label>
        <select id={selectId} className="input" disabled>
          <option value="">Select organisation type first…</option>
        </select>
      </div>
    );
  }

  return (
    <div className="role-master-select">
      <div className="form-group">
        <label className={`form-label${required ? ' form-label--required' : ''}`} htmlFor={selectId}>
          {label}
        </label>
        <select
          id={selectId}
          className={inputClass}
          required={required && mode !== 'other'}
          value={selectValue}
          disabled={disabled || loading}
          onChange={selectRole}
          aria-invalid={Boolean(fieldError || hasError)}
        >
          <option value="">Select your role…</option>
          {options.map((row) => (
            <option key={String(row.id)} value={String(row.id)}>
              {row.department ? `${row.department} — ${row.role_name}` : row.role_name}
            </option>
          ))}
          <option value={OTHER_VALUE}>Other / not listed</option>
        </select>
        {loading ? <p className="commercial-field-hint">Loading roles…</p> : null}
        {usingFallback && !loading ? (
          <p className="commercial-field-hint">Common roles for your organisation type are pre-filled.</p>
        ) : null}
        {fieldError ? <p className="form-error" role="alert">{fieldError}</p> : null}
      </div>

      {mode === 'other' ? (
        <div className="form-group role-master-select__custom">
          <label className="form-label form-label--required" htmlFor={customId}>
            Describe your role
          </label>
          <input
            id={customId}
            className={inputClass}
            required
            value={customText}
            disabled={disabled || creating}
            onChange={(e) => {
              setCustomText(e.target.value);
              onRoleMasterIdChange?.(null);
              onRoleNameChange?.(e.target.value);
            }}
            onBlur={() => {
              if (customText.trim().length >= 2) submitCustom();
            }}
            placeholder="e.g. Deputy Registrar"
            maxLength={128}
          />
          {creating ? <p className="commercial-field-hint">Saving…</p> : null}
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

export { OTHER_VALUE as ROLE_MASTER_OTHER_VALUE, FALLBACK_ROLES_BY_ORG_TYPE };
