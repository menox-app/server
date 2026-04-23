import { AuthGuard } from '@/common/guards/auth.guard';
import { Controller, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FollowsService } from './follows.service';

@Controller('follows')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class FollowsController {
    constructor(
        private readonly followsService: FollowsService
    ) { }

    @Post(':id')
    @ApiOperation({ summary: 'Follow a user, enter user id to follow or unfollow' })
    async follow(
        @Request() req,
        @Param('id', ParseUUIDPipe) followingId: string
    ) {
        return this.followsService.follow(req.user.id, followingId);
    }
}
