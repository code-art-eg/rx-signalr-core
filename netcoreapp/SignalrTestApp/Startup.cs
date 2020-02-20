using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SignalrTestApp.Echo;
using SignalrTestApp.Timer;

namespace SignalrTestApp
{
    public class Startup
    {
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSignalR();
            services.AddCors();
            services.AddHostedService<TimerBackgroundService>();
            services.AddHostedService<EchoBackgroundService>();
            services.AddSingleton<IEchoQueueService, EchoQueueService>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            app.UseCors((o) => {
                o.SetIsOriginAllowed((s) => true);
                o.AllowCredentials();
                o.AllowAnyHeader();
            });
            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<EchoHub>("/echohub");
                endpoints.MapHub<TimerHub>("/timerhub");
                endpoints.MapGet("/", async context =>
                {
                    await context.Response.WriteAsync("Welcome to SignalR Test App!");
                });
            });
        }
    }
}
