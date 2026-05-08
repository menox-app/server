import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

export class CreateCommentMediaDto {
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

export class CreateCommentDto{
    @ApiProperty({ example: 'a1a4a759-31eb-417d-8c4d-66e6b4c3e8e1' })
    @IsUUID()
    @IsNotEmpty()
    post_id!: string

    @ApiProperty({ example: 'This is a great post!' })
    @IsString()
    @IsOptional()
    content?: string

    @ApiProperty({ example: 'b2b5b860-42fc-528e-9d5e-77f7c5d4f9f2', required: false })
    @IsUUID()
    @IsOptional()
    parent_id?: string

    @ApiProperty({
        type: [CreateCommentMediaDto],
        description: 'Uploaded media IDs to attach to the comment',
        example: [
            { media_id: '3f4b887c-1b2d-4f1a-9dd0-fb0f9b8f84f1', order: 0 },
        ],
        required: false,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCommentMediaDto)
    @IsOptional()
    medias?: CreateCommentMediaDto[];
}
