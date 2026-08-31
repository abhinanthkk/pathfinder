export const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const pathfinderAppearance = {
  variables: {
    colorPrimary: '#facc15',
    colorBackground: '#141418',
    colorInputBackground: '#09090b',
    colorInputText: '#f4f4f5',
    colorText: '#f4f4f5',
    colorTextSecondary: '#a1a1aa',
    colorAlphaShade: '#27272a',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    borderRadius: '6px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontFamilyButtons: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: '13px',
  },
  layout: {
    socialButtonsPlacement: 'top',
    showOptionalFields: true,
  },
}
