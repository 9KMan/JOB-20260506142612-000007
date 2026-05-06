export enum EventType {
  DEVICE_ALERT = 'DEVICE_ALERT',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  DEVICE_CONFIG = 'DEVICE_CONFIG',
  MANUAL_SYNC = 'MANUAL_SYNC'
}

export enum DeviceType {
  CRADLEPOINT = 'Cradlepoint',
  PEPLINK = 'Peplink',
  STARLINK = 'Starlink'
}

export enum Severity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum TicketStatus {
  OPEN = 'open',
  PENDING = 'pending',
  SOLVED = 'solved',
  CLOSED = 'closed'
}

export enum AIAction {
  RESOLVE = 'resolve',
  ESCALATE = 'escalate',
  WAIT = 'wait'
}