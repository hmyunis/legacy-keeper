
export const settings = {
  title: "Vault Settings",
  subtitle: "Configure your personal archival workspace.",
  tabs: {
    profile: "Identity",
    vault: "Vault Prefs",
    appearance: "Appearance",
    notifications: "Archival Alerts"
  },
  profile: {
    title: "Heritage Custodian",
    desc: "Your profile is visible to other invited family members.",
    role: "Role",
    fields: {
      name: "Full Legal Name",
      email: "Email",
      bio: "Bio"
    },
    actions: {
      submit: "Commit Changes",
      updating: "Updating..."
    },
    toasts: {
      success: "Identity updated"
    }
  },
  vault: {
    title: "Vault Logic",
    subtitle: "Configure how the archival engine processes your family legacy.",
    rules: "Processing Rules",
    quality: "Storage Quality",
    qualities: {
      balanced: { label: "Balanced", desc: "Optimal space saving" },
      high: { label: "High", desc: "HD with compression" },
      original: { label: "Original", desc: "Lossless preservation" }
    },
    privacy: "Privacy Baseline",
    privacies: {
      private: { label: "Private Mode", desc: "Only you can see new uploads by default." },
      family: { label: "Family Share", desc: "Shared with the circle automatically." }
    },
    health: "Archival Health",
    healthDesc: "System scan suggests 12 duplicate records found in 1950s collection. Clean-up recommended.",
    toasts: {
      success: "Vault logic updated"
    }
  },
  notifications: {
    title: "Archival Alerts",
    subtitle: "Configure how you receive updates from the family vault.",
    status: "Live Sync Active",
    memory: "Memory Preservation",
    newUploads: "New Uploads",
    newUploadsDesc: "Notify when a relative preserves a new photo or document in the vault.",
    comments: "Memory Comments",
    commentsDesc: "Get alerted when family members add stories or notes to artifacts.",
    lineage: "Lineage & Kinship",
    tree: "Family Tree Changes",
    treeDesc: "Notifications for new relatives added or relationship links established.",
    security: "Vault Security",
    alerts: "Critical Access Alerts",
    alertsDesc: "Immediate alerts for logins from new devices or permission changes.",
    activity: "Member Activity",
    activityDesc: "Notify when invited relatives join the circle or update their profiles.",
    technology: "Push Technology",
    technologyDesc: "Settings apply to both browser push and the in-app notification center.",
    test: "Test Push",
    toasts: {
      updated: "Preference updated",
      synced: "Your archival alert settings have been synchronized.",
      blocked: "Notification blocked",
      blockedDesc: "New Upload notifications are currently disabled in your settings.",
      testSuccess: "Test Push Received",
      testDesc: "The notification has been added to your in-app center."
    }
  },
  appearance: {
    title: "App Appearance",
    subtitle: "Personalize your archival workspace environment.",
    mode: "Color Mode",
    light: "Light Mode",
    dark: "Dark Mode",
    palette: "Primary Palette",
    custom: "Custom Hue",
    hex: "HEX Code",
    reset: "Reset to default"
  },
  actions: {
    export: "Export Archive"
  }
};
