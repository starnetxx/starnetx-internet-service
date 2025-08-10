import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../utils/supabase';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Filter,
  Calendar,
  Search,
  Receipt,
  Wallet
} from 'lucide-react';

interface TransactionRecord {
  id: string;
  user_id: string;
  plan_id?: string;
  location_id?: string;
  amount: number;
  type: 'wallet_funding' | 'plan_purchase' | 'wallet_topup';
  status: 'success' | 'pending' | 'failed' | 'completed' | 'active' | 'expired';
  reference?: string;
  flutterwave_reference?: string;
  flutterwave_tx_ref?: string;
  payment_method?: string;
  metadata?: any;
  details?: any;
  mikrotik_username?: string;
  mikrotik_password?: string;
  expires_at?: string;
  purchase_date?: string;
  activation_date?: string;
  created_at: string;
  updated_at: string;
  // Plan details (joined)
  plan_name?: string;
  plan_duration?: string;
  // Location details (joined)
  location_name?: string;
}

export const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const { plans, locations } = useData();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'funding' | 'purchase'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed' | 'active' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadTransactions();
      // Set up real-time listener for new transactions
      const subscription = supabase
        .channel('user_transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transaction update:', payload);
            loadTransactions(); // Reload transactions on any change
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load both transaction types
      const { data: dbTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          plans(name,duration),
          locations(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionError) {
        console.error('Error loading transactions:', transactionError);
        return;
      }

      // Transform and combine transactions
      const transformedTransactions: TransactionRecord[] = (dbTransactions || []).map(tx => ({
        ...tx,
        plan_name: tx.plans?.name,
        plan_duration: tx.plans?.duration,
        location_name: tx.locations?.name,
        // Normalize status for display
        status: normalizeStatus(tx.status, tx.type),
      }));

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status: string, type: string): 'success' | 'pending' | 'failed' | 'active' | 'expired' => {
    // Handle different status formats
    if (status === 'completed' || status === 'success') return 'success';
    if (status === 'pending') return 'pending';
    if (status === 'failed') return 'failed';
    if (status === 'active') return 'active';
    if (status === 'expired') return 'expired';
    
    // Default based on type
    return type === 'wallet_funding' ? 'success' : 'active';
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'wallet_funding' || type === 'wallet_topup') {
      return <ArrowDownLeft className="text-green-600" size={20} />;
    }
    return <ArrowUpRight className="text-blue-600" size={20} />;
  };

  const getTransactionColor = (type: string) => {
    if (type === 'wallet_funding' || type === 'wallet_topup') {
      return 'bg-green-100';
    }
    return 'bg-blue-100';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'active':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />;
      case 'failed':
      case 'expired':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
      case 'expired':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionTitle = (transaction: TransactionRecord) => {
    if (transaction.type === 'wallet_funding' || transaction.type === 'wallet_topup') {
      return 'Wallet Funding';
    }
    return transaction.plan_name || 'Plan Purchase';
  };

  const isAdminDeposit = (transaction: TransactionRecord) => {
    // Detect by either reference or flutterwave reference prefix ADMIN-
    if (transaction.reference && transaction.reference.startsWith('ADMIN-')) return true;
    const flw = (transaction as any).flutterwave_reference || (transaction as any).flutterwave_tx_ref;
    if (typeof flw === 'string' && flw.startsWith('ADMIN-')) return true;
    const method = (transaction as any).payment_method;
    return String(method) === 'admin_deposit';
  };

  const getTransactionDescription = (transaction: TransactionRecord) => {
    if (transaction.type === 'wallet_funding' || transaction.type === 'wallet_topup') {
      if (isAdminDeposit(transaction)) {
        return 'Admin deposit';
      }
      const raw = transaction.payment_method || 'bank_transfer';
      const pretty = String(raw).replace(/_/g, ' ').toLowerCase();
      return `Via ${pretty}`;
    }
    
    const parts = [];
    if (transaction.plan_duration) parts.push(transaction.plan_duration);
    if (transaction.location_name) parts.push(transaction.location_name);
    return parts.join(' • ') || 'Internet Plan';
  };

  const getAmountDisplay = (transaction: TransactionRecord) => {
    const sign = (transaction.type === 'wallet_funding' || transaction.type === 'wallet_topup') ? '+' : '-';
    const color = (transaction.type === 'wallet_funding' || transaction.type === 'wallet_topup') ? 'text-green-600' : 'text-blue-600';
    return (
      <span className={`font-bold ${color}`}>
        {sign}₦{transaction.amount.toLocaleString()}
      </span>
    );
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const typeMatch = filter === 'all' || 
      (filter === 'funding' && (transaction.type === 'wallet_funding' || transaction.type === 'wallet_topup')) ||
      (filter === 'purchase' && transaction.type === 'plan_purchase');
    
    const statusMatch = statusFilter === 'all' || transaction.status === statusFilter;
    
    const searchMatch = !searchTerm || 
      getTransactionTitle(transaction).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTransactionDescription(transaction).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const dateMatch = !dateFilter || 
      new Date(transaction.created_at).toISOString().split('T')[0] === dateFilter;
    
    return typeMatch && statusMatch && searchMatch && dateMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Wallet size={16} />
          <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Transactions</option>
              <option value="funding">Wallet Funding</option>
              <option value="purchase">Plan Purchases</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Completed</option>
              <option value="active">Active</option>
              <option value="pending">Processing</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <Input
            label="Search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search transactions..."
            icon={Search}
          />

          <Input
            label="Date"
            type="date"
            value={dateFilter}
            onChange={setDateFilter}
            icon={Calendar}
          />
        </div>
      </Card>

      {/* Transaction List */}
      <Card className="p-6">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="text-gray-400" size={24} />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You haven't made any transactions yet." 
                : `No ${filter} transactions found.`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentTransactions.map((transaction) => {
                const createdAt = new Date(transaction.created_at);
                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type, transaction.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {getTransactionTitle(transaction)}
                            {isAdminDeposit(transaction) && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide">Admin</span>
                            )}
                          </h4>
                          {transaction.reference && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {transaction.reference.slice(-8)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {getStatusIcon(transaction.status)}
                          <span>{getStatusText(transaction.status)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{getTransactionDescription(transaction)}</span>
                          <span className="text-gray-400">•</span>
                          <span>
                            {createdAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right">
                      <div className="mb-1">
                        {getAmountDisplay(transaction)}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm font-medium">
                    {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
