import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

export class CreatePostMediaDto {
    @ApiProperty({
        example: '3f4b887c-1b2d-4f1a-9dd0-fb0f9b8f84f1',
        description: 'ID returned by /upload after the file is uploaded',
    })
    @IsUUID()
    media_id!: string;

    @ApiProperty({
        example: 0,
        required: false,
        description: 'Optional display order. Defaults to the array index.',
    })
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
        description: 'Uploaded media IDs to attach to the post',
        example: [
            { media_id: '3f4b887c-1b2d-4f1a-9dd0-fb0f9b8f84f1', order: 0 },
        ],
        required: false,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePostMediaDto)
    @IsOptional()
    medias?: CreatePostMediaDto[];
}
