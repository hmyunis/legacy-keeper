
export const settings = {
  title: "የማከማቻ ቅንብሮች",
  subtitle: "የእርስዎን የግል ማህደር የስራ ቦታ ያዋቅሩ።",
  tabs: {
    profile: "ማንነት",
    vault: "የማከማቻ ምርጫዎች",
    appearance: "ገጽታ",
    notifications: "የማህደር ማንቂያዎች"
  },
  profile: {
    title: "የቅርስ ጠባቂ",
    desc: "መገለጫዎ ለሌሎች ለተጋበዙ የቤተሰብ አባላት ይታያል።",
    role: "ሚና",
    fields: {
      name: "ሙሉ የህግ ስም",
      email: "ኢሜይል",
      bio: "የህይወት ታሪክ"
    },
    actions: {
      submit: "ለውጦችን አረጋግጥ",
      updating: "በማዘመን ላይ..."
    },
    toasts: {
      success: "ማንነት ተዘምኗል"
    }
  },
  vault: {
    title: "የማከማቻ አመክንዮ",
    subtitle: "የማህደሩ ሞተር የቤተሰብዎን ቅርስ እንዴት እንደሚያስኬድ ያዋቅሩ።",
    rules: "የማቀነባበሪያ ደንቦች",
    memberNoticeTitle: "የተገደበ መዳረሻ",
    memberNoticeDesc: "የማቀነባበሪያ ነባሪዎችን ማስተካከል የሚችሉት አስተዳዳሪዎች ብቻ ናቸው። ከታች ግን ከዚህ ማከማቻ መውጣት ይችላሉ።",
    familyName: {
      title: "የቤተሰብ ስም",
      description: "ይህ ስም ቤተሰቡን ለዚህ ማከማቻ ይለያል እና በዘር ሐረግ እና በጊዜ መስመር ገጾች ላይ ይታያል።",
      placeholder: "የቤተሰብ ስም ያስገቡ",
      save: "ስሙን አስቀምጥ",
      saving: "በማስቀመጥ ላይ...",
      required: "የቤተሰብ ስም ያስፈልጋል።",
      noVaultSelected: "ንቁ ማከማቻ አልተመረጠም።",
      success: "የቤተሰብ ስም ተዘምኗል።",
      error: "የቤተሰብ ስም ማዘመን አልተቻለም",
      errorDesc: "እባክዎ እንደገና ይሞክሩ።"
    },
    quality: "የማከማቻ ጥራት",
    qualities: {
      balanced: { label: "የተመጣጠነ", desc: "ተስማሚ ቦታ ቆጣቢ" },
      high: { label: "ከፍተኛ", desc: "ከፍተኛ ጥራት" },
      original: { label: "ዋናው", desc: "ያለኪሳራ ጥበቃ" }
    },
    privacy: "የግላዊነት መሰረት",
    privacies: {
      private: { label: "የግል ሁነታ", desc: "በነባሪ አዲስ ሰቀላዎችን ማየት የሚችሉት እርስዎ ብቻ ነዎት።" },
      family: { label: "የቤተሰብ ድርሻ", desc: "በራስ-ሰር ከቤተሰብ አባላት ጋር ይጋራል።" }
    },
    health: "የማህደር ጤና",
    healthDesc: "የስርዓት ቅኝት በ1950ዎቹ ስብስብ ውስጥ 12 ተደጋጋሚ መዝገቦች መገኘታቸውን ያሳያል። ማጽዳት ይመከራል።",
    leave: {
      title: "ከዚህ ማከማቻ ውጣ",
      description: "ወዲያውኑ ወደዚህ የቤተሰብ ማከማቻ መዳረሻዎን ያጣሉ። ዳግም ለመቀላቀል አዲስ ግብዣ ያስፈልጋል።",
      button: "ማከማቻን ተው",
      loading: "በመውጣት ላይ...",
      confirmPrompt: "ከዚህ ማከማቻ መውጣት እርግጠኛ ነዎት?",
      noVaultSelected: "ንቁ ማከማቻ አልተመረጠም።",
      success: "በተሳካ ሁኔታ ከማከማቻው ወጥተዋል።",
      error: "ከማከማቻው መውጣት አልተቻለም",
      errorDesc: "እባክዎ እንደገና ይሞክሩ።"
    },
    transfer: {
      title: "ባለቤትነት ማስተላለፍ",
      description: "የማከማቻ ባለቤትነትን ወደ ሌላ ንቁ አባል ያስተላልፉ። እርስዎ ባለቤት ከሆኑበት ማከማቻ ከመውጣትዎ በፊት ይህን ያድርጉ።",
      selectPlaceholder: "አባል ይምረጡ",
      button: "አስተላልፍ",
      loading: "በማስተላለፍ ላይ...",
      ownerOnly: "ባለቤትነትን ማስተላለፍ የሚችለው የአሁኑ ባለቤት ብቻ ነው።",
      noVaultSelected: "ንቁ ማከማቻ አልተመረጠም።",
      noTargetSelected: "እባክዎ መጀመሪያ አባል ይምረጡ።",
      confirmPrompt: "ባለቤትነትን ወደዚህ ያስተላልፉ:",
      success: "ባለቤትነት በተሳካ ሁኔታ ተላልፏል።",
      error: "ባለቤትነት ማስተላለፍ አልተቻለም",
      errorDesc: "እባክዎ እንደገና ይሞክሩ።"
    },
    toasts: {
      success: "የማከማቻ አመክንዮ ተዘምኗል"
    }
  },
  notifications: {
    title: "የማህደር ማንቂያዎች",
    subtitle: "ከቤተሰብ ማከማቻው ዝመናዎችን እንዴት እንደሚቀበሉ ያዋቅሩ።",
    status: "የቀጥታ ማመሳሰል ንቁ ነው",
    delivery: "የማስተላለፊያ መንገዶች",
    inApp: "የመተግበሪያ ውስጥ ማሳወቂያዎች",
    inAppDesc: "መተግበሪያውን ሲጠቀሙ በላይኛው የማሳወቂያ ማዕከል ውስጥ ማንቂያዎችን ይቀበሉ።",
    push: "የአሳሽ ግፋ ማሳወቂያዎች",
    pushDesc: "ታቡ ንቁ ባይሆንም ለዚህ አሳሽ የስርዓት ግፋ ማሳወቂያዎችን ይላኩ።",
    pushUnavailable: "በbackend ላይ VAPID ቁልፎች እስኪቀናበሩ ድረስ የግፋ ማሳወቂያዎች አይገኙም።",
    memory: "የትውስታ ጥበቃ",
    newUploads: "አዲስ ሰቀላዎች",
    newUploadsDesc: "ዘመድ በማከማቻው ውስጥ አዲስ ፎቶ ወይም ሰነድ ሲያቆይ ያሳውቁ።",
    comments: "የትውስታ አስተያየቶች",
    commentsDesc: "የቤተሰብ አባላት በቅርሶች ላይ ታሪኮችን ወይም ማስታወሻዎችን ሲያክሉ ማንቂያ ያግኙ።",
    lineage: "የዘር ሐረግ እና ዝምድና",
    tree: "የቤተሰብ ሐረግ ለውጦች",
    treeDesc: "ለአዳዲስ ዘመዶች መጨመር ወይም የተመሰረቱ የዝምድና ግንኙነቶች ማሳወቂያዎች።",
    security: "የማከማቻ ደህንነት",
    alerts: "ወሳኝ የመዳረሻ ማንቂያዎች",
    alertsDesc: "ከአዳዲስ መሣሪያዎች ለመግባት ወይም የፍቃድ ለውጦች አስቸኳይ ማንቂያዎች።",
    activity: "የአባል እንቅስቃሴ",
    activityDesc: "የተጋበዙ ዘመዶች ቤተሰቡን ሲቀላቀሉ ወይም መገለጫቸውን ሲያዘምኑ ያሳውቁ።",
    technology: "የግፋ ቴክኖሎጂ",
    technologyDesc: "ቅንብሮች በሁለቱም የአሳሽ ግፋ እና በውስጠ-መተግበሪያ ማሳወቂያ ማዕከል ላይ ተፈጻሚ ይሆናሉ።",
    test: "ግፋን ይሞክሩ",
    testing: "በመሞከር ላይ...",
    toasts: {
      updated: "ምርጫ ተዘምኗል",
      synced: "የእርስዎ የማህደር ማንቂያ ቅንብሮች ተመሳስለዋል።",
      blocked: "ማሳወቂያ ታግዷል",
      blockedDesc: "አዲስ ሰቀላ ማሳወቂያዎች በአሁኑ ጊዜ በእርስዎ ቅንብሮች ውስጥ ተሰናክለዋል።",
      testSuccess: "የሙከራ ግፋ ደርሷል",
      testDesc: "ማሳወቂያው በእርስዎ የውስጠ-መተግበሪያ ማዕከል ውስጥ ታክሏል።"
    }
  },
  appearance: {
    title: "የመተግበሪያ ገጽታ",
    subtitle: "የማህደር ስራ ቦታዎን አካባቢ ያብጁ።",
    mode: "የቀለም ሁነታ",
    light: "ቀን ሁነታ",
    dark: "ምሽት ሁነታ",
    palette: "ዋናው ቀለም",
    custom: "ብጁ ቀለም",
    hex: "HEX ኮድ",
    reset: "ወደ ነባሪ መልስ"
  },
  actions: {
    export: "ማህደሩን ላክ"
  }
};
