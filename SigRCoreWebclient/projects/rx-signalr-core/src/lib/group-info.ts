import { KeyedRefCountedObject } from './keyed-ref-counted-object';
import { takeUntil, filter } from 'rxjs/operators';
import { SignalRConnection } from './signalr-connection';
import { LogLevel } from '@microsoft/signalr';

/**
 * Tracks subscribers to a signalR group.
 * Will invoke signalR project method joinGroup on start and will recall it whenever the connection is reconnected.
 */
export class GroupInfo extends KeyedRefCountedObject<string> {
  /**
   * constructor
   *
   * @param _connection signalR hub info
   * @param name group name
   */
  constructor(private readonly _connection: SignalRConnection, name: string) {
    super(name);
  }

  /**
   * Called on initialize. Will invoke join group when connection is started and whenever it is reconnected.
   */
  public onStart(): void {
    this._connection.connected$
      .pipe(
        takeUntil(this.complete$),
        filter((s) => s),
      ).subscribe(() => {
        // Call later as a workaround because sometimes calling join group immediately after reconnect hangs.
        window.setTimeout(() => {
          this.invokeGroupAction('joinGroup');
        }, 100);
      });
  }

  /**
   * Called when last subscriber unsubscribes. Will call leaveGroup if connection is still alive.
   */
  public async onStop(): Promise<void> {
    return this.invokeGroupAction('leaveGroup');
  }

  /**
   * call leave group or leave group
   *
   * @param action action to call join group or leave group
   */
  private async invokeGroupAction(action: 'joinGroup' | 'leaveGroup'): Promise<void> {

    if (this._connection.connected) {
      try {
        this.log(action, false);
        await this._connection.invoke(action, this.key);
        this.log(action, true);
      } catch (e) {
        this.handlePromiseError(action, e);
      }
    }
  }

  /**
   * handle invokation error
   *
   * @param action action to log
   * @param error error to log
   */
  private handlePromiseError(action: 'joinGroup' | 'leaveGroup', error: any): void {
    this.onError(new Error(`Failed to ${action} hub group ${name} on connection ${
      this._connection.name
      }. Failed with error ${error}`));
    this._connection.log(LogLevel.Error, error);
  }

  /**
   * Log joinGroup/leaveGroup events if logging is enabled
   *
   * @param action action to log
   */
  private log(action: 'joinGroup' | 'leaveGroup', done: boolean): void {
    this._connection.log(LogLevel.Information, `${this._connection.name}.${
      action
      }(${
      this.key
      }) on connection ${
      this._connection.name
      } ${
      done ? 'successful' : 'about to be called'
      }.`);
  }
}
