import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';


@Controller('comments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @ApiBearerAuth()
    @Post()
    async createComment(@Request() req, @Body() createCommentDto: CreateCommentDto) {
        return this.commentsService.createComment(req.user.id, createCommentDto);
    }

}
