import { useMemo } from 'react'
import { useIncome } from './useIncome'
import { useExpenses } from './useExpenses'
import { useExpensePayments } from './useExpensePayments'
import { useBankTransfers } from './useBankTransfers'

export type TransactionType = 'income' | 'expense' | 'payment'

export interface BankTransaction {
  id: string
  date: string
  type: TransactionType
  category: string
  description: string
  amount: number
  bank_account_id: string
  bank_name: string
  reference: string
  payment_mode?: string
  party_name?: string
}

export function useBankTransactions() {
  const { data: income, isLoading: isLoadingIncome } = useIncome()
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  const { data: payments, isLoading: isLoadingPayments } = useExpensePayments()
  const { data: transfers, isLoading: isLoadingTransfers } = useBankTransfers()

  const transactions = useMemo(() => {
    if (!income || !expenses || !payments || !transfers) return []

    const allTransactions: BankTransaction[] = []

    // 1. Income
    income.forEach(inc => {
      if (inc.bank_account_id) {
        allTransactions.push({
          id: inc.id,
          date: inc.date,
          type: 'income',
          category: inc.category || 'Income',
          description: inc.received_from || 'Income Received',
          amount: inc.amount,
          bank_account_id: inc.bank_account_id,
          bank_name: inc.bank_account?.account_name || 'Unknown Bank',
          reference: inc.payment_mode || '',
          payment_mode: inc.payment_mode || undefined,
          party_name: inc.received_from || undefined
        })
      }
    })

    // 2. Direct Expenses (only those with bank_account_id)
    expenses.forEach(exp => {
      if (exp.bank_account_id) {
        allTransactions.push({
          id: exp.id,
          date: exp.date,
          type: 'expense',
          category: exp.category || 'Direct Expense',
          description: exp.description || 'Expense',
          amount: exp.total_paid,
          bank_account_id: exp.bank_account_id,
          bank_name: exp.bank_account?.account_name || 'Unknown Bank',
          reference: exp.vendor_invoice_number || '',
          payment_mode: 'Direct',
          party_name: exp.vendor?.name
        })
      }
    })

    // 3. Vendor Payments
    payments.forEach(pay => {
      if (pay.bank_account_id) {
        allTransactions.push({
          id: pay.id,
          date: pay.date,
          type: 'expense', // Treat as expense for visual consistency in red
          category: 'Vendor Payment',
          description: `Payment to ${pay.vendor?.name || 'Vendor'}`,
          amount: pay.amount,
          bank_account_id: pay.bank_account_id,
          bank_name: pay.bank_account?.account_name || 'Unknown Bank',
          reference: pay.payment_number || '',
          payment_mode: pay.payment_mode,
          party_name: pay.vendor?.name
        })
      }
    })

    // 4. Internal Transfers (Double sided)
    transfers.forEach(transfer => {
      // Outflow side
      allTransactions.push({
        id: `${transfer.id}-out`,
        date: transfer.date,
        type: 'expense',
        category: 'Internal Transfer',
        description: `Transfer to ${transfer.to_account?.account_name || 'Destination'}`,
        amount: transfer.amount,
        bank_account_id: transfer.from_account_id,
        bank_name: transfer.from_account?.account_name || 'Unknown Bank',
        reference: 'TRANSFER-OUT',
        payment_mode: 'Transfer',
        party_name: transfer.to_account?.account_name
      })

      // Inflow side
      allTransactions.push({
        id: `${transfer.id}-in`,
        date: transfer.date,
        type: 'income',
        category: 'Internal Transfer',
        description: `Transfer from ${transfer.from_account?.account_name || 'Source'}`,
        amount: transfer.amount,
        bank_account_id: transfer.to_account_id,
        bank_name: transfer.to_account?.account_name || 'Unknown Bank',
        reference: 'TRANSFER-IN',
        payment_mode: 'Transfer',
        party_name: transfer.from_account?.account_name
      })
    })

    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [income, expenses, payments, transfers])

  return {
    data: transactions,
    isLoading: isLoadingIncome || isLoadingExpenses || isLoadingPayments || isLoadingTransfers
  }
}
