/** Variáveis de contexto do Hono compartilhadas por todos os módulos. */
export interface AppEnv {
  Variables: {
    /** Id do usuário autenticado (preenchido pelo middleware de autenticação). */
    userId: string;
    requestId: string;
  };
}
