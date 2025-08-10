import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useData } from '../../contexts/DataContext';
import { Credential } from '../../types';
import { Key, Plus, Trash2, Users, CheckCircle, XCircle } from 'lucide-react';

export const CredentialManager: React.FC = () => {
  const { 
    locations, 
    plans, 
    credentials, 
    addCredential,
    bulkAddCredentials,
    updateCredentialStatus, 
    deleteCredential, 
    getCredentialsByLocation 
  } = useData();
  
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkCredentials, setBulkCredentials] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');
  const [bulkJson, setBulkJson] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const locationFiltered = selectedLocation 
    ? getCredentialsByLocation(
        selectedLocation,
        selectedPlanType ? (plans.find(p => p.type === selectedPlanType)?.id || selectedPlanType) : undefined
      )
    : credentials;

  const filteredCredentials = statusFilter === 'all' 
    ? locationFiltered 
    : locationFiltered.filter(c => c.status === statusFilter);

  const totalCount = locationFiltered.length;
  const availableCount = locationFiltered.filter(c => c.status === 'available').length;
  const usedCount = locationFiltered.filter(c => c.status === 'used').length;

  const handleAddCredentials = async () => {
    if (!selectedLocation || !selectedPlanType) {
      alert('Please select both location and plan type');
      return;
    }

    const lines = bulkCredentials.trim().split('\n');
    const newCredentialInputs: Array<{ username: string; password: string; locationId: string; planId: string; status: 'available' | 'used' }>= [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Support CSV/TSV/space/semicolon separated
      const parts = trimmed.includes(',') ? trimmed.split(',') : trimmed.split(/[\s;]+/);
      const username = parts[0]?.trim();
      const password = parts[1]?.trim();
      if (username && password) {
        // Check if credential already exists
        const exists = credentials.some(c => 
          c.username === username && c.locationId === selectedLocation
        );
        
        if (!exists) {
          const selectedPlan = plans.find(p => p.type === selectedPlanType);
          if (selectedPlan) {
            newCredentialInputs.push({
              username,
              password,
              locationId: selectedLocation,
              planId: selectedPlan.id, // Use the actual plan UUID
              status: 'available',
            });
          }
        }
      }
    });

    console.log('About to add credentials:', newCredentialInputs);
    console.log('Selected location:', selectedLocation);
    console.log('Selected plan type:', selectedPlanType);
    console.log('Found plan:', plans.find(p => p.type === selectedPlanType));

    try {
      const addedCount = await bulkAddCredentials(newCredentialInputs);
      const skipped = lines.length - addedCount;
      setBulkCredentials('');
      setShowAddForm(false);
      alert(`Added ${addedCount} new credentials${skipped > 0 ? `, skipped ${skipped} (may already exist)` : ''}`);
    } catch (e: any) {
      console.error('Error adding credentials:', e);
      alert(e?.message || 'Failed to add credentials. Some may already exist.');
    }
  };

  const handleAddFromJson = async () => {
    if (!selectedLocation || !selectedPlanType) {
      alert('Please select both location and plan type');
      return;
    }

    try {
      const parsed = JSON.parse(bulkJson);
      const planId = plans.find(p => p.type === selectedPlanType)?.id || '';

      let inputs: Array<{ username: string; password: string; locationId: string; planId: string; status: 'available' }> = [];

      if (Array.isArray(parsed)) {
        inputs = parsed
          .map((item: any) => {
            // Support different shapes: {username,password} OR {user,pass} OR [username,password]
            if (Array.isArray(item) && item.length >= 2) {
              return { username: String(item[0]), password: String(item[1]) };
            }
            if (item && typeof item === 'object') {
              const username = item.username || item.user || item.u;
              const password = item.password || item.pass || item.p;
              if (username && password) return { username: String(username), password: String(password) };
            }
            return null;
          })
          .filter(Boolean)
          .map((item: any) => ({
            username: item.username,
            password: item.password,
            locationId: selectedLocation,
            planId,
            status: 'available' as const,
          }));
      } else if (parsed && typeof parsed === 'object') {
        // Support object map: { "user1": "pass1", "user2": "pass2" }
        inputs = Object.entries(parsed)
          .filter(([, v]) => typeof v === 'string')
          .map(([k, v]) => ({
            username: String(k),
            password: String(v),
            locationId: selectedLocation,
            planId,
            status: 'available' as const,
          }));
      } else {
        alert('Unsupported JSON format');
        return;
      }

      // Deduplicate with existing
              // Ensure each input has the correct plan UUID
        inputs = inputs
          .map(ci => {
            const selectedPlan = plans.find(p => p.type === selectedPlanType);
            return selectedPlan ? { ...ci, planId: selectedPlan.id } : null;
          })
          .filter(Boolean)
          .filter((ci) => ci!.username && ci!.password && !credentials.some(c => c.username === ci!.username && c.locationId === ci!.locationId));

      const added = await bulkAddCredentials(inputs);
      setBulkJson('');
      setShowAddForm(false);
      alert(`Added ${added} credentials from JSON`);
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);

    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      setBulkJson(text);
    } else if (ext === 'csv' || ext === 'txt') {
      setBulkCredentials(text);
    } else {
      // Try to detect format: if looks like JSON, put in json, else plain
      try {
        JSON.parse(text);
        setBulkJson(text);
      } catch {
        setBulkCredentials(text);
      }
    }
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown Location';
  };

  const getPlanTypeName = (planType: string) => {
    const byType = plans.find(p => p.type === planType);
    if (byType) return byType.name;
    const byId = plans.find(p => p.id === planType);
    return byId ? byId.name : planType;
  };

  const downloadTemplate = (type: 'json' | 'csv') => {
    const jsonTemplate = [
      { username: 'user001', password: 'pass001' },
      { username: 'user002', password: 'pass002' }
    ];
    const csvTemplate = 'username,password\nuser001,pass001\nuser002,pass002\n';

    const content = type === 'json' ? JSON.stringify(jsonTemplate, null, 2) : csvTemplate;
    const mime = type === 'json' ? 'application/json' : 'text/csv';
    const filename = type === 'json' ? 'credentials_template.json' : 'credentials_template.csv';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Credential Pool Manager</h2>
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="flex items-center gap-2"
          disabled={!selectedLocation || !selectedPlanType}
        >
          <Plus size={16} />
          Add Credentials
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Filter Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Type
            </label>
            <select
              value={selectedPlanType}
              onChange={(e) => setSelectedPlanType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Plan Types</option>
              <option value="3-hour">3-Hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Credentials</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'available' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => setStatusFilter('available')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">{availableCount}</p>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'used' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => setStatusFilter('used')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Use</p>
              <p className="text-2xl font-bold text-gray-900">{usedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Credentials Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {statusFilter === 'all' ? 'All Credentials' : 
             statusFilter === 'available' ? 'Available Credentials' : 
             'Used Credentials'}
            {selectedLocation && (
              <span className="text-sm font-normal text-gray-600">
                - {getLocationName(selectedLocation)}
                {selectedPlanType && ` (${getPlanTypeName(selectedPlanType)})`}
              </span>
            )}
          </h3>
          <span className="text-sm text-gray-500">
            Showing {filteredCredentials.length} of {totalCount} credentials
          </span>
        </div>
        
        {filteredCredentials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No credentials found. Add some credentials to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Username</th>
                  <th className="text-left py-3">Password</th>
                  <th className="text-left py-3">Location</th>
                  <th className="text-left py-3">Plan Type</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Assigned User</th>
                  <th className="text-left py-3">Assigned Date</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredentials.map((credential) => (
                  <tr key={credential.id} className="border-b">
                    <td className="py-3 font-mono">{credential.username}</td>
                    <td className="py-3 font-mono">{credential.password}</td>
                    <td className="py-3">{getLocationName(credential.locationId)}</td>
                    <td className="py-3">{getPlanTypeName(credential.planType)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${
                        credential.status === 'available' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {credential.status === 'available' ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {credential.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {credential.assignedUserId ? (
                        <span className="text-sm text-gray-600">
                          {credential.assignedUserId.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      {credential.assignedDate ? (
                        <span className="text-sm text-gray-600">
                          {new Date(credential.assignedDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteCredential(credential.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Credentials Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add Credentials</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location: {getLocationName(selectedLocation)}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Type: {getPlanTypeName(selectedPlanType)}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credentials (one per line: username password)
                </label>
                <textarea
                  value={bulkCredentials}
                  onChange={(e) => setBulkCredentials(e.target.value)}
                  placeholder={`user001 pass001
user002 pass002
user003 pass003`}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: username password (separated by space)
                </p>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or paste JSON array
                </label>
                <textarea
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder='[{"username":"user001","password":"pass001"}]'
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: Array of objects with username and password
                </p>
              </div>

              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or upload file (JSON, CSV, or TXT)
                </label>
                <input type="file" accept=".json,.csv,.txt" onChange={handleFileUpload} />
              </div>

              <div className="pt-4 flex flex-wrap gap-3 items-center">
                <Button variant="outline" onClick={() => downloadTemplate('json')}>Download JSON template</Button>
                <Button variant="outline" onClick={() => downloadTemplate('csv')}>Download CSV template</Button>
                <span className="text-xs text-gray-500">Existing credentials will be skipped automatically.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <Button onClick={handleAddCredentials}>
                Add from Text
              </Button>
              <Button variant="outline" onClick={handleAddFromJson}>
                Add from JSON
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};