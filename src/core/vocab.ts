export const VOCAB = {
  // 車種（A1・A3・A6・A7・A8）
  car: { ja: 'くるま', en: 'car', th: 'รถยนต์' },
  bus: { ja: 'ばす', en: 'bus', th: 'รถบัส' },
  truck: { ja: 'とらっく', en: 'truck', th: 'รถบรรทุก' },
  fireTruck: { ja: 'しょうぼうしゃ', en: 'fire truck', th: 'รถดับเพลิง' },
  policeCar: { ja: 'ぱとかー', en: 'police car', th: 'รถตำรวจ' },
  dumpTruck: { ja: 'だんぷかー', en: 'dump truck', th: 'รถดัมพ์' },
  cargoTruck: { ja: 'みどりの とらっく', en: 'green truck', th: 'รถบรรทุกสีเขียว' },
  ambulance: { ja: 'きゅうきゅうしゃ', en: 'ambulance', th: 'รถพยาบาล' },
  raceCar: { ja: 'れーすかー', en: 'race car', th: 'รถแข่ง' },
  train: { ja: 'でんしゃ', en: 'train', th: 'รถไฟ' },

  // 信号・動作・ルール（A1）
  go: { ja: 'あお！ ごー！', en: 'green! go!', th: 'สีเขียว! ไปเลย!' },
  stop: { ja: 'あか！ とまれ！', en: 'red! stop!', th: 'สีแดง! หยุด!' },
  caution: { ja: 'きいろ！ ちゅうい！', en: 'yellow! caution!', th: 'สีเหลือง! ระวัง!' },
  railroadCrossing: { ja: 'かんかんかん！ でんしゃが くるよ', en: 'ding ding! train is coming', th: 'รถไฟกำลังมา!' },
  animalCrossing: { ja: 'どうぶつさんが わたるよ', en: 'animals crossing', th: 'สัตว์กำลังข้ามถนน' },
  driveFast: { ja: 'ぶるるーん！ はやいね！', en: 'vroom! so fast!', th: 'เร็วมากเลย!' },

  // 色と車庫・仲間分け（A1・A2）
  red: { ja: 'あか', en: 'red', th: 'สีแดง' },
  blue: { ja: 'あお', en: 'blue', th: 'สีน้ำเงิน' },
  yellow: { ja: 'きいろ', en: 'yellow', th: 'สีเหลือง' },
  green: { ja: 'みどり', en: 'green', th: 'สีเขียว' },
  pink: { ja: 'ぴんく', en: 'pink', th: 'สีชมพู' },
  purple: { ja: 'むらさき', en: 'purple', th: 'สีม่วง' },
  orange: { ja: 'おれんじ', en: 'orange', th: 'สีส้ม' },
  white: { ja: 'しろ', en: 'white', th: 'สีขาว' },
  redCar: { ja: 'あかい くるま', en: 'red car', th: 'รถสีแดง' },
  blueCar: { ja: 'あおい くるま', en: 'blue car', th: 'รถสีน้ำเงิน' },
  yellowCar: { ja: 'きいろい くるま', en: 'yellow car', th: 'รถสีเหลือง' },
  greenCar: { ja: 'みどりの くるま', en: 'green car', th: 'รถสีเขียว' },
  redGarage: { ja: 'あかい しゃこ', en: 'red garage', th: 'โรงรถสีแดง' },
  blueGarage: { ja: 'あおい しゃこ', en: 'blue garage', th: 'โรงรถสีน้ำเงิน' },
  yellowGarage: { ja: 'きいろい しゃこ', en: 'yellow garage', th: 'โรงรถสีเหลือง' },
  greenGarage: { ja: 'みどりの しゃこ', en: 'green garage', th: 'โรงรถสีเขียว' },
  openShutter: { ja: 'がらがら〜！ あいたよ！', en: 'open the garage!', th: 'เปิดโรงรถ!' },
  sameColor: { ja: 'おなじ いろ だね！', en: 'same color!', th: 'สีเดียวกัน!' },

  // 大中小・比較・順序（A3）
  big: { ja: 'おおきい！', en: 'big!', th: 'ใหญ่!' },
  middle: { ja: 'まんなか！', en: 'medium!', th: 'ปานกลาง!' },
  small: { ja: 'ちいさい！', en: 'small!', th: 'เล็ก!' },
  bigCar: { ja: 'おおきい くるま', en: 'big car', th: 'รถคันใหญ่' },
  middleCar: { ja: 'まんなかの くるま', en: 'medium car', th: 'รถคันกลาง' },
  smallCar: { ja: 'ちいさい くるま', en: 'small car', th: 'รถคันเล็ก' },
  tunnelPass: { ja: 'とんねる くぐれたね！', en: 'through the tunnel!', th: 'ลอดอุโมงค์แล้ว!' },
  perfect: { ja: 'ぴったり！', en: 'perfect!', th: 'พอดีเลย!' },
  inOrder: { ja: 'おおきい じゅんばん だね！', en: 'in size order!', th: 'เรียงตามขนาด!' },

  // なぞり・めいろ（A4）
  startTrace: { ja: 'みちを なぞろう', en: 'trace the road', th: 'ลากตามเส้นทาง' },
  mazeGo: { ja: 'めいろを すすもう！', en: 'let’s do the maze!', th: 'ลุยเขาวงกตกัน!' },
  starGet: { ja: 'きらきら ほしを げっと！', en: 'got a star!', th: 'ได้ดาวแล้ว!' },
  rainbowRoad: { ja: 'にじの みち だね！', en: 'rainbow road!', th: 'ถนนสายรุ้ง!' },
  arrived: { ja: 'とうちゃく！', en: 'arrived!', th: 'ถึงแล้ว!' },
  goal: { ja: 'ごーる！ やったね！', en: 'goal! you did it!', th: 'ถึงเส้นชัยแล้ว!' },

  // 洗車・道具（A5）
  sponge: { ja: 'すぽんじ あわあわ〜', en: 'sponge bubbles', th: 'ฟองน้ำ' },
  brush: { ja: 'ぐるぐる ぶらし！', en: 'spin brush!', th: 'แปรงหมุน!' },
  water: { ja: 'しゃわー！ じゃー！', en: 'water shower!', th: 'น้ำฝักบัว' },
  dryer: { ja: 'どらいやー ぶおーん！', en: 'blow dry!', th: 'เป่าแห้ง!' },
  wax: { ja: 'ぴかぴか わっくす！', en: 'sparkly wax!', th: 'เคลือบเงา!' },
  clean: { ja: 'ぴっかぴか！ きれいに なったね！', en: 'all sparkly clean!', th: 'สะอาดแวววาวแล้ว!' },

  // パズル・メカニック（A6）
  tire: { ja: 'たいや を つけよう！', en: 'attach the tire!', th: 'ใส่ล้อรถ!' },
  body: { ja: 'ぼでぃ を のせよう！', en: 'put the body on!', th: 'ใส่ตัวถัง!' },
  ladderPart: { ja: 'はしご を つけたよ！', en: 'attached the ladder!', th: 'ใส่บันไดแล้ว!' },
  sirenPart: { ja: 'さいれん を のせたよ！', en: 'attached the siren!', th: 'ใส่ไซเรนแล้ว!' },
  snap: { ja: 'がっしゃん！ ぴったんこ！', en: 'click! snapped together!', th: 'ต่อติดแล้ว!' },
  completePuzzle: { ja: 'できたー！ しゅっぱつ しんこう！', en: 'completed! let’s go!', th: 'เสร็จแล้ว! ออกเดินทาง!' },

  // 音・光・メロディ（A7）
  doReMi: { ja: 'どれみふぁ〜♪', en: 'do-re-mi~♪', th: 'โด เร มี~♪' },
  siren: { ja: 'うー！ ぴーぽー！', en: 'wee-woo!', th: 'หวอ หวอ!' },
  policeSound: { ja: 'うー！ ぱとかー だよ！', en: 'police siren!', th: 'เสียงรถตำรวจ!' },
  hornSound: { ja: 'ぷっぷー！', en: 'beep beep!', th: 'ป๊บ ป๊บ!' },
  headlight: { ja: 'ぴかー！ ひかり！', en: 'shine! lights!', th: 'แสงไฟสว่าง!' },
  nightExplore: { ja: 'よるの まちを たんけんだ！', en: 'explore the night city!', th: 'สำรวจเมืองยามค่ำคืน!' },
  foundAnimal: { ja: 'みつけた！', en: 'found it!', th: 'เจอแล้ว!' },

  // 感覚あそび（ボール・泡泡・花）
  bounceBall: { ja: 'ぼーん！ たのしいね！', en: 'boing! so fun!', th: 'เด้ง! สนุกจัง!' },
  bubblePop: { ja: 'ぱちん！ あわが はじけた！', en: 'pop! bubble burst!', th: 'ปอด! ฟองแตกแล้ว!' },
  flower: { ja: 'はなだよ', en: 'a flower!', th: 'ดอกไม้นะ' },
  bloom: { ja: 'さいた！ きれいね！', en: 'it bloomed! pretty!', th: 'บานแล้ว! สวยจัง!' },
  dandelion: { ja: 'たんぽぽの わたげだよ', en: 'a dandelion puff!', th: 'เมล็ดแดนดิไลออน!' },

  // 数・連結トレイン（A8）
  count1: { ja: 'いち！', en: 'one!', th: 'หนึ่ง!' },
  count2: { ja: 'に！', en: 'two!', th: 'สอง!' },
  count3: { ja: 'さん！', en: 'three!', th: 'สาม!' },
  count4: { ja: 'よん！', en: 'four!', th: 'สี่!' },
  count5: { ja: 'ご！', en: 'five!', th: 'ห้า!' },
  connect: { ja: 'がっしゃん！ つながったよ！', en: 'connected together!', th: 'ต่อกันแล้ว!' },
  depart: { ja: 'しゅっぱつ しんこうー！ ぽっぽー！', en: 'all aboard! let’s go!', th: 'ออกเดินทางได้! ปู้นๆ!' },

  // ほめことば・歓声（全アクティビティ共通）
  wellDone: { ja: 'よく できたね！', en: 'well done!', th: 'เก่งมาก!' },
  goodJob: { ja: 'たいへん よく できました！', en: 'fantastic job!', th: 'ยอดเยี่ยมมาก!' },
  great: { ja: 'やったー！ だいせいこう！', en: 'yay! big success!', th: 'ไชโย! สำเร็จแล้ว!' },
  genius: { ja: 'すごい！ じょうずだね！', en: 'amazing! so good!', th: 'สุดยอด! เก่งจังเลย!' },
} as const;

export type VocabKey = keyof typeof VOCAB;

