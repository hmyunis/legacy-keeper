export const modals = {
  upload: {
    title: "Preserve New Memory",
    dropzone: "Click or drag to upload up to 10 files (e.g., JPG, PNG, PDF, MP4, DOCX, ZIP - any file type is allowed)",
    processing: "Preserving Artifact...",
    fields: {
      title: "Title",
      date: "Date",
      location: "Location",
      tags: "Tags",
      story: "The Story"
    },
    actions: {
      cancel: "Cancel",
      submit: "Preserve",
      uploading: "Uploading..."
    }
  },
  invite: {
    title: "Invite to Circle",
    emailLabel: "Email Address",
    emailPlaceholder: "name@family-email.com",
    roleLabel: "Access Level",
    roles: {
      admin: {
        label: "Administrator",
        desc: "Full control over vault & members"
      },
      contributor: {
        label: "Contributor",
        desc: "Can upload and edit memories"
      },
      viewer: {
        label: "Viewer",
        desc: "Read-only access to records"
      }
    },
    actions: {
      cancel: "Cancel",
      submit: "Send Invitation",
      sending: "Sending..."
    }
  },
  relation: {
    title: "Map Kinship",
    personA: "Select Relative A",
    personB: "Select Relative B",
    placeholder: "Choose relative...",
    typeLabel: "Relationship Type",
    types: {
      parent: "Parent",
      adoptiveParent: "Adoptive Parent",
      spouse: "Spouse",
      sibling: "Sibling"
    },
    actions: {
      cancel: "Cancel",
      submit: "Establish Link",
      linking: "Linking..."
    }
  },
  addPerson: {
    title: "Preserve Lineage Record",
    portrait: "Profile Portrait",
    fields: {
      name: "Full Legal Name",
      namePlaceholder: "e.g. Eleanor Rose Harrington",
      gender: "Gender",
      birthPlace: "Birth Place",
      birthPlacePlaceholder: "City, Country",
      birthDate: "Birth Date",
      deathDate: "Death Date (Optional)",
      deathPlaceholder: "Living",
      bio: "Archival Biography",
      bioPlaceholder: "Briefly describe their legacy..."
    },
    genders: {
      male: "Male",
      female: "Female"
    },
    actions: {
      cancel: "Discard",
      submit: "Create Profile",
      archiving: "Archiving..."
    }
  }
};
