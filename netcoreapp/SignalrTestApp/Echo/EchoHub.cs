using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace SignalrTestApp.Echo
{
    public class EchoHub : Hub
    {
        private readonly IEchoQueueService _echoQueueService;

        public EchoHub(IEchoQueueService echoQueueService)
        {
            _echoQueueService = echoQueueService;
        }

        public Task JoinGroup(string groupName)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public Task LeaveGroup(string groupName)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        public Task Send(string group, int delay, string message)
        {
            _echoQueueService.Enqueue(new EchoEvent
            {
                GroupName = group,
                Delay = 1000 * delay,
                Message = message
            });
            return Task.CompletedTask;
        }

        public async Task ShutDown()
        {
            await Task.Delay(1000);
            await Program.AppHost.StopAsync();
        }
    }
}
