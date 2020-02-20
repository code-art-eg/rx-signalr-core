using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace SignalrTestApp.Timer
{
    public class TimerHub : Hub
    {
        public Task JoinGroup(string name)
        {
            TimerBackgroundService.AddGroup(name);
            return Groups.AddToGroupAsync(Context.ConnectionId, name);
        }

        public Task LeaveGroup(string name)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, name);
        }
    }
}
