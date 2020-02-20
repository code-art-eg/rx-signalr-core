using System.Threading;
using System.Threading.Tasks;

namespace SignalrTestApp.Echo
{
    public interface IEchoQueueService
    {
        void Enqueue(EchoEvent echoEvent);
        Task<EchoEvent> DequeueAsync(CancellationToken cancellationToken);
    }
}
