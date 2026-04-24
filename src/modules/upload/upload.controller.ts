import { Controller, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { StorageFolder } from '@/common/enums/storage-folder.enum';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('single')
    @ApiConsumes('multipart/form-data')
    @ApiQuery({ name: 'folder', enum: StorageFolder, required: false })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({
        summary: 'Upload a single file',
        description: 'Upload a single file to the server (Fastify compatible)',
    })
    async upload(@Req() req: any, @Query('folder') folder?: StorageFolder) {
        return this.uploadService.uploadSingle(req, folder);
    }

    @Post('multiple')
    @ApiConsumes('multipart/form-data')
    @ApiQuery({ name: 'folder', enum: StorageFolder, required: false })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                },
            },
        },
    })
    @ApiOperation({
        summary: 'Upload multiple files',
        description: 'Upload multiple files to the server (Fastify compatible)',
    })
    async uploadMultiple(@Req() req: any, @Query('folder') folder?: StorageFolder) {
        return this.uploadService.uploadMultiple(req, folder);
    }
}
