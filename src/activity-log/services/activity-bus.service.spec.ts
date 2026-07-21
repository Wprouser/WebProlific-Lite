import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityBus } from './activity-bus.service';
import { ACTIVITY_RECORDED_EVENT, ActivityRecordedEvent } from '../events/activity-recorded.event';

describe('ActivityBus', () => {
  it('emits activity.recorded via emitAsync and awaits every listener before resolving', async () => {
    const eventEmitter = new EventEmitter2();
    const bus = new ActivityBus(eventEmitter);

    const received: ActivityRecordedEvent[] = [];
    let listenerFinished = false;
    eventEmitter.on(ACTIVITY_RECORDED_EVENT, async (event: ActivityRecordedEvent) => {
      received.push(event);
      await new Promise((resolve) => setTimeout(resolve, 5));
      listenerFinished = true;
    });

    const event: ActivityRecordedEvent = {
      category: 'SETTINGS',
      action: 'CREATE_CHAIN',
      descriptionKey: 'activity.chain.create_chain',
    };
    await bus.record(event);

    // If record() didn't actually await the async listener, this would be
    // false immediately after — the whole point of using emitAsync.
    expect(listenerFinished).toBe(true);
    expect(received).toEqual([event]);
  });

  it('propagates a listener error rather than swallowing it silently', async () => {
    const eventEmitter = new EventEmitter2();
    const bus = new ActivityBus(eventEmitter);
    eventEmitter.on(ACTIVITY_RECORDED_EVENT, async () => {
      throw new Error('listener boom');
    });

    await expect(
      bus.record({ category: 'AUTH', action: 'LOGIN_SUCCESS', descriptionKey: 'activity.auth.login_success' }),
    ).rejects.toThrow('listener boom');
  });
});
