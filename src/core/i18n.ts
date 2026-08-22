import type { Lang } from './speech';

export const I18N_STRINGS = {
  // アプリ全般・メニュー
  appTitle: {
    ja: '✨ くるまランド ✨',
    th: '✨ สวนสนุกรถยนต์ ✨',
    en: '✨ KurumaLand ✨',
  },
  chooseActivity: {
    ja: 'あそびを えらぶ',
    th: 'เลือกกิจกรรม',
    en: 'Choose an Activity',
  },
  backToMenu: {
    ja: 'もどる',
    th: 'กลับ',
    en: 'Back',
  },
  rotateDevice: {
    ja: 'よこにしてね',
    th: 'หมุนเป็นแนวนอนนะ',
    en: 'Please rotate sideways',
  },
  endingMessage: {
    ja: 'おしまい',
    th: 'จบแล้ว',
    en: 'All done',
  },
  playAgain: {
    ja: 'また あそぶ',
    th: 'เล่นอีกครั้ง',
    en: 'Play again',
  },

  // アクティビティ名
  activitySignal: {
    ja: 'しんごうで GO!',
    th: 'ไฟจราจร GO!',
    en: 'Traffic Light GO!',
  },
  activityColorGarage: {
    ja: 'いろの しゃこ',
    th: 'โรงรถหลากสี',
    en: 'Color Garage',
  },
  activityBigSmall: {
    ja: 'おおきい・ちいさい',
    th: 'ใหญ่・เล็ก',
    en: 'Big & Small',
  },
  activityTrace: {
    ja: 'みちを なぞろう',
    th: 'ลากตามเส้นทาง',
    en: 'Trace the Road',
  },
  activityCarWash: {
    ja: 'くるまあらい',
    th: 'ล้างรถแสนสนุก',
    en: 'Car Wash',
  },
  activityPuzzle: {
    ja: 'くるま パズル',
    th: 'ต่อตัวต่อรถยนต์',
    en: 'Car Puzzle',
  },
  activityLightsSound: {
    ja: 'おとと ひかり',
    th: 'เสียงและแสงไฟ',
    en: 'Lights & Sounds',
  },
  activityLineUp: {
    ja: 'ならべて れっしゃ',
    th: 'ขบวนรถไฟยาว',
    en: 'Train Line-up',
  },
  activityBallPool: {
    ja: 'ぼーるぷーる',
    th: 'สระลูกบอล',
    en: 'Ball Pool',
  },
  activityBubblePop: {
    ja: 'あわあわ ぱちぱち',
    th: 'ฟองสบู่ป๊อป',
    en: 'Bubble Pop',
  },
  activityFlowerGarden: {
    ja: 'おはなばたけ',
    th: 'สวนดอกไม้',
    en: 'Flower Garden',
  },

  // A1: 信号 (Signal)
  signalHintInit: {
    ja: 'くるまを タップして はしらせよう！',
    th: 'แตะที่รถเพื่อให้ออกวิ่งเลย!',
    en: 'Tap the car to drive!',
  },
  signalHintGo: {
    ja: 'あお！ ごー！ くるまをタップしてね',
    th: 'สีเขียว! ไปเลย! แตะที่รถนะ',
    en: 'Green! Go! Tap the car!',
  },
  signalHintStop: {
    ja: 'あか！ とまれ！ くるまをタップしてね',
    th: 'สีแดง! หยุด! แตะที่รถนะ',
    en: 'Red! Stop! Tap the car!',
  },
  signalHintCaution: {
    ja: 'きいろ！ ちゅうい！',
    th: 'สีเหลือง! ระวัง!',
    en: 'Yellow! Caution!',
  },

  // A2: 色の車庫 (Color Garage)
  garageHint: {
    ja: 'おなじ いろの しゃこへ つれていこう！',
    th: 'พารถไปที่โรงรถสีเดียวกันเถอะ!',
    en: 'Take the car to the matching garage!',
  },
  garageMatch: {
    ja: 'おなじ いろの しゃこに とうちゃく！',
    th: 'ถึงโรงรถสีเดียวกันแล้ว!',
    en: 'Arrived at the matching garage!',
  },
  garageAllParked: {
    ja: 'ぜんぶの くるまが しゃこに はいったよ！',
    th: 'รถทุกคันเข้าโรงรถเรียบร้อยแล้ว!',
    en: 'All cars are parked in their garages!',
  },

  // A3: 大小 (Big & Small)
  bigSmallHint: {
    ja: 'おおきい くるまと ちいさい くるまだよ！',
    th: 'รถคันใหญ่และรถคันเล็กนะ!',
    en: 'Big car and small car!',
  },
  bigCarGuide: {
    ja: 'おおきい くるま！ おおきい わくへ！',
    th: 'รถคันใหญ่! ไปที่ช่องใหญ่!',
    en: 'Big car! To the big space!',
  },
  middleCarGuide: {
    ja: 'まんなかの くるま！ まんなかの わくへ！',
    th: 'รถคันกลาง! ไปที่ช่องกลาง!',
    en: 'Medium car! To the medium space!',
  },
  smallCarGuide: {
    ja: 'ちいさい くるま！ ちいさい わくへ！',
    th: 'รถคันเล็ก! ไปที่ช่องเล็ก!',
    en: 'Small car! To the small space!',
  },
  bigSmallFit: {
    ja: 'ぴったり とまったよ！',
    th: 'จอดได้พอดีเลย!',
    en: 'Fit perfectly!',
  },
  bigSmallAllParked: {
    ja: 'ぜんぶの くるまが ぴったり とまったよ！',
    th: 'รถทุกคันจอดได้พอดีเลย!',
    en: 'All cars fit into their spots!',
  },

  // A4: 道なぞり (Trace)
  traceHint: {
    ja: 'ゆびで みちを なぞってみよう！',
    th: 'ลองใช้นิ้วลากตามเส้นทางดูนะ!',
    en: 'Trace along the road with your finger!',
  },
  traceCollectStars: {
    ja: 'ほしを あつめて ごーるへ！',
    th: 'เก็บดาวแล้วไปที่เส้นชัยกัน!',
    en: 'Collect stars and head to the goal!',
  },
  traceAllStars: {
    ja: 'ごーる！ ぜんぶの ほしを あつめたよ！',
    th: 'ถึงเส้นชัยแล้ว! เก็บดาวครบทั้งหมดแล้ว!',
    en: 'Goal! You collected all the stars!',
  },

  // A5: 洗車 (Car Wash)
  carWashHintSponge: {
    ja: 'すぽんじで あわあわに しよう！',
    th: 'ใช้ฟองน้ำถูให้เป็นฟองกัน!',
    en: 'Use the sponge to make bubbles!',
  },
  carWashHintShower: {
    ja: 'しゃわーで ながそう！',
    th: 'ล้างด้วยน้ำฝักบัวกัน!',
    en: 'Wash it away with the shower!',
  },
  carWashHintTowel: {
    ja: 'たおるで ふきふき！',
    th: 'เช็ดด้วยผ้าขนหนูกัน!',
    en: 'Wipe it clean with the towel!',
  },
  carWashClean: {
    ja: 'ぴっかぴか！ とっても きれいに なったね！',
    th: 'สะอาดแวววาวแล้ว! สวยงามมากเลย!',
    en: 'Sparkly clean! Look how shiny it is!',
  },

  // A6: パズル (Puzzle)
  puzzleHint: {
    ja: 'ぴーすを くっつけて くるまを つくろう！',
    th: 'ต่อชิ้นส่วนเพื่อประกอบรถกัน!',
    en: 'Snap the pieces together to build the car!',
  },
  puzzleBuild: {
    ja: 'わくへ はめて くるまを くみたてよう！',
    th: 'ต่อชิ้นส่วนเข้ากับกรอบเพื่อประกอบรถกัน!',
    en: 'Fit the pieces to build the car!',
  },
  puzzleComplete: {
    ja: 'くるまが かんせい！ しゅっぱつだ！',
    th: 'ประกอบรถเสร็จแล้ว! ออกเดินทางได้!',
    en: 'Car is complete! Let’s go!',
  },

  // A7: 音と光 (Lights & Sound)
  lightsSoundHint: {
    ja: 'くるまを タップして おとと ひかりを ならそう！',
    th: 'แตะที่รถเพื่อเปิดแสงและเสียงกัน!',
    en: 'Tap the cars to play lights and sounds!',
  },
  lightsSoundPlay: {
    ja: 'ぴかー！ ぷっぷー！',
    th: 'แสงวิบวับ! ปิ๊นๆ!',
    en: 'Shine! Beep beep!',
  },

  // A8: ならべて列車 (Line Up)
  lineUpHint: {
    ja: 'くるまを ならべて れっしゃに しよう！',
    th: 'นำรถมาต่อกันเป็นรถไฟกัน!',
    en: 'Line up the cars to make a train!',
  },
  lineUpConnectCar: {
    ja: 'くるまを れんけつしよう！',
    th: 'นำรถมาต่อกันเถอะ!',
    en: 'Let’s connect the cars!',
  },
  lineUpConnected: {
    ja: '連結！ がっしゃん！',
    th: 'ต่อติดแล้ว! กึก!',
    en: 'Connected! Click!',
  },
  lineUpAllAboard: {
    ja: 'しゅっぱつ しんこうー！ ぽっぽー！',
    th: 'ออกเดินทางได้! ปู้นๆ!',
    en: 'All aboard! Choo choo!',
  },

  // A9-A11: 感覚あそび
  ballPoolHint: {
    ja: 'ボールを タップして はじこう！',
    th: 'แตะลูกบอลให้เด้ง!',
    en: 'Tap the balls to bounce!',
  },
  bubblePopHint: {
    ja: 'あわを つついて ぱちんと はじこう！',
    th: 'จับฟองสบู่ให้แตก!',
    en: 'Pop the bubbles!',
  },
  flowerGardenHint: {
    ja: 'おはなを さいて あそぼう！',
    th: 'ปลูกดอกไม้เล่นกัน!',
    en: 'Make flowers bloom!',
  },
  // 保護者設定 (Parental Gate & Settings)
  parentalSettingsTitle: {
    ja: '保護者向け設定',
    th: 'การตั้งค่าสำหรับผู้ปกครอง',
    en: 'Parental Settings',
  },
  parentalLanguageLabel: {
    ja: '発話する言語',
    th: 'ภาษาของเสียงพูด',
    en: 'Speech Language',
  },
  parentalTimerLabel: {
    ja: 'おしまいタイマー',
    th: 'ตัวจับเวลาสิ้นสุดการเล่น',
    en: 'Play Timer',
  },
  parentalTestSpeech: {
    ja: 'テスト発話',
    th: 'ทดสอบเสียงพูด',
    en: 'Test Speech',
  },
  parentalClose: {
    ja: '閉じる',
    th: 'ปิด',
    en: 'Close',
  },
  parentalResume: {
    ja: '遊びを再開',
    th: 'เล่นต่อ',
    en: 'Resume Play',
  },
} as const;

export type I18nKey = keyof typeof I18N_STRINGS;

export function getI18nText(key: I18nKey, lang: Lang): string {
  const entry = I18N_STRINGS[key];
  if (!entry) {
    return '';
  }
  return entry[lang] ?? entry.ja;
}
