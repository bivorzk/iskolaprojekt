const LockIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const SetupCard = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="encryption-indicator w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
        <LockIcon />
      </div>
      {children}
    </div>
  </div>
);

window.KeyRestoreScreen = ({ passphrase, setPassphrase, passphraseError, restoringKeys, onRestore, onSetupNew }) => (
  <SetupCard>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Restore Your Keys</h2>
    <p className="text-gray-600 mb-6">
      Enter the passphrase you set up on your other device to restore your encryption keys.
    </p>
    {passphraseError && (
      <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{passphraseError}</div>
    )}
    <input
      type="password"
      placeholder="Your encryption passphrase"
      value={passphrase}
      onChange={e => setPassphrase(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && onRestore(passphrase)}
      className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary focus:border-primary"
    />
    <button
      onClick={() => onRestore(passphrase)}
      disabled={!passphrase || restoringKeys}
      className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium mb-3 disabled:opacity-50"
    >
      {restoringKeys ? 'Restoring...' : 'Restore Keys'}
    </button>
    <button
      onClick={onSetupNew}
      className="w-full text-gray-500 py-2 px-6 rounded-lg hover:text-gray-700 transition-colors text-sm"
    >
      Set up as a new device instead (old messages will be lost)
    </button>
  </SetupCard>
);
window.NewDeviceScreen = ({ passphrase, setPassphrase, passphraseError, restoringKeys, onRestore, onStartFresh }) => (
  <SetupCard>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">New Device Detected</h2>
    <p className="text-gray-600 mb-4">
      Your account already has encryption keys on another device or browser.
    </p>
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-6 text-sm text-left">
      <p className="font-semibold mb-1">&#9888; Do not start fresh unless necessary</p>
      <p>If you start fresh, a new key pair will be generated. Messages sent to your old
      device will no longer be decryptable here, and vice versa, until both parties send
      new messages.</p>
    </div>
    <p className="text-gray-600 text-sm mb-4">
      If you set a passphrase on your other device, enter it below to restore your keys and keep full access to your messages.
    </p>
    {passphraseError && (
      <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{passphraseError}</div>
    )}
    <input
      type="password"
      placeholder="Passphrase from your other device"
      value={passphrase}
      onChange={e => setPassphrase(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && passphrase && onRestore(passphrase)}
      className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-primary focus:border-primary"
    />
    <button
      onClick={() => onRestore(passphrase)}
      disabled={!passphrase || restoringKeys}
      className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium mb-3 disabled:opacity-50"
    >
      {restoringKeys ? 'Restoring...' : 'Restore Keys'}
    </button>
    <button
      onClick={onStartFresh}
      className="w-full text-gray-500 py-2 px-6 rounded-lg hover:text-red-600 transition-colors text-sm border border-gray-200 hover:border-red-300"
    >
      Start fresh on this device (old messages will not be readable)
    </button>
  </SetupCard>
);

window.FirstTimeSetupScreen = ({ passphrase, setPassphrase, passphraseConfirm, setPassphraseConfirm, passphraseError, onSetup }) => (
  <SetupCard>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Set Up Secure Chat</h2>
    <p className="text-gray-600 mb-6">
      Choose a passphrase to protect your encryption keys. You will need this passphrase to access your messages on other devices.
    </p>
    <div className="bg-accent p-4 rounded-lg mb-6">
      <ul className="text-sm text-gray-600 text-left space-y-1">
        <li>&#8226; Use at least 6 characters</li>
        <li>&#8226; Remember this passphrase &mdash; it cannot be recovered</li>
        <li>&#8226; Your keys are encrypted before leaving your device</li>
      </ul>
    </div>
    {passphraseError && (
      <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{passphraseError}</div>
    )}
    <input
      type="password"
      placeholder="Create a passphrase"
      value={passphrase}
      onChange={e => setPassphrase(e.target.value)}
      className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-primary focus:border-primary"
    />
    <input
      type="password"
      placeholder="Confirm passphrase"
      value={passphraseConfirm}
      onChange={e => setPassphraseConfirm(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && onSetup()}
      className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary focus:border-primary"
    />
    <button
      onClick={onSetup}
      disabled={!passphrase || !passphraseConfirm}
      className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
    >
      Enable Secure Chat
    </button>
  </SetupCard>
);

window.E2EESetupScreen = ({ setupError, onRetry }) => (
  <SetupCard>
    {setupError ? (
      <>
        <h2 className="text-2xl font-bold text-red-600 mb-4">Setup Failed</h2>
        <p className="text-gray-600 mb-6">{setupError}</p>
        <button
          onClick={onRetry}
          className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium mb-4"
        >
          Retry Setup
        </button>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          Refresh Page
        </button>
      </>
    ) : (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Setting up Secure Chat...</h2>
        <p className="text-gray-600 mb-6">
          Generating encryption keys and securing your account.
        </p>
        <div className="bg-accent p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">E2EE Setup</h3>
          <ul className="text-sm text-gray-600 text-left space-y-1">
            <li>&#8226; Generating encryption keys</li>
            <li>&#8226; Encrypting and backing up keys to server</li>
            <li>&#8226; Messages will be end-to-end encrypted</li>
          </ul>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">Please wait...</p>
      </>
    )}
  </SetupCard>
);
