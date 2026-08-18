export type QuestionSpec = [string, string, string[], number];

const CAPITALS: [string, string][] = [
  ["موريتانيا", "نواكشوط"],
  ["المغرب", "الرباط"],
  ["الجزائر", "الجزائر العاصمة"],
  ["تونس", "تونس العاصمة"],
  ["ليبيا", "طرابلس"],
  ["مصر", "القاهرة"],
  ["السودان", "الخرطوم"],
  ["السنغال", "داكار"],
  ["مالي", "باماكو"],
  ["النيجر", "نيامي"],
  ["تشاد", "نجامينا"],
  ["نيجيريا", "أبوجا"],
  ["غانا", "أكرا"],
  ["الكاميرون", "ياوندي"],
  ["كينيا", "نيروبي"],
  ["إثيوبيا", "أديس أبابا"],
  ["الصومال", "مقديشو"],
  ["جيبوتي", "جيبوتي"],
  ["السعودية", "الرياض"],
  ["الإمارات", "أبوظبي"],
  ["قطر", "الدوحة"],
  ["الكويت", "مدينة الكويت"],
  ["البحرين", "المنامة"],
  ["عمان", "مسقط"],
  ["اليمن", "صنعاء"],
  ["الأردن", "عمّان"],
  ["لبنان", "بيروت"],
  ["سوريا", "دمشق"],
  ["العراق", "بغداد"],
  ["فلسطين", "القدس"],
  ["تركيا", "أنقرة"],
  ["إيران", "طهران"],
  ["باكستان", "إسلام آباد"],
  ["الهند", "نيودلهي"],
  ["الصين", "بكين"],
  ["اليابان", "طوكيو"],
  ["فرنسا", "باريس"],
  ["إسبانيا", "مدريد"],
  ["إيطاليا", "روما"],
  ["ألمانيا", "برلين"],
  ["بريطانيا", "لندن"],
  ["البرتغال", "لشبونة"],
  ["روسيا", "موسكو"],
  ["البرازيل", "برازيليا"],
  ["الأرجنتين", "بوينس آيرس"],
  ["كندا", "أوتاوا"],
  ["المكسيك", "مكسيكو سيتي"],
  ["إندونيسيا", "جاكرتا"],
];

const FACTS: QuestionSpec[] = [
  ["كم عدد أركان الإسلام؟", "ثقافة عامة", ["أربعة", "خمسة", "ستة", "سبعة"], 1],
  ["كم عدد أيام الأسبوع؟", "ثقافة عامة", ["خمسة", "ستة", "سبعة", "ثمانية"], 2],
  ["كم عدد شهور السنة الهجرية؟", "ثقافة عامة", ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر"], 2],
  ["كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟", "رياضة", ["9", "10", "11", "12"], 2],
  ["كم عدد اللاعبين في فريق كرة السلة داخل الملعب؟", "رياضة", ["4", "5", "6", "7"], 1],
  ["كم مدة شوط كرة القدم بالدقائق؟", "رياضة", ["30", "40", "45", "50"], 2],
  ["كم عدد أيام شهر رمضان على الأكثر؟", "ثقافة عامة", ["28", "29", "30", "31"], 2],
  ["ما أكبر محيط في العالم؟", "جغرافيا", ["الأطلسي", "الهادئ", "الهندي", "المتجمد"], 1],
  ["ما أطول نهر في أفريقيا؟", "جغرافيا", ["النيجر", "الكونغو", "النيل", "السنغال"], 2],
  [
    "ما أكبر صحراء حارة في العالم؟",
    "جغرافيا",
    ["كلهاري", "الصحراء الكبرى", "أتاكاما", "النفوذ"],
    1,
  ],
  ["كم عدد قارات العالم؟", "جغرافيا", ["خمس", "ست", "سبع", "ثماني"], 2],
  [
    "ما الغاز الذي تتنفسه الكائنات الحية؟",
    "علوم",
    ["النيتروجين", "الأكسجين", "الهيدروجين", "الهيليوم"],
    1,
  ],
  ["كم عدد عظام جسم الإنسان البالغ؟", "علوم", ["186", "196", "206", "216"], 2],
  ["ما درجة غليان الماء بالمئوية؟", "علوم", ["90", "95", "100", "105"], 2],
  ["ما درجة تجمد الماء بالمئوية؟", "علوم", ["0", "5", "10", "-5"], 0],
  ["كم عدد ألوان قوس قزح؟", "علوم", ["خمسة", "ستة", "سبعة", "ثمانية"], 2],
  ["ما أقرب كوكب إلى الشمس؟", "علوم", ["الزهرة", "عطارد", "الأرض", "المريخ"], 1],
  ["كم عدد أيام السنة الميلادية غير الكبيسة؟", "ثقافة عامة", ["364", "365", "366", "367"], 1],
  ["ما العملة الرسمية في موريتانيا؟", "ثقافة عامة", ["الدرهم", "الأوقية", "الدينار", "الفرنك"], 1],
  ["كم عدد حروف اللغة العربية؟", "ثقافة عامة", ["26", "27", "28", "29"], 2],
];

function shuffleOptions(correct: string, distractors: string[], seed: number) {
  const options = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = (seed * (i + 7)) % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(correct) };
}

function numberOptions(
  correct: number,
  seed: number,
): QuestionSpec[3] extends never ? never : { options: string[]; correctIndex: number } {
  const deltas = [1, 2, 3, 5, 7, 10];
  const seen = new Set<number>([correct]);
  const distractors: string[] = [];
  let k = 0;
  while (distractors.length < 3) {
    const delta = deltas[(seed + k) % deltas.length] * (k % 2 === 0 ? 1 : -1);
    const candidate = correct + delta * (1 + Math.floor(k / deltas.length));
    k++;
    if (candidate < 0 || seen.has(candidate)) continue;
    seen.add(candidate);
    distractors.push(String(candidate));
  }
  return shuffleOptions(String(correct), distractors, seed);
}

function arithmetic(): QuestionSpec[] {
  const out: QuestionSpec[] = [];
  for (let i = 0; i < 60; i++) {
    const a = 12 + ((i * 17) % 88);
    const b = 3 + ((i * 29) % 60);
    const { options, correctIndex } = numberOptions(a + b, i + 1);
    out.push([`كم يساوي ${a} + ${b}؟`, "حساب", options, correctIndex]);
  }
  for (let i = 0; i < 45; i++) {
    const a = 60 + ((i * 23) % 140);
    const b = 5 + ((i * 13) % 50);
    const { options, correctIndex } = numberOptions(a - b, i + 3);
    out.push([`كم يساوي ${a} - ${b}؟`, "حساب", options, correctIndex]);
  }
  for (let i = 0; i < 45; i++) {
    const a = 3 + (i % 15);
    const b = 4 + ((i * 7) % 17);
    const { options, correctIndex } = numberOptions(a * b, i + 5);
    out.push([`كم يساوي ${a} × ${b}؟`, "حساب", options, correctIndex]);
  }
  for (let i = 0; i < 30; i++) {
    const base = 200 + i * 20;
    const pct = [10, 20, 25, 50][i % 4];
    const { options, correctIndex } = numberOptions((base * pct) / 100, i + 9);
    out.push([`كم يساوي ${pct}٪ من ${base}؟`, "حساب", options, correctIndex]);
  }
  return out;
}

function geography(): QuestionSpec[] {
  return CAPITALS.map(([country, capital], i) => {
    const others = CAPITALS.filter((_, j) => j !== i).map(([, c]) => c);
    const distractors = [0, 1, 2].map((k) => others[(i * 13 + k * 7 + 3) % others.length]);
    const unique = [...new Set(distractors)].filter((d) => d !== capital);
    while (unique.length < 3) {
      const extra = others[(i + unique.length * 5 + 11) % others.length];
      if (extra !== capital && !unique.includes(extra)) unique.push(extra);
    }
    const { options, correctIndex } = shuffleOptions(capital, unique.slice(0, 3), i + 2);
    return [`ما عاصمة ${country}؟`, "جغرافيا", options, correctIndex] as QuestionSpec;
  });
}

function squares(): QuestionSpec[] {
  const out: QuestionSpec[] = [];
  for (let i = 2; i <= 40; i++) {
    const { options, correctIndex } = numberOptions(i * i, i);
    out.push([`ما مربع العدد ${i}؟`, "حساب", options, correctIndex]);
  }
  return out;
}

function evenOdd(): QuestionSpec[] {
  const out: QuestionSpec[] = [];
  for (let i = 0; i < 40; i++) {
    const n = 101 + i * 13;
    const { options, correctIndex } = numberOptions(Math.floor(n / 2), i + 4);
    out.push([`ما ناتج قسمة ${n * 2} على 2؟`, "حساب", options, correctIndex]);
  }
  return out;
}

export function questionBank(): QuestionSpec[] {
  const all = [...FACTS, ...geography(), ...arithmetic(), ...squares(), ...evenOdd()];
  const seen = new Set<string>();
  return all.filter(([text]) => {
    const key = text.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
