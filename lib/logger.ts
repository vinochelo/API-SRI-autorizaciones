export interface PeticionLog {
  id: string;
  fecha: string;
  clave: string;
  exito: boolean;
  estadoSri?: string;
  mensaje?: string;
}

// Global variable to persist across hot reloads in dev, and keep state in a single lambda instance in prod
const globalForLogs = global as unknown as { requestLogs: PeticionLog[] };

export const requestLogs: PeticionLog[] = globalForLogs.requestLogs || [];

if (process.env.NODE_ENV !== 'production') {
  globalForLogs.requestLogs = requestLogs;
}

export function addLog(log: PeticionLog) {
  requestLogs.unshift(log);
  if (requestLogs.length > 50) {
    requestLogs.pop();
  }
}

export function getLogs() {
  return requestLogs;
}
