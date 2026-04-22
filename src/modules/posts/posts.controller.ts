import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { GetAllPostsDto } from './dtos/get-all-post.dto';
import { CommentsService } from '../comments/comments.service';
import { GetCommentsDto } from '../comments/dtos/get-comments-dto';

@Controller('posts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PostsController {
    constructor(
        private readonly postService: PostsService,
        private readonly commentsService: CommentsService,
    ) { }

    @Post()
    async createPost(@Req() req, @Body() createPostDto: CreatePostDto) {
        const userId = req.user.id;
        return this.postService.createPost(userId, createPostDto);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all posts public' })
    @ApiQuery({
        name: 'page',
        description: 'Page number',
        required: false,
        type: Number,
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        description: 'Limit per page',
        required: false,
        type: Number,
        example: 10,
    })
    async findAll(
        @Req() req,
        @Query() query: GetAllPostsDto
    ) {
        const userId = req.user?.id;
        return this.postService.findAllPosts(query, userId);
    }

    @Post(':id/react')
    @ApiOperation({ summary: 'Reaction post' })
    async reactionPost(@Req() req, @Param('id', ParseUUIDPipe) postId: string) {
        const userId = req.user.id;
        return this.postService.reactionPost(userId, postId);
    }

    @Get(':id/comments')
    @Public()
    @ApiOperation({ summary: 'Get all comments for a post' })
    @ApiQuery({
        name: 'page',
        description: 'Page number',
        required: false,
        type: Number,
        example: 1,
    })
    @ApiQuery({
        name: 'limit',
        description: 'Limit per page',
        required: false,
        type: Number,
        example: 10,
    })
    async getComments(@Param('id', ParseUUIDPipe) postId: string, @Query() query: GetCommentsDto) {
        return this.commentsService.findAllComments(postId, query);
    }
}
