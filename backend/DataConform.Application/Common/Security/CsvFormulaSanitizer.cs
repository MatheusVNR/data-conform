namespace DataConform.Application.Common.Security;

public static class CsvFormulaSanitizer
{
    private static readonly char[] DangerousPrefixes = new char[] { '=', '+', '-', '@', '\t', '\r' };

    public static string? Sanitize(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        string trimmed = value.TrimStart();
        if (trimmed.Length > 0 && Array.IndexOf(DangerousPrefixes, trimmed[0]) >= 0)
        {
            return "'" + value;
        }

        return value;
    }
}
