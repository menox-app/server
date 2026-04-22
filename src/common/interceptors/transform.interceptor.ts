import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((responseData) => {
        if(responseData &&
          typeof responseData === 'object' &&
          'data' in responseData
        ) {
          return {
            success: true,
            statusCode: context.switchToHttp().getResponse().statusCode,
            ...responseData,
            timestamp: new Date().toISOString(),
          }
        }
        return {
          success: true,
          statusCode: context.switchToHttp().getResponse().statusCode,
          data: responseData,
          timestamp: new Date().toISOString(),
        }
      }),
    );
  }
}
