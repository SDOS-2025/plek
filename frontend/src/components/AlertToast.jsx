import React, { useEffect } from "react";

// Original Toast component
const Toast = ({ type, message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const icons = {
    success: (
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-300 bg-green-900/50 rounded-lg border border-green-700">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
        </svg>
      </div>
    ),
    danger: (
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-300 bg-red-900/50 rounded-lg border border-red-700">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
        </svg>
      </div>
    ),
    warning: (
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-yellow-300 bg-yellow-900/50 rounded-lg border border-yellow-700">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z" />
        </svg>
      </div>
    ),
  };

  // Border colors based on alert type
  const borderColors = {
    success: "border-green-700",
    danger: "border-red-700",
    warning: "border-yellow-700",
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={`flex items-center w-full max-w-xs p-4 text-white rounded-lg shadow-lg border bg-plek-dark ${borderColors[type]}`}
      >
        {icons[type]}
        <div className="ms-3 text-sm font-normal">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ms-auto -mx-1.5 -my-1.5 text-gray-400 hover:text-white bg-transparent rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8"
        >
          <svg
            className="w-3 h-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Updated DeleteConfirmation component
const DeleteConfirmation = ({
  show,
  onConfirm,
  onCancel,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmButtonText = "Delete",
}) => {
  if (!show) return null;

  // Determine which icon to show based on the title
  let icon;
  if (title.toLowerCase().includes("reject")) {
    // X icon for rejection (styled to match Toast danger icon)
    icon = (
      <svg
        className="w-8 h-8"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
      </svg>
    );
  } else {
    // Trash icon for deletion (matched with the same styling)
    icon = (
      <svg
        className="w-8 h-8"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M17 4h-4V2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H3a1 1 0 0 0 0 2h1v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6h1a1 1 0 1 0 0-2ZM9 2h2v2H9V2Zm2 16H9v-5h2v5Zm-4 0H5V6h2v12Zm6 0h-2v-5h2v5Zm0-7h-2V6h2v5Z" />
      </svg>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-plek-dark rounded-xl border-red-700 border w-full max-w-md p-6 relative shadow-lg">
        <div className="inline-flex items-center justify-center shrink-0 w-16 h-16 text-red-300 bg-red-900/30 rounded-full border border-red-700 mb-4 mx-auto">
          {icon}
        </div>

        <h3 className="text-xl font-medium text-white text-center mb-3">
          {title}
        </h3>
        <p className="text-gray-300 text-center mb-6">{message}</p>

        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-plek-background hover:bg-plek-lightgray rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export { Toast, DeleteConfirmation };
export default Toast;
