export interface StorageResult {
    url: string;
    remoteId: string;
    provider: string;
}

export abstract class StorageProvider {
    abstract upload(file: Express.Multer.File, folder?: string): Promise<StorageResult>;
    abstract delete(remoteId: string, folder?: string): Promise<void>;
}