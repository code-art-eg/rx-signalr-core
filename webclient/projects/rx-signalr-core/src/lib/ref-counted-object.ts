import { Observable, BehaviorSubject } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

/**
 * An object that maintains reference count to consumers and trigger complete event when the last consumer stops
 */
export abstract class RefCountedObject {
  /**
   * complete event. Triggers when the last consumer stops. Always emits true. Should never error.
   * Will share replay and will complete once it emits.
   */
  public readonly complete$: Observable<boolean>;

  /**
   * Reference count
   */
  private readonly _refCount$ = new BehaviorSubject<number>(0);

  /** Error if any */
  private _error: any;

  /**
   * whether it was started
   */
  private _started = false;

  /**
   * constructor. Will trigger onStart and initialize reference count to 1
   */
  constructor() {
    this.complete$ = this._refCount$.pipe(
      filter((v) => v === 0),
      map(() => true),
      shareReplay(1),
    );
  }

  public get started(): boolean {
    return this._started;
  }

  /**
   * Whether the object is complete (i.e. all consumers are stopped)
   */
  public get complete(): boolean {
    return this._started && this._refCount$.value === 0;
  }

  /**
   * Error (if any)
   */
  public get error(): any {
    return this._error;
  }

  /**
   * Track another consumer
   */
  public addRef(): void {
    if (this._error) {
      throw new Error(`Cannot start object of type ${this.constructor.name} while it is error state.`);
    }
    if (this.complete) {
      return;
    }
    this._refCount$.next(this._refCount$.value + 1);
    if (!this._started) {
      this._started = true;
      this.onStart();
    }
  }

  /**
   * Stop tracking a cosnumer. If this is the last consumer, trigger complete and call onStop.
   */
  public async stop(): Promise<void> {
    if (!this.error && !this.complete) {
      this._refCount$.next(this._refCount$.value - 1);
      if (this.complete) {
        this._refCount$.complete();
        await this.onStop();
      }
    }
  }

  /**
   * Called initialized
   */
  protected onStart(): void {
  }

  /**
   * Called when last consumer is stops
   */
  protected async onStop(): Promise<void> {
  }

  /**
   * Trigger error. The complete event will complete and all reference counts will stop. OnStop will not be called.
   * complete$ will not tigger an error
   *
   * @param error Error event
   */
  protected onError(error: any): void {
    this._error = error;
    this._refCount$.next(0);
    this._refCount$.complete();
  }
}
