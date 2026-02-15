export const modals = {
  upload: {
    title: "አዲስ ትውስታን ጠብቅ",
    dropzone: "ለመስቀል ይጫኑ ወይም ይጎትቱ",
    processing: "ቅርሱን በመጠበቅ ላይ...",
    fields: {
      title: "ርዕስ",
      date: "ቀን",
      location: "ቦታ",
      tags: "መለያዎች",
      story: "ታሪኩ"
    },
    actions: {
      cancel: "ሰርዝ",
      submit: "ጠብቅ",
      uploading: "በመጫን ላይ..."
    }
  },
  invite: {
    title: "ወደ ቤተሰብ ጋብዝ",
    emailLabel: "የኢሜይል አድራሻ",
    emailPlaceholder: "ስም@ኢሜይል.ኮም",
    roleLabel: "የፍቃድ ደረጃ",
    roles: {
      admin: {
        label: "አስተዳዳሪ",
        desc: "በማከማቻው እና በአባላት ላይ ሙሉ ቁጥጥር"
      },
      contributor: {
        label: "አበርካች",
        desc: "ትውስታዎችን መጫን እና ማስተካከል ይችላል"
      },
      viewer: {
        label: "ተመልካች",
        desc: "መዝገቦችን የማየት ብቻ መብት"
      }
    },
    actions: {
      cancel: "ሰርዝ",
      submit: "ግብዣ ላክ",
      sending: "በመላክ ላይ..."
    }
  },
  relation: {
    title: "ዝምድናን ያገናኙ",
    personA: "ዘመድ ሀ ይምረጡ",
    personB: "ዘመድ ለ ይምረጡ",
    placeholder: "ዘመድ ይምረጡ...",
    typeLabel: "የዝምድና ዓይነት",
    types: {
      parent: "ወላጅ",
      adoptiveParent: "አሳዳጊ ወላጅ",
      spouse: "የትዳር አጋር",
      sibling: "ወንድም/እህት"
    },
    actions: {
      cancel: "ሰርዝ",
      submit: "ዝምድና ፍጠር",
      linking: "በማገናኘት ላይ..."
    }
  },
  addPerson: {
    title: "የዘር ሐረግ መዝገብ ጠብቅ",
    portrait: "የመገለጫ ምስል",
    fields: {
      name: "ሙሉ የህግ ስም",
      namePlaceholder: "ምሳሌ፡ እሌኒ ሮዝ ሃሪንግተን",
      gender: "ጾታ",
      birthPlace: "የትውልድ ቦታ",
      birthPlacePlaceholder: "ከተማ፣ ሀገር",
      birthDate: "የትውልድ ቀን",
      deathDate: "የሞት ቀን (ካለ)",
      deathPlaceholder: "በህይወት ያለ",
      bio: "የህይወት ታሪክ",
      bioPlaceholder: "የቅርሱን ታሪክ ባጭሩ ይግለጹ..."
    },
    genders: {
      male: "ወንድ",
      female: "ሴት"
    },
    actions: {
      cancel: "ተወው",
      submit: "መገለጫ ፍጠር",
      archiving: "በመመዝገብ ላይ..."
    }
  }
};
