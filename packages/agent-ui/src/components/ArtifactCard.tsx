import React from 'react';

export type ArtifactType =
  | 'quiz'
  | 'certificate'
  | 'event'
  | 'digest'
  | 'landing_page'
  | 'document'
  | 'image'
  | 'code';

export interface ArtifactResponse {
  artifact_id: string;
  artifact_type: ArtifactType;
  title: string;
  preview_url?: string;
  download_url?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ARTIFACT_ICONS: Record<ArtifactType, string> = {
  quiz: '🎯',
  certificate: '🏆',
  event: '📅',
  digest: '📰',
  landing_page: '🌐',
  document: '📄',
  image: '🖼️',
  code: '💻',
};

interface ArtifactCardProps {
  artifact: ArtifactResponse;
  onEdit?: () => void;
  onShare?: () => void;
}

export function ArtifactCard({ artifact, onEdit, onShare }: ArtifactCardProps) {
  return (
    <div
      className="artifact-card"
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        maxWidth: '480px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>{ARTIFACT_ICONS[artifact.artifact_type]}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a202c' }}>{artifact.title}</div>
          <div style={{ fontSize: '12px', color: '#718096', textTransform: 'capitalize' }}>
            {artifact.artifact_type.replace('_', ' ')}
          </div>
        </div>
      </div>

      {artifact.preview_url && (
        <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', background: '#f7fafc' }}>
          {artifact.artifact_type === 'certificate' || artifact.artifact_type === 'image' ? (
            <img
              src={artifact.preview_url}
              alt={artifact.title}
              style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
            />
          ) : (
            <iframe
              src={artifact.preview_url}
              title={artifact.title}
              style={{ width: '100%', height: '160px', border: 'none' }}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {artifact.download_url && (
          <a
            href={artifact.download_url}
            download
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px',
              background: '#ebf4ff',
              color: '#3182ce',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            ⬇ Download
          </a>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              padding: '8px',
              background: '#f0fff4',
              color: '#276749',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            ✏ Edit
          </button>
        )}
        {onShare && (
          <button
            onClick={onShare}
            style={{
              flex: 1,
              padding: '8px',
              background: '#faf5ff',
              color: '#6b46c1',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            ↗ Share
          </button>
        )}
      </div>
    </div>
  );
}
