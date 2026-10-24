using DataConform.Application.Common.Security;
using Xunit;

namespace DataConform.UnitTests.Security;

public class CsvFormulaSanitizerTests
{
    [Theory]
    [InlineData("=cmd|'/C calc'!A0", "'=cmd|'/C calc'!A0")]
    [InlineData("+SUM(A1:A10)", "'+SUM(A1:A10)")]
    [InlineData("-2+3*cmd|' /C calc'!A0", "'-2+3*cmd|' /C calc'!A0")]
    [InlineData("@SUM(1+1)", "'@SUM(1+1)")]
    [InlineData("\t=1+1", "'\t=1+1")]
    [InlineData(" \r\n=1+1", "' \r\n=1+1")]
    [InlineData("Normal Text", "Normal Text")]
    [InlineData("123.45", "123.45")]
    [InlineData("", "")]
    [InlineData(null, null)]
    public void Sanitize_VariousInputs_ShouldNeutralizeDangerousFormulaPrefixes(string? input, string? expected)
    {
        string? result = CsvFormulaSanitizer.Sanitize(input);
        Assert.Equal(expected, result);
    }
}
