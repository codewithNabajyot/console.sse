import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Printer, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import { useVendorLedger, useVendor } from '@/hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function VendorLedger() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: vendor } = useVendor(id)
  const { data: ledger, isLoading } = useVendorLedger(id)

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Loading vendor ledger...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Ledger</h1>
            <p className="text-muted-foreground mt-1">
              Transaction history for <span className="font-semibold text-foreground">{vendor?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b pb-6 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-widest">Suryasathi Console</h1>
        <h2 className="text-xl font-bold mt-2">Vendor Ledger Report</h2>
        <div className="mt-4 flex justify-between text-sm">
          <p><strong>Vendor:</strong> {vendor?.name}</p>
          <p><strong>Generated On:</strong> {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
        {vendor?.gst_number && (
          <p className="text-left text-sm mt-1"><strong>GST:</strong> {vendor.gst_number}</p>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:flex print:flex-row print:gap-4 print:mb-8">
        <Card className="bg-muted/30 print:bg-white print:shadow-none print:border print:flex-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4 print:p-2">
            <div className="p-2.5 rounded-full bg-red-100/50 text-red-600 print:hidden">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold print:text-[8px]">Total Bill Amount</p>
              <p className="text-xl font-black text-red-600 print:text-base print:text-black">₹{ledger?.totalBilled.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 print:bg-white print:shadow-none print:border print:flex-1 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4 print:p-2">
            <div className="p-2.5 rounded-full bg-green-100/50 text-green-600 print:hidden">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold print:text-[8px]">Total Paid Amount</p>
              <p className="text-xl font-black text-green-600 print:text-base print:text-black">₹{ledger?.totalPaid.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${ledger?.balance && ledger.balance > 0.1 ? "bg-orange-50/50 border-orange-200" : "bg-green-50/50 border-green-200"} print:bg-white print:shadow-none print:border print:flex-1 shadow-sm`}>
          <CardContent className="p-4 flex items-center gap-4 print:p-2">
            <div className={`p-2.5 rounded-full print:hidden ${ledger?.balance && ledger.balance > 0.1 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold print:text-[8px]">Outstanding Balance</p>
              <p className={`text-xl font-black ${ledger?.balance && ledger.balance > 0.1 ? "text-orange-700" : "text-green-700"} print:text-base print:text-black`}>
                ₹{Math.abs(ledger?.balance || 0).toLocaleString('en-IN')}
                <span className="text-xs ml-1.5 font-bold uppercase opacity-80 print:text-[10px]">
                  {ledger?.balance && ledger.balance > 0.1 ? "Dr (Due)" : "Cr (Advance)"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="print:shadow-none print:border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table className="print:w-full print:table-fixed">
            <TableHeader className="bg-muted/50">
              <TableRow className="print:border-b-2 print:border-black">
                <TableHead className="w-[100px] print:w-[80px] font-bold print:text-black">Date</TableHead>
                <TableHead className="w-[140px] print:w-[100px] font-bold print:text-black">Reference</TableHead>
                <TableHead className="font-bold print:text-black">Description / Project</TableHead>
                <TableHead className="text-right w-[110px] print:w-[90px] font-bold print:text-black">Debit (Bill)</TableHead>
                <TableHead className="text-right w-[110px] print:w-[90px] font-bold print:text-black">Credit (Paid)</TableHead>
                <TableHead className="text-right w-[140px] print:w-[110px] font-bold print:text-black">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger?.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No transactions recorded for this vendor.
                  </TableCell>
                </TableRow>
              ) : (
                ledger?.transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/5 print:border-b print:border-gray-200">
                    <TableCell className="text-sm font-medium print:text-[10px] print:py-2">
                       {format(new Date(t.date), 'dd MMM yy')}
                    </TableCell>
                    <TableCell className="print:py-2">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-muted-foreground uppercase font-bold print:hidden">{t.type}</span>
                        <span className="font-bold text-xs print:text-[10px]">{t.number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="print:py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold line-clamp-1 print:text-[10px] print:line-clamp-none whitespace-normal">{t.description || '—'}</span>
                        <span className="text-[11px] text-primary font-bold print:text-black print:text-[9px]">{t.project !== '-' ? t.project : ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-red-600/90 print:text-black print:text-[10px] print:py-2">
                      {t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-green-600/90 print:text-black print:text-[10px] print:py-2">
                      {t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '—'}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-black ${t.balance > 0.1 ? "text-orange-700" : "text-green-700"} print:text-black print:text-[10px] print:py-2`}>
                      ₹{Math.abs(t.balance).toLocaleString('en-IN')}
                      <span className="text-[10px] ml-1 font-bold italic opacity-70 print:text-[8px] print:opacity-100">{t.balance > 0.1 ? 'Dr' : 'Cr'}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print Summary Bar */}
      <div className="hidden print:block border-t-2 pt-4 mt-8">
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Net Outstanding Balance:</span>
          <span>
            ₹{Math.abs(ledger?.balance || 0).toLocaleString('en-IN')} 
            ({ledger?.balance && ledger.balance > 0.1 ? "DR - DUE" : "CR - ADVANCE"})
          </span>
        </div>
        <p className="text-center text-[10px] mt-12 opacity-50 italic">
          This is a computer generated ledger report from Suryasathi Console.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          @page { size: A4; margin: 1cm; }
          header, nav, aside, footer { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e5e7eb !important; padding: 4px 8px !important; }
        }
      `}} />
    </div>
  )
}
