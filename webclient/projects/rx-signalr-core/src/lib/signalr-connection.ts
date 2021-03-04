import { KeyedRefCountedObject } from './keyed-ref-counted-object';
import { RefCountedObjectCollection } from './ref-counted-object-collection';
import { ConnectionOptions } from './models';
import { sameConnectionOptions, getConnectionStateName } from './utils';
import { HubConnection, HubConnectionState, RetryContext, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { shareReplay, map, filter, take } from 'rxjs/operators';
import { GroupInfo } from './group-info';

/**
 * symbo for property to keep track of unique ids
 */
const hubIdCallbackIdSymbol = Symbol('hubCallbackId');

/**
 * hub call back function (with unique id tracking)
 */
interface HubCallbackFunction {
  (...args: any[]): any;
  [hubIdCallbackIdSymbol]?: number;
}

/**
 * hub call back info
 */
interface HubCallback {
  /**
   * event name
   */
  eventName: string;
  /**
   * call back function
   */
  callback: HubCallbackFunction;
}

export function createSignalRConnection(options: ConnectionOptions): SignalRConnection {
  return new SignalRConnection(options);
}

export function getGroupInfoFactory(connection: SignalRConnection): (n: string) => GroupInfo {
  return (n: string) => new GroupInfo(connection, n);
}

export function tripleEqual(o1: any, o2: any): boolean {
  return o1 === o2;
}

/**
 * SignalR hub connection wrapper
 */
export class SignalRConnection extends KeyedRefCountedObject<ConnectionOptions> {
  /**
   * Tracks all connections
   */
  private static _connections = new RefCountedObjectCollection<SignalRConnection, ConnectionOptions>(
    createSignalRConnection,
    sameConnectionOptions,
  );

  /** @internal */
  private _hubConnection?: HubConnection;

  /**
   * subject tracking connection state
   */
  private readonly _state$ = new BehaviorSubject<HubConnectionState>(HubConnectionState.Disconnected);

  private _stateSubscription?: Subscription;

  /**
   * Tracks groups
   */
  private readonly _groups = new RefCountedObjectCollection<GroupInfo, string>(
    getGroupInfoFactory(this), tripleEqual);

  /**
   * list of hub call backs
   */
  private readonly _callBacks: HubCallback[] = [];

  /**
   * next callback unique id
   */
  private _nextId = 0;

  private _retryConnectHandle?: any;

  /**
   * observer for current connection state
   */
  public readonly state$ = this._state$
    .pipe(shareReplay(1));

  /**
   * observer for connected state
   */
  public readonly connected$: Observable<boolean>;


  /**
   * consturctor.
   *
   * @param key connection options
   */
  constructor(key: ConnectionOptions) {
    super(key);
    this.connected$ = this.state$
    .pipe(
      map((v) => v === HubConnectionState.Connected),
    );
  }

  /**
   *
   * @param options connection options
   */
  public static getConnection(options: ConnectionOptions): SignalRConnection {
    return SignalRConnection._connections.getByKey(options);
  }

  /**
   * get connection name (url) for logging purposes
   */
  public get name(): string {
    return this.key.url || '(default)';
  }

  /**
   * handle connection on start (start the connection)
   */
  public onStart(): void {
    // create the connection
    this._hubConnection = this.key.build();

    let oldState = this._state$.value;

    // register for state changes
    this._stateSubscription = this._state$.subscribe((newState) => {
      if (oldState === newState) {
        return;
      }

      // if logging is enabled log state change
      this.log(LogLevel.Information, `Connection state changed from ${
        getConnectionStateName(oldState)
        } to ${
        getConnectionStateName(newState)
        }`);

      // emit new state
      if (newState === HubConnectionState.Disconnected) {
        // disconnected can be triggered by 3 events
        // 1. A call to on stop (in this case complete will be true)
        // 2. Connection loss to server.
        // 3. Failure to connect to the server.
        // In cases 2 & 3 complete will be false. An error will be triggered and complete will be emitted
        if (!this.complete) {
          this.onError(new Error(`SignalR Connection ${
            this.name
            } ${
            oldState === HubConnectionState.Connecting ?
              'failed' : 'was lost'
            }.`));
        }
      }
      oldState = newState;
    });

    this._hubConnection.onreconnected(() => {
      this._state$.next(HubConnectionState.Connected);
    });

    this._hubConnection.onreconnecting(() => {
      this._state$.next(HubConnectionState.Reconnecting);
    });

    this._hubConnection.onclose((error) => {
      if (!this.complete) {
        this.onError(error);
      }
      this._state$.next(HubConnectionState.Disconnected);
    });

    this._state$.next(HubConnectionState.Connecting);
    this.startInternal();
  }

  /**
   * stop the connection
   */
  public async onStop(): Promise<void> {
    if (!this.error) {
      this._state$.next(HubConnectionState.Disconnecting);
      await this._groups.stopAll();
    }
    if (this._hubConnection) {
      this._hubConnection.stop();
      this._hubConnection = undefined;
    }
    if (this._retryConnectHandle) {
      clearTimeout(this._retryConnectHandle);
      this._retryConnectHandle = undefined;
    }
    if (this._stateSubscription) {
      this._stateSubscription.unsubscribe();
      this._stateSubscription = undefined;
    }
  }

  /**
   * get current connection state
   */
  public get currentState(): HubConnectionState {
    return this._state$.value;
  }

  /**
   * get whether the connection is in connected state
   */
  public get connected(): boolean {
    return this._state$.value === HubConnectionState.Connected;
  }

  /**
   * wait for hub connection to be in a given status (connected or disconnected)
   *
   * @param status status to wait for
   */
  public async waitForStatus(status: boolean): Promise<void> {
    if (this.connected === status) {
      return;
    }
    await this.connected$
      .pipe(
        filter((f) => f === status),
        take(1),
      ).toPromise();
  }

  /**
   * invoke a method on the hub
   *
   * @param methodName method name
   * @param args argument list
   */
  public async invoke<T>(methodName: string, ...args: any[]): Promise<T | undefined> {
    if (!this._hubConnection) {
      throw new Error(`Cannot call invoke '${methodName}' on SignalR connection  ${name} because it is in stopped state.`);
    }
    return await this._hubConnection.invoke(methodName, ...args);
  }

  /**
   * Subscribe to an event
   *
   * @param eventName event name
   * @param fn event callback
   */
  public on(eventName: string, fn: HubCallbackFunction): number {
    if (!this._hubConnection) {
      throw new Error(`Cannot call on '${eventName}' on SignalR connection  ${name} because it is in stopped state.`);
    }
    if (fn[hubIdCallbackIdSymbol]) {
      return fn[hubIdCallbackIdSymbol] as number;
    }
    this._hubConnection.on(eventName, fn);
    fn[hubIdCallbackIdSymbol] = ++this._nextId;
    this._callBacks.push({
      eventName,
      callback: fn,
    });
    return fn[hubIdCallbackIdSymbol] as number;
  }

  /**
   * Unsubscribe from an event
   *
   * @param id id of subscription to remove
   */
  public off(id: number): void {
    if (!this._hubConnection) {
      return;
    }
    const index = this._callBacks.findIndex((c) => c.callback[hubIdCallbackIdSymbol] === id);
    if (index < 0) {
      return;
    }
    const cb = this._callBacks[index];
    this._hubConnection.off(cb.eventName, cb.callback);
    this._callBacks.splice(index, 1);
  }

  /**
   * Join groups an return a function that can be used to leave all the groups joined.
   *
   * @param groups groups to join
   */
  public joinGroups(groups: string | Array<string> | undefined): () => Promise<void> {
    if (groups) {
      if (typeof groups === 'string') {
        this.joinGroup(groups);
      } else {
        for (const group of groups) {
          this.joinGroup(group);
        }
      }
    }
    return () => this.stopGroups(groups);
  }

  public log(level: LogLevel, message: string): void {
    if (!this.key.logger) {
      return;
    }
    this.key.logger.log(level, message);
  }

  /**
   * stops a list of groups
   *
   * @param groups groups to stop
   */
  private async stopGroups(groups: string | Array<string> | undefined): Promise<void> {
    if (!groups) {
      return;
    }
    if (typeof groups === 'string') {
      await this._groups.stopItemByKey(groups);
    } else {
      for (const group of groups) {
        await this._groups.stopItemByKey(group);
      }
    }
  }

  /**
   * join a group
   *
   * @param name group to join
   */
  private joinGroup(name: string): void {
    this._groups.getByKey(name);
  }

  private startInternal(): Promise<void> {
    const attemptStart = new Date().valueOf();
    let attemptCount = 0;
    return new Promise<void>((resolve, reject) => {
      const startCallback = () => {
        this._retryConnectHandle = undefined;
        if (!this._hubConnection) {
          reject(new Error('Cannot start connection because it was already stopped.'));
          return;
        }
        this._hubConnection.start().then(() => {
          resolve();
          this._state$.next(HubConnectionState.Connected);
        }, (error) => {
          if (this.key.reconnectPolicy) {
            const ctx: RetryContext = {
              elapsedMilliseconds: new Date().valueOf() - attemptStart,
              previousRetryCount: attemptCount,
              retryReason: error
            };
            const res = this.key.reconnectPolicy.nextRetryDelayInMilliseconds(ctx);
            if (res === null) {
              reject(error);
              if (!this.complete) {
                this.onError(error);
              }
              this._state$.next(HubConnectionState.Disconnected);
            } else {
              attemptCount++;
              this._retryConnectHandle = setTimeout(startCallback, res);
            }
          } else {
            reject(error);
            if (!this.complete) {
              this.onError(error);
            }
            this._state$.next(HubConnectionState.Disconnected);
          }
        });
      };
      startCallback();
    });
  }
}
