export const helpCenter = {
  header: {
    badge: "የእውቀት መሰረት",
    title: "የእርዳታ ማዕከል",
    subtitle: "ለማህደር ሰቀላ፣ AI ግምገማ፣ ማሻሻያ፣ የአባል አስተዳደር፣ Timeline እና ቅንብሮች ዝርዝር መመሪያዎችን ያግኙ።"
  },
  searchPlaceholder: "ቁልፍ ቃላትን፣ ሞጁሎችን ወይም ባህሪያትን ይፈልጉ...",
  actions: {
    learn: "መመሪያ ክፈት",
    clear: "ፍለጋን አጽዳ",
    gotIt: "ገባኝ"
  },
  empty: {
    title: "ምንም መመሪያ አልተገኘም ለ",
    subtitle: "ሰፋ ያሉ ቁልፍ ቃላትን ለመጠቀም ይሞክሩ ወይም ከላይ ያሉትን የሞጁል ምድቦች ያስሱ።"
  },
  modal: {
    overview: "ማጠቃለያ",
    procedure: "እንዴት እንደሚደረግ",
    proTip: "ፈጣን ምክር",
    proTipContent: "ፎቶ ሲሰቀል EXIF እና face detection ውጤቶችን በመጀመሪያ ይፈትሹ ከዚያ ቀን/ሰው ግንኙነት ይመኩ።"
  },
  categories: {
    vault: "የማከማቻ ጥበቃ",
    lineage: "የዘር ሐረግ ካርታ",
    members: "የአባላት አስተዳደር",
    security: "የስርዓት ደህንነት",
    timeline: "የጊዜ ቅደም ተከተል አሰሳ",
    settings: "የማከማቻ ቅንብሮች"
  },
  articles: {
    upload: {
      title: "ትውስታ መስቀል",
      content: "እስከ 10 ፋይሎች ያሉትን አንድ memory ይፍጠሩ፣ primary file ይምረጡ እና privacy ይዘጋጁ።",
      steps: [
        "ከጎን ምናሌ ወደ Vault ይግቡ።",
        "\"Preserve Memory\" ይጫኑ (Admin/Contributor ብቻ)።",
        "እስከ 10 ፋይሎች ያክሉ እና primary file ይምረጡ።",
        "Title, Date, Location, Tags, The Story እና Privacy ይሙሉ።",
        "\"Preserve\" ከጫኑ በኋላ ለፎቶ EXIF እና face detection በጀርባ ይጀምራል።"
      ]
    },
    search: {
      title: "ፍለጋ፣ ማጣሪያ እና Favorites",
      content: "ልዩ ትውስታዎችን በፍጥነት ለማግኘት ፍለጋና filters ይጠቀሙ እና የሚፈልጉትን favorite ያድርጉ።",
      steps: [
        "በVault የፍለጋ ሳጥን ውስጥ ቁልፍ ቃል ወይም ሐረግ ያስገቡ።",
        "Filters ከፍተው በPeople, Tags, Type, Location, Era, Date Range ይጣሩ።",
        "Sort እና Grid/List view ይቀይሩ።",
        "\"All Items\" እና \"Favorites\" ትሮችን በተለዋዋጭ ይጠቀሙ።",
        "\"Reset Filters\" ወይም የፍለጋ ማጥፊያ ተጠቅመው ሙሉ ዝርዝር ይመለሱ።"
      ]
    },
    ai: {
      title: "EXIF እና Face ግምገማ",
      content: "ፎቶ ከተሰቀለ በኋላ EXIF እና face detection ይሄዳሉ፣ ነገር ግን የሰው ማረጋገጫ ያስፈልጋል።",
      steps: [
        "ፎቶ በdetail modal ውስጥ ይክፈቱ።",
        "EXIF እና face status badges እስኪጠናቀቁ ድረስ ይጠብቁ።",
        "\"EXIF needs review\" ካዩ uploader ብቻ Accept/Reject ማድረግ ይችላል።",
        "Unknown face ላይ ጠቅ በማድረግ የቤተሰብ ሰው ያገናኙ።",
        "\"Draw Tag\" በመጠቀም በእጅ ሳጥን አስቀምጠው ሰው ያስያዙ።"
      ]
    },
    restoration: {
      title: "የአሮጌ ፎቶ ማሻሻያ",
      content: "Denoise እና Colorize በመጠቀም ፎቶዎችን ያሻሽሉ እና before/after አነጻጽር ይዩ።",
      steps: [
        "ፎቶ ክፈቱ እና Restoration panel ይምረጡ።",
        "Denoise እና/ወይም Colorize አማራጮችን ይምረጡ።",
        "\"Restore Photo\" ይጫኑ እና status ይጠብቁ።",
        "Warning ካለ ይፈትሹ እና original/restored አነጻጽር ይመልከቱ።",
        "ማሻሻያ ከተጠናቀቀ በኋላ ያውርዱ ወይም ቀጥለው ያርትዑ።"
      ]
    },
    tree: {
      title: "Family Tree መገንባት እና ማስተካከል",
      content: "Profiles ፍጠሩ፣ ግንኙነቶችን ያያይዙ እና የቤተሰብ አውድ ከVault ጋር እንዲቆይ ያድርጉ።",
      steps: [
        "Family Tree ይክፈቱ እና በname/date/place/bio/portrait ፕሮፋይል ያክሉ።",
        "\"Link Kin\" በመጠቀም Parent, Adoptive Parent, Spouse, Sibling ያስገናኙ።",
        "Person node በመጫን profile ያርትዑ።",
        "ለትልቅ tree ማየት zoom controls ይጠቀሙ።",
        "\"Mapped Relationships\" ዝርዝር ላይ ስህተት ካለ ያስወግዱ።"
      ]
    },
    invite: {
      title: "አባላትን መጋበዝ እና ማስተዳደር",
      content: "Admin በemail ሊጋብዝ ይችላል፣ ሚና ሊመድብ እና pending/active አባላትን ሊቆጣጠር ይችላል።",
      steps: [
        "Members ገጽ ይክፈቱ (Admin ብቻ)።",
        "\"Invite Member\" በመጠቀም Contributor ወይም Viewer ይምረጡ።",
        "Search እና role filter በመጠቀም አባላትን በፍጥነት ያግኙ።",
        "Pending/Active እቃዎች ላይ role ያስተካክሉ።",
        "Pending invite ይሰርዙ ወይም አባል ከvault ያስወግዱ።"
      ]
    },
    shareLinks: {
      title: "Shareable Invite Links",
      content: "ለቀላል onboarding በrole እና expiry የሚቆጣጠሩ የመግቢያ ሊንኮች ይፍጠሩ።",
      steps: [
        "በMembers ውስጥ \"Shareable Invite Links\" ክፍል ይክፈቱ።",
        "Role እና expiry date ይምረጡ እና \"Generate Shareable Link\" ይጫኑ።",
        "የተፈጠረውን link ቅጂ ያድርጉ እና ያጋሩ።",
        "Joined count እና status (Active/Expired/Revoked) ይከታተሉ።",
        "አስፈላጊ ካልሆነ ሊንኩን revoke ወይም delete ያድርጉ።"
      ]
    },
    audit: {
      title: "Audit Logs እና Export",
      content: "Admin የaccess/management ክስተቶችን ይከታተላል እና በfilter የተመረጡ ሎጎችን ያውርዳል።",
      steps: [
        "Audit Logs ክፈቱ (Admin ብቻ)።",
        "Category/timeframe ይምረጡ እና actor/action/resource ይፈልጉ።",
        "በኮለሞች ላይ ይዘው ያስደርዱ እና ገፆችን ያስሱ።",
        "Refresh በመጠቀም አዲስ መዝገቦችን ይዘምኑ።",
        "\"Download Audit\" በመጫን የተመረጠውን ውጤት ያውርዱ።"
      ]
    },
    timeline: {
      title: "Timeline አጠቃቀም",
      content: "ትውስታዎችን በዘመን እና በማደራጀት ሁኔታ ይመልከቱ እና ካርዶችን በዝርዝር ይክፈቱ።",
      steps: [
        "Timeline ከsidebar ይክፈቱ።",
        "Order: Newest First ወይም Oldest First ይምረጡ።",
        "የdecade chips ወይም \"All Eras\" ተጠቅመው ውጤት ይጣሩ።",
        "Timeline card ክፈቱ እና media/people ዝርዝር ይመልከቱ።",
        "ከታች ያለው progress indicator የንቁ date range ያሳያል።"
      ]
    },
    notifications: {
      title: "የማሳወቂያ ቅንብሮች",
      content: "In-app እና push ቻናሎችን እንዲሁም የክስተት ማሳወቂያ ምርጫዎችን ያስተዳድሩ።",
      steps: [
        "Settings > Archival Alerts ይክፈቱ።",
        "In-app እና browser push ያብሩ/ያጥፉ (VAPID ካለ)።",
        "Uploads, Comments, Tree updates, Security alerts, Member joins ይምረጡ።",
        "\"Test Push\" በመጠቀም መድረሱን ያረጋግጡ።",
        "ከheader የbell menu ውስጥ mark read, dismiss, clear ይጠቀሙ።"
      ]
    },
    vaultPrefs: {
      title: "የVault ፖሊሲ እና Health",
      content: "Admins የvault ነባሪ ቅንብሮችን ያስተካክላሉ እና duplicate file cleanup በደህንነት ያካሂዳሉ።",
      steps: [
        "Settings > Vault Prefs ይክፈቱ።",
        "Family Name, Storage Quality, እና default Privacy ያዘጋጁ።",
        "Delete Safety Window ያስተካክሉ።",
        "Archival Health analysis ይክፈቱ እና duplicate groups ይመልከቱ።",
        "ከcleanup በፊት Safe Preview ይሂዱ ከዚያ selected groups ያጽዱ።"
      ]
    },
    ownership: {
      title: "Ownership ማስተላለፍ እና Vault መተው",
      content: "Owner/Admin ከvault ከመውጣቱ በፊት ባለቤትነት ወደ ሌላ አባል ማስተላለፍ ይኖርበታል።",
      steps: [
        "በVault Prefs ውስጥ active contributor እንደ transfer target ይምረጡ።",
        "የአሁኑን admin password በማስገባት transfer ያረጋግጡ።",
        "Transfer በኋላ role ወደ Contributor ይወርዳል።",
        "Owner transfer ሳይደረግ Admin ከvault ሊወጣ አይችልም።",
        "\"Leave Vault\" ከጠቀሙ በኋላ መዳረሻ ወዲያውኑ ይቋረጣል።"
      ]
    }
  }
};
