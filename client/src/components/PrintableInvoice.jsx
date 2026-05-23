import React, { forwardRef } from "react";

const PrintableInvoice = forwardRef(({ data, docType }, ref) => {
  const safeData = data || {};
  const items = safeData.items || [];

  return (
    <div
      ref={ref}
      className="p-10 bg-white text-black font-sans w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex justify-between border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mona Interior Studio</h1>
          <p>Professional Interior Design Services</p>
          <p className="text-xs text-gray-500 mt-1 italic">Computer Generated Sales Invoice</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase">{docType}</h2>
          <p className="font-bold">No: {safeData.invoiceNo}</p>
          <p className="text-sm">Date: {safeData.invoiceDate}</p>
          {safeData.workOrderId && (
            <p className="text-xs font-bold text-slate-500 mt-1">Ref WO: {safeData.workOrderId}</p>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div className="border-b border-gray-200 pb-4 mb-8">
        <div className="max-w-md">
          <p className="font-bold text-slate-500 uppercase text-[9px]">
            {safeData.billType === "GST" ? "Billed To (Org):" : "Client Name:"}
          </p>
          {safeData.billType !== "GST" && (
            <p className="text-lg font-semibold border-b border-gray-100 pb-1">
              {safeData.customer || "Cash Customer"}
            </p>
          )}
          {safeData.organizationName && (
            <p className="text-base font-bold text-slate-800 mt-1 border-b border-gray-100 pb-1">
              {safeData.organizationName}
            </p>
          )}
          {safeData.billType === "GST" && safeData.gstNumber && (
            <p className="text-xs text-slate-600 mt-1">
              GSTIN: <span className="font-mono font-semibold">{safeData.gstNumber}</span>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2 whitespace-pre-line">{safeData.address}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-gray-300 mb-8 text-[11px]">
        <thead>
          <tr className="bg-gray-100 uppercase text-[9px] tracking-wider">
            <th className="p-2 border w-8 text-center">S#</th>
            <th className="p-2 border text-left">Work Description</th>
            <th className="p-2 border w-12 text-center">Unit</th>
            <th className="p-2 border w-16 text-center">Area</th>
            <th className="p-2 border w-20 text-right">Price</th>
            <th className="p-2 border w-20 text-right">Taxable</th>
            {safeData.totalGst > 0 && (
              <>
                <th className="p-2 border w-10 text-center">GST%</th>
                <th className="p-2 border w-16 text-right">GST ₹</th>
              </>
            )}
            <th className="p-2 border w-24 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="p-2 border text-center">{i + 1}</td>
              <td className="p-2 border uppercase font-medium">{item.work}</td>
              <td className="p-2 border text-center text-gray-500">{item.unit}</td>
              <td className="p-2 border text-center">{item.area}</td>
              <td className="p-2 border text-right">{parseFloat(item.price).toFixed(2)}</td>
              <td className="p-2 border text-right">{item.taxableAmount.toFixed(2)}</td>
              {safeData.totalGst > 0 && (
                <>
                  <td className="p-2 border text-center text-blue-600 font-bold">{item.gstPerc}%</td>
                  <td className="p-2 border text-right font-medium">{item.gstAmount.toFixed(2)}</td>
                </>
              )}
              <td className="p-2 border text-right font-bold">
                {item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={safeData.totalGst > 0 ? "9" : "7"} className="p-10 text-center text-gray-400 italic">No work details listed</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-between items-start">
        <div className="text-[10px] text-gray-500 max-w-[300px]">
          {safeData.totalGst > 0 && (
            <>
              <p className="font-bold uppercase mb-1">GST Summary:</p>
              <div className="grid grid-cols-2 gap-x-4 border border-gray-100 p-2 rounded">
                <span>Total Taxable:</span> <span>₹{(safeData.subTotal || 0).toFixed(2)}</span>
                <span>Total GST:</span> <span>₹{(safeData.totalGst || 0).toFixed(2)}</span>
                <div className="col-span-2 border-t border-gray-100 my-1"></div>
                <span>CGST (9%):</span> <span>₹{((safeData.totalGst || 0) / 2).toFixed(2)}</span>
                <span>SGST (9%):</span> <span>₹{((safeData.totalGst || 0) / 2).toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="mt-4">
            <p className="font-bold uppercase mb-1">Terms & Conditions:</p>
            <p>1. {safeData.totalGst > 0 ? "This is a GST compliant service invoice." : "Non-GST service bill."}</p>
            <p>2. Payment due as per the agreed schedule.</p>
            <p>3. Subject to local jurisdiction.</p>
          </div>
        </div>
        
        <div className="w-72 space-y-2 text-right">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span> 
            <span className="font-semibold">₹{(safeData.subTotal || 0).toFixed(2)}</span>
          </div>
          
          {(parseFloat(safeData.discount) > 0) && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Discount ({safeData.discount}%):</span> 
              <span>- ₹{((safeData.subTotal * safeData.discount) / 100).toFixed(2)}</span>
            </div>
          )}

          {(parseFloat(safeData.lessAmount) > 0) && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Less ₹:</span> 
              <span>- ₹{parseFloat(safeData.lessAmount).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-xl border-t border-gray-900 pt-2 mt-2">
            <span>Net Payable:</span> 
            <span className="text-emerald-700">₹{(safeData.grandTotal || 0).toFixed(2)}</span>
          </div>

          <div className="bg-gray-50 p-2 mt-4 space-y-1 text-xs">

            {(parseFloat(safeData.receivedAmount) > 0) && (
              <div className="flex justify-between">
                <span>Received Now:</span> 
                <span>₹{parseFloat(safeData.receivedAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-gray-200 pt-1 text-red-600">
              <span>Balance Due:</span> 
              <span>₹{(safeData.balanceAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 flex justify-between">
        <div className="text-center border-t border-gray-400 pt-2 w-40 text-xs">
          Customer's Signature
        </div>
        <div className="text-center border-t border-gray-400 pt-2 w-40 text-xs">
          Authorized Signatory
        </div>
      </div>
    </div>
  );
});

export default PrintableInvoice;
