import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

const ORG_TYPE_OPTIONS = [
  { value: 'central_govt', label: 'Central Government' },
  { value: 'state_govt', label: 'State Government' },
  { value: 'educational', label: 'Educational' },
  { value: 'psu', label: 'PSU / Public Sector' },
  { value: 'bfsi', label: 'BFSI' },
  { value: 'private', label: 'Private' },
  { value: 'ngo', label: 'NGO / Non-profit' },
  { value: 'other', label: 'Other' },
];

/**
 * Live fuzzy org search + select existing or create new (org master).
 * Host supplies searchOrganizations(q) → { results: [...] }.
 */
export function OrgMasterSearchField({
  orgName,
  onOrgNameChange,
  shortName,
  onShortNameChange,
  orgType,
  onOrgTypeChange,
  organizationMasterId,
  onOrganizationMasterIdChange,
  searchOrganizations,
  disabled = false,
  showNewOrgFields = true,
  inlineShortName = false,
  hasError = false,
  shortNameError = '',
  orgNameError = '',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showList, setShowList] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const inputId = useId();
  const shortId = `${inputId}-short`;

  const mode = organizationMasterId ? 'existing' : orgName.trim() ? 'new' : 'idle';
  const nameInputClass = hasError || orgNameError ? 'input input--error' : 'input';
  const shortInputClass = shortNameError ? 'input input--error' : 'input';

  const runSearch = useCallback(
    async (q) => {
      if (!searchOrganizations || q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      setSearchError('');
      try {
        const data = await searchOrganizations(q.trim());
        const results = data?.results || data || [];
        setSuggestions(Array.isArray(results) ? results : []);
        setShowList(true);
      } catch (err) {
        setSuggestions([]);
        setSearchError(err?.message || 'Search failed');
      } finally {
        setSearching(false);
      }
    },
    [searchOrganizations],
  );

  useEffect(() => {
    if (organizationMasterId) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = orgName.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [orgName, organizationMasterId, runSearch]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowList(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectExisting = (row) => {
    onOrganizationMasterIdChange?.(row.id);
    onOrgNameChange?.(row.full_name);
    onShortNameChange?.(row.short_name || '');
    onOrgTypeChange?.(row.org_type || '');
    setShowList(false);
  };

  const startNew = () => {
    onOrganizationMasterIdChange?.(null);
    setShowList(false);
  };

  const showInlineShort = inlineShortName && !organizationMasterId;

  return (
    <div className="org-master-search" ref={wrapRef}>
      <div className="form-group">
        <label className="form-label form-label--required" htmlFor={inputId}>
          Organisation name
        </label>
        <div
          className={`org-master-search__name-row${showInlineShort ? ' org-master-search__name-row--inline-short' : ''}${searching ? ' org-master-search__name-row--searching' : ''}`}
        >
          <input
            id={inputId}
            required
            className={`${nameInputClass} org-master-search__name-input`}
            value={orgName}
            disabled={disabled || Boolean(organizationMasterId)}
            onChange={(e) => {
              // Only ever set from direct user input — never mutated by async
              // search results, so the field can't flicker while suggestions load.
              onOrganizationMasterIdChange?.(null);
              onOrgNameChange?.(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length) setShowList(true);
            }}
            autoComplete="organization"
            placeholder="Start typing to search existing organisations"
            aria-autocomplete="list"
            aria-expanded={showList && suggestions.length > 0}
            aria-invalid={Boolean(orgNameError || hasError)}
            aria-describedby={orgNameError ? `${inputId}-org-error` : undefined}
          />
          {showInlineShort ? (
            <div className="org-master-search__short-wrap" aria-label="Abbreviation or short name">
              <span className="org-master-search__short-paren" aria-hidden>(</span>
              <input
                id={shortId}
                className={`${shortInputClass} org-master-search__short-input`}
                value={shortName}
                onChange={(e) => onShortNameChange?.(e.target.value)}
                maxLength={64}
                placeholder="Abbrev."
                aria-label="Abbreviation or short name"
                aria-invalid={Boolean(shortNameError)}
                aria-describedby={shortNameError ? `${shortId}-short-error` : undefined}
              />
              <span className="org-master-search__short-paren" aria-hidden>)</span>
            </div>
          ) : null}
        </div>
        {organizationMasterId ? (
          <p className="commercial-field-hint">
            Linked to an existing organisation record.{' '}
            <button type="button" className="commercial-link-button" onClick={startNew}>
              Register as new instead
            </button>
          </p>
        ) : (
          <p className="commercial-field-hint">
            {showInlineShort
              ? 'Search the directory or enter a new name. Optional abbreviation appears in parentheses.'
              : 'Search the directory or enter a new organisation name.'}
          </p>
        )}
        {orgNameError ? (
          <p id={`${inputId}-org-error`} className="form-error" role="alert">{orgNameError}</p>
        ) : null}
        {shortNameError ? (
          <p id={`${shortId}-short-error`} className="form-error" role="alert">{shortNameError}</p>
        ) : null}
      </div>

      {searching ? <p className="commercial-field-hint">Searching…</p> : null}
      {searchError ? <p className="form-error" role="alert">{searchError}</p> : null}

      {showList && suggestions.length > 0 && !organizationMasterId ? (
        <ul className="org-master-search__list" role="listbox">
          {suggestions.map((row) => (
            <li key={row.id} role="option">
              <button type="button" className="org-master-search__option" onClick={() => selectExisting(row)}>
                <strong>{row.full_name}</strong>
                {row.short_name ? <span> ({row.short_name})</span> : null}
                {row.similarity != null ? (
                  <span className="org-master-search__match"> — {Math.round(row.similarity * 100)}% match</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mode === 'new' && showNewOrgFields ? (
        <>
          {!inlineShortName ? (
            <div className="form-group">
              <label className="form-label" htmlFor={shortId}>
                Abbreviation / short name
              </label>
              <input
                id={shortId}
                className={shortInputClass}
                value={shortName}
                onChange={(e) => onShortNameChange?.(e.target.value)}
                maxLength={64}
                placeholder="e.g. CDAC"
              />
            </div>
          ) : null}
          <div className="form-group">
            <label className="form-label form-label--required" htmlFor={`${inputId}-type`}>
              Organisation type
            </label>
            <select
              id={`${inputId}-type`}
              className="input"
              required
              value={orgType}
              onChange={(e) => onOrgTypeChange?.(e.target.value)}
            >
              <option value="">Select type…</option>
              {ORG_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="commercial-field-hint">New organisations are submitted for platform review.</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export { ORG_TYPE_OPTIONS };
