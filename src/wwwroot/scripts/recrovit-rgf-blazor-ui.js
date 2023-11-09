/*!
* recrovit-rgf-blazor-ui.js v1.0.0
*/

window.Recrovit = window.Recrovit || { RGF: {} };
window.Recrovit.RGF.Blazor = window.Recrovit.RGF.Blazor || {};
var Blazor = window.Recrovit.RGF.Blazor;

Blazor.UI = {
    Dialog: {
        initialize: function (dialogId, resizable, focusId) {
            var dialog = document.getElementById(dialogId);
            //var d = new bootstrap.Modal(`#${dialogId}`, { keyboard: false });
            if (resizable) {
                $('div.modal-content', dialog).resizable();
            }
            $('div.modal-dialog', dialog).draggable();
            if (focusId != null) {
                document.getElementById(focusId).focus();
            }
            else {
                $('.btn-primary:first', dialog).focus();
            }
        }
    },
    Grid: {
        selectRow: function (row, idx) {
            //$(table).find('tr').eq(idx).addClass('table-active');
            $(row).addClass('table-active');
        },
        deselectAllRow: function (table) {
            $('tr', table).removeClass('table-active');
        },
        initializeTable: function (gridRef, table) {
            var rgfTable = new Recrovit.WebCli.RgfTable(table);
            rgfTable.makeColumnsResizable(function (idx, width) {
                gridRef.invokeMethodAsync('SetColumnWidth', idx, width);
            });
            rgfTable.makeColumnsDragable(function (idx, newIdx) {
                if (idx != newIdx && idx + 1 != newIdx) {
                    gridRef.invokeMethodAsync('SetColumnPos', idx, newIdx > idx ? newIdx - 1 : newIdx);
                }
            });
        }
    }
};