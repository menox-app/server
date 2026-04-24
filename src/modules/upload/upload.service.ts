import { StorageProvider } from '@/infrastructure/storage/storage.provider';
import { BadRequestException, Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { StorageFolder } from '@/common/enums/storage-folder.enum';
import { KNEX_CONNECTION } from '@/infrastructure/knex/knex.module';
import { Knex } from 'knex';
import { Collections } from '@/common/enums/collections.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MultipartFile } from '@fastify/multipart';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);

    constructor(
        private readonly storageProvider: StorageProvider,
        @Inject(KNEX_CONNECTION) private readonly knex: Knex
    ) { }

    /**
     * Upload single file from request
     */
    async uploadSingle(req: FastifyRequest, folder?: StorageFolder) {
        const data = await req.file();
        if (!data) {
            throw new BadRequestException('Please select a file to upload!');
        }

        return this.processAndUpload(data, folder, (req as any).user?.id);
    }

    /**
     * Upload multiple files from request
     */
    async uploadMultiple(req: FastifyRequest, folder?: StorageFolder) {
        const files = req.files();
        const uploadPromises: Promise<any>[] = [];

        for await (const data of files) {
            uploadPromises.push(this.processAndUpload(data, folder, (req as any).user?.id));
        }

        if (uploadPromises.length === 0) {
            throw new BadRequestException('Please select at least one file to upload!');
        }

        try {
            return await Promise.all(uploadPromises);
        } catch (error) {
            this.logger.error('Failed to upload multiple files', error.stack);
            throw new InternalServerErrorException('Error occurred during multiple files upload');
        }
    }

    /**
     * Internal logic to process multipart data and store in DB
     */
    private async processAndUpload(data: MultipartFile, customFolder?: StorageFolder, userId?: string) {
        try {
            // 1. Prepare file buffer
            const buffer = await data.toBuffer();
            const multerFile: any = {
                originalname: data.filename,
                mimetype: data.mimetype,
                buffer: buffer,
                size: buffer.length,
            };

            // 2. Determine target folder
            const folder = customFolder || (data.mimetype.startsWith('video')
                ? StorageFolder.POST_VIDEOS
                : StorageFolder.POST_IMAGES);

            // 3. Upload to cloud provider
            const result = await this.storageProvider.upload(multerFile, folder);

            // 4. Save to database for lifecycle tracking
            await this.knex(Collections.MEDIA).insert({
                url: result.url,
                remote_id: result.remoteId,
                provider: result.provider,
                mime_type: data.mimetype,
                size: buffer.length,
                folder: folder,
                is_used: false,
                user_id: userId || null
            });

            return result;
        } catch (error) {
            this.logger.error(`Upload failed for file ${data.filename}: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to upload file ${data.filename}`);
        }
    }

    /**
     * Periodic Cleanup: Removes files that haven't been associated with any entity after 24h
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanupGarbage() {
    
        const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const garbageFiles = await this.knex(Collections.MEDIA)
            .where({ is_used: false })
            .where('created_at', '<', ONE_DAY_AGO);

        if (garbageFiles.length === 0) {
            this.logger.log('No garbage files found.');
            return;
        }

        let successCount = 0;
        for (const file of garbageFiles) {
            try {
                await this.storageProvider.delete(file.remote_id);
                await this.knex(Collections.MEDIA).where({ id: file.id }).delete();
                successCount++;
            } catch (error) {
                this.logger.error(`Failed to delete garbage file ${file.remote_id}:`, error);
            }
        }

        this.logger.log(`Cleanup finished. Deleted ${successCount}/${garbageFiles.length} files.`);
    }

    /**
     * Legacy support or manual upload from buffer
     */
    async uploadFile(file: any, folder?: string) {
        return this.storageProvider.upload(file, folder);
    }
}
