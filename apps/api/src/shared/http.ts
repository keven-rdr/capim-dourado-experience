import { randomUUID } from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import type {
  Context,
  ErrorHandler,
  MiddlewareHandler,
  NotFoundHandler,
  ValidationTargets,
} from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';
import type { AppEnv } from './env-types.js';
import { type ApiErrorCode, AppError, isAppError } from './errors.js';
import type { Logger } from './logger.js';

/** Corpo de erro no formato `ApiErrorBody` do contrato (com `internal` para falhas inesperadas). */
export interface ErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

function errorBody(error: AppError): ErrorBody {
  const body: ErrorBody = { error: { code: error.code, message: error.message } };
  if (error.details !== undefined) body.error.details = error.details;
  return body;
}

export function errorHandler(logger: Logger): ErrorHandler<AppEnv> {
  return (err, c) => {
    if (isAppError(err)) return c.json(errorBody(err), err.status);
    if (err instanceof HTTPException) {
      if (err.status === 401) return c.json(errorBody(new AppError('unauthorized')), 401);
      if (err.status === 404) return c.json(errorBody(new AppError('not_found')), 404);
      if (err.status < 500) {
        const appError = new AppError('validation', 'Requisição inválida.', err.message);
        return c.json(errorBody(appError), 400);
      }
    }
    logger.error('erro não tratado', {
      requestId: c.get('requestId'),
      path: c.req.path,
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(errorBody(new AppError('internal')), 500);
  };
}

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(errorBody(new AppError('not_found', 'Rota não encontrada.')), 404);

/** Registra método, caminho (sem query), status e duração. Não registra cabeçalhos nem corpo. */
export function requestLogger(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const requestId = c.req.header('x-request-id')?.slice(0, 64) || randomUUID();
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);
    const started = performance.now();
    await next();
    logger.info(`${c.req.method} ${c.req.path} ${c.res.status}`, {
      ms: Math.round(performance.now() - started),
      requestId,
    });
  };
}

/** Validação com os schemas zod do `@cde/shared`; falhas viram `validation` no formato do contrato. */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError('validation', 'Dados inválidos.', details);
    }
  });
}

/** Lê o usuário autenticado (definido pelo middleware de autenticação). */
export function currentUser(c: Context<AppEnv>): string {
  return c.get('userId');
}
