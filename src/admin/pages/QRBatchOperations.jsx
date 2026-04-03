import { logger } from "../../common/utils/logger.js";
import React, { useState } from 'react';
import { Download, RefreshCw, AlertTriangle, CheckCircle, Printer, FileText, Grid, Settings } from 'lucide-react';
import tableService from '../../common/services/TableService';
import Select from '../components/common/Select';
import { useAdmin } from '../context/AdminContext';
import { withTenantQueryParams } from '../../common/utils/qrImage';
export function QRBatchOperations({
  tables,
  onClose,
  onSuccess
}) {
  const {
    addNotification
  } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [operation, setOperation] = useState('download');
  const [qrSize, setQrSize] = useState('medium');
  const [printLayout, setPrintLayout] = useState('multiple');
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  });
  const tablesWithQR = tables.filter(t => t.qrCode).map(t => ({
    ...t,
    qrCode: withTenantQueryParams(t.qrCode)
  }));
  const selectedTableData = tablesWithQR.filter(t => selectedTables.includes(t.id));
  const getPreviewWidth = size => {
    switch (size) {
      case 'small':
        return '150px';
      case 'large':
        return '350px';
      default:
        return '250px';
    }
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tablesWithQR.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };
  const handleSelectTable = tableId => {
    if (selectedTables.includes(tableId)) {
      setSelectedTables(selectedTables.filter(id => id !== tableId));
      setSelectAll(false);
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };
  const handleBatchDownload = async () => {
    setLoading(true);
    setProgress({
      current: 0,
      total: selectedTables.length
    });
    try {
      for (let i = 0; i < selectedTables.length; i++) {
        const tableId = selectedTables[i];
        await tableService.downloadQRCode(tableId);
        setProgress({
          current: i + 1,
          total: selectedTables.length
        });
      }
      onSuccess?.(`Successfully downloaded ${selectedTables.length} QR codes`);
    } catch (error) {
      logger.error('Batch download failed:', error);
      addNotification(error.response?.data?.message || 'Failed to download some QR codes', 'error');
    } finally {
      setLoading(false);
      setProgress({
        current: 0,
        total: 0
      });
    }
  };
  const handleBatchRegenerate = async () => {
    setLoading(true);
    setProgress({
      current: 0,
      total: selectedTables.length
    });
    try {
      for (let i = 0; i < selectedTables.length; i++) {
        const tableId = selectedTables[i];
        await tableService.regenerateQRCode(tableId);
        setProgress({
          current: i + 1,
          total: selectedTables.length
        });
      }
      onSuccess?.(`Successfully regenerated ${selectedTables.length} QR codes`);
      setConfirmRegenerate(false);
    } catch (error) {
      logger.error('Batch regeneration failed:', error);
      addNotification(error.response?.data?.message || 'Failed to regenerate some QR codes', 'error');
    } finally {
      setLoading(false);
      setProgress({
        current: 0,
        total: 0
      });
    }
  };
  const handleBatchPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addNotification('Please allow popups to print QR codes.', 'warning');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Batch QR Codes Print</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 20px;
            }
            .page {
              page-break-after: always;
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .qr-item {
              text-align: center;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            img { max-width: 200px; height: auto; }
            .table-number { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .instructions { 
              margin-top: 10px; 
              font-size: 12px; 
              color: #666;
              text-align: left;
            }
            @media print {
              .page { page-break-after: always; }
              .qr-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${selectedTableData.map((table, index) => `
            <div class="page">
              <div class="${printLayout === 'multiple' ? 'grid' : ''}">
                ${printLayout === 'multiple' ? `
                  ${selectedTableData.slice(index, index + 4).map(t => `
                    <div class="qr-item">
                      <div class="table-number">Table ${t.number}</div>
                      ${t.tableName ? `<div style="color: #666; margin-bottom: 10px;">${t.tableName}</div>` : ''}
                      <img src="${t.qrCode}" alt="QR Code for Table ${t.number}" />
                      <div style="margin-top: 10px; font-size: 12px; color: #999;">
                        Scan to view menu & place order
                      </div>
                      ${includeInstructions ? `
                        <div class="instructions">
                          <strong>Instructions:</strong>
                          <ol style="margin-top: 5px; padding-left: 20px;">
                            <li>Open camera app</li>
                            <li>Scan QR code</li>
                            <li>Browse menu & order</li>
                          </ol>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                ` : `
                  <div class="qr-item">
                    <div class="table-number">Table ${table.number}</div>
                    ${table.tableName ? `<div style="color: #666; margin-bottom: 10px;">${table.tableName}</div>` : ''}
                    <img src="${table.qrCode}" alt="QR Code for Table ${table.number}" />
                    <div style="margin-top: 10px; font-size: 12px; color: #999;">
                      Scan to view menu & place order
                    </div>
                    ${includeInstructions ? `
                      <div class="instructions">
                        <strong>Instructions:</strong>
                        <ol style="margin-top: 5px; padding-left: 20px;">
                          <li>Open camera app</li>
                          <li>Scan QR code</li>
                          <li>Browse menu & order</li>
                        </ol>
                      </div>
                    ` : ''}
                  </div>
                `}
              </div>
            </div>
          `).filter((_, index) => printLayout !== 'multiple' || index % 4 === 0).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    const imageLoadPromises = Array.from(printWindow.document.images).map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    });

    Promise.all(imageLoadPromises)
      .then(() => {
        onSuccess?.(`Print window opened for ${selectedTableData.length} QR codes`);
        window.setTimeout(triggerPrint, 150);
      })
      .catch(() => {
        onSuccess?.(`Print window opened for ${selectedTableData.length} QR codes`);
        window.setTimeout(triggerPrint, 150);
      });
  };
  const handleExecute = () => {
    switch (operation) {
      case 'download':
        handleBatchDownload();
        break;
      case 'regenerate':
        setConfirmRegenerate(true);
        break;
      case 'print':
        handleBatchPrint();
        break;
    }
  };
  return <div className="p-6">
        {}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Operation
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[{
          id: 'download',
          label: 'Download',
          icon: Download
        }, {
          id: 'regenerate',
          label: 'Regenerate',
          icon: RefreshCw
        }, {
          id: 'print',
          label: 'Print',
          icon: Printer
        }].map(op => {
          const Icon = op.icon;
          return <button key={op.id} onClick={() => setOperation(op.id)} className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${operation === op.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <Icon className={`h-6 w-6 ${operation === op.id ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${operation === op.id ? 'text-primary-700' : 'text-gray-700'}`}>
                    {op.label}
                  </span>
                </button>;
        })}
          </div>
        </div>

        {}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Select Tables ({selectedTables.length} selected)
            </label>
            <button onClick={handleSelectAll} className="text-sm text-primary-600 hover:text-primary-700">
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            {tablesWithQR.map(table => <label key={table.id} className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                <input type="checkbox" checked={selectedTables.includes(table.id)} onChange={() => handleSelectTable(table.id)} className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">Table {table.number}</span>
                    {table.tableName && <span className="ml-2 text-sm text-gray-500">({table.tableName})</span>}
                  </div>
                  <span className="text-xs text-gray-500">{table.location}</span>
                </div>
              </label>)}

            {tablesWithQR.length === 0 && <div className="px-4 py-8 text-center text-gray-500">
                No tables with QR codes found
              </div>}
          </div>
        </div>

        {}
        <div className="mb-6 space-y-4">
          <h3 className="font-medium text-gray-900">Settings</h3>
          
          <Select label="QR Code Size" value={qrSize} onChange={setQrSize} options={[{
        value: 'small',
        label: 'Small (150x150)'
      }, {
        value: 'medium',
        label: 'Medium (250x250)'
      }, {
        value: 'large',
        label: 'Large (350x350)'
      }]} />

          {operation === 'print' && <>
              <Select label="Print Layout" value={printLayout} onChange={setPrintLayout} options={[{
          value: 'single',
          label: 'Single per page'
        }, {
          value: 'multiple',
          label: 'Multiple per page'
        }]} />
              
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={includeInstructions} onChange={e => setIncludeInstructions(e.target.checked)} className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Include usage instructions</span>
              </label>
            </>}
        </div>

        {operation === 'print' && <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Print Preview</h3>
              <span className="text-sm text-gray-500">{selectedTableData.length} selected</span>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
              {selectedTableData.length > 0 ? <div className={`grid gap-4 ${printLayout === 'multiple' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {selectedTableData.map(table => <div key={`print-preview-${table.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <div className="font-medium text-gray-900">Table {table.number}</div>
                        <div className="text-sm text-gray-500">{table.tableName || table.location || 'Ready to print'}</div>
                      </div>
                      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                        {table.qrCode ? <img src={table.qrCode} alt={`QR Code for Table ${table.number}`} className="h-auto max-w-full" style={{
                    width: getPreviewWidth(qrSize)
                  }} /> : <div className="text-sm text-gray-400">QR preview not available</div>}
                      </div>
                    </div>)}
                </div> : <div className="py-10 text-center text-sm text-gray-500">
                  Select tables to preview their QR codes before printing.
                </div>}
            </div>
          </div>}

        {}
        {loading && <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{
          width: `${progress.current / progress.total * 100}%`
        }}></div>
            </div>
          </div>}

        {}
        {confirmRegenerate && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Warning: Regenerate QR Codes</p>
                <p className="text-sm text-red-700 mt-1">
                  This will invalidate existing QR codes for {selectedTables.length} tables.
                  All printed QR codes will stop working. This action cannot be undone.
                </p>
                <div className="mt-3 flex space-x-3">
                  <button onClick={handleBatchRegenerate} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                    {loading ? 'Regenerating...' : 'Yes, Regenerate All'}
                  </button>
                  <button onClick={() => setConfirmRegenerate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>}

        {}
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleExecute} disabled={selectedTables.length === 0 || loading || confirmRegenerate} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </> : <>
                {operation === 'download' && <Download className="h-4 w-4" />}
                {operation === 'regenerate' && <RefreshCw className="h-4 w-4" />}
                {operation === 'print' && <Printer className="h-4 w-4" />}
                <span>
                  {operation === 'download' && `Download (${selectedTables.length})`}
                  {operation === 'regenerate' && `Regenerate (${selectedTables.length})`}
                  {operation === 'print' && `Print (${selectedTables.length})`}
                </span>
              </>}
          </button>
        </div>
      </div>;
}
