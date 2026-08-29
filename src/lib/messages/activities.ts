export const activities = {
  notFound: "النشاط غير موجود",
  copyOf: (title: string) => `${title} (نسخة)`,
  titleTooLong: "العنوان طويل جداً (60 حرفاً كحد أقصى)",
  descriptionTooLong: "الوصف طويل جداً (1000 حرف كحد أقصى)",
  notATournament: "هذا النشاط ليس بطولة",
  tournamentAndVolunteer: "لا يمكن أن يكون النشاط بطولة وحملة تطوعية في آن واحد",
  whatsappRequired: "رابط مجموعة الواتساب مطلوب لحملات التطوع",
  pendingBeforeCampaign:
    "هناك طلبات تسجيل قيد المراجعة على هذا النشاط. اقبلها أو ارفضها قبل تحويله إلى حملة تطوعية",
  registrationClosed: "التسجيل في هذا النشاط مغلق",
  membershipBehind:
    "اشتراكك لم يُجدَّد لهذه السنة — تقدر تتابع أنشطتك الحالية، والتسجيل في نشاط جديد يحتاج تجديد الاشتراك",
  membershipNotApproved: "يجب أن تكون عضوية هذا الشخص مقبولة أولاً",
  alreadyRegistered: "مسجَّل بالفعل في هذا النشاط",
  noSeatsLeft: "لا يوجد عدد كافٍ من الأماكن المتبقية في هذا النشاط",
} as const;
