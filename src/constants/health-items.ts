
export const DEFAULT_ITEM_SETTINGS: Record<string, {
    minVal: number;
    maxVal: number;
    safeMin: number | null;
    safeMax: number | null;
    tags: string[];
    description?: string;
}> = {
    // 肝機能 (Liver Function)
    "AST(GOT)": { minVal: 0, maxVal: 100, safeMin: 10, safeMax: 40, tags: ["肝臓", "肝機能", "酵素", "アルコール", "疲れ", "代謝", "脂肪肝"], description: "肝臓や心臓の細胞に含まれる酵素。高値は肝障害や心筋障害を示唆" },
    "ALT(GPT)": { minVal: 0, maxVal: 100, safeMin: 5, safeMax: 40, tags: ["肝臓", "肝機能", "酵素", "肥満", "脂肪肝", "代謝"], description: "主に肝臓に存在する酵素。高値は肝細胞の障害を示す" },
    "γ-GTP": { minVal: 0, maxVal: 200, safeMin: 0, safeMax: 50, tags: ["肝臓", "肝機能", "アルコール", "胆道", "脂肪肝", "ストレス", "飲みすぎ"], description: "アルコールや薬物で上昇しやすい酵素。肝臓・胆道の状態を反映" },
    "ALP": { minVal: 0, maxVal: 500, safeMin: 100, safeMax: 340, tags: ["肝臓", "胆道", "骨", "代謝"], description: "肝臓・胆道・骨に多い酵素。胆汁うっ滞や骨疾患で上昇" },
    "LDH": { minVal: 100, maxVal: 400, safeMin: 120, safeMax: 240, tags: ["肝臓", "心臓", "血液", "細胞", "がん", "肺", "疲れ", "破壊"], description: "全身の細胞に存在する酵素。細胞の破壊で上昇" },
    "総ビリルビン": { minVal: 0, maxVal: 3, safeMin: 0.2, safeMax: 1.2, tags: ["肝臓", "黄疸", "胆道", "代謝", "排泄"], description: "赤血球の分解産物。高値は黄疸の原因に" },
    "アルブミン": { minVal: 2, maxVal: 6, safeMin: 3.8, safeMax: 5.3, tags: ["肝臓", "栄養", "タンパク", "むくみ", "腎臓", "高齢", "合成能"], description: "肝臓で作られるタンパク質。栄養状態や肝機能の指標" },
    "総タンパク": { minVal: 5, maxVal: 10, safeMin: 6.5, safeMax: 8.2, tags: ["肝臓", "栄養", "タンパク", "免疫", "腎臓", "脱水"], description: "血液中のタンパク質の総量。栄養状態や肝・腎機能を反映" },

    // 脂質代謝 (Lipids)
    "総コレステロール": { minVal: 100, maxVal: 300, safeMin: 130, safeMax: 219, tags: ["脂質", "コレステロール", "動脈硬化", "血管", "心臓", "脳卒中", "生活習慣病", "食事"], description: "血液中のコレステロール総量。高値は動脈硬化のリスク" },
    "LDLコレステロール": { minVal: 0, maxVal: 200, safeMin: 70, safeMax: 139, tags: ["脂質", "悪玉", "動脈硬化", "血管", "心臓", "脳卒中", "プラーク", "生活習慣病", "食事"], description: "悪玉コレステロール。血管壁に蓄積し動脈硬化を促進" },
    "HDLコレステロール": { minVal: 0, maxVal: 120, safeMin: 40, safeMax: 90, tags: ["脂質", "善玉", "血管", "動脈硬化予防", "運動", "喫煙"], description: "善玉コレステロール。余分なコレステロールを回収" },
    "中性脂肪": { minVal: 0, maxVal: 400, safeMin: 30, safeMax: 149, tags: ["脂質", "TG", "メタボ", "肥満", "アルコール", "糖質", "食事", "動脈硬化", "生活習慣病"], description: "エネルギー源として蓄えられる脂肪。食事や飲酒で変動" },

    // 糖代謝 (Diabetes)
    "空腹時血糖": { minVal: 50, maxVal: 200, safeMin: 70, safeMax: 109, tags: ["血糖", "糖尿病", "糖代謝", "インスリン", "血管", "生活習慣病", "口渇", "糖質"], description: "空腹時の血液中のブドウ糖濃度。糖尿病の診断指標" },
    "HbA1c": { minVal: 4, maxVal: 10, safeMin: 4.6, safeMax: 6.2, tags: ["血糖", "糖尿病", "ヘモグロビンA1c", "過去の血糖", "血管", "合併症", "生活習慣病"], description: "過去1〜2ヶ月の平均血糖値を反映。糖尿病管理の重要指標" },

    // 腎機能・尿酸 (Kidney)
    "尿素窒素(BUN)": { minVal: 0, maxVal: 50, safeMin: 8, safeMax: 22, tags: ["腎臓", "腎機能", "タンパク", "脱水", "心不全", "老廃物"], description: "タンパク質の代謝産物。腎機能低下や脱水で上昇" },
    "クレアチニン": { minVal: 0, maxVal: 2, safeMin: 0.6, safeMax: 1.1, tags: ["腎臓", "腎機能", "筋肉", "老廃物", "ろ過"], description: "筋肉の代謝産物。腎臓のろ過機能を反映" },
    "eGFR": { minVal: 0, maxVal: 120, safeMin: 60, safeMax: 120, tags: ["腎臓", "ろ過量", "ステージ", "慢性腎臓病", "CKD", "血管", "老化"], description: "腎臓のろ過能力の推定値。60未満は腎機能低下" },
    "尿酸(UA)": { minVal: 0, maxVal: 10, safeMin: 2, safeMax: 7.0, tags: ["痛風", "プリン体", "腎臓", "アルコール", "結石", "関節痛", "生活習慣病", "動脈硬化"], description: "プリン体の代謝産物。高値は痛風や尿路結石のリスク" },

    // 血液一般 (Blood Count)
    "白血球数": { minVal: 0, maxVal: 15000, safeMin: 3100, safeMax: 8800, tags: ["血液", "炎症", "免疫", "細菌", "ウイルス", "感染", "ストレス", "喫煙"], description: "免疫を担う細胞の数。感染や炎症で上昇" },
    "赤血球数": { minVal: 200, maxVal: 700, safeMin: 400, safeMax: 550, tags: ["血液", "貧血", "酸素", "多血症", "脱水", "立ちくらみ", "息切れ", "疲れ"], description: "酸素を運ぶ細胞の数。低値は貧血を示唆" },
    "ヘモグロビン": { minVal: 10, maxVal: 20, safeMin: 13, safeMax: 17, tags: ["血液", "貧血", "鉄分", "酸素", "立ちくらみ", "息切れ", "疲れ"], description: "赤血球内の酸素運搬タンパク質。貧血の主要指標" },
    "ヘマトクリット": { minVal: 30, maxVal: 60, safeMin: 40, safeMax: 50, tags: ["血液", "貧血", "ドロドロ", "脱水", "多血症"], description: "血液中の赤血球の割合。貧血や脱水の指標" },
    "血小板数": { minVal: 0, maxVal: 50, safeMin: 14, safeMax: 37, tags: ["血液", "止血", "肝臓", "あざ", "凝固"], description: "出血を止める細胞。低値は出血しやすくなる" },

    // 一般・その他
    "BMI": { minVal: 15, maxVal: 35, safeMin: 18.5, safeMax: 25, tags: ["体型", "肥満", "メタボ", "体重", "生活習慣病", "ダイエット"], description: "体重と身長から計算する肥満度。22が標準" },
    "腹囲": { minVal: 50, maxVal: 120, safeMin: 60, safeMax: 85, tags: ["体型", "メタボ", "内臓脂肪", "肥満", "生活習慣病", "血管"], description: "おへその高さの腹部周囲径。内臓脂肪の目安" },
    "収縮期血圧": { minVal: 80, maxVal: 200, safeMin: 90, safeMax: 130, tags: ["血圧", "心臓", "血管", "高血圧", "動脈硬化", "脳卒中", "塩分", "生活習慣病", "頭痛"], description: "心臓が収縮した時の血圧（上の血圧）" },
    "拡張期血圧": { minVal: 40, maxVal: 120, safeMin: 60, safeMax: 85, tags: ["血圧", "心臓", "血管", "高血圧", "動脈硬化", "塩分", "生活習慣病"], description: "心臓が拡張した時の血圧（下の血圧）" },

    // スマホデータ用
    "体重": { minVal: 30, maxVal: 150, safeMin: null, safeMax: null, tags: ["体型", "ダイエット", "健康管理"], description: "体重（kg）。日々の変動を記録" },
    "歩数": { minVal: 0, maxVal: 50000, safeMin: null, safeMax: null, tags: ["運動", "活動量", "歩行"], description: "1日の歩いた歩数。8000歩以上が目標" },
    "睡眠時間": { minVal: 0, maxVal: 24, safeMin: null, safeMax: null, tags: ["睡眠", "休息", "回復"], description: "1日の睡眠時間（時間）。7〜8時間が理想" },
    "心拍数": { minVal: 40, maxVal: 200, safeMin: 60, safeMax: 100, tags: ["心臓", "運動", "ストレス"], description: "1分間の心拍数。安静時60〜100が正常" },
    "体脂肪率": { minVal: 0, maxVal: 50, safeMin: null, safeMax: null, tags: ["体型", "ダイエット", "筋肉"], description: "体重に占める脂肪の割合（%）" },
    "筋肉量": { minVal: 20, maxVal: 80, safeMin: null, safeMax: null, tags: ["筋肉", "運動", "基礎代謝"], description: "体の筋肉の量（kg）" },
    "基礎代謝": { minVal: 800, maxVal: 3000, safeMin: null, safeMax: null, tags: ["代謝", "カロリー", "ダイエット"], description: "安静時に消費するカロリー（kcal）" },
    "水分量": { minVal: 30, maxVal: 80, safeMin: null, safeMax: null, tags: ["水分", "むくみ", "代謝"], description: "体内の水分量（%）" },
};
