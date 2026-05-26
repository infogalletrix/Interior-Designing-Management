import React, { forwardRef } from "react";

const PayslipDocument = forwardRef(({ data }, ref) => {
  // Calculations based on the template
  const basic = parseFloat(data.basic || 0);
  const otHours = parseFloat(data.otHours || 0);
  const otRate = parseFloat(data.otRate || 0);
  const otPayment = otHours * otRate;

  const totalPayment = basic + otPayment;

  const salaryAdvance = parseFloat(data.advance || 0);
  const otherDeductions = parseFloat(data.otherDeductions || 0);
  const totalDeductions = salaryAdvance + otherDeductions;

  const netPay = totalPayment - totalDeductions;

  return (
    <div
      ref={ref}
      className="p-10 bg-white text-gray-900 font-sans w-[210mm] min-h-[148mm] mx-auto box-border"
    >
      <div className="border border-gray-400 rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="flex justify-between items-center border-b border-gray-400 p-6 bg-gray-50">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-lg" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Mona Interior Studio</h1>
              <p className="font-bold text-gray-600 text-sm">Thiruvananthapuram, Kerala, India</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Payslip</h2>
            <p className="font-bold mt-1 text-sm text-gray-700">
              {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 border-b border-gray-400 bg-white">
          <div className="border-r border-gray-400">
            <div className="flex border-b border-gray-200">
              <span className="w-1/3 p-3 text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border-r border-gray-200 flex items-center">Employee</span>
              <span className="w-2/3 p-3 font-black text-gray-900">{data.name || "---"}</span>
            </div>
            <div className="flex">
              <span className="w-1/3 p-3 text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border-r border-gray-200 flex items-center">Gender</span>
              <span className="w-2/3 p-3 font-bold text-gray-800">{data.gender || "---"}</span>
            </div>
          </div>
          <div>
            <div className="flex border-b border-gray-200">
              <span className="w-1/3 p-3 text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border-r border-gray-200 pl-4 flex items-center">Paid Days</span>
              <span className="w-2/3 p-3 font-black text-gray-900 pr-4">
                {data.paidDays || 0}
              </span>
            </div>
            <div className="flex">
              <span className="w-1/3 p-3 text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border-r border-gray-200 pl-4 flex items-center">LOP Days</span>
              <span className="w-2/3 p-3 font-bold text-gray-800 pr-4">
                {data.lopDays || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Earnings vs Deductions Table */}
        <div className="grid grid-cols-2 border-b border-gray-400 bg-white">
          {/* Earnings Column */}
          <div className="border-r border-gray-400 flex flex-col h-full">
            <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-400 font-black text-[10px] uppercase tracking-widest text-gray-700">
              <div className="col-span-2 border-r border-gray-400 p-2 pl-3">Earnings</div>
              <div className="p-2 text-right pr-3">Amount</div>
            </div>
            <div className="grid grid-cols-3 border-b border-gray-200 flex-1">
              <div className="col-span-2 border-r border-gray-200 p-3 font-bold text-sm text-gray-800 flex items-center">Basic Pay</div>
              <div className="p-3 text-right font-black text-gray-900 flex items-center justify-end">₹ {basic.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-3 border-b border-gray-200 flex-1">
              <div className="col-span-2 border-r border-gray-200 p-3 flex flex-col justify-center">
                <span className="font-bold text-sm text-gray-800">Overtime Pay</span>
                {otHours > 0 && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">({otHours} hrs @ ₹{otRate}/hr)</span>}
              </div>
              <div className="p-3 text-right font-black text-gray-900 flex items-center justify-end">₹ {otPayment.toLocaleString()}</div>
            </div>
            
            <div className="grid grid-cols-3 font-black text-gray-900 bg-gray-50 border-t border-gray-400 shrink-0">
              <div className="col-span-2 border-r border-gray-400 p-3 uppercase tracking-widest text-[10px] flex items-center">Total Earnings</div>
              <div className="p-3 text-right text-lg tracking-tight">₹ {totalPayment.toLocaleString()}</div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-400 font-black text-[10px] uppercase tracking-widest text-gray-700">
              <div className="col-span-2 border-r border-gray-400 p-2 pl-3">Deductions</div>
              <div className="p-2 text-right pr-3">Amount</div>
            </div>
            <div className="grid grid-cols-3 border-b border-gray-200 flex-1">
              <div className="col-span-2 border-r border-gray-200 p-3 font-bold text-sm text-gray-800 flex items-center">Salary Advance</div>
              <div className="p-3 text-right font-black text-gray-900 flex items-center justify-end">₹ {salaryAdvance.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-3 border-b border-gray-200 flex-1">
              <div className="col-span-2 border-r border-gray-200 p-3 font-bold text-sm text-gray-800 flex items-center">Other Deductions</div>
              <div className="p-3 text-right font-black text-gray-900 flex items-center justify-end">₹ {otherDeductions > 0 ? otherDeductions.toLocaleString() : "0"}</div>
            </div>
            
            <div className="grid grid-cols-3 font-black text-gray-900 bg-gray-50 border-t border-gray-400 shrink-0">
              <div className="col-span-2 border-r border-gray-400 p-3 uppercase tracking-widest text-[10px] flex items-center">Total Deductions</div>
              <div className="p-3 text-right text-lg tracking-tight">₹ {totalDeductions.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Net Pay Section */}
        <div className="flex justify-between items-center p-6 bg-gray-100">
          <div className="uppercase tracking-widest font-black text-gray-600 text-sm">Net Payable</div>
          <div className="text-3xl font-black text-gray-900 tracking-tighter">₹ {netPay.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="mt-8 text-center border-t border-gray-300 pt-4">
        <p className="text-[10px] text-gray-500 italic font-medium">This is a computer generated payslip and does not require a physical signature.</p>
      </div>
    </div>
  );
});

export default PayslipDocument;
