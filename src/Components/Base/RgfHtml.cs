using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;

namespace Recrovit.RecroGridFramework.Client.Blazor.UI.Components.Base;

public class RgfHtml : RgfBaseComponent
{
    [Parameter, EditorRequired]
    public string TagName { get; set; } = default!;

    [Parameter]
    public RenderFragment ChildContent { get; set; } = null!;

    protected RenderFragment? Content { get; set; }

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        if (string.IsNullOrEmpty(TagName))
        {
            return;
        }

        int sequence = 0;
        builder.OpenElement(sequence++, TagName);
        if (_attributes?.Count > 0)
        {
            foreach (var attribute in _attributes)
            {
                builder.AddAttribute(sequence++, attribute.Key, attribute.Value);
            }
        }
        builder.AddElementReferenceCapture(sequence++, capturedRef => _elementReference = capturedRef);
        if (ChildContent != null)
        {
            builder.AddContent(sequence++, ChildContent);
        }
        builder.CloseElement();
    }
}