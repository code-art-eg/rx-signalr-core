using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SignalrTestApp.Echo
{
    public class EchoBackgroundService : BackgroundService
    {
        private readonly IEchoQueueService _echoQueueService;
        private readonly IHubContext<EchoHub> _hubContext;

        public EchoBackgroundService(IEchoQueueService echoQueueService, IHubContext<EchoHub> hubContext)
        {
            _echoQueueService = echoQueueService;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var tasks = new List<Task>();

            while (!stoppingToken.IsCancellationRequested)
            {
                var item = await _echoQueueService.DequeueAsync(stoppingToken);
                if (item != null && !stoppingToken.IsCancellationRequested)
                {
                    var task = SendInternalAsync(item, stoppingToken).ContinueWith((t) =>
                    {
                        lock(tasks)
                        {
                            tasks.Remove(t);
                        }
                    });
                    lock(tasks)
                    {
                        tasks.Add(task);
                    }
                }
            }
            var ar = tasks.ToArray();
            if (ar.Length > 0)
            {
                await Task.WhenAll(ar);
            }
        }

        private async Task SendInternalAsync(EchoEvent echoEvent, CancellationToken cancellationToken)
        {
            await Task.Delay(echoEvent.Delay, cancellationToken);
            if (cancellationToken.IsCancellationRequested)
                return;
            await _hubContext.Clients.Group(echoEvent.GroupName).SendAsync("notifyMessage", echoEvent, cancellationToken);
        }
    }
}
