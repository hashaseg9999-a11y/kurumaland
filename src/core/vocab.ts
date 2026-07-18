export const VOCAB = {
  // 車種（A1・A3・A6）
  car: { ja: 'くるま', en: 'car', th: 'รถยนต์' },
  bus: { ja: 'ばす', en: 'bus', th: 'รถบัส' },
  truck: { ja: 'とらっく', en: 'truck', th: 'รถบรรทุก' },
  fireTruck: { ja: 'しょうぼうしゃ', en: 'fire truck', th: 'รถดับเพลิง' },
  dumpTruck: { ja: 'だんぷかー', en: 'dump truck', th: 'รถดัมพ์' },
  cargoTruck: { ja: 'にもつのとらっく', en: 'cargo truck', th: 'รถบรรทุกสินค้า' },

  // 色（A1・A2）
  red: { ja: 'あか', en: 'red', th: 'สีแดง' },
  blue: { ja: 'あお', en: 'blue', th: 'สีน้ำเงิน' },
  yellow: { ja: 'きいろ', en: 'yellow', th: 'สีเหลือง' },
  green: { ja: 'みどり', en: 'green', th: 'สีเขียว' },

  // 大小・形（A3・A6）
  big: { ja: 'おおきい', en: 'big', th: 'ใหญ่' },
  small: { ja: 'ちいさい', en: 'small', th: 'เล็ก' },
  circle: { ja: 'まる', en: 'circle', th: 'วงกลม' },
  bigCar: { ja: 'おおきい くるま', en: 'big car', th: 'รถคันใหญ่' },
  smallCar: { ja: 'ちいさい くるま', en: 'small car', th: 'รถคันเล็ก' },
  redCar: { ja: 'あかい くるま', en: 'red car', th: 'รถสีแดง' },
  blueCar: { ja: 'あおい くるま', en: 'blue car', th: 'รถสีน้ำเงิน' },
  yellowCar: { ja: 'きいろい くるま', en: 'yellow car', th: 'รถสีเหลือง' },
  greenCar: { ja: 'みどりの くるま', en: 'green car', th: 'รถสีเขียว' },

  // なぞり・洗車（A4・A5）
  arrived: { ja: 'とうちゃく', en: 'arrived', th: 'ถึงแล้ว' },
  sponge: { ja: 'すぽんじ', en: 'sponge', th: 'ฟองน้ำ' },
  foam: { ja: 'あわあわ', en: 'bubbles', th: 'ฟองสบู่' },
  water: { ja: 'じゃー', en: 'water', th: 'น้ำ' },
  hose: { ja: 'ほーす', en: 'hose', th: 'สายยาง' },
  towel: { ja: 'たおる', en: 'towel', th: 'ผ้าขนหนู' },
  wipe: { ja: 'ふきふき', en: 'wipe', th: 'เช็ด' },
  clean: { ja: 'ぴかぴか', en: 'all clean', th: 'สะอาดแล้ว' },

  // 静かなほめことば（全アクティビティ共通）
  wellDone: { ja: 'よくできました', en: 'well done', th: 'เก่งมาก' },
  goodJob: { ja: 'じょうずに できたね', en: 'good job', th: 'ทำได้ดีมาก' },
} as const;

export type VocabKey = keyof typeof VOCAB;
