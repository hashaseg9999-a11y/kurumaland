#!/usr/bin/env python3
"""Generate pre-rendered speech audio for Shunichi Land.

Usage:  python scripts/generate-voices.py

Outputs mp3 files under public/audio/<lang>/<key>.mp3 using edge-tts
neural voices. Re-run whenever src/core/vocab.ts or the PHRASES map
in src/core/speech.ts changes.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# --- vocab entries (mirror src/core/vocab.ts) -----------------------------
VOCAB = {
    "car": ("くるま", "car", "รถยนต์"),
    "bus": ("ばす", "bus", "รถบัส"),
    "truck": ("とらっく", "truck", "รถบรรทุก"),
    "fireTruck": ("しょうぼうしゃ", "fire truck", "รถดับเพลิง"),
    "policeCar": ("ぱとかー", "police car", "รถตำรวจ"),
    "dumpTruck": ("だんぷかー", "dump truck", "รถดัมพ์"),
    "cargoTruck": ("みどりの とらっく", "green truck", "รถบรรทุกสีเขียว"),
    "ambulance": ("きゅうきゅうしゃ", "ambulance", "รถพยาบาล"),
    "raceCar": ("れーすかー", "race car", "รถแข่ง"),
    "train": ("でんしゃ", "train", "รถไฟ"),
    "go": ("あお！ ごー！", "green! go!", "สีเขียว! ไปเลย!"),
    "stop": ("あか！ とまれ！", "red! stop!", "สีแดง! หยุด!"),
    "caution": ("きいろ！ ちゅうい！", "yellow! caution!", "สีเหลือง! ระวัง!"),
    "railroadCrossing": ("かんかんかん！ でんしゃが くるよ", "ding ding! train is coming", "รถไฟกำลังมา!"),
    "animalCrossing": ("どうぶつさんが わたるよ", "animals crossing", "สัตว์กำลังข้ามถนน"),
    "driveFast": ("ぶるるーん！ はやいね！", "vroom! so fast!", "เร็วมากเลย!"),
    "red": ("あか", "red", "สีแดง"),
    "blue": ("あお", "blue", "สีน้ำเงิน"),
    "yellow": ("きいろ", "yellow", "สีเหลือง"),
    "green": ("みどり", "green", "สีเขียว"),
    "pink": ("ぴんく", "pink", "สีชมพู"),
    "purple": ("むらさき", "purple", "สีม่วง"),
    "orange": ("おれんじ", "orange", "สีส้ม"),
    "white": ("しろ", "white", "สีขาว"),
    "redCar": ("あかい くるま", "red car", "รถสีแดง"),
    "blueCar": ("あおい くるま", "blue car", "รถสีน้ำเงิน"),
    "yellowCar": ("きいろい くるま", "yellow car", "รถสีเหลือง"),
    "greenCar": ("みどりの くるま", "green car", "รถสีเขียว"),
    "redGarage": ("あかい しゃこ", "red garage", "โรงรถสีแดง"),
    "blueGarage": ("あおい しゃこ", "blue garage", "โรงรถสีน้ำเงิน"),
    "yellowGarage": ("きいろい しゃこ", "yellow garage", "โรงรถสีเหลือง"),
    "greenGarage": ("みどりの しゃこ", "green garage", "รถสีเขียว"),
    "openShutter": ("がらがら〜！ あいたよ！", "open the garage!", "เปิดโรงรถ!"),
    "sameColor": ("おなじ いろ だね！", "same color!", "สีเดียวกัน!"),
    "big": ("おおきい！", "big!", "ใหญ่!"),
    "middle": ("まんなか！", "medium!", "ปานกลาง!"),
    "small": ("ちいさい！", "small!", "เล็ก!"),
    "bigCar": ("おおきい くるま", "big car", "รถคันใหญ่"),
    "middleCar": ("まんなかの くるま", "medium car", "รถคันกลาง"),
    "smallCar": ("ちいさい くるま", "small car", "รถคันเล็ก"),
    "tunnelPass": ("とんねる くぐれたね！", "through the tunnel!", "ลอดอุโมงค์แล้ว!"),
    "perfect": ("ぴったり！", "perfect!", "พอดีเลย!"),
    "inOrder": ("おおきい じゅんばん だね！", "in size order!", "เรียงตามขนาด!"),
    "startTrace": ("みちを なぞろう", "trace the road", "ลากตามเส้นทาง"),
    "mazeGo": ("めいろを すすもう！", "let's do the maze!", "ลุยเขาวงกตกัน!"),
    "starGet": ("きらきら ほしを げっと！", "got a star!", "ได้ดาวแล้ว!"),
    "rainbowRoad": ("にじの みち だね！", "rainbow road!", "ถนนสายรุ้ง!"),
    "arrived": ("とうちゃく！", "arrived!", "ถึงแล้ว!"),
    "goal": ("ごーる！ やったね！", "goal! you did it!", "ถึงเส้นชัยแล้ว!"),
    "sponge": ("すぽんじ あわあわ〜", "sponge bubbles", "ฟองน้ำ"),
    "brush": ("ぐるぐる ぶらし！", "spin brush!", "แปรงหมุน!"),
    "water": ("しゃわー！ じゃー！", "water shower!", "น้ำฝักบัว"),
    "dryer": ("どらいやー ぶおーん！", "blow dry!", "เป่าแห้ง!"),
    "wax": ("ぴかぴか わっくす！", "sparkly wax!", "เคลือบเงา!"),
    "clean": ("ぴっかぴか！ きれいに なったね！", "all sparkly clean!", "สะอาดแวววาวแล้ว!"),
    "tire": ("たいや を つけよう！", "attach the tire!", "ใส่ล้อรถ!"),
    "body": ("ぼでぃ を のせよう！", "put the body on!", "ใส่ตัวถัง!"),
    "ladderPart": ("はしご を つけたよ！", "attached the ladder!", "ใส่บันไดแล้ว!"),
    "sirenPart": ("さいれん を のせたよ！", "attached the siren!", "ใส่ไซเรนแล้ว!"),
    "snap": ("がっしゃん！ ぴったんこ！", "click! snapped together!", "ต่อติดแล้ว!"),
    "completePuzzle": ("できたー！ しゅっぱつ しんこう！", "completed! let's go!", "เสร็จแล้ว! ออกเดินทาง!"),
    "doReMi": ("どれみふぁ〜♪", "do-re-mi~♪", "โด เร มี~♪"),
    "siren": ("うー！ ぴーぽー！", "wee-woo!", "หวอ หวอ!"),
    "policeSound": ("うー！ ぱとかー だよ！", "police siren!", "เสียงรถตำรวจ!"),
    "hornSound": ("ぷっぷー！", "beep beep!", "ป๊บ ป๊บ!"),
    "headlight": ("ぴかー！ ひかり！", "shine! lights!", "แสงไฟสว่าง!"),
    "nightExplore": ("よるの まちを たんけんだ！", "explore the night city!", "สำรวจเมืองยามค่ำคืน!"),
    "foundAnimal": ("みつけた！", "found it!", "เจอแล้ว!"),
    "bounceBall": ("ぼーん！ たのしいね！", "boing! so fun!", "เด้ง! สนุกจัง!"),
    "bubblePop": ("ぱちん！ あわが はじけた！", "pop! bubble burst!", "ปอด! ฟองแตกแล้ว!"),
    "flower": ("はなだよ", "a flower!", "ดอกไม้นะ"),
    "bloom": ("さいた！ きれいね！", "it bloomed! pretty!", "บานแล้ว! สวยจัง!"),
    "dandelion": ("たんぽぽの わたげだよ", "a dandelion puff!", "เมล็ดแดนดิไลออน!"),
    "count1": ("いち！", "one!", "หนึ่ง!"),
    "count2": ("に！", "two!", "สอง!"),
    "count3": ("さん！", "three!", "สาม!"),
    "count4": ("よん！", "four!", "สี่!"),
    "count5": ("ご！", "five!", "ห้า!"),
    "connect": ("がっしゃん！ つながったよ！", "connected together!", "ต่อกันแล้ว!"),
    "depart": ("しゅっぱつ しんこうー！ ぽっぽー！", "all aboard! let's go!", "ออกเดินทางได้! ปู้นๆ!"),
    "wellDone": ("よく できたね！", "well done!", "เก่งมาก!"),
    "goodJob": ("たいへん よく できました！", "fantastic job!", "ยอดเยี่ยมมาก!"),
    "great": ("やったー！ だいせいこう！", "yay! big success!", "ไชโย! สำเร็จแล้ว!"),
    "genius": ("すごい！ じょうずだね！", "amazing! so good!", "สุดยอด! เก่งจังเลย!"),
}

PHRASES = {
    "phrase_go_fire_truck": ("あお！ しょうぼうしゃ、ごー！", "green! fire truck, go!", "สีเขียว! รถดับเพลิง ไปเลย!"),
    "phrase_go_ambulance": ("あお！ きゅうきゅうしゃ、ごー！", "green! ambulance, go!", "สีเขียว! รถพยาบาล ไปเลย!"),
    "phrase_go_police_car": ("あお！ ぱとかー、ごー！", "green! police car, go!", "สีเขียว! รถตำรวจ ไปเลย!"),
    "phrase_stop": ("あか！ とまれ！", "red! stop!", "สีแดง! หยุด!"),
    "phrase_yokudekita": ("よくできたね！", "well done!", "เก่งมาก!"),
    "phrase_ookii": ("おおきい！", "big!", "ใหญ่!"),
    "phrase_chiisai": ("ちいさい！", "small!", "เล็ก!"),
    "phrase_akai_kuruma": ("あかい くるま！", "red car!", "รถสีแดง!"),
    "phrase_aoi_kuruma": ("あおい くるま！", "blue car!", "รถสีน้ำเงิน!"),
    "phrase_kiiroi_kuruma": ("きいろい くるま！", "yellow car!", "รถสีเหลือง!"),
    "phrase_midori_kuruma": ("みどりの くるま！", "green car!", "รถสีเขียว!"),
    "phrase_akai": ("あか！", "red!", "สีแดง!"),
    "phrase_ao": ("あお！", "blue!", "สีน้ำเงิน!"),
    "phrase_kiiroi": ("きいろ！", "yellow!", "สีเหลือง!"),
    "phrase_midori": ("みどり！", "green!", "สีเขียว!"),
    "phrase_ressha_shuppatsu": ("れっしゃ しゅっぱつ！", "train departure!", "รถไฟออกเดินทาง!"),
    "phrase_bonus": ("やったー！ ボーナス！", "yay! bonus!", "ไชโย! โบนัส!"),
}

VOICES = {
    "ja": ("ja-JP-NanamiNeural", "--rate=-8%"),
    "en": ("en-US-AnaNeural", "--rate=-5%"),
    "th": ("th-TH-PremwadeeNeural", ""),
}

OUT_ROOT = Path(__file__).resolve().parent.parent / "public" / "audio"


async def synth(text: str, voice: str, out_path: Path, rate_arg: str) -> None:
    if out_path.exists() and out_path.stat().st_size > 0:
        return
    out_path.parent.mkdir(parents=True, exist_ok=True)
    args = [
        sys.executable, "-m", "edge_tts",
        "--text", text,
        "--voice", voice,
        "--write-media", str(out_path),
    ]
    if rate_arg:
        args += rate_arg.split(" ")
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        print(f"FAILED {out_path.name}: {stderr.decode(errors='replace')}", file=sys.stderr)
        if out_path.exists():
            out_path.unlink()
        raise RuntimeError(f"edge-tts failed for {out_path.name}")


async def main() -> None:
    tasks = []
    total = 0
    for key, (ja, en, th) in VOCAB.items():
        for lang, text in (("ja", ja), ("en", en), ("th", th)):
            voice, rate_arg = VOICES[lang]
            out = OUT_ROOT / lang / f"{key}.mp3"
            tasks.append(synth(text, voice, out, rate_arg))
            total += 1
    for key, (ja, en, th) in PHRASES.items():
        for lang, text in (("ja", ja), ("en", en), ("th", th)):
            voice, rate_arg = VOICES[lang]
            out = OUT_ROOT / lang / f"{key}.mp3"
            tasks.append(synth(text, voice, out, rate_arg))
            total += 1
    print(f"Generating {total} audio files...")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    errors = [r for r in results if isinstance(r, BaseException)]
    if errors:
        print(f"{len(errors)} errors", file=sys.stderr)
        raise SystemExit(1)
    print(f"Done. {total} files under {OUT_ROOT}")


if __name__ == "__main__":
    asyncio.run(main())
