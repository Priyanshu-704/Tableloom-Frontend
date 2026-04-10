import { logger } from "../utils/logger.js";
import api from './api';
import { createRequestCache } from "../utils/requestCache";
const tableRequestCache = createRequestCache(10000);
class TableService {
  async getTables(filters = {}) {
    const params = this.processTableFilters(filters);
    const response = await api.get('/tables', {
      params
    });
    return response.data;
  }
  async getTable(tableId) {
    const response = await api.get(`/tables/${tableId}`);
    return response.data;
  }
  async createTable(tableData) {
    const response = await api.post('/tables', {
      tableNumber: tableData.tableNumber,
      tableName: tableData.tableName || '',
      capacity: tableData.capacity,
      location: tableData.location || 'indoor',
      notes: tableData.notes || ''
    });
    return response.data;
  }
  async updateTable(tableId, updateData) {
    const response = await api.put(`/tables/${tableId}`, updateData);
    return response.data;
  }
  async deleteTable(tableId) {
    const response = await api.delete(`/tables/${tableId}`);
    return response.data;
  }
  async updateTableStatus(tableId, status, notes = '') {
    const response = await api.put(`/tables/${tableId}/status`, {
      status,
      notes
    });
    return response.data;
  }
  async toggleTableActive(tableId) {
    const response = await api.put(`/tables/${tableId}/toggle-active`);
    return response.data;
  }
  async getTableStats() {
    return tableRequestCache.run("tables:dashboard:stats", async () => {
      const response = await api.get('/tables/dashboard/stats');
      return response.data;
    });
  }
  async downloadQRCode(tableId) {
    const response = await api.get(`/tables/${tableId}/qr-download`, {
      responseType: 'blob'
    });
    const contentDisposition = response.headers['content-disposition'];
    let filename = `table-${tableId}-qrcode.png`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return {
      success: true,
      filename
    };
  }
  async regenerateQRCode(tableId) {
    const response = await api.put(`/tables/${tableId}/regenerate-qr`);
    return response.data;
  }
  async getQRTokenStatus(tableId) {
    const response = await api.get(`/tables/${tableId}/qr-token-status`);
    return response.data;
  }
  async refreshQRToken(tableId) {
    const response = await api.post(`/tables/${tableId}/table-refresh-token`);
    return response.data;
  }
  async getAvailableTables(capacity = null, location = null) {
    const filters = {
      status: 'available'
    };
    if (capacity) filters.capacity = capacity;
    if (location) filters.location = location;
    const response = await this.getTables(filters);
    return response.data;
  }
  async isTableAvailable(tableId) {
    try {
      const response = await this.getTable(tableId);
      const table = response.data;
      return table.status === 'available' && table.isActive;
    } catch {
      return false;
    }
  }
  async getOccupiedTables() {
    const response = await this.getTables({
      status: 'occupied'
    });
    return response.data;
  }
  async getTablesByLocation(location, status = null) {
    const filters = {
      location
    };
    if (status) filters.status = status;
    const response = await this.getTables(filters);
    return response.data;
  }
  async markForCleaning(tableId, notes = '') {
    return this.updateTableStatus(tableId, 'cleaning', notes);
  }
  async markUnderMaintenance(tableId, notes = '') {
    return this.updateTableStatus(tableId, 'maintenance', notes);
  }
  async markAsAvailable(tableId, notes = '') {
    return this.updateTableStatus(tableId, 'available', notes);
  }
  async markAsReserved(tableId, notes = '') {
    return this.updateTableStatus(tableId, 'reserved', notes);
  }
  async markAsOccupied(tableId, notes = '') {
    return this.updateTableStatus(tableId, 'occupied', notes);
  }
  processTableFilters(filters) {
    const processed = {
      ...filters
    };
    if (processed.page) processed.page = parseInt(processed.page);
    if (processed.limit) processed.limit = parseInt(processed.limit);
    if (processed.capacity) processed.capacity = parseInt(processed.capacity);
    if (processed.activeOnly !== undefined) {
      processed.activeOnly = processed.activeOnly.toString();
    }
    return processed;
  }
  getStatusColor(status) {
    const colors = {
      available: '#4caf50',
      occupied: '#f44336',
      billing: '#ff9800',
      reserved: '#2196f3',
      maintenance: '#9e9e9e',
      cleaning: '#ffc107',
      inactive: '#757575'
    };
    return colors[status] || '#757575';
  }
  getStatusLabel(status) {
    const labels = {
      available: 'Available',
      occupied: 'Occupied',
      billing: 'Billing',
      reserved: 'Reserved',
      maintenance: 'Maintenance',
      cleaning: 'Cleaning',
      inactive: 'Inactive'
    };
    return labels[status] || status;
  }
  getLocationLabel(location) {
    const labels = {
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      terrace: 'Terrace',
      'private-room': 'Private Room',
      bar: 'Bar',
      'main hall': 'Main Hall'
    };
    return labels[location] || location;
  }
  getLocationColor(location) {
    const colors = {
      indoor: '#4caf50',
      outdoor: '#ff9800',
      terrace: '#2196f3',
      'private-room': '#9c27b0',
      bar: '#f44336',
      'main hall': '#009688'
    };
    return colors[location] || '#757575';
  }
  formatCapacity(capacity) {
    return `${capacity} ${capacity === 1 ? 'person' : 'people'}`;
  }
  canOccupy(table) {
    return table.status === 'available' && table.isActive;
  }
  canClean(table) {
    return ['available', 'occupied', 'billing'].includes(table.status);
  }
  canReserve(table) {
    return table.status === 'available' && table.isActive;
  }
  calculateOccupancyRate(tables) {
    if (!tables.length) return 0;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    return occupied / tables.length * 100;
  }
  groupTablesByStatus(tables) {
    return tables.reduce((groups, table) => {
      const status = table.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(table);
      return groups;
    }, {});
  }
  groupTablesByLocation(tables) {
    return tables.reduce((groups, table) => {
      const location = table.location;
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(table);
      return groups;
    }, {});
  }
  getTablesNeedingAttention(tables) {
    return tables.filter(table => ['maintenance', 'cleaning'].includes(table.status) || table.tokenExpired && table.status !== 'inactive');
  }
  getTokenExpiryStatus(table) {
    if (!table.tokenExpiry) {
      return {
        status: 'no_token',
        label: 'No Token',
        color: '#9e9e9e'
      };
    }
    const daysRemaining = table.tokenDaysRemaining;
    if (daysRemaining <= 0) {
      return {
        status: 'expired',
        label: 'Expired',
        color: '#f44336'
      };
    } else if (daysRemaining <= 7) {
      return {
        status: 'expiring_soon',
        label: 'Expiring Soon',
        color: '#ff9800'
      };
    } else {
      return {
        status: 'valid',
        label: 'Valid',
        color: '#4caf50'
      };
    }
  }
  validateTableData(data) {
    const errors = {};
    if (!data.tableNumber?.trim()) {
      errors.tableNumber = 'Table number is required';
    }
    if (!data.capacity || data.capacity < 1) {
      errors.capacity = 'Valid capacity is required';
    } else if (data.capacity > 50) {
      errors.capacity = 'Capacity cannot exceed 50';
    }
    if (data.tableName && data.tableName.length > 50) {
      errors.tableName = 'Table name cannot exceed 50 characters';
    }
    if (data.notes && data.notes.length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  prepareTableExport(tables) {
    return tables.map(table => ({
      'Table Number': table.tableNumber,
      'Table Name': table.tableName || '',
      'Capacity': table.capacity,
      'Location': this.getLocationLabel(table.location),
      'Status': this.getStatusLabel(table.status),
      'Active': table.isActive ? 'Yes' : 'No',
      'QR Token Status': this.getTokenExpiryStatus(table).label,
      'Token Days Remaining': table.tokenDaysRemaining || 0,
      'Last Occupied': table.lastOccupied ? new Date(table.lastOccupied).toLocaleString() : '',
      'Last Cleaned': table.lastCleaned ? new Date(table.lastCleaned).toLocaleString() : '',
      'Notes': table.notes || '',
      'Created At': new Date(table.createdAt).toLocaleString()
    }));
  }
  downloadTablesAsCSV(tables, filename = 'tables-export') {
    const exportData = this.prepareTableExport(tables);
    if (exportData.length === 0) {
      logger.warn('No data to export');
      return;
    }
    const headers = Object.keys(exportData[0]);
    const csvContent = [headers.join(','), ...exportData.map(row => headers.map(header => {
      const value = row[header]?.toString() || '';
      return value.includes(',') ? `"${value}"` : value;
    }).join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  getTableSummary(tables) {
    const activeTables = tables.filter(t => t.isActive);
    const byStatus = this.groupTablesByStatus(activeTables);
    return {
      total: activeTables.length,
      available: byStatus.available?.length || 0,
      occupied: byStatus.occupied?.length || 0,
      billing: byStatus.billing?.length || 0,
      reserved: byStatus.reserved?.length || 0,
      maintenance: byStatus.maintenance?.length || 0,
      cleaning: byStatus.cleaning?.length || 0,
      occupancyRate: this.calculateOccupancyRate(activeTables),
      totalCapacity: activeTables.reduce((sum, t) => sum + t.capacity, 0),
      occupiedCapacity: activeTables.filter(t => t.status === 'occupied').reduce((sum, t) => sum + t.capacity, 0),
      tablesNeedingAttention: this.getTablesNeedingAttention(activeTables).length,
      expiredTokens: activeTables.filter(t => t.tokenExpired).length
    };
  }
  sortTables(tables, sortBy = 'tableNumber', sortOrder = 'asc') {
    return [...tables].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'tableNumber' || sortBy === 'tableName') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }
      if (sortBy === 'capacity') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      if (sortBy === 'lastOccupied' || sortBy === 'lastCleaned') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  isTokenExpired(table) {
    if (!table.tokenExpiry) return true;
    return new Date(table.tokenExpiry) < new Date();
  }
  getDaysUntilExpiry(table) {
    if (!table.tokenExpiry) return 0;
    const expiry = new Date(table.tokenExpiry).getTime();
    const now = new Date().getTime();
    const diffMs = expiry - now;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  filterTablesByCapacity(tables, minCapacity, maxCapacity = Infinity) {
    return tables.filter(table => table.capacity >= minCapacity && table.capacity <= maxCapacity);
  }
  getRecommendedTables(tables, partySize) {
    return tables.filter(table => table.status === 'available' && table.isActive && table.capacity >= partySize).sort((a, b) => a.capacity - b.capacity);
  }
  getTablesWithQRIssues(tables) {
    return tables.filter(table => table.isActive && (table.tokenExpired || !table.qrCode || !table.tokenExpiry));
  }
}
const tableService = new TableService();
export default tableService;
