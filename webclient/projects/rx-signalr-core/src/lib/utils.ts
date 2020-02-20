import { HubConnectionState } from '@microsoft/signalr';
import { ConnectionOptions } from './models';

/**
 * compares two connection options and returns true if they are similar
 * @param options1 first signalR connection options
 * @param options2 second signalR connection options
 */
export function sameConnectionOptions(options1: ConnectionOptions, options2: ConnectionOptions): boolean {
  return options1 === options2;
}


/**
 * get connection state name (for logging purposes)
 * @param state the connection state
 */
export function getConnectionStateName(state: HubConnectionState): string {
  return HubConnectionState[state];
}
