import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
    getRequestResponse(context: ExecutionContext) {
        if (context.getType() !== 'http') {
            return { req: {}, res: {} };
        }
        return super.getRequestResponse(context);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== 'http') {
            return true;
        }
        return super.canActivate(context);
    }
}