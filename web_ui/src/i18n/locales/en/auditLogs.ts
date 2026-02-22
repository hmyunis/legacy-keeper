export const auditLogs = {
  title: "System Registry",
  subtitle: "Verifiable ledger of all interactions.",
  searchPlaceholder: "Search by actor, action, or resource...",
  categories: {
    all: "All",
    uploads: "Uploads",
    access: "Access",
    system: "System",
    management: "Management"
  },
  timeframe: "Timeframe",
  timeframeOptions: {
    all: "All Time",
    day: "Last 24 Hours",
    week: "Last 7 Days",
    month: "Last 30 Days"
  },
  actions: {
    refresh: "Refresh",
    download: "Download Audit"
  },
  table: {
    timestamp: "Timestamp",
    actor: "Actor",
    action: "Action",
    resource: "Resource",
    details: "Details",
    empty: "Empty Registry",
    emptyDesc: "No activity logs match your current global filters or criteria."
  },
  pagination: {
    show: "Show Entries",
    previous: "Previous",
    next: "Next"
  },
  toasts: {
    syncing: "Synchronizing system registry...",
    synced: "Logs synchronized",
    failed: "Synchronization failed",
    exported: "Audit record exported to archive"
  }
};
