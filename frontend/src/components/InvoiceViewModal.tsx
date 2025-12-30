import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import type { Invoice } from '@/lib/types'

interface InvoiceViewModalProps {
  invoice: Invoice | null
  isOpen: boolean
  onClose: () => void
}

export function InvoiceViewModal({ invoice, isOpen, onClose }: InvoiceViewModalProps) {
  const { profile } = useAuth()
  const printRef = useRef<HTMLDivElement>(null)

  if (!invoice) return null

  const org = profile?.organization
  const customer = invoice.customer || invoice.project?.customer

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const originalContents = document.body.innerHTML
    const printContents = printContent.innerHTML

    document.body.innerHTML = printContents
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload() // Reload to restore React state
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <DialogTitle>Invoice Details</DialogTitle>
          <div className="flex gap-2 mr-6">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {/* <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button> */}
          </div>
        </DialogHeader>

        <div ref={printRef} className="p-8 bg-white text-black font-sans">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-orange-600">{org?.name}</h1>
              <p className="text-sm text-gray-600 max-w-xs">{org?.address}</p>
              <p className="text-sm font-semibold">GSTIN: {org?.gst_number}</p>
              <p className="text-sm">Phone: {org?.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-light text-gray-400 uppercase tracking-widest mb-4">Invoice</h2>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Invoice #: <span className="font-mono">{invoice.invoice_number}</span></p>
                <p className="text-sm font-semibold">Date: {format(new Date(invoice.date), 'dd MMM yyyy')}</p>
                {invoice.project && (
                  <p className="text-sm font-semibold">Project Code: <span className="font-mono">{invoice.project.project_id_code}</span></p>
                )}
              </div>
            </div>
          </div>

          <hr className="mb-8 border-gray-200" />

          {/* Customer Details */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To:</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="font-bold text-lg">{customer?.name}</p>
                {/* Assuming customer has address if we want more detail, but for now name + GST is key */}
                {/* <p className="text-sm text-gray-600">Address Placeholder</p> */}
                {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
                {customer?.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
              </div>
              <div className="text-right flex flex-col justify-end">
                {customer?.gst_number && (
                  <p className="text-sm font-bold">GSTIN: <span className="font-mono">{customer.gst_number}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800 text-left">
                <th className="py-2 text-xs font-bold uppercase">Description</th>
                <th className="py-2 text-xs font-bold uppercase text-right">Taxable Value</th>
                <th className="py-2 text-xs font-bold uppercase text-right">GST %</th>
                <th className="py-2 text-xs font-bold uppercase text-right">GST Amount</th>
                <th className="py-2 text-xs font-bold uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 text-sm font-medium">
                  {invoice.project ? `Solar Project Services (${invoice.project.project_id_code})` : 'Solar Equipment / Services'}
                </td>
                <td className="py-4 text-sm text-right">₹{invoice.taxable_value.toLocaleString('en-IN')}</td>
                <td className="py-4 text-sm text-right">{invoice.gst_percentage}%</td>
                <td className="py-4 text-sm text-right">₹{invoice.gst_amount.toLocaleString('en-IN')}</td>
                <td className="py-4 text-sm text-right font-bold">₹{invoice.total_amount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sub Total:</span>
                <span>₹{invoice.taxable_value.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">CGST ({(invoice.gst_percentage/2).toFixed(1)}%):</span>
                <span>₹{(invoice.gst_amount/2).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SGST ({(invoice.gst_percentage/2).toFixed(1)}%):</span>
                <span>₹{(invoice.gst_amount/2).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-gray-800 flex justify-between text-lg font-bold text-orange-600">
                <span>Grand Total:</span>
                <span>₹{invoice.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[10px] text-right italic text-gray-500 pt-1">
                Amount in words: {/* Logic to convert number to words could be added */}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-[10px] text-gray-500 pt-8 border-t">
            <div className="grid grid-cols-2">
              <div>
                <p className="font-bold mb-1">Terms & Conditions:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Goods once sold will not be taken back.</li>
                  <li>Interest @18% p.a. will be charged if payment is not made within 15 days.</li>
                  <li>All disputes are subject to Kolkata jurisdiction.</li>
                </ol>
              </div>
              <div className="text-right flex flex-col justify-end">
                <div className="mb-8 font-bold">For {org?.name}</div>
                <div className="mt-12 border-t border-gray-300 inline-block w-48 float-right">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
