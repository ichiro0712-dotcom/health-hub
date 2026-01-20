export interface FitData {
    id: string;
    userId: string;
    date: Date;
    heartRate?: number | null;
    steps?: number | null;
    weight?: number | null;
    raw?: any;
    syncedAt: Date;
}

export interface FitDataset {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
    yAxisID: string;
    hidden?: boolean;
}

export interface FitDataResult {
    labels: string[];
    datasets: FitDataset[];
}
