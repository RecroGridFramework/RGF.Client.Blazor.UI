using Microsoft.AspNetCore.Components;
using Microsoft.Extensions.Logging;

namespace Recrovit.RecroGridFramework.Client.Blazor.UI.Components.Base;

public enum RgfSplitterDirection
{
    None,
    Left,
    Right,
    Top,
    Bottom
}

public class RgfSplitterNode
{
    private static int _nextId = 1;

    public int Id { get; set; }

    public RgfSplitterNode? Parent { get; private set; }

    public RenderFragment? Content { get; internal set; }

    public RgfSplitterDirection Direction { get; private set; }

    public RgfSplitterNode? PrimaryNode { get; private set; }

    public RgfSplitterNode? SecondaryNode { get; private set; }


    public RgfSplitterNode(RenderFragment content, RgfSplitterNode? parent = null)
    {
        Id = _nextId++;
        Content = content;
        Parent = parent;
        Direction = RgfSplitterDirection.None;
    }

    public RgfSplitterNode Split(RenderFragment newContent, RgfSplitterDirection splitDirection = RgfSplitterDirection.Right)
    {
        if (Direction != RgfSplitterDirection.None)
        {
            if (Direction == RgfSplitterDirection.Right || Direction == RgfSplitterDirection.Bottom)
            {
                if (PrimaryNode != null)
                {
                    return PrimaryNode.Split(newContent, splitDirection);
                }
                PrimaryNode = new RgfSplitterNode(newContent, this);
                return PrimaryNode;
            }

            if (SecondaryNode != null)
            {
                return SecondaryNode.Split(newContent, splitDirection);
            }
            SecondaryNode = new RgfSplitterNode(newContent, this);
            return SecondaryNode;
        }

        if (splitDirection == RgfSplitterDirection.None)
        {
            throw new InvalidOperationException("Invalid direction");
        }

        Direction = splitDirection;
        if (splitDirection == RgfSplitterDirection.Right || splitDirection == RgfSplitterDirection.Bottom)
        {
            if (Content != null)
            {
                PrimaryNode = new RgfSplitterNode(Content, this);
                (PrimaryNode.Id, Id) = (Id, PrimaryNode.Id);
                Content = null;
            }
            SecondaryNode = new RgfSplitterNode(newContent, this);
            return SecondaryNode;
        }

        if (Content != null)
        {
            SecondaryNode = new RgfSplitterNode(Content, this);
            (SecondaryNode.Id, Id) = (Id, SecondaryNode.Id);
            Content = null;
        }
        PrimaryNode = new RgfSplitterNode(newContent, this);
        return PrimaryNode;
    }

    public void Remove(int? baseNodeId)
    {
        if (baseNodeId != null)
        {
            var node = this.FindNode((int)baseNodeId);
            if (node == this)
            {
                return;
            }

            if (node != null)
            {
                Id = node.Id;
                Content = node.Content;
                Direction = node.Direction;
                PrimaryNode = node.PrimaryNode;
                SecondaryNode = node.SecondaryNode;
                return;
            }
        }

        if (Parent == null)
        {
            Content = null;
            PrimaryNode = null;
            SecondaryNode = null;
            return;
        }

        if (Parent.PrimaryNode == this)
        {
            Parent.PrimaryNode = null;
        }
        else if (Parent.SecondaryNode == this)
        {
            Parent.SecondaryNode = null;
        }

        if (Parent.PrimaryNode == null && Parent.SecondaryNode == null)
        {
            Parent.Remove(baseNodeId);
        }
    }

    public RgfSplitterNode? FindNode(int id) => Id == id ? this : PrimaryNode?.FindNode(id) ?? SecondaryNode?.FindNode(id);
}

public partial class RgfSplitterContainer
{
    [Inject]
    private ILogger<RgfSplitterContainer> _logger { get; set; } = null!;

    [CascadingParameter]
    public RgfSplitterNode? RootNode { get; set; }

    public int? BaseNodeId;

    protected override void OnParametersSet()
    {
        base.OnParametersSet();

        if (InitialContent != null)
        {
            var node = RootNode == null || BaseNodeId == null ? null : RootNode.FindNode((int)BaseNodeId);
            if (node != null)
            {
                node.Content = InitialContent;
            }
            else
            {
                Node = RootNode = new RgfSplitterNode(InitialContent);
                BaseNodeId = Node.Id;
            }
        }
    }

    public RgfSplitterNode? CreateNode(RenderFragment content, int? parentId, RgfSplitterDirection direction = RgfSplitterDirection.Right)
    {
        if (RootNode == null)
        {
            Node = RootNode = new RgfSplitterNode(content);
            StateHasChanged();
            return Node;
        }

        var parent = parentId == null || parentId == 0 ? RootNode : RootNode.FindNode((int)parentId);
        if (parent != null)
        {
            StateHasChanged();
            return parent.Split(content, direction);
        }

        _logger.LogError("Parent node not found");
        return null;
    }

    public void RemoveNode(int id)
    {
        if (RootNode == null)
        {
            return;
        }

        var node = RootNode.Id == id ? RootNode : RootNode.FindNode(id);
        if (node == null)
        {
            _logger.LogError("Node not found");
            return;
        }

        if (node != null)
        {
            node.Remove(BaseNodeId);
        }

        if (RootNode.Content == null && RootNode.PrimaryNode == null && RootNode.SecondaryNode == null)
        {
            RootNode = Node = null;
            BaseNodeId = null;
        }
        StateHasChanged();
    }
}