import React, { forwardRef } from 'react';

const FinalSettlementSheet = forwardRef(({ site, receipts }, ref) => {
  if (!site) return null;

  const totalBudget = site.budget || 0;
  
  // Calculate total receipts
  const totalReceived = receipts?.reduce((sum, r) => sum + parseFloat(r.amountPaid || 0), 0) || 0;
  
  // Assuming no specific offers/deductions are tracked per-site natively right now,
  // we will leave "Less Offer" as 0, or just generic 0 for FOC.
  const totalOffer = 0; 
  const grandTotal = totalBudget - totalOffer;
  const balance = grandTotal - totalReceived;

  const today = new Date().toLocaleDateString("en-GB");

  return (
    <div className="hidden">
      <div ref={ref} className="bg-white text-black p-8 font-sans w-[210mm] min-h-[297mm] mx-auto text-sm flex flex-col print:flex print:w-full print:h-[297mm] print:m-0 print:p-8">
        {/* Title */}
        <h1 className="text-center font-bold text-lg mb-2 uppercase underline underline-offset-4 tracking-wider">
          Final Settlement Sheet
        </h1>

        {/* Header Table */}
        <table className="w-full border-collapse border border-black mb-4 text-xs font-semibold">
          <tbody>
            <tr>
              <td className="border border-black p-1 pl-2 w-1/3">DATE</td>
              <td className="border border-black p-1 text-center w-1/12">-</td>
              <td className="border border-black p-1 pr-2 text-right w-7/12">{today}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2">CUSTOMER NAME</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 pr-2 text-right uppercase">{site.clientName || "N/A"}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2">SITE ADDRESS</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 pr-2 text-right uppercase">{site.address || "N/A"}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2">ORGANIZATION</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 pr-2 text-right uppercase">{site.organizationName || "N/A"}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2">WORK ORDER ID</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 pr-2 text-right uppercase">#{site.id}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2">PROJECT STATUS</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 pr-2 text-right uppercase">{site.status}</td>
            </tr>
          </tbody>
        </table>

        {/* Particulars Table */}
        <table className="w-full border-collapse border border-black mb-0 text-xs">
          <thead>
            <tr>
              <th className="border border-black p-1 text-center font-bold w-1/2">PARTICULARS</th>
              <th className="border border-black p-1 text-center font-bold w-1/4">AMOUNT</th>
              <th className="border border-black p-1 text-center font-bold w-1/4">AMOUNT<br/>RECEIVED</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 pl-2 font-semibold uppercase">Total Project Budget</td>
              <td className="border border-black p-1 text-center">{totalBudget}</td>
              <td className="border border-black p-1 text-center bg-gray-50 border-b-0"></td>
            </tr>
            {/* Empty padding rows for layout match */}
            {[...Array(6)].map((_, i) => (
              <tr key={`pad-${i}`}>
                <td className="border border-black p-1 h-5"></td>
                <td className="border border-black p-1"></td>
                <td className="border-l border-r border-black p-1 bg-gray-50"></td>
              </tr>
            ))}
            <tr>
              <td className="border border-black p-1 pl-2 font-bold uppercase">Base Cost</td>
              <td className="border border-black p-1 text-center font-bold">{totalBudget}</td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>
            
            {/* Offer Section Header */}
            <tr className="bg-purple-800 text-white font-bold text-center">
              <td colSpan="3" className="border border-black p-1 h-3"></td>
            </tr>

            <tr>
              <td className="border border-black p-1 pl-2 font-semibold uppercase">Less Offer:</td>
              <td className="border border-black p-1 text-center"></td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2 font-semibold uppercase">FOC / Discounts</td>
              <td className="border border-black p-1 text-center">{totalOffer}</td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>
            {[...Array(2)].map((_, i) => (
              <tr key={`pad2-${i}`}>
                <td className="border border-black p-1 h-5"></td>
                <td className="border border-black p-1"></td>
                <td className="border-l border-r border-black p-1 bg-gray-50"></td>
              </tr>
            ))}
            <tr>
              <td className="border border-black p-1 font-bold text-center uppercase">Total Offer</td>
              <td className="border border-black p-1 text-center font-bold">{totalOffer}</td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>

            {/* Total Cost Section */}
            <tr className="bg-purple-800 text-white font-bold">
              <td className="border border-black p-1 pl-2 uppercase">Total Cost of the Project</td>
              <td className="border border-black p-1 text-center">{grandTotal}</td>
              <td className="border border-black p-1 bg-purple-800 border-l-white"></td>
            </tr>
            <tr className="bg-purple-800 text-white">
              <td colSpan="3" className="border border-black p-1 h-2"></td>
            </tr>

            {/* Payment Details */}
            <tr>
              <td className="border border-black p-1 pl-2 font-bold uppercase underline">Payment Details:</td>
              <td className="border border-black p-1 text-center"></td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 pl-2 font-bold uppercase underline">Payment by Cash / Cheque / Bank</td>
              <td className="border border-black p-1 text-center"></td>
              <td className="border-l border-r border-black p-1 bg-gray-50"></td>
            </tr>
            
            {/* List Receipts */}
            {receipts && receipts.length > 0 ? receipts.map((r, i) => (
              <tr key={r.id || i}>
                <td className="border border-black p-1 pl-2 uppercase">By {r.paymentMode || "Bank"}</td>
                <td className="border border-black p-1 text-center">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                <td className="border border-black p-1 pr-2 text-right">{parseFloat(r.amountPaid || 0)}</td>
              </tr>
            )) : (
              <tr>
                <td className="border border-black p-1 italic text-gray-500 text-center" colSpan="3">No receipts found</td>
              </tr>
            )}

            {/* Pad receipts to ensure consistent height */}
            {[...Array(Math.max(0, 5 - (receipts?.length || 0)))].map((_, i) => (
              <tr key={`pad3-${i}`}>
                <td className="border border-black p-1 h-5"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
              </tr>
            ))}

            <tr className="bg-purple-800 text-white font-bold">
              <td colSpan="2" className="border border-black p-1 pl-2 uppercase">Total Payment Received</td>
              <td className="border border-black p-1 pr-2 text-right">{totalReceived}</td>
            </tr>

            <tr className="font-bold">
              <td className="border border-black p-1 pl-2 uppercase">Balance Receivable</td>
              <td className="border border-black p-1 text-center">0</td>
              <td className={`border border-black p-1 pr-2 text-right ${balance > 0 ? "bg-pink-300 text-red-900" : ""}`}>
                {balance}
              </td>
            </tr>

            <tr className="font-bold">
              <td colSpan="2" className="border border-black p-1 text-center uppercase">Grand Total</td>
              <td className="border border-black p-1 pr-2 text-right">{grandTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer Signatures */}
        <div className="flex justify-between items-end mt-auto pt-16 font-bold text-[10px] uppercase">
          <div className="w-1/3 text-left">
            AUTHORIZED SIGNATORY
          </div>
          <div className="w-1/3 text-right">
            CUSTOMER
          </div>
        </div>
      </div>
    </div>
  );
});

export default FinalSettlementSheet;
