import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, IsUUID, Min, ValidateNested } from "class-validator";

export enum PostMediaType {
    IMAGE = 'image',
    VIDEO = 'video',
}

export class CreatePostMediaDto {
    @ApiProperty({ example: '3f4b887c-1b2d-4f1a-9dd0-fb0f9b8f84f1', required: false })
    @IsUUID()
    @IsOptional()
    mediaId?: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1/posts/images/file.jpg' })
    @IsUrl()
    url!: string;

    @ApiProperty({ example: 'posts/images/file', required: false })
    @IsString()
    @IsOptional()
    publicId?: string;

    @ApiProperty({ enum: PostMediaType, example: PostMediaType.IMAGE })
    @IsEnum(PostMediaType)
    type!: PostMediaType;

    @ApiProperty({ example: 'image/jpeg', required: false })
    @IsString()
    @IsOptional()
    mimeType?: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/video/upload/so_0/posts/videos/file.jpg', required: false })
    @IsUrl()
    @IsOptional()
    thumbnailUrl?: string;

    @ApiProperty({ example: { width: 1080, height: 1350, durationMs: 12000 }, required: false })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiProperty({ example: 0, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    order?: number;
}

export class CreatePostDto {
    @ApiProperty({
        example: 'What is happening in the world?',
        description: 'Content of the post',
        required: false,
    })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiProperty({
        example: 'public',
        description: 'Visibility of the post',
    })
    @IsEnum(['public', 'private', 'friends'])
    @IsOptional()
    visibility?: 'public' | 'private' | 'friends';

    @ApiProperty({
        type: [CreatePostMediaDto],
        description: 'Media attachments of the post',
        required: false,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePostMediaDto)
    @IsOptional()
    medias?: CreatePostMediaDto[];
}
