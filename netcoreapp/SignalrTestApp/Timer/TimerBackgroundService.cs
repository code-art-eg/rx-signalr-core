using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;

namespace SignalrTestApp.Timer
{
    public class TimerBackgroundService : BackgroundService
    {
        private static readonly object _groupsLock = new object();
        private static ImmutableArray<string> _groups = ImmutableArray<string>.Empty;
        private readonly IHubContext<TimerHub> _hubContext;

        public TimerBackgroundService(IHubContext<TimerHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public static void AddGroup(string groupName)
        {
            lock (_groupsLock)
            {
                var groups = _groups;
                if (!groups.Contains(groupName))
                {
                    _groups = _groups.Add(groupName);
                }
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(5000, stoppingToken);
                if (!stoppingToken.IsCancellationRequested)
                {
                    var groups = _groups;
                    foreach (var name in groups)
                    {
                        if (stoppingToken.IsCancellationRequested)
                        {
                            return;
                        }
                        await _hubContext.Clients.Group(name).SendAsync("notifyTimer", new TimerEvent
                        {
                            GroupName = name,
                            Time = (int)DateTimeOffset.Now.ToUnixTimeSeconds()
                        }, stoppingToken);
                    }
                }
            }
        }
    }
}
