export const members = {
  title: "Family Members",
  subtitle: "Manage who has access to your family vault.",
  invite: "Invite Member",
  stats: {
    total: "Total",
    active: "Active",
    pending: "Pending",
    contributors: "Contributors"
  },
  table: {
    identity: "Identity",
    clearance: "Clearance",
    status: "Status",
    date: "Preservation Date",
    actions: "Actions"
  },
  searchPlaceholder: "Search by name or email...",
  role: {
    placeholder: "Role",
    selectRole: "Select role",
    contributor: "CONTRIBUTOR",
    viewer: "VIEWER"
  },
  feedback: {
    copiedLink: "Copied link to clipboard",
    copyFailed: "Unable to copy link",
    copyManually: "Please copy it manually.",
    selectExpiryDate: "Please select an expiry date",
    invalidExpiryDate: "Invalid expiry date",
    expiryMustBeFuture: "Expiry must be in the future",
    membersLoadFailed: "Failed to load members.",
    shareableLoadFailed: "Failed to load shareable links.",
    copied: "Copied",
    copy: "Copy"
  },
  confirm: {
    generateLinkTitle: "Generate Shareable Link?",
    generateLinkMessageTemplate: "This will create a shareable invite link with {role} role that expires on {date}.",
    generateLinkConfirmLabel: "Generate Link",
    revokeLinkTitle: "Revoke Shareable Link?",
    revokeLinkMessage: "People will no longer be able to use this link.",
    revokeLinkConfirmLabel: "Revoke Link",
    deleteLinkTitle: "Delete Shareable Link?",
    deleteLinkMessage: "This link record will be permanently removed.",
    deleteLinkConfirmLabel: "Delete Link",
    removePendingTitle: "Revoke Pending Invite?",
    removeMemberTitle: "Remove Member?",
    removePendingMessageTemplate: "Revoke pending invite for {email}?",
    removeMemberMessageTemplate: "Remove {name} from this vault?",
    removePendingConfirmLabel: "Revoke Invite",
    removeMemberConfirmLabel: "Remove Member",
    roleChangeTitle: "Confirm Role Change",
    roleChangePendingMessageTemplate: "Update pending invite role for {email} to {role}?",
    roleChangeMemberMessageTemplate: "Change {name}'s role to {role}?",
    roleChangeConfirmLabel: "Update Role"
  },
  shareable: {
    title: "Shareable Invite Links",
    subtitle: "Generate reusable links with role and expiry. Recipients will follow the same join flow.",
    selectExpiryDate: "Select expiry date",
    generating: "Generating...",
    generate: "Generate Shareable Link",
    table: {
      link: "Link",
      role: "Role",
      expires: "Expires",
      joined: "Joined",
      status: "Status",
      actions: "Actions"
    },
    tooltips: {
      copyLink: "Copy link",
      deleteLink: "Delete link",
      revokeLink: "Revoke link",
      alreadyRevoked: "Already revoked",
      removeMember: "Remove member",
      revokeInvite: "Revoke invite"
    },
    status: {
      revoked: "Revoked",
      expired: "Expired",
      active: "Active"
    },
    empty: "No shareable links generated yet",
    noMatchingMembers: "No matching members found"
  }
};
