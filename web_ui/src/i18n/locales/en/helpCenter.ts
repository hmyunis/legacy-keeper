export const helpCenter = {
  header: {
    badge: "Knowledge Base",
    title: "Help Center",
    subtitle: "Find step-by-step guides for uploads, AI review, restoration, member access, timeline views, and vault settings."
  },
  searchPlaceholder: "Search keywords, modules, or features...",
  actions: {
    learn: "View Guide",
    clear: "Clear Search",
    gotIt: "Got it"
  },
  empty: {
    title: "No guides found for",
    subtitle: "Try using broader keywords or explore our module categories above."
  },
  errors: {
    loadFailed: "Failed to load help guides.",
    retry: "Retry"
  },
  modal: {
    overview: "Summary",
    procedure: "How to do it",
    proTip: "Quick Tip",
    proTipContent: "For photo uploads, review EXIF and face detection results before relying on timeline date or person links."
  },
  categories: {
    vault: "Vault Preservation",
    lineage: "Lineage Mapping",
    members: "Member Governance",
    security: "System Security",
    timeline: "Chronological Navigation",
    settings: "Vault Settings"
  },
  articles: {
    upload: {
      title: "Upload Memories",
      content: "Create a memory with up to 10 files, choose a primary file, and set visibility and story details.",
      steps: [
        "Open the Vault page from the sidebar.",
        "Click \"Preserve Memory\" (Admin/Contributor only).",
        "Add up to 10 files and choose the primary file.",
        "Fill in title, date, location, tags, story, and privacy (Private or Family).",
        "Click Preserve. Photo EXIF and face detection start in the background."
      ]
    },
    search: {
      title: "Search, Filters, and Favorites",
      content: "Use search and filters to quickly find specific memories, then save key items as favorites.",
      steps: [
        "Use the Vault search bar for keywords or natural phrases (for example: wedding 1950).",
        "Open Filters to narrow by people, tags, media type, location, era, or date range.",
        "Switch between grid/list view and change sort order.",
        "Use \"All Items\" and \"Favorites\" tabs to focus your view.",
        "Click \"Reset Filters\" or clear search to return to the full library."
      ]
    },
    ai: {
      title: "EXIF and Face Review",
      content: "Photo AI runs after upload: EXIF extraction and face detection both require human review.",
      steps: [
        "Open a photo in the detail modal.",
        "Watch EXIF and face badges until processing is complete.",
        "If \"EXIF needs review\" appears, the uploader can Accept or Reject the extracted data.",
        "For unknown faces, click a face thumbnail and link it to a relative profile.",
        "Use \"Draw Tag\" to manually box a person when needed."
      ]
    },
    restoration: {
      title: "Restore Old Photos",
      content: "Run photo restoration with denoise and colorize options, then compare before/after output.",
      steps: [
        "Open a photo and go to the Restoration panel.",
        "Choose one or both tools: Denoise and Colorize.",
        "Click \"Restore Photo\" and wait for queued/processing status to finish.",
        "Review warnings if shown and compare original vs restored preview.",
        "Download or continue editing once restoration is completed."
      ]
    },
    tree: {
      title: "Build and Maintain Family Tree",
      content: "Create profiles, define relationships, and keep lineage context connected to vault media.",
      steps: [
        "Open Family Tree and add profiles with name, dates, birthplace, bio, and portrait.",
        "Use \"Link Kin\" to create Parent, Adoptive Parent, Spouse, or Sibling links.",
        "Click a person node to edit profile details.",
        "Use zoom controls to navigate large trees.",
        "Review the \"Mapped Relationships\" list to verify and remove incorrect links."
      ]
    },
    invite: {
      title: "Invite and Manage Members",
      content: "Admins can invite by email, assign roles, and manage active or pending membership.",
      steps: [
        "Go to Members (Admin only).",
        "Click \"Invite Member\" and send an invite as Contributor or Viewer.",
        "Use search and role filters to find members quickly.",
        "Update role for pending/active entries when needed.",
        "Revoke pending invites or remove members from the table actions."
      ]
    },
    shareLinks: {
      title: "Shareable Invite Links",
      content: "Generate reusable join links with role and expiry controls for easier onboarding.",
      steps: [
        "In Members, open the \"Shareable Invite Links\" section.",
        "Select a role and expiry date, then click \"Generate Shareable Link\".",
        "Copy and share the generated link.",
        "Track joined count and status (Active, Expired, Revoked).",
        "Revoke or delete links when they are no longer needed."
      ]
    },
    audit: {
      title: "Audit Logs and Export",
      content: "Admins can trace access and management events, then export filtered logs to spreadsheet.",
      steps: [
        "Open Audit Logs (Admin only).",
        "Filter by category and timeframe; use search for actor/action/resource.",
        "Sort columns and paginate through historical records.",
        "Click Refresh to sync latest entries.",
        "Use \"Download Audit\" to export current filtered data."
      ]
    },
    timeline: {
      title: "Use Timeline View",
      content: "Navigate memories by decade and sort order, then open cards for detailed context.",
      steps: [
        "Open Timeline from the sidebar.",
        "Choose order: Newest First or Oldest First.",
        "Use decade chips or \"All Eras\" to scope results.",
        "Open a timeline card to inspect media details and linked people.",
        "Use the progress indicator at the bottom to see active date range coverage."
      ]
    },
    notifications: {
      title: "Notification Preferences",
      content: "Control in-app and push delivery channels plus event-level alert preferences.",
      steps: [
        "Go to Settings > Archival Alerts.",
        "Toggle in-app notifications and browser push (when VAPID is available).",
        "Choose event types: uploads, comments, tree updates, security alerts, member joins.",
        "Use \"Test Push\" to verify delivery.",
        "Use the bell menu in the header to mark read, dismiss, or clear notifications."
      ]
    },
    vaultPrefs: {
      title: "Vault Policies and Health",
      content: "Admins can tune vault defaults and run duplicate-file cleanup safely.",
      steps: [
        "Open Settings > Vault Prefs.",
        "Set Family Name, Storage Quality, and default Privacy baseline.",
        "Adjust the Delete Safety Window for contributor edits/deletes.",
        "Open Archival Health analysis and review duplicate groups.",
        "Run Safe Preview before cleanup, then clean selected groups when ready."
      ]
    },
    ownership: {
      title: "Transfer Ownership and Leave Vault",
      content: "Use ownership transfer before leaving when you are the current vault owner/admin.",
      steps: [
        "In Vault Prefs, choose an active contributor as transfer target.",
        "Confirm transfer with your current admin password.",
        "After transfer, your role becomes Contributor.",
        "Admins cannot leave directly until ownership is transferred.",
        "Use \"Leave Vault\" only when you are ready to lose current vault access."
      ]
    }
  }
};
