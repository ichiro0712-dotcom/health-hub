export interface OcrItem {
    category: string;
    item: string;
    value: number | string;
    unit: string;
    isAbnormal?: boolean;
    evaluation?: string;
}

export interface OcrMeta {
    hospitalName?: string;
    age?: number | string;
    notes?: string;
}

export interface OcrResponse {
    date: string;
    results: OcrItem[];
    meta: OcrMeta;
}
