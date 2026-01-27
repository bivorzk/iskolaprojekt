const { useState, useCallback } = React;

const useWalletForm = () => {
    const [uploadForm, setUploadForm] = useState({
        amount: '',
        currency: 'HUF'
    });
    
    const [errors, setErrors] = useState({});

    const validateNumber = (value, min = 0, max = 100000) => {
        const num = Number(value);
        if (isNaN(num)) return false;
        if (!isFinite(num)) return false;
        if (num < min) return false;
        if (num > max) return false;
        return true;
    };

    const validateInput = useCallback((name, value) => {
        let error = null;
        
        // Required field check
        if (!value || !value.toString().trim()) {
            error = 'This field is required';
        }
        // Type-specific validation
        else if (name === 'amount') {
            if (!validateNumber(value, 0, 100000)) {
                error = 'Please enter a valid amount between 0 and 100,000';
            } else if (uploadForm.currency === 'HUF' && value < 300) {
                error = 'Minimum amount is 300 HUF';
            }
        }
        
        // Dangerous string check
        if (value && typeof value === 'string') {
            const dangerousChars = ["<", ">", "'", '"', ";", "--", "<script>", "</script>", "$ne", "$gt", "$lt"];
            if (dangerousChars.some(char => value.includes(char))) {
                error = 'Invalid characters detected';
            }
        }

        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
        
        return !error;
    }, [uploadForm.currency]);

    const updateForm = useCallback((name, value) => {
        setUploadForm(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Validate on change
        validateInput(name, value);
    }, [validateInput]);

    const resetForm = useCallback(() => {
        setUploadForm({ amount: '', currency: 'HUF' });
        setErrors({});
    }, []);

    const isFormValid = useCallback(() => {
        const amountValid = validateInput('amount', uploadForm.amount);
        return amountValid && !Object.values(errors).some(error => error);
    }, [uploadForm.amount, errors, validateInput]);

    return {
        uploadForm,
        errors,
        updateForm,
        resetForm,
        isFormValid,
        validateInput
    };
};

window.useWalletForm = useWalletForm;