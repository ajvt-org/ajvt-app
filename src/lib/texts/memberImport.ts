export const memberImport = {
  columns: {
    fullName: ["الاسم الكامل", "الاسم", "اسم العضو", "full name", "name"],
    phone: ["الهاتف", "رقم الهاتف", "الهاتف المحمول", "phone", "phone number", "tel"],
    village: ["القرية", "قرية", "village"],
    age: ["العصر", "عصر", "الفئة", "age", "age group"],
    paymentMethod: ["طريقة الدفع", "الدفع", "payment method", "method"],
    paidAmount: ["المبلغ المدفوع", "المبلغ", "amount", "paid amount"],
    paid: ["دفع الاشتراك", "مشترك", "الاشتراك", "paid", "membership"],
  },
  paidYes: ["نعم", "مدفوع", "دفع", "yes", "y", "true", "1", "x"],
  exampleName: "محمد ولد أحمد",
  paidNo: ["لا", "غير مدفوع", "no", "n", "false", "0", ""],
} as const;
