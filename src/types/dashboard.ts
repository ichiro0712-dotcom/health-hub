import { FitDataResult } from "./fit";

export interface DashboardResponse {
    success: boolean;
    data?: {
        fit: FitDataResult;
        records: any[];
        trends?: FitDataResult;
    };
    error?: string;
}
