import { logger } from "../../../common/utils/logger.js";
import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle } from 'lucide-react';
import { menuService } from '../../../common/services';
import { useAdmin } from '../../context/AdminContext';
export function ImportExport() {
  const {
    addNotification
  } = useAdmin();
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      await menuService.exportMenuItems();
      addNotification('Menu exported successfully.', 'success');
    } catch (error) {
      logger.error('Export failed:', error);
      addNotification(error.response?.data?.message || 'Export failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleImport = async () => {
    if (!importFile) {
      addNotification('Please select a file to import', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await menuService.importMenuItems(importFile);
      setImportResults(response.data);
      setImportFile(null);
      addNotification(response?.message || 'Menu imported successfully.', 'success');
      document.getElementById('import-file').value = '';
    } catch (error) {
      logger.error('Import failed:', error);
      addNotification(error.response?.data?.message || 'Import failed. Please check the file format.', 'error');
    } finally {
      setLoading(false);
    }
  };
  const downloadTemplate = async () => {
    try {
      await menuService.downloadImportTemplate();
    } catch (error) {
      logger.error('Failed to download template:', error);
    }
  };
  return <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import/Export Menu</h1>
        <p className="text-gray-600">Bulk import and export menu items using CSV files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Export Menu</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Export your current menu items to a CSV file for backup or analysis.
          </p>

          <button onClick={handleExport} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Download className="h-4 w-4 mr-2" />}
            Export Menu as CSV
          </button>
        </div>

        {}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import Menu</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Import menu items from a CSV file. Download the template first to ensure proper formatting.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input id="import-file" type="file" accept=".csv" onChange={e => setImportFile(e.target.files[0])} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500" />
            </div>

            <div className="flex space-x-3">
              <button onClick={downloadTemplate} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </button>

              <button onClick={handleImport} disabled={loading || !importFile} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Upload className="h-4 w-4 mr-2" />}
                Import File
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      {importResults && <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Created: {importResults.created || 0}</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <CheckCircle className="h-5 w-5" />
              <span>Updated: {importResults.updated || 0}</span>
            </div>
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Errors: {importResults.errors || 0}</span>
            </div>
          </div>

          {importResults.errorDetails && importResults.errorDetails.length > 0 && <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Error Details:</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                {importResults.errorDetails.map((error, index) => <div key={index} className="text-sm text-red-700">
                    {error}
                  </div>)}
              </div>
            </div>}
        </div>}
    </div>;
}
