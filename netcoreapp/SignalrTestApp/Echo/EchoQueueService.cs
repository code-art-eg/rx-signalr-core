using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace SignalrTestApp.Echo
{
    public class EchoQueueService : IEchoQueueService
    {
        private readonly ConcurrentQueue<EchoEvent> _workItems = new ConcurrentQueue<EchoEvent>();
        private readonly SemaphoreSlim _signal = new SemaphoreSlim(0);

        public async Task<EchoEvent> DequeueAsync(CancellationToken cancellationToken)
        {
            await _signal.WaitAsync(cancellationToken);
            _workItems.TryDequeue(out var echoEvent);
            return echoEvent;
        }

        public void Enqueue(EchoEvent echoEvent)
        {
            if (echoEvent is null)
            {
                throw new ArgumentNullException(nameof(echoEvent));
            }
            _workItems.Enqueue(echoEvent);
            _signal.Release();
        }
    }
}
