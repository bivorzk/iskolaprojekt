window.KeyMismatchBanner = ({ activeConversation, onRecover, onReset, onDismiss }) => (
  <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 z-50">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center">
        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p className="font-semibold">Encryption Key Issue Detected</p>
          <p className="text-sm">Some messages cannot be decrypted. This usually happens after key changes.</p>
        </div>
      </div>
      <div className="flex space-x-3">
        <button
          onClick={() => onRecover(activeConversation)}
          className="bg-white text-red-500 px-4 py-2 rounded font-medium hover:bg-red-50 transition-colors"
        >
          Try Recovery
        </button>
        <button
          onClick={onReset}
          className="bg-red-400 text-white px-4 py-2 rounded font-medium hover:bg-red-600 transition-colors"
        >
          Reset E2EE
        </button>
        <button onClick={onDismiss} className="text-white hover:text-red-200 transition-colors" title="Dismiss warning">
          ✕
        </button>
      </div>
    </div>
  </div>
);
