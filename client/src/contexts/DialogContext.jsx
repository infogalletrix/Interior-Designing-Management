import React, { createContext, useContext, useState } from "react";

const DialogContext = createContext();

export const useDialog = () => {
  return useContext(DialogContext);
};

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "alert", // 'alert', 'confirm', 'success', 'error'
    onConfirm: null,
  });

  const showDialog = ({ title, message, type = "alert", onConfirm = null }) => {
    setDialog({ isOpen: true, title, message, type, onConfirm });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ showDialog, closeDialog }}>
      {children}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div
              className={`p-6 ${
                dialog.type === "error"
                  ? "bg-rose-50"
                  : dialog.type === "success"
                    ? "bg-emerald-50"
                    : "bg-slate-50"
              }`}
            >
              <h3
                className={`text-xl font-black mb-2 ${
                  dialog.type === "error"
                    ? "text-rose-600"
                    : dialog.type === "success"
                      ? "text-emerald-600"
                      : "text-slate-800"
                }`}
              >
                {dialog.title}
              </h3>
              <p className="text-slate-600 text-sm font-medium">
                {dialog.message}
              </p>
            </div>
            <div className="p-4 bg-white flex gap-3 border-t border-slate-100">
              {dialog.type === "confirm" ? (
                <>
                  <button
                    onClick={closeDialog}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (dialog.onConfirm) dialog.onConfirm();
                      closeDialog();
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={closeDialog}
                  className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Okay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
