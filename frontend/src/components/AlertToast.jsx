import React, { useEffect } from "react";

// Toast component
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
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-500 bg-green-100 rounded-lg dark:bg-green-800 dark:text-green-200">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
        </svg>
        <span className="sr-only">Check icon</span>
      </div>
    ),
    danger: (
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-red-500 bg-red-100 rounded-lg dark:bg-red-800 dark:text-red-200">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
        </svg>
        <span className="sr-only">Error icon</span>
      </div>
    ),
    warning: (
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-orange-500 bg-orange-100 rounded-lg dark:bg-orange-700 dark:text-orange-200">
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z" />
        </svg>
        <span className="sr-only">Warning icon</span>
      </div>
    ),
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className="flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-sm dark:text-gray-400 dark:bg-gray-800"
        role="alert"
      >
        {icons[type]}
        <div className="ms-3 text-sm font-normal">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ms-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <span className="sr-only">Close</span>
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

// DeleteConfirmation component remains unchanged
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
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 relative shadow-lg">
        <div className="inline-flex items-center justify-center shrink-0 w-16 h-16 text-red-500 bg-red-100 rounded-full dark:bg-red-800 dark:text-red-200 mb-4 mx-auto">
          {icon}
        </div>

        <h3 className="text-xl font-medium text-gray-900 dark:text-white text-center mb-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          {message}
        </p>

        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
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
