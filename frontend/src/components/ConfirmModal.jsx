const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm shadow-2xl">
      <div className="p-5 pb-0">
        <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">{title}</h3>
        <p className="text-[13px] text-text-secondary leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-2 p-5">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all ${
            danger
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-accent-primary hover:bg-accent-hover text-white'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
