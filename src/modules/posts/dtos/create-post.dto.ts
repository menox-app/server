import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePostDto {
    @ApiProperty({
        example: 'What is happening in the world?',
        description: 'Content of the post',
    })
    @IsString()
    @IsNotEmpty({message: 'Content is required'})
    content: string;

    @ApiProperty({
        example: 'public',
        description: 'Visibility of the post',
    })
    @IsEnum(['public', 'private', 'friends'])
    @IsOptional()
    visibility?: 'public' | 'private' | 'friends';

    @ApiProperty({
        example: ['https://picsum.photos/200/300'],
        description: 'Media URLs of the post',
    })
    @IsArray()
    @IsOptional()
    mediaUrls?: string[];
}