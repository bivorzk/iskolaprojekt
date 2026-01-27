const WalletDepositForm = ({ onSubmit, formData, errors, onFormChange, disabled = false }) => {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        onFormChange(name, value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Money to Wallet</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="Enter amount"
                        disabled={disabled}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary ${
                            errors.amount ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.amount && (
                        <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        disabled={disabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                        <option value="HUF">HUF</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={disabled || !formData.amount || parseFloat(formData.amount) <= 0}
                    className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors ${
                        disabled || !formData.amount || parseFloat(formData.amount) <= 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-secondary'
                    }`}
                >
                    {disabled ? 'Processing...' : 'Choose Payment Method'}
                </button>
            </form>
        </div>
    );
};

window.WalletDepositForm = WalletDepositForm;