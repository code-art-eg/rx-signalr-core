import { HubConnectionBuilder, LogLevel, IRetryPolicy, ILogger } from '@microsoft/signalr';
import { Observable } from 'rxjs';

export interface IConnectionOptions {
  url?: string;
  logLevel?: LogLevel;
  reconnectPolicy?: IRetryPolicy;
  logger?: ILogger;
}

export type ConnectionOptions = HubConnectionBuilder & IConnectionOptions;

export interface SignalRObservableOptions {

  /**
   * Connection builder
   */
  connection: ConnectionOptions;

  /**
   * event name to listen to
   */
  eventName: string;

  /**
   * groups to join by invoking joinGroup on the hub
   */
  groups?: string | Array<string>;
}

/**
 * An observable that emits events when a signalR event occurs
 */
export interface SignalRObservable<T> extends Observable<T> {
  /**
   * observer for server connection status (true for connected, false otherwise)
   */
  readonly connected$: Observable<boolean>;

  /**
   * Current server connection status
   */
  readonly connected: boolean;

  /**
   * wait for server connection status to be connected
   */
  waitForConnected(): Promise<void>;

  /**
   * wait for server connection status to be disconnected
   */
  waitForDisconnected(): Promise<void>;

  /**
   * wait for server connection status to be as the desired statys
   * @param status desired status
   */
  waitForStatus(status: boolean): Promise<void>;

  /**
   * invoke a server side method
   * @param methodName method name
   * @param args argument list
   */
  invoke(methodName: string, ...args: any[]): Promise<any>;
}
