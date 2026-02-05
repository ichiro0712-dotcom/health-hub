// 健康プロフィール チャットヒアリング用 質問マスターデータ

export interface HealthQuestion {
  id: string;           // "1-1", "1-2", etc.
  sectionId: string;    // "basic_attributes"
  priority: 1 | 2 | 3;  // 3が最重要
  question: string;
  intent: string;       // 質問の意図・評価目的
  extractionHints: string[];  // AIが回答から抽出すべき情報
}

export const HEALTH_QUESTIONS: HealthQuestion[] = [
  // ========================================
  // 1. 基本属性・バイオメトリクス
  // ========================================
  {
    id: "1-1",
    sectionId: "basic_attributes",
    priority: 3,
    question: "生年月日と現在の年齢を教えてください。",
    intent: "暦年齢の確認。",
    extractionHints: ["生年月日", "年齢"]
  },
  {
    id: "1-2",
    sectionId: "basic_attributes",
    priority: 3,
    question: "現在の身長・体重、および20代の頃と比較して変化はありますか？",
    intent: "BMI、加齢による体重増減、身長短縮（骨粗鬆症・椎体骨折リスク）の確認。",
    extractionHints: ["身長", "体重", "20代との比較"]
  },
  {
    id: "1-3",
    sectionId: "basic_attributes",
    priority: 3,
    question: "直近の体脂肪率、筋肉量、内臓脂肪レベルのデータはありますか？",
    intent: "隠れ肥満（サルコペニア肥満）や代謝リスクの評価。",
    extractionHints: ["体脂肪率", "筋肉量", "内臓脂肪レベル"]
  },
  {
    id: "1-4",
    sectionId: "basic_attributes",
    priority: 2,
    question: "ウエスト周囲径とヒップ周囲径の比率（WHR）を測定可能ですか？",
    intent: "BMIよりも強力な心血管代謝リスクの予測因子。",
    extractionHints: ["ウエスト周囲径", "ヒップ周囲径", "WHR"]
  },
  {
    id: "1-5",
    sectionId: "basic_attributes",
    priority: 3,
    question: "握力測定を直近で行ったことはありますか？数値は？",
    intent: "全身の筋力低下（サルコペニア）および心血管疾患リスクの代替指標。",
    extractionHints: ["握力", "測定日"]
  },
  {
    id: "1-6",
    sectionId: "basic_attributes",
    priority: 2,
    question: "片足立ちで何秒バランスを保てますか？（開眼・閉眼）",
    intent: "小脳機能、内耳機能、将来の転倒リスク評価。",
    extractionHints: ["片足立ち秒数", "開眼/閉眼"]
  },
  {
    id: "1-7",
    sectionId: "basic_attributes",
    priority: 2,
    question: "普段の平熱は何度くらいですか？",
    intent: "基礎代謝率、甲状腺機能、免疫力の推定。",
    extractionHints: ["平熱"]
  },
  {
    id: "1-8",
    sectionId: "basic_attributes",
    priority: 3,
    question: "血圧の平均値（上/下）と脈拍数を把握していますか？",
    intent: "循環器リスクの基礎評価。",
    extractionHints: ["収縮期血圧", "拡張期血圧", "脈拍数"]
  },
  {
    id: "1-9",
    sectionId: "basic_attributes",
    priority: 1,
    question: "血液型を教えてください。",
    intent: "特定疾患リスクとの相関（例：O型は潰瘍、A型は胃がん、B型は膵臓がんリスク等）。",
    extractionHints: ["血液型"]
  },
  {
    id: "1-10",
    sectionId: "basic_attributes",
    priority: 3,
    question: "ご自身の職業と、主な業務内容（デスクワーク、移動が多い等）を教えてください。",
    intent: "身体活動レベルと職業性ストレスの推測。",
    extractionHints: ["職業", "業務内容", "身体活動レベル"]
  },

  // ========================================
  // 2. 遺伝・家族歴
  // ========================================
  {
    id: "2-1",
    sectionId: "genetics",
    priority: 3,
    question: "父方の祖父母・父親の「死亡年齢」と「死因・既往歴」を詳細に教えてください。",
    intent: "父方の遺伝的リスク（特に心血管、がん、代謝疾患）の把握。",
    extractionHints: ["父方祖父死亡年齢", "父方祖父死因", "父方祖母死亡年齢", "父方祖母死因", "父死亡年齢", "父死因"]
  },
  {
    id: "2-2",
    sectionId: "genetics",
    priority: 3,
    question: "母方の祖父母・母親の「死亡年齢」と「死因・既往歴」を詳細に教えてください。",
    intent: "母方の遺伝的リスク（ミトコンドリア遺伝等の影響含む）の把握。",
    extractionHints: ["母方祖父死亡年齢", "母方祖父死因", "母方祖母死亡年齢", "母方祖母死因", "母死亡年齢", "母死因"]
  },
  {
    id: "2-3",
    sectionId: "genetics",
    priority: 3,
    question: "ご家族・親族に「がん」「糖尿病」「心疾患」「認知症」の方はいますか？",
    intent: "日本人の4大疾病リスクの家族性素因の特定。",
    extractionHints: ["がん家族歴", "糖尿病家族歴", "心疾患家族歴", "認知症家族歴"]
  },
  {
    id: "2-4",
    sectionId: "genetics",
    priority: 2,
    question: "ご家族に「自己免疫疾患（リウマチ、甲状腺等）」や「アレルギー」の方はいますか？",
    intent: "免疫系の遺伝的脆弱性の確認。",
    extractionHints: ["自己免疫疾患家族歴", "アレルギー家族歴"]
  },
  {
    id: "2-5",
    sectionId: "genetics",
    priority: 2,
    question: "過去に遺伝子検査（DTC検査や医療用検査）を受けたことはありますか？",
    intent: "既知の遺伝的リスク（SNP）情報の有無。",
    extractionHints: ["遺伝子検査受診歴", "検査結果"]
  },
  {
    id: "2-6",
    sectionId: "genetics",
    priority: 3,
    question: "「アルコールですぐ赤くなる」など、ご家族共通の体質はありますか？",
    intent: "ALDH2遺伝子変異（食道がんリスク）等の推定。",
    extractionHints: ["アルコール代謝", "共通体質"]
  },
  {
    id: "2-7",
    sectionId: "genetics",
    priority: 3,
    question: "ご家族で「血栓ができやすい」「心筋梗塞を若くして発症した」人はいますか？",
    intent: "家族性高コレステロール血症や凝固異常の疑い。",
    extractionHints: ["血栓傾向", "若年心筋梗塞家族歴"]
  },
  {
    id: "2-8",
    sectionId: "genetics",
    priority: 2,
    question: "がん遺伝子パネル検査（リキッドバイオプシー等）への興味はありますか？",
    intent: "積極的な予防医療（先制医療）への投資意欲確認。",
    extractionHints: ["がん遺伝子検査興味"]
  },

  // ========================================
  // 3. 病歴・医療ステータス
  // ========================================
  {
    id: "3-1",
    sectionId: "medical_history",
    priority: 3,
    question: "過去に診断された病気、受けた手術、入院歴をすべて教えてください。",
    intent: "器質的ダメージの履歴と現在の脆弱性の特定。",
    extractionHints: ["既往歴", "手術歴", "入院歴"]
  },
  {
    id: "3-2",
    sectionId: "medical_history",
    priority: 3,
    question: "現在、医療機関で治療中・経過観察中の症状や病気はありますか？",
    intent: "現行のリスク管理状況の把握。",
    extractionHints: ["治療中疾患", "経過観察中疾患"]
  },
  {
    id: "3-3",
    sectionId: "medical_history",
    priority: 3,
    question: "直近の人間ドックや血液検査で「異常値（要経過観察含む）」はありましたか？",
    intent: "未病段階のリスク因子の抽出（LDL、尿酸、血糖、CRPなど）。",
    extractionHints: ["異常値項目", "検査日"]
  },
  {
    id: "3-4",
    sectionId: "medical_history",
    priority: 3,
    question: "歯科の定期検診に行っていますか？（虫歯、歯周病、銀歯の有無）",
    intent: "口腔内慢性炎症（歯周病）と全身疾患（心疾患、糖尿病、認知症）の関連。",
    extractionHints: ["歯科検診頻度", "虫歯有無", "歯周病有無", "銀歯有無"]
  },
  {
    id: "3-5",
    sectionId: "medical_history",
    priority: 2,
    question: "眼科的な問題（視力低下、老眼、白内障、緑内障など）はありますか？",
    intent: "酸化ストレス蓄積や微小血管障害のサイン。",
    extractionHints: ["視力", "眼科疾患"]
  },
  {
    id: "3-6",
    sectionId: "medical_history",
    priority: 3,
    question: "胃腸の検査（内視鏡）を受けた時期と結果（ピロリ菌、ポリープ等）は？",
    intent: "消化器がんリスクとマイクロバイオーム環境の推定。",
    extractionHints: ["内視鏡検査時期", "ピロリ菌", "ポリープ"]
  },
  {
    id: "3-7",
    sectionId: "medical_history",
    priority: 2,
    question: "ワクチン接種歴（肝炎、肺炎球菌、帯状疱疹など）はどうなっていますか？",
    intent: "加齢に伴う免疫低下時の重症化予防状況。",
    extractionHints: ["ワクチン接種歴"]
  },
  {
    id: "3-8",
    sectionId: "medical_history",
    priority: 2,
    question: "重金属検査（毛髪・尿）を行ったことはありますか？",
    intent: "慢性疲労や不定愁訴の原因となる水銀・ヒ素等の蓄積確認。",
    extractionHints: ["重金属検査歴", "検査結果"]
  },
  {
    id: "3-9",
    sectionId: "medical_history",
    priority: 1,
    question: "過去にウイルス感染（EBウイルス、帯状疱疹等）や重い感染症にかかりましたか？",
    intent: "免疫系の記憶（ウイルス負荷）による慢性炎症リスク。",
    extractionHints: ["ウイルス感染歴", "重症感染症歴"]
  },
  {
    id: "3-10",
    sectionId: "medical_history",
    priority: 2,
    question: "抗生物質を長期服用した経験はありますか？",
    intent: "腸内細菌叢の多様性低下リスクの確認。",
    extractionHints: ["抗生物質長期服用歴"]
  },

  // ========================================
  // 4. 生理機能・体質
  // ========================================
  {
    id: "4-1",
    sectionId: "physiology",
    priority: 3,
    question: "排便の頻度、便の状態（硬さ・色）、残便感について教えてください。",
    intent: "腸内環境、消化吸収能力、自律神経バランスの評価。",
    extractionHints: ["排便頻度", "便の状態", "残便感"]
  },
  {
    id: "4-2",
    sectionId: "physiology",
    priority: 3,
    question: "お腹の張り（ガス）や、食後の胃もたれを感じることはありますか？",
    intent: "SIBO（小腸内細菌増殖症）、低胃酸、消化酵素不足の可能性。",
    extractionHints: ["腹部膨満感", "胃もたれ"]
  },
  {
    id: "4-3",
    sectionId: "physiology",
    priority: 3,
    question: "性欲、勃起力、朝立ちの頻度に変化は感じますか？（該当する場合）",
    intent: "テストステロンレベル、血管内皮機能（NO産生能）のバロメーター。",
    extractionHints: ["性機能変化"]
  },
  {
    id: "4-4",
    sectionId: "physiology",
    priority: 2,
    question: "汗のかき方（多汗、無汗、寝汗）や体温調整に違和感はありますか？",
    intent: "自律神経機能、甲状腺機能、更年期障害の兆候。",
    extractionHints: ["発汗異常", "体温調整"]
  },
  {
    id: "4-5",
    sectionId: "physiology",
    priority: 2,
    question: "ストレスを感じた際、身体のどこに症状が出やすいですか？（胃、頭、肌など）",
    intent: "その人の「ウィークポイント（臓器の脆弱性）」の特定。",
    extractionHints: ["ストレス時症状部位"]
  },
  {
    id: "4-6",
    sectionId: "physiology",
    priority: 3,
    question: "空腹時にイライラしたり、手の震えを感じることはありますか？",
    intent: "血糖値調節障害（反応性低血糖）や副腎疲労のリスク。",
    extractionHints: ["空腹時症状"]
  },
  {
    id: "4-7",
    sectionId: "physiology",
    priority: 3,
    question: "食後に「耐え難い眠気」や「脳の霧（ブレインフォグ）」を感じますか？",
    intent: "インスリン抵抗性、食物不耐性、リーキーガットの疑い。",
    extractionHints: ["食後眠気", "ブレインフォグ"]
  },
  {
    id: "4-8",
    sectionId: "physiology",
    priority: 2,
    question: "立ちくらみや、急に立ち上がった時の動悸（POTS気味）はありますか？",
    intent: "起立性調節障害、自律神経機能不全、脱水の確認。",
    extractionHints: ["立ちくらみ", "起立時動悸"]
  },
  {
    id: "4-9",
    sectionId: "physiology",
    priority: 1,
    question: "痛みへの耐性（頭痛や筋肉痛）は以前より弱くなったと感じますか？",
    intent: "慢性炎症による疼痛閾値の低下、神経伝達物質の枯渇。",
    extractionHints: ["痛み耐性変化"]
  },

  // ========================================
  // 5. 生活リズム
  // ========================================
  {
    id: "5-1",
    sectionId: "circadian",
    priority: 3,
    question: "平日の就寝時刻と起床時刻、平均睡眠時間を教えてください。",
    intent: "基本的な睡眠習慣と概日リズムの確認。",
    extractionHints: ["就寝時刻", "起床時刻", "睡眠時間"]
  },
  {
    id: "5-2",
    sectionId: "circadian",
    priority: 3,
    question: "休日も平日と同じリズムで起きていますか？（寝溜めをしますか？）",
    intent: "ソーシャル・ジェットラグ（社会的時差ボケ）による代謝負担の評価。",
    extractionHints: ["休日睡眠リズム", "寝溜め"]
  },
  {
    id: "5-3",
    sectionId: "circadian",
    priority: 3,
    question: "朝起きた時の感覚は？（スッキリしている、疲れが残っている等）",
    intent: "睡眠の「質」とリカバリー能力の主観的評価。",
    extractionHints: ["起床時感覚"]
  },
  {
    id: "5-4",
    sectionId: "circadian",
    priority: 3,
    question: "日中の眠気や、集中力が切れる時間帯はありますか？",
    intent: "睡眠負債、SAS、血糖値スパイクの可能性。",
    extractionHints: ["日中眠気", "集中力低下時間帯"]
  },
  {
    id: "5-5",
    sectionId: "circadian",
    priority: 2,
    question: "就寝前のルーティン（スマホ、入浴、食事の時間）を教えてください。",
    intent: "ブルーライトによるメラトニン抑制や入眠阻害要因の特定。",
    extractionHints: ["就寝前ルーティン"]
  },
  {
    id: "5-6",
    sectionId: "circadian",
    priority: 3,
    question: "いびきをかいていると言われたり、自分のいびきで起きることはありますか？",
    intent: "睡眠時無呼吸症候群（SAS）のスクリーニング。",
    extractionHints: ["いびき", "無呼吸疑い"]
  },
  {
    id: "5-7",
    sectionId: "circadian",
    priority: 2,
    question: "寝室の環境（遮光カーテン、温度、湿度、CO2濃度）はどうですか？",
    intent: "睡眠深度を深めるための物理的環境の最適化余地。",
    extractionHints: ["寝室環境"]
  },
  {
    id: "5-8",
    sectionId: "circadian",
    priority: 3,
    question: "朝起きてから「日光」を浴びる習慣はありますか？",
    intent: "セロトニン合成と体内時計のリセット状況。",
    extractionHints: ["朝日光浴習慣"]
  },
  {
    id: "5-9",
    sectionId: "circadian",
    priority: 2,
    question: "ご自身のタイプは「朝型」「夜型」どちらだと思いますか？",
    intent: "クロノタイプ（遺伝的な体内時計）の自己認識と社会生活とのズレ。",
    extractionHints: ["クロノタイプ"]
  },
  {
    id: "5-10",
    sectionId: "circadian",
    priority: 1,
    question: "海外渡航時の時差ボケからの回復は早い方ですか？",
    intent: "自律神経の柔軟性とレジリエンスの評価。",
    extractionHints: ["時差ボケ回復"]
  },

  // ========================================
  // 6. 食生活・栄養
  // ========================================
  {
    id: "6-1",
    sectionId: "diet_nutrition",
    priority: 3,
    question: "1日の食事回数と、それぞれの食事時間を教えてください。",
    intent: "食事リズム、空腹期間（オートファジー/サーカディアンリズム）の確認。",
    extractionHints: ["食事回数", "食事時間"]
  },
  {
    id: "6-2",
    sectionId: "diet_nutrition",
    priority: 3,
    question: "朝食・昼食・夕食で、具体的によく食べるメニューを教えてください。",
    intent: "PFCバランス、微量栄養素、加工食品摂取比率の把握。",
    extractionHints: ["朝食メニュー", "昼食メニュー", "夕食メニュー"]
  },
  {
    id: "6-3",
    sectionId: "diet_nutrition",
    priority: 3,
    question: "週に何回くらい「外食」や「デリバリー」を利用しますか？",
    intent: "隠れ塩分、酸化した油、添加物の摂取リスク評価。",
    extractionHints: ["外食頻度", "デリバリー頻度"]
  },
  {
    id: "6-4",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "「大好物」と「苦手な食べ物（避けているもの）」を教えてください。",
    intent: "偏食による栄養欠乏、遅延型フードアレルギーの可能性。",
    extractionHints: ["好物", "苦手な食べ物"]
  },
  {
    id: "6-5",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "揚げ物や焦げた食品（AGEs）の摂取頻度は？",
    intent: "老化促進物質の蓄積リスク。",
    extractionHints: ["揚げ物頻度", "焦げ物頻度"]
  },
  {
    id: "6-6",
    sectionId: "diet_nutrition",
    priority: 3,
    question: "水分（水・お茶）は1日どれくらい飲みますか？アルコール・カフェイン以外で。",
    intent: "デトックス、尿酸排泄、血流維持に必要な水分量。",
    extractionHints: ["水分摂取量"]
  },
  {
    id: "6-7",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "食事の際、一口あたり何回噛んでいますか？（早食い傾向？）",
    intent: "消化吸収効率、満腹中枢刺激、血糖値上昇速度への影響。",
    extractionHints: ["咀嚼回数", "早食い傾向"]
  },
  {
    id: "6-8",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "「断食（ファスティング）」や「糖質制限」等の経験や現在の方針は？",
    intent: "極端な食事法による代謝適応やホルモンバランスへの影響。",
    extractionHints: ["ファスティング", "糖質制限", "食事法"]
  },
  {
    id: "6-9",
    sectionId: "diet_nutrition",
    priority: 3,
    question: "野菜・海藻・きのこ類は1日どれくらいの量を食べますか？",
    intent: "食物繊維量、腸内細菌のエサ、マグネシウム摂取量。",
    extractionHints: ["野菜摂取量", "海藻摂取量", "きのこ摂取量"]
  },
  {
    id: "6-10",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "魚（特に青魚）を食べる頻度は？",
    intent: "オメガ3脂肪酸（抗炎症）の摂取状況。",
    extractionHints: ["魚摂取頻度", "青魚摂取頻度"]
  },
  {
    id: "6-11",
    sectionId: "diet_nutrition",
    priority: 2,
    question: "小麦製品（パン、麺、パスタ）摂取後の体調変化に気づきはありますか？",
    intent: "グルテン不耐性、リーキーガットリスクの確認。",
    extractionHints: ["小麦摂取後体調"]
  },

  // ========================================
  // 7. 嗜好品・サプリメント・薬
  // ========================================
  {
    id: "7-1",
    sectionId: "substances",
    priority: 3,
    question: "現在、病院から処方されている薬はありますか？（薬名・用量）",
    intent: "治療中の疾患、薬剤性栄養枯渇（ドラッグマグ）の確認。",
    extractionHints: ["処方薬", "用量"]
  },
  {
    id: "7-2",
    sectionId: "substances",
    priority: 2,
    question: "毎日飲んでいるサプリメントはありますか？（商品名・成分）",
    intent: "栄養補完状況、過剰摂取、質の悪いサプリによる肝機能障害リスク。",
    extractionHints: ["サプリメント", "成分"]
  },
  {
    id: "7-3",
    sectionId: "substances",
    priority: 3,
    question: "飲酒の頻度と量、よく飲むお酒の種類を教えてください。",
    intent: "アルコールによる肝臓負荷、脳萎縮、発がんリスク、睡眠の質低下。",
    extractionHints: ["飲酒頻度", "飲酒量", "酒の種類"]
  },
  {
    id: "7-4",
    sectionId: "substances",
    priority: 3,
    question: "喫煙歴（過去・現在）、本数、種類（紙巻き・加熱式）を教えてください。",
    intent: "最大の血管障害・発がん因子。加熱式の有害物質リスクも考慮。",
    extractionHints: ["喫煙歴", "本数", "喫煙種類"]
  },
  {
    id: "7-5",
    sectionId: "substances",
    priority: 2,
    question: "コーヒーやエナジードリンクなど、カフェインの摂取頻度と時間は？",
    intent: "副腎負担、睡眠阻害（半減期考慮）、カフェイン代謝能。",
    extractionHints: ["カフェイン摂取頻度", "摂取時間"]
  },
  {
    id: "7-6",
    sectionId: "substances",
    priority: 2,
    question: "頭痛薬や胃薬など、市販薬を常用することはありますか？",
    intent: "対処療法依存、NSAIDsによる腸粘膜障害、胃薬による消化力低下。",
    extractionHints: ["市販薬常用"]
  },
  {
    id: "7-7",
    sectionId: "substances",
    priority: 2,
    question: "飲酒後、ラーメンや甘いものが無性に食べたくなりますか？",
    intent: "アルコール性低血糖および理性の低下による過剰カロリー摂取。",
    extractionHints: ["飲酒後食欲"]
  },
  {
    id: "7-8",
    sectionId: "substances",
    priority: 1,
    question: "サプリメントを選ぶ際、どのような基準で選んでいますか？",
    intent: "リテラシー確認（GMP認定、第三者機関テスト済みの選択可否）。",
    extractionHints: ["サプリ選定基準"]
  },

  // ========================================
  // 8. 運動・身体活動
  // ========================================
  {
    id: "8-1",
    sectionId: "exercise",
    priority: 3,
    question: "現在、定期的に行っている運動やスポーツはありますか？（頻度・強度）",
    intent: "運動習慣の有無、有酸素・無酸素のバランス。",
    extractionHints: ["運動種目", "運動頻度", "運動強度"]
  },
  {
    id: "8-2",
    sectionId: "exercise",
    priority: 3,
    question: "1日の中で「座っている時間」は合計何時間くらいですか？",
    intent: "座りすぎ（喫煙に匹敵するリスク）の定量的評価。",
    extractionHints: ["座位時間"]
  },
  {
    id: "8-3",
    sectionId: "exercise",
    priority: 2,
    question: "運動は「好き」ですか？「嫌い」ですか？過去の運動歴は？",
    intent: "心理的ハードルと、再開しやすい運動種目の特定。",
    extractionHints: ["運動好嫌", "運動歴"]
  },
  {
    id: "8-4",
    sectionId: "exercise",
    priority: 3,
    question: "階段を使う際や早歩きをした際、息切れや動悸はありますか？",
    intent: "心肺機能（VO2max）の低下、心不全予備軍の確認。",
    extractionHints: ["階段息切れ", "早歩き動悸"]
  },
  {
    id: "8-5",
    sectionId: "exercise",
    priority: 2,
    question: "日常生活で歩く歩数（平均）を知っていますか？",
    intent: "NEAT（非運動性熱産生）による基礎代謝維持状況。",
    extractionHints: ["歩数"]
  },
  {
    id: "8-6",
    sectionId: "exercise",
    priority: 3,
    question: "過去に大きな怪我や、現在痛みを感じる関節・部位はありますか？",
    intent: "運動制限因子、慢性疼痛によるQOL低下リスク。",
    extractionHints: ["怪我歴", "痛み部位"]
  },
  {
    id: "8-7",
    sectionId: "exercise",
    priority: 1,
    question: "ストレッチやマッサージなど、体のケアを行う頻度は？",
    intent: "柔軟性維持、血流改善、怪我予防の意識。",
    extractionHints: ["ストレッチ頻度", "マッサージ頻度"]
  },
  {
    id: "8-8",
    sectionId: "exercise",
    priority: 2,
    question: "「HIIT（高強度インターバルトレーニング）」等、短時間運動への興味は？",
    intent: "タイパ重視の運動介入の可能性（ミトコンドリア機能改善）。",
    extractionHints: ["HIIT興味"]
  },
  {
    id: "8-9",
    sectionId: "exercise",
    priority: 2,
    question: "運動中や運動後に極度の疲労感や不調を感じることはありますか？",
    intent: "運動不耐性、ミトコンドリア機能不全、CFSの兆候。",
    extractionHints: ["運動後疲労"]
  },

  // ========================================
  // 9. メンタル・脳機能
  // ========================================
  {
    id: "9-1",
    sectionId: "mental",
    priority: 2,
    question: "ご自身の性格を一言で言うと？（MBTIがわかればそれも記載ください）",
    intent: "ストレス対処スタイル、動機づけ要因、認知特性の把握。",
    extractionHints: ["性格", "MBTI"]
  },
  {
    id: "9-2",
    sectionId: "mental",
    priority: 3,
    question: "最近、物忘れや「言葉が出てこない」と感じることはありますか？",
    intent: "軽度認知障害（MCI）、脳疲労（ブレインフォグ）のスクリーニング。",
    extractionHints: ["物忘れ", "言葉が出ない"]
  },
  {
    id: "9-3",
    sectionId: "mental",
    priority: 3,
    question: "仕事やプライベートでの現在のストレスレベル（1-10）は？",
    intent: "慢性ストレス負荷（アロスタティック・ロード）の主観的評価。",
    extractionHints: ["ストレスレベル"]
  },
  {
    id: "9-4",
    sectionId: "mental",
    priority: 2,
    question: "ストレス解消法やリラックスする時間を確保できていますか？",
    intent: "ストレスコーピング（対処）能力の有無。",
    extractionHints: ["ストレス解消法", "リラックス時間"]
  },
  {
    id: "9-5",
    sectionId: "mental",
    priority: 2,
    question: "集中力が続かない、頭の中が多動気味だと感じることはありますか？",
    intent: "注意制御機能、ドーパミン系の状態、ADHD傾向の確認。",
    extractionHints: ["集中力", "多動傾向"]
  },
  {
    id: "9-6",
    sectionId: "mental",
    priority: 2,
    question: "気分の波（落ち込みやイライラ）は激しい方ですか？",
    intent: "神経伝達物質バランス、男性更年期（LOH症候群）の影響。",
    extractionHints: ["気分の波"]
  },
  {
    id: "9-7",
    sectionId: "mental",
    priority: 1,
    question: "将来に対して「不安」と「希望」どちらを強く感じますか？",
    intent: "精神的ウェルビーイング、前頭葉機能（未来予測）の状態。",
    extractionHints: ["将来への感情"]
  },
  {
    id: "9-8",
    sectionId: "mental",
    priority: 2,
    question: "デジタルデバイス（スマホ・PC）から完全に離れる時間はありますか？",
    intent: "デジタル認知症リスク、脳のデフォルトモードネットワーク回復。",
    extractionHints: ["デジタルデトックス時間"]
  },
  {
    id: "9-9",
    sectionId: "mental",
    priority: 2,
    question: "瞑想やマインドフルネスの実践経験、または興味は？",
    intent: "交感神経過緊張からの意図的な切り替えスキルの有無。",
    extractionHints: ["瞑想経験", "マインドフルネス"]
  },
  {
    id: "9-10",
    sectionId: "mental",
    priority: 3,
    question: "「何もしない時間」に対する罪悪感や焦燥感はありますか？",
    intent: "ドーパミン依存度、常に刺激を求める脳の状態（休息下手）。",
    extractionHints: ["休息への罪悪感"]
  },

  // ========================================
  // 10. 美容・衛生習慣
  // ========================================
  {
    id: "10-1",
    sectionId: "beauty_hygiene",
    priority: 2,
    question: "肌の悩み（シミ、シワ、乾燥、脂性など）はありますか？",
    intent: "糖化・酸化ストレス、ホルモン状態の皮膚への反映。",
    extractionHints: ["肌の悩み"]
  },
  {
    id: "10-2",
    sectionId: "beauty_hygiene",
    priority: 2,
    question: "洗顔、保湿、日焼け止めなどのスキンケア習慣はありますか？",
    intent: "光老化予防、皮膚バリア機能保護による慢性炎症予防。",
    extractionHints: ["スキンケア習慣"]
  },
  {
    id: "10-3",
    sectionId: "beauty_hygiene",
    priority: 2,
    question: "入浴はシャワー派ですか？湯船に浸かる派ですか？",
    intent: "温熱効果によるHSP（ヒートショックプロテイン）活性化、血流改善。",
    extractionHints: ["入浴スタイル"]
  },
  {
    id: "10-4",
    sectionId: "beauty_hygiene",
    priority: 2,
    question: "髪の毛の悩み（薄毛、白髪、コシがない等）はありますか？",
    intent: "頭皮血流、栄養状態（亜鉛・鉄）、男性ホルモン（DHT）の影響。",
    extractionHints: ["髪の悩み"]
  },
  {
    id: "10-5",
    sectionId: "beauty_hygiene",
    priority: 3,
    question: "歯磨きの頻度と、フロスやマウスウォッシュの使用状況は？",
    intent: "歯周病予防意識、口腔内細菌叢の管理、誤嚥性肺炎予防。",
    extractionHints: ["歯磨き頻度", "フロス使用", "マウスウォッシュ使用"]
  },
  {
    id: "10-6",
    sectionId: "beauty_hygiene",
    priority: 2,
    question: "口の中に「銀歯（アマルガム等）」はありますか？",
    intent: "水銀の持続的放出による神経毒性、原因不明の不調リスク。",
    extractionHints: ["銀歯", "アマルガム"]
  },
  {
    id: "10-7",
    sectionId: "beauty_hygiene",
    priority: 1,
    question: "日用品（洗剤、シャンプー等）の成分（パラベン等）を気にしますか？",
    intent: "経皮毒、内分泌撹乱化学物質（環境ホルモン）への暴露意識。",
    extractionHints: ["日用品成分意識"]
  },

  // ========================================
  // 11. 環境・社会・ライフスタイル
  // ========================================
  {
    id: "11-1",
    sectionId: "environment",
    priority: 2,
    question: "現在の住環境（騒音、日当たり、カビ等）に不満はありますか？",
    intent: "環境ストレス、マイコトキシン（カビ毒）等の健康被害リスク。",
    extractionHints: ["住環境不満"]
  },
  {
    id: "11-2",
    sectionId: "environment",
    priority: 3,
    question: "パートナーや家族との関係は良好ですか？",
    intent: "オキシトシン分泌、ソーシャルサポートによる健康保護効果。",
    extractionHints: ["家族関係"]
  },
  {
    id: "11-3",
    sectionId: "environment",
    priority: 3,
    question: "職場以外で、趣味や会話を楽しめる友人はいますか？",
    intent: "孤独リスク回避、認知機能維持のための社会的交流。",
    extractionHints: ["友人関係"]
  },
  {
    id: "11-4",
    sectionId: "environment",
    priority: 1,
    question: "経済的な不安はありますか？",
    intent: "慢性的なコルチゾール上昇要因となる金銭的ストレスの確認。",
    extractionHints: ["経済的不安"]
  },
  {
    id: "11-5",
    sectionId: "environment",
    priority: 1,
    question: "ペットを飼っていますか？",
    intent: "アニマルセラピー効果、アレルギー源、微生物叢への影響。",
    extractionHints: ["ペット"]
  },
  {
    id: "11-6",
    sectionId: "environment",
    priority: 3,
    question: "人生における「生きがい」や「情熱を注いでいること」はありますか？",
    intent: "健康寿命延伸の最強因子「目的意識（Purpose in Life）」の確認。",
    extractionHints: ["生きがい", "情熱"]
  },
  {
    id: "11-7",
    sectionId: "environment",
    priority: 3,
    question: "孤独を感じる瞬間はありますか？（多くの人に囲まれていても）",
    intent: "物理的孤独より有害な「心理的孤独」の有無。早期死亡リスク因子。",
    extractionHints: ["孤独感"]
  },
  {
    id: "11-8",
    sectionId: "environment",
    priority: 1,
    question: "自宅や職場での電磁波（Wi-Fiルーターの位置、寝室のスマホ）対策は？",
    intent: "酸化ストレスへの影響（感受性個人差あり）。",
    extractionHints: ["電磁波対策"]
  },
  {
    id: "11-9",
    sectionId: "environment",
    priority: 2,
    question: "10年後、20年後、どのような生活を送っていたいかイメージはありますか？",
    intent: "長期的な健康目標の設定と、現在のアクションへの落とし込み。",
    extractionHints: ["将来ビジョン"]
  }
];

// セクション別・重要度別の質問数を取得
export function getQuestionStats() {
  const stats: Record<string, { priority3: number; priority2: number; priority1: number; total: number }> = {};

  HEALTH_QUESTIONS.forEach(q => {
    if (!stats[q.sectionId]) {
      stats[q.sectionId] = { priority3: 0, priority2: 0, priority1: 0, total: 0 };
    }
    stats[q.sectionId][`priority${q.priority}` as 'priority3' | 'priority2' | 'priority1']++;
    stats[q.sectionId].total++;
  });

  return stats;
}

// 特定セクションの質問を重要度順に取得
export function getQuestionsBySection(sectionId: string): HealthQuestion[] {
  return HEALTH_QUESTIONS
    .filter(q => q.sectionId === sectionId)
    .sort((a, b) => b.priority - a.priority); // 重要度高い順
}

// 全セクションの重要度3の質問を順番に取得
export function getAllPriority3Questions(): HealthQuestion[] {
  return HEALTH_QUESTIONS
    .filter(q => q.priority === 3)
    .sort((a, b) => {
      // セクション順序を保持
      const sectionOrder = [
        'basic_attributes', 'genetics', 'medical_history', 'physiology',
        'circadian', 'diet_nutrition', 'substances', 'exercise',
        'mental', 'beauty_hygiene', 'environment'
      ];
      const aIndex = sectionOrder.indexOf(a.sectionId);
      const bIndex = sectionOrder.indexOf(b.sectionId);
      if (aIndex !== bIndex) return aIndex - bIndex;
      // 同セクション内はID順
      return a.id.localeCompare(b.id);
    });
}

// 次の質問を取得（現在の進捗状態に基づく）
export function getNextQuestion(
  answeredQuestionIds: string[],
  currentPriority: 3 | 2 | 1
): HealthQuestion | null {
  const sectionOrder = [
    'basic_attributes', 'genetics', 'medical_history', 'physiology',
    'circadian', 'diet_nutrition', 'substances', 'exercise',
    'mental', 'beauty_hygiene', 'environment'
  ];

  // 現在の重要度の未回答質問を探す
  for (const sectionId of sectionOrder) {
    const questions = HEALTH_QUESTIONS
      .filter(q => q.sectionId === sectionId && q.priority === currentPriority)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const q of questions) {
      if (!answeredQuestionIds.includes(q.id)) {
        return q;
      }
    }
  }

  return null;
}
