import { signalRObservable } from '@code-art/rx-signalr-core';
import { Injectable } from '@angular/core';
import { HubConnectionBuilder, IRetryPolicy, LogLevel } from '@microsoft/signalr';

const policy: IRetryPolicy = {
  nextRetryDelayInMilliseconds: (_) => 4000,
};

const HUB_ADDRESS = 'http://localhost:5000/timerhub';
export interface TimerEvent {
  group: string;
  timer: number;
}

@Injectable({
  providedIn: 'root',
})
export class TimerService {
  private readonly builder = new HubConnectionBuilder().withUrl(HUB_ADDRESS)
    .withAutomaticReconnect(policy)
    .configureLogging(LogLevel.Debug);
  public readonly timer12 = signalRObservable<TimerEvent>({
    connection: this.builder,
    groups: ['g1', 'g2'],
    eventName: 'notifyTimer',
  });

  public readonly timer1 = signalRObservable<TimerEvent>({
    connection: this.builder,
    groups: ['g1'],
    eventName: 'notifyTimer',
  });

  public readonly timer2 = signalRObservable<TimerEvent>({
    connection: this.builder,
    groups: ['g2'],
    eventName: 'notifyTimer',
  });
}
