// Design tokens partagés (cf. design.md) — chargé après le script CDN Tailwind sur chaque page.
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "on-error-container": "#93000a",
        "on-primary": "#ffffff",
        primary: "#004ac6",
        "on-primary-fixed-variant": "#003ea8",
        "on-secondary-fixed": "#0b1c30",
        "on-secondary": "#ffffff",
        "on-background": "#191c1e",
        tertiary: "#4b566a",
        "on-tertiary-fixed": "#111c2d",
        error: "#ba1a1a",
        "on-tertiary": "#ffffff",
        "inverse-on-surface": "#eff1f3",
        "surface-container": "#eceef0",
        "surface-tint": "#0053db",
        "surface-variant": "#e0e3e5",
        "on-primary-fixed": "#00174b",
        "on-secondary-container": "#54647a",
        background: "#f7f9fb",
        surface: "#f7f9fb",
        "tertiary-fixed-dim": "#bcc7de",
        "on-surface": "#191c1e",
        secondary: "#505f76",
        "outline-variant": "#c3c6d7",
        "primary-fixed": "#dbe1ff",
        "inverse-surface": "#2d3133",
        "primary-fixed-dim": "#b4c5ff",
        "on-error": "#ffffff",
        "inverse-primary": "#b4c5ff",
        "surface-container-high": "#e6e8ea",
        "error-container": "#ffdad6",
        "on-tertiary-container": "#ecf1ff",
        "secondary-fixed-dim": "#b7c8e1",
        "primary-container": "#2563eb",
        "on-secondary-fixed-variant": "#38485d",
        "on-primary-container": "#eeefff",
        outline: "#737686",
        "secondary-fixed": "#d3e4fe",
        "surface-container-highest": "#e0e3e5",
        "surface-bright": "#f7f9fb",
        "tertiary-fixed": "#d8e3fb",
        "surface-dim": "#d8dadc",
        "on-tertiary-fixed-variant": "#3c475a",
        "on-surface-variant": "#434655",
        "tertiary-container": "#636e83",
        "secondary-container": "#d0e1fb"
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      spacing: {
        gutter: "20px",
        "container-max": "1280px",
        lg: "24px",
        md: "16px",
        sm: "8px",
        unit: "4px",
        xs: "4px",
        "2xl": "48px",
        xl: "32px"
      },
      fontFamily: {
        "body-md": ["Inter"],
        "display-lg": ["Inter"],
        "label-md": ["Inter"],
        "body-lg": ["Inter"],
        "label-sm": ["Inter"],
        "body-sm": ["Inter"],
        "headline-md": ["Inter"],
        "headline-sm": ["Inter"]
      },
      fontSize: {
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }]
      }
    }
  }
};
