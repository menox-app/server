import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, StorageResult } from "../storage.provider";
import { BadRequestException, Injectable } from "@nestjs/common";
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryProvider extends StorageProvider {
    constructor(private configService: ConfigService) {
        super();

        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    async upload(file: Express.Multer.File, folder: string = 'menox'): Promise<StorageResult> {
        return new Promise((resolve, reject) => {
            if (!file.mimetype.startsWith('image')) {
                return reject(new BadRequestException('File type is not allowed'))
            }

            const uploadStream = cloudinary.uploader.upload_stream({
                folder,
                resource_type: 'auto'
            }, (error, result) => {
                if (error) return reject(error);

                resolve({
                    url: result?.secure_url!,
                    remoteId: result?.public_id!,
                    provider: 'cloudinary'
                })
            });

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        })
    }

    async delete(remoteId: string): Promise<void> {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(remoteId, (error, result) => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
}