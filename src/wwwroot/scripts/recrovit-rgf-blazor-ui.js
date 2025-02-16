﻿/*!
* recrovit-rgf-blazor-ui.js v1.9.0
*/

window.Recrovit = window.Recrovit || {};
window.Recrovit.RGF = window.Recrovit.RGF || {};
window.Recrovit.RGF.Blazor = window.Recrovit.RGF.Blazor || {};
var Blazor = window.Recrovit.RGF.Blazor;

Blazor.UI = {
    Base: {
        setFocus: function (selector) {
            var element = $(selector);
            if (element.length) {
                element.focus();
                return true;
            }
            return false;
        },
        tooltip: function (element, options) {
            var $element = $(element);
            if ($element.length !== 1) return null;

            var tooltipInstance = bootstrap.Tooltip.getInstance($element[0]);
            if ($element.is(':disabled') || !options) {
                if (tooltipInstance) {
                    tooltipInstance.dispose();
                }
                return null;
            }
            if (!tooltipInstance) {
                tooltipInstance = new bootstrap.Tooltip($element[0], {
                    title: options.title,
                    customClass: options.customClass || 'rgf-tooltip-400',
                    placement: options.placement || 'top',
                    trigger: options.trigger || 'hover',
                    html: options.allowHtml,
                    delay: { show: 500 }
                });
            }
            else {
                tooltipInstance.setContent({ '.tooltip-inner': options.title });
            }
            return tooltipInstance;
        }
    },
    Dialog: {
        initialize: function (dialogId, resizable, uniqueName, focusId, isInline) {
            var dialog = document.getElementById(dialogId);
            if (!isInline) {
                $('div.modal-dialog', dialog).draggable({ handle: '.modal-header, .dialog-header' });
                $('div.modal-dialog', dialog).height('auto');
                Blazor.UI.Dialog.loadDialogPos(uniqueName, dialogId, true);
                if (resizable) {
                    var dialogContent = $('div.modal-content', dialog).first();
                    Recrovit.LPUtils.ResizableWithResponsiveFlex(dialogContent);
                    window.setTimeout(function () {
                        Recrovit.LPUtils.ResizeResponsiveFlex(dialogContent);
                    }, 1000);
                }
            }
            if (focusId != null) {
                document.getElementById(focusId).focus();
            }
            else {
                $('.btn-primary:first', dialog).focus();
            }
        },
        saveDialogPos: function (name, dialogId) {
            const key = `RGF.DialogPos.${name}`;
            if (dialogId == undefined) {
                localStorage.removeItem(key);
            }
            else {
                var $element = $('div.modal-content:first', $('#' + dialogId));
                const dialogPos = [4];
                dialogPos[0] = parseInt($element.css('width'));
                dialogPos[1] = parseInt($element.css('height'));
                $element = $element.parent('div.modal-dialog');
                dialogPos[2] = parseInt($element.offset().top) - window.scrollY;
                dialogPos[3] = parseInt($element.offset().left) - window.scrollX;
                localStorage.setItem(key, JSON.stringify(dialogPos));
            }
        },
        loadDialogPos: function (name, dialogId, verticalCenter) {
            var content = $('div.modal-content:first', '#' + dialogId);
            var dialog = content.parent('div.modal-dialog');
            if (name != null) {
                var data = localStorage.getItem(`RGF.DialogPos.${name}`);
                if (data != undefined) {
                    const dialogPos = JSON.parse(data);
                    content.css({
                        width: `${dialogPos[0]}px`,
                        height: `${dialogPos[1]}px`,
                    });

                    var top = dialogPos[2] < 0 ? 25 : dialogPos[2];
                    var left = dialogPos[3] < 0 ? 25 : dialogPos[3];

                    if ($(window).height() < top + 50) {
                        top = 25;
                    }
                    if ($(window).width() < left + 50) {
                        left = 25;
                    }

                    dialog.css({
                        top: `${top}px`,
                        left: `${left}px`,
                        margin: '0'
                    });
                    return;
                }
                dialog.css('width', '60%');
            }
            if (verticalCenter == true) {
                var windowHeight = $(window).height();
                var dialogHeight = dialog.height();
                var top = ((windowHeight - dialogHeight) / 2).toFixed(0);
                if (top > 0) {
                    dialog.css('margin-top', top + 'px');
                }
            }
        }
    },
    Grid: {
        selectRow: function (row, idx) {
            //$(table).find('tr').eq(idx).addClass('table-primary');
            $(row).addClass('table-primary');
        },
        deselectRow: function (row, idx) {
            $(row).removeClass('table-primary');
        },
        deselectAllRow: function (table) {
            $('tr.table-primary', table).removeClass('table-primary');
        },
        initializeTable: function (gridRef, table) {
            var rgfTable = new Recrovit.WebCli.RgfTable(table);
            rgfTable.makeColumnsResizable(function (idx, target, width) {
                gridRef.invokeMethodAsync('SetColumnWidth', idx + 1, parseInt(width) || 0);
            });
            rgfTable.makeColumnsDragable(function (idx, newIdx) {
                if (idx != newIdx && idx + 1 != newIdx) {
                    gridRef.invokeMethodAsync('SetColumnPos', idx, newIdx > idx ? newIdx - 1 : newIdx);
                }
            });
            BlazorGrids.initializeTooltips(gridRef, table);
        },
        initializeTooltips: function (gridRef, table) {
            $('td', table).each(function () {
                var element = $(this);
                element.off('show.bs.tooltip');
                bootstrap.Tooltip.getInstance(element[0])?.dispose();
            });
            var tooltipTriggerArr = $('td[data-bs-toggle="tooltip"]', table);
            tooltipTriggerArr.each(function () {
                var element = $(this);
                var tooltip = new bootstrap.Tooltip(element[0], {
                    title: element.text(),
                    customClass: 'rgf-tooltip-800 rgf-maxw-50',
                    trigger: 'hover',
                    delay: { show: 500 },
                    html: true
                });
                element.on('show.bs.tooltip', async function () {
                    if (tooltip.tooltipText == null) {
                        var col = element.attr('data-cell');
                        var rowIdx = element.closest('tr').attr('data-row');
                        tooltip.tooltipText = await gridRef.invokeMethodAsync('GetTooltipText', parseInt(rowIdx), parseInt(col));
                        if (tooltip.tooltipText == null) {
                            tooltip.tooltipText = element.text();
                        }
                        tooltip.setContent({ '.tooltip-inner': tooltip.tooltipText })
                    }
                    setTimeout(function () { tooltip.hide(); }, 8000);
                });
            });
        }
    },
    Chart: {
        initialize: async function (containerId, chartRef) {
            Blazor.ApexCharts.onResize = async function (element, chartRef) {
                var container = $(element);
                var w = Math.round($('div.card-body', container).first().width());
                var h1 = Math.round(container.height());
                var h = h1 - Math.round($('div.card-header', container).first().height());
                await chartRef.invokeMethodAsync('Resize', w - 1, h - 16 - 50);
            };
            return await Blazor.ApexCharts.initialize(containerId, chartRef);
        }
    },
    ListBox: {
        resizable: function (listBoxId, width, height) {
            var element = $(`#${listBoxId}`);
            if (width == null) {
                element.width(element.width());
            }
            if (height == null) {
                element.height(element.height());
            }
            var outerWidth = element.outerWidth() + 29;
            var outerHeight = element.outerHeight() + 26;
            element.resizable({
                minWidth: 130,
                minHeight: 61,
                create: function (event, ui) {
                    $(this).resizable("resizeTo", { width: outerWidth, height: outerHeight });
                },
                stop: function (event, ui) {
                    $(this).css({ width: '', height: '' });
                }
            });
        },
        resizableDestroy: function (listBoxId) {
            $(`#${listBoxId}`).resizable('destroy');
        }
    },
    ComboBox: {
        initialize: function (dotNetRef, comboBoxId, value, width) {
            var combo = $(`#${comboBoxId}`).rgcombobox({
                value: value,
                inputClass: 'rgf-combobox-edit form-control form-control-sm',
                button: '<button class="rgf-combobox-button btn btn-outline-secondary" type="button" rgf-bs-combobox=""><i class="bi bi-caret-down-fill"></i></button>',
                noWrapper: true,
                calcWidth: false,
                width: width
            });
            combo.rgcombobox('instance').input.autocomplete('widget').css('z-index', 5000);
            combo.on('change.RGF-Client-Blazor-UI', function (event) {
                var $this = $(this);
                if (event.originalEvent?.type == 'keyup' && event.originalEvent?.key == "Enter") {
                    var text = $this.rgcombobox("instance").input.val();
                    dotNetRef.invokeMethodAsync('OnEnter', text);
                }
                else {
                    var selected = $this.find(":selected");
                    if (selected.length == 1) {
                        var value = selected.val();
                        dotNetRef.invokeMethodAsync('OnSelected', value);
                    }
                    else {
                        var text = $this.rgcombobox("instance").input.val();
                        dotNetRef.invokeMethodAsync('OnChanged', text);
                    }
                }
            });
        },
        setText: function (comboBoxId, text) {
            $(`#${comboBoxId}`).rgcombobox('instance').input.val(text);
        },
        clearText: function (comboBoxId) {
            $(`#${comboBoxId}`).val('');
        },
        destroy: function (comboBoxId) {
            $(`#${comboBoxId}`).off('change.RGF-Client-Blazor-UI').rgcombobox('destroy');
        }
    },
    Menu: {
        hide: function (element) {
            $(element).removeClass('show');
        }
    },
    Splitter: {
        initialize: function (container) {
            var $c = $(container),
                $s = $c.children('.rgf-splitter');

            $s.off('mousedown.rgfSplitter');
            if ($c.attr('disabled')) return;

            $s.on('mousedown.rgfSplitter', function () {
                var $splitter = $(this);

                const isHorizontal = $splitter.parent().hasClass('horizontal');
                const minSize = isHorizontal ? 100 : 50;

                var $container = $splitter.parent(),
                    $primaryPanel = $splitter.prev(),
                    $secondaryPanel = $splitter.next();

                var isResizing = true;
                $('body').css('cursor', isHorizontal ? 'ew-resize' : 'ns-resize');

                $(document).on('mousemove.rgfSplitter', function (event) {
                    if (!isResizing) return;

                    var newPrimarySize;
                    var newSecondarySize;

                    if (isHorizontal) {
                        var containerOffset = $container.offset().left,
                            containerSize = $container.width();

                        newPrimarySize = event.pageX - containerOffset;
                        newSecondarySize = containerSize - newPrimarySize - $splitter.outerWidth(true);
                        if ($container.resizable('instance')) {
                            $container.resizable('option', 'minWidth', newPrimarySize + minSize);
                        }
                    }
                    else {
                        var containerOffset = $container.offset().top,
                            containerSize = $container.height();

                        newPrimarySize = event.pageY - containerOffset;
                        newSecondarySize = containerSize - newPrimarySize - $splitter.outerHeight(true);
                        if ($container.resizable('instance')) {
                            $container.resizable('option', 'minHeight', newPrimarySize + minSize);
                        }
                    }

                    if (newPrimarySize > minSize && newSecondarySize > minSize) {
                        $primaryPanel.css('flex', `0 0 ${newPrimarySize}px`);
                        $secondaryPanel.css('flex', `0 0 ${newSecondarySize}px`);
                        BlazorSplitter.clearSiblingFlex($primaryPanel, isHorizontal);
                    }
                });

                $(document).on('mouseup.rgfSplitter', function () {
                    isResizing = false;
                    $('body').css('cursor', '');
                    $(document).off("mousemove.rgfSplitter mouseup.rgfSplitter");
                });
            });
        },
        clearSiblingFlex: function ($panel, horizontal) {
            if ($panel.length == 0) {
                return;
            }
            var $container = $panel?.children('.rgf-splitter-container');
            if ($container.length > 0) {
                if (horizontal && $container.hasClass('horizontal') ||
                    !horizontal && $container.hasClass('vertical')) {
                    $container.children('div.rgf-splitter-secondary-panel').css('flex', '');
                    return;
                }
                BlazorSplitter.clearSiblingFlex($container.children('div.rgf-splitter-primary-panel'), horizontal);
                BlazorSplitter.clearSiblingFlex($container.children('div.rgf-splitter-secondary-panel'), horizontal);
            }
        },
        resizable: function (container) {
            if ($(container).resizable('instance')) {
                return;
            }
            $(container).resizable({
                resize: function (event, ui) {
                    $(this).find('div.rgf-splitter-primary-panel, div.rgf-splitter-secondary-panel').css('flex', '');
                }
            });
        },
        disable: function (container) {
            var $container = $(container),
                $splitter = $container.children('.rgf-splitter'),
                $primaryPanel = $splitter.prev(),
                $secondaryPanel = $splitter.next();

            $primaryPanel.css('flex', '');
            $secondaryPanel.css('flex', '');
            if ($container.resizable('instance')) {
                $container.resizable("destroy");
            }
        }
    }
};

const BlazorGrids = Blazor.UI.Grid;
const BlazorSplitter = Blazor.UI.Splitter;
