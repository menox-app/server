import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from "class-validator";


export enum CommentType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    GIF = 'gif',
    STICKER = 'sticker'
}

export class CreateCommentDto{
    @ApiProperty({ example: 'a1a4a759-31eb-417d-8c4d-66e6b4c3e8e1' })
    @IsUUID()
    @IsNotEmpty()
    post_id: string

    @ApiProperty({ example: 'This is a great post!' })
    @IsString()
    @IsOptional()
    content?: string

    @ApiProperty({ example: 'b2b5b860-42fc-528e-9d5e-77f7c5d4f9f2', required: false })
    @IsUUID()
    @IsOptional()
    parent_id?: string

    @ApiProperty({ example: 'text' })
    @IsEnum(CommentType)
    @IsOptional()
    type?: CommentType = CommentType.TEXT

    @ApiProperty({ example: 'https://picsum.photos/200/300', required: false })
    @IsString()
    @IsOptional()
    media_url?: string

    @ApiProperty({ example: { width: 800, height: 600 }, required: false })
    @IsObject()
    @IsOptional()
    media_metadata?: Record<string, any>;
}