export const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export const pathfinderAppearance = {
  variables: {
    colorPrimary: '#D99A00',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1F2937',
    colorText: '#1F2937',
    colorTextSecondary: '#64748B',
    colorAlphaShade: '#E2E5EA',
    colorDanger: '#EF4444',
    colorSuccess: '#10B981',
    borderRadius: '10px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontFamilyButtons: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: '13px',
  },
  layout: {
    socialButtonsPlacement: 'top',
    showOptionalFields: true,
  },
}
