type IconProps = {
    className?: string;
};
export declare function InstagramIcon({ className }: IconProps): import("react/jsx-runtime").JSX.Element;
export declare function FacebookIcon({ className }: IconProps): import("react/jsx-runtime").JSX.Element;
export declare function TwitterIcon({ className }: IconProps): import("react/jsx-runtime").JSX.Element;
export declare function LinkedInIcon({ className }: IconProps): import("react/jsx-runtime").JSX.Element;
export declare function YouTubeIcon({ className }: IconProps): import("react/jsx-runtime").JSX.Element;
declare const SOCIAL_ICON_MAP: {
    readonly instagram: typeof InstagramIcon;
    readonly facebook: typeof FacebookIcon;
    readonly twitter: typeof TwitterIcon;
    readonly linkedin: typeof LinkedInIcon;
    readonly youtube: typeof YouTubeIcon;
};
export type SocialIconName = keyof typeof SOCIAL_ICON_MAP;
export declare function renderSocialIcon(name: SocialIconName, className?: string): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=footerSocialIcons.d.ts.map