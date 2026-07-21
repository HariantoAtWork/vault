export default defineAppConfig({
  ui: {
    colors: {
      primary: 'bitwarden',
      neutral: 'slate',
      success: 'green',
      error: 'red',
      warning: 'yellow',
      info: 'bitwarden',
    },
    button: {
      defaultVariants: {
        color: 'primary',
      },
      slots: {
        base: 'font-semibold',
      },
    },
    input: {
      defaultVariants: {
        size: 'lg',
      },
    },
    dashboardSidebar: {
      slots: {
        root: 'bg-[var(--bw-deep-blue)] text-white border-[var(--bw-light-grey)]/20',
        header: 'border-white/10',
        footer: 'border-white/10',
      },
    },
    dashboardNavbar: {
      slots: {
        root: 'border-[var(--bw-light-grey)] bg-white',
      },
    },
    dashboardToolbar: {
      slots: {
        root: 'border-[var(--bw-light-grey)] bg-[var(--bw-off-white)]/80',
      },
    },
    dashboardPanel: {
      slots: {
        body: 'bg-white',
      },
    },
  },
})
