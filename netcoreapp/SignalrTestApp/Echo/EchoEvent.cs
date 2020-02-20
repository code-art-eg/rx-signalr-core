using System.Text.Json.Serialization;

namespace SignalrTestApp.Echo
{
    public class EchoEvent
    {
        [JsonPropertyName("group")]
        public string GroupName { get; set; }

        public string Message { get; set; }

        [JsonIgnore]
        public int Delay { get; set; }
    }
}
