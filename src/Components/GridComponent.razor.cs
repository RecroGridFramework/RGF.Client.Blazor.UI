﻿using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Logging;
using Microsoft.JSInterop;
using Recrovit.RecroGridFramework.Abstraction.Contracts.Services;
using Recrovit.RecroGridFramework.Abstraction.Models;
using Recrovit.RecroGridFramework.Client.Blazor.Components;
using Recrovit.RecroGridFramework.Client.Blazor.Events;
using Recrovit.RecroGridFramework.Client.Events;
using Recrovit.RecroGridFramework.Client.Handlers;

namespace Recrovit.RecroGridFramework.Client.Blazor.UI.Components;

public partial class GridComponent : ComponentBase, IDisposable
{
    [Inject]
    private ILogger<GridComponent> _logger { get; set; } = default!;

    [Inject]
    private IJSRuntime _jsRuntime { get; set; } = default!;

    private RgfGridComponent _rgfGridRef { get; set; } = default!;

    private ElementReference _tableRef { get; set; }

    private Dictionary<int, ElementReference> _rowRef { get; set; } = new();

    private RgfEntity EntityDesc => Manager.EntityDesc;

    public IRgListHandler ListHandler => Manager.ListHandler;

    private DotNetObjectReference<GridComponent>? _selfRef;

    private List<IDisposable> _disposables { get; set; } = new();

    protected override void OnInitialized()
    {
        base.OnInitialized();
        _selfRef = DotNetObjectReference.Create(this);
        GridParameters.EventDispatcher.Subscribe(RgfGridEventKind.CreateRowData, OnCreateAttributes);
    }

    public void Dispose()
    {
        if (_selfRef != null)
        {
            _selfRef.Dispose();
            _selfRef = null;
        }
        if (_disposables != null)
        {
            _disposables.ForEach(disposable => disposable.Dispose());
            _disposables = null!;
        }
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);
        if (firstRender)
        {
            _disposables.Add(_rgfGridRef.GridDataSource.OnAfterChange(this, OnChangedGridData));
            _disposables.Add(Manager.NotificationManager.Subscribe<RgfToolbarEventArgs>(this, OnToolbarCommandAsync));
        }
        await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.initializeTable", _selfRef, _tableRef);
    }

    [JSInvokable]
    public void SetColumnWidth(int index, int width) => ListHandler.ReplaceColumnWidth(index, width);

    [JSInvokable]
    public Task SetColumnPos(int from, int to) => ListHandler.MoveColumnAsync(from, to);

    protected virtual async Task OnChangedGridData(ObservablePropertyEventArgs<List<RgfDynamicDictionary>> args)
    {
        await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.deselectAllRow", _tableRef);
    }

    protected virtual Task OnCreateAttributes(IRgfEventArgs<RgfGridEventArgs> arg)
    {
        _logger.LogDebug("CreateAttributes");
        var rowData = arg.Args.RowData ?? throw new ArgumentException();
        foreach (var prop in EntityDesc.SortedVisibleColumns)
        {
            string? propClass = null;
            if (prop.FormType == PropertyFormType.CheckBox)
            {
                propClass = "rg-center";
            }
            else
            {
                switch (prop.ListType)
                {
                    case PropertyListType.Numeric:
                        propClass = "rg-numeric";
                        break;

                    case PropertyListType.String:
                        propClass = "rg-string";
                        break;

                    case PropertyListType.Image:
                        propClass = "rg-html";
                        break;
                }
            }
            if (propClass != null)
            {
                var attributes = rowData.GetOrNew<RgfDynamicDictionary>("__attributes");
                var propAttributes = attributes.GetOrNew<RgfDynamicDictionary>(prop.Alias);
                propAttributes.Set<string>("class", (old) => string.IsNullOrEmpty(old) ? propClass : $"{old.Trim()} {propClass}");
            }
        }
        return Task.CompletedTask;
    }

    private async Task OnSort(MouseEventArgs args, RgfProperty property)
    {
        var dict = new Dictionary<string, int>();
        if (args.ShiftKey)
        {
            int idx = 1;
            bool add = true;
            foreach (var item in EntityDesc.SortColumns)
            {
                int sort = item.Sort;
                if (property.Id == item.Id)
                {
                    add = false;
                    if (!args.CtrlKey)
                    {
                        //remove
                        continue;
                    }
                    dict.Add(item.Alias, item.Sort > 0 ? -idx : idx);//reverse
                }
                else
                {
                    dict.Add(item.Alias, item.Sort > 0 ? idx : -idx);
                }
                idx++;
            }
            if (add)
            {
                dict.Add(property.Alias, args.CtrlKey ? -idx : idx);
            }
        }
        else
        {
            if (EntityDesc.SortColumns.Count() == 1 && EntityDesc.SortColumns.Single().Id == property.Id)
            {
                dict.Add(property.Alias, -EntityDesc.SortColumns.Single().Sort);
            }
            else
            {
                dict.Add(property.Alias, args.CtrlKey ? -1 : 1);
            }
        }
        await ListHandler.SetSortAsync(dict);
    }

    protected virtual async Task OnRowClick(MouseEventArgs args, RgfDynamicDictionary rowData, int rowIndex)
    {
        if (args.Detail == 1)
        {
            if (_rgfGridRef.SelectedItems.Any())
            {
                bool deselect = _rgfGridRef.SelectedItems[0] == rowData;
                await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.deselectAllRow", _tableRef);
                await _rgfGridRef.RowDeselectHandlerAsync(rowData);
                if (deselect)
                {
                    return;
                }
            }
            await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.selectRow", _rowRef[rowIndex], rowIndex);
            await _rgfGridRef.RowSelectHandlerAsync(rowData);
        }
        else
        {
            await _rgfGridRef.OnRecordDoubleClickAsync(rowData);
        }
    }

    private async Task OnToolbarCommandAsync(IRgfEventArgs<RgfToolbarEventArgs> arg)
    {
        switch (arg.Args.Command)
        {
            case ToolbarAction.Edit:
            case ToolbarAction.Read:
                var data = _rgfGridRef.SelectedItems.Single();
                int rowIndex = Manager.ListHandler.GetRelativeRowIndex(data);
                if (rowIndex != -1)
                {
                    await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.deselectAllRow", _tableRef);
                    await _jsRuntime.InvokeVoidAsync(RGFClientBlazorUIConfiguration.JsBlazorUiNamespace + ".Grid.selectRow", _rowRef[rowIndex], rowIndex);
                }
                break;
        }
    }
}