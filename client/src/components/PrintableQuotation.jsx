import React, { forwardRef } from "react";

const PrintableQuotation = forwardRef(({ data }, ref) => {
  const safeData = data || {};
  const items = safeData.items || [];
  
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );
  
  const isNonGST = safeData.billType === "Non-GST";
  const tax = isNonGST ? 0 : subtotal * 0.18; // Default 18% if not Non-GST
  const total = subtotal + tax;

  return (
    <div
      ref={ref}
      className="p-10 bg-white text-slate-800 font-sans w-[210mm] min-h-[297mm] mx-auto border shadow-lg text-sm"
    >
      {/* Header Title */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-amber-900 tracking-widest uppercase">
          Interior Quotation
        </h1>
        <div className="mt-4 space-y-1 font-semibold">
          <p>Quotation Number: {safeData.quoteNo || "SQ-2024-001"}</p>
          <p>
            Date: {safeData.date || new Date().toLocaleDateString("en-GB")}
          </p>
          <p className="text-xs text-gray-400">Valid for 30 days from the date of issue</p>
        </div>
      </div>

      {/* From/To Section */}
      <div className="flex justify-between mb-8">
        <div className="w-1/2">
          <p className="font-bold text-xs uppercase text-amber-700">From:</p>
          <p className="font-bold text-base">Mona Interior Studio</p>
          <p>Professional Interior Design & Services</p>
          <p>Phone: +91 98765 43210</p>
          <p>Email: contact@monastudio.com</p>
        </div>
        <div className="w-1/2 text-right">
          <p className="font-bold text-xs uppercase text-amber-700">To:</p>
          <p className="font-bold text-base">
            {safeData.customer || "Valued Client"}
          </p>
          <p className="whitespace-pre-line text-gray-600">{safeData.address || "Client Address / Site Location"}</p>
        </div>
      </div>

      <div className="mb-8 bg-amber-50 p-4 rounded-xl border border-amber-100">
        <p className="font-bold text-[10px] uppercase text-amber-700 mb-1">Project Proposal for:</p>
        <h3 className="text-lg font-black text-slate-900 uppercase">{safeData.projectTitle || "Interior Renovation"}</h3>
        <p className="text-xs text-slate-600 mt-1 italic font-medium">{safeData.workDescription}</p>
      </div>

      <p className="font-bold mb-2 uppercase text-xs tracking-wider text-gray-500">Itemized Work Details:</p>

      {/* Table */}
      <table className="w-full border-collapse mb-6 border border-gray-200">
        <thead>
          <tr className="bg-amber-800 text-white text-[10px] uppercase tracking-tighter">
            <th className="border border-amber-900 p-2 text-left w-2/5">Work Description</th>
            <th className="border border-amber-900 p-2 text-center">Qty/Area</th>
            <th className="border border-amber-900 p-2 text-center">Unit</th>
            <th className="border border-amber-900 p-2 text-right">Rate (₹)</th>
            <th className="border border-amber-900 p-2 text-right">Total (₹)</th>
          </tr>
        </thead>
        <tbody className="text-[11px]">
          {items.map((item, index) => (
            <tr key={index} className="hover:bg-amber-50">
              <td className="border border-gray-200 p-2 text-left uppercase font-medium">{item.description}</td>
              <td className="border border-gray-200 p-2 text-center">{item.area || "1"}</td>
              <td className="border border-gray-200 p-2 text-center text-gray-500">{item.unit || "Sq.Ft"}</td>
              <td className="border border-gray-200 p-2 text-right">{parseFloat(item.rate || 0).toFixed(2)}</td>
              <td className="border border-gray-200 p-2 text-right font-bold">
                {parseFloat(item.amount || 0).toFixed(2)}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="5" className="border border-gray-200 p-10 text-center text-gray-300 italic">No work items listed</td>
            </tr>
          )}
          {/* Totals section */}
          <tr className="bg-gray-50 font-bold">
            <td colSpan="4" className="border border-gray-200 p-2 text-right uppercase">
              Subtotal (Taxable Amount)
            </td>
            <td className="border border-gray-200 p-2 text-right">
              ₹{subtotal.toLocaleString()}
            </td>
          </tr>
          {!isNonGST && (
            <tr className="bg-blue-50 text-blue-800 font-bold">
              <td colSpan="4" className="border border-gray-200 p-2 text-right uppercase">
                Estimated GST (18%)
              </td>
              <td className="border border-gray-200 p-2 text-right">
                + ₹{tax.toLocaleString()}
              </td>
            </tr>
          )}
          <tr className="bg-amber-900 text-white font-bold text-lg">
            <td colSpan="4" className="border border-amber-950 p-3 text-right uppercase">
              Estimated Total Amount
            </td>
            <td className="border border-amber-950 p-3 text-right">
              ₹{total.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms and Conditions */}
      <div className="mb-12">
        <p className="font-bold uppercase mb-2 text-xs text-amber-800">Terms and Conditions:</p>
        <ul className="list-disc ml-5 space-y-1 text-[10px] text-gray-600">
          <li>This is an estimate/quotation and not a final bill.</li>
          <li>Actual measurements will be taken after completion for final billing.</li>
          <li>Payment Terms: 50% advance, 40% during work, 10% on completion.</li>
          <li>GST will be extra as applicable unless specified as Non-GST bill.</li>
          <li>Validity: This quotation is valid for 30 days from the date of issue.</li>
          <li>Any extra work apart from the items listed above will be charged separately.</li>
        </ul>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between items-end mt-20">
        <div className="text-center">
          <div className="border-t border-gray-400 w-48 mb-1"></div>
          <p className="font-bold text-xs">Authorized Signatory</p>
          <p className="text-[10px] text-gray-500">Mona Interior Studio</p>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 w-48 mb-1"></div>
          <p className="font-bold text-xs">Client's Signature</p>
          <p className="text-[10px] text-gray-500">I accept the above quotation</p>
        </div>
      </div>
    </div>
  );
});

export default PrintableQuotation;
