using System.Text.Json.Serialization;

namespace DataConform.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PlanTier
{
    Starter = 0,
    Professional = 1,
    Enterprise = 2
}
