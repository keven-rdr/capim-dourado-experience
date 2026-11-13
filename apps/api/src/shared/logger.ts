/** Logger mínimo, em uma linha por registro. Nunca registre tokens, coordenadas ou corpo das requisições. */
export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

function format(level: string, message: string, fields?: Record<string, unknown>): string {
  const extra = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : '';
  return `${new Date().toISOString()} ${level} ${message}${extra}`;
}

export const consoleLogger: Logger = {
  info: (message, fields) => console.log(format('INFO', message, fields)),
  warn: (message, fields) => console.warn(format('WARN', message, fields)),
  error: (message, fields) => console.error(format('ERROR', message, fields)),
};

export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
