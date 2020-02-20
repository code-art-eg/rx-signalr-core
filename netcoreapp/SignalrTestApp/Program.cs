using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;
using System.Net;
using System.Net.Sockets;

namespace SignalrTestApp
{
    public static class Program
    {
        internal static IHost AppHost;

        public static void Main(string[] args)
        {
            int port = 5000;
            if (args.Length > 0)
            {
                int.TryParse(args[0], out port);
                if (port == 0)
                {
                    port = FindFreePort();
                }
            }
            if (port == 0)
            {
                port = 5000;
            }
            Console.WriteLine($"{{\"port\": {port}}}");
            AppHost = CreateHostBuilder(port).Build();
            AppHost.Run();
        }

        private static int FindFreePort()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                int port = ((IPEndPoint)listener.LocalEndpoint).Port;
                return port;
            }
            finally
            {
                listener.Stop();
            }
        }

        public static IHostBuilder CreateHostBuilder(int port)
        {
            return Host.CreateDefaultBuilder()
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                    webBuilder.UseUrls($"http://localhost:{port}");
                });
        }
    }
}
