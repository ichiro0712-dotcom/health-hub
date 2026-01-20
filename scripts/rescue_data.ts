
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = "cmju7xdf4003pbkuphrwwvoor";

    console.log(`Checking user existence for ID: ${userId}...`);
    // Check user
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        console.log(`User ${userId} not found (likely lost in reset). Creating placeholder to allow save...`);
        // We try to upsert to ensure we don't conflict if race condition, though likely unique
        user = await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                // We don't know the original email, so we use a placeholder that won't conflict with test@example.com potentially
                email: `recovered_${userId}@example.com`,
                name: 'Recovered Session User',
            }
        });
    } else {
        console.log(`User found: ${user.email}`);
    }

    console.log('Inserting Health Record...');
    try {
        const record = await prisma.healthRecord.create({
            data: {
                userId: userId,
                date: new Date("2021-04-14T00:00:00.000Z"),
                title: "人間ドック2021",
                summary: "ポリープ切除、動脈硬化、脂質代謝（C）、軽度の貧血傾向、痛風・尿酸（C）、「胃びらん」「表層性胃炎」",
                status: "verified",
                data: {
                    results: [
                        { item: "身長 (Height)", value: 185.7, unit: "cm", evaluation: "", category: "Manual" },
                        { item: "体重 (Weight)", value: 78.1, unit: "kg", evaluation: "", category: "Manual" },
                        { item: "BMI", value: 22.6, unit: "", evaluation: "", category: "Manual" },
                        { item: "標準体重 (Standard Weight)", value: 75.9, unit: "kg", evaluation: "", category: "Manual" },
                        { item: "肥満度 (Degree of Obesity)", value: 2.9, unit: "%", evaluation: "", category: "Manual" },
                        { item: "腹囲 (Abdominal Circumference)", value: 87, unit: "cm", evaluation: "", category: "Manual" },
                        { item: "視力（矯正・右）(Corrected Vision - Right)", value: 0.6, unit: "", evaluation: "", category: "Manual" },
                        { item: "視力（矯正・左）(Corrected Vision - Left)", value: 0.8, unit: "", evaluation: "", category: "Manual" },
                        { item: "眼圧 (右) (Intraocular Pressure - Right)", value: 15, unit: "mmHg", evaluation: "", category: "Manual" },
                        { item: "眼圧 (左) (Intraocular Pressure - Left)", value: 14, unit: "mmHg", evaluation: "", category: "Manual" },
                        { item: "最高血圧 (Systolic BP)", value: 104, unit: "mmHg", evaluation: "", category: "Manual" },
                        { item: "最低血圧 (Diastolic BP)", value: 60, unit: "mmHg", evaluation: "", category: "Manual" },
                        { item: "聴力 (1000Hz) (Hearing)", value: null, unit: "", evaluation: "所見なし (Normal)", category: "Manual" },
                        { item: "聴力 (4000Hz) (Hearing)", value: null, unit: "", evaluation: "所見なし (Normal)", category: "Manual" },
                        { item: "尿比重 (Urine Specific Gravity)", value: 1.006, unit: "", evaluation: "", category: "Manual" },
                        { item: "白血球数 (WBC)", value: 59, unit: "x100/μL", evaluation: "", category: "Manual" },
                        { item: "赤血球数 (RBC)", value: 414, unit: "x10,000/μL", evaluation: "", category: "Manual" },
                        { item: "血色素量 (Hb)", value: 12.9, unit: "g/dL", evaluation: "C", category: "Manual" },
                        { item: "ヘマトクリット (Hct)", value: 38.4, unit: "%", evaluation: "C", category: "Manual" },
                        { item: "血小板数 (Platelet Count)", value: 22.3, unit: "x10,000/μL", evaluation: "", category: "Manual" },
                        { item: "総蛋白 (Total Protein)", value: 6.8, unit: "g/dL", evaluation: "", category: "Manual" },
                        { item: "アルブミン (Albumin)", value: 4.6, unit: "g/dL", evaluation: "", category: "Manual" },
                        { item: "A/G比 (A/G Ratio)", value: 2.1, unit: "", evaluation: "", category: "Manual" },
                        { item: "AST (GOT)", value: 16, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "ALT (GPT)", value: 17, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "γ-GTP", value: 24, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "ALP", value: 49, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "総ビリルビン (Total Bilirubin)", value: 0.8, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "LDH", value: 165, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "コリンエステラーゼ (Cholinesterase)", value: 307, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "血清アミラーゼ (Serum Amylase)", value: 69, unit: "U/L", evaluation: "", category: "Manual" },
                        { item: "尿素窒素 (BUN)", value: 14.2, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "クレアチニン (Creatinine)", value: 0.89, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "eGFR", value: 75.4, unit: "", evaluation: "", category: "Manual" },
                        { item: "尿酸 (Uric Acid)", value: 7.4, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "CRP", value: 0.01, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "リウマチ反応 (Rheumatoid Factor)", value: 0, unit: "IU/ml", evaluation: "", category: "Manual" },
                        { item: "総コレステロール (Total Cholesterol)", value: 227, unit: "mg/dL", evaluation: "C", category: "Manual" },
                        { item: "HDLコレステロール (HDL Cholesterol)", value: 53, unit: "mg/dL", evaluation: "C", category: "Manual" },
                        { item: "LDLコレステロール (LDL Cholesterol)", value: 153, unit: "mg/dL", evaluation: "C", category: "Manual" },
                        { item: "non-HDLコレステロール (non-HDL Cholesterol)", value: 174, unit: "mg/dL", evaluation: "C", category: "Manual" },
                        { item: "中性脂肪 (Triglycerides)", value: 107, unit: "mg/dl", evaluation: "C", category: "Manual" },
                        { item: "空腹時血糖 (Fasting Blood Sugar)", value: 93, unit: "mg/dL", evaluation: "", category: "Manual" },
                        { item: "HbA1c (NGSP)", value: 5, unit: "%", evaluation: "", category: "Manual" },
                        { item: "ペプシノゲン I (Pepsinogen I)", value: 70.1, unit: "ng/mL", evaluation: "", category: "Manual" },
                        { item: "ペプシノゲン I/II比 (Pepsinogen I/II Ratio)", value: null, unit: "", evaluation: "3.1以上", category: "Manual" },
                        { item: "便中ピロリ菌 (H. pylori in Stool)", value: null, unit: "", evaluation: "(-)", category: "Manual" },
                        { item: "PSA (前立腺) (Prostate)", value: 1.28, unit: "ng/mL", evaluation: "", category: "Manual" },
                        { item: "α-フェトプロテイン (肝) (AFP - Liver)", value: 4.3, unit: "ng/mL", evaluation: "", category: "Manual" },
                        { item: "CA19-9 (膵・胆道) (Pancreas/Biliary tract)", value: 6.5, unit: "U/mL", evaluation: "", category: "Manual" },
                        { item: "SCC (食道・肺) (Esophagus/Lung)", value: 1, unit: "ng/mL", evaluation: "", category: "Manual" },
                        { item: "BFP (膀胱) (Bladder)", value: 37, unit: "ng/mL", evaluation: "", category: "Manual" }
                    ]
                },
                additional_data: {
                    hospitalName: "二子玉川メディカルクリニック",
                    sections: [
                        {
                            title: "AI解析メモ(人間ドック一般）",
                            content: "■総合判定と主要な所見\nいくつかの項目で「C（3ヶ月〜12ヶ月後の再検査・経過観察）」の判定が出ています。\n・脂質代謝（C）: 総コレステロール、LDLコレステロール（悪玉）が高めです。\n・血液一般（C）: 軽度の貧血傾向（血色素量、ヘマトクリットの低下）が見られます。\n・痛風・尿酸（C）: 尿酸値が基準をわずかに上回っています。\n・上部消化管（C）: 胃カメラで「胃びらん」「表層性胃炎」が認められました。\n・下部消化管（C）: 大腸カメラにてポリープを切除（良性の腺腫）。",
                            images: [
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197772968-2nqokskclw7.jpeg", title: "人間ドック2104_二子玉川メディカルクリニック_0２" },
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773198-coja0tbpka9.jpeg", title: "人間ドック2104_二子玉川メディカルクリニック_01" },
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773358-re2xw3dbua.jpeg", title: "人間ドック2104_二子玉川メディカルクリニック_03" },
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773520-fg4ghrp60rk.jpeg", title: "人間ドック2104_二子玉川メディカルクリニック_04" },
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773679-ev1gft2re0j.jpeg", title: "人間ドック2104_二子玉川メディカルクリニック_05" }
                            ]
                        },
                        {
                            title: "大腸ポリープ切除、動脈硬化（首）",
                            content: "■大腸ポリープ切除術\n診断医師: 伊井 和成\n\n■所見:\n・全大腸の観察を実施。\n・S状結腸に、6mm大のIs型ポリープが発見されました。\n\n■実施した処置:\n・コールドスネアポリペクトミーを施行し、ポリープを切除しました。\n・切除部位に対し、クリップを1個施行（止血・保護）しました。\n\n\n■首のエコー検査にて動脈硬化が認められる\n",
                            images: [
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773840-ger67lnofzk.jpeg", title: "大腸カメラ検査" },
                                { url: "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197774002-q8nsyvvn3z7.jpeg", title: "動脈硬化（首）" }
                            ]
                        }
                    ]
                },
                images: [
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197772968-2nqokskclw7.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773198-coja0tbpka9.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773358-re2xw3dbua.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773520-fg4ghrp60rk.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773679-ev1gft2re0j.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197773840-ger67lnofzk.jpeg",
                    "http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/1767197774002-q8nsyvvn3z7.jpeg"
                ]
            }
        });
        console.log(`Successfully rescued record! ID: ${record.id}`);
    } catch (e) {
        console.error("Failed to rescue record:", e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
