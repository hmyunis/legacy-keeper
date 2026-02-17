
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
    memberNoticeTitle: "Limited Access",
    memberNoticeDesc: "Only vault Admin can edit processing defaults. You can still leave this vault below.",
    familyName: {
      title: "Family Name",
      description: "This name identifies the family for this vault and is used on lineage and timeline pages.",
      placeholder: "Enter family name",
      save: "Save Name",
      saving: "Saving...",
      required: "Family name is required.",
      noVaultSelected: "No active vault selected.",
      success: "Family name updated.",
      error: "Unable to update family name",
      errorDesc: "Please try again."
    },
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
    safetyWindow: {
      title: "Delete Safety Window",
      description: "Contributors can delete only their own uploads, and only within this window after upload.",
      minutesLabel: "minutes (0 to 10080)",
      save: "Save Window",
      saving: "Saving..."
    },
    health: "Archival Health",
    healthDesc: "Scan your vault for duplicate records and optimize storage.",
    healthClickHint: "Tap to analyze",
    leave: {
      title: "Leave This Vault",
      description: "You will lose access to this family vault immediately. You can rejoin only if someone invites you again.",
      button: "Leave Vault",
      loading: "Leaving...",
      adminMustTransferFirst: "Admin must transfer ownership before leaving this vault.",
      confirmPrompt: "Are you sure you want to leave this vault?",
      noVaultSelected: "No active vault selected.",
      success: "You left the vault successfully.",
      error: "Unable to leave vault",
      errorDesc: "Please try again."
    },
    transfer: {
      title: "Transfer Ownership",
      description: "Move vault ownership to another active member. You should do this before leaving a vault you own.",
      selectPlaceholder: "Select member",
      button: "Transfer",
      loading: "Transferring...",
      ownerOnly: "Only the current vault owner can transfer ownership.",
      noVaultSelected: "No active vault selected.",
      noTargetSelected: "Select a member first.",
      passwordLabel: "Admin Password",
      passwordPlaceholder: "Enter your current password",
      passwordRequired: "Password is required to transfer ownership.",
      confirmPrompt: "Transfer ownership to:",
      confirmConsequence: "After transfer, your role will be downgraded to Contributor and admin-only settings will no longer be available.",
      success: "Ownership transferred successfully.",
      roleUpdatedNotice: "Your role is now Contributor. Access has been updated.",
      error: "Unable to transfer ownership",
      errorDesc: "Please try again."
    },
    toasts: {
      success: "Vault logic updated"
    }
  },
  notifications: {
    title: "Archival Alerts",
    subtitle: "Configure how you receive updates from the family vault.",
    status: "Live Sync Active",
    delivery: "Delivery Channels",
    inApp: "In-app notifications",
    inAppDesc: "Receive alerts in the header notification center while using the app.",
    push: "Browser push notifications",
    pushDesc: "Send system push notifications to this browser even when the app tab is not focused.",
    pushUnavailable: "Push notifications are unavailable until VAPID keys are configured on the backend.",
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
    testing: "Testing...",
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
