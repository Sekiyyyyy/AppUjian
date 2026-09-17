import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { CircleAlert, CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

export const GlobalAlert = () => {
  // Alert Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', text: '' });
  const [resolver, setResolver] = useState<(v: boolean) => void>();

  // Toast State
  const [toast, setToast] = useState<{ open: boolean; title: string; type: 'success' | 'error' | 'warning' }>({
    open: false,
    title: '',
    type: 'success'
  });

  useEffect(() => {
    const handleDialog = (e: any) => {
      setDialogContent({ title: e.detail.title, text: e.detail.text });
      setResolver(() => e.detail.resolve);
      setIsDialogOpen(true);
    };

    const handleToast = (e: any) => {
      setToast({ open: true, title: e.detail.title, type: e.detail.type });
      
      // Auto close after 3s
      setTimeout(() => {
        setToast(prev => ({ ...prev, open: false }));
      }, 3000);
    };

    window.addEventListener('show-alert-dialog', handleDialog);
    window.addEventListener('show-toast', handleToast);

    return () => {
      window.removeEventListener('show-alert-dialog', handleDialog);
      window.removeEventListener('show-toast', handleToast);
    };
  }, []);

  const handleConfirm = () => {
    setIsDialogOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <>
      {/* Shadcn Alert Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <AlertDialogContent>
          <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
            <div
              className="flex size-10 mt-1 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 bg-slate-50"
              aria-hidden="true"
            >
              <CircleAlert size={20} strokeWidth={2} />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {dialogContent.text}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={handleCancel}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-primary-600 hover:bg-primary-700 text-white">Ya, Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Tailwind Toast */}
      {toast.open && (
        <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg border bg-white max-w-sm ${
            toast.type === 'success' ? 'border-emerald-200' : 
            toast.type === 'error' ? 'border-red-200' : 'border-amber-200'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="text-emerald-500" size={24} />}
            {toast.type === 'error' && <XCircle className="text-red-500" size={24} />}
            {toast.type === 'warning' && <AlertTriangle className="text-amber-500" size={24} />}
            
            <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
            
            <button onClick={() => setToast({ ...toast, open: false })} className="text-slate-400 hover:text-slate-600 ml-auto">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
