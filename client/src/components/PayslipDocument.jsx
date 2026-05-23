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
      className="p-4 bg-white text-black font-sans w-[210mm] mx-auto border-2 border-black"
    >
      {/* Header Section */}
      <div className="flex border-b-2 border-black">
        <div className="w-1/4 p-4 border-r-2 border-black flex items-center justify-center font-bold text-center">
          Company Logo
        </div>
        <div className="w-3/4 bg-green-600 text-white p-4 text-center">
          <h1 className="text-xl font-bold">Mona Interior Studio</h1>
          <p>Thiruvananthapuram, Kerala, India</p>
        </div>
      </div>

      {/* Month Sub-header */}
      <div className="bg-gray-200 text-center py-1 border-b-2 border-black font-bold">
        Payslip For the Month of{" "}
        {new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        })}
      </div>

      {/* Employee Info Grid */}
      <div className="grid grid-cols-2 border-b-2 border-black">
        <div className="border-r-2 border-black">
          <div className="flex border-b border-black">
            <span className="w-1/3 p-1 font-bold">Employee Name:</span>
            <span className="w-2/3 p-1">{data.name || "---"}</span>
          </div>
          <div className="flex">
            <span className="w-1/3 p-1 font-bold">Gender:</span>
            <span className="w-2/3 p-1">{data.gender || "---"}</span>
          </div>
        </div>
        <div>
          <div className="flex border-b border-black">
            <span className="w-1/3 p-1 font-bold pl-2">Paid Days:</span>
            <span className="w-2/3 p-1 text-right pr-4">
              {data.paidDays || 0}
            </span>
          </div>
          <div className="flex">
            <span className="w-1/3 p-1 font-bold pl-2">LOP Days:</span>
            <span className="w-2/3 p-1 text-right pr-4">
              {data.lopDays || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Earnings vs Deductions Table */}
      <div className="grid grid-cols-2 border-b-2 border-black">
        {/* Earnings Column */}
        <div className="border-r-2 border-black">
          <div className="grid grid-cols-2 bg-gray-100 border-b border-black font-bold text-center">
            <div className="border-r border-black p-1">Earnings</div>
            <div className="p-1">Amount</div>
          </div>
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-1">Basic</div>
            <div className="p-1 text-right">{basic.toLocaleString()}</div>
          </div>
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black flex flex-col">
              <div className="p-1 border-b border-black flex justify-between">
                <span>OT Hours</span>
                <span className="bg-gray-100 px-2 border-l border-black">
                  {otHours}
                </span>
              </div>
              <div className="p-1 flex justify-between">
                <span>OT Rate</span>
                <span className="bg-gray-100 px-2 border-l border-black">
                  {otRate}
                </span>
              </div>
            </div>
            <div className="p-1"></div>
          </div>
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-1 font-bold">
              OT Payment
            </div>
            <div className="p-1 text-right">{otPayment.toLocaleString()}</div>
          </div>
          <div className="grid grid-cols-2 font-bold bg-gray-50">
            <div className="border-r border-black p-1">Total Payment</div>
            <div className="p-1 text-right">
              {totalPayment.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Deductions Column */}
        <div>
          <div className="grid grid-cols-2 bg-gray-100 border-b border-black font-bold text-center">
            <div className="border-r border-black p-1">Deductions</div>
            <div className="p-1">Amount</div>
          </div>
          <div className="grid grid-cols-2 border-b border-black">
            <div className="border-r border-black p-1">Salary Advance</div>
            <div className="p-1 text-right">
              {salaryAdvance.toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-2 border-b border-black h-[65px]">
            <div className="border-r border-black p-1">Other Deductions</div>
            <div className="p-1 text-right">
              {otherDeductions > 0 ? otherDeductions.toLocaleString() : "-"}
            </div>
          </div>
          <div className="grid grid-cols-2 font-bold bg-gray-50 border-t border-black mt-[33px]">
            <div className="border-r border-black p-1">Total Deductions</div>
            <div className="p-1 text-right">
              {totalDeductions.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Net Pay Section */}
      <div className="grid grid-cols-2 font-bold text-lg border-b-2 border-black">
        <div className="border-r-2 border-black p-2 italic">Net Pay:</div>
        <div className="p-2 text-right">{netPay.toLocaleString()}</div>
      </div>
    </div>
  );
});

export default PayslipDocument;
