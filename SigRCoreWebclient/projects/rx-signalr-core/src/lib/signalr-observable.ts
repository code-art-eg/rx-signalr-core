import { Observable, BehaviorSubject, of, Subscriber, TeardownLogic } from 'rxjs';
import { SignalRObservable, SignalRObservableOptions } from './models';
import { switchMap, filter, take } from 'rxjs/operators';
import { SignalRConnection } from './signalr-connection';

/**
 * implementation for SignalRObservable
 */
class SignalRObservableImpl<T> extends Observable<T> implements SignalRObservable<T> {
  /**
   * connected status observable
   */
  public readonly connected$: Observable<boolean>;

  /**
   * internal hub
   */
  private readonly _connection$: BehaviorSubject<SignalRConnection | undefined>;

  /**
   * options
   */
  private readonly _options: SignalRObservableOptions;

  /**
   * create a signalR observable
   *
   * @param options options
   */
  constructor(
    options: SignalRObservableOptions,
  ) {
    super(SignalRObservableImpl.handleSubscriber);
    // init hub subect
    // A subject is used becaue connected$ observer can switchMap on it
    this._connection$ = new BehaviorSubject<SignalRConnection | undefined>(undefined);

    // copy options
    this._options = { ...options };
    // init connected status
    this.connected$ = this._connection$.pipe(
      switchMap((v) => v ? v.connected$ : of(false)),
    );
  }

  /**
   * Handle new subscribers
   *
   * @param this this observable
   * @param observer observer
   */
  private static handleSubscriber<U>(this: Observable<U>, observer: Subscriber<U>): TeardownLogic {
    const obs = this as SignalRObservableImpl<U>;
    return obs.handleSubscriberImpl(observer);
  }

  /**
   * observer for server connection status (true for connected, false otherwise)
   */
  public get connected(): boolean {
    return this._connection$.value ? this._connection$.value.connected : false;
  }

  /**
   * wait for server connection status to be connected
   */
  public waitForConnected(): Promise<void> {
    return this.waitForStatus(true);
  }

  /**
   * wait for server connection status to be disconnected
   */
  public waitForDisconnected(): Promise<void> {
    return this.waitForStatus(false);
  }

  /**
   * wait for server connection status to be as the desired statys
   *
   * @param status desired status
   */
  public async waitForStatus(status: boolean): Promise<void> {
    if (this.connected === status) {
      return;
    }
    await this.connected$.pipe(
      filter((f) => f === status),
      take(1),
    ).toPromise();
  }

  /**
   * invoke a server side method
   *
   * @param methodName method name
   * @param args argument list
   */
  public async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (this._connection$.value) {
      return await this._connection$.value.invoke(methodName, ...args);
    }
  }

  /**
   * Handle new subscribers
   *
   * @param this this observable
   * @param observer observer
   */
  private handleSubscriberImpl(observer: Subscriber<T>): TeardownLogic {
    // init hub
    let connection = this._connection$.value as SignalRConnection;
    if (!connection) {
      connection = SignalRConnection.getConnection(this._options.connection);
      this._connection$.next(connection);
      connection.complete$.subscribe(() => {
        this._connection$.next(undefined);
      });
    } else {
      connection.addRef();
    }

    // subscribe to complete event
    const sub = connection.complete$.subscribe(
      () => {
        if (connection.error) {
          // A hub with retry will not throw errors
          observer.error(connection.error);
        } else {
          // Errored or complete
          observer.complete();
        }
      }
    );

    // Join groups
    const stopper = connection.joinGroups(this._options.groups);

    // subscribe to event
    const id = connection.on(this._options.eventName, (d: T) => {
      observer.next(d);
    });

    return {
      unsubscribe: async () => {
        // undo what we did in revere order
        connection.off(id);
        await stopper();
        sub.unsubscribe();
        connection.stop();
      }
    };
  }
}

/**
 * creates an observable that emits events when signalR events occur
 *
 * @param options signalR options
 */
export function signalRObservable<T>(options: SignalRObservableOptions): SignalRObservable<T> {
  return new SignalRObservableImpl<T>(options);
}
