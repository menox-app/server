import { HttpQueryDto } from "@/common/dtos/http-query.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum PostFeedMode {
    ALL = 'all',
    FOLLOWING = 'following',
    TRENDING = 'trending'
}
export class GetAllPostsDto extends HttpQueryDto {
    @ApiProperty({
        enum: PostFeedMode,
        default: PostFeedMode.ALL,
    })
    @IsOptional()
    @IsEnum(PostFeedMode)
    mode?: PostFeedMode;
}