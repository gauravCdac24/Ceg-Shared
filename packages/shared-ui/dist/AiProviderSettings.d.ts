import { type AiProviderPublicSettings, type AiProviderSaveRequest, type AiProviderTestResult } from '@ceg/shared-validation';
import './AiProviderSettings.css';
export type AiProviderSettingsProps = {
    settings: AiProviderPublicSettings | null;
    loading?: boolean;
    saving?: boolean;
    testing?: boolean;
    onSave: (payload: AiProviderSaveRequest) => Promise<void>;
    onTest: (payload: AiProviderSaveRequest) => Promise<AiProviderTestResult>;
    className?: string;
    productName?: string;
    /** Short list of product features that use AI (shown in sidebar). */
    aiFeatures?: string[];
    showFeatureList?: boolean;
    platformDisplayName?: string;
    showTechnicalDetails?: boolean;
};
/**
 * Cursor-style BYO AI settings — platform default vs bring-your-own API keys.
 */
export declare function AiProviderSettings({ settings, loading, saving, testing, onSave, onTest, className, productName, aiFeatures, showFeatureList, platformDisplayName, showTechnicalDetails, }: AiProviderSettingsProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AiProviderSettings.d.ts.map